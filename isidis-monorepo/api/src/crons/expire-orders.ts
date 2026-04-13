import { FastifyInstance } from 'fastify'

/**
 * CRON 2: Limpeza de orders PIX expiradas
 * Roda a cada 15 minutos.
 * PIX expira em ~30 min. Pedidos PENDING_PAYMENT com mais de 35 min são cancelados silenciosamente.
 */
export async function runExpireOrders(fastify: FastifyInstance) {
  // BUG-20: PIX expira em ~30min. Usar 32min em vez de 35min para fechar a janela
  // onde um PIX expirado ainda poderia ser pago (Stripe rejeitaria mas o pedido ficaria preso)
  const cutoff = new Date()
  cutoff.setMinutes(cutoff.getMinutes() - 32)

  const { data: orders, error } = await fastify.supabase
    .from('orders')
    .select('id, reader_id')
    .eq('status', 'PENDING_PAYMENT')
    .lt('created_at', cutoff.toISOString())

  if (error) {
    fastify.log.error({ error }, '[cron:expire-orders] Erro ao buscar pedidos')
    return { expired: 0, errors: 1 }
  }

  if (!orders || orders.length === 0) {
    return { expired: 0, errors: 0 }
  }

  const ids = orders.map((o) => o.id)

  const { error: updateError } = await fastify.supabase
    .from('orders')
    .update({ status: 'CANCELED' })
    .in('id', ids)

  if (updateError) {
    fastify.log.error({ updateError }, '[cron:expire-orders] Erro ao cancelar pedidos')
    return { expired: 0, errors: 1 }
  }

  fastify.log.info({ count: ids.length }, '[cron:expire-orders] Pedidos PIX expirados cancelados')
  return { expired: ids.length, errors: 0 }
}
