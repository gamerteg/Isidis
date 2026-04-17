import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago'

type MpRequestOptions = {
  idempotencyKey?: string
  meliSessionId?: string
}

type MpCreatePaymentParams = {
  body: Record<string, unknown>
  requestOptions?: MpRequestOptions
}

type MpRefundPaymentParams = {
  paymentId: string | number
  body?: Record<string, unknown>
  requestOptions?: MpRequestOptions
}

type MpError = Error & {
  statusCode?: number
  responseBody?: unknown
}

type MpClient = {
  createPayment: (params: MpCreatePaymentParams) => Promise<any>
  getPayment: (paymentId: string | number, requestOptions?: MpRequestOptions) => Promise<any>
  refundPayment: (params: MpRefundPaymentParams) => Promise<any>
}

function normalizeMpError(error: unknown): MpError {
  const responseBody = error as Record<string, any>
  const statusCode =
    responseBody?.api_response?.status ??
    responseBody?.status ??
    responseBody?.cause?.[0]?.api_response?.status

  const message =
    responseBody?.message ??
    responseBody?.error ??
    responseBody?.cause?.[0]?.description ??
    responseBody?.cause?.[0]?.message ??
    `Mercado Pago HTTP ${statusCode ?? 'UNKNOWN'}`

  const normalized = new Error(message) as MpError
  normalized.statusCode = statusCode
  normalized.responseBody = responseBody
  return normalized
}

async function runMercadoPagoCall<T>(handler: () => Promise<T>) {
  try {
    return await handler()
  } catch (error) {
    throw normalizeMpError(error)
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    mp: MpClient
  }
}

const mpPlugin: FastifyPluginAsync = async (fastify) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN nao configurado')
  }

  const client = new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 10000,
    },
  })

  const payments = new Payment(client)
  const refunds = new PaymentRefund(client)

  fastify.decorate('mp', {
    createPayment: ({ body, requestOptions }) =>
      runMercadoPagoCall(() =>
        payments.create({
          body: body as any,
          requestOptions: requestOptions as any,
        })
      ),

    getPayment: (paymentId, requestOptions) =>
      runMercadoPagoCall(() =>
        payments.get({
          id: paymentId,
          requestOptions: requestOptions as any,
        })
      ),

    refundPayment: ({ paymentId, body, requestOptions }) =>
      runMercadoPagoCall(() =>
        refunds.create({
          payment_id: paymentId,
          body: body as any,
          requestOptions: requestOptions as any,
        })
      ),
  })
}

export default fp(mpPlugin, { name: 'mercadopago' })
