import type { IncomingMessage, ServerResponse } from 'http'
import type { FastifyInstance } from 'fastify'
import { build } from './app.js'

let app: FastifyInstance | null = null

async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await build()
    await app.ready()
  }
  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const fastify = await getApp()
  fastify.server.emit('request', req, res)
}
