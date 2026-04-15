import { FastifyPluginAsync } from 'fastify'
import { notifyUser } from '../../services/notify.js'
import { processPaidMpOrder } from '../../services/payment-reconciliation.js'

const mercadopagoWebhookRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhooks/mercadopago', async (request, reply) => {
    const query = request.query as any
    const body = request.body as any
    
    // MP envia via params "?topic=payment&id=123" (IPN) ou body json (Webhooks V1)
    const topic = query.topic || body.type || body.topic
    const paymentId = query.id || body.data?.id
    
    if (topic !== 'payment' || !paymentId) {
      return reply.send({ received: true })
    }

    try {
      // É recomendado buscar o status real do pagamento p/ evitar payload forgery
      const charge = await fastify.mp(`/v1/payments/${paymentId}`)
      const status = charge.status

      if (['approved', 'authorized'].includes(status)) {
        const result = await processPaidMpOrder(fastify, paymentId.toString())
        if (!result.found) {
          request.log.warn({ paymentId }, '[webhook:mp] Order nao encontrada')
          return reply.send({ received: true })
        }

        if (!result.processed) {
          request.log.info({ orderId: result.orderId }, '[webhook:mp] Ja processado, ignorando')
          return reply.send({ received: true })
        }
        request.log.info({ orderId: result.orderId }, '[webhook:mp] Pagamento processado com sucesso')
      }

      if (status === 'cancelled' || status === 'refunded') {
        const { data: order } = await fastify.supabase
          .from('orders')
          .select('id, status, reader_id')
          .eq('asaas_payment_id', paymentId.toString())
          .single()

        if (order && order.status !== 'CANCELED') {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          // Estornar transaction pendente do saldo
          const { data: wallet } = await fastify.supabase
            .from('wallets')
            .select('id')
            .eq('user_id', order.reader_id)
            .single()

          if (wallet) {
            await fastify.supabase
              .from('transactions')
              .update({ status: 'FAILED' })
              .eq('order_id', order.id)
              .eq('type', 'SALE_CREDIT')
          }

          request.log.info({ paymentId, status }, '[webhook:mp] Pagamento expirado/cancelado, pedido e comissão estornados')
        }
      }

      if (status === 'charged_back') {
        const disputedAt = new Date().toISOString()
        const { data: order } = await fastify.supabase
          .from('orders')
          .update({ has_dispute: true, disputed_at: disputedAt })
          .eq('asaas_payment_id', paymentId.toString())
          .select('id, reader_id, client_id, amount_total')
          .single()

        if (order) {
          try {
            await fastify.supabase.from('tickets').insert({
              user_id: order.client_id,
              subject: `Chargeback - Pedido ${order.id}`,
              description: `Pagamento MercadoPago ${paymentId} sofreu chargeback. Valor total: R$ ${(order.amount_total / 100).toFixed(2)}.`,
              status: 'OPEN',
              priority: 'HIGH',
              category: 'REEMBOLSO',
            })
          } catch (ticketError: any) {
            request.log.warn({ ticketError, orderId: order.id }, '[webhook:mp] Nao foi possivel criar ticket de chargeback')
          }
        }
      }

    } catch (error: any) {
      request.log.error({ paymentId, err: error?.message ?? error }, '[webhook:mp] Erro ao reconciliar pagamento')
    }

    return reply.send({ received: true })
  })
}

export default mercadopagoWebhookRoute
