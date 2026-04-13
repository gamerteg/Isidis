import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getOrCreateAsaasCustomer } from '../../plugins/asaas.js'
import { checkFraud } from '../../services/fraud.js'
import { processPaidAsaasOrder } from '../../services/payment-reconciliation.js'

const PLATFORM_FEE_PERCENT = 0.15
const ASAAS_CARD_FEE_PERCENT = parseFloat(process.env.ASAAS_CARD_FEE_PERCENT ?? '0.0349')
const ASAAS_CARD_FEE_FIXED = parseInt(process.env.ASAAS_CARD_FEE_FIXED ?? '39', 10)

const toAsaas = (centavos: number) => centavos / 100

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function calculateCardFee(amountInCents: number) {
  return Math.ceil(amountInCents * ASAAS_CARD_FEE_PERCENT) + ASAAS_CARD_FEE_FIXED
}

function sanitizePixDescription(orderId: string, gigTitle: string) {
  const sanitizedTitle = gigTitle
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

  const description = sanitizedTitle
    ? `Pedido ${orderId} - ${sanitizedTitle}`
    : `Pedido ${orderId}`

  return description.slice(0, 140)
}

async function getPixQrCodeWithRetry(
  asaas: (path: string, options?: RequestInit) => Promise<any>,
  paymentId: string,
  retries = 5
) {
  let lastError: any

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await asaas(`/payments/${paymentId}/pixQrCode`)
    } catch (error: any) {
      lastError = error
      const message = String(error?.message ?? '')
      const isTransientPixAvailabilityError =
        message.includes('nao permite pagamentos via Pix') ||
        message.includes('não permite pagamentos via Pix')

      if (!isTransientPixAvailabilityError || attempt === retries) {
        throw error
      }

      await sleep(attempt * 500)
    }
  }

  throw lastError
}

const createCheckoutSchema = z.object({
  gig_id: z.string().uuid(),
  add_on_ids: z.array(z.string()).default([]),
  requirements_answers: z.record(z.string(), z.string()).default({}),
  payment_method: z.enum(['PIX', 'CARD']).default('PIX'),
  card_token: z.string().optional(),
  card_holder_name: z.string().optional(),
  card_holder_postal_code: z.string().optional(),
  card_holder_address_number: z.string().optional(),
})

const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/checkout/config', async (_request, reply) => {
    return reply.send({ data: { gateway: 'asaas' } })
  })

  fastify.post(
    '/checkout/create',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const body = createCheckoutSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const {
        gig_id,
        add_on_ids,
        requirements_answers,
        payment_method,
        card_token,
        card_holder_name,
        card_holder_postal_code,
        card_holder_address_number,
      } = body.data
      const clientId = request.user.id

      const { data: gig, error: gigError } = await fastify.supabase
        .from('gigs')
        .select(`
          id, title, price, add_ons, delivery_time_hours, owner_id,
          is_active, status, payment_methods,
          profiles!owner_id(id, full_name, cellphone, tax_id, max_orders_per_day, max_simultaneous_orders)
        `)
        .eq('id', gig_id)
        .eq('is_active', true)
        .eq('status', 'APPROVED')
        .single()

      if (gigError || !gig) {
        return reply.status(404).send({ error: 'Servico nao encontrado ou indisponivel' })
      }

      const reader = (gig as any).profiles
      const allowedPaymentMethods = Array.isArray((gig as any).payment_methods)
        ? ((gig as any).payment_methods as string[])
        : ['PIX', 'CARD']

      if (gig.owner_id === clientId) {
        return reply.status(400).send({ error: 'Voce nao pode comprar seu proprio servico' })
      }

      if (!allowedPaymentMethods.includes(payment_method)) {
        return reply.status(400).send({ error: 'Essa forma de pagamento nao esta disponivel para este servico' })
      }

      const { count: simultaneousCount } = await fastify.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('reader_id', gig.owner_id)
        .in('status', ['PAID', 'PENDING_PAYMENT'])

      if (reader.max_simultaneous_orders && (simultaneousCount ?? 0) >= reader.max_simultaneous_orders) {
        return reply.status(400).send({ error: 'Cartomante esta com capacidade maxima no momento' })
      }

      const today = new Date().toISOString().split('T')[0]
      const { count: dailyCount } = await fastify.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('reader_id', gig.owner_id)
        .gte('created_at', `${today}T00:00:00`)
        .neq('status', 'CANCELED')

      if (reader.max_orders_per_day && (dailyCount ?? 0) >= reader.max_orders_per_day) {
        return reply.status(400).send({ error: 'Cartomante atingiu o limite de pedidos do dia' })
      }

      const { data: clientProfile } = await fastify.supabase
        .from('profiles')
        .select('full_name, cellphone, tax_id')
        .eq('id', clientId)
        .single()

      if (!clientProfile?.tax_id || !clientProfile?.cellphone) {
        return reply.status(400).send({ error: 'Complete seu perfil com CPF e telefone antes de comprar' })
      }

      const addOns = (gig.add_ons as any[]) ?? []
      const selectedAddOns = addOns.filter((item) => add_on_ids.includes(item.id))
      const addOnTotal = selectedAddOns.reduce(
        (sum: number, item: any) => sum + (item.price ?? 0),
        0
      )

      const serviceAmount = gig.price + addOnTotal
      const platformFee = Math.round(serviceAmount * PLATFORM_FEE_PERCENT)
      const baseReaderNet = serviceAmount - platformFee
      const totalAmount = serviceAmount
      const cardFee = payment_method === 'CARD'
        ? calculateCardFee(serviceAmount)
        : null
      const orderReaderNet = payment_method === 'CARD' && cardFee !== null
        ? baseReaderNet - cardFee
        : baseReaderNet

      const forwardedFor = request.headers['x-forwarded-for']
      const clientIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(',')[0]?.trim() ?? request.ip
      const { data: clientAuthData } = await fastify.supabase.auth.admin.getUserById(clientId)

      const fraudCheck = await checkFraud(fastify.supabase, {
        clientId,
        gigId: gig_id,
        amount: serviceAmount,
        clientIp,
        clientCreatedAt: clientAuthData.user?.created_at ?? new Date().toISOString(),
      })

      if (!fraudCheck.allowed) {
        return reply.status(429).send({ error: fraudCheck.reason })
      }

      const orderMetadata = {
        client_ip: clientIp,
        user_agent: request.headers['user-agent'] ?? '',
        fraud_flags: fraudCheck.flags,
      }
      const clientEmail = clientAuthData.user?.email ?? ''

      const { data: order, error: orderError } = await fastify.supabase
        .from('orders')
        .insert({
          gig_id,
          client_id: clientId,
          reader_id: gig.owner_id,
          status: 'PENDING_PAYMENT',
          amount_total: totalAmount,
          amount_service_total: serviceAmount,
          amount_platform_fee: platformFee,
          amount_reader_net: orderReaderNet,
          requirements_answers,
          selected_addons: add_on_ids,
          payment_method,
          metadata: orderMetadata,
          ...(payment_method === 'CARD' && { card_fee_responsibility: 'READER' }),
          ...(cardFee !== null && { amount_card_fee: cardFee }),
        })
        .select('id')
        .single()

      if (orderError || !order) {
        request.log.error({ orderError }, '[checkout] Erro ao criar pedido')

        if (orderError?.message?.includes('orders.metadata')) {
          return reply.status(500).send({
            error: 'Migration pendente: execute fase12_security.sql no Supabase antes de usar o checkout.',
          })
        }

        return reply.status(500).send({ error: 'Erro ao criar pedido' })
      }

      if (payment_method === 'CARD') {
        if (!card_token) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          return reply.status(400).send({ error: 'Token de cartao e obrigatorio para pagamento com cartao' })
        }

        let charge: any
        try {
          const customerId = await getOrCreateAsaasCustomer(fastify.asaas, {
            name: clientProfile.full_name,
            email: clientEmail,
            cpfCnpj: clientProfile.tax_id,
            mobilePhone: clientProfile.cellphone,
          })

          charge = await fastify.asaas('/payments', {
            method: 'POST',
            body: JSON.stringify({
              customer: customerId,
              billingType: 'CREDIT_CARD',
              value: toAsaas(totalAmount),
              dueDate: new Date().toISOString().split('T')[0],
              description: gig.title.slice(0, 100),
              externalReference: order.id,
              creditCardToken: card_token,
              creditCardHolderInfo: {
                name: card_holder_name ?? clientProfile.full_name,
                email: clientEmail,
                cpfCnpj: clientProfile.tax_id.replace(/\D/g, ''),
                postalCode: card_holder_postal_code ?? '',
                addressNumber: card_holder_address_number ?? '',
                phone: clientProfile.cellphone ?? '',
              },
              installmentCount: 1,
              installmentValue: toAsaas(totalAmount),
            }),
          })
        } catch (asaasErr: any) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          request.log.error({ err: asaasErr.message }, '[checkout] Erro no Asaas CARD')
          return reply.status(500).send({ error: 'Erro ao processar cartao. Tente novamente.' })
        }

        await fastify.supabase
          .from('orders')
          .update({ asaas_payment_id: charge.id, metadata: orderMetadata })
          .eq('id', order.id)

        return reply.status(201).send({
          data: {
            order_id: order.id,
            payment_method: 'CARD',
            amount_total: totalAmount,
            amount_service_total: serviceAmount,
            amount_card_fee: cardFee,
            card_fee_responsibility: 'READER',
            asaas_payment_id: charge.id,
            status: charge.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
          },
        })
      }

      let charge: any

      try {
        const customerId = await getOrCreateAsaasCustomer(fastify.asaas, {
          name: clientProfile.full_name,
          email: clientEmail,
          cpfCnpj: clientProfile.tax_id,
          mobilePhone: clientProfile.cellphone,
        })

        const dueDate = new Date(Date.now() + 10 * 60 * 1000)
        const pixDescription = sanitizePixDescription(order.id, gig.title)

        charge = await fastify.asaas('/payments', {
          method: 'POST',
          body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value: toAsaas(totalAmount),
            dueDate: dueDate.toISOString().split('T')[0],
            description: pixDescription,
            externalReference: order.id,
          }),
        })
      } catch (asaasErr: any) {
        await fastify.supabase
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('id', order.id)

        request.log.error({ err: asaasErr.message }, '[checkout] Erro no Asaas PIX')
        return reply.status(500).send({ error: 'Erro ao gerar pagamento. Tente novamente.' })
      }

      await fastify.supabase
        .from('orders')
        .update({ asaas_payment_id: charge.id, metadata: orderMetadata })
        .eq('id', order.id)

      let pixData: any
      try {
        pixData = await getPixQrCodeWithRetry(fastify.asaas, charge.id)
      } catch (asaasErr: any) {
        request.log.error(
          { err: asaasErr.message, paymentId: charge.id },
          '[checkout] Erro ao buscar QR Code PIX no Asaas'
        )
        return reply.status(500).send({ error: 'PIX criado, mas o QR Code ainda nao ficou disponivel. Tente novamente em instantes.' })
      }

      return reply.status(201).send({
        data: {
          order_id: order.id,
          pix_qr_code_id: charge.id,
          amount_total: totalAmount,
          amount_service_total: serviceAmount,
          pix: {
            qr_code_base64: pixData.encodedImage ?? null,
            copy_paste_code: pixData.payload ?? null,
            expires_at: charge.dueDate ?? null,
          },
        },
      })
    }
  )

  fastify.get<{ Params: { paymentId: string } }>(
    '/checkout/status/:paymentId',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { paymentId } = request.params

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id')
        .eq('asaas_payment_id', paymentId)
        .single()

      if (!order || order.client_id !== request.user.id) {
        return reply.status(404).send({ error: 'Pedido nao encontrado' })
      }

      if (order.status === 'PAID') {
        return reply.send({ data: { status: 'PAID', order_id: order.id } })
      }

      try {
        const charge = await fastify.asaas(`/payments/${paymentId}`)
        const asaasStatus = charge.status
        const mappedStatus = ['CONFIRMED', 'RECEIVED'].includes(asaasStatus) ? 'PAID' : asaasStatus

        if (mappedStatus === 'PAID' && order.status === 'PENDING_PAYMENT') {
          try {
            await processPaidAsaasOrder(fastify, paymentId)
          } catch (reconcileErr: any) {
            request.log.error(
              { paymentId, err: reconcileErr?.message ?? reconcileErr },
              '[checkout] Erro ao reconciliar pagamento confirmado via polling'
            )
          }
        }

        return reply.send({ data: { status: mappedStatus, order_id: order.id } })
      } catch {
        return reply.send({ data: { status: 'PENDING', order_id: order.id } })
      }
    }
  )
}

export default checkoutRoutes
