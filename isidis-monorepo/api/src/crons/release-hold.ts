import { FastifyInstance } from 'fastify'
import { notifyUser } from '../services/notify.js'

/**
 * CRON 3: LiberaÃ§Ã£o do hold de 48h
 * Roda a cada hora.
 * Transactions SALE_CREDIT com status PENDING e created_at > 48h atrÃ¡s
 * sÃ£o movidas para COMPLETED, liberando o saldo para saque.
 */
export async function runReleaseHold(fastify: FastifyInstance) {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 48)

  // BUG-18: incluir disputed_at e has_dispute do pedido para nÃ£o liberar fundos em disputas ativas
  const { data: transactions, error } = await fastify.supabase
    .from('transactions')
    .select('id, wallet_id, amount, order_id, orders!inner(disputed_at, has_dispute, status)')
    .eq('type', 'SALE_CREDIT')
    .eq('status', 'PENDING')
    .eq('orders.has_dispute', false)
    .in('orders.status', ['DELIVERED', 'COMPLETED'])
    .lt('created_at', cutoff.toISOString())

  if (error) {
    fastify.log.error({ error }, '[cron:release-hold] Erro ao buscar transactions')
    return { released: 0, errors: 1 }
  }

  if (!transactions || transactions.length === 0) {
    return { released: 0, errors: 0 }
  }

  // BUG-18: excluir transaÃ§Ãµes de pedidos em disputa ativa
  const releasable = transactions.filter((t) => {
    const order = (t as any).orders
    return (
      !order?.disputed_at &&
      !order?.has_dispute &&
      ['DELIVERED', 'COMPLETED'].includes(order?.status)
    )
  })
  const skipped = transactions.length - releasable.length
  if (skipped > 0) {
    fastify.log.info({ skipped }, '[cron:release-hold] TransaÃ§Ãµes retidas por disputa ativa')
  }

  if (releasable.length === 0) {
    return { released: 0, errors: 0 }
  }

  const ids = releasable.map((t) => t.id)

  const { error: updateError } = await fastify.supabase
    .from('transactions')
    .update({ status: 'COMPLETED' })
    .in('id', ids)

  if (updateError) {
    fastify.log.error({ updateError }, '[cron:release-hold] Erro ao liberar transactions')
    return { released: 0, errors: 1 }
  }

  // Notificar readers cujos saldos foram liberados
  for (const tx of releasable) {
    try {
      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('user_id')
        .eq('id', tx.wallet_id)
        .single()

      if (wallet) {
        await notifyUser(fastify, wallet.user_id, {
          type: 'WITHDRAWAL_UPDATE',
          title: 'Saldo liberado para saque',
          message: `R$${(tx.amount / 100).toFixed(2)} estao disponiveis para saque.`,
          link: '/wallet',
        })
      }
    } catch (err) {
      fastify.log.warn({ err, txId: tx.id }, '[cron:release-hold] Erro ao notificar reader')
    }
  }

  fastify.log.info({ count: ids.length }, '[cron:release-hold] Holds liberados')
  return { released: ids.length, errors: 0 }
}
