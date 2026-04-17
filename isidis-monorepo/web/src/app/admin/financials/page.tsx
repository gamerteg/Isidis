import { useEffect, useState } from 'react'
import { getAdminFinancials, FinancialSummary, updateWithdrawalStatus, adminCancelOrder } from '@/app/actions/admin-financials'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, ArrowUpRight, Clock, Users, ShoppingCart, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PAID: { label: 'PAGO', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
    DELIVERED: { label: 'ENTREGUE', color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' },
    COMPLETED: { label: 'CONCLUÃDO', color: 'text-green-400 border-green-500/40 bg-green-500/10' },
}

export default function AdminFinancialsPage() {
    const [data, setData] = useState<FinancialSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        try {
            const { data, error } = await getAdminFinancials()
            if (error) throw new Error(error)
            if (data) setData(data)
        } catch (err) {
            toast.error('Erro ao carregar dados financeiros')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleWithdrawalAction = async (id: string, action: 'COMPLETED' | 'FAILED') => {
        setProcessing(id)
        try {
            const result = await updateWithdrawalStatus(id, action)
            if (result.error) throw new Error(result.error)
            toast.success(action === 'COMPLETED' ? 'Saque aprovado!' : 'Saque rejeitado.')
            await load()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar aÃ§Ã£o')
        } finally {
            setProcessing(null)
        }
    }

    const handleCancelOrder = async (id: string) => {
        if (!confirm('Tem certeza que deseja cancelar este pedido? Se ele ja foi pago no PIX ou cartao, confirme tambem o reembolso no painel do Mercado Pago.')) return;

        setProcessing(id)
        try {
            const result = await adminCancelOrder(id)
            if (result.error) throw new Error(result.error)
            toast.success('Pedido cancelado com sucesso!')
            await load()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar o pedido')
        } finally {
            setProcessing(null)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando financeiro...</div>
    }

    if (!data) return null

    const platformPercent = data.totalRevenue > 0
        ? ((data.platformFee / data.totalRevenue) * 100).toFixed(1)
        : '0'

    const repassePercent = data.totalRevenue > 0
        ? ((data.totalRepasse / data.totalRevenue) * 100).toFixed(1)
        : '0'

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <p className="text-muted-foreground">VisÃ£o geral das receitas, taxas e repasses da plataforma.</p>
            </div>

            {/* KPIs â€” linha 1 */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Receita Bruta */}
                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Bruta Total</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-violet-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-400">{formatCurrency(data.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.recentOrders.length} pedido{data.recentOrders.length !== 1 ? 's' : ''} recentes considerados
                        </p>
                    </CardContent>
                </Card>

                {/* Taxa da Plataforma â€” o que fica pra empresa */}
                <Card className="bg-card-deep border-green-500/20 border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa da Plataforma ðŸ¢</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">{formatCurrency(data.platformFee)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {platformPercent}% da receita bruta â€” lucro da empresa
                        </p>
                    </CardContent>
                </Card>

                {/* Repasse Cartomantes */}
                <Card className="bg-card-deep border-amber-500/20 border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Repasse Cartomantes ðŸ”®</CardTitle>
                        <Users className="h-4 w-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">{formatCurrency(data.totalRepasse)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {repassePercent}% da receita bruta â€” total devido
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* KPIs â€” linha 2 */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Saques jÃ¡ pagos */}
                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saques Pagos</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">{formatCurrency(data.totalWithdrawn)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Repassado via PIX para cartomantes</p>
                    </CardContent>
                </Card>

                {/* Repasse pendente */}
                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Repasse Pendente</CardTitle>
                        <Clock className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(data.pendingRepasse)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Saldo disponÃ­vel nÃ£o sacado pelos cartomantes</p>
                    </CardContent>
                </Card>
            </div>

            {/* GestÃ£o de Saques Pendentes */}
            <Card className="border-amber-500/20 bg-amber-500/5 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-500">
                        <AlertCircle className="h-5 w-5" />
                        SolicitaÃ§Ãµes de Saque Pendentes
                    </CardTitle>
                    <CardDescription className="text-amber-500/60">
                        Abaixo estÃ£o os pedidos de saque. VocÃª deve fazer o **PIX manualmente** pelo seu aplicativo do banco e, apÃ³s transferir o valor, clicar no botÃ£o de concluir.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-amber-500/20 text-amber-500/70 font-bold">
                                    <th className="text-left py-3 px-2">Data</th>
                                    <th className="text-left py-3 px-2">Cartomante</th>
                                    <th className="text-left py-3 px-2">Chave PIX</th>
                                    <th className="text-right py-3 px-2">Valor</th>
                                    <th className="text-center py-3 px-2">AÃ§Ãµes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pendingWithdrawals.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-muted-foreground/50 italic">
                                            Nenhuma solicitaÃ§Ã£o pendente.
                                        </td>
                                    </tr>
                                )}
                                {data.pendingWithdrawals.map((req) => (
                                    <tr key={req.id} className="border-b border-amber-500/10 hover:bg-amber-500/5 transition-colors">
                                        <td className="py-4 px-2 text-muted-foreground">
                                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-4 px-2 font-bold text-slate-200">
                                            {req.user_name}
                                        </td>
                                        <td className="py-4 px-2">
                                            <code className="bg-background/50 px-2 py-1 rounded text-amber-200/80 text-xs">
                                                {req.pix_key}
                                            </code>
                                        </td>
                                        <td className="py-4 px-2 text-right font-black text-white text-lg">
                                            {formatCurrency(req.amount)}
                                        </td>
                                        <td className="py-4 px-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                                                    disabled={processing === req.id}
                                                    onClick={() => handleWithdrawalAction(req.id, 'COMPLETED')}
                                                >
                                                    {processing === req.id ? '...' : <Check className="w-4 h-4 mr-1" />} Pago
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                                    disabled={processing === req.id}
                                                    onClick={() => {
                                                        if (confirm('Rejeitar este saque devolverÃ¡ o saldo para a carteira do usuÃ¡rio. Continuar?')) {
                                                            handleWithdrawalAction(req.id, 'FAILED')
                                                        }
                                                    }}
                                                >
                                                    {processing === req.id ? '...' : <X className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Pedidos Recentes */}
            <Card className="bg-card-deep border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-violet-400" />
                        Pedidos Recentes â€” Detalhamento Financeiro
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-muted-foreground">
                                    <th className="text-left py-3 px-2">Data</th>
                                    <th className="text-left py-3 px-2">Cliente</th>
                                    <th className="text-left py-3 px-2">Cartomante</th>
                                    <th className="text-left py-3 px-2">ServiÃ§o</th>
                                    <th className="text-right py-3 px-2">Total</th>
                                    <th className="text-right py-3 px-2 text-green-400">Empresa</th>
                                    <th className="text-right py-3 px-2 text-amber-400">Repasse</th>
                                    <th className="text-center py-3 px-2">Status</th>
                                    <th className="text-center py-3 px-2">AÃ§Ãµes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                            Nenhuma venda encontrada ainda.
                                        </td>
                                    </tr>
                                )}
                                {data.recentOrders.map((order) => {
                                    const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'text-muted-foreground border-border/50 bg-background/50' }
                                    return (
                                        <tr
                                            key={order.id}
                                            className="border-b border-border/30 hover:bg-card/60 transition-colors"
                                        >
                                            <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                                                {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="py-3 px-2 font-medium truncate max-w-[120px]">{order.client_name}</td>
                                            <td className="py-3 px-2 text-violet-300 truncate max-w-[120px]">{order.reader_name}</td>
                                            <td className="py-3 px-2 text-muted-foreground truncate max-w-[140px]">{order.gig_title}</td>
                                            <td className="py-3 px-2 text-right font-bold text-foreground">
                                                {formatCurrency(order.amount_total)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-green-400">
                                                {formatCurrency(order.amount_platform_fee)}
                                            </td>
                                            <td className="py-3 px-2 text-right font-semibold text-amber-400">
                                                {formatCurrency(order.amount_reader_net)}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                {order.status !== 'CANCELED' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleCancelOrder(order.id)} disabled={processing === order.id} className="h-8 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                                        {processing === order.id ? '...' : <X className="w-4 h-4" />}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            {data.recentOrders.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-border/50 font-bold">
                                        <td colSpan={4} className="py-3 px-2 text-muted-foreground">Totais</td>
                                        <td className="py-3 px-2 text-right text-foreground">{formatCurrency(data.totalRevenue)}</td>
                                        <td className="py-3 px-2 text-right text-green-400">{formatCurrency(data.platformFee)}</td>
                                        <td className="py-3 px-2 text-right text-amber-400">{formatCurrency(data.totalRepasse)}</td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

