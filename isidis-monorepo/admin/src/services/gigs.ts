import { apiGet, apiPost, isApiNotFoundError } from '@/lib/apiClient'
import { legacyApproveGig, legacyListAllGigs, legacyRejectGig } from '@/services/legacyAdmin'

export interface PendingGig {
  id: string
  title: string
  description: string | null
  price: number
  category: string | null
  modality: string | null
  status: string
  image_url: string | null
  delivery_method: string | null
  delivery_time_hours: number | null
  created_at: string
  owner_id: string
  owner_name: string
  owner_verification_status: string | null
}

export async function listPendingGigs(): Promise<PendingGig[]> {
  try {
    const response = await apiGet<{ data: PendingGig[] }>('/admin/gigs?status=PENDING')
    return response.data
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return legacyListAllGigs('PENDING')
  }
}

export async function listAllGigs(status?: string): Promise<PendingGig[]> {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const response = await apiGet<{ data: PendingGig[] }>(`/admin/gigs${query}`)
    return response.data
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return legacyListAllGigs(status)
  }
}

export async function approveGig(id: string): Promise<void> {
  try {
    await apiPost(`/admin/gigs/${id}/approve`)
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    await legacyApproveGig(id)
  }
}

export async function rejectGig(id: string, reason?: string): Promise<void> {
  try {
    await apiPost(`/admin/gigs/${id}/reject`, { reason })
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    await legacyRejectGig(id, reason)
  }
}

export function formatDeliveryMethod(method: string): string {
  const map: Record<string, string> = {
    DIGITAL_SPREAD: 'Tiragem Digital',
    PHYSICAL_PHOTO: 'Foto Fisica',
    VIDEO: 'Video',
    OTHER: 'Outro',
  }
  return map[method] ?? method
}

export function formatModality(mod: string): string {
  const map: Record<string, string> = {
    TAROT: 'Tarot',
    ORACULO: 'Oraculo',
    BARALHO_CIGANO: 'Baralho Cigano',
    ASTROLOGIA: 'Astrologia',
    OUTRO: 'Outro',
  }
  return map[mod] ?? mod
}
