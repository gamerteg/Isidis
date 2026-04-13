import { FastifyInstance } from 'fastify'
import { sendPushNotification } from '../lib/firebase.js'

/**
 * CRON 7: Sugestão de gigs para clientes (2x/dia: 9h e 19h, horário de Brasília)
 * Schedulers externos: `0 12 * * *` e `0 22 * * *` (UTC-3 → UTC)
 *
 * Para cada cliente que completou o quiz:
 * 1. Verifica se push de sugestões está habilitado (default: true)
 * 2. Escolhe uma gig ativa das recomendadas (ou qualquer gig ativa como fallback)
 * 3. Envia push FCM com mensagem personalizada pela intenção do cliente
 * 4. Registra notificação in-app (type: GIG_SUGGESTION)
 */

const INTENTION_MESSAGES: Record<string, string> = {
  AMOR:            'O amor tem segredos. Deixa as cartas te mostrarem o caminho. 🌹',
  CARREIRA:        'Uma decisão importante está por vir. Descubra o que as cartas dizem sobre seu próximo passo.',
  FINANCAS:        'Seu futuro financeiro tem uma história para contar. Descubra hoje.',
  SAUDE:           'Cuide da sua energia. Há uma mensagem especial esperando por você.',
  ESPIRITUALIDADE: 'A espiritualidade chama. Há uma leitura feita para você hoje.',
  FAMILIA:         'Conexões que importam. As cartas têm muito a dizer sobre os seus.',
  DECISAO:         'Ainda em dúvida? As cartas podem te dar a clareza que você precisa.',
}

export async function runSuggestGigs(fastify: FastifyInstance) {
  // 1. Buscar todos os clientes com quiz completo
  const { data: onboardings, error: fetchError } = await fastify.supabase
    .from('client_onboarding')
    .select('user_id, intention, matched_gig_ids')

  if (fetchError) {
    fastify.log.error({ fetchError }, '[cron:suggest-gigs] Erro ao buscar onboardings')
    return { processed: 0, errors: 1 }
  }

  if (!onboardings || onboardings.length === 0) {
    return { processed: 0, errors: 0 }
  }

  let processed = 0
  let errors = 0

  for (const record of onboardings) {
    try {
      // 2a. Verificar preferência de notificação (default true se ausente)
      const { data: profile } = await fastify.supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', record.user_id)
        .maybeSingle()

      const prefs = profile?.notification_preferences as Record<string, any> | null
      const pushEnabled = prefs?.gig_suggestions?.push ?? true
      if (!pushEnabled) continue

      // 2b. Buscar tokens FCM do usuário
      const { data: tokens } = await fastify.supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', record.user_id)

      if (!tokens || tokens.length === 0) continue

      // 2c. Escolher gig a sugerir: primeiro das recomendadas, depois qualquer ativa
      let gigId: string | null = null

      if (record.matched_gig_ids && record.matched_gig_ids.length > 0) {
        const { data: matchedGig } = await fastify.supabase
          .from('gigs')
          .select('id')
          .in('id', record.matched_gig_ids)
          .eq('is_active', true)
          .eq('status', 'APPROVED')
          .limit(1)
          .maybeSingle()

        if (matchedGig) gigId = matchedGig.id
      }

      if (!gigId) {
        const { data: fallbackGig } = await fastify.supabase
          .from('gigs')
          .select('id')
          .eq('is_active', true)
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fallbackGig) gigId = fallbackGig.id
      }

      if (!gigId) continue

      // 2d. Compor mensagem com base na intenção do cliente
      const notificationBody = INTENTION_MESSAGES[record.intention] ?? INTENTION_MESSAGES['AMOR']

      // 2e. Enviar FCM para cada device token (erro por token não para o batch)
      for (const { token } of tokens) {
        try {
          await sendPushNotification(
            token,
            'Isidis — Para você hoje ✨',
            notificationBody,
            { link: `/gigs/${gigId}` }
          )
        } catch (fcmErr) {
          // Token inválido ou expirado — log warn, não incrementa erro do batch
          fastify.log.warn(
            { fcmErr, userId: record.user_id },
            '[cron:suggest-gigs] Token FCM inválido ou expirado'
          )
        }
      }

      // 2f. Registrar notificação in-app
      await fastify.supabase.from('notifications').insert({
        user_id: record.user_id,
        type: 'GIG_SUGGESTION',
        title: 'Isidis — Para você hoje ✨',
        message: notificationBody,
        link: `/gigs/${gigId}`,
      })

      processed++
      fastify.log.info({ userId: record.user_id, gigId }, '[cron:suggest-gigs] Sugestão enviada')
    } catch (err) {
      errors++
      fastify.log.error({ err, userId: record.user_id }, '[cron:suggest-gigs] Erro ao processar usuário')
    }
  }

  fastify.log.info({ processed, errors }, '[cron:suggest-gigs] Cron finalizado')
  return { processed, errors }
}
