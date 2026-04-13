import { supabase, supabaseAdmin } from '@/lib/supabase'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  social_name: string | null
  avatar_url: string | null
  role: 'CLIENT' | 'READER' | 'ADMIN'
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null
  created_at: string
  bio: string | null
  cellphone: string | null
  tax_id: string | null
  pix_key_type: string | null
  pix_key: string | null
  rating_average: number | null
  reviews_count: number | null
}

export interface UserOrder {
  id: string
  created_at: string
  status: string
  amount_total: number
  payment_method: string
  has_dispute: boolean
  client_id: string
  reader_id: string
  gig_title: string
  other_party_name: string
  role_in_order: 'client' | 'reader'
}

export interface WalletStats {
  available: number
  pending: number
  total_withdrawn: number
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, social_name, avatar_url, role, verification_status, created_at, bio, cellphone, tax_id, pix_key_type, pix_key, rating_average, reviews_count')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Get emails from auth — try admin list
  let emailMap: Map<string, string> = new Map()
  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authData?.users) {
      authData.users.forEach(u => emailMap.set(u.id, u.email ?? ''))
    }
  } catch {
    // service role not available — emails won't show
  }

  return (data ?? []).map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? '—',
  })) as AdminUser[]
}

export async function getUserDetail(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null

  let email = '—'
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch { /* ok */ }

  return { ...data, email } as AdminUser
}

export async function updateUser(id: string, updates: Partial<AdminUser>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function suspendUser(id: string): Promise<void> {
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'SUSPENDED' })
    .eq('id', id)
  if (profileError) throw profileError

  // Deactivate all gigs
  await supabaseAdmin
    .from('gigs')
    .update({ is_active: false })
    .eq('owner_id', id)
}

export async function activateUser(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'APPROVED' })
    .eq('id', id)
  if (error) throw error
}

export async function changeRole(id: string, role: 'CLIENT' | 'READER' | 'ADMIN'): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', id)
  if (error) throw error
}

export async function getUserOrders(userId: string): Promise<UserOrder[]> {
  const { data: asClient } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: asReader } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id')
    .eq('reader_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const allOrders = [
    ...(asClient ?? []).map(o => ({ ...o, role_in_order: 'client' as const })),
    ...(asReader ?? []).map(o => ({ ...o, role_in_order: 'reader' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Resolve names
  const userIds = [...new Set(allOrders.flatMap(o => [o.client_id, o.reader_id]))]
  const gigIds = [...new Set(allOrders.map(o => o.gig_id))]

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))
  const gigMap = new Map((gigs ?? []).map(g => [g.id, g.title]))

  return allOrders.map(o => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    amount_total: o.amount_total,
    payment_method: o.payment_method,
    has_dispute: o.has_dispute,
    client_id: o.client_id,
    reader_id: o.reader_id,
    gig_title: gigMap.get(o.gig_id) ?? 'N/A',
    other_party_name: o.role_in_order === 'client'
      ? (profileMap.get(o.reader_id) ?? 'Cartomante')
      : (profileMap.get(o.client_id) ?? 'Cliente'),
    role_in_order: o.role_in_order,
  }))
}

export async function getUserWalletStats(userId: string): Promise<WalletStats | null> {
  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!wallet) return null

  const { data: txns } = await supabaseAdmin
    .from('transactions')
    .select('type, status, amount')
    .eq('wallet_id', wallet.id)

  if (!txns) return { available: 0, pending: 0, total_withdrawn: 0 }

  const available = txns
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)

  const pending = txns
    .filter(t => t.type === 'SALE_CREDIT' && t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0)

  const total_withdrawn = txns
    .filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return { available, pending, total_withdrawn }
}

// Dashboard stats
export async function getDashboardStats() {
  const [
    { count: totalUsers },
    { count: totalReaders },
    { count: approvedReaders },
    { count: pendingReaders },
    { count: pendingGigs },
    { count: openDisputes },
    { count: openTickets },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER').eq('verification_status', 'APPROVED'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER').eq('verification_status', 'PENDING'),
    supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('has_dispute', true),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    totalReaders: totalReaders ?? 0,
    approvedReaders: approvedReaders ?? 0,
    pendingReaders: pendingReaders ?? 0,
    pendingGigs: pendingGigs ?? 0,
    openDisputes: openDisputes ?? 0,
    openTickets: openTickets ?? 0,
    totalOrders: totalOrders ?? 0,
  }
}
