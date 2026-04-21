import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getOrderDetail,
  cancelOrder,
  resolveDispute,
  refundOrder,
  forcePaidOrder,
  forceOrderStatus,
  ORDER_STATUS_MAP,
  type AdminOrder,
} from '@/services/orders'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'resolve' | 'refund' | 'forcePaid' | 'forceDelivered' | 'forceCompleted' | null>(null)

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
      setOrder((current) => (current ? { ...current, status: 'CANCELED' } : current))
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
      setOrder((current) => (current ? { ...current, has_dispute: false } : current))
    } catch {
      toast.error('Erro ao encerrar disputa.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleRefund = async () => {
    if (!id) return
    setProcessing(true)
    try {
      const result = await refundOrder(id)
      if (result.success) {
        toast.success('Pedido estornado com sucesso.')
      } else {
        toast.warning(result.note)
      }
      setOrder((current) => (current ? { ...current, status: 'CANCELED' } : current))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao estornar.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleForcePaid = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await forcePaidOrder(id)
      toast.success('Pedido marcado como pago.')
      setOrder((current) => (current ? { ...current, status: 'PAID' } : current))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleForceStatus = async (status: string) => {
    if (!id) return
    setProcessing(true)
    try {
      await forceOrderStatus(id, status)
      toast.success(`Pedido alterado para ${status}.`)
      setOrder((current) => (current ? { ...current, status } : current))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status.')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>
  if (!order) return <div className="p-8 text-muted-foreground">Pedido nao encontrado.</div>

  const statusInfo = ORDER_STATUS_MAP[order.status] ?? {
    label: order.status,
    variant: 'outline' as const,
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pedido #{order.id.slice(0, 8)}...</h1>
            <p className="text-sm text-muted-foreground">{order.gig_title}</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {order.has_dispute && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
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
              <CheckCircle2 className="h-4 w-4" />
              Encerrar Disputa
            </Button>
          )}
          {order.status === 'PENDING_PAYMENT' && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-400 border-green-500/30 hover:bg-green-500/10"
              onClick={() => setConfirmAction('forcePaid')}
              disabled={processing}
            >
              Confirmar Pagto Manual
            </Button>
          )}
          {order.status === 'PAID' && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => setConfirmAction('forceDelivered')}
              disabled={processing}
            >
              Liberar Atendimento
            </Button>
          )}
          {order.status === 'DELIVERED' && (
            <Button
              variant="outline"
              size="sm"
              className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              onClick={() => setConfirmAction('forceCompleted')}
              disabled={processing}
            >
              Concluir Pedido
            </Button>
          )}
          {order.status !== 'CANCELED' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAction('cancel')}
              disabled={processing}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
          {order.status !== 'CANCELED' && (
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setConfirmAction('refund')}
              disabled={processing}
            >
              💰 Estornar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/users/${order.client_id}`} className="font-medium transition-colors hover:text-primary">
              {order.client_name}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Cartomante</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/users/${order.reader_id}`}
              className="font-medium text-violet-300 transition-colors hover:text-violet-200"
            >
              {order.reader_name}
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhamento Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor Total (cliente pagou)</span>
            <span className="font-bold text-foreground">{formatCurrency(order.amount_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa da Plataforma (15%)</span>
            <span className="font-semibold text-green-400">{formatCurrency(order.amount_platform_fee)}</span>
          </div>
          {order.amount_card_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa do Cartao</span>
              <span className="text-orange-400">{formatCurrency(order.amount_card_fee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border/50 pt-3">
            <span className="text-muted-foreground">Repasse a Cartomante</span>
            <span className="font-bold text-amber-400">{formatCurrency(order.amount_reader_net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Metodo de Pagamento</span>
            <Badge variant={order.payment_method === 'CARD' ? 'default' : 'info'}>
              {order.payment_method}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
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
              <span className="text-red-400">Disputa aberta em</span>
              <span className="text-red-400">{formatDateTime(order.disputed_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {order.mercadopago_payment_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Referencias de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mercado Pago ID</span>
              <code className="rounded bg-muted/50 px-2 py-1 text-xs">
                {order.mercadopago_payment_id}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmAction === 'cancel'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar Pedido?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O pedido sera marcado como CANCELED e as transacoes como FAILED. Se ele ja foi
            pago via PIX ou cartao, confirme tambem que o reembolso foi iniciado no Mercado
            Pago.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === 'resolve'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar Disputa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O campo has_dispute sera definido como false e ambas as partes serao notificadas.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Voltar
            </Button>
            <Button variant="success" onClick={handleResolveDispute} disabled={processing}>
              Encerrar Disputa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmAction === 'refund'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Estornar Pedido?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sera feita uma tentativa de estorno automatico via Mercado Pago. O pedido sera CANCELADO.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleRefund} disabled={processing}>Confirmar Estorno</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === 'forcePaid'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Forçar como Pago?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O status mudara para PAID e o saldo sera creditado na carteira da cartomante.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="success" onClick={handleForcePaid} disabled={processing}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === 'forceDelivered'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Liberar Atendimento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Força o status para DELIVERED, permitindo que a cartomante finalize o atendimento.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="warning" onClick={() => handleForceStatus('DELIVERED')} disabled={processing}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction === 'forceCompleted'} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Concluir Pedido?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Força o status para COMPLETED. Isso libera o saldo definitivamente para saque.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button variant="info" onClick={() => handleForceStatus('COMPLETED')} disabled={processing}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
