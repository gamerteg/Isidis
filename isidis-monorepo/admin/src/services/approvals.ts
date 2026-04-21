import { apiGet, apiPost } from '@/lib/apiClient'

export interface PendingReader {
  id: string
  full_name: string | null
  social_name: string | null
  avatar_url: string | null
  bio: string | null
  specialties: string[] | null
  verification_status: string
  created_at: string
  ethics_accepted_at: string | null
  tax_id: string | null
  cellphone: string | null
  birth_date: string | null
  pix_key_type: string | null
  pix_key: string | null
  email?: string
}

export interface ReaderDetail extends PendingReader {
  address_street: string | null
  address_number: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip_code: string | null
  document_front_url: string | null
  document_back_url: string | null
  selfie_url: string | null
  instagram_handle: string | null
  experience_years: number | null
}

export async function listPendingReaders(): Promise<PendingReader[]> {
  const response = await apiGet<{ data: PendingReader[] }>('/admin/approvals/readers')
  return response.data
}

export async function getReaderDetail(id: string): Promise<ReaderDetail | null> {
  try {
    const response = await apiGet<{ data: ReaderDetail }>(`/admin/approvals/readers/${id}`)
    return response.data
  } catch {
    return null
  }
}

export async function getSignedDocUrl(path: string): Promise<string | null> {
  if (!path) return null
  const params = new URLSearchParams({ path })
  const response = await apiGet<{ data: { signed_url: string } }>(
    `/admin/verification-documents/signed-url?${params.toString()}`
  )
  return response.data.signed_url
}

export async function approveReader(id: string): Promise<void> {
  await apiPost(`/admin/approvals/readers/${id}/approve`)
}

export async function rejectReader(id: string, reason?: string): Promise<void> {
  await apiPost(`/admin/approvals/readers/${id}/reject`, { reason })
}

export async function suspendReader(id: string): Promise<void> {
  await apiPost(`/admin/approvals/readers/${id}/suspend`)
}
