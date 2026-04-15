import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'

const MP_BASE_URL = 'https://api.mercadopago.com'

export async function mpRequest(path: string, options: RequestInit = {}): Promise<any> {
  const headers: any = {
    Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN!}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': randomUUID(),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${MP_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  
  let data: any = {}
  try {
    data = await res.json()
  } catch (err) {
    // some endpoints like refunds might just be 204 or empty
  }

  if (!res.ok) {
    const errorMsg = data.message ?? data.error ?? `MercadoPago HTTP ${res.status}`
    const error = new Error(errorMsg) as Error & { statusCode?: number; responseBody?: any }
    error.statusCode = res.status
    error.responseBody = data
    throw error
  }
  
  return data
}

declare module 'fastify' {
  interface FastifyInstance {
    mp: typeof mpRequest
  }
}

const mpPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('mp', mpRequest)
}

export default fp(mpPlugin, { name: 'mercadopago' })
