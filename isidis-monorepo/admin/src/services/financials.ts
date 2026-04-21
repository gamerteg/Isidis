import { apiGet, apiPost } from '@/lib/apiClient'
import {
  type AdminFinancialOverview,
  type AdminFinancialStats,
  type AdminOpsHealth,
  type OrderFinancialRow,
  type PendingWithdrawalItem,
} from '@/types/admin-api'

export type FinancialStats = AdminFinancialStats
export type PendingWithdrawal = PendingWithdrawalItem

export async function getFinancialOverview(): Promise<AdminFinancialOverview> {
  const response = await apiGet<{ data: AdminFinancialOverview }>('/admin/financials')
  return response.data
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
  const response = await apiGet<{
    data: PendingWithdrawal[]
    health: AdminOpsHealth
    generated_at: string
  }>('/admin/withdrawals')

  return response
}

export async function updateWithdrawalStatus(
  id: string,
  status: 'COMPLETED' | 'FAILED'
): Promise<void> {
  await apiPost(`/admin/withdrawals/${id}/status`, { status })
}

export async function listRecentOrders(limit = 50): Promise<OrderFinancialRow[]> {
  const overview = await getFinancialOverview()
  return overview.recent_orders.slice(0, limit)
}
