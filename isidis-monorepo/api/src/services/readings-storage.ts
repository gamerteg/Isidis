import { FastifyInstance } from 'fastify'

const READINGS_BUCKET = 'readings'
const READINGS_PUBLIC_PREFIX = '/storage/v1/object/public/readings/'
const READINGS_SIGNED_PREFIX = '/storage/v1/object/sign/readings/'

export async function createSignedReadingsUrl(
  fastify: FastifyInstance,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const normalizedPath = filePath.replace(/^\/+/, '')

  const { data, error } = await fastify.supabase.storage
    .from(READINGS_BUCKET)
    .createSignedUrl(normalizedPath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    fastify.log.error({ error, filePath: normalizedPath }, '[readings] Erro ao gerar signed URL')
    return null
  }

  return data.signedUrl
}

export function extractReadingsFilePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.includes('/') ? trimmed.replace(/^\/+/, '') : null
  }

  try {
    const url = new URL(trimmed)
    const publicIndex = url.pathname.indexOf(READINGS_PUBLIC_PREFIX)
    if (publicIndex >= 0) {
      return decodeURIComponent(
        url.pathname.slice(publicIndex + READINGS_PUBLIC_PREFIX.length)
      ).replace(/^\/+/, '')
    }

    const signedIndex = url.pathname.indexOf(READINGS_SIGNED_PREFIX)
    if (signedIndex >= 0) {
      return decodeURIComponent(
        url.pathname.slice(signedIndex + READINGS_SIGNED_PREFIX.length)
      ).replace(/^\/+/, '')
    }
  } catch {
    return null
  }

  return null
}

async function signReadingValue(
  fastify: FastifyInstance,
  currentValue: unknown,
  preferredFilePath?: unknown
): Promise<unknown> {
  const explicitPath =
    typeof preferredFilePath === 'string' && preferredFilePath.trim()
      ? preferredFilePath.trim()
      : null
  const filePath = explicitPath ?? extractReadingsFilePath(currentValue)

  if (!filePath) return currentValue

  return (await createSignedReadingsUrl(fastify, filePath)) ?? currentValue
}

export async function signDeliveryContentUrls(
  fastify: FastifyInstance,
  deliveryContent: unknown
): Promise<unknown> {
  if (!deliveryContent || typeof deliveryContent !== 'object') {
    return deliveryContent
  }

  const clone = JSON.parse(JSON.stringify(deliveryContent)) as Record<string, unknown>

  if (typeof clone.audio_url === 'string') {
    clone.audio_url = await signReadingValue(fastify, clone.audio_url, clone.audio_file_name)
  }

  if (Array.isArray(clone.photos)) {
    clone.photos = await Promise.all(
      clone.photos.map((photo) => signReadingValue(fastify, photo))
    )
  }

  if (Array.isArray(clone.cards)) {
    clone.cards = await Promise.all(
      clone.cards.map(async (card) => {
        if (!card || typeof card !== 'object') return card
        const nextCard = { ...(card as Record<string, unknown>) }
        if (typeof nextCard.audio_url === 'string') {
          nextCard.audio_url = await signReadingValue(
            fastify,
            nextCard.audio_url,
            nextCard.audio_file_name
          )
        }
        return nextCard
      })
    )
  }

  if (Array.isArray(clone.sections)) {
    clone.sections = await Promise.all(
      clone.sections.map(async (section) => {
        if (!section || typeof section !== 'object') return section
        const nextSection = { ...(section as Record<string, unknown>) }
        if (typeof nextSection.url === 'string') {
          nextSection.url = await signReadingValue(
            fastify,
            nextSection.url,
            nextSection.file_name
          )
        }
        return nextSection
      })
    )
  }

  return clone
}
