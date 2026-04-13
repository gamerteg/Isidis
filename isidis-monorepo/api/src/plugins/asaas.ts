import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const ASAAS_BASE_URL = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

export async function asaasRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      access_token: process.env.ASAAS_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const data: any = await res.json()
  if (!res.ok) {
    const msg = data.errors?.[0]?.description ?? data.error ?? `Asaas HTTP ${res.status}`
    const error = new Error(msg) as Error & { statusCode?: number; responseBody?: any }
    error.statusCode = res.status
    error.responseBody = data
    throw error
  }
  return data
}

export async function getOrCreateAsaasCustomer(
  asaas: typeof asaasRequest,
  params: { name: string; email: string; cpfCnpj: string; mobilePhone?: string }
): Promise<string> {
  const cpfOnlyDigits = params.cpfCnpj.replace(/\D/g, '')
  const search = await asaas(`/customers?cpfCnpj=${cpfOnlyDigits}`)
  if (search.data?.length > 0) return search.data[0].id

  const customer = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      cpfCnpj: cpfOnlyDigits,
      mobilePhone: params.mobilePhone,
    }),
  })

  return customer.id
}

declare module 'fastify' {
  interface FastifyInstance {
    asaas: typeof asaasRequest
  }
}

const asaasPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('asaas', asaasRequest)
}

export default fp(asaasPlugin, { name: 'asaas' })
