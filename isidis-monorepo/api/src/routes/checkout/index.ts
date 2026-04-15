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

function getAsaasErrorMessage(error: any, fallback: string) {
  return (
    error?.responseBody?.errors?.[0]?.description ??
    error?.responseBody?.error ??
    error?.message ??
    fallback
  )
}

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
  order_id: z.string().uuid().optional(),
  gig_id: z.string().uuid(),
  add_on_ids: z.array(z.string()).default([]),
  requirements_answers: z.record(z.string(), z.string()).default({}),
  payment_method: z.enum(['PIX', 'CARD']).default('PIX'),
  card_token: z.string().optional(),
  card_number: z.string().optional(),
  card_expiry_month: z.string().optional(),
  card_expiry_year: z.string().optional(),
  card_cvv: z.string().optional(),
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
        order_id,
        gig_id,
        add_on_ids,
        requirements_answers,
        payment_method,
        card_token,
        card_number,
        card_expiry_month,
        card_expiry_year,
        card_cvv,
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

      let serviceAmount = gig.price + addOnTotal
      let platformFee = Math.round(serviceAmount * PLATFORM_FEE_PERCENT)
      const baseReaderNet = serviceAmount - platformFee
      let totalAmount = serviceAmount
      const cardFee = payment_method === 'CARD'
        ? calculateCardFee(serviceAmount)
        : null
      let orderReaderNet = payment_method === 'CARD' && cardFee !== null
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

      let order: { id: string } | null = null

      if (order_id) {
        const { data: existingOrder, error: existingOrderError } = await fastify.supabase
          .from('orders')
          .select(`
            id, gig_id, client_id, status,
            amount_total, amount_service_total, amount_platform_fee, amount_reader_net
          `)
          .eq('id', order_id)
          .single()

        if (existingOrderError || !existingOrder) {
          return reply.status(404).send({ error: 'Pedido pendente nao encontrado' })
        }

        if (existingOrder.client_id !== clientId) {
          return reply.status(403).send({ error: 'Sem permissao para reutilizar este pedido' })
        }

        if (existingOrder.status !== 'PENDING_PAYMENT') {
          return reply.status(400).send({ error: 'Somente pedidos pendentes podem ser reutilizados no checkout' })
        }

        if (existingOrder.gig_id !== gig_id) {
          return reply.status(400).send({ error: 'Pedido pendente nao corresponde ao servico selecionado' })
        }

        serviceAmount = existingOrder.amount_service_total ?? serviceAmount
        platformFee = existingOrder.amount_platform_fee ?? platformFee
        totalAmount = existingOrder.amount_total ?? serviceAmount
        orderReaderNet = payment_method === 'CARD' && cardFee !== null
          ? serviceAmount - platformFee - cardFee
          : existingOrder.amount_reader_net ?? orderReaderNet

        const { error: reuseError } = await fastify.supabase
          .from('orders')
          .update({
            amount_total: totalAmount,
            amount_service_total: serviceAmount,
            amount_platform_fee: platformFee,
            amount_reader_net: orderReaderNet,
            requirements_answers,
            selected_addons: add_on_ids,
            payment_method,
            metadata: orderMetadata,
            card_fee_responsibility: payment_method === 'CARD' ? 'READER' : null,
            amount_card_fee: cardFee,
          })
          .eq('id', existingOrder.id)

        if (reuseError) {
          request.log.error({ reuseError }, '[checkout] Erro ao atualizar pedido pendente')
          return reply.status(500).send({ error: 'Erro ao preparar pedido pendente' })
        }

        order = { id: existingOrder.id }
      } else {
        const { data: createdOrder, error: orderError } = await fastify.supabase
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

        if (orderError || !createdOrder) {
          request.log.error({ orderError }, '[checkout] Erro ao criar pedido')

          if (orderError?.message?.includes('orders.metadata')) {
            return reply.status(500).send({
              error: 'Migration pendente: execute fase12_security.sql no Supabase antes de usar o checkout.',
            })
          }

          return reply.status(500).send({ error: 'Erro ao criar pedido' })
        }

        order = createdOrder
      }

      if (payment_method === 'CARD') {
        const sanitizedCardNumber = card_number?.replace(/\D/g, '')
        const sanitizedCardCvv = card_cvv?.replace(/\D/g, '')
        const sanitizedExpiryMonth = card_expiry_month?.replace(/\D/g, '')
        const sanitizedExpiryYear = card_expiry_year?.replace(/\D/g, '')

        const hasRawCard =
          Boolean(sanitizedCardNumber) &&
          Boolean(sanitizedCardCvv) &&
          Boolean(sanitizedExpiryMonth) &&
          Boolean(sanitizedExpiryYear)

        if (!card_token && !hasRawCard) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          return reply.status(400).send({ error: 'Dados do cartao sao obrigatorios para pagamento com cartao' })
        }

        if (!card_holder_postal_code || !card_holder_address_number) {
          return reply.status(400).send({
            error: 'CEP e numero do endereco sao obrigatorios para pagamento com cartao',
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

          charge = await fastify.asaas('/payments', {
            method: 'POST',
            body: JSON.stringify({
              customer: customerId,
              billingType: 'CREDIT_CARD',
              value: toAsaas(totalAmount),
              dueDate: new Date().toISOString().split('T')[0],
              description: gig.title.slice(0, 100),
              externalReference: order.id,
              ...(card_token
                ? { creditCardToken: card_token }
                : {
                    creditCard: {
                      holderName: card_holder_name ?? clientProfile.full_name,
                      number: sanitizedCardNumber,
                      expiryMonth: sanitizedExpiryMonth,
                      expiryYear: sanitizedExpiryYear,
                      ccv: sanitizedCardCvv,
                    },
                  }),
              creditCardHolderInfo: {
                name: card_holder_name ?? clientProfile.full_name,
                email: clientEmail,
                cpfCnpj: clientProfile.tax_id.replace(/\D/g, ''),
                postalCode: card_holder_postal_code.replace(/\D/g, ''),
                addressNumber: card_holder_address_number,
                phone: clientProfile.cellphone?.replace(/\D/g, '') ?? '',
              },
              remoteIp: clientIp,
              installmentCount: 1,
              installmentValue: toAsaas(totalAmount),
            }),
          })
        } catch (asaasErr: any) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          request.log.error(
            {
              err: asaasErr.message,
              statusCode: asaasErr.statusCode,
              responseBody: asaasErr.responseBody,
            },
            '[checkout] Erro no Asaas CARD'
          )

          const statusCode = typeof asaasErr?.statusCode === 'number' ? asaasErr.statusCode : 502
          const errorMessage = getAsaasErrorMessage(asaasErr, 'Erro ao processar cartao. Tente novamente.')

          return reply.status(statusCode >= 400 && statusCode < 500 ? 400 : 502).send({ error: errorMessage })
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

        request.log.error(
          {
            err: asaasErr.message,
            statusCode: asaasErr.statusCode,
            responseBody: asaasErr.responseBody,
          },
          '[checkout] Erro no Asaas PIX'
        )

        const statusCode = typeof asaasErr?.statusCode === 'number' ? asaasErr.statusCode : 502
        const errorMessage = getAsaasErrorMessage(asaasErr, 'Erro ao gerar pagamento. Tente novamente.')

        return reply.status(statusCode >= 400 && statusCode < 500 ? 400 : 502).send({ error: errorMessage })
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
          {
            err: asaasErr.message,
            paymentId: charge.id,
            statusCode: asaasErr.statusCode,
            responseBody: asaasErr.responseBody,
          },
          '[checkout] Erro ao buscar QR Code PIX no Asaas'
        )
        return reply.status(502).send({ error: 'PIX criado, mas o QR Code ainda nao ficou disponivel. Tente novamente em instantes.' })
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
