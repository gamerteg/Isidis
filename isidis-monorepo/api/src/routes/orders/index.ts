import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { listOrdersSchema } from '../../schemas/index.js'
import { sendOrderCanceled } from '../../services/email.js'
import { notifyUser } from '../../services/notify.js'
import { processPaidMpOrder } from '../../services/payment-reconciliation.js'
import { signDeliveryContentUrls } from '../../services/readings-storage.js'

const orderDetailSelect = `
  id, status, amount_total, amount_service_total, amount_reader_net, amount_platform_fee,
  payment_method, amount_card_fee, card_fee_responsibility,
  stripe_payment_intent_id, asaas_payment_id, created_at, delivered_at, requirements_answers,
  selected_addons, delivery_content, reader_viewed_at,
  gigs(id, title, description, price, image_url, delivery_time_hours, delivery_method, requirements, add_ons),
  client:profiles!client_id(id, full_name, avatar_url, cellphone),
  reader:profiles!reader_id(id, full_name, avatar_url, pix_key, pix_key_type),
  subscriptions(id, status, readings_per_month, readings_done_this_period)
`

const updateRequirementsSchema = z.object({
  requirements_answers: z.record(z.string(), z.string()),
})

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/orders',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const query = listOrdersSchema.safeParse(request.query)
      if (!query.success) {
        return reply.status(400).send({ error: query.error.flatten() })
      }

      const { status, page, limit } = query.data
      const offset = (page - 1) * limit
      const { id, role } = request.user
      const field = role === 'READER' ? 'reader_id' : 'client_id'

      let dbQuery = fastify.supabase
        .from('orders')
        .select(`
          id, status, amount_total, amount_service_total, amount_reader_net, amount_platform_fee,
          payment_method, amount_card_fee, card_fee_responsibility,
          created_at, requirements_answers, selected_addons, reader_viewed_at,
          gigs(id, title, price, image_url, delivery_time_hours, delivery_method),
          client:profiles!client_id(id, full_name, avatar_url),
          reader:profiles!reader_id(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq(field, id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        const statuses = status.split(',')
        if (statuses.length === 1) {
          dbQuery = dbQuery.eq('status', statuses[0])
        } else {
          const orFilter = statuses.map((s) => `status.eq.${s}`).join(',')
          dbQuery = dbQuery.or(orFilter)
        }
      }

      const { data, error, count } = await dbQuery

      if (error) {
        request.log.error({ error, status, field, userId: id }, '[GET /orders] Supabase error')
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({
        data,
        pagination: {
          total: count ?? 0,
          page,
          limit,
          pages: Math.ceil((count ?? 0) / limit),
        },
      })
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/orders/:id',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const { id: userId, role } = request.user

      let { data: order, error } = await fastify.supabase
        .from('orders')
        .select(orderDetailSelect)
        .eq('id', id)
        .single()

      if (error || !order) {
        return reply.status(404).send({ error: 'Pedido nao encontrado' })
      }

      if (order.status === 'PENDING_PAYMENT' && (order as any).asaas_payment_id) {
        try {
          const charge = await fastify.mp.getPayment((order as any).asaas_payment_id)
          if (['approved', 'authorized'].includes(charge.status)) {
            await processPaidMpOrder(fastify, (order as any).asaas_payment_id)

            const refreshed = await fastify.supabase
              .from('orders')
              .select(orderDetailSelect)
              .eq('id', id)
              .single()

            if (refreshed.data) {
              order = refreshed.data as any
            }
          }
        } catch (reconcileErr: any) {
          request.log.error(
            { orderId: id, err: reconcileErr?.message ?? reconcileErr },
            '[GET /orders/:id] Erro ao reconciliar pagamento pendente'
          )
        }
      }

      const isOwner =
        (order as any).client?.id === userId ||
        (order as any).reader?.id === userId ||
        role === 'ADMIN'

      if (!isOwner) {
        return reply.status(403).send({ error: 'Sem permissao para visualizar este pedido' })
      }

      if (role === 'READER' && !(order as any).reader_viewed_at) {
        await fastify.supabase
          .from('orders')
          .update({ reader_viewed_at: new Date().toISOString() })
          .eq('id', id)
      }

      if ((order as any).delivery_content) {
        ;(order as any).delivery_content = await signDeliveryContentUrls(
          fastify,
          (order as any).delivery_content
        )
      }

      return reply.send({ data: order })
    }
  )

  fastify.patch<{ Params: { id: string } }>(
    '/orders/:id/requirements',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const { id: userId } = request.user
      const body = updateRequirementsSchema.safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, client_id, status')
        .eq('id', id)
        .single()

      if (!order) {
        return reply.status(404).send({ error: 'Pedido nao encontrado' })
      }

      if (order.client_id !== userId) {
        return reply.status(403).send({ error: 'Sem permissao para editar este pedido' })
      }

      if (!['PENDING_PAYMENT', 'PAID'].includes(order.status)) {
        return reply.status(400).send({
          error: 'Os requisitos so podem ser atualizados em pedidos pendentes ou pagos',
        })
      }

      const { error } = await fastify.supabase
        .from('orders')
        .update({ requirements_answers: body.data.requirements_answers })
        .eq('id', id)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: { message: 'Requisitos atualizados com sucesso.' } })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/cancel',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const { id: userId, role } = request.user

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id, asaas_payment_id, amount_total, created_at, reader_viewed_at, gigs(title)')
        .eq('id', id)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })

      const isReader = order.reader_id === userId
      const isClient = order.client_id === userId
      const isAdmin = role === 'ADMIN'

      if (!isReader && !isClient && !isAdmin) {
        return reply.status(403).send({ error: 'Sem permissao para cancelar este pedido' })
      }

      if (order.status !== 'PAID') {
        return reply.status(400).send({ error: 'Apenas pedidos pagos podem ser cancelados' })
      }

      if (isClient && !isAdmin) {
        if ((order as any).reader_viewed_at) {
          return reply.status(400).send({
            error: 'A leitura ja foi iniciada e nao pode mais ser cancelada pelo cliente.',
          })
        }

        const paidAt = new Date(order.created_at)
        const hoursElapsed = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60)
        if (hoursElapsed > 2) {
          return reply.status(400).send({
            error: 'O prazo de cancelamento (2h apos o pagamento) expirou. Use a opcao de disputa se necessario.',
          })
        }
      }

      const body = z.object({ reason: z.string().min(10) }).safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: 'Informe o motivo do cancelamento (minimo 10 caracteres)' })
      }

      if (!order.asaas_payment_id) {
        request.log.error({ orderId: id }, '[cancel] Pedido sem asaas_payment_id para reembolso')
        return reply.status(500).send({ error: 'Erro ao localizar pagamento para reembolso. Tente novamente.' })
      }

      try {
        await fastify.mp.refundPayment({
          paymentId: order.asaas_payment_id,
        })
      } catch (mpErr: any) {
        request.log.error({ mpErr: mpErr.message }, '[cancel] Erro ao criar reembolso Mercado Pago')
        return reply.status(500).send({ error: 'Erro ao processar reembolso. Tente novamente.' })
      }

      await fastify.supabase
        .from('orders')
        .update({ status: 'CANCELED' })
        .eq('id', id)

      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', order.reader_id)
        .single()

      if (wallet) {
        await fastify.supabase
          .from('transactions')
          .update({ status: 'FAILED' })
          .eq('order_id', id)
          .eq('type', 'SALE_CREDIT')
      }

      await notifyUser(fastify, order.client_id, {
        type: 'ORDER_STATUS',
        title: 'Pedido cancelado',
        message: 'Seu pedido foi cancelado. O reembolso sera processado em ate 5 dias uteis.',
        link: `/orders/${id}`,
      })

      try {
        const { data: clientAuth } = await fastify.supabase.auth.admin.getUserById(order.client_id)
        const { data: clientProfile } = await fastify.supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.client_id)
          .single()

        if (clientAuth.user?.email) {
          await sendOrderCanceled({
            clientEmail: clientAuth.user.email,
            clientName: clientProfile?.full_name ?? 'Cliente',
            gigTitle: (order as any).gigs?.title ?? 'Leitura',
            reason: body.data.reason,
          })
        }
      } catch (emailErr) {
        request.log.error({ emailErr }, '[cancel] Erro ao enviar email')
      }

      return reply.send({ data: { message: 'Pedido cancelado e reembolso iniciado.' } })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/dispute',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const { id: clientId } = request.user

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id, updated_at, delivered_at, gigs(title)')
        .eq('id', id)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })
      if (order.client_id !== clientId) return reply.status(403).send({ error: 'Sem permissao' })
      if (order.status !== 'DELIVERED') {
        return reply.status(400).send({ error: 'Disputas so podem ser abertas apos a entrega da leitura' })
      }

      const deliveredAt = (order as any).delivered_at
        ? new Date((order as any).delivered_at)
        : new Date(order.updated_at)
      const hoursElapsed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed > 48) {
        return reply.status(400).send({ error: 'O prazo para abrir disputa (48h apos entrega) expirou' })
      }

      const body = z.object({ reason: z.string().min(20) }).safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: 'Descreva o motivo da disputa (minimo 20 caracteres)' })
      }

      const { data: ticket } = await fastify.supabase
        .from('tickets')
        .insert({
          user_id: clientId,
          subject: `Disputa - Pedido ${id}`,
          description: body.data.reason,
          status: 'OPEN',
          priority: 'HIGH',
          category: 'REEMBOLSO',
        })
        .select('id')
        .single()

      await fastify.supabase
        .from('orders')
        .update({ disputed_at: new Date().toISOString() })
        .eq('id', id)

      const { data: admins } = await fastify.supabase
        .from('profiles')
        .select('id')
        .eq('role', 'ADMIN')

      for (const admin of admins ?? []) {
        await notifyUser(fastify, admin.id, {
          type: 'SYSTEM',
          title: 'Nova disputa aberta',
          message: `Cliente abriu disputa no pedido ${id}. Ticket #${ticket?.id}`,
          link: '/admin/disputes',
        })
      }

      return reply.status(201).send({
        data: {
          message: 'Disputa aberta. Nossa equipe entrara em contato em ate 24h.',
          ticket_id: ticket?.id,
        },
      })
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/review',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id } = request.params
      const { id: clientId } = request.user

      const body = z.object({
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }).safeParse(request.body)

      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, status, client_id, reader_id')
        .eq('id', id)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })
      if (order.client_id !== clientId) return reply.status(403).send({ error: 'Sem permissao' })
      if (order.status !== 'COMPLETED') {
        return reply.status(400).send({ error: 'So e possivel avaliar pedidos concluidos' })
      }

      const { data: existing } = await fastify.supabase
        .from('reviews')
        .select('id')
        .eq('order_id', id)
        .eq('reviewer_id', clientId)
        .single()

      if (existing) {
        return reply.status(400).send({ error: 'Voce ja avaliou este pedido' })
      }

      const { data: review, error } = await fastify.supabase
        .from('reviews')
        .insert({
          order_id: id,
          reviewer_id: clientId,
          reviewed_id: order.reader_id,
          rating: body.data.rating,
          comment: body.data.comment ?? null,
        })
        .select('id')
        .single()

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      const { data: allReviews } = await fastify.supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', order.reader_id)

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length
        await fastify.supabase
          .from('profiles')
          .update({
            rating_average: Math.round(avg * 10) / 10,
            reviews_count: allReviews.length,
          })
          .eq('id', order.reader_id)
      }

      return reply.status(201).send({ data: { id: review?.id, message: 'Avaliacao enviada!' } })
    }
  )
}

export default ordersRoutes
