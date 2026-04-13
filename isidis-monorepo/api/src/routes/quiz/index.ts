import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const submitQuizSchema = z.object({
  intention: z.enum(['AMOR', 'CARREIRA', 'FINANCAS', 'SAUDE', 'ESPIRITUALIDADE', 'FAMILIA', 'DECISAO']),
  modality: z.enum(['TAROT', 'ORACULO', 'BARALHO_CIGANO', 'ASTROLOGIA', 'OUTRO']),
  urgency: z.enum(['AGORA', 'PROXIMOS_DIAS', 'COM_CALMA']),
})

const GIG_SELECT = `
  id, title, description, price, image_url, category,
  modality, intentions, delivery_time_hours, delivery_method, is_active,
  owner:profiles!owner_id(
    id, full_name, avatar_url, rating_average, reviews_count,
    verification_status, profile_color, ranking_score
  )
` as const

const quizRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /me/quiz — verifica se o quiz foi completado e retorna as gigs matchadas
  fastify.get(
    '/me/quiz',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { data: onboarding } = await fastify.supabase
        .from('client_onboarding')
        .select('intention, modality, urgency, matched_gig_ids, completed_at')
        .eq('user_id', request.user.id)
        .maybeSingle()

      if (!onboarding) {
        return reply.send({ data: { completed: false, matched_gigs: null } })
      }

      let matchedGigs: unknown[] = []

      if (onboarding.matched_gig_ids && onboarding.matched_gig_ids.length > 0) {
        const { data: gigs } = await fastify.supabase
          .from('gigs')
          .select(GIG_SELECT)
          .in('id', onboarding.matched_gig_ids)
          .eq('is_active', true)
          .eq('status', 'APPROVED')

        matchedGigs = gigs ?? []
      }

      return reply.send({
        data: {
          completed: true,
          intention: onboarding.intention,
          modality: onboarding.modality,
          urgency: onboarding.urgency,
          matched_gigs: matchedGigs,
        },
      })
    }
  )

  // POST /me/quiz — salva respostas do quiz e executa o algoritmo de matching
  fastify.post(
    '/me/quiz',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const body = submitQuizSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { intention, modality, urgency } = body.data

      // ── Matching: busca gigs ativas e aprovadas ───────────────────────────
      let query = fastify.supabase
        .from('gigs')
        .select(GIG_SELECT)
        .eq('is_active', true)
        .eq('status', 'APPROVED')

      if (modality !== 'OUTRO') {
        query = query.eq('modality', modality)
      }

      // Overlap: gig atende a intenção escolhida pelo cliente
      query = query.overlaps('intentions', [intention])

      const { data: primary } = await query
        .order('rating_average', { ascending: false, referencedTable: 'profiles' })
        .limit(5)

      let matchedGigs: any[] = primary ?? []

      // Fallback: se < 3 resultados, relaxa o filtro de intenção
      if (matchedGigs.length < 3) {
        let fallback = fastify.supabase
          .from('gigs')
          .select(GIG_SELECT)
          .eq('is_active', true)
          .eq('status', 'APPROVED')

        if (modality !== 'OUTRO') {
          fallback = fallback.eq('modality', modality)
        }

        const { data: fallbackGigs } = await fallback
          .order('rating_average', { ascending: false, referencedTable: 'profiles' })
          .limit(5)

        const existingIds = new Set(matchedGigs.map((g) => g.id))
        for (const gig of fallbackGigs ?? []) {
          if (!existingIds.has(gig.id)) {
            matchedGigs.push(gig)
          }
          if (matchedGigs.length >= 5) break
        }
      }

      const matchedGigIds = matchedGigs.map((g) => g.id)

      // ── Salvar no banco ───────────────────────────────────────────────────
      const { error: upsertError } = await fastify.supabase
        .from('client_onboarding')
        .upsert(
          {
            user_id: request.user.id,
            intention,
            modality,
            urgency,
            matched_gig_ids: matchedGigIds,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (upsertError) {
        fastify.log.error({ upsertError }, '[POST /me/quiz] Erro ao salvar onboarding')
        return reply.status(500).send({ error: 'Erro ao salvar preferências' })
      }

      return reply.status(201).send({ data: { matched_gigs: matchedGigs } })
    }
  )
}

export default quizRoutes
