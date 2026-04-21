import { apiGet, apiPost, isApiNotFoundError } from '@/lib/apiClient'
import { type AdminOpsHealth, type AdminOrderDetail, type AdminOrderListItem } from '@/types/admin-api'
import {
  createCompatibilityHealth,
  legacyCancelOrder,
  legacyGetOrderDetail,
  legacyListOrders,
  legacyResolveDispute,
} from '@/services/legacyAdmin'

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
  try {
    const response = await apiGet<{
      data: AdminOrder[]
      count: number
      health: AdminOpsHealth
      generated_at: string
    }>(`/admin/orders${toQueryString(filters)}`)

    return response
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error

    const legacy = await legacyListOrders(filters)
    return {
      ...legacy,
      health: createCompatibilityHealth(),
      generated_at: new Date().toISOString(),
    }
  }
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  try {
    const response = await apiGet<{ data: AdminOrderDetail }>(`/admin/orders/${id}`)
    return response.data
  } catch (error) {
    if (!isApiNotFoundError(error)) return null
    return legacyGetOrderDetail(id)
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  try {
    await apiPost(`/admin/orders/${orderId}/cancel`)
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    await legacyCancelOrder(orderId)
  }
}

export async function resolveDispute(orderId: string): Promise<void> {
  try {
    await apiPost(`/admin/orders/${orderId}/resolve-dispute`)
  } catch (error) {
    if (!isApiNotFoundError(error)) throw error
    await legacyResolveDispute(orderId)
  }
}

export async function refundOrder(orderId: string): Promise<{ success: boolean; note: string }> {
  const response = await apiPost<{ data: { success: boolean; note: string } }>(`/admin/orders/${orderId}/refund`)
  return response.data
}

export async function forcePaidOrder(orderId: string): Promise<void> {
  await apiPost(`/admin/orders/${orderId}/force-paid`)
}

export async function forceOrderStatus(orderId: string, status: string): Promise<void> {
  await apiPost(`/admin/orders/${orderId}/force-status`, { status })
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
