import { randomUUID } from 'crypto'
import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { checkFraud } from '../../services/fraud.js'
import { processPaidMpOrder } from '../../services/payment-reconciliation.js'

const PLATFORM_FEE_PERCENT = 0.15
const CARD_FEE_PERCENT = parseFloat(process.env.MERCADOPAGO_CARD_FEE_PERCENT ?? '0.0499')
const CARD_FEE_FIXED = parseInt(process.env.MERCADOPAGO_CARD_FEE_FIXED ?? '30', 10)
const MP_BASE_URL = 'https://api.mercadopago.com'

const optionalPositiveInteger = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().int().positive().optional())

const createCheckoutSchema = z.object({
  order_id: z.string().uuid().optional(),
  gig_id: z.string().uuid(),
  add_on_ids: z.array(z.string()).default([]),
  requirements_answers: z.record(z.string(), z.string()).default({}),
  payment_method: z.enum(['PIX', 'CARD']).default('PIX'),
  card_token: z.string().optional(),
  payment_method_id: z.string().optional(),
  installments: optionalPositiveInteger,
  issuer_id: optionalPositiveInteger,
  device_id: z.string().optional(),
  card_holder_name: z.string().optional(),
  card_holder_postal_code: z.string().optional(),
  card_holder_address_number: z.string().optional(),
  card_number: z.string().optional(),
  card_expiry_month: z.string().optional(),
  card_expiry_year: z.string().optional(),
  card_cvv: z.string().optional(),
})

const toDecimal = (cents: number) => Number((cents / 100).toFixed(2))

function calculateCardFee(amountInCents: number) {
  return Math.ceil(amountInCents * CARD_FEE_PERCENT) + CARD_FEE_FIXED
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

function normalizePublicBaseUrl(rawUrl?: string | null) {
  const trimmed = rawUrl?.trim()
  if (!trimmed) {
    return undefined
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)

    if (!['http:', 'https:'].includes(url.protocol)) {
      return undefined
    }

    url.pathname = ''
    url.search = ''
    url.hash = ''

    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

function getNotificationUrl(request: {
  headers: Record<string, string | string[] | undefined>
}) {
  const normalizedEnvUrl = normalizePublicBaseUrl(process.env.API_URL)
  if (normalizedEnvUrl) {
    return new URL('/webhooks/mercadopago?source_news=webhooks', normalizedEnvUrl).toString()
  }

  const forwardedProtoHeader = request.headers['x-forwarded-proto']
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(',')[0]?.trim()

  const forwardedHostHeader = request.headers['x-forwarded-host']
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader?.split(',')[0]?.trim()

  const hostHeader = request.headers.host
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
  const publicHost = forwardedHost || host
  const protocol = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const derivedBaseUrl = normalizePublicBaseUrl(
    publicHost ? `${protocol}://${publicHost}` : undefined
  )

  if (!derivedBaseUrl) {
    return undefined
  }

  return new URL('/webhooks/mercadopago?source_news=webhooks', derivedBaseUrl).toString()
}

function getCardRejectionMessage(statusDetail?: string) {
  const rejectionMap: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Cartao sem limite suficiente.',
    cc_rejected_bad_filled_date: 'Data de validade invalida.',
    cc_rejected_bad_filled_security_code: 'CVV invalido.',
    cc_rejected_bad_filled_other: 'Dados do cartao invalidos.',
    cc_rejected_blacklist: 'Cartao recusado pelo emissor.',
    cc_rejected_call_for_authorize: 'Autorizacao necessaria. Entre em contato com seu banco.',
    cc_rejected_card_disabled: 'Cartao desativado. Entre em contato com seu banco.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado detectado.',
    cc_rejected_high_risk: 'Transacao recusada por seguranca. Tente outro cartao.',
    cc_rejected_max_attempts: 'Muitas tentativas. Aguarde e tente novamente.',
    cc_rejected_other_reason: 'Cartao recusado. Tente outro cartao ou outra forma de pagamento.',
  }

  return rejectionMap[statusDetail ?? ''] ?? 'Cartao recusado. Tente outro cartao ou outra forma de pagamento.'
}

function hasInvalidNotificationUrlError(error: unknown) {
  const normalizedError = error as {
    message?: unknown
    responseBody?: {
      cause?: Array<{
        code?: unknown
        description?: unknown
      }>
    }
  }

  const message = typeof normalizedError?.message === 'string' ? normalizedError.message.toLowerCase() : ''
  const causes = Array.isArray(normalizedError?.responseBody?.cause) ? normalizedError.responseBody.cause : []

  if (message.includes('notificaction_url') || message.includes('notification_url')) {
    return true
  }

  return causes.some((cause) => {
    const code = Number(cause?.code)
    const description = typeof cause?.description === 'string' ? cause.description.toLowerCase() : ''
    return code === 4020 || description.includes('notificaction_url') || description.includes('notification_url')
  })
}

async function createPaymentWithNotificationFallback(params: {
  fastify: any
  request: any
  body: Record<string, unknown>
  requestOptions?: Record<string, unknown>
  notificationUrl?: string
  context: 'CARD' | 'PIX'
}) {
  const { fastify, request, body, requestOptions, notificationUrl, context } = params

  if (!notificationUrl) {
    return fastify.mp.createPayment({ body, requestOptions })
  }

  try {
    request.log.info({ notificationUrl }, `[checkout] MP ${context} notification URL resolvida`)

    return await fastify.mp.createPayment({
      body: {
        ...body,
        notification_url: notificationUrl,
      },
      requestOptions,
    })
  } catch (error) {
    if (!hasInvalidNotificationUrlError(error)) {
      throw error
    }

    request.log.warn(
      { notificationUrl },
      `[checkout] MP ${context} recusou notification_url; reenviando pagamento sem notification_url`
    )

    return fastify.mp.createPayment({ body, requestOptions })
  }
}

function buildPayerName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  const nameParts = normalized.split(' ')

  return {
    firstName: nameParts[0] ?? normalized,
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] ?? normalized,
  }
}

function buildPhone(cellphone?: string | null) {
  const rawPhone = cellphone?.replace(/\D/g, '') ?? ''

  if (rawPhone.length < 10) {
    return null
  }

  return {
    area_code: rawPhone.slice(0, 2),
    number: rawPhone.slice(2),
  }
}

async function tokenizeLegacyCard(params: {
  accessToken: string
  publicKey: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  holderName: string
  taxId: string
}) {
  let parsedYear = parseInt(params.expiryYear, 10)
  if (parsedYear < 100) {
    parsedYear += 2000
  }

  const response = await fetch(
    `${MP_BASE_URL}/v1/card_tokens?public_key=${params.publicKey}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_number: params.cardNumber,
        expiration_month: parseInt(params.expiryMonth, 10),
        expiration_year: parsedYear,
        security_code: params.cvv,
        cardholder: {
          name: params.holderName,
          identification: {
            type: 'CPF',
            number: params.taxId.replace(/\D/g, ''),
          },
        },
      }),
    }
  )

  const data = (await response.json().catch(() => ({}))) as Record<string, any>

  if (!response.ok || !data?.id) {
    const error = new Error(data?.message ?? data?.error ?? 'Erro ao tokenizar cartao') as Error & {
      statusCode?: number
      responseBody?: unknown
    }
    error.statusCode = response.status
    error.responseBody = data
    throw error
  }

  return data.id as string
}

async function resolveLegacyPaymentMethodId(params: {
  accessToken: string
  publicKey: string
  cardNumber: string
}) {
  const bin = params.cardNumber.slice(0, 6)

  const response = await fetch(
    `${MP_BASE_URL}/v1/payment_methods/search?bin=${bin}&public_key=${params.publicKey}`,
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const data = (await response.json().catch(() => ({}))) as Record<string, any>

  if (!response.ok || !Array.isArray(data?.results) || data.results.length === 0) {
    const error = new Error(data?.message ?? data?.error ?? 'Nao foi possivel identificar a bandeira do cartao') as Error & {
      statusCode?: number
      responseBody?: unknown
    }
    error.statusCode = response.status
    error.responseBody = data
    throw error
  }

  const creditCardMethod =
    data.results.find((item: any) => item.payment_type_id === 'credit_card' && item.status === 'active') ??
    data.results[0]

  return {
    paymentMethodId: creditCardMethod.id as string,
    issuerId:
      typeof creditCardMethod.issuer?.id === 'number' || typeof creditCardMethod.issuer?.id === 'string'
        ? Number(creditCardMethod.issuer.id)
        : undefined,
  }
}

const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/checkout/config', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const clientId = request.user.id

    const { data: clientProfile } = await fastify.supabase
      .from('profiles')
      .select('tax_id')
      .eq('id', clientId)
      .single()

    const { data: clientAuthData } = await fastify.supabase.auth.admin.getUserById(clientId)
    const clientEmail = clientAuthData.user?.email ?? undefined
    const taxId = clientProfile?.tax_id?.replace(/\D/g, '') || undefined

    return reply.send({
      data: {
        gateway: 'mercadopago',
        public_key: process.env.MERCADOPAGO_PUBLIC_KEY,
        locale: 'pt-BR',
        payer: {
          ...(clientEmail && { email: clientEmail }),
          ...(taxId && {
            identification: {
              type: 'CPF',
              number: taxId,
            },
          }),
        },
      },
    })
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
        payment_method_id,
        installments,
        issuer_id,
        device_id,
        card_holder_name,
        card_holder_postal_code,
        card_holder_address_number,
        card_number,
        card_expiry_month,
        card_expiry_year,
        card_cvv,
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

      const { data: clientAuthData } = await fastify.supabase.auth.admin.getUserById(clientId)
      const clientEmail = clientAuthData.user?.email ?? ''

      if (!clientEmail) {
        return reply.status(400).send({ error: 'Nao foi possivel identificar o email da sua conta para processar o pagamento' })
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
        const mpPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY
        const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        const holderName = card_holder_name?.trim() || clientProfile.full_name
        const sanitizedCardNumber = card_number?.replace(/\D/g, '')
        const sanitizedCardCvv = card_cvv?.replace(/\D/g, '')
        const sanitizedExpiryMonth = card_expiry_month?.replace(/\D/g, '')
        const sanitizedExpiryYear = card_expiry_year?.replace(/\D/g, '')
        const hasLegacyRawCard =
          Boolean(sanitizedCardNumber) &&
          Boolean(sanitizedCardCvv) &&
          Boolean(sanitizedExpiryMonth) &&
          Boolean(sanitizedExpiryYear)

        const hasTokenizedCard = Boolean(card_token && payment_method_id && installments)

        if (!hasTokenizedCard && !hasLegacyRawCard) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          return reply.status(400).send({
            error: 'Dados tokenizados do cartao sao obrigatorios para pagamento com cartao',
          })
        }

        let finalCardToken = card_token
        let finalPaymentMethodId = payment_method_id
        let finalIssuerId = issuer_id
        let finalInstallments = installments ?? 1

        try {
          if (!hasTokenizedCard && hasLegacyRawCard) {
            if (!mpPublicKey || !mpAccessToken) {
              throw new Error('Configuracao do Mercado Pago incompleta para compatibilidade legada de cartao')
            }

            request.log.warn(
              { orderId: order.id },
              '[checkout] Fluxo legado de cartao acionado; o web deve usar tokenizacao no cliente'
            )

            finalCardToken = await tokenizeLegacyCard({
              accessToken: mpAccessToken,
              publicKey: mpPublicKey,
              cardNumber: sanitizedCardNumber!,
              expiryMonth: sanitizedExpiryMonth!,
              expiryYear: sanitizedExpiryYear!,
              cvv: sanitizedCardCvv!,
              holderName,
              taxId: clientProfile.tax_id,
            })

            const legacyMethod = await resolveLegacyPaymentMethodId({
              accessToken: mpAccessToken,
              publicKey: mpPublicKey,
              cardNumber: sanitizedCardNumber!,
            })

            finalPaymentMethodId = legacyMethod.paymentMethodId
            finalIssuerId = legacyMethod.issuerId
            finalInstallments = 1
          }

          if (!finalCardToken || !finalPaymentMethodId) {
            throw Object.assign(
              new Error('payment_method_id e card_token sao obrigatorios para pagamentos tokenizados'),
              { statusCode: 400 }
            )
          }

          if (finalInstallments !== 1) {
            throw Object.assign(
              new Error('No momento, pagamentos com cartao estao disponiveis somente em 1 parcela'),
              { statusCode: 400 }
            )
          }

          const { firstName, lastName } = buildPayerName(clientProfile.full_name)
          const phone = buildPhone(clientProfile.cellphone)
          const postalCode = card_holder_postal_code?.replace(/\D/g, '')
          const notificationUrl = getNotificationUrl(request)
          const requestOptions = {
            ...(device_id && { meliSessionId: device_id }),
            idempotencyKey: randomUUID(),
          }

          const charge = await createPaymentWithNotificationFallback({
            fastify,
            request,
            notificationUrl,
            context: 'CARD',
            body: {
              transaction_amount: toDecimal(totalAmount),
              token: finalCardToken,
              description: sanitizePixDescription(order.id, gig.title),
              installments: finalInstallments,
              capture: true,
              payment_method_id: finalPaymentMethodId,
              issuer_id: finalIssuerId,
              statement_descriptor: 'ISIDIS',
              payer: {
                email: clientEmail,
                first_name: firstName,
                last_name: lastName,
                entity_type: 'individual',
                identification: {
                  type: 'CPF',
                  number: clientProfile.tax_id.replace(/\D/g, ''),
                },
                ...(phone && { phone }),
                ...(postalCode && {
                  address: {
                    zip_code: postalCode,
                    ...(card_holder_address_number && { street_number: card_holder_address_number }),
                  },
                }),
              },
              additional_info: {
                ip_address: clientIp,
                items: [
                  {
                    id: gig_id,
                    title: gig.title,
                    description: gig.title,
                    quantity: 1,
                    unit_price: toDecimal(totalAmount),
                  },
                ],
                payer: {
                  first_name: firstName,
                  last_name: lastName,
                  ...(phone && { phone }),
                  ...(postalCode && {
                    address: {
                      zip_code: postalCode,
                      ...(card_holder_address_number && { street_number: card_holder_address_number }),
                    },
                  }),
                },
              },
              external_reference: order.id,
            },
            requestOptions,
          })

          request.log.info(
            { chargeId: charge.id, chargeStatus: charge.status, statusDetail: charge.status_detail },
            '[checkout] MP CARD charge criado'
          )

          if (charge.status === 'rejected') {
            throw Object.assign(
              new Error(getCardRejectionMessage(charge.status_detail)),
              {
                statusCode: 422,
                responseBody: {
                  status: charge.status,
                  status_detail: charge.status_detail,
                },
              }
            )
          }

          await fastify.supabase
            .from('orders')
            .update({
              asaas_payment_id: charge.id?.toString(),
              metadata: {
                ...orderMetadata,
                mercadopago: {
                  payment_method_id: finalPaymentMethodId,
                  issuer_id: finalIssuerId ?? null,
                  installments: finalInstallments,
                  last_four_digits: charge.card?.last_four_digits ?? null,
                },
              },
            })
            .eq('id', order.id)

          return reply.status(201).send({
            data: {
              order_id: order.id,
              payment_method: 'CARD',
              amount_total: totalAmount,
              amount_service_total: serviceAmount,
              amount_card_fee: cardFee,
              card_fee_responsibility: 'READER',
              asaas_payment_id: charge.id?.toString(),
              payment_id: charge.id?.toString(),
              status: ['approved', 'authorized'].includes(charge.status ?? '') ? 'CONFIRMED' : 'PENDING',
            },
          })
        } catch (mpErr: any) {
          await fastify.supabase
            .from('orders')
            .update({ status: 'CANCELED' })
            .eq('id', order.id)

          request.log.error(
            {
              err: mpErr.message,
              statusCode: mpErr.statusCode,
              responseBody: mpErr.responseBody,
            },
            '[checkout] Erro no MP CARD'
          )

          const statusCode = typeof mpErr?.statusCode === 'number' ? mpErr.statusCode : 502
          const errorMessage = mpErr.message ?? 'Erro ao processar cartao. Tente novamente.'

          return reply
            .status(statusCode >= 400 && statusCode < 500 ? statusCode : 502)
            .send({ error: errorMessage })
        }
      }

      try {
        const { firstName } = buildPayerName(clientProfile.full_name)
        const dueDate = new Date(Date.now() + 15 * 60 * 1000)
        const notificationUrl = getNotificationUrl(request)
        const requestOptions = {
          idempotencyKey: randomUUID(),
        }

        const charge = await createPaymentWithNotificationFallback({
          fastify,
          request,
          notificationUrl,
          context: 'PIX',
          body: {
            transaction_amount: toDecimal(totalAmount),
            description: sanitizePixDescription(order.id, gig.title),
            payment_method_id: 'pix',
            payer: {
              email: clientEmail,
              first_name: firstName,
              identification: {
                type: 'CPF',
                number: clientProfile.tax_id.replace(/\D/g, ''),
              },
            },
            date_of_expiration: dueDate.toISOString(),
            external_reference: order.id,
          },
          requestOptions,
        })

        await fastify.supabase
          .from('orders')
          .update({
            asaas_payment_id: charge.id?.toString(),
            metadata: {
              ...orderMetadata,
              mercadopago: {
                payment_method_id: 'pix',
              },
            },
          })
          .eq('id', order.id)

        const transactionData = charge.point_of_interaction?.transaction_data

        return reply.status(201).send({
          data: {
            order_id: order.id,
            pix_qr_code_id: charge.id?.toString(),
            amount_total: totalAmount,
            amount_service_total: serviceAmount,
            payment_id: charge.id?.toString(),
            pix: {
              qr_code_base64: transactionData?.qr_code_base64 ?? null,
              copy_paste_code: transactionData?.qr_code ?? null,
              expires_at: charge.date_of_expiration ?? null,
            },
          },
        })
      } catch (mpErr: any) {
        await fastify.supabase
          .from('orders')
          .update({ status: 'CANCELED' })
          .eq('id', order.id)

        request.log.error(
          {
            err: mpErr.message,
            statusCode: mpErr.statusCode,
            responseBody: mpErr.responseBody,
          },
          '[checkout] Erro no MP PIX'
        )

        const statusCode = typeof mpErr?.statusCode === 'number' ? mpErr.statusCode : 502
        let errorMessage = mpErr.message ?? 'Erro ao gerar pagamento PIX. Tente novamente.'

        if (errorMessage.includes('without key enabled for QR render')) {
          errorMessage = 'A conta Mercado Pago desta plataforma nao possui uma Chave PIX configurada. Adicione uma chave no painel do MP para receber via PIX.'
        }

        return reply
          .status(statusCode >= 400 && statusCode < 500 ? statusCode : 502)
          .send({ error: errorMessage })
      }
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
        const charge = await fastify.mp.getPayment(paymentId)
        const mpStatus = charge.status
        const mappedStatus = ['approved', 'authorized'].includes(mpStatus) ? 'PAID' : mpStatus?.toUpperCase() ?? 'PENDING'

        if (mappedStatus === 'PAID' && order.status === 'PENDING_PAYMENT') {
          try {
            await processPaidMpOrder(fastify, paymentId)
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
