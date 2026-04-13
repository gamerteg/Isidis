import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(['TEXT', 'IMAGE', 'AUDIO']).default('TEXT'),
})

const createConversationSchema = z.object({
  reader_id: z.string().uuid(),
  gig_id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
})

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /conversations — listar conversas do usuário autenticado
  fastify.get(
    '/conversations',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: userId } = request.user

      const { data, error } = await fastify.supabase
        .from('conversations')
        .select(`
          id, created_at, last_message, last_message_at, order_id, gig_id,
          client:profiles!client_id(id, full_name, avatar_url),
          reader:profiles!reader_id(id, full_name, avatar_url)
        `)
        .or(`client_id.eq.${userId},reader_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data: data ?? [] })
    }
  )

  // POST /conversations — iniciar ou buscar conversa existente
  fastify.post(
    '/conversations',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const body = createConversationSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { id: userId } = request.user
      const { reader_id, gig_id, order_id } = body.data

      // Não pode conversar consigo mesmo
      if (userId === reader_id) {
        return reply.status(400).send({ error: 'Você não pode conversar consigo mesmo' })
      }

      const conversationSelect = `
        id, created_at, last_message, last_message_at, order_id, gig_id,
        client:profiles!client_id(id, full_name, avatar_url),
        reader:profiles!reader_id(id, full_name, avatar_url)
      `

      // Buscar conversa existente entre esses dois usuários (mesmo pedido ou gig)
      let query = fastify.supabase
        .from('conversations')
        .select(conversationSelect)
        .eq('client_id', userId)
        .eq('reader_id', reader_id)

      if (order_id) {
        query = query.eq('order_id', order_id)
      } else {
        query = query.is('order_id', null)
        if (gig_id) query = query.eq('gig_id', gig_id)
      }

      const { data: existing } = await query.maybeSingle()

      if (existing) {
        return reply.send({ data: existing })
      }

      // Criar nova conversa
      const { data: created, error } = await fastify.supabase
        .from('conversations')
        .insert({
          client_id: userId,
          reader_id,
          gig_id: gig_id ?? null,
          order_id: order_id ?? null,
        })
        .select(conversationSelect)
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      return reply.status(201).send({ data: created })
    }
  )

  // GET /conversations/:id/messages — mensagens de uma conversa
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id/messages',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: conversationId } = request.params
      const { id: userId } = request.user
      const q = request.query as Record<string, string>
      const limit = Number(q['limit'] ?? 50)
      const before = q['before'] as string | undefined

      // Verificar acesso
      const { data: conv } = await fastify.supabase
        .from('conversations')
        .select('id, client_id, reader_id')
        .eq('id', conversationId)
        .or(`client_id.eq.${userId},reader_id.eq.${userId}`)
        .single()

      if (!conv) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      let query = fastify.supabase
        .from('messages')
        .select('id, content, type, sender_id, created_at, read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      // Marcar mensagens recebidas como lidas
      await fastify.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null)

      return reply.send({ data: (data ?? []).reverse() })
    }
  )

  // POST /conversations/:id/messages — enviar mensagem
  fastify.post<{ Params: { id: string } }>(
    '/conversations/:id/messages',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: conversationId } = request.params
      const { id: userId } = request.user

      // Verificar acesso
      const { data: conv } = await fastify.supabase
        .from('conversations')
        .select('id, client_id, reader_id')
        .eq('id', conversationId)
        .or(`client_id.eq.${userId},reader_id.eq.${userId}`)
        .single()

      if (!conv) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const body = sendMessageSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data: message, error } = await fastify.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: body.data.content,
          type: body.data.type,
        })
        .select()
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      // Atualizar last_message na conversa
      await fastify.supabase
        .from('conversations')
        .update({
          last_message: body.data.content.substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      // Notificação para o destinatário
      const recipientId = conv.client_id === userId ? conv.reader_id : conv.client_id
      await fastify.supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'NEW_MESSAGE',
        title: 'Nova mensagem',
        message: body.data.content.substring(0, 80),
        link: `/chat/${conversationId}`,
      })

      return reply.status(201).send({ data: message })
    }
  )
}

export default messagesRoutes
