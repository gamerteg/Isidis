import { apiGet, apiPost } from '@/lib/apiClient'
import { type AdminOpsHealth, type AdminOrderDetail, type AdminOrderListItem } from '@/types/admin-api'

export type AdminOrder = AdminOrderListItem

export interface OrderFilters {
  status?: string
  has_dispute?: boolean
  search?: string
  page?: number
  pageSize?: number
}

function toQueryString(filters: OrderFilters) {
  const params = new URLSearchParams()

  if (filters.status) {
    params.set('status', filters.status)
  }

  if (filters.has_dispute !== undefined) {
    params.set('dispute', String(filters.has_dispute))
  }

  if (filters.page !== undefined) {
    params.set('page', String(filters.page))
  }

  if (filters.pageSize !== undefined) {
    params.set('pageSize', String(filters.pageSize))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function listOrders(filters: OrderFilters = {}): Promise<{
  data: AdminOrder[]
  count: number
  health: AdminOpsHealth
  generated_at: string
}> {
  const response = await apiGet<{
    data: AdminOrder[]
    count: number
    health: AdminOpsHealth
    generated_at: string
  }>(`/admin/orders${toQueryString(filters)}`)

  return response
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  try {
    const response = await apiGet<{ data: AdminOrderDetail }>(`/admin/orders/${id}`)
    return response.data
  } catch {
    return null
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  await apiPost(`/admin/orders/${orderId}/cancel`)
}

export async function resolveDispute(orderId: string): Promise<void> {
  await apiPost(`/admin/orders/${orderId}/resolve-dispute`)
}

export const ORDER_STATUS_MAP: Record<
  string,
  { label: string; variant: 'success' | 'info' | 'warning' | 'outline' | 'destructive' }
> = {
  PENDING_PAYMENT: { label: 'Aguard. Pagamento', variant: 'outline' },
  PAID: { label: 'Pago', variant: 'info' },
  DELIVERED: { label: 'Entregue', variant: 'warning' },
  COMPLETED: { label: 'Concluido', variant: 'success' },
  CANCELED: { label: 'Cancelado', variant: 'destructive' },
}
