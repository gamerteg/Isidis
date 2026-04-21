import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, ArrowUpRight, Clock, AlertCircle, Check, X, FileText, Printer } from 'lucide-react'
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
  getWithdrawalReceipt,
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
  const [receiptDialog, setReceiptDialog] = useState<any | null>(null)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

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
    } finally {
      setProcessing(null)
    }
  }

  const handleViewReceipt = async (id: string) => {
    setLoadingReceipt(true)
    try {
      const data = await getWithdrawalReceipt(id)
      setReceiptDialog(data)
    } catch {
      toast.error('Erro ao carregar recibo.')
    } finally {
      setLoadingReceipt(false)
    }
  }

  const handlePrint = () => {
    window.print()
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
                          variant="outline"
                          className="text-blue-400 border-blue-500/30"
                          onClick={() => handleViewReceipt(withdrawal.id)}
                          disabled={loadingReceipt}
                          title="Ver Nota"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
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
        </DialogContent>
      </Dialog>

      {/* Withdrawal Receipt Modal */}
      <Dialog open={!!receiptDialog} onOpenChange={() => setReceiptDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Nota de Repasse da Plataforma
            </DialogTitle>
          </DialogHeader>

          {receiptDialog && (
            <div className="space-y-6 pt-4 print:pt-0">
              {/* Header Print */}
              <div className="hidden print:block text-center border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold">ISIDIS</h1>
                <p className="text-sm text-muted-foreground">Comprovante de Repasse de Serviços</p>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold uppercase text-[10px] text-muted-foreground mb-1">Dados do Recebedor</h3>
                    <p className="font-semibold text-base">{receiptDialog.reader.name}</p>
                    {receiptDialog.reader.tax_id && <p>CPF/CNPJ: {receiptDialog.reader.tax_id}</p>}
                    {receiptDialog.reader.social_name && <p>Nome Social: {receiptDialog.reader.social_name}</p>}
                    <p>WhatsApp: {receiptDialog.reader.cellphone || '—'}</p>
                  </div>
                  <div>
                    <h3 className="font-bold uppercase text-[10px] text-muted-foreground mb-1">Dados de Pagamento</h3>
                    <p>Chave PIX: {receiptDialog.withdrawal.pix_key}</p>
                    <p>Tipo: {pixKeyTypeLabel(receiptDialog.withdrawal.pix_key_type)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold uppercase text-[10px] text-muted-foreground mb-1">Informações do Saque</h3>
                    <p>ID: <code className="text-xs">{receiptDialog.withdrawal.id}</code></p>
                    <p>Data Pedido: {formatDate(receiptDialog.withdrawal.created_at)}</p>
                    <p>Status: <Badge variant={receiptDialog.withdrawal.status === 'COMPLETED' ? 'success' : 'warning'}>{receiptDialog.withdrawal.status}</Badge></p>
                  </div>
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <h3 className="font-bold uppercase text-[10px] text-primary mb-1">Valor do Repasse</h3>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(receiptDialog.withdrawal.amount)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold uppercase text-[10px] text-muted-foreground mb-2">Detalhamento dos Atendimentos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-[10px]">DATA</TableHead>
                        <TableHead className="text-[10px]">CLIENTE</TableHead>
                        <TableHead className="text-[10px]">SERVIÇO</TableHead>
                        <TableHead className="text-right text-[10px]">VALOR LÍQUIDO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptDialog.service_orders.length > 0 ? (
                        receiptDialog.service_orders.map((o: any) => (
                          <TableRow key={o.id} className="text-xs">
                            <TableCell>{formatDate(o.created_at).split(' ')[0]}</TableCell>
                            <TableCell>{o.client_name}</TableCell>
                            <TableCell className="truncate max-w-[150px]">{o.gig_title}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(o.amount_reader_net)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground italic">
                            Pedidos conciliados no fechamento anterior.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground pt-4 border-t flex justify-between items-center">
                <p>Gerado em {new Date(receiptDialog.generated_at).toLocaleString('pt-BR')}</p>
                <p>Isidis Admin - Plataforma de Consultas</p>
              </div>

              <div className="flex justify-end gap-3 print:hidden">
                <Button variant="outline" onClick={() => setReceiptDialog(null)}>Fechar</Button>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir / PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
