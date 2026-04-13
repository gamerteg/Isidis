import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getOrderDetail, cancelOrder, resolveDispute, ORDER_STATUS_MAP, type AdminOrder } from '@/services/orders'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'resolve' | null>(null)

  useEffect(() => {
    if (!id) return
    getOrderDetail(id).then(setOrder).finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await cancelOrder(id)
      toast.success('Pedido cancelado.')
      setOrder(o => o ? { ...o, status: 'CANCELED' } : o)
    } catch {
      toast.error('Erro ao cancelar.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleResolveDispute = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await resolveDispute(id)
      toast.success('Disputa encerrada.')
      setOrder(o => o ? { ...o, has_dispute: false } : o)
    } catch {
      toast.error('Erro ao encerrar disputa.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>
  if (!order) return <div className="p-8 text-muted-foreground">Pedido não encontrado.</div>

  const statusInfo = ORDER_STATUS_MAP[order.status] ?? { label: order.status, variant: 'outline' as const }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/orders"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pedido #{order.id.slice(0, 8)}…</h1>
            <p className="text-sm text-muted-foreground">{order.gig_title}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {order.has_dispute && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Disputa
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {order.has_dispute && (
            <Button
              variant="success"
              size="sm"
              onClick={() => setConfirmAction('resolve')}
              disabled={processing}
            >
              <CheckCircle2 className="w-4 h-4" />
              Encerrar Disputa
            </Button>
          )}
          {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAction('cancel')}
              disabled={processing}
            >
              <X className="w-4 h-4" />
              Cancelar Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Cliente</CardTitle></CardHeader>
          <CardContent>
            <Link to={`/users/${order.client_id}`} className="font-medium hover:text-primary transition-colors">
              {order.client_name}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Cartomante</CardTitle></CardHeader>
          <CardContent>
            <Link to={`/users/${order.reader_id}`} className="font-medium text-violet-300 hover:text-violet-200 transition-colors">
              {order.reader_name}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Financial breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Detalhamento Financeiro</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Total (cliente pagou)</span>
            <span className="font-bold text-foreground">{formatCurrency(order.amount_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa da Plataforma (15%)</span>
            <span className="text-green-400 font-semibold">{formatCurrency(order.amount_platform_fee)}</span>
          </div>
          {order.amount_card_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa Cartão</span>
              <span className="text-orange-400">{formatCurrency(order.amount_card_fee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border/50 pt-3">
            <span className="text-muted-foreground">Repasse à Cartomante</span>
            <span className="text-amber-400 font-bold">{formatCurrency(order.amount_reader_net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de Pagamento</span>
            <Badge variant={order.payment_method === 'CARD' ? 'default' : 'info'}>{order.payment_method}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span>{formatDateTime(order.created_at)}</span>
          </div>
          {order.delivered_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregue em</span>
              <span>{formatDateTime(order.delivered_at)}</span>
            </div>
          )}
          {order.disputed_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-red-400">Disputa aberta em</span>
              <span className="text-red-400">{formatDateTime(order.disputed_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment gateway refs */}
      {(order.stripe_payment_intent_id || order.asaas_payment_id) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Referências de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.stripe_payment_intent_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stripe Payment Intent</span>
                <code className="text-xs bg-muted/50 px-2 py-1 rounded">{order.stripe_payment_intent_id}</code>
              </div>
            )}
            {order.asaas_payment_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">AbacatePay ID</span>
                <code className="text-xs bg-muted/50 px-2 py-1 rounded">{order.asaas_payment_id}</code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm dialogs */}
      <Dialog open={confirmAction === 'cancel'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancelar Pedido?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O pedido será marcado como CANCELED e as transações como FAILED. Se já foi pago via PIX/Cartão, o estorno deve ser feito manualmente na AbacatePay/Stripe.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>Confirmar Cancelamento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === 'resolve'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Encerrar Disputa?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            O campo has_dispute será definido como false e ambas as partes serão notificadas.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="success" onClick={handleResolveDispute} disabled={processing}>Encerrar Disputa</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
