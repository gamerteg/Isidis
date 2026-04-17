import { supabaseAdmin } from '@/lib/supabase'

export interface AdminOrder {
  id: string
  created_at: string
  status: string
  amount_total: number
  amount_platform_fee: number
  amount_reader_net: number
  amount_card_fee: number
  payment_method: string
  has_dispute: boolean
  disputed_at: string | null
  delivered_at: string | null
  client_id: string
  reader_id: string
  gig_id: string
  client_name: string
  reader_name: string
  gig_title: string
  mercadopago_payment_id: string | null
}

export interface OrderFilters {
  status?: string
  has_dispute?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export async function listOrders(filters: OrderFilters = {}): Promise<{ data: AdminOrder[]; count: number }> {
  const { status, has_dispute, page = 0, pageSize = 50 } = filters

  let query = supabaseAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, amount_card_fee, payment_method, has_dispute, disputed_at, delivered_at, client_id, reader_id, gig_id, mercadopago_payment_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (has_dispute !== undefined) query = query.eq('has_dispute', has_dispute)

  const { data, error, count } = await query
  if (error) throw error

  const orders = data ?? []
  const userIds = [...new Set(orders.flatMap(o => [o.client_id, o.reader_id]))]
  const gigIds = [...new Set(orders.map(o => o.gig_id))]

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Desconhecido']))
  const gigMap = new Map((gigs ?? []).map(g => [g.id, g.title ?? 'N/A']))

  return {
    data: orders.map(o => ({
      ...o,
      client_name: profileMap.get(o.client_id) ?? 'Cliente',
      reader_name: profileMap.get(o.reader_id) ?? 'Cartomante',
      gig_title: gigMap.get(o.gig_id) ?? 'Serviço',
      amount_card_fee: o.amount_card_fee ?? 0,
    })),
    count: count ?? 0,
  }
}

export async function getOrderDetail(id: string): Promise<AdminOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', [data.client_id, data.reader_id])

  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('title')
    .eq('id', data.gig_id)
    .single()

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? '']))

  return {
    ...data,
    client_name: profileMap.get(data.client_id) ?? 'Cliente',
    reader_name: profileMap.get(data.reader_id) ?? 'Cartomante',
    gig_title: gig?.title ?? 'Serviço',
    amount_card_fee: data.amount_card_fee ?? 0,
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { error: orderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'CANCELED' })
    .eq('id', orderId)
  if (orderError) throw orderError

  await supabaseAdmin
    .from('transactions')
    .update({ status: 'FAILED' })
    .eq('order_id', orderId)
}

export async function resolveDispute(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('client_id, reader_id')
    .eq('id', orderId)
    .single()

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ has_dispute: false })
    .eq('id', orderId)
  if (error) throw error

  if (order) {
    const notifications = [
      {
        user_id: order.client_id,
        type: 'ORDER_UPDATE',
        title: 'Disputa encerrada',
        message: 'A disputa do seu pedido foi encerrada pelo suporte.',
        link: '/dashboard/pedidos',
      },
      {
        user_id: order.reader_id,
        type: 'ORDER_UPDATE',
        title: 'Disputa encerrada',
        message: 'A disputa do pedido foi encerrada pelo suporte.',
        link: '/dashboard/cartomante/pedidos',
      },
    ]
    await supabaseAdmin.from('notifications').insert(notifications)
  }
}

export const ORDER_STATUS_MAP: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'outline' | 'destructive' }> = {
  PENDING_PAYMENT: { label: 'Aguard. Pagamento', variant: 'outline' },
  PAID: { label: 'Pago', variant: 'info' },
  DELIVERED: { label: 'Entregue', variant: 'warning' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  CANCELED: { label: 'Cancelado', variant: 'destructive' },
}
