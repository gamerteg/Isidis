import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ChevronRight } from 'lucide-react'
import useSWR from 'swr'
import { api, type OrdersListResponse } from '@/lib/api'
import { formatCurrency, formatDate, ORDER_STATUS_MAP } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Avatar } from '@/components/shared/Avatar'

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'gold'

const FILTER_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Aguardando', value: 'PAID' },
  { label: 'Entregues', value: 'DELIVERED' },
]

const STATUS_BADGE: Record<string, StatusVariant> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  DELIVERED: 'success',
  CANCELED: 'error',
  DISPUTED: 'warning',
}

export function ReaderOrdersPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')

  const qs = statusFilter ? `status=${statusFilter}&limit=20` : 'limit=20'
  const { data, isLoading } = useSWR(
    `/orders?${qs}`,
    () => api.get<OrdersListResponse>(`/orders?${qs}`),
  )

  const orders = data?.data ?? []

  return (
    <div className="animate-fade-in">
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 pt-4 pb-3">
        <h1 className="font-display text-2xl font-bold mb-3">Pedidos Recebidos</h1>
        <div className="flex gap-2">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === tab.value
                  ? 'bg-primary/20 border border-primary/40 text-primary'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <SkeletonList count={4} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum pedido"
            description="Os pedidos dos seus clientes aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <button
                key={order.id}
                onClick={() => navigate(`/leitora/pedidos/${order.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.98] text-left"
              >
                <Avatar
                  src={(order.client as any)?.avatar_url}
                  name={(order.client as any)?.full_name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {(order.gigs as any)?.title ?? 'Serviço'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(order.client as any)?.full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={STATUS_BADGE[order.status] ?? 'muted'}>
                      {ORDER_STATUS_MAP[order.status]?.label ?? order.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gold">{formatCurrency(order.amount_reader_net)}</p>
                  <ChevronRight size={16} className="text-muted-foreground ml-auto mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
