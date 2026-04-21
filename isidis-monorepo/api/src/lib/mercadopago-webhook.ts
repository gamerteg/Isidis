import { createHmac, timingSafeEqual } from 'crypto'

type HeaderValue = string | string[] | undefined

function getHeaderValue(header: HeaderValue) {
  if (Array.isArray(header)) {
    return header[0]
  }

  return header
}

function parseSignatureHeader(signatureHeader: string) {
  let timestamp: string | null = null
  let hash: string | null = null

  for (const part of signatureHeader.split(',')) {
    const [rawKey, rawValue] = part.split('=')
    const key = rawKey?.trim()
    const value = rawValue?.trim()

    if (!key || !value) {
      continue
    }

    if (key === 'ts') {
      timestamp = value
    }

    if (key === 'v1') {
      hash = value
    }
  }

  return { timestamp, hash }
}

export function getMercadoPagoNotificationTopic(query: Record<string, unknown>, body: any) {
  const queryType = typeof query.type === 'string' ? query.type : undefined
  const queryTopic = typeof query.topic === 'string' ? query.topic : undefined
  const bodyType = typeof body?.type === 'string' ? body.type : undefined
  const bodyTopic = typeof body?.topic === 'string' ? body.topic : undefined

  return queryType ?? queryTopic ?? bodyType ?? bodyTopic ?? null
}

export function getMercadoPagoNotificationResourceId(
  query: Record<string, unknown>,
  body: any
) {
  const queryDataId =
    typeof query['data.id'] === 'string'
      ? query['data.id']
      : typeof query.id === 'string'
        ? query.id
        : null

  const bodyDataId =
    typeof body?.data?.id === 'string' || typeof body?.data?.id === 'number'
      ? String(body.data.id)
      : null

  return queryDataId ?? bodyDataId
}

export function validateMercadoPagoWebhookSignature(params: {
  dataId: string | null
  secret: string
  signatureHeader: HeaderValue
  requestIdHeader: HeaderValue
}) {
  const signature = getHeaderValue(params.signatureHeader)
  const requestId = getHeaderValue(params.requestIdHeader)

  if (!params.dataId || !signature || !requestId) {
    return false
  }

  const { timestamp, hash } = parseSignatureHeader(signature)

  if (!timestamp || !hash) {
    return false
  }

  const template = `id:${params.dataId};request-id:${requestId};ts:${timestamp};`
  const expectedHash = createHmac('sha256', params.secret)
    .update(template)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hash))
  } catch {
    return false
  }
}
