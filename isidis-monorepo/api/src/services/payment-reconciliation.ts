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

export async function processPaidAsaasOrder(
  fastify: FastifyInstance,
  paymentId: string
): Promise<{ orderId?: string; processed: boolean; found: boolean }> {
  const { data: order } = await fastify.supabase
    .from('orders')
    .select('id, status, client_id, reader_id, amount_total, amount_reader_net, gigs(title, delivery_time_hours)')
    .eq('asaas_payment_id', paymentId)
    .single()

  if (!order) {
    return { found: false, processed: false }
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
