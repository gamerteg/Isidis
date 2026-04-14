import { FastifyInstance } from 'fastify'
import { notifyUser } from '../services/notify.js'

/**
 * CRON 4: Alerta de atraso de entrega
 * Roda a cada hora.
 * Pedidos PAID cujo prazo (created_at + delivery_time_hours) já passou
 * recebem alerta. Atraso > 2x o prazo cria ticket automático.
 */
export async function runLateDeliveries(fastify: FastifyInstance) {
  const now = new Date()

  // Buscar pedidos PAID com gig info para calcular prazo
  const { data: orders, error } = await fastify.supabase
    .from('orders')
    .select(`
      id, reader_id, client_id, created_at, late_alert_sent_at,
      gigs(title, delivery_time_hours)
    `)
    .eq('status', 'PAID')
    .is('late_alert_sent_at', null) // ainda não alertado

  if (error) {
    fastify.log.error({ error }, '[cron:late-deliveries] Erro ao buscar pedidos')
    return { alerted: 0, escalated: 0, errors: 1 }
  }

  if (!orders || orders.length === 0) {
    return { alerted: 0, escalated: 0, errors: 0 }
  }

  let alerted = 0
  let escalated = 0

  for (const order of orders) {
    try {
      const gig = (order as any).gigs
      if (!gig?.delivery_time_hours) continue

      const deadline = new Date(order.created_at)
      deadline.setHours(deadline.getHours() + gig.delivery_time_hours)

      if (now < deadline) continue // ainda dentro do prazo

      const hoursLate = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60))
      const isEscalated = hoursLate >= gig.delivery_time_hours // atraso > 2x o prazo

      // Notificação in-app para o reader
      await notifyUser(fastify, order.reader_id, {
        type: 'ORDER_STATUS',
        title: 'Pedido atrasado!',
        message: `Voce tem ${hoursLate}h de atraso no pedido. Entregue o quanto antes para manter sua reputacao.`,
        link: `/orders/${order.id}/deliver`,
      })

      // Marcar alerta enviado
      await fastify.supabase
        .from('orders')
        .update({ late_alert_sent_at: now.toISOString() })
        .eq('id', order.id)

      alerted++

      // Escalar para admin se atraso > 2x o prazo
      if (isEscalated) {
        await fastify.supabase.from('tickets').insert({
          user_id: order.client_id,
          subject: `Pedido ${order.id} com atraso grave`,
          description: `O pedido está com ${hoursLate}h de atraso (prazo era ${gig.delivery_time_hours}h). Escalado automaticamente.`,
          status: 'OPEN',
          priority: 'HIGH',
          category: 'DUVIDA',
        })

        // Notificar cliente
        await notifyUser(fastify, order.client_id, {
          type: 'ORDER_STATUS',
          title: 'Sua leitura esta atrasada',
          message: 'Abrimos um ticket de suporte para resolver o atraso no seu pedido.',
          link: `/orders/${order.id}`,
        })

        escalated++
        fastify.log.warn({ orderId: order.id, hoursLate }, '[cron:late-deliveries] Pedido escalado para admin')
      }
    } catch (err) {
      fastify.log.error({ err, orderId: order.id }, '[cron:late-deliveries] Erro ao processar pedido')
    }
  }

  // BUG-09: Segunda passagem — escalação de pedidos já alertados que atingiram 2× o prazo
  // O filtro .is('late_alert_sent_at', null) do loop acima exclui esses pedidos,
  // por isso precisamos de uma query separada para reavaliação de escalação.
  const { data: alertedOrders } = await fastify.supabase
    .from('orders')
    .select(`id, reader_id, client_id, created_at, gigs(title, delivery_time_hours)`)
    .eq('status', 'PAID')
    .not('late_alert_sent_at', 'is', null)

  for (const order of alertedOrders ?? []) {
    try {
      const gig = (order as any).gigs
      if (!gig?.delivery_time_hours) continue

      const deadline = new Date(order.created_at)
      deadline.setHours(deadline.getHours() + gig.delivery_time_hours)
      const hoursLate = (now.getTime() - deadline.getTime()) / (1000 * 60 * 60)

      // Só escala se atingiu 2× o prazo
      if (hoursLate < gig.delivery_time_hours) continue

      // Verificar se já existe ticket de escalação para este pedido (evita duplicar)
      const { count: existingTicket } = await fastify.supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .like('subject', `%${order.id}%`)
        .eq('priority', 'HIGH')

      if ((existingTicket ?? 0) > 0) continue

      await fastify.supabase.from('tickets').insert({
        user_id: order.client_id,
        subject: `Pedido ${order.id} com atraso grave`,
        description: `O pedido está com ${Math.floor(hoursLate)}h de atraso (prazo era ${gig.delivery_time_hours}h). Escalado automaticamente.`,
        status: 'OPEN',
        priority: 'HIGH',
        category: 'DUVIDA',
      })

      await notifyUser(fastify, order.client_id, {
        type: 'ORDER_STATUS',
        title: 'Sua leitura esta muito atrasada',
        message: 'Abrimos um ticket de suporte para resolver o atraso no seu pedido.',
        link: `/orders/${order.id}`,
      })

      escalated++
      fastify.log.warn({ orderId: order.id, hoursLate }, '[cron:late-deliveries] Pedido escalado (segunda passagem)')
    } catch (err) {
      fastify.log.error({ err, orderId: order.id }, '[cron:late-deliveries] Erro na escalação')
    }
  }

  fastify.log.info({ alerted, escalated }, '[cron:late-deliveries] Alertas enviados')
  return { alerted, escalated, errors: 0 }
}
