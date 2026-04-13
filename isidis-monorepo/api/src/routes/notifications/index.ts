import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
})

const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /notifications — listar notificações do usuário
  fastify.get(
    '/notifications',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const q = request.query as Record<string, string>
      const limit = Number(q['limit'] ?? 30)

      const { data, error } = await fastify.supabase
        .from('notifications')
        .select('id, type, title, message, link, read_at, created_at')
        .eq('user_id', request.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      const unreadCount = (data ?? []).filter((n) => !n.read_at).length

      return reply.send({ data: data ?? [], unreadCount })
    }
  )

  // PATCH /notifications/read-all — marcar todas como lidas
  fastify.patch(
    '/notifications/read-all',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      await fastify.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', request.user.id)
        .is('read_at', null)

      return reply.send({ data: { message: 'Todas as notificações foram marcadas como lidas.' } })
    }
  )

  // PATCH /notifications/:id/read — marcar uma como lida
  fastify.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      await fastify.supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', request.params.id)
        .eq('user_id', request.user.id)

      return reply.send({ data: { ok: true } })
    }
  )

  // POST /device-tokens — registrar token FCM do dispositivo
  fastify.post(
    '/device-tokens',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const body = registerTokenSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      // Upsert: atualiza se já existe para este usuário
      await fastify.supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: request.user.id,
            token: body.data.token,
            platform: body.data.platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        )

      return reply.send({ data: { ok: true } })
    }
  )
}

export default notificationsRoutes
