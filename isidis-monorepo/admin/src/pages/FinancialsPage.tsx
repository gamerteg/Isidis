import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, ArrowUpRight, Clock, AlertCircle, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getFinancialStats, listPendingWithdrawals, updateWithdrawalStatus, listRecentOrders,
  type FinancialStats, type PendingWithdrawal, type OrderFinancialRow
} from '@/services/financials'
import { formatCurrency, formatDate, pixKeyTypeLabel } from '@/lib/utils'

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: 'Pago', DELIVERED: 'Entregue', COMPLETED: 'ConcluÃ­do',
}

export function FinancialsPage() {
  const [stats, setStats] = useState<FinancialStats | null>(null)
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([])
  const [orders, setOrders] = useState<OrderFinancialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; action: 'COMPLETED' | 'FAILED' } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [s, w, o] = await Promise.all([
        getFinancialStats(),
        listPendingWithdrawals(),
        listRecentOrders(50),
      ])
      setStats(s)
      setWithdrawals(w)
      setOrders(o)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleWithdrawalAction = async () => {
    if (!confirmDialog) return
    const { id, action } = confirmDialog
    setConfirmDialog(null)
    setProcessing(id)
    try {
      await updateWithdrawalStatus(id, action)
      toast.success(action === 'COMPLETED' ? 'Saque marcado como concluÃ­do!' : 'Saque marcado como falhou.')
      await load()
    } catch {
      toast.error('Erro ao atualizar status do saque.')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando dados financeirosâ€¦</div>

  const totalRevenue = stats?.total_revenue ?? 0
  const platformFee = stats?.platform_fee ?? 0
  const totalRepasse = stats?.total_repasse ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">Receitas, taxas, repasses e saques da plataforma</p>
      </div>

      {/* KPI Row 1 */}
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
            <CardTitle className="text-sm text-muted-foreground">Taxa da Plataforma ðŸ¢</CardTitle>
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
            <CardTitle className="text-sm text-muted-foreground">Repasse Cartomantes ðŸ”®</CardTitle>
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

      {/* KPI Row 2 */}
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
            <p className="text-xs text-muted-foreground mt-1">Saldo nÃ£o sacado pelas cartomantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals */}
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
                  <TableHead>ObservaÃ§Ã£o</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">AÃ§Ãµes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(w.created_at)}</TableCell>
                    <TableCell className="font-medium">{w.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{pixKeyTypeLabel(w.pix_key_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-background/50 px-2 py-0.5 rounded text-amber-200/80">{w.pix_key}</code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{w.notes ?? 'â€”'}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(w.amount)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={processing === w.id}
                          onClick={() => setConfirmDialog({ id: w.id, action: 'COMPLETED' })}
                          title="Marcar como pago"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing === w.id}
                          onClick={() => setConfirmDialog({ id: w.id, action: 'FAILED' })}
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

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-400" />
            Pedidos Recentes â€” Detalhamento Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cartomante</TableHead>
                <TableHead>ServiÃ§o</TableHead>
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
              ) : orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(o.created_at)}</TableCell>
                  <TableCell className="text-sm truncate max-w-[100px]">{o.client_name}</TableCell>
                  <TableCell className="text-sm text-violet-300 truncate max-w-[100px]">{o.reader_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[130px]">{o.gig_title}</TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatCurrency(o.amount_total)}</TableCell>
                  <TableCell className="text-right text-green-400 text-sm">{formatCurrency(o.amount_platform_fee)}</TableCell>
                  <TableCell className="text-right text-amber-400 text-sm">{formatCurrency(o.amount_reader_net)}</TableCell>
                  <TableCell>
                    <Badge variant={o.payment_method === 'CARD' ? 'default' : 'info'} className="text-[10px]">{o.payment_method}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === 'COMPLETED' ? 'success' : 'info'} className="text-[10px]">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {orders.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm font-semibold py-3 px-4">Totais</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(orders.reduce((s, o) => s + o.amount_total, 0))}</TableCell>
                  <TableCell className="text-right text-green-400 font-bold">{formatCurrency(orders.reduce((s, o) => s + o.amount_platform_fee, 0))}</TableCell>
                  <TableCell className="text-right text-amber-400 font-bold">{formatCurrency(orders.reduce((s, o) => s + o.amount_reader_net, 0))}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'COMPLETED' ? 'Confirmar pagamento do saque?' : 'Marcar saque como falhou?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.action === 'COMPLETED'
              ? 'O saldo serÃ¡ debitado definitivamente da carteira da cartomante.'
              : 'O saldo voltarÃ¡ a ser disponÃ­vel para a cartomante.'}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
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

