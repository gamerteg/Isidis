import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, ArrowUpRight, Clock, AlertCircle, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SyncStatusBar } from '@/components/admin/SyncStatusBar'
import { OpsHealthCard } from '@/components/admin/OpsHealthCard'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import {
  getFinancialOverview,
  listPendingWithdrawals,
  updateWithdrawalStatus,
  type PendingWithdrawal,
} from '@/services/financials'
import { formatCurrency, formatDate, pixKeyTypeLabel } from '@/lib/utils'
import { type AdminFinancialOverview, type AdminOpsHealth } from '@/types/admin-api'

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: 'Pago',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluido',
}

export function FinancialsPage() {
  const [overview, setOverview] = useState<AdminFinancialOverview | null>(null)
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([])
  const [health, setHealth] = useState<AdminOpsHealth | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; action: 'COMPLETED' | 'FAILED' } | null>(null)

  const load = async (background = false) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [financialOverview, pendingWithdrawals] = await Promise.all([
        getFinancialOverview(),
        listPendingWithdrawals(),
      ])

      setOverview(financialOverview)
      setWithdrawals(pendingWithdrawals.data)
      setHealth(pendingWithdrawals.health ?? financialOverview.health)
      setLastUpdated(
        pendingWithdrawals.generated_at > financialOverview.generated_at
          ? pendingWithdrawals.generated_at
          : financialOverview.generated_at
      )
      setSyncError(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados financeiros'
      setSyncError(message)
      if (!background || !overview) {
        toast.error(message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useAutoRefresh(() => load(true), { enabled: Boolean(lastUpdated) })

  const handleWithdrawalAction = async () => {
    if (!confirmDialog) return

    const { id, action } = confirmDialog
    setConfirmDialog(null)
    setProcessing(id)

    try {
      await updateWithdrawalStatus(id, action)
      toast.success(action === 'COMPLETED' ? 'Saque marcado como concluido.' : 'Saque marcado como falhou.')
      await load(true)
    } catch {
      toast.error('Erro ao atualizar status do saque.')
    } finally {
      setProcessing(null)
    }
  }

  if (loading && !overview) {
    return <div className="p-8 text-muted-foreground">Carregando dados financeiros...</div>
  }

  const stats = overview?.stats
  const orders = overview?.recent_orders ?? []
  const totalRevenue = stats?.total_revenue ?? 0
  const platformFee = stats?.platform_fee ?? 0
  const totalRepasse = stats?.total_repasse ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Receitas, taxas, repasses e saques da plataforma</p>
      </div>

      <SyncStatusBar
        lastUpdated={lastUpdated}
        error={syncError}
        refreshing={refreshing}
        onRefresh={() => {
          void load(true)
        }}
      />

      <OpsHealthCard health={health} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Receita Bruta Total</CardTitle>
            <DollarSign className="w-4 h-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-violet-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{orders.length} pedidos considerados</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Taxa da Plataforma</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(platformFee)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRevenue > 0 ? ((platformFee / totalRevenue) * 100).toFixed(1) : 0}% da receita bruta
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Repasse Cartomantes</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalRepasse)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRevenue > 0 ? ((totalRepasse / totalRevenue) * 100).toFixed(1) : 0}% da receita bruta
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saques Pagos</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(stats?.total_withdrawn ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Transferido via PIX</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Repasse Pendente</CardTitle>
            <Clock className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats?.pending_repasse ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Saldo nao sacado pelas cartomantes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            Saques Pendentes ({withdrawals.length})
          </CardTitle>
          <CardDescription className="text-amber-500/60">
            Saques acompanhados pela operacao financeira da plataforma. Use os botoes para confirmar ou marcar como falhou manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum saque pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cartomante</TableHead>
                  <TableHead>Tipo PIX</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Observacao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(withdrawal.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {pixKeyTypeLabel(withdrawal.pix_key_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-background/50 px-2 py-0.5 rounded text-amber-200/80">
                        {withdrawal.pix_key}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {withdrawal.notes ?? '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(withdrawal.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={processing === withdrawal.id}
                          onClick={() => setConfirmDialog({ id: withdrawal.id, action: 'COMPLETED' })}
                          title="Marcar como pago"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing === withdrawal.id}
                          onClick={() => setConfirmDialog({ id: withdrawal.id, action: 'FAILED' })}
                          title="Marcar como falhou"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-400" />
            Pedidos Recentes - Detalhamento Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cartomante</TableHead>
                <TableHead>Servico</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right text-green-400">Plataforma</TableHead>
                <TableHead className="text-right text-amber-400">Repasse</TableHead>
                <TableHead>Pag.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    Nenhuma venda ainda.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[100px]">{order.client_name}</TableCell>
                    <TableCell className="text-sm text-violet-300 truncate max-w-[100px]">
                      {order.reader_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[130px]">
                      {order.gig_title}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {formatCurrency(order.amount_total)}
                    </TableCell>
                    <TableCell className="text-right text-green-400 text-sm">
                      {formatCurrency(order.amount_platform_fee)}
                    </TableCell>
                    <TableCell className="text-right text-amber-400 text-sm">
                      {formatCurrency(order.amount_reader_net)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.payment_method === 'CARD' ? 'default' : 'info'}
                        className="text-[10px]"
                      >
                        {order.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'COMPLETED' ? 'success' : 'info'} className="text-[10px]">
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {orders.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm font-semibold py-3 px-4">
                    Totais
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(orders.reduce((sum, order) => sum + order.amount_total, 0))}
                  </TableCell>
                  <TableCell className="text-right text-green-400 font-bold">
                    {formatCurrency(orders.reduce((sum, order) => sum + order.amount_platform_fee, 0))}
                  </TableCell>
                  <TableCell className="text-right text-amber-400 font-bold">
                    {formatCurrency(orders.reduce((sum, order) => sum + order.amount_reader_net, 0))}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'COMPLETED'
                ? 'Confirmar pagamento do saque?'
                : 'Marcar saque como falhou?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.action === 'COMPLETED'
              ? 'O saldo sera debitado definitivamente da carteira da cartomante.'
              : 'O saldo voltara a ser disponivel para a cartomante.'}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmDialog?.action === 'COMPLETED' ? 'success' : 'destructive'}
              onClick={handleWithdrawalAction}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
