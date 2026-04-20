import apiClient from '@/lib/apiClient'
import type { GigRequirement, OrderDetail } from '@/types'

export interface ReadingCard {
  cardId: number
  name: string
  numeral: string
  position: string
  interpretation: string
  audioBase64: string | null
  image?: string
}

export interface ReadingContent {
  spreadName: string
  cards: ReadingCard[]
}

export interface SpreadSection {
  id: string
  title: string
  photoUrl: string | null
  audioUrl: string | null
  interpretation: string
}

export interface PhysicalReadingContent {
  mode: 'physical'
  readingTitle: string
  sections: SpreadSection[]
}

interface ReaderOrderPayload {
  id: string
  status: string
  deliveryContent: ReadingContent | PhysicalReadingContent | null
  amountReaderNet: number
  createdAt: string
  clientId: string
  gigTitle: string
  gigRequirements: GigRequirement[]
  requirementsAnswers: Record<string, string>
  clientName: string
  clientEmail: string
  readerName: string
}

type ApiDeliveryCard = {
  id?: string
  card_id?: string
  numeral?: string
  name?: string
  card_image?: string
  image?: string
  position?: string
  position_name?: string
  interpretation?: string
  audio_url?: string
  audioBase64?: string
  order?: number
}

type ApiDeliverySection = {
  section_id?: string
  title?: string
  type?: 'text' | 'audio' | 'photo'
  content?: string
  url?: string
  order?: number
}

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.formErrors?.[0] ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

function normalizeLegacyDigitalContent(content: any): ReadingContent {
  return {
    spreadName: content?.spreadName || content?.summary || 'Leitura Personalizada',
    cards: Array.isArray(content?.cards)
      ? content.cards.map((card: any, index: number) => ({
          cardId: Number(card?.card_id || card?.cardId || card?.id || index + 1),
          name: card?.name || card?.card_name || `Carta ${index + 1}`,
          numeral: card?.numeral || '',
          position:
            card?.position_name ||
            (card?.position && card.position !== 'upright' && card.position !== 'reversed'
              ? card.position
              : `Carta ${index + 1}`),
          interpretation: card?.interpretation || card?.meaning || '',
          audioBase64: card?.audio_url || card?.audioBase64 || null,
          image: card?.card_image || card?.image || undefined,
        }))
      : [],
  }
}

function normalizeLegacyPhysicalContent(content: any): PhysicalReadingContent {
  if (Array.isArray(content?.sections) && content.mode === 'physical') {
    return {
      mode: 'physical',
      readingTitle: content.readingTitle || 'Leitura Personalizada',
      sections: content.sections.map((section: any, index: number) => ({
        id: section?.id || `section-${index + 1}`,
        title: section?.title || `Tiragem ${index + 1}`,
        photoUrl: section?.photoUrl || null,
        audioUrl: section?.audioUrl || null,
        interpretation: section?.interpretation || '',
      })),
    }
  }

  const groupedSections = new Map<string, SpreadSection>()

  for (const [index, section] of (Array.isArray(content?.sections) ? content.sections : []).entries()) {
    const key = section?.section_id || section?.title || `section-${Math.floor(index / 3) + 1}`
    const current =
      groupedSections.get(key) ||
      {
        id: key,
        title: section?.title || `Tiragem ${groupedSections.size + 1}`,
        photoUrl: null,
        audioUrl: null,
        interpretation: '',
      }

    if (section?.type === 'photo') current.photoUrl = section?.url || null
    if (section?.type === 'audio') current.audioUrl = section?.url || null
    if (section?.type === 'text') current.interpretation = section?.content || ''

    groupedSections.set(key, current)
  }

  return {
    mode: 'physical',
    readingTitle: content?.readingTitle || content?.summary || 'Leitura Personalizada',
    sections: Array.from(groupedSections.values()),
  }
}

function normalizeDeliveryContent(content: any): ReadingContent | PhysicalReadingContent | null {
  if (!content) return null

  if (content?.mode === 'physical' || content?.method === 'PHYSICAL') {
    return normalizeLegacyPhysicalContent(content)
  }

  if (Array.isArray(content?.cards) || content?.method === 'DIGITAL_SPREAD') {
    return normalizeLegacyDigitalContent(content)
  }

  return null
}

function toDigitalDeliveryContent(content: ReadingContent) {
  return {
    method: 'DIGITAL_SPREAD' as const,
    summary: content.spreadName || 'Leitura Personalizada',
    cards: content.cards.map((card, index) => ({
      id: String(card.cardId || index + 1),
      card_id: String(card.cardId || index + 1),
      numeral: card.numeral || undefined,
      name: card.name || `Carta ${index + 1}`,
      card_image: card.image || undefined,
      position: 'upright' as const,
      position_name: card.position || `Carta ${index + 1}`,
      interpretation: card.interpretation.trim() || undefined,
      audio_url: card.audioBase64 || undefined,
      order: index,
    })),
    sections: [],
  }
}

function toPhysicalDeliveryContent(content: PhysicalReadingContent) {
  const sections = content.sections.flatMap((section, index) => {
    const payload: Array<{
      section_id: string
      title: string
      type: 'text' | 'audio' | 'photo'
      content?: string
      url?: string
      order: number
    }> = []

    if (section.photoUrl) {
      payload.push({
        section_id: section.id,
        title: section.title,
        type: 'photo',
        url: section.photoUrl,
        order: index * 3,
      })
    }

    if (section.audioUrl) {
      payload.push({
        section_id: section.id,
        title: section.title,
        type: 'audio',
        url: section.audioUrl,
        order: index * 3 + 1,
      })
    }

    if (section.interpretation.trim()) {
      payload.push({
        section_id: section.id,
        title: section.title,
        type: 'text',
        content: section.interpretation.trim(),
        order: index * 3 + 2,
      })
    }

    return payload
  })

  return {
    method: 'PHYSICAL' as const,
    summary: content.readingTitle || 'Leitura Personalizada',
    cards: [],
    sections,
  }
}

export async function saveDraft(orderId: string, content: ReadingContent) {
  try {
    await apiClient.post(`/orders/${orderId}/delivery/draft`, toDigitalDeliveryContent(content))
    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Erro ao salvar rascunho.'),
    }
  }
}

export async function sendReading(orderId: string, content: ReadingContent) {
  if (!content.cards || content.cards.length === 0) {
    return { error: 'Adicione pelo menos uma carta a leitura.' }
  }

  const hasInterpretation = content.cards.some(
    (card) => card.interpretation.trim() || card.audioBase64,
  )

  if (!hasInterpretation) {
    return { error: 'Adicione pelo menos uma interpretacao por texto ou audio.' }
  }

  try {
    await apiClient.post(`/orders/${orderId}/delivery/submit`, toDigitalDeliveryContent(content))
    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Erro ao enviar leitura.'),
    }
  }
}

export async function savePhysicalDraft(orderId: string, content: PhysicalReadingContent) {
  try {
    await apiClient.post(`/orders/${orderId}/delivery/draft`, toPhysicalDeliveryContent(content))
    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Erro ao salvar rascunho.'),
    }
  }
}

export async function sendPhysicalReading(orderId: string, content: PhysicalReadingContent) {
  const hasContent = content.sections.some(
    (section) => section.photoUrl || section.audioUrl || section.interpretation.trim(),
  )

  if (!hasContent) {
    return { error: 'Adicione pelo menos uma foto, audio ou interpretacao.' }
  }

  try {
    await apiClient.post(`/orders/${orderId}/delivery/submit`, toPhysicalDeliveryContent(content))
    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Erro ao enviar leitura.'),
    }
  }
}

export async function getOrder(orderId: string): Promise<ReaderOrderPayload | null> {
  try {
    const response = await apiClient.get<{ data: OrderDetail }>(`/orders/${orderId}`)
    const order = response.data.data

    return {
      id: order.id,
      status: order.status,
      deliveryContent: normalizeDeliveryContent(order.delivery_content),
      amountReaderNet: order.amount_reader_net || 0,
      createdAt: order.created_at,
      clientId: order.client?.id || '',
      gigTitle: order.gigs?.title || 'Leitura de Tarot',
      gigRequirements: order.gigs?.requirements || [],
      requirementsAnswers: order.requirements_answers || {},
      clientName: order.client?.full_name || 'Cliente',
      clientEmail: order.client?.email || '',
      readerName: order.reader?.full_name || 'Cartomante',
    }
  } catch {
    return null
  }
}
