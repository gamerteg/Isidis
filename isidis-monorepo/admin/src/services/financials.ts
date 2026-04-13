import { supabaseAdmin } from '@/lib/supabase'

export interface FinancialStats {
  total_revenue: number
  platform_fee: number
  total_repasse: number
  total_withdrawn: number
  pending_repasse: number
}

export interface PendingWithdrawal {
  id: string
  created_at: string
  amount: number
  status: string
  pix_key: string
  pix_key_type: string
  notes: string | null
  user_id: string
  user_name: string
}

export interface OrderFinancialRow {
  id: string
  created_at: string
  status: string
  amount_total: number
  amount_platform_fee: number
  amount_reader_net: number
  payment_method: string
  client_name: string
  reader_name: string
  gig_title: string
}

export async function getFinancialStats(): Promise<FinancialStats> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_admin_financial_stats')
    if (!error && data) return data as FinancialStats
  } catch { /* fallback to manual */ }

  // Fallback: calculate manually
  const { data: txns } = await supabaseAdmin
    .from('transactions')
    .select('type, status, amount')

  if (!txns) return { total_revenue: 0, platform_fee: 0, total_repasse: 0, total_withdrawn: 0, pending_repasse: 0 }

  const completedSales = txns.filter(t => t.type === 'SALE_CREDIT' && t.status === 'COMPLETED')
  const completedWithdrawals = txns.filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')

  const total_repasse = completedSales.reduce((s, t) => s + t.amount, 0)
  const total_withdrawn = completedWithdrawals.reduce((s, t) => s + Math.abs(t.amount), 0)

  // Get platform fees from orders
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('amount_total, amount_platform_fee, amount_reader_net')
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])

  const total_revenue = (orders ?? []).reduce((s, o) => s + o.amount_total, 0)
  const platform_fee = (orders ?? []).reduce((s, o) => s + o.amount_platform_fee, 0)
  const pending_repasse = total_repasse - total_withdrawn

  return { total_revenue, platform_fee, total_repasse, total_withdrawn, pending_repasse }
}

export async function listPendingWithdrawals(): Promise<PendingWithdrawal[]> {
  const { data: txns, error } = await supabaseAdmin
    .from('transactions')
    .select('id, created_at, amount, status, metadata, wallets!inner(user_id)')
    .eq('type', 'WITHDRAWAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error || !txns) return []

  const userIds = [...new Set(txns.map(t => (t.wallets as unknown as { user_id: string }).user_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Desconhecido']))

  return txns.map(t => {
    const meta = (t.metadata as Record<string, string> | null) ?? {}
    const userId = (t.wallets as unknown as { user_id: string }).user_id
    return {
      id: t.id,
      created_at: t.created_at,
      amount: Math.abs(t.amount),
      status: t.status,
      pix_key: meta.pix_key ?? '—',
      pix_key_type: meta.pix_key_type ?? '—',
      notes: meta.notes ?? null,
      user_id: userId,
      user_name: profileMap.get(userId) ?? 'Desconhecido',
    }
  })
}

export async function updateWithdrawalStatus(id: string, status: 'COMPLETED' | 'FAILED'): Promise<void> {
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function listRecentOrders(limit = 50): Promise<OrderFinancialRow[]> {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, payment_method, client_id, reader_id, gig_id')
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const orders = data ?? []

  const userIds = [...new Set(orders.flatMap(o => [o.client_id, o.reader_id]))]
  const gigIds = [...new Set(orders.map(o => o.gig_id))]

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? '']))
  const gigMap = new Map((gigs ?? []).map(g => [g.id, g.title ?? '']))

  return orders.map(o => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    amount_total: o.amount_total,
    amount_platform_fee: o.amount_platform_fee,
    amount_reader_net: o.amount_reader_net,
    payment_method: o.payment_method,
    client_name: profileMap.get(o.client_id) ?? 'Cliente',
    reader_name: profileMap.get(o.reader_id) ?? 'Cartomante',
    gig_title: gigMap.get(o.gig_id) ?? 'Serviço',
  }))
}
