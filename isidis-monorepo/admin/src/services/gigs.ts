import { apiGet, apiPost } from '@/lib/apiClient'

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
  const response = await apiGet<{ data: PendingGig[] }>('/admin/gigs?status=PENDING')
  return response.data
}

export async function listAllGigs(status?: string): Promise<PendingGig[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const response = await apiGet<{ data: PendingGig[] }>(`/admin/gigs${query}`)
  return response.data
}

export async function approveGig(id: string): Promise<void> {
  await apiPost(`/admin/gigs/${id}/approve`)
}

export async function rejectGig(id: string, reason?: string): Promise<void> {
  await apiPost(`/admin/gigs/${id}/reject`, { reason })
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
