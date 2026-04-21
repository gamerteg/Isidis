import { supabase, supabaseLegacyAdmin } from '@/lib/supabase'
import type {
  AdminDashboardOverview,
  AdminFinancialOverview,
  AdminOpsHealth,
  AdminOrderListItem,
  PendingWithdrawalItem,
  OrderFinancialRow,
} from '@/types/admin-api'
import type { AdminUser, UserOrder, WalletStats } from '@/services/users'
import type { PendingReader, ReaderDetail } from '@/services/approvals'
import type { PendingGig } from '@/services/gigs'
import type { Ticket, TicketDetail } from '@/services/tickets'

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function createCompatibilityHealth(message = 'API /admin/* ainda nao publicada; usando fallback legado.') {
  return {
    generated_at: new Date().toISOString(),
    stuck_pending_payment_orders: 0,
    stuck_sale_credit_holds: 0,
    pending_withdrawals: 0,
    missing_env: [],
    warnings: [message],
    has_issues: false,
  } satisfies AdminOpsHealth
}

export async function legacyListOrders(filters: {
  status?: string
  has_dispute?: boolean
  page?: number
  pageSize?: number
}): Promise<{ data: AdminOrderListItem[]; count: number }> {
  const { status, has_dispute, page = 0, pageSize = 50 } = filters

  let query = supabaseLegacyAdmin
    .from('orders')
    .select(
      'id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, amount_card_fee, payment_method, has_dispute, disputed_at, delivered_at, client_id, reader_id, gig_id, mercadopago_payment_id',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (has_dispute !== undefined) query = query.eq('has_dispute', has_dispute)

  const { data, error, count } = await query
  if (error) throw error

  const orders = data ?? []
  const userIds = unique(orders.flatMap((order) => [order.client_id, order.reader_id]))
  const gigIds = unique(orders.map((order) => order.gig_id))

  const { data: profiles } = await supabaseLegacyAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseLegacyAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? 'Desconhecido']))
  const gigMap = new Map((gigs ?? []).map((gig) => [gig.id, gig.title ?? 'N/A']))

  return {
    data: orders.map((order) => ({
      ...order,
      client_name: profileMap.get(order.client_id) ?? 'Cliente',
      reader_name: profileMap.get(order.reader_id) ?? 'Cartomante',
      gig_title: gigMap.get(order.gig_id) ?? 'Servico',
      amount_card_fee: order.amount_card_fee ?? 0,
    })),
    count: count ?? 0,
  }
}

export async function legacyGetOrderDetail(id: string) {
  const { data, error } = await supabaseLegacyAdmin.from('orders').select('*').eq('id', id).single()
  if (error || !data) return null

  const { data: profiles } = await supabaseLegacyAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', [data.client_id, data.reader_id])

  const { data: gig } = await supabaseLegacyAdmin.from('gigs').select('title').eq('id', data.gig_id).single()
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? '']))

  return {
    ...data,
    client_name: profileMap.get(data.client_id) ?? 'Cliente',
    reader_name: profileMap.get(data.reader_id) ?? 'Cartomante',
    gig_title: gig?.title ?? 'Servico',
    amount_card_fee: data.amount_card_fee ?? 0,
  }
}

export async function legacyCancelOrder(orderId: string) {
  const { error: orderError } = await supabaseLegacyAdmin
    .from('orders')
    .update({ status: 'CANCELED' })
    .eq('id', orderId)

  if (orderError) throw orderError

  await supabaseLegacyAdmin.from('transactions').update({ status: 'FAILED' }).eq('order_id', orderId)
}

export async function legacyResolveDispute(orderId: string) {
  const { data: order } = await supabaseLegacyAdmin
    .from('orders')
    .select('client_id, reader_id')
    .eq('id', orderId)
    .single()

  const { error } = await supabaseLegacyAdmin
    .from('orders')
    .update({ has_dispute: false })
    .eq('id', orderId)

  if (error) throw error

  if (order) {
    await supabaseLegacyAdmin.from('notifications').insert([
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
    ])
  }
}

export async function legacyGetFinancialOverview(): Promise<AdminFinancialOverview> {
  let stats = {
    total_revenue: 0,
    platform_fee: 0,
    total_repasse: 0,
    total_withdrawn: 0,
    pending_repasse: 0,
  }

  try {
    const { data, error } = await supabaseLegacyAdmin.rpc('get_admin_financial_stats')
    if (!error && data) {
      stats = data as typeof stats
    }
  } catch {
    // fallback manual abaixo
  }

  if (stats.total_revenue === 0 && stats.platform_fee === 0 && stats.total_repasse === 0) {
    const { data: txns } = await supabaseLegacyAdmin.from('transactions').select('type, status, amount')
    const completedSales = (txns ?? []).filter((txn) => txn.type === 'SALE_CREDIT' && txn.status === 'COMPLETED')
    const completedWithdrawals = (txns ?? []).filter((txn) => txn.type === 'WITHDRAWAL' && txn.status === 'COMPLETED')
    const totalRepasse = completedSales.reduce((sum, txn) => sum + txn.amount, 0)
    const totalWithdrawn = completedWithdrawals.reduce((sum, txn) => sum + Math.abs(txn.amount), 0)

    const { data: orders } = await supabaseLegacyAdmin
      .from('orders')
      .select('amount_total, amount_platform_fee')
      .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])

    stats = {
      total_revenue: (orders ?? []).reduce((sum, order) => sum + order.amount_total, 0),
      platform_fee: (orders ?? []).reduce((sum, order) => sum + order.amount_platform_fee, 0),
      total_repasse: totalRepasse,
      total_withdrawn: totalWithdrawn,
      pending_repasse: totalRepasse - totalWithdrawn,
    }
  }

  const recent_orders = await legacyListRecentOrders(50)
  return {
    stats,
    recent_orders,
    health: createCompatibilityHealth(),
    generated_at: new Date().toISOString(),
  }
}

export async function legacyListPendingWithdrawals(): Promise<PendingWithdrawalItem[]> {
  const { data: txns, error } = await supabaseLegacyAdmin
    .from('transactions')
    .select('id, created_at, amount, status, metadata, wallets!inner(user_id)')
    .eq('type', 'WITHDRAWAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error || !txns) return []

  const userIds = unique(txns.map((txn) => (txn.wallets as unknown as { user_id: string }).user_id))
  const { data: profiles } = await supabaseLegacyAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? 'Desconhecido']))

  return txns.map((txn) => {
    const metadata = (txn.metadata as Record<string, string> | null) ?? {}
    const userId = (txn.wallets as unknown as { user_id: string }).user_id

    return {
      id: txn.id,
      created_at: txn.created_at,
      amount: Math.abs(txn.amount),
      status: txn.status,
      pix_key: metadata.pix_key ?? '—',
      pix_key_type: metadata.pix_key_type ?? '—',
      notes: metadata.notes ?? null,
      user_id: userId,
      user_name: profileMap.get(userId) ?? 'Desconhecido',
    }
  })
}

export async function legacyUpdateWithdrawalStatus(id: string, status: 'COMPLETED' | 'FAILED') {
  const { error } = await supabaseLegacyAdmin.from('transactions').update({ status }).eq('id', id)
  if (error) throw error
}

export async function legacyListRecentOrders(limit = 50): Promise<OrderFinancialRow[]> {
  const { data, error } = await supabaseLegacyAdmin
    .from('orders')
    .select(
      'id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, payment_method, client_id, reader_id, gig_id'
    )
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const orders = data ?? []

  const userIds = unique(orders.flatMap((order) => [order.client_id, order.reader_id]))
  const gigIds = unique(orders.map((order) => order.gig_id))

  const { data: profiles } = await supabaseLegacyAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseLegacyAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? '']))
  const gigMap = new Map((gigs ?? []).map((gig) => [gig.id, gig.title ?? '']))

  return orders.map((order) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    amount_total: order.amount_total,
    amount_platform_fee: order.amount_platform_fee,
    amount_reader_net: order.amount_reader_net,
    payment_method: order.payment_method,
    client_name: profileMap.get(order.client_id) ?? 'Cliente',
    reader_name: profileMap.get(order.reader_id) ?? 'Cartomante',
    gig_title: gigMap.get(order.gig_id) ?? 'Servico',
  }))
}

export async function legacyListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseLegacyAdmin
    .from('profiles')
    .select(
      'id, full_name, social_name, avatar_url, role, verification_status, created_at, bio, cellphone, tax_id, pix_key_type, pix_key, rating_average, reviews_count'
    )
    .order('created_at', { ascending: false })

  if (error) throw error

  let emailMap = new Map<string, string>()
  try {
    const { data: authData } = await supabaseLegacyAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authData?.users) {
      authData.users.forEach((user) => emailMap.set(user.id, user.email ?? '—'))
    }
  } catch {
    emailMap = new Map()
  }

  return (data ?? []).map((profile) => ({
    ...profile,
    email: emailMap.get(profile.id) ?? '—',
  })) as AdminUser[]
}

export async function legacyGetUserDetail(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseLegacyAdmin.from('profiles').select('*').eq('id', id).single()
  if (error) return null

  let email = '—'
  try {
    const { data: authUser } = await supabaseLegacyAdmin.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch {
    // ignore
  }

  return { ...data, email } as AdminUser
}

export async function legacyUpdateUser(id: string, updates: Partial<AdminUser>) {
  const { error } = await supabaseLegacyAdmin.from('profiles').update(updates).eq('id', id)
  if (error) throw error
}

export async function legacySuspendUser(id: string) {
  const { error: profileError } = await supabaseLegacyAdmin
    .from('profiles')
    .update({ verification_status: 'SUSPENDED' })
    .eq('id', id)
  if (profileError) throw profileError
  await supabaseLegacyAdmin.from('gigs').update({ is_active: false }).eq('owner_id', id)
}

export async function legacyActivateUser(id: string) {
  const { error } = await supabaseLegacyAdmin
    .from('profiles')
    .update({ verification_status: 'APPROVED' })
    .eq('id', id)
  if (error) throw error
}

export async function legacyChangeRole(id: string, role: 'CLIENT' | 'READER' | 'ADMIN') {
  const { error } = await supabaseLegacyAdmin.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

export async function legacyGetUserOrders(userId: string): Promise<UserOrder[]> {
  const { data: asClient } = await supabaseLegacyAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: asReader } = await supabaseLegacyAdmin
    .from('orders')
    .select('id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id')
    .eq('reader_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const allOrders = [
    ...((asClient ?? []).map((order) => ({ ...order, role_in_order: 'client' as const })) ?? []),
    ...((asReader ?? []).map((order) => ({ ...order, role_in_order: 'reader' as const })) ?? []),
  ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())

  const userIds = unique(allOrders.flatMap((order) => [order.client_id, order.reader_id]))
  const gigIds = unique(allOrders.map((order) => order.gig_id))
  const { data: profiles } = await supabaseLegacyAdmin.from('profiles').select('id, full_name').in('id', userIds)
  const { data: gigs } = await supabaseLegacyAdmin.from('gigs').select('id, title').in('id', gigIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
  const gigMap = new Map((gigs ?? []).map((gig) => [gig.id, gig.title]))

  return allOrders.map((order) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    amount_total: order.amount_total,
    payment_method: order.payment_method,
    has_dispute: order.has_dispute,
    client_id: order.client_id,
    reader_id: order.reader_id,
    gig_title: gigMap.get(order.gig_id) ?? 'N/A',
    other_party_name:
      order.role_in_order === 'client'
        ? (profileMap.get(order.reader_id) ?? 'Cartomante')
        : (profileMap.get(order.client_id) ?? 'Cliente'),
    role_in_order: order.role_in_order,
  }))
}

export async function legacyGetUserWalletStats(userId: string): Promise<WalletStats | null> {
  const { data: wallet } = await supabaseLegacyAdmin.from('wallets').select('id').eq('user_id', userId).single()
  if (!wallet) return null

  const { data: txns } = await supabaseLegacyAdmin
    .from('transactions')
    .select('type, status, amount')
    .eq('wallet_id', wallet.id)

  if (!txns) return { available: 0, pending: 0, total_withdrawn: 0 }

  const available = txns.filter((txn) => txn.status === 'COMPLETED').reduce((sum, txn) => sum + txn.amount, 0)
  const pending = txns
    .filter((txn) => txn.type === 'SALE_CREDIT' && txn.status === 'PENDING')
    .reduce((sum, txn) => sum + txn.amount, 0)
  const total_withdrawn = txns
    .filter((txn) => txn.type === 'WITHDRAWAL' && txn.status === 'COMPLETED')
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0)

  return { available, pending, total_withdrawn }
}

export async function legacyGetDashboardOverview(): Promise<AdminDashboardOverview> {
  const [
    { count: totalUsers },
    { count: totalReaders },
    { count: approvedReaders },
    { count: pendingReaders },
    { count: pendingGigs },
    { count: openDisputes },
    { count: openTickets },
    { count: totalOrders },
    financialOverview,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'READER')
      .eq('verification_status', 'APPROVED'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'READER')
      .eq('verification_status', 'PENDING'),
    supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('has_dispute', true),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    legacyGetFinancialOverview(),
  ])

  const health = createCompatibilityHealth()

  return {
    stats: {
      totalUsers: totalUsers ?? 0,
      totalReaders: totalReaders ?? 0,
      approvedReaders: approvedReaders ?? 0,
      pendingReaders: pendingReaders ?? 0,
      pendingGigs: pendingGigs ?? 0,
      openDisputes: openDisputes ?? 0,
      openTickets: openTickets ?? 0,
      totalOrders: totalOrders ?? 0,
    },
    revenue: financialOverview.stats.platform_fee,
    recent_orders: financialOverview.recent_orders.slice(0, 5),
    health,
    generated_at: health.generated_at,
  }
}

export async function legacyListPendingReaders(): Promise<PendingReader[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, social_name, avatar_url, bio, specialties, verification_status, created_at, ethics_accepted_at, tax_id, cellphone, birth_date, pix_key_type, pix_key'
    )
    .eq('role', 'READER')
    .eq('verification_status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function legacyGetReaderDetail(id: string): Promise<ReaderDetail | null> {
  const { data, error } = await supabaseLegacyAdmin.from('profiles').select('*').eq('id', id).single()
  if (error || !data) return null

  let email = '—'
  try {
    const { data: authUser } = await supabaseLegacyAdmin.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch {
    // ignore
  }

  return { ...data, email }
}

export async function legacyGetSignedDocUrl(path: string): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('http')) return path

  const { data } = await supabaseLegacyAdmin.storage.from('verification_documents').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export async function legacyApproveReader(id: string) {
  const { error } = await supabaseLegacyAdmin
    .from('profiles')
    .update({ verification_status: 'APPROVED' })
    .eq('id', id)
  if (error) throw error

  await supabaseLegacyAdmin.from('notifications').insert({
    user_id: id,
    type: 'SYSTEM',
    title: 'Cadastro aprovado!',
    message: 'Seu cadastro foi aprovado. Agora voce pode criar seus servicos e comecar a atender.',
    link: '/dashboard/cartomante',
  })
}

export async function legacyRejectReader(id: string, reason?: string) {
  const { error } = await supabaseLegacyAdmin
    .from('profiles')
    .update({ verification_status: 'REJECTED' })
    .eq('id', id)
  if (error) throw error

  await supabaseLegacyAdmin.from('notifications').insert({
    user_id: id,
    type: 'SYSTEM',
    title: 'Cadastro nao aprovado',
    message: reason ?? 'Seu cadastro nao foi aprovado. Abra um ticket de suporte para mais informacoes.',
    link: '/dashboard',
  })
}

export async function legacySuspendReader(id: string) {
  const { error } = await supabaseLegacyAdmin
    .from('profiles')
    .update({ verification_status: 'SUSPENDED' })
    .eq('id', id)
  if (error) throw error
  await supabaseLegacyAdmin.from('gigs').update({ is_active: false }).eq('owner_id', id)
}

export async function legacyListAllGigs(status?: string): Promise<PendingGig[]> {
  let query = supabaseLegacyAdmin
    .from('gigs')
    .select(
      'id, title, description, price, category, modality, status, image_url, delivery_method, delivery_time_hours, created_at, owner_id'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  const gigs = data ?? []

  const ownerIds = unique(gigs.map((gig) => gig.owner_id))
  const { data: profiles } = await supabaseLegacyAdmin
    .from('profiles')
    .select('id, full_name, verification_status')
    .in('id', ownerIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return gigs.map((gig) => ({
    ...gig,
    owner_name: profileMap.get(gig.owner_id)?.full_name ?? 'Desconhecido',
    owner_verification_status: profileMap.get(gig.owner_id)?.verification_status ?? null,
  }))
}

export async function legacyApproveGig(id: string) {
  const { data: gig, error: fetchError } = await supabaseLegacyAdmin
    .from('gigs')
    .select('owner_id, title')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabaseLegacyAdmin.from('gigs').update({ status: 'APPROVED' }).eq('id', id)
  if (error) throw error

  if (gig) {
    await supabaseLegacyAdmin.from('notifications').insert({
      user_id: gig.owner_id,
      type: 'SYSTEM',
      title: 'Servico aprovado!',
      message: `Seu servico "${gig.title}" foi aprovado e ja pode ser ativado.`,
      link: '/dashboard/cartomante/servicos',
    })
  }
}

export async function legacyRejectGig(id: string, reason?: string) {
  const { data: gig } = await supabaseLegacyAdmin
    .from('gigs')
    .select('owner_id, title')
    .eq('id', id)
    .single()

  const { error } = await supabaseLegacyAdmin.from('gigs').update({ status: 'REJECTED' }).eq('id', id)
  if (error) throw error

  if (gig) {
    await supabaseLegacyAdmin.from('notifications').insert({
      user_id: gig.owner_id,
      type: 'SYSTEM',
      title: 'Servico nao aprovado',
      message: reason ?? `Seu servico "${gig.title}" nao foi aprovado. Edite e reenvie para revisao.`,
      link: '/dashboard/cartomante/servicos',
    })
  }
}

export async function legacyListTickets(statusFilter?: string): Promise<Ticket[]> {
  let query = supabaseLegacyAdmin
    .from('tickets')
    .select('id, created_at, subject, category, status, priority, user_id')
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)
  const { data, error } = await query
  if (error) throw error
  const tickets = data ?? []

  const userIds = unique(tickets.map((ticket) => ticket.user_id))
  const { data: profiles } = await supabaseLegacyAdmin.from('profiles').select('id, full_name, role').in('id', userIds)
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return tickets.map((ticket) => ({
    ...ticket,
    user_name: profileMap.get(ticket.user_id)?.full_name ?? 'Usuario',
    user_role: profileMap.get(ticket.user_id)?.role ?? 'CLIENT',
  }))
}

export async function legacyGetTicketDetail(id: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabaseLegacyAdmin.from('tickets').select('*').eq('id', id).single()
  if (error || !ticket) return null

  const { data: messagesRaw } = await supabaseLegacyAdmin
    .from('ticket_messages')
    .select('id, created_at, content, sender_id')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const messages = messagesRaw ?? []
  const senderIds = unique(messages.map((message) => message.sender_id))
  const { data: profiles } = await supabaseLegacyAdmin
    .from('profiles')
    .select('id, full_name, role')
    .in('id', senderIds)

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const { data: ticketUser } = await supabaseLegacyAdmin
    .from('profiles')
    .select('full_name, role')
    .eq('id', ticket.user_id)
    .single()

  return {
    ...ticket,
    user_name: ticketUser?.full_name ?? 'Usuario',
    user_role: ticketUser?.role ?? 'CLIENT',
    messages: messages.map((message) => ({
      id: message.id,
      created_at: message.created_at,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: profileMap.get(message.sender_id)?.full_name ?? 'Usuario',
      is_admin: profileMap.get(message.sender_id)?.role === 'ADMIN',
    })),
  }
}

export async function legacySendTicketMessage(ticketId: string, senderId: string, content: string) {
  const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticketId, sender_id: senderId, content })
  if (error) throw error

  await supabase.from('tickets').update({ status: 'IN_PROGRESS' }).eq('id', ticketId).eq('status', 'OPEN')
}

export async function legacyUpdateTicketStatus(id: string, status: Ticket['status']) {
  const { error } = await supabaseLegacyAdmin.from('tickets').update({ status }).eq('id', id)
  if (error) throw error
}
