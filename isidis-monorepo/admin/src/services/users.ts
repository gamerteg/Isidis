import { apiGet, apiPatch, apiPost } from '@/lib/apiClient'
import { type AdminDashboardOverview } from '@/types/admin-api'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  social_name: string | null
  avatar_url: string | null
  role: 'CLIENT' | 'READER' | 'ADMIN'
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null
  created_at: string
  bio: string | null
  cellphone: string | null
  tax_id: string | null
  pix_key_type: string | null
  pix_key: string | null
  rating_average: number | null
  reviews_count: number | null
}

export interface UserOrder {
  id: string
  created_at: string
  status: string
  amount_total: number
  payment_method: string
  has_dispute: boolean
  client_id: string
  reader_id: string
  gig_title: string
  other_party_name: string
  role_in_order: 'client' | 'reader'
}

export interface WalletStats {
  available: number
  pending: number
  total_withdrawn: number
}

export async function listUsers(): Promise<AdminUser[]> {
  const response = await apiGet<{ data: AdminUser[] }>('/admin/users')
  return response.data
}

export async function getUserDetail(id: string): Promise<AdminUser | null> {
  try {
    const response = await apiGet<{ data: AdminUser }>(`/admin/users/${id}`)
    return response.data
  } catch {
    return null
  }
}

export async function updateUser(id: string, updates: Partial<AdminUser>): Promise<void> {
  await apiPatch(`/admin/users/${id}`, updates)
}

export async function suspendUser(id: string): Promise<void> {
  await apiPost(`/admin/users/${id}/suspend`)
}

export async function activateUser(id: string): Promise<void> {
  await apiPost(`/admin/users/${id}/activate`)
}

export async function changeRole(id: string, role: 'CLIENT' | 'READER' | 'ADMIN'): Promise<void> {
  await apiPost(`/admin/users/${id}/role`, { role })
}

export async function getUserOrders(userId: string): Promise<UserOrder[]> {
  const response = await apiGet<{ data: UserOrder[] }>(`/admin/users/${userId}/orders`)
  return response.data
}

export async function getUserWalletStats(userId: string): Promise<WalletStats | null> {
  const response = await apiGet<{ data: WalletStats | null }>(`/admin/users/${userId}/wallet`)
  return response.data
}

export async function getDashboardOverview(): Promise<AdminDashboardOverview> {
  const response = await apiGet<{ data: AdminDashboardOverview }>('/admin/dashboard')
  return response.data
}
