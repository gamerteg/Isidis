import type { IncomingMessage, ServerResponse } from 'http'
import type { FastifyInstance } from 'fastify'
import { build } from './app.js'

let app: FastifyInstance | null = null
let initError: unknown = null

async function getApp(): Promise<FastifyInstance> {
  if (initError) throw initError
  if (!app) {
    try {
      app = await build()
      await app.ready()
    } catch (err) {
      initError = err
      throw err
    }
  }
  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const fastify = await getApp()
    fastify.server.emit('request', req, res)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Internal Server Error' }))
  }
}
