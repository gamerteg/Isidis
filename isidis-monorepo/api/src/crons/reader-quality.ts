import { FastifyInstance } from 'fastify'

/**
 * CRON 5: Suspensão automática por rating baixo
 * Roda diariamente.
 * Readers com 5+ reviews e rating_average < 2.0 são suspensos automaticamente.
 */
export async function runReaderQuality(fastify: FastifyInstance) {
  const { data: readers, error } = await fastify.supabase
    .from('profiles')
    .select('id, full_name, rating_average, reviews_count')
    .eq('role', 'READER')
    .eq('verification_status', 'APPROVED')
    .gte('reviews_count', 5)
    .lt('rating_average', 2.0)

  if (error) {
    fastify.log.error({ error }, '[cron:reader-quality] Erro ao buscar readers')
    return { suspended: 0, errors: 1 }
  }

  if (!readers || readers.length === 0) {
    return { suspended: 0, errors: 0 }
  }

  let suspended = 0

  for (const reader of readers) {
    try {
      // Suspender reader
      await fastify.supabase
        .from('profiles')
        .update({ verification_status: 'SUSPENDED' })
        .eq('id', reader.id)

      // Desativar todos os gigs do reader
      await fastify.supabase
        .from('gigs')
        .update({ is_active: false })
        .eq('owner_id', reader.id)

      // Notificação in-app
      await fastify.supabase.from('notifications').insert({
        user_id: reader.id,
        type: 'SYSTEM',
        title: 'Conta suspensa temporariamente',
        message: `Sua conta foi suspensa devido ao rating abaixo de 2.0. Abra um ticket de suporte para recorrer.`,
        link: '/tickets',
      })

      suspended++
      fastify.log.warn(
        { readerId: reader.id, rating: reader.rating_average },
        '[cron:reader-quality] Reader suspenso por rating baixo'
      )
    } catch (err) {
      fastify.log.error({ err, readerId: reader.id }, '[cron:reader-quality] Erro ao suspender reader')
    }
  }

  return { suspended, errors: 0 }
}
