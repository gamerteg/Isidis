import { FastifyPluginAsync } from 'fastify'
import { listReadersSchema } from '../../schemas/index.js'

const readersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/readers/me/dashboard',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const readerId = request.user.id
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [gigsRes, openOrdersRes, last30OrdersRes] = await Promise.all([
        fastify.supabase
          .from('gigs')
          .select('id, status, is_active, payment_methods')
          .eq('owner_id', readerId),
        fastify.supabase
          .from('orders')
          .select(`
            id, status, amount_total, amount_service_total, amount_reader_net,
            payment_method, created_at, reader_viewed_at,
            gigs(title),
            client:profiles!client_id(full_name)
          `)
          .eq('reader_id', readerId)
          .in('status', ['PENDING_PAYMENT', 'PAID', 'DELIVERED'])
          .order('created_at', { ascending: false }),
        fastify.supabase
          .from('orders')
          .select(`
            id, status, amount_total, amount_service_total, amount_reader_net,
            payment_method, created_at
          `)
          .eq('reader_id', readerId)
          .gte('created_at', last30Days),
      ])

      if (gigsRes.error) {
        return reply.status(500).send({ error: gigsRes.error.message })
      }

      if (openOrdersRes.error) {
        return reply.status(500).send({ error: openOrdersRes.error.message })
      }

      if (last30OrdersRes.error) {
        return reply.status(500).send({ error: last30OrdersRes.error.message })
      }

      const gigs = gigsRes.data ?? []
      const openOrders = openOrdersRes.data ?? []
      const last30Orders = last30OrdersRes.data ?? []

      const totalGigs = gigs.length
      const activeGigs = gigs.filter((gig) => gig.status === 'APPROVED' && gig.is_active).length
      const gigsInReview = gigs.filter((gig) => gig.status === 'PENDING').length
      const rejectedGigs = gigs.filter((gig) => gig.status === 'REJECTED').length

      const pendingPaymentOrders = openOrders.filter((order) => order.status === 'PENDING_PAYMENT').length
      const paidOrders = openOrders.filter((order) => order.status === 'PAID').length
      const deliveredOrders = openOrders.filter((order) => order.status === 'DELIVERED').length
      const unreadPaidOrders = openOrders.filter(
        (order) => order.status === 'PAID' && !order.reader_viewed_at
      ).length

      const billableLast30 = last30Orders.filter((order) =>
        ['PAID', 'DELIVERED', 'COMPLETED'].includes(order.status)
      )

      const salesLast30 = billableLast30.reduce(
        (sum, order) => sum + (order.amount_service_total ?? order.amount_total ?? 0),
        0
      )
      const netLast30 = billableLast30.reduce(
        (sum, order) => sum + (order.amount_reader_net ?? 0),
        0
      )
      const averageTicketLast30 =
        billableLast30.length > 0 ? Math.round(salesLast30 / billableLast30.length) : 0

      const pixOrdersLast30 = billableLast30.filter((order) => order.payment_method === 'PIX').length
      const cardOrdersLast30 = billableLast30.filter((order) => order.payment_method === 'CARD').length

      const recentOrders = openOrders
        .filter((order) => order.status === 'PAID')
        .slice(0, 5)

      return reply.send({
        data: {
          metrics: {
            total_gigs: totalGigs,
            active_gigs: activeGigs,
            gigs_in_review: gigsInReview,
            rejected_gigs: rejectedGigs,
            pending_payment_orders: pendingPaymentOrders,
            paid_orders: paidOrders,
            delivered_orders: deliveredOrders,
            unread_paid_orders: unreadPaidOrders,
            sales_last_30_days: salesLast30,
            net_last_30_days: netLast30,
            average_ticket_last_30_days: averageTicketLast30,
            pix_orders_last_30_days: pixOrdersLast30,
            card_orders_last_30_days: cardOrdersLast30,
          },
          recent_orders: recentOrders,
        },
      })
    }
  )

  fastify.get('/readers', async (request, reply) => {
    const query = listReadersSchema.safeParse(request.query)
    if (!query.success) {
      return reply.status(400).send({ error: query.error.flatten() })
    }

    const { specialty, deck, min_price, max_price, min_rating, search, ids, page, limit } = query.data
    const offset = (page - 1) * limit

    let dbQuery = fastify.supabase
      .from('profiles')
      .select(`
        id, full_name, avatar_url, bio, specialties, tagline,
        profile_color, cover_url, rating_average, reviews_count,
        experience_years, verification_status, instagram_handle,
        decks_used, max_orders_per_day, max_simultaneous_orders,
        gigs!inner(id, title, price, category, is_active, status, delivery_time_hours, image_url)
      `, { count: 'exact' })
      .eq('role', 'READER')
      .eq('verification_status', 'APPROVED')
      .eq('gigs.is_active', true)
      .eq('gigs.status', 'APPROVED')
      .order('ranking_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (specialty) {
      dbQuery = dbQuery.contains('specialties', [specialty])
    }

    if (deck) {
      dbQuery = dbQuery.contains('decks_used', [deck])
    }

    if (min_price !== undefined) {
      dbQuery = dbQuery.gte('gigs.price', min_price)
    }

    if (max_price !== undefined) {
      dbQuery = dbQuery.lte('gigs.price', max_price)
    }

    if (min_rating !== undefined) {
      dbQuery = dbQuery.gte('rating_average', min_rating)
    }

    if (search) {
      dbQuery = dbQuery.or(`full_name.ilike.%${search}%,bio.ilike.%${search}%,tagline.ilike.%${search}%`)
    }

    if (ids && ids.length > 0) {
      dbQuery = dbQuery.in('id', ids)
    }

    const { data, error, count } = await dbQuery

    if (error) {
      return reply.status(500).send({ error: error.message })
    }

    const normalizedData = (data ?? []).map((reader: any) => {
      const gigs = Array.isArray(reader.gigs) ? reader.gigs : []
      const prices = gigs
        .map((gig: any) => gig?.price)
        .filter((price: unknown): price is number => typeof price === 'number')

      return {
        ...reader,
        starting_price: prices.length > 0 ? Math.min(...prices) : null,
      }
    })

    return reply.send({
      data: normalizedData,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        pages: Math.ceil((count ?? 0) / limit),
      },
    })
  })

  fastify.get<{ Params: { id: string } }>('/readers/:id', async (request, reply) => {
    const { id } = request.params

    const { data: profile, error } = await fastify.supabase
      .from('profiles')
      .select(`
        id, full_name, avatar_url, bio, specialties, tagline,
        profile_color, cover_url, rating_average, reviews_count,
        experience_years, instagram_handle, youtube_url, decks_used,
        verification_status
      `)
      .eq('id', id)
      .eq('role', 'READER')
      .eq('verification_status', 'APPROVED')
      .single()

    if (error || !profile) {
      return reply.status(404).send({ error: 'Cartomante nao encontrada' })
    }

    const { data: gigs } = await fastify.supabase
      .from('gigs')
      .select(`
        id, title, description, price, category, image_url,
        delivery_time_hours, delivery_method, add_ons, requirements, tags,
        pricing_type, readings_per_month, payment_methods, card_fee_responsibility,
        is_active, status
      `)
      .eq('owner_id', id)
      .eq('is_active', true)
      .eq('status', 'APPROVED')

    const { data: reviews } = await fastify.supabase
      .from('reviews')
      .select('id, rating, comment, created_at, profiles!reviewer_id(full_name, avatar_url)')
      .eq('reader_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    return reply.send({
      data: {
        ...profile,
        gigs: gigs ?? [],
        reviews: reviews ?? [],
      },
    })
  })
}

export default readersRoutes
