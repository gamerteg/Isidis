import { FastifyPluginAsync } from 'fastify'
import { notifyUser } from '../../services/notify.js'
import { processPaidAsaasOrder } from '../../services/payment-reconciliation.js'

const asaasWebhookRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhooks/asaas', async (request, reply) => {
    const token = request.headers['asaas-access-token'] as string
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (!expectedToken || token !== expectedToken) {
      request.log.warn('[webhook:asaas] Token invalido ou ASAAS_WEBHOOK_TOKEN nao configurado')
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const payload = request.body as any
    const event = payload.event
    const paymentId = payload.payment?.id
    const transferId = payload.transfer?.id

    request.log.info({ event, paymentId, transferId }, '[webhook:asaas] Evento recebido')

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      if (!paymentId) return reply.send({ received: true })

      try {
        const result = await processPaidAsaasOrder(fastify, paymentId)
        if (!result.found) {
          request.log.warn({ paymentId }, '[webhook:asaas] Order nao encontrada')
          return reply.send({ received: true })
        }

        if (!result.processed) {
          request.log.info({ orderId: result.orderId }, '[webhook:asaas] Ja processado, ignorando')
          return reply.send({ received: true })
        }

        request.log.info({ orderId: result.orderId }, '[webhook:asaas] Pagamento processado com sucesso')
      } catch (error: any) {
        request.log.error({ paymentId, err: error?.message ?? error }, '[webhook:asaas] Erro ao reconciliar pagamento')
      }
    }

    if (event === 'PAYMENT_OVERDUE') {
      if (paymentId) {
        await fastify.supabase
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('asaas_payment_id', paymentId)
          .eq('status', 'PENDING_PAYMENT')

        request.log.info({ paymentId }, '[webhook:asaas] PIX expirado, pedido cancelado')
      }
    }

    if (event === 'PAYMENT_REFUNDED') {
      if (paymentId) {
        await fastify.supabase
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('asaas_payment_id', paymentId)
          .neq('status', 'CANCELED')

        request.log.info({ paymentId }, '[webhook:asaas] Pagamento estornado, pedido cancelado')
      }
    }

    if (event === 'PAYMENT_CHARGEBACK_REQUESTED' || event === 'CHARGEBACK_REQUESTED') {
      if (!paymentId) return reply.send({ received: true })

      const disputedAt = new Date().toISOString()
      const { data: order } = await fastify.supabase
        .from('orders')
        .update({ has_dispute: true, disputed_at: disputedAt })
        .eq('asaas_payment_id', paymentId)
        .select('id, reader_id, client_id, amount_total')
        .single()

      if (order) {
        try {
          await fastify.supabase.from('tickets').insert({
            user_id: order.client_id,
            subject: `Chargeback - Pedido ${order.id}`,
            description: `Pagamento ${paymentId} em disputa. Valor total: R$ ${(order.amount_total / 100).toFixed(2)}.`,
            status: 'OPEN',
            priority: 'HIGH',
            category: 'REEMBOLSO',
          })
        } catch (ticketError: any) {
          request.log.warn({ ticketError, orderId: order.id }, '[webhook:asaas] Nao foi possivel criar ticket')
        }
      }
    }

    if (event === 'PAYMENT_CHARGEBACK_DONE' || event === 'CHARGEBACK_DONE') {
      if (!paymentId) return reply.send({ received: true })

      const chargebackStatus = payload.payment?.chargebackStatus ?? payload.payment?.chargeback?.status
      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, reader_id, amount_total')
        .eq('asaas_payment_id', paymentId)
        .single()

      if (!order) {
        return reply.send({ received: true })
      }

      if (chargebackStatus === 'DONE') {
        await fastify.supabase
          .from('orders')
          .update({ has_dispute: false, disputed_at: null })
          .eq('asaas_payment_id', paymentId)

        await fastify.supabase
          .from('transactions')
          .update({ status: 'COMPLETED' })
          .eq('order_id', order.id)
          .eq('type', 'SALE_CREDIT')
          .eq('status', 'PENDING')
      } else if (chargebackStatus === 'DISPUTE_LOST') {
        await fastify.supabase
          .from('transactions')
          .update({ status: 'FAILED' })
          .eq('order_id', order.id)
          .eq('type', 'SALE_CREDIT')
          .eq('status', 'PENDING')

        request.log.error({
          orderId: order.id,
          paymentId,
          amountLost: order.amount_total,
          readerId: order.reader_id,
        }, '[chargeback] PREJUIZO: chargeback perdido - requer revisao manual')

        const { data: admins } = await fastify.supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN')

        for (const admin of admins ?? []) {
          await notifyUser(fastify, admin.id, {
            type: 'SYSTEM',
            title: 'Chargeback perdido',
            message: `Pedido ${order.id} - chargeback de R$${(order.amount_total / 100).toFixed(2)} foi perdido.`,
            link: `/admin/orders/${order.id}`,
          })
        }
      }
    }

    if (event === 'TRANSFER_DONE' || event === 'TRANSFER_FAILED') {
      const newStatus = event === 'TRANSFER_DONE' ? 'COMPLETED' : 'FAILED'

      if (transferId) {
        await fastify.supabase
          .from('transactions')
          .update({ status: newStatus })
          .eq('external_id', transferId)
          .eq('type', 'WITHDRAWAL')

        request.log.info({ transferId, newStatus }, '[webhook:asaas] Saque atualizado')
      }
    }

    return reply.send({ received: true })
  })
}

export default asaasWebhookRoute
