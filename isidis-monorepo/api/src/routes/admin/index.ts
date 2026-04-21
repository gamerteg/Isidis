import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { notifyUser } from '../../services/notify.js'

const listOrdersQuerySchema = z.object({
  status: z.string().optional(),
  dispute: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

const listGigsQuerySchema = z.object({
  status: z.string().optional(),
})

const listTicketsQuerySchema = z.object({
  status: z.string().optional(),
})

const updateWithdrawalStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
})

const rejectWithReasonSchema = z.object({
  reason: z.string().trim().min(1).optional(),
})

const updateUserSchema = z.object({
  full_name: z.string().trim().min(1).max(255).nullable().optional(),
  bio: z.string().trim().max(5000).nullable().optional(),
  social_name: z.string().trim().max(255).nullable().optional(),
  cellphone: z.string().trim().max(50).nullable().optional(),
  tax_id: z.string().trim().max(50).nullable().optional(),
  pix_key_type: z.string().trim().max(50).nullable().optional(),
  pix_key: z.string().trim().max(255).nullable().optional(),
})

const updateUserRoleSchema = z.object({
  role: z.enum(['CLIENT', 'READER', 'ADMIN']),
})

const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
})

const sendTicketMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
})

const signedUrlQuerySchema = z.object({
  path: z.string().trim().min(1),
})

const forceOrderStatusSchema = z.object({
  status: z.enum(['PAID', 'DELIVERED', 'COMPLETED']),
})

const creditBalanceSchema = z.object({
  amount: z.number().int().min(1),
  description: z.string().trim().min(1).max(500),
})

type FastifyWithSupabase = any

type RawOrderRow = {
  id: string
  created_at: string
  status: string
  amount_total: number
  amount_platform_fee: number
  amount_reader_net: number
  amount_card_fee: number | null
  payment_method: string
  has_dispute: boolean
  disputed_at: string | null
  delivered_at: string | null
  client_id: string
  reader_id: string
  gig_id: string
  mercadopago_payment_id: string | null
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

async function getProfilesMap(
  fastify: FastifyWithSupabase,
  ids: string[],
  fields = 'id, full_name, role, verification_status'
) {
  const uniqueIds = unique(ids)
  if (uniqueIds.length === 0) {
    return new Map<string, any>()
  }

  const { data, error } = await fastify.supabase
    .from('profiles')
    .select(fields)
    .in('id', uniqueIds)

  if (error) {
    throw error
  }

  return new Map((data ?? []).map((profile: any) => [profile.id, profile]))
}

async function getGigsMap(fastify: FastifyWithSupabase, ids: string[]) {
  const uniqueIds = unique(ids)
  if (uniqueIds.length === 0) {
    return new Map<string, any>()
  }

  const { data, error } = await fastify.supabase
    .from('gigs')
    .select('id, title')
    .in('id', uniqueIds)

  if (error) {
    throw error
  }

  return new Map((data ?? []).map((gig: any) => [gig.id, gig]))
}

async function getEmailMap(fastify: FastifyWithSupabase) {
  try {
    const { data } = await fastify.supabase.auth.admin.listUsers({ perPage: 1000 })
    return new Map((data?.users ?? []).map((user: any) => [user.id, user.email ?? '—']))
  } catch {
    return new Map<string, string>()
  }
}

async function getAdminOpsHealth(fastify: FastifyWithSupabase) {
  const now = new Date()
  const pendingPaymentCutoff = new Date(now.getTime() - 35 * 60 * 1000).toISOString()
  const saleCreditCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  const [
    { count: stuckPendingPaymentOrders },
    { count: stuckSaleCredits },
    { count: pendingWithdrawals },
  ] = await Promise.all([
    fastify.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_PAYMENT')
      .lt('created_at', pendingPaymentCutoff),
    fastify.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'SALE_CREDIT')
      .eq('status', 'PENDING')
      .lt('created_at', saleCreditCutoff),
    fastify.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'WITHDRAWAL')
      .eq('status', 'PENDING'),
  ])

  const missingEnv = ['MERCADOPAGO_WEBHOOK_SECRET', 'CRON_SECRET'].filter(
    (key) => !process.env[key]
  )

  const warnings: string[] = []
  if ((stuckPendingPaymentOrders ?? 0) > 0) {
    warnings.push('Existem pedidos presos em PENDING_PAYMENT acima do prazo esperado.')
  }
  if ((stuckSaleCredits ?? 0) > 0) {
    warnings.push('Existem repasses SALE_CREDIT em hold por mais de 48h.')
  }
  if ((pendingWithdrawals ?? 0) > 0) {
    warnings.push('Existem saques pendentes aguardando tratamento manual.')
  }
  if (missingEnv.length > 0) {
    warnings.push(`Variáveis críticas ausentes na API: ${missingEnv.join(', ')}`)
  }

  return {
    generated_at: now.toISOString(),
    stuck_pending_payment_orders: stuckPendingPaymentOrders ?? 0,
    stuck_sale_credit_holds: stuckSaleCredits ?? 0,
    pending_withdrawals: pendingWithdrawals ?? 0,
    missing_env: missingEnv,
    warnings,
    has_issues: warnings.length > 0,
  }
}

async function getFinancialStats(fastify: FastifyWithSupabase) {
  try {
    const { data, error } = await fastify.supabase.rpc('get_admin_financial_stats')
    if (!error && data) {
      return data as {
        total_revenue: number
        platform_fee: number
        total_repasse: number
        total_withdrawn: number
        pending_repasse: number
      }
    }
  } catch {
    // fallback manual abaixo
  }

  const { data: txns, error: txnsError } = await fastify.supabase
    .from('transactions')
    .select('type, status, amount')

  if (txnsError || !txns) {
    return {
      total_revenue: 0,
      platform_fee: 0,
      total_repasse: 0,
      total_withdrawn: 0,
      pending_repasse: 0,
    }
  }

  const completedSales = txns.filter(
    (transaction: any) => transaction.type === 'SALE_CREDIT' && transaction.status === 'COMPLETED'
  )
  const completedWithdrawals = txns.filter(
    (transaction: any) => transaction.type === 'WITHDRAWAL' && transaction.status === 'COMPLETED'
  )

  const totalRepasse = completedSales.reduce(
    (sum: number, transaction: any) => sum + transaction.amount,
    0
  )
  const totalWithdrawn = completedWithdrawals.reduce(
    (sum: number, transaction: any) => sum + Math.abs(transaction.amount),
    0
  )

  const { data: orders, error: ordersError } = await fastify.supabase
    .from('orders')
    .select('amount_total, amount_platform_fee')
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])

  if (ordersError) {
    throw ordersError
  }

  const totalRevenue = (orders ?? []).reduce(
    (sum: number, order: any) => sum + order.amount_total,
    0
  )
  const platformFee = (orders ?? []).reduce(
    (sum: number, order: any) => sum + order.amount_platform_fee,
    0
  )

  return {
    total_revenue: totalRevenue,
    platform_fee: platformFee,
    total_repasse: totalRepasse,
    total_withdrawn: totalWithdrawn,
    pending_repasse: totalRepasse - totalWithdrawn,
  }
}

async function listRecentOrdersInternal(fastify: FastifyWithSupabase, limit = 50) {
  const { data, error } = await fastify.supabase
    .from('orders')
    .select(
      'id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, payment_method, client_id, reader_id, gig_id'
    )
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  const orders = data ?? []
  const profileMap = await getProfilesMap(
    fastify,
    orders.flatMap((order: any) => [order.client_id, order.reader_id]),
    'id, full_name'
  )
  const gigMap = await getGigsMap(
    fastify,
    orders.map((order: any) => order.gig_id)
  )

  return orders.map((order: any) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    amount_total: order.amount_total,
    amount_platform_fee: order.amount_platform_fee,
    amount_reader_net: order.amount_reader_net,
    payment_method: order.payment_method,
    client_name: profileMap.get(order.client_id)?.full_name ?? 'Cliente',
    reader_name: profileMap.get(order.reader_id)?.full_name ?? 'Cartomante',
    gig_title: gigMap.get(order.gig_id)?.title ?? 'Serviço',
  }))
}

async function listOrdersInternal(
  fastify: FastifyWithSupabase,
  filters: { status?: string; dispute?: boolean; page: number; pageSize: number }
) {
  let query = fastify.supabase
    .from('orders')
    .select(
      'id, created_at, status, amount_total, amount_platform_fee, amount_reader_net, amount_card_fee, payment_method, has_dispute, disputed_at, delivered_at, client_id, reader_id, gig_id, mercadopago_payment_id',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(filters.page * filters.pageSize, (filters.page + 1) * filters.pageSize - 1)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.dispute !== undefined) {
    query = query.eq('has_dispute', filters.dispute)
  }

  const { data, error, count } = await query
  if (error) {
    throw error
  }

  const orders = (data ?? []) as RawOrderRow[]
  const profileMap = await getProfilesMap(
    fastify,
    orders.flatMap((order) => [order.client_id, order.reader_id]),
    'id, full_name'
  )
  const gigMap = await getGigsMap(
    fastify,
    orders.map((order) => order.gig_id)
  )

  return {
    count: count ?? 0,
    data: orders.map((order) => ({
      ...order,
      amount_card_fee: order.amount_card_fee ?? 0,
      client_name: profileMap.get(order.client_id)?.full_name ?? 'Cliente',
      reader_name: profileMap.get(order.reader_id)?.full_name ?? 'Cartomante',
      gig_title: gigMap.get(order.gig_id)?.title ?? 'Serviço',
    })),
  }
}

async function getOrderDetailInternal(fastify: FastifyWithSupabase, id: string) {
  const { data, error } = await fastify.supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  const [profileMap, gigMap] = await Promise.all([
    getProfilesMap(fastify, [data.client_id, data.reader_id], 'id, full_name'),
    getGigsMap(fastify, [data.gig_id]),
  ])

  return {
    ...data,
    amount_card_fee: data.amount_card_fee ?? 0,
    client_name: profileMap.get(data.client_id)?.full_name ?? 'Cliente',
    reader_name: profileMap.get(data.reader_id)?.full_name ?? 'Cartomante',
    gig_title: gigMap.get(data.gig_id)?.title ?? 'Serviço',
  }
}

async function listPendingWithdrawalsInternal(fastify: FastifyWithSupabase) {
  const { data, error } = await fastify.supabase
    .from('transactions')
    .select('id, created_at, amount, status, metadata, wallets!inner(user_id)')
    .eq('type', 'WITHDRAWAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  const profileMap = await getProfilesMap(
    fastify,
    data.map((transaction: any) => transaction.wallets.user_id),
    'id, full_name'
  )

  return data.map((transaction: any) => {
    const metadata = (transaction.metadata as Record<string, string> | null) ?? {}
    const userId = transaction.wallets.user_id
    return {
      id: transaction.id,
      created_at: transaction.created_at,
      amount: Math.abs(transaction.amount),
      status: transaction.status,
      pix_key: metadata.pix_key ?? '—',
      pix_key_type: metadata.pix_key_type ?? '—',
      notes: metadata.notes ?? null,
      user_id: userId,
      user_name: profileMap.get(userId)?.full_name ?? 'Desconhecido',
    }
  })
}

async function listUsersInternal(fastify: FastifyWithSupabase) {
  const { data, error } = await fastify.supabase
    .from('profiles')
    .select(
      'id, full_name, social_name, avatar_url, role, verification_status, created_at, bio, cellphone, tax_id, pix_key_type, pix_key, rating_average, reviews_count'
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const emailMap = await getEmailMap(fastify)

  return (data ?? []).map((profile: any) => ({
    ...profile,
    email: emailMap.get(profile.id) ?? '—',
  }))
}

async function getUserDetailInternal(fastify: FastifyWithSupabase, id: string) {
  const { data, error } = await fastify.supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  let email = '—'
  try {
    const { data: authUser } = await fastify.supabase.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch {
    // ignora
  }

  return { ...data, email }
}

async function getUserOrdersInternal(fastify: FastifyWithSupabase, userId: string) {
  const [asClientResult, asReaderResult] = await Promise.all([
    fastify.supabase
      .from('orders')
      .select(
        'id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id'
      )
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    fastify.supabase
      .from('orders')
      .select(
        'id, created_at, status, amount_total, payment_method, has_dispute, client_id, reader_id, gig_id'
      )
      .eq('reader_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const allOrders = [
    ...((asClientResult.data ?? []).map((order: any) => ({
      ...order,
      role_in_order: 'client' as const,
    })) ?? []),
    ...((asReaderResult.data ?? []).map((order: any) => ({
      ...order,
      role_in_order: 'reader' as const,
    })) ?? []),
  ].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })

  const profileMap = await getProfilesMap(
    fastify,
    allOrders.flatMap((order) => [order.client_id, order.reader_id]),
    'id, full_name'
  )
  const gigMap = await getGigsMap(
    fastify,
    allOrders.map((order) => order.gig_id)
  )

  return allOrders.map((order) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    amount_total: order.amount_total,
    payment_method: order.payment_method,
    has_dispute: order.has_dispute,
    client_id: order.client_id,
    reader_id: order.reader_id,
    gig_title: gigMap.get(order.gig_id)?.title ?? 'N/A',
    other_party_name:
      order.role_in_order === 'client'
        ? (profileMap.get(order.reader_id)?.full_name ?? 'Cartomante')
        : (profileMap.get(order.client_id)?.full_name ?? 'Cliente'),
    role_in_order: order.role_in_order,
  }))
}

async function getUserWalletStatsInternal(fastify: FastifyWithSupabase, userId: string) {
  const { data: wallet } = await fastify.supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!wallet) {
    return null
  }

  const { data: transactions, error } = await fastify.supabase
    .from('transactions')
    .select('type, status, amount')
    .eq('wallet_id', wallet.id)

  if (error || !transactions) {
    return {
      available: 0,
      pending: 0,
      total_withdrawn: 0,
    }
  }

  const available = transactions
    .filter((transaction: any) => transaction.status === 'COMPLETED')
    .reduce((sum: number, transaction: any) => sum + transaction.amount, 0)

  const pending = transactions
    .filter((transaction: any) => transaction.type === 'SALE_CREDIT' && transaction.status === 'PENDING')
    .reduce((sum: number, transaction: any) => sum + transaction.amount, 0)

  const totalWithdrawn = transactions
    .filter((transaction: any) => transaction.type === 'WITHDRAWAL' && transaction.status === 'COMPLETED')
    .reduce((sum: number, transaction: any) => sum + Math.abs(transaction.amount), 0)

  return {
    available,
    pending,
    total_withdrawn: totalWithdrawn,
  }
}

async function listPendingReadersInternal(fastify: FastifyWithSupabase) {
  const { data, error } = await fastify.supabase
    .from('profiles')
    .select(
      'id, full_name, social_name, avatar_url, bio, specialties, verification_status, created_at, ethics_accepted_at, tax_id, cellphone, birth_date, pix_key_type, pix_key'
    )
    .eq('role', 'READER')
    .eq('verification_status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const emailMap = await getEmailMap(fastify)

  return (data ?? []).map((profile: any) => ({
    ...profile,
    email: emailMap.get(profile.id) ?? '—',
  }))
}

async function getReaderDetailInternal(fastify: FastifyWithSupabase, id: string) {
  const { data, error } = await fastify.supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  let email = '—'
  try {
    const { data: authUser } = await fastify.supabase.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch {
    // ignora
  }

  return { ...data, email }
}

async function listGigsInternal(fastify: FastifyWithSupabase, status?: string) {
  let query = fastify.supabase
    .from('gigs')
    .select(
      'id, title, description, price, category, modality, status, image_url, delivery_method, delivery_time_hours, created_at, owner_id'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const gigs = data ?? []
  const profileMap = await getProfilesMap(
    fastify,
    gigs.map((gig: any) => gig.owner_id),
    'id, full_name, verification_status'
  )

  return gigs.map((gig: any) => ({
    ...gig,
    owner_name: profileMap.get(gig.owner_id)?.full_name ?? 'Desconhecido',
    owner_verification_status: profileMap.get(gig.owner_id)?.verification_status ?? null,
  }))
}

async function listTicketsInternal(fastify: FastifyWithSupabase, status?: string) {
  let query = fastify.supabase
    .from('tickets')
    .select('id, created_at, subject, category, status, priority, user_id')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const tickets = data ?? []
  const profileMap = await getProfilesMap(
    fastify,
    tickets.map((ticket: any) => ticket.user_id),
    'id, full_name, role'
  )

  return tickets.map((ticket: any) => ({
    ...ticket,
    user_name: profileMap.get(ticket.user_id)?.full_name ?? 'Usuário',
    user_role: profileMap.get(ticket.user_id)?.role ?? 'CLIENT',
  }))
}

async function getTicketDetailInternal(fastify: FastifyWithSupabase, id: string) {
  const { data: ticket, error } = await fastify.supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return null
  }

  const { data: messagesRaw, error: messagesError } = await fastify.supabase
    .from('ticket_messages')
    .select('id, created_at, content, sender_id')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw messagesError
  }

  const senderMap = await getProfilesMap(
    fastify,
    (messagesRaw ?? []).map((message: any) => message.sender_id),
    'id, full_name, role'
  )
  const ticketUser = await getProfilesMap(fastify, [ticket.user_id], 'id, full_name, role')

  return {
    ...ticket,
    user_name: ticketUser.get(ticket.user_id)?.full_name ?? 'Usuário',
    user_role: ticketUser.get(ticket.user_id)?.role ?? 'CLIENT',
    messages: (messagesRaw ?? []).map((message: any) => ({
      id: message.id,
      created_at: message.created_at,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: senderMap.get(message.sender_id)?.full_name ?? 'Usuário',
      is_admin: senderMap.get(message.sender_id)?.role === 'ADMIN',
    })),
  }
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/dashboard', { preHandler: [(fastify as any).requireAdmin] }, async (_, reply) => {
    const generatedAt = new Date().toISOString()
    const [
      { count: totalUsers },
      { count: totalReaders },
      { count: approvedReaders },
      { count: pendingReaders },
      { count: pendingGigs },
      { count: openDisputes },
      { count: openTickets },
      { count: totalOrders },
      financialStats,
      recentOrders,
      health,
    ] = await Promise.all([
      fastify.supabase.from('profiles').select('*', { count: 'exact', head: true }),
      fastify.supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER'),
      fastify.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'READER')
        .eq('verification_status', 'APPROVED'),
      fastify.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'READER')
        .eq('verification_status', 'PENDING'),
      fastify.supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      fastify.supabase.from('orders').select('*', { count: 'exact', head: true }).eq('has_dispute', true),
      fastify.supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
      fastify.supabase.from('orders').select('*', { count: 'exact', head: true }),
      getFinancialStats(fastify),
      listRecentOrdersInternal(fastify, 5),
      getAdminOpsHealth(fastify),
    ])

    return reply.send({
      data: {
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
        revenue: financialStats.platform_fee,
        recent_orders: recentOrders,
        health,
        generated_at: generatedAt,
      },
    })
  })

  fastify.get('/orders', { preHandler: [(fastify as any).requireAdmin] }, async (request, reply) => {
    const query = listOrdersQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() })
    }

    const [result, health] = await Promise.all([
      listOrdersInternal(fastify, query.data),
      getAdminOpsHealth(fastify),
    ])

    return reply.send({
      data: result.data,
      count: result.count,
      health,
      generated_at: new Date().toISOString(),
    })
  })

  fastify.get(
    '/orders/:id',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const order = await getOrderDetailInternal(fastify, id)

      if (!order) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      return reply.send({
        data: order,
        generated_at: new Date().toISOString(),
      })
    }
  )

  fastify.post(
    '/orders/:id/cancel',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { error: orderError } = await fastify.supabase
        .from('orders')
        .update({ status: 'CANCELED' })
        .eq('id', id)

      if (orderError) {
        return reply.status(500).send({ error: orderError.message })
      }

      await fastify.supabase
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('order_id', id)

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/orders/:id/resolve-dispute',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { data: order, error: orderFetchError } = await fastify.supabase
        .from('orders')
        .select('id, client_id, reader_id')
        .eq('id', id)
        .single()

      if (orderFetchError || !order) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      const { error } = await fastify.supabase
        .from('orders')
        .update({ has_dispute: false, disputed_at: null })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await Promise.all([
        notifyUser(fastify, order.client_id, {
          type: 'ORDER_UPDATE',
          title: 'Disputa encerrada',
          message: 'A disputa do seu pedido foi encerrada pelo suporte.',
          link: '/dashboard/pedidos',
        }),
        notifyUser(fastify, order.reader_id, {
          type: 'ORDER_UPDATE',
          title: 'Disputa encerrada',
          message: 'A disputa do pedido foi encerrada pelo suporte.',
          link: '/dashboard/cartomante/pedidos',
        }),
      ])

      return reply.send({ data: { success: true } })
    }
  )

  // ─── Estornar pedido via Mercado Pago ───
  fastify.post(
    '/orders/:id/refund',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { data: order, error: fetchErr } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id, mercadopago_payment_id, amount_total, gig_id')
        .eq('id', id)
        .single()

      if (fetchErr || !order) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      if (order.status === 'CANCELED') {
        return reply.status(400).send({ error: 'Pedido já está cancelado' })
      }

      let refundSuccess = false
      let refundNote = ''

      if (order.mercadopago_payment_id) {
        try {
          await fastify.mp.refundPayment({ paymentId: order.mercadopago_payment_id })
          refundSuccess = true
          refundNote = 'Reembolso processado via Mercado Pago.'
        } catch (mpErr: any) {
          request.log.error({ mpErr: mpErr?.message }, '[admin/refund] Erro MP refund')
          refundNote = 'Erro ao estornar no Mercado Pago. Estorno manual pode ser necessário.'
        }
      } else {
        refundNote = 'Pedido sem payment_id do Mercado Pago. Estorno manual necessário.'
      }

      // Cancelar pedido e transações
      await fastify.supabase.from('orders').update({ status: 'CANCELED' }).eq('id', id)
      await fastify.supabase.from('transactions').update({ status: 'FAILED' }).eq('order_id', id)

      // Notificar partes
      const [gigMap] = await Promise.all([
        getGigsMap(fastify, [order.gig_id]),
      ])

      await Promise.all([
        notifyUser(fastify, order.client_id, {
          type: 'ORDER_UPDATE',
          title: 'Pedido estornado',
          message: `Seu pedido de "${gigMap.get(order.gig_id)?.title ?? 'serviço'}" foi estornado pelo suporte. ${refundSuccess ? 'O reembolso será processado em até 5 dias úteis.' : ''}`,
          link: '/dashboard/pedidos',
        }),
        notifyUser(fastify, order.reader_id, {
          type: 'ORDER_UPDATE',
          title: 'Pedido estornado',
          message: `O pedido de "${gigMap.get(order.gig_id)?.title ?? 'serviço'}" foi estornado pelo suporte.`,
          link: '/dashboard/cartomante/pedidos',
        }),
      ])

      return reply.send({ data: { success: true, refund_success: refundSuccess, note: refundNote } })
    }
  )

  // ─── Forçar pedido como pago (quando webhook falhou) ───
  fastify.post(
    '/orders/:id/force-paid',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { data: order, error: fetchErr } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id, amount_reader_net, gig_id, mercadopago_payment_id')
        .eq('id', id)
        .single()

      if (fetchErr || !order) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      if (order.status !== 'PENDING_PAYMENT') {
        return reply.status(400).send({ error: `Pedido não está em PENDING_PAYMENT (status atual: ${order.status})` })
      }

      // Atualizar status para PAID
      const { error: updateErr } = await fastify.supabase
        .from('orders')
        .update({ status: 'PAID' })
        .eq('id', id)

      if (updateErr) {
        return reply.status(500).send({ error: updateErr.message })
      }

      // Criar ou buscar wallet da cartomante e adicionar SALE_CREDIT
      let { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', order.reader_id)
        .single()

      if (!wallet) {
        const { data: newWallet } = await fastify.supabase
          .from('wallets')
          .insert({ user_id: order.reader_id })
          .select('id')
          .single()
        wallet = newWallet
      }

      if (wallet) {
        await fastify.supabase.from('transactions').insert({
          wallet_id: wallet.id,
          amount: order.amount_reader_net,
          type: 'SALE_CREDIT',
          status: 'PENDING',
          order_id: order.id,
          external_id: order.mercadopago_payment_id ?? `admin-force-${Date.now()}`,
        })
      }

      // Notificar
      const gigMap = await getGigsMap(fastify, [order.gig_id])

      await notifyUser(fastify, order.reader_id, {
        type: 'ORDER_NEW',
        title: 'Novo pedido recebido! 🎉',
        message: `Pagamento confirmado para "${gigMap.get(order.gig_id)?.title ?? 'serviço'}". Você já pode iniciar o atendimento.`,
        link: `/orders/${order.id}`,
      })

      return reply.send({ data: { success: true } })
    }
  )

  // ─── Forçar mudança de status de pedido ───
  fastify.post(
    '/orders/:id/force-status',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = forceOrderStatusSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data: order, error: fetchErr } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id')
        .eq('id', id)
        .single()

      if (fetchErr || !order) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      const updates: Record<string, any> = { status: body.data.status }

      if (body.data.status === 'DELIVERED' && !order.delivered_at) {
        updates.delivered_at = new Date().toISOString()
      }

      const { error: updateErr } = await fastify.supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (updateErr) {
        return reply.status(500).send({ error: updateErr.message })
      }

      // Se mudou para COMPLETED, liberar as transações SALE_CREDIT pendentes desse pedido
      if (body.data.status === 'COMPLETED') {
        await fastify.supabase
          .from('transactions')
          .update({ status: 'COMPLETED' })
          .eq('order_id', id)
          .eq('type', 'SALE_CREDIT')
          .eq('status', 'PENDING')
      }

      await Promise.all([
        notifyUser(fastify, order.client_id, {
          type: 'ORDER_UPDATE',
          title: 'Atualização do pedido',
          message: `Seu pedido foi atualizado para ${body.data.status} pelo suporte.`,
          link: '/dashboard/pedidos',
        }),
        notifyUser(fastify, order.reader_id, {
          type: 'ORDER_UPDATE',
          title: 'Atualização do pedido',
          message: `O pedido foi atualizado para ${body.data.status} pelo suporte.`,
          link: '/dashboard/cartomante/pedidos',
        }),
      ])

      return reply.send({ data: { success: true } })
    }
  )

  fastify.get('/financials', { preHandler: [(fastify as any).requireAdmin] }, async (_, reply) => {
    const [stats, recentOrders, health] = await Promise.all([
      getFinancialStats(fastify),
      listRecentOrdersInternal(fastify, 50),
      getAdminOpsHealth(fastify),
    ])

    return reply.send({
      data: {
        stats,
        recent_orders: recentOrders,
        health,
        generated_at: new Date().toISOString(),
      },
    })
  })

  fastify.get('/withdrawals', { preHandler: [(fastify as any).requireAdmin] }, async (_, reply) => {
    const [withdrawals, health] = await Promise.all([
      listPendingWithdrawalsInternal(fastify),
      getAdminOpsHealth(fastify),
    ])

    return reply.send({
      data: withdrawals,
      health,
      generated_at: new Date().toISOString(),
    })
  })

  fastify.post(
    '/withdrawals/:id/status',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateWithdrawalStatusSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { error } = await fastify.supabase
        .from('transactions')
        .update({ status: body.data.status })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: { success: true } })
    }
  )

  // ─── Nota/Comprovante de Saque ───
  fastify.get(
    '/withdrawals/:id/receipt',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      // Buscar a transação de saque
      const { data: withdrawal, error: wError } = await fastify.supabase
        .from('transactions')
        .select('id, created_at, amount, status, metadata, wallets!inner(user_id)')
        .eq('id', id)
        .eq('type', 'WITHDRAWAL')
        .single()

      if (wError || !withdrawal) {
        return reply.status(404).send({ error: 'Saque não encontrado' })
      }

      const userId = (withdrawal as any).wallets.user_id
      const metadata = (withdrawal.metadata as Record<string, string> | null) ?? {}

      // Dados do perfil da cartomante
      const { data: profile } = await fastify.supabase
        .from('profiles')
        .select('full_name, social_name, tax_id, cellphone, pix_key, pix_key_type')
        .eq('id', userId)
        .single()

      // Buscar wallet
      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

      // Buscar todas as transações SALE_CREDIT COMPLETED da wallet para listar os atendimentos
      let serviceOrders: any[] = []
      if (wallet) {
        const { data: saleTxns } = await fastify.supabase
          .from('transactions')
          .select('amount, created_at, order_id, orders(id, created_at, amount_total, amount_platform_fee, amount_reader_net, gig_id, client_id, payment_method)')
          .eq('wallet_id', wallet.id)
          .eq('type', 'SALE_CREDIT')
          .eq('status', 'COMPLETED')
          .order('created_at', { ascending: false })
          .limit(100)

        if (saleTxns) {
          const ordersData = saleTxns
            .filter((tx: any) => tx.orders)
            .map((tx: any) => tx.orders)

          // Enriquecer com nomes
          const clientIds = ordersData.map((o: any) => o.client_id).filter(Boolean)
          const gigIds = ordersData.map((o: any) => o.gig_id).filter(Boolean)

          const [profileMap, gigMap] = await Promise.all([
            getProfilesMap(fastify, clientIds, 'id, full_name'),
            getGigsMap(fastify, gigIds),
          ])

          serviceOrders = ordersData.map((o: any) => ({
            id: o.id,
            created_at: o.created_at,
            amount_total: o.amount_total,
            amount_platform_fee: o.amount_platform_fee,
            amount_reader_net: o.amount_reader_net,
            payment_method: o.payment_method,
            client_name: profileMap.get(o.client_id)?.full_name ?? 'Cliente',
            gig_title: gigMap.get(o.gig_id)?.title ?? 'Serviço',
          }))
        }
      }

      return reply.send({
        data: {
          withdrawal: {
            id: withdrawal.id,
            created_at: withdrawal.created_at,
            amount: Math.abs(withdrawal.amount),
            status: withdrawal.status,
            pix_key: metadata.pix_key ?? '—',
            pix_key_type: metadata.pix_key_type ?? '—',
            notes: metadata.notes ?? null,
          },
          reader: {
            name: profile?.full_name ?? 'Desconhecido',
            social_name: profile?.social_name ?? null,
            tax_id: profile?.tax_id ?? null,
            cellphone: profile?.cellphone ?? null,
            pix_key: profile?.pix_key ?? null,
            pix_key_type: profile?.pix_key_type ?? null,
          },
          service_orders: serviceOrders,
          generated_at: new Date().toISOString(),
        },
      })
    }
  )

  fastify.get('/users', { preHandler: [(fastify as any).requireAdmin] }, async (_, reply) => {
    const users = await listUsersInternal(fastify)
    return reply.send({ data: users })
  })

  fastify.get('/users/:id', { preHandler: [(fastify as any).requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await getUserDetailInternal(fastify, id)

    if (!user) {
      return reply.status(404).send({ error: 'Usuário não encontrado' })
    }

    return reply.send({ data: user })
  })

  fastify.patch('/users/:id', { preHandler: [(fastify as any).requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateUserSchema.safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    const { error } = await fastify.supabase
      .from('profiles')
      .update(body.data)
      .eq('id', id)

    if (error) {
      return reply.status(500).send({ error: error.message })
    }

    return reply.send({ data: { success: true } })
  })

  fastify.get(
    '/users/:id/orders',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const orders = await getUserOrdersInternal(fastify, id)
      return reply.send({ data: orders })
    }
  )

  fastify.get(
    '/users/:id/wallet',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const wallet = await getUserWalletStatsInternal(fastify, id)
      return reply.send({ data: wallet })
    }
  )

  // ─── Liberar saldo manualmente na carteira da cartomante ───
  fastify.post(
    '/users/:id/credit-balance',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = creditBalanceSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      // Verificar se o usuário existe
      const { data: profile } = await fastify.supabase
        .from('profiles')
        .select('id, role')
        .eq('id', id)
        .single()

      if (!profile) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Buscar ou criar wallet
      let { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', id)
        .single()

      if (!wallet) {
        const { data: newWallet, error: createErr } = await fastify.supabase
          .from('wallets')
          .insert({ user_id: id })
          .select('id')
          .single()

        if (createErr) {
          return reply.status(500).send({ error: 'Erro ao criar carteira' })
        }
        wallet = newWallet
      }

      if (!wallet) {
        return reply.status(500).send({ error: 'Erro ao obter carteira' })
      }

      // Inserir transação ADMIN_CREDIT como COMPLETED
      const { error: txErr } = await fastify.supabase.from('transactions').insert({
        wallet_id: wallet.id,
        amount: body.data.amount,
        type: 'SALE_CREDIT',
        status: 'COMPLETED',
        external_id: `admin-credit-${Date.now()}`,
        metadata: {
          admin_credit: true,
          description: body.data.description,
          credited_by: request.user.id,
          credited_at: new Date().toISOString(),
        },
      })

      if (txErr) {
        return reply.status(500).send({ error: txErr.message })
      }

      await notifyUser(fastify, id, {
        type: 'SYSTEM',
        title: 'Saldo liberado',
        message: `Um crédito de R$ ${(body.data.amount / 100).toFixed(2)} foi adicionado à sua carteira. Motivo: ${body.data.description}`,
        link: '/wallet',
      })

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/users/:id/suspend',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { error: profileError } = await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'SUSPENDED' })
        .eq('id', id)

      if (profileError) {
        return reply.status(500).send({ error: profileError.message })
      }

      await fastify.supabase.from('gigs').update({ is_active: false }).eq('owner_id', id)

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/users/:id/activate',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { error } = await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'APPROVED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/users/:id/role',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateUserRoleSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { error } = await fastify.supabase
        .from('profiles')
        .update({ role: body.data.role })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: { success: true } })
    }
  )

  fastify.get(
    '/approvals/readers',
    { preHandler: [(fastify as any).requireAdmin] },
    async (_, reply) => {
      const readers = await listPendingReadersInternal(fastify)
      return reply.send({ data: readers })
    }
  )

  fastify.get(
    '/approvals/readers/:id',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const reader = await getReaderDetailInternal(fastify, id)

      if (!reader) {
        return reply.status(404).send({ error: 'Cartomante não encontrada' })
      }

      return reply.send({ data: reader })
    }
  )

  fastify.get(
    '/verification-documents/signed-url',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const query = signedUrlQuerySchema.safeParse(request.query)
      if (!query.success) {
        return reply.status(400).send({ error: query.error.flatten() })
      }

      if (query.data.path.startsWith('http')) {
        return reply.send({ data: { signed_url: query.data.path } })
      }

      const { data, error } = await fastify.supabase.storage
        .from('verification_documents')
        .createSignedUrl(query.data.path, 3600)

      if (error || !data?.signedUrl) {
        return reply.status(500).send({ error: 'Não foi possível assinar o documento' })
      }

      return reply.send({ data: { signed_url: data.signedUrl } })
    }
  )

  fastify.post(
    '/approvals/readers/:id/approve',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { error } = await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'APPROVED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await notifyUser(fastify, id, {
        type: 'SYSTEM',
        title: 'Cadastro aprovado!',
        message: 'Seu cadastro foi aprovado. Agora você pode criar seus serviços e começar a atender.',
        link: '/dashboard/cartomante',
      })

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/approvals/readers/:id/reject',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = rejectWithReasonSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { error } = await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'REJECTED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await notifyUser(fastify, id, {
        type: 'SYSTEM',
        title: 'Cadastro não aprovado',
        message:
          body.data.reason ??
          'Seu cadastro não foi aprovado. Abra um ticket de suporte para mais informações.',
        link: '/dashboard',
      })

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/approvals/readers/:id/suspend',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { error } = await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'SUSPENDED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await fastify.supabase.from('gigs').update({ is_active: false }).eq('owner_id', id)

      return reply.send({ data: { success: true } })
    }
  )

  fastify.get('/gigs', { preHandler: [(fastify as any).requireAdmin] }, async (request, reply) => {
    const query = listGigsQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() })
    }

    const gigs = await listGigsInternal(fastify, query.data.status)
    return reply.send({ data: gigs })
  })

  fastify.post(
    '/gigs/:id/approve',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const { data: gig, error: gigFetchError } = await fastify.supabase
        .from('gigs')
        .select('owner_id, title')
        .eq('id', id)
        .single()

      if (gigFetchError || !gig) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      const { error } = await fastify.supabase
        .from('gigs')
        .update({ status: 'APPROVED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await notifyUser(fastify, gig.owner_id, {
        type: 'SYSTEM',
        title: 'Serviço aprovado!',
        message: `Seu serviço "${gig.title}" foi aprovado e já pode ser ativado.`,
        link: '/dashboard/cartomante/servicos',
      })

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/gigs/:id/reject',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = rejectWithReasonSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data: gig, error: gigFetchError } = await fastify.supabase
        .from('gigs')
        .select('owner_id, title')
        .eq('id', id)
        .single()

      if (gigFetchError || !gig) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      const { error } = await fastify.supabase
        .from('gigs')
        .update({ status: 'REJECTED' })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await notifyUser(fastify, gig.owner_id, {
        type: 'SYSTEM',
        title: 'Serviço não aprovado',
        message:
          body.data.reason ??
          `Seu serviço "${gig.title}" não foi aprovado. Edite e reenvie para revisão.`,
        link: '/dashboard/cartomante/servicos',
      })

      return reply.send({ data: { success: true } })
    }
  )

  fastify.get('/tickets', { preHandler: [(fastify as any).requireAdmin] }, async (request, reply) => {
    const query = listTicketsQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() })
    }

    const tickets = await listTicketsInternal(fastify, query.data.status)
    return reply.send({ data: tickets })
  })

  fastify.get(
    '/tickets/:id',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ticket = await getTicketDetailInternal(fastify, id)

      if (!ticket) {
        return reply.status(404).send({ error: 'Ticket não encontrado' })
      }

      return reply.send({ data: ticket })
    }
  )

  fastify.post(
    '/tickets/:id/messages',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = sendTicketMessageSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { error } = await fastify.supabase
        .from('ticket_messages')
        .insert({ ticket_id: id, sender_id: request.user.id, content: body.data.content })

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      await fastify.supabase
        .from('tickets')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', id)
        .eq('status', 'OPEN')

      return reply.send({ data: { success: true } })
    }
  )

  fastify.post(
    '/tickets/:id/status',
    { preHandler: [(fastify as any).requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = updateTicketStatusSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { error } = await fastify.supabase
        .from('tickets')
        .update({ status: body.data.status })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: { success: true } })
    }
  )
}

export default adminRoutes
