import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Clock } from 'lucide-react'
import useSWR from 'swr'
import { api, type Order } from '@/lib/api'
import { formatCurrency, formatDateTime, ORDER_STATUS_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type StatusVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'gold'

const STATUS_BADGE: Record<string, StatusVariant> = {
  PENDING_PAYMENT: 'warning',
  PAID: 'info',
  DELIVERED: 'success',
  CANCELED: 'error',
  DISPUTED: 'warning',
}

export function ReaderOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useSWR(
    orderId ? `/orders/${orderId}` : null,
    () => api.get<{ data: Order }>(`/orders/${orderId}`),
  )

  const order = data?.data

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Pedido não encontrado</p></div>
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft size={20} />
          <span className="text-sm">Pedidos</span>
        </button>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Detalhes</h1>
          <Badge variant={STATUS_BADGE[order.status] ?? 'muted'}>
            {ORDER_STATUS_MAP[order.status]?.label ?? order.status}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Client info */}
        {order.client && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">Cliente</p>
              <div className="flex items-center gap-3">
                <Avatar src={(order.client as any).avatar_url} name={(order.client as any).full_name} size="md" />
                <div>
                  <p className="font-medium text-sm">{(order.client as any).full_name}</p>
                  <p className="text-xs text-muted-foreground">{(order.gigs as any)?.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span>{formatCurrency(order.amount_total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seu recebimento</span>
              <span className="font-bold text-green-400">{formatCurrency(order.amount_reader_net)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa da plataforma</span>
              <span>{formatCurrency(order.amount_platform_fee)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Pedido feito em</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        {order.requirements_answers && Object.keys(order.requirements_answers).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">Respostas do cliente</p>
              <div className="space-y-3">
                {Object.entries(order.requirements_answers).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery action */}
        {order.status === 'PAID' && !order.delivery_content && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Clock size={20} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Pendente de entrega</p>
                <p className="text-xs text-muted-foreground">O cliente aguarda sua leitura</p>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate(`/leitora/pedidos/${orderId}/entregar`)}
            >
              <Send size={16} />
              Fazer entrega
            </Button>
          </div>
        )}

        {order.status === 'DELIVERED' && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <p className="text-sm font-medium text-green-400">Leitura entregue</p>
              {order.delivered_at && (
                <p className="text-xs text-muted-foreground">{formatDateTime(order.delivered_at)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
