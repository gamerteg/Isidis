import { apiGet, apiPost, isApiNotFoundError } from '@/lib/apiClient'
import {
  type AdminFinancialOverview,
  type AdminFinancialStats,
  type AdminOpsHealth,
  type OrderFinancialRow,
  type PendingWithdrawalItem,
} from '@/types/admin-api'
import {
  createCompatibilityHealth,
  legacyGetFinancialOverview,
  legacyListPendingWithdrawals,
  legacyListRecentOrders,
  legacyUpdateWithdrawalStatus,
} from '@/services/legacyAdmin'

export type FinancialStats = AdminFinancialStats
export type PendingWithdrawal = PendingWithdrawalItem

export async function getFinancialOverview(): Promise<AdminFinancialOverview> {
  try {
    const response = await apiGet<{ data: AdminFinancialOverview }>('/admin/financials')
    return response.data
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return legacyGetFinancialOverview()
  }
}

export async function getFinancialStats(): Promise<{
  stats: FinancialStats
  health: AdminOpsHealth
  generated_at: string
}> {
  const overview = await getFinancialOverview()
  return {
    stats: overview.stats,
    health: overview.health,
    generated_at: overview.generated_at,
  }
}

export async function listPendingWithdrawals(): Promise<{
  data: PendingWithdrawal[]
  health: AdminOpsHealth
  generated_at: string
}> {
  try {
    const response = await apiGet<{
      data: PendingWithdrawal[]
      health: AdminOpsHealth
      generated_at: string
    }>('/admin/withdrawals')

    return response
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return {
      data: await legacyListPendingWithdrawals(),
      health: createCompatibilityHealth(),
      generated_at: new Date().toISOString(),
    }
  }
}

export async function updateWithdrawalStatus(
  id: string,
  status: 'COMPLETED' | 'FAILED'
): Promise<void> {
  try {
    await apiPost(`/admin/withdrawals/${id}/status`, { status })
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    await legacyUpdateWithdrawalStatus(id, status)
  }
}

export async function listRecentOrders(limit = 50): Promise<OrderFinancialRow[]> {
  try {
    const overview = await getFinancialOverview()
    return overview.recent_orders.slice(0, limit)
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return legacyListRecentOrders(limit)
  }
}

export async function getWithdrawalReceipt(id: string): Promise<any> {
  const response = await apiGet<{ data: any }>(`/admin/withdrawals/${id}/receipt`)
  return response.data
}

export interface PendingSaleCredit {
  id: string
  created_at: string
  amount: number
  status: string
  order_id: string
  order_status: string
  gig_title: string
  client_name: string
  reader_name: string
}

export async function listPendingSaleCredits(): Promise<PendingSaleCredit[]> {
  try {
    const response = await apiGet<{ data: PendingSaleCredit[] }>('/admin/transactions/sale-credits/pending')
    return response.data
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    return []
  }
}

export async function releaseSaleCredit(id: string): Promise<void> {
  await apiPost(`/admin/transactions/sale-credits/${id}/release`)
}

