import { FastifyPluginAsync } from 'fastify'
import { runCompleteOrders } from '../../crons/complete-orders.js'
import { runExpireOrders } from '../../crons/expire-orders.js'
import { runReleaseHold } from '../../crons/release-hold.js'
import { runLateDeliveries } from '../../crons/late-deliveries.js'
import { runReaderQuality } from '../../crons/reader-quality.js'
import { runRankReaders } from '../../crons/rank-readers.js'
import { runSuggestGigs } from '../../crons/suggest-gigs.js'

/**
 * Rotas de cron — podem ser chamadas por Vercel Cron, Railway Cron, ou qualquer scheduler.
 * Protegidas por Bearer token (CRON_SECRET).
 */
const cronRoutes: FastifyPluginAsync = async (fastify) => {
  const verifyCron = async (request: any, reply: any) => {
    const auth = request.headers.authorization
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  }

  // POST /cron/complete-orders — roda a cada hora
  fastify.post('/cron/complete-orders', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runCompleteOrders(fastify)
    return reply.send(result)
  })

  // POST /cron/expire-orders — roda a cada 15 min
  fastify.post('/cron/expire-orders', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runExpireOrders(fastify)
    return reply.send(result)
  })

  // POST /cron/release-hold — roda a cada hora
  fastify.post('/cron/release-hold', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runReleaseHold(fastify)
    return reply.send(result)
  })

  // POST /cron/late-deliveries — roda a cada hora
  fastify.post('/cron/late-deliveries', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runLateDeliveries(fastify)
    return reply.send(result)
  })

  // POST /cron/reader-quality — roda diariamente
  fastify.post('/cron/reader-quality', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runReaderQuality(fastify)
    return reply.send(result)
  })

  // POST /cron/rank-readers — roda a cada 6 horas
  fastify.post('/cron/rank-readers', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runRankReaders(fastify)
    return reply.send(result)
  })

  // POST /cron/suggest-gigs — roda 2x/dia (9h e 19h, horário de Brasília)
  fastify.post('/cron/suggest-gigs', { preHandler: [verifyCron] }, async (_, reply) => {
    const result = await runSuggestGigs(fastify)
    return reply.send(result)
  })
}

export default cronRoutes
