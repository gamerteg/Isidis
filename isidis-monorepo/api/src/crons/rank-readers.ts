import { FastifyInstance } from 'fastify'

/**
 * CRON 6: Ranking orgânico de leitoras
 * Roda a cada 6 horas.
 * Calcula ranking_score (0.0–1.0) para cada leitora APPROVED e persiste em profiles.ranking_score.
 *
 * Fórmula:
 *   ranking_score =
 *     (rating_component        × 0.35) +
 *     (review_volume_component × 0.20) +
 *     (response_time_component × 0.15) +
 *     (completion_rate_component × 0.15) +
 *     (recency_component       × 0.10) +
 *     (profile_completeness    × 0.05)
 *     + new_reader_bonus (se reviews_count < 10)
 */
export async function runRankReaders(fastify: FastifyInstance) {
  const now = new Date()
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ago90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Query 1: Todos os readers (APPROVED + SUSPENDED — suspensas recebem score 0.0)
  const { data: readers, error: readersError } = await fastify.supabase
    .from('profiles')
    .select('id, verification_status, avatar_url, cover_url, bio, tagline, specialties, instagram_handle, decks_used')
    .eq('role', 'READER')
    .in('verification_status', ['APPROVED', 'SUSPENDED'])

  if (readersError || !readers || readers.length === 0) {
    if (readersError) fastify.log.error({ readersError }, '[cron:rank-readers] Erro ao buscar readers')
    return { updated: 0, errors: readersError ? 1 : 0 }
  }

  // Query 2: Agregados de pedidos por reader (90 dias) — completion rate + recency
  const { data: orderAggs, error: orderAggsError } = await fastify.supabase
    .from('orders')
    .select('reader_id, status, delivered_at, created_at')
    .in('reader_id', readers.map((r: any) => r.id))
    .gte('created_at', ago90d)
    .in('status', ['PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED'])

  if (orderAggsError) {
    fastify.log.error({ orderAggsError }, '[cron:rank-readers] Erro ao buscar agregados de orders')
    return { updated: 0, errors: 1 }
  }

  // Query 3: Pedidos com reader_viewed_at dos últimos 30 dias para response time
  const { data: responseTimeOrders, error: responseTimeError } = await fastify.supabase
    .from('orders')
    .select('reader_id, reader_viewed_at, created_at')
    .in('reader_id', readers.map((r: any) => r.id))
    .gte('created_at', ago30d)
    .in('status', ['DELIVERED', 'COMPLETED'])
    .not('reader_viewed_at', 'is', null)

  if (responseTimeError) {
    fastify.log.error({ responseTimeError }, '[cron:rank-readers] Erro ao buscar response time orders')
    return { updated: 0, errors: 1 }
  }

  // Query 4: Reviews reais por reader (fonte de verdade — ignora campos denormalizados do profile)
  const { data: allReviews, error: reviewsError } = await fastify.supabase
    .from('reviews')
    .select('reader_id, rating')
    .in('reader_id', readers.map((r: any) => r.id))

  if (reviewsError) {
    fastify.log.error({ reviewsError }, '[cron:rank-readers] Erro ao buscar reviews')
    return { updated: 0, errors: 1 }
  }

  // Agregar reviews por reader
  const reviewsByReader = new Map<string, { count: number; sum: number }>()
  for (const review of (allReviews ?? [])) {
    const agg = reviewsByReader.get(review.reader_id) ?? { count: 0, sum: 0 }
    agg.count++
    agg.sum += review.rating
    reviewsByReader.set(review.reader_id, agg)
  }

  // Pré-processar agregados por reader_id
  const ordersByReader = new Map<string, { status: string; delivered_at: string | null; created_at: string }[]>()
  for (const order of (orderAggs ?? [])) {
    const list = ordersByReader.get(order.reader_id) ?? []
    list.push(order)
    ordersByReader.set(order.reader_id, list)
  }

  const responseTimeByReader = new Map<string, number[]>() // reader_id → array de horas
  for (const order of (responseTimeOrders ?? [])) {
    if (!order.reader_viewed_at) continue
    const hours = (new Date(order.reader_viewed_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
    if (hours >= 0) {
      const list = responseTimeByReader.get(order.reader_id) ?? []
      list.push(hours)
      responseTimeByReader.set(order.reader_id, list)
    }
  }

  // max_reviews para normalização logarítmica do volume (baseado nos dados reais)
  const maxReviews = Math.max(...Array.from(reviewsByReader.values()).map(r => r.count), 1)

  // Calcular score para cada reader
  const updates: { id: string; ranking_score: number; rating_average: number; reviews_count: number }[] = []

  for (const reader of readers) {
    const reviewAgg = reviewsByReader.get(reader.id) ?? { count: 0, sum: 0 }
    const reviewsCount = reviewAgg.count
    const ratingAvg = reviewsCount > 0 ? reviewAgg.sum / reviewsCount : 0

    if (reader.verification_status === 'SUSPENDED') {
      updates.push({ id: reader.id, ranking_score: 0.0, rating_average: ratingAvg, reviews_count: reviewsCount })
      continue
    }

    // rating_component (35%)
    const ratingComponent = reviewsCount < 5 ? 0.7 : ratingAvg / 5.0

    // review_volume_component (20%)
    const volumeComponent = maxReviews <= 1
      ? 0
      : Math.log10(reviewsCount + 1) / Math.log10(maxReviews + 1)

    // response_time_component (15%)
    const responseTimes = responseTimeByReader.get(reader.id) ?? []
    const responseTimeComponent = responseTimes.length === 0
      ? 0.5
      : scoreFromMedianHours(median(responseTimes))

    // completion_rate_component (15%)
    const readerOrders = ordersByReader.get(reader.id) ?? []
    const completionComponent = calcCompletionRate(readerOrders)

    // recency_component (10%)
    const recencyComponent = calcRecency(readerOrders, now)

    // profile_completeness (5%)
    const completenessComponent = calcProfileCompleteness(reader)

    // Score base
    let score =
      ratingComponent       * 0.35 +
      volumeComponent       * 0.20 +
      responseTimeComponent * 0.15 +
      completionComponent   * 0.15 +
      recencyComponent      * 0.10 +
      completenessComponent * 0.05

    // Bônus nova leitora: +0.15 decaindo linearmente até reviews_count = 10
    if (reviewsCount < 10) {
      score += 0.15 * (1 - reviewsCount / 10)
    }

    // Clamp 0.0–1.0
    updates.push({
      id: reader.id,
      ranking_score: Math.min(1.0, Math.max(0.0, score)),
      rating_average: Math.round(ratingAvg * 10) / 10,
      reviews_count: reviewsCount,
    })
  }

  // Atualizar em batches de 50
  let updated = 0
  let errors = 0
  const BATCH = 50

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async ({ id, ranking_score, rating_average, reviews_count }) => {
        const { error } = await fastify.supabase
          .from('profiles')
          .update({ ranking_score, rating_average, reviews_count })
          .eq('id', id)
        if (error) {
          fastify.log.error({ error, readerId: id }, '[cron:rank-readers] Erro ao atualizar score')
          errors++
        } else {
          updated++
        }
      })
    )
  }

  fastify.log.info({ updated, errors }, '[cron:rank-readers] Ranking atualizado')
  return { updated, errors }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function scoreFromMedianHours(hours: number): number {
  if (hours < 1)  return 1.0
  if (hours < 4)  return 0.8
  if (hours < 12) return 0.5
  if (hours < 24) return 0.3
  return 0.1
}

function calcCompletionRate(orders: { status: string }[]): number {
  const eligible = orders.filter(o => ['PAID', 'DELIVERED', 'COMPLETED'].includes(o.status))
  if (eligible.length === 0) return 0.8 // neutro para leitoras sem histórico
  const completed = eligible.filter(o => o.status === 'COMPLETED').length
  return completed / eligible.length
}

function calcRecency(orders: { status: string; delivered_at: string | null; created_at: string }[], now: Date): number {
  const deliveries = orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED')
  if (deliveries.length === 0) return 0.05

  const mostRecent = deliveries.reduce((best, o) => {
    const t = new Date(o.delivered_at ?? o.created_at).getTime()
    return t > best ? t : best
  }, 0)

  const days = (now.getTime() - mostRecent) / (1000 * 60 * 60 * 24)
  if (days < 7)  return 1.0
  if (days < 14) return 0.8
  if (days < 30) return 0.5
  if (days < 60) return 0.2
  return 0.05
}

function calcProfileCompleteness(reader: {
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  tagline: string | null
  specialties: string[] | null
  instagram_handle: string | null
  decks_used: string[] | null
}): number {
  const fields = [
    !!reader.avatar_url,
    !!reader.cover_url,
    !!reader.bio,
    !!reader.tagline,
    Array.isArray(reader.specialties) && reader.specialties.length > 0,
    !!reader.instagram_handle,
    Array.isArray(reader.decks_used) && reader.decks_used.length > 0,
  ]
  return fields.filter(Boolean).length / 7
}
