import { FastifyInstance } from 'fastify'
import { sendOrderPaidToReader, sendOrderPaidToClient } from './email.js'
import { notifyUser } from './notify.js'

async function getOrCreateWalletId(fastify: FastifyInstance, userId: string) {
  let { data: wallet } = await fastify.supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!wallet) {
    const { data: newWallet } = await fastify.supabase
      .from('wallets')
      .insert({ user_id: userId })
      .select('id')
      .single()

    wallet = newWallet
  }

  return wallet?.id ?? null
}

async function findOrderByMercadoPagoReference(
  fastify: FastifyInstance,
  paymentId: string,
  externalReference?: string | null
) {
  const select =
    'id, status, client_id, reader_id, amount_total, amount_service_total, amount_platform_fee, amount_reader_net, payment_method, mercadopago_payment_id, metadata, gigs(title, delivery_time_hours)'

  const byPaymentId = await fastify.supabase
    .from('orders')
    .select(select)
    .eq('mercadopago_payment_id', paymentId)
    .maybeSingle()

  if (byPaymentId.data) {
    return byPaymentId.data
  }

  if (!externalReference) {
    return null
  }

  const byExternalReference = await fastify.supabase
    .from('orders')
    .select(select)
    .eq('id', externalReference)
    .maybeSingle()

  return byExternalReference.data ?? null
}

export async function processPaidMpOrder(
  fastify: FastifyInstance,
  paymentId: string,
  options?: {
    externalReference?: string | null
    paymentMethodId?: string | null
    paymentTypeId?: string | null
  }
): Promise<{ orderId?: string; processed: boolean; found: boolean }> {
  const order = await findOrderByMercadoPagoReference(
    fastify,
    paymentId,
    options?.externalReference
  )

  if (!order) {
    return { found: false, processed: false }
  }

  if ((order as any).mercadopago_payment_id !== paymentId) {
    await fastify.supabase
      .from('orders')
      .update({
        mercadopago_payment_id: paymentId,
        metadata: {
          ...((order as any).metadata ?? {}),
          mercadopago: {
            ...(((order as any).metadata as Record<string, any> | undefined)?.mercadopago ?? {}),
            payment_method_id: options?.paymentMethodId ?? null,
            payment_type_id: options?.paymentTypeId ?? null,
          },
        },
      })
      .eq('id', order.id)
  }

  if (
    options?.paymentTypeId &&
    options.paymentTypeId !== 'credit_card' &&
    (order as any).payment_method === 'CARD'
  ) {
    const serviceAmount = (order as any).amount_service_total ?? order.amount_total
    const platformFee = (order as any).amount_platform_fee ?? 0

    await fastify.supabase
      .from('orders')
      .update({
        amount_total: serviceAmount,
        amount_reader_net: serviceAmount - platformFee,
        amount_card_fee: null,
        card_fee_responsibility: null,
        metadata: {
          ...((order as any).metadata ?? {}),
          mercadopago: {
            ...(((order as any).metadata as Record<string, any> | undefined)?.mercadopago ?? {}),
            payment_method_id: options.paymentMethodId ?? null,
            payment_type_id: options.paymentTypeId,
            checkout_mode: 'checkout_bricks',
          },
        },
      })
      .eq('id', order.id)

    ;(order as any).amount_total = serviceAmount
    ;(order as any).amount_reader_net = serviceAmount - platformFee
  }

  const { data: updated, error: updateError } = await fastify.supabase
    .from('orders')
    .update({ status: 'PAID' })
    .eq('id', order.id)
    .eq('status', 'PENDING_PAYMENT')
    .select('id')
    .single()

  if (updateError && (updateError as any).code !== 'PGRST116') {
    throw updateError
  }

  if (!updated) {
    return { found: true, processed: false, orderId: order.id }
  }

  const walletId = await getOrCreateWalletId(fastify, order.reader_id)

  if (walletId) {
    await fastify.supabase.from('transactions').insert({
      wallet_id: walletId,
      amount: order.amount_reader_net,
      type: 'SALE_CREDIT',
      status: 'PENDING',
      order_id: order.id,
      external_id: paymentId,
    })
  }

  await notifyUser(fastify, order.reader_id, {
    type: 'ORDER_NEW',
    title: 'Novo pedido recebido! 🎉',
    message: `Você recebeu um pedido de ${(order as any).gigs?.title ?? 'um serviço'}.`,
    link: `/orders/${order.id}`,
  })

  try {
    const { data: clientAuth } = await fastify.supabase.auth.admin.getUserById(order.client_id)
    const { data: readerAuth } = await fastify.supabase.auth.admin.getUserById(order.reader_id)
    const [clientProfile, readerProfile] = await Promise.all([
      fastify.supabase.from('profiles').select('full_name').eq('id', order.client_id).single(),
      fastify.supabase.from('profiles').select('full_name').eq('id', order.reader_id).single(),
    ])
    const gig = (order as any).gigs

    if (readerAuth.user?.email) {
      await sendOrderPaidToReader({
        readerEmail: readerAuth.user.email,
        readerName: readerProfile.data?.full_name ?? 'Cartomante',
        clientName: clientProfile.data?.full_name ?? 'Cliente',
        gigTitle: gig?.title ?? 'Leitura',
        amount: order.amount_reader_net,
        orderId: order.id,
      })
    }

    if (clientAuth.user?.email) {
      await sendOrderPaidToClient({
        clientEmail: clientAuth.user.email,
        clientName: clientProfile.data?.full_name ?? 'Cliente',
        readerName: readerProfile.data?.full_name ?? 'Cartomante',
        gigTitle: gig?.title ?? 'Leitura',
        amount: order.amount_total,
        orderId: order.id,
        deliveryHours: gig?.delivery_time_hours ?? 48,
      })
    }
  } catch (emailErr) {
    fastify.log.error({ emailErr, paymentId, orderId: order.id }, '[payments] Erro ao enviar emails pos-pagamento')
  }

  return { found: true, processed: true, orderId: order.id }
}
