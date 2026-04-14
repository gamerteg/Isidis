import { FastifyInstance } from 'fastify'
import { Resend } from 'resend'
import { notifyUser } from '../services/notify.js'

/**
 * CRON 1: Auto-complete de pedidos
 * Roda a cada hora.
 * Pedidos com status DELIVERED há mais de 72h são movidos para COMPLETED
 * e o saldo do reader é liberado.
 */
export async function runCompleteOrders(fastify: FastifyInstance) {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - 72)

  const { data: orders, error } = await fastify.supabase
    .from('orders')
    .select('id, reader_id, client_id, amount_reader_net, gigs(title)')
    .eq('status', 'DELIVERED')
    // BUG-10: usar delivered_at (preciso) em vez de updated_at (resetado por qualquer update)
    .lt('delivered_at', cutoff.toISOString())
    // BUG-02: excluir pedidos em disputa ativa
    .is('disputed_at', null)

  if (error) {
    fastify.log.error({ error }, '[cron:complete-orders] Erro ao buscar pedidos')
    return { processed: 0, errors: 1 }
  }

  if (!orders || orders.length === 0) {
    fastify.log.info('[cron:complete-orders] Nenhum pedido para completar')
    return { processed: 0, errors: 0 }
  }

  let processed = 0
  let errors = 0

  for (const order of orders) {
    try {
      // 1. Atualizar status do pedido para COMPLETED
      // BUG-13 (optimistic lock): incluir guard de status para evitar sobrescrever
      // pedido que foi alterado manualmente entre o SELECT e este UPDATE
      const { data: updatedOrder, error: orderError } = await fastify.supabase
        .from('orders')
        .update({ status: 'COMPLETED' })
        .eq('id', order.id)
        .eq('status', 'DELIVERED') // guard
        .select('id')
        .single()

      // PGRST116 = nenhuma linha retornada: pedido foi alterado entre SELECT e UPDATE (ok, pular)
      if (orderError && (orderError as any).code !== 'PGRST116') throw orderError
      if (!updatedOrder) {
        fastify.log.info({ orderId: order.id }, '[cron:complete-orders] Pedido já foi alterado, pulando')
        continue
      }

      // 2. Buscar wallet do reader
      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', order.reader_id)
        .single()

      if (!wallet) {
        fastify.log.warn({ orderId: order.id }, '[cron:complete-orders] Wallet não encontrada para reader')
        continue
      }

      // 3. Criar notificação in-app para o reader
      await notifyUser(fastify, order.reader_id, {
        type: 'ORDER_STATUS',
        title: 'Leitura confirmada automaticamente',
        message: 'A leitura foi confirmada automaticamente. Seu saldo foi liberado.',
        link: `/orders/${order.id}`,
      })

      // 4. Criar notificação para o cliente para avaliar
      await notifyUser(fastify, order.client_id, {
        type: 'REVIEW_NEW',
        title: 'Como foi sua leitura?',
        message: 'Avalie sua experiência e ajude outros clientes a escolher.',
        link: `/orders/${order.id}/review`,
      })

      processed++
      fastify.log.info({ orderId: order.id }, '[cron:complete-orders] Pedido completado')
    } catch (err) {
      errors++
      fastify.log.error({ err, orderId: order.id }, '[cron:complete-orders] Erro ao processar pedido')
    }
  }

  return { processed, errors }
}
