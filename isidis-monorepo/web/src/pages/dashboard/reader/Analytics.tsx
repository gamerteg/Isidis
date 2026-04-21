import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import {
    Star, CheckCircle, TrendingUp, Sparkles, Tag,
    Calendar, Download, MoreVertical, Eye, MousePointer2, ShoppingCart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { useAuth } from '@/hooks/useAuth'

export default function AnalyticsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [allEvents, setAllEvents] = useState<any[]>([])
    const [allReviews, setAllReviews] = useState<any[]>([])
    const [gigDetails, setGigDetails] = useState<Record<string, { title: string; image_url: string | null }>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/analytics'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, ordersResult, eventsResult] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties').eq('id', user.id).single(),
                supabase.from('orders')
                    .select('id, status, amount_total, amount_reader_net, created_at, gig_id, client_id')
                    .eq('reader_id', user.id).order('created_at', { ascending: false }),
                supabase.from('analytics_events').select('*').eq('reader_id', user.id),
            ])

            setProfile(profileResult.data)
            const orders = ordersResult.data || []
            setAllOrders(orders)
            setAllEvents(eventsResult.data || [])

            const completedOrders = orders.filter((o: any) => ['DELIVERED', 'COMPLETED'].includes(o.status))
            const completedOrderIds = completedOrders.map((o: any) => o.id)

            if (completedOrderIds.length > 0) {
                const { data: reviews } = await supabase.from('reviews').select('rating, gig_id').in('order_id', completedOrderIds)
                setAllReviews(reviews || [])
            }

            const gigIds = [...new Set(orders.map((o: any) => o.gig_id))]
            if (gigIds.length > 0) {
                const { data: gigs } = await supabase.from('gigs').select('id, title, image_url').in('id', gigIds)
                if (gigs) {
                    const details: Record<string, any> = {}
                    gigs.forEach((g: any) => { details[g.id] = { title: g.title, image_url: g.image_url } })
                    setGigDetails(details)
                }
            }

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando analytics...</p></div>
    if (!user) return null

    const completedOrders = allOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status))
    const paidOrders = allOrders.filter(o => o.status !== 'PENDING_PAYMENT' && o.status !== 'CANCELED')

    const impressions = allEvents.filter(e => e.event_type === 'impression').length
    const views = allEvents.filter(e => e.event_type === 'view').length
    const clickBuy = allEvents.filter(e => e.event_type === 'click_buy').length

    const avgRating = allReviews.length > 0
        ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(2)
        : '—'

    const completionRate = paidOrders.length > 0
        ? ((completedOrders.length / paidOrders.length) * 100).toFixed(1)
        : '0.0'

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentOrders = completedOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo)
    const recentEarnings = recentOrders.reduce((sum, o) => sum + o.amount_reader_net, 0)

    const gigStats: Record<string, { orders: number; revenue: number; impressions: number; views: number }> = {}
    completedOrders.forEach(o => {
        if (!gigStats[o.gig_id]) gigStats[o.gig_id] = { orders: 0, revenue: 0, impressions: 0, views: 0 }
        gigStats[o.gig_id].orders++
        gigStats[o.gig_id].revenue += o.amount_reader_net
    })
    allEvents.forEach(e => {
        if (!gigStats[e.gig_id]) gigStats[e.gig_id] = { orders: 0, revenue: 0, impressions: 0, views: 0 }
        if (e.event_type === 'impression') gigStats[e.gig_id].impressions++
        if (e.event_type === 'view') gigStats[e.gig_id].views++
    })

    const topGigs = Object.entries(gigStats).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 4)

    const weeklyData: number[] = []
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
        const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        const weekEarnings = completedOrders
            .filter(o => new Date(o.created_at) >= weekStart && new Date(o.created_at) < weekEnd)
            .reduce((sum, o) => sum + o.amount_reader_net, 0)
        weeklyData.push(weekEarnings)
    }
    const maxWeekly = Math.max(...weeklyData, 1)

    const clientIds = allOrders.map(o => o.client_id)
    const uniqueClients = [...new Set(clientIds)]
    const returningClients = uniqueClients.filter(c => clientIds.filter(id => id === c).length > 1)
    const retentionRate = uniqueClients.length > 0
        ? Math.round((returningClients.length / uniqueClients.length) * 100)
        : 0

    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

    const ratingStars = [5, 4, 3, 2, 1]
    const ratingDist = ratingStars.map(s => allReviews.filter(r => Math.round(r.rating) === s).length)

    const gigOrderCounts: Record<string, { title: string; count: number }> = {}
    completedOrders.forEach(o => {
        if (!gigOrderCounts[o.gig_id]) gigOrderCounts[o.gig_id] = { title: gigDetails[o.gig_id]?.title || 'Serviço', count: 0 }
        gigOrderCounts[o.gig_id].count++
    })
    const totalCompletedCount = completedOrders.length || 1
    const categoryColors = ['bg-green-500', 'bg-amber-500', 'bg-indigo-500', 'bg-yellow-400']
    const categoriesDisplay = Object.entries(gigOrderCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 4)
        .map(([, data], i) => ({
            name: data.title,
            pct: Math.round((data.count / totalCompletedCount) * 100),
            color: categoryColors[i] || 'bg-slate-500',
        }))

    const gigColors = ['bg-indigo-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500']

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8">
                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 mb-2 pl-1">
                        <span className="text-purple-400 font-bold">Isidis</span>
                        <span>›</span>
                        <span className="text-green-400 font-bold">Analytics</span>
                    </div>

                    <PageSection padding="none" withOrbs className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                Insights de Performance
                                <Sparkles className="w-6 h-6 text-amber-400" />
                            </h1>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 hover:text-white hover:border-indigo-500/30 transition-all backdrop-blur-sm">
                                    <Calendar className="w-4 h-4" />
                                    Últimos 30 Dias
                                </button>
                                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl gap-2 h-10 px-5 shadow-lg shadow-primary/20">
                                    <Download className="w-4 h-4" />
                                    Exportar Relatório
                                </Button>
                            </div>
                        </div>
                    </PageSection>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item hover:border-indigo-500/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                                    <Eye className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Impressões</p>
                            <p className="text-3xl font-black text-white mb-3">{impressions || '0'}</p>
                            <p className="text-[10px] text-slate-500">Visualizações no marketplace</p>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item hover:border-purple-500/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                                    <MousePointer2 className="w-5 h-5 text-purple-400" />
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Cliques no Perfil</p>
                            <p className="text-3xl font-black text-white mb-3">{views || '0'}</p>
                            <p className="text-[10px] text-slate-500">
                                CTR: {impressions > 0 ? ((views / impressions) * 100).toFixed(1) : '0.0'}%
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item hover:border-amber-500/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Intenção de Compra</p>
                            <p className="text-3xl font-black text-white mb-3">{clickBuy || '0'}</p>
                            <p className="text-[10px] text-slate-500">
                                Conversão: {views > 0 ? ((clickBuy / views) * 100).toFixed(1) : '0.0'}%
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item hover:border-green-500/20 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-all">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Vendas Totais</p>
                            <p className="text-3xl font-black text-white mb-3">{paidOrders.length}</p>
                            <p className="text-[10px] text-slate-500">Pedidos pagos</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                </div>
                                <span className="text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full">
                                    {allReviews.length} avaliações
                                </span>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Avaliação Média</p>
                            <p className="text-3xl font-black text-white mb-3">{avgRating}</p>
                            <div className="flex items-center gap-1">
                                {ratingDist.map((count, i) => (
                                    <div key={i} className={`h-2 rounded-full flex-1 ${i === 0 ? 'bg-green-500' : i === 1 ? 'bg-green-400' : i === 2 ? 'bg-amber-400' : i === 3 ? 'bg-amber-500' : 'bg-red-400'}`}
                                        style={{ opacity: count > 0 ? 1 : 0.15 }} />
                                ))}
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <span className="text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full">Estável</span>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Taxa de Conclusão</p>
                            <p className="text-3xl font-black text-white mb-3">{completionRate}%</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(parseFloat(completionRate), 100)}%` }} />
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Taxa de Conversão Global</p>
                            <p className="text-3xl font-black text-white mb-3">
                                {impressions > 0 ? ((paidOrders.length / impressions) * 100).toFixed(2) : '0.00'}%
                            </p>
                            <p className="text-[10px] text-slate-500">Impressão até Venda</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-base font-bold text-white">Ganhos ao Longo do Tempo</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Crescimento da receita líquida nos últimos 30 dias</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-green-400">R$ {fmt(recentEarnings)}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">Últimos 30 dias</p>
                                </div>
                            </div>
                            <div className="relative h-40">
                                <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                                    <line x1="0" y1="37" x2="400" y2="37" stroke="#1e1e3f" strokeWidth="1" />
                                    <line x1="0" y1="75" x2="400" y2="75" stroke="#1e1e3f" strokeWidth="1" />
                                    <line x1="0" y1="112" x2="400" y2="112" stroke="#1e1e3f" strokeWidth="1" />
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d={`M0,${150 - (weeklyData[0] / maxWeekly) * 120} C66,${150 - (weeklyData[0] / maxWeekly) * 120 - 20} 66,${150 - (weeklyData[1] / maxWeekly) * 120} 133,${150 - (weeklyData[1] / maxWeekly) * 120} C200,${150 - (weeklyData[1] / maxWeekly) * 120 + 15} 200,${150 - (weeklyData[2] / maxWeekly) * 120} 266,${150 - (weeklyData[2] / maxWeekly) * 120} C333,${150 - (weeklyData[2] / maxWeekly) * 120 - 10} 333,${150 - (weeklyData[3] / maxWeekly) * 120} 400,${150 - (weeklyData[3] / maxWeekly) * 120} L400,150 L0,150 Z`} fill="url(#chartGradient)" />
                                    <path d={`M0,${150 - (weeklyData[0] / maxWeekly) * 120} C66,${150 - (weeklyData[0] / maxWeekly) * 120 - 20} 66,${150 - (weeklyData[1] / maxWeekly) * 120} 133,${150 - (weeklyData[1] / maxWeekly) * 120} C200,${150 - (weeklyData[1] / maxWeekly) * 120 + 15} 200,${150 - (weeklyData[2] / maxWeekly) * 120} 266,${150 - (weeklyData[2] / maxWeekly) * 120} C333,${150 - (weeklyData[2] / maxWeekly) * 120 - 10} 333,${150 - (weeklyData[3] / maxWeekly) * 120} 400,${150 - (weeklyData[3] / maxWeekly) * 120}`} fill="none" stroke="rgb(139,92,246)" strokeWidth="2.5" strokeLinecap="round" />
                                    {weeklyData.map((val, i) => (
                                        <circle key={i} cx={i * 133} cy={150 - (val / maxWeekly) * 120} r="4" fill="rgb(139,92,246)" stroke="#0a0a14" strokeWidth="2" />
                                    ))}
                                </svg>
                            </div>
                            <div className="flex justify-between mt-2 text-[10px] text-slate-600 uppercase tracking-wider">
                                <span>Semana 1</span><span>Semana 2</span><span>Semana 3</span><span>Semana 4</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-green-500/10 bg-card-item">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-base font-bold text-white">Pedidos por Categoria</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Distribuição por foco místico</p>
                                </div>
                                <button className="text-slate-600 hover:text-slate-400"><MoreVertical className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-5">
                                {categoriesDisplay.map((cat) => (
                                    <div key={cat.name}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-bold text-white">{cat.name}</span>
                                            <span className="text-sm font-bold text-green-400">{cat.pct}%</span>
                                        </div>
                                        <div className="h-2.5 bg-slate-800/50 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item">
                            <h3 className="text-base font-bold text-white mb-1">Retenção de Clientes</h3>
                            <p className="text-xs text-slate-500 mb-6">Recorrentes vs Novos Buscadores</p>
                            <div className="flex items-center justify-center mb-6">
                                <div className="relative w-44 h-44">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1e3f" strokeWidth="12" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(139,92,246)" strokeWidth="12"
                                            strokeDasharray={`${retentionRate * 2.51} ${(100 - retentionRate) * 2.51}`} strokeLinecap="round" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(245,158,11)" strokeWidth="12"
                                            strokeDasharray={`${(100 - retentionRate) * 2.51} ${retentionRate * 2.51}`}
                                            strokeDashoffset={`-${retentionRate * 2.51}`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{retentionRate}%</span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Fidelidade</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-6">
                                <span className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="w-3 h-3 rounded-full bg-purple-500" />Recorrentes ({retentionRate}%)
                                </span>
                                <span className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="w-3 h-3 rounded-full bg-amber-500" />Novos ({100 - retentionRate}%)
                                </span>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-green-500/10 bg-card-item">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-white">Gigs de Melhor Desempenho</h3>
                                <button className="text-[10px] font-bold uppercase tracking-wider text-green-400 hover:text-green-300">Ver Detalhes</button>
                            </div>
                            <div className="grid grid-cols-[1fr_60px_80px_60px] gap-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-4 px-1">
                                <span>Serviço</span><span className="text-center">Vendas</span><span className="text-right">Receita</span><span className="text-center">Conv.</span>
                            </div>
                            <div className="space-y-3">
                                {topGigs.length === 0 ? (
                                    <p className="text-xs text-slate-600 text-center py-6">Nenhum dado ainda.</p>
                                ) : (
                                    topGigs.map(([gigId, stats], i) => {
                                        const gig = gigDetails[gigId]
                                        const convRate = stats.impressions > 0 ? ((stats.orders / stats.impressions) * 100).toFixed(1) : '0.0'
                                        return (
                                            <div key={gigId} className="grid grid-cols-[1fr_60px_80px_60px] gap-3 items-center px-1 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-lg ${gigColors[i] || 'bg-indigo-500'} bg-opacity-20 flex items-center justify-center shrink-0 overflow-hidden`}>
                                                        {gig?.image_url ? (
                                                            <img src={gig.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Tag className={`w-4 h-4 ${i === 0 ? 'text-indigo-400' : i === 1 ? 'text-amber-400' : i === 2 ? 'text-purple-400' : 'text-green-400'}`} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{gig?.title || 'Serviço'}</p>
                                                        <p className="text-[10px] text-slate-600">{stats.impressions} imps • {stats.views} clics</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-bold text-white text-center">{stats.orders}</p>
                                                <p className="text-sm font-bold text-green-400 text-right">R$ {fmt(stats.revenue)}</p>
                                                <div className="flex justify-center items-center gap-1 text-[10px] font-bold text-slate-400">{convRate}%</div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </main>
        </div>
    )
}
