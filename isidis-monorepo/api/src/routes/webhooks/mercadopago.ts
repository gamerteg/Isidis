import { FastifyPluginAsync } from 'fastify'
import {
  getMercadoPagoNotificationResourceId,
  getMercadoPagoNotificationTopic,
  validateMercadoPagoWebhookSignature,
} from '../../lib/mercadopago-webhook.js'
import { processPaidMpOrder } from '../../services/payment-reconciliation.js'

async function processMercadoPagoNotification(
  fastify: any,
  paymentId: string
) {
  const charge = await fastify.mp.getPayment(paymentId)
  const status = charge.status
  const externalReference = typeof charge.external_reference === 'string' ? charge.external_reference : undefined

  const findOrder = async () => {
    const byPaymentId = await fastify.supabase
      .from('orders')
      .select('id, status, reader_id, client_id, amount_total, asaas_payment_id')
      .eq('asaas_payment_id', paymentId)
      .maybeSingle()

    if (byPaymentId.data) {
      return byPaymentId.data
    }

    if (!externalReference) {
      return null
    }

    const byExternalReference = await fastify.supabase
      .from('orders')
      .select('id, status, reader_id, client_id, amount_total, asaas_payment_id')
      .eq('id', externalReference)
      .maybeSingle()

    return byExternalReference.data ?? null
  }

  if (['approved', 'authorized'].includes(status)) {
    const result = await processPaidMpOrder(fastify, paymentId, {
      externalReference,
      paymentMethodId: charge.payment_method_id,
      paymentTypeId: charge.payment_type_id,
    })

    if (!result.found) {
      fastify.log.warn({ paymentId }, '[webhook:mp] Order nao encontrada')
      return
    }

    if (!result.processed) {
      fastify.log.info({ orderId: result.orderId }, '[webhook:mp] Ja processado, ignorando')
      return
    }

    fastify.log.info({ orderId: result.orderId }, '[webhook:mp] Pagamento processado com sucesso')
    return
  }

  if (status === 'cancelled' || status === 'refunded') {
    const order = await findOrder()

    if (order && order.status !== 'CANCELED') {
      await fastify.supabase
        .from('orders')
        .update({
          status: 'CANCELED',
          ...(order.asaas_payment_id ? {} : { asaas_payment_id: paymentId }),
        })
        .eq('id', order.id)

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

      fastify.log.info({ paymentId, status }, '[webhook:mp] Pagamento cancelado/refundado, pedido e comissao estornados')
    }

    return
  }

  if (status === 'charged_back') {
    const disputedAt = new Date().toISOString()
    const order = await findOrder()

    if (!order) {
      return
    }

    await fastify.supabase
      .from('orders')
      .update({
        has_dispute: true,
        disputed_at: disputedAt,
        ...(order.asaas_payment_id ? {} : { asaas_payment_id: paymentId }),
      })
      .eq('id', order.id)

    try {
      await fastify.supabase.from('tickets').insert({
        user_id: order.client_id,
        subject: `Chargeback - Pedido ${order.id}`,
        description: `Pagamento Mercado Pago ${paymentId} sofreu chargeback. Valor total: R$ ${(order.amount_total / 100).toFixed(2)}.`,
        status: 'OPEN',
        priority: 'HIGH',
        category: 'REEMBOLSO',
      })
    } catch (ticketError: any) {
      fastify.log.warn({ ticketError, orderId: order.id }, '[webhook:mp] Nao foi possivel criar ticket de chargeback')
    }
  }
}

const mercadopagoWebhookRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/webhooks/mercadopago', async (request, reply) => {
    const query = (request.query ?? {}) as Record<string, unknown>
    const body = request.body as any
    const topic = getMercadoPagoNotificationTopic(query, body)
    const paymentId = getMercadoPagoNotificationResourceId(query, body)
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    const shouldValidateSignature = process.env.NODE_ENV === 'production' || Boolean(webhookSecret)

    if (topic !== 'payment' || !paymentId) {
      return reply.status(200).send({ received: true })
    }

    if (shouldValidateSignature) {
      if (!webhookSecret) {
        request.log.error('[webhook:mp] MERCADOPAGO_WEBHOOK_SECRET ausente')
        return reply.status(500).send({ error: 'Webhook do Mercado Pago nao configurado' })
      }

      const signatureIsValid = validateMercadoPagoWebhookSignature({
        dataId: paymentId,
        secret: webhookSecret,
        signatureHeader: request.headers['x-signature'],
        requestIdHeader: request.headers['x-request-id'],
      })

      if (!signatureIsValid) {
        request.log.warn(
          { paymentId, requestId: request.headers['x-request-id'] },
          '[webhook:mp] Assinatura invalida'
        )
        return reply.status(401).send({ error: 'Assinatura de webhook invalida' })
      }
    }

    reply.status(200).send({ received: true })

    void processMercadoPagoNotification(fastify, paymentId).catch((error: any) => {
      request.log.error(
        { paymentId, err: error?.message ?? error },
        '[webhook:mp] Erro ao reconciliar pagamento'
      )
    })

    return reply
  })
}

export default mercadopagoWebhookRoute
