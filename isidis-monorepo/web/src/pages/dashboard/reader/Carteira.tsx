import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import {
    Bell, Sparkles, DollarSign, Clock, ArrowDownToLine,
    HelpCircle, FileText, ExternalLink, CheckCircle2, Loader2, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { WithdrawalModal } from '@/components/withdrawal-modal'
import { NotificationsBell } from '@/components/notifications-bell'
import { MainHero } from '@/components/marketing/MainHero'
import { getWalletBalances } from '@/lib/actions/finance'
import { useAuth } from '@/hooks/useAuth'

const PLATFORM_FEE_PERCENT = 15

export default function WalletPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [orderDetails, setOrderDetails] = useState<Record<string, any>>({})
    const [totalEarnings, setTotalEarnings] = useState(0)
    const [pendingBalance, setPendingBalance] = useState(0)
    const [availableBalance, setAvailableBalance] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        const handleWalletRefresh = () => setRefreshKey((current) => current + 1)
        window.addEventListener('wallet:refresh', handleWalletRefresh)

        return () => {
            window.removeEventListener('wallet:refresh', handleWalletRefresh)
        }
    }, [])

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/carteira'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const profileResult = await supabase.from('profiles')
                .select('full_name, avatar_url, specialties, pix_key, pix_key_type')
                .eq('id', user.id).single()
            setProfile(profileResult.data)

            const walletResult = await supabase.from('wallets').select('id').eq('user_id', user.id).single()
            if (!walletResult.data) { setLoading(false); return }

            const walletId = walletResult.data.id
            const [txnsResult, balances] = await Promise.all([
                supabase.from('transactions')
                    .select('id, amount, status, type, order_id, external_id, created_at')
                    .eq('wallet_id', walletId)
                    .order('created_at', { ascending: false }),
                getWalletBalances(walletId),
            ])

            const txns = txnsResult.data || []
            setTransactions(txns)
            setTotalEarnings(balances.totalEarnings)
            setPendingBalance(balances.pendingBalance)
            setAvailableBalance(balances.availableBalance)

            const orderIds = txns.filter((t: any) => t.order_id).map((t: any) => t.order_id!)
            if (orderIds.length > 0) {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, amount_total, amount_platform_fee, amount_reader_net, gigs(title), profiles!orders_client_id_fkey(full_name)')
                    .in('id', orderIds)

                if (orders) {
                    const details: Record<string, any> = {}
                    orders.forEach((o: any) => {
                        details[o.id] = {
                            gigTitle: o.gigs?.title || 'Leitura de Tarot',
                            clientName: o.profiles?.full_name || 'Cliente',
                            amountTotal: o.amount_total,
                            amountFee: o.amount_platform_fee,
                            amountNet: o.amount_reader_net,
                        }
                    })
                    setOrderDetails(details)
                }
            }

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading, navigate, refreshKey])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando carteira...</p></div>
    if (!user) return null

    const saleTransactions = transactions.filter(t => t.type === 'SALE_CREDIT')
    const withdrawalTransactions = transactions.filter(t => t.type === 'WITHDRAWAL')
    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8">
                {/* Hero editorial */}
                <section className="px-6 md:px-10 pt-10 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="max-w-[1600px] mx-auto">
                        <div className="flex items-start justify-between gap-6 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Bell className="w-4 h-4" style={{ color: '#f5c451' }} />
                                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Tesouraria</span>
                                </div>
                                <h1 className="font-display text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.02em] font-light">
                                    Carteira e <em className="italic font-normal text-gradient-aurora">Saques</em>
                                </h1>
                                <p className="mt-3 text-muted-foreground">Gerencie seus ganhos e saques via PIX com transparência.</p>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <NotificationsBell currentUserId={user.id} />
                            </div>
                        </div>
                    </div>
                </section>

                <div className="px-6 md:px-10 py-6 max-w-[1600px] mx-auto w-full">
                    {/* Balance cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {/* Aurora hero card */}
                        <div className="aurora border-shine rounded-2xl p-6 relative overflow-hidden md:col-span-1 shadow-lg" style={{ boxShadow: '0 20px 60px -10px rgba(91,33,182,0.3)' }}>
                            <div className="coin-orbit" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                                        <ArrowDownToLine className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Disponível</span>
                                </div>
                                <p className="text-xs text-white/60">Saldo para Saque</p>
                                <p className="font-mono text-2xl font-semibold text-white mt-1">R$ {fmt(availableBalance)}</p>
                                <WithdrawalModal
                                    availableBalance={availableBalance}
                                    pixKey={profile?.pix_key || null}
                                    pixKeyType={profile?.pix_key_type || 'CPF'}
                                >
                                    <Button className="mt-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl gap-2 w-full h-9 backdrop-blur-sm border border-white/10">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Sacar via PIX
                                    </Button>
                                </WithdrawalModal>
                            </div>
                        </div>

                        <div className="border-shine rounded-2xl p-6 relative overflow-hidden group transition-all" style={{ background: '#110d22' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,196,81,0.12)' }}>
                                    <Clock className="w-4 h-4" style={{ color: '#f5c451' }} />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Processando</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Saldo Pendente</p>
                            <p className="font-mono text-2xl font-semibold text-white mt-1">R$ {fmt(pendingBalance)}</p>
                            {pendingBalance > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-2">Libera 48h após a entrega</p>
                            )}
                        </div>

                        <div className="border-shine rounded-2xl p-6 relative overflow-hidden group transition-all" style={{ background: '#110d22' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)' }}>
                                    <DollarSign className="w-4 h-4" style={{ color: 'var(--violet-bright)' }} />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Ganhos Totais (Vitalício)</p>
                            <p className="font-mono text-2xl font-semibold text-gradient-violet mt-1">R$ {fmt(totalEarnings)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="col-span-1 lg:col-span-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h2 className="font-display text-2xl font-light flex items-center gap-2">
                                    <FileText className="w-5 h-5" style={{ color: 'var(--violet-bright)' }} />
                                    Extrato de <em className="italic font-normal text-gradient-aurora">Transações</em>
                                </h2>
                                <div className="flex items-center gap-1 bg-card-item border border-white/10 rounded-lg p-0.5 w-fit">
                                    <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md bg-indigo-500/15 text-indigo-300">Tudo</button>
                                    <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md text-slate-500 hover:text-slate-300">Ganhos</button>
                                    <button className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md text-slate-500 hover:text-slate-300">Taxas</button>
                                </div>
                            </div>

                            <div className="rounded-2xl border-shine overflow-hidden" style={{ background: '#110d22' }}>
                                <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <span className="col-span-2">Data / Serviço / Cliente</span>
                                    <span>Bruto</span>
                                    <span>Taxa ({PLATFORM_FEE_PERCENT}%)</span>
                                    <span className="text-right">Líquido</span>
                                </div>

                                {saleTransactions.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Nenhuma transação ainda.</p>
                                        <p className="text-xs text-slate-600 mt-1">Seus ganhos aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {saleTransactions.slice(0, 10).map((t) => {
                                            const detail = t.order_id ? orderDetails[t.order_id] : null
                                            const gross = detail?.amountTotal || t.amount
                                            const fee = detail?.amountFee || Math.round(gross * PLATFORM_FEE_PERCENT / 100)
                                            const net = detail?.amountNet || t.amount

                                            return (
                                                <div key={t.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-4 sm:px-6 py-4 items-start sm:items-center transition-colors shimmer-row card-row">
                                                    <div className="col-span-1 sm:col-span-2">
                                                        <div className="flex justify-between sm:block">
                                                            <p className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-none">
                                                                {detail?.gigTitle || 'Leitura'}
                                                            </p>
                                                            <span className="sm:hidden text-green-400 font-bold text-sm">R$ {fmt(net)}</span>
                                                        </div>
                                                        <p className="text-xs sm:text-[10px] text-slate-500">
                                                            {new Date(t.created_at).toLocaleDateString('pt-BR')} • {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-xs sm:text-[10px] text-slate-400 mt-0.5">
                                                            Cliente: {detail?.clientName || '—'}
                                                        </p>
                                                    </div>
                                                    <div className="hidden sm:block">
                                                        <p className="text-sm text-slate-300">R$ {fmt(gross)}</p>
                                                    </div>
                                                    <div className="hidden sm:block">
                                                        <p className="text-sm text-red-400">- R$ {fmt(fee)}</p>
                                                    </div>
                                                    <div className="hidden sm:block text-right">
                                                        <p className="text-sm font-bold text-green-400">R$ {fmt(net)}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {saleTransactions.length > 10 && (
                                    <div className="p-4 text-center border-t border-white/10">
                                        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                            Carregar mais transações
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-1 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ArrowDownToLine className="w-5 h-5 text-purple-400" />
                                    Histórico de Saques
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-card-item divide-y divide-white/5">
                                {withdrawalTransactions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <ArrowDownToLine className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                        <p className="text-xs text-slate-500">Nenhum saque realizado.</p>
                                        <p className="text-[10px] text-slate-600 mt-1">Seus saques aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    withdrawalTransactions.slice(0, 6).map((t) => {
                                        const statusMap: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
                                            COMPLETED: { label: 'SUCESSO', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
                                            PENDING: { label: 'PROCESSANDO', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Loader2 },
                                            FAILED: { label: 'FALHA', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
                                        }
                                        const info = statusMap[t.status] || statusMap.PENDING

                                        return (
                                            <div key={t.id} className="p-4 flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.status === 'COMPLETED' ? 'bg-green-500/15' :
                                                    t.status === 'FAILED' ? 'bg-red-500/15' : 'bg-amber-500/15'
                                                    }`}>
                                                    <info.icon className={`w-4 h-4 ${t.status === 'COMPLETED' ? 'text-green-400' :
                                                        t.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                                                        }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white">
                                                        R$ {fmt(Math.abs(t.amount))}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600">
                                                        {new Date(t.created_at).toLocaleDateString('pt-BR')} • PIX: ***{profile?.pix_key?.slice(-3) || '***'}
                                                    </p>
                                                </div>
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${info.color}`}>
                                                    {info.label}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}

                                <div className="p-3 text-center">
                                    <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                        Baixar Extrato (PDF)
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 p-5 rounded-2xl border border-white/10 bg-card-item">
                                <div className="flex items-center gap-2 mb-2">
                                    <HelpCircle className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-bold text-white">Ajuda</h3>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                    Dúvidas sobre taxas da plataforma ou prazos de saque? Consulte nosso guia profissional.
                                </p>
                                <Button className="w-full bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 font-bold text-xs rounded-lg gap-2 h-9 border border-indigo-500/20">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ler FAQ
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
