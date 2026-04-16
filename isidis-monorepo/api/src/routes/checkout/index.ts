import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { checkFraud } from '../../services/fraud.js'
import { processPaidMpOrder } from '../../services/payment-reconciliation.js'

const PLATFORM_FEE_PERCENT = 0.15
const CARD_FEE_PERCENT = parseFloat(process.env.MERCADOPAGO_CARD_FEE_PERCENT ?? '0.0499')
const CARD_FEE_FIXED = parseInt(process.env.MERCADOPAGO_CARD_FEE_FIXED ?? '30', 10) // 30 centavos

const toDecimal = (centavos: number) => Number((centavos / 100).toFixed(2))

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
    return reply.send({ data: { gateway: 'mercadopago' } })
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

        let finalCardToken = card_token
        let derivedPaymentMethodId = 'visa' // standard fallback

        try {
            if (!finalCardToken && hasRawCard) {
                let parsedYear = parseInt(sanitizedExpiryYear!);
                if (parsedYear < 100) {
                    parsedYear += 2000;
                }

                const mpPublicKey = process.env.MERCADOPAGO_PUBLIC_KEY
                const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
                if (!mpPublicKey) {
                    request.log.error('[checkout] MERCADOPAGO_PUBLIC_KEY nao esta definida nas variaveis de ambiente!')
                    throw new Error('Configuracao do gateway de pagamento incompleta. Contate o suporte.')
                }
                request.log.info({ mpPublicKey: mpPublicKey.slice(0, 20) + '...' }, '[checkout] Tokenizando cartao com public_key')

                // /v1/card_tokens requires public_key auth (not access_token) - call raw fetch
                const tokenRaw = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${mpPublicKey}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${mpAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        card_number: sanitizedCardNumber,
                        expiration_month: parseInt(sanitizedExpiryMonth!),
                        expiration_year: parsedYear,
                        security_code: sanitizedCardCvv,
                        cardholder: {
                            name: card_holder_name ?? clientProfile.full_name,
                            identification: {
                                type: 'CPF',
                                number: clientProfile.tax_id.replace(/\D/g, '')
                            }
                        }
                    })
                })
                const tokenRes: any = await tokenRaw.json()
                request.log.info({ tokenStatus: tokenRaw.status, tokenId: tokenRes?.id }, '[checkout] Resposta MP card_tokens')
                if (!tokenRaw.ok || !tokenRes?.id) {
                    const errMsg = tokenRes?.message ?? tokenRes?.error ?? 'Erro ao tokenizar cartao'
                    throw Object.assign(new Error(errMsg), { statusCode: tokenRaw.status, responseBody: tokenRes })
                }
                finalCardToken = tokenRes.id
                
                // Get bin for payment method
                const binRes = await fastify.mp(`/v1/payment_methods/search?bin=${sanitizedCardNumber!.substring(0, 6)}&public_key=${mpPublicKey}`)
                if (binRes.results && binRes.results.length > 0) {
                    // Prefer credit_card type to avoid picking debit/prepaid variants (diff_param_bins error)
                    const creditMethod = binRes.results.find(
                        (m: any) => m.payment_type_id === 'credit_card' && m.status === 'active'
                    ) ?? binRes.results[0]
                    derivedPaymentMethodId = creditMethod.id
                    request.log.info({ paymentMethodId: derivedPaymentMethodId, resultsCount: binRes.results.length }, '[checkout] BIN lookup payment_method')
                }
            } else if (card_token) {
                 // if token provided by MP SDK, SDK handles payment_method mapping. Let's fallback to infering or maybe client sends it. Currently we don't have it so we just supply generic credit_card or visa
                 derivedPaymentMethodId = 'master' // MP typically validates via token anyway
            }
        
            const charge = await fastify.mp('/v1/payments', {
              method: 'POST',
              body: JSON.stringify({
                transaction_amount: toDecimal(totalAmount),
                token: finalCardToken,
                description: sanitizePixDescription(order.id, gig.title),
                installments: 1,
                payment_method_id: derivedPaymentMethodId, // MP typically reads from token / BIN
                payer: {
                  email: clientEmail,
                  first_name: clientProfile.full_name.split(' ')[0],
                  identification: {
                    type: 'CPF',
                    number: clientProfile.tax_id.replace(/\D/g, '')
                  }
                },
                external_reference: order.id,
              }),
            })
            
            await fastify.supabase
              .from('orders')
              .update({ asaas_payment_id: charge.id?.toString(), metadata: orderMetadata })
              .eq('id', order.id)

            return reply.status(201).send({
              data: {
                order_id: order.id,
                payment_method: 'CARD',
                amount_total: totalAmount,
                amount_service_total: serviceAmount,
                amount_card_fee: cardFee,
                card_fee_responsibility: 'READER',
                // Keep the property name to avoid breaking frontend immediately
                asaas_payment_id: charge.id?.toString(), 
                status: charge.status === 'approved' ? 'CONFIRMED' : 'PENDING',
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

          return reply.status(statusCode >= 400 && statusCode < 500 ? 400 : 502).send({ error: errorMessage })
        }
      }

      // PIX Flow
      try {
        const dueDate = new Date(Date.now() + 15 * 60 * 1000) // MP supports 15min well
        const pixDescription = sanitizePixDescription(order.id, gig.title)

        const charge = await fastify.mp('/v1/payments', {
          method: 'POST',
          body: JSON.stringify({
            transaction_amount: toDecimal(totalAmount),
            description: pixDescription,
            payment_method_id: 'pix',
            payer: {
              email: clientEmail,
              first_name: clientProfile.full_name.split(' ')[0],
              identification: {
                type: 'CPF',
                number: clientProfile.tax_id.replace(/\D/g, '')
              }
            },
            date_of_expiration: dueDate.toISOString(),
            external_reference: order.id,
          }),
        })

        await fastify.supabase
          .from('orders')
          .update({ asaas_payment_id: charge.id?.toString(), metadata: orderMetadata })
          .eq('id', order.id)

        const transactionData = charge.point_of_interaction?.transaction_data

        return reply.status(201).send({
          data: {
            order_id: order.id,
            pix_qr_code_id: charge.id?.toString(),
            amount_total: totalAmount,
            amount_service_total: serviceAmount,
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

        return reply.status(statusCode >= 400 && statusCode < 500 ? 400 : 502).send({ error: errorMessage })
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
        const charge = await fastify.mp(`/v1/payments/${paymentId}`)
        const mpStatus = charge.status
        const mappedStatus = ['approved', 'authorized'].includes(mpStatus) ? 'PAID' : mpStatus.toUpperCase()

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
