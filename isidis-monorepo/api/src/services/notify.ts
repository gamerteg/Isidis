import { FastifyInstance } from 'fastify'
import { sendPushNotification } from '../lib/firebase.js'

interface NotifyPayload {
  type: string
  title: string
  message: string
  link?: string
  data?: Record<string, string>
}

export async function notifyUser(
  fastify: FastifyInstance,
  userId: string,
  payload: NotifyPayload
): Promise<void> {
  const { error } = await fastify.supabase.from('notifications').insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link ?? null,
  })

  if (error) {
    fastify.log.error({ error, userId }, '[notify] Erro ao inserir notificacao')
  }

  const { data: tokens, error: tokensError } = await fastify.supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)

  if (tokensError) {
    fastify.log.error({ tokensError, userId }, '[notify] Erro ao buscar device tokens')
    return
  }

  if (!tokens || tokens.length === 0) return

  const pushData: Record<string, string> = {
    ...(payload.data ?? {}),
    ...(payload.link ? { route: payload.link } : {}),
  }

  await Promise.allSettled(
    tokens.map(({ token }) =>
      sendPushNotification(token, payload.title, payload.message, pushData).catch((err) => {
        fastify.log.warn({ token, err: err?.message }, '[notify] Push falhou para token')
      })
    )
  )
}
