import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNavigate, Link } from 'react-router-dom'
import {
    Tag, Plus, Search, Star, Sparkles,
    ShoppingCart, Pencil, Pause, Eye, Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { toggleGigStatus } from '../actions'
import { CopyLinkIconButton } from '@/components/copy-link-button'
import { MainHero } from '@/components/marketing/MainHero'
import { useAuth } from '@/hooks/useAuth'

export default function GigsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [gigs, setGigs] = useState<any[]>([])
    const [salesCounts, setSalesCounts] = useState<Record<string, number>>({})
    const [reviewStats, setReviewStats] = useState<Record<string, { avg: number; count: number }>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/gigs'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, gigsResult] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties').eq('id', user.id).single(),
                supabase.from('gigs').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
            ])

            setProfile(profileResult.data)
            const allGigs = gigsResult.data || []
            setGigs(allGigs)

            if (allGigs.length === 0) { setLoading(false); return }

            const gigIds = allGigs.map((g: any) => g.id)

            const [ordersResult, reviewsResult] = await Promise.all([
                supabase.from('orders').select('gig_id').in('gig_id', gigIds).in('status', ['PAID', 'DELIVERED', 'COMPLETED']),
                supabase.from('reviews').select('gig_id, rating').in('gig_id', gigIds),
            ])

            const counts: Record<string, number> = {}
            if (ordersResult.data) {
                ordersResult.data.forEach((o: any) => {
                    counts[o.gig_id] = (counts[o.gig_id] || 0) + 1
                })
            }
            setSalesCounts(counts)

            const stats: Record<string, { avg: number; count: number }> = {}
            if (reviewsResult.data) {
                const grouped: Record<string, number[]> = {}
                reviewsResult.data.forEach((r: any) => {
                    if (!grouped[r.gig_id]) grouped[r.gig_id] = []
                    grouped[r.gig_id].push(r.rating)
                })
                Object.entries(grouped).forEach(([gigId, ratings]) => {
                    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
                    stats[gigId] = { avg: Math.round(avg * 10) / 10, count: ratings.length }
                })
            }
            setReviewStats(stats)
            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    const handleToggleStatus = async (gigId: string, currentStatus: boolean) => {
        setGigs(prev => prev.map(g => g.id === gigId ? { ...g, is_active: !currentStatus } : g))
        try {
            await toggleGigStatus(gigId, currentStatus)
        } catch {
            setGigs(prev => prev.map(g => g.id === gigId ? { ...g, is_active: currentStatus } : g))
        }
    }

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando gigs...</p></div>
    if (!user) return null

    const activeGigs = gigs.filter(g => g.is_active)
    const inactiveGigs = gigs.filter(g => !g.is_active)
    const totalSales = Object.values(salesCounts).reduce((a, b) => a + b, 0)
    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                <MainHero
                    className="pt-12 pb-12 px-4 md:px-8 mb-8"
                    padding="none"
                    maxWidth="full"
                    title="Meus Gigs"
                    description="Gerencie seus serviços místicos e aumente seu alcance no marketplace."
                    withMockup={false}
                >
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar serviços..."
                                className="pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 placeholder:text-slate-600 w-full focus:outline-none focus:border-indigo-500/30 backdrop-blur-sm glass"
                            />
                        </div>
                        <Link to="/dashboard/cartomante/gigs/novo" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl gap-2 h-10 px-5 shadow-lg shadow-purple-900/20">
                                <Sparkles className="w-4 h-4" />
                                Criar Novo Gig
                            </Button>
                        </Link>
                    </div>
                </MainHero>

                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    <div className="flex items-center gap-6 border-b border-indigo-500/10 mb-8 overflow-x-auto scrollbar-hide">
                        <button className="text-sm font-bold text-purple-400 pb-3 border-b-2 border-purple-500 whitespace-nowrap">
                            Gigs Ativos ({activeGigs.length})
                        </button>
                        <button className="text-sm font-medium text-slate-500 pb-3 border-b-2 border-transparent hover:text-slate-300 whitespace-nowrap">
                            Rascunhos (0)
                        </button>
                        <button className="text-sm font-medium text-slate-500 pb-3 border-b-2 border-transparent hover:text-slate-300 whitespace-nowrap">
                            Inativos ({inactiveGigs.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                        {gigs.map((gig) => {
                            const sales = salesCounts[gig.id] || 0
                            const review = reviewStats[gig.id]

                            return (
                                <div
                                    key={gig.id}
                                    className="rounded-2xl border border-white/5 bg-card-item overflow-hidden hover:border-indigo-500/25 transition-all group"
                                >
                                    <div className="relative aspect-[16/10] bg-black/40 overflow-hidden">
                                        {gig.image_url ? (
                                            <img
                                                src={gig.image_url}
                                                alt={gig.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Tag className="w-12 h-12 text-indigo-700" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                            {gig.status === 'APPROVED' ? (
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${gig.is_active
                                                    ? 'bg-green-500/90 text-white'
                                                    : 'bg-slate-600/90 text-slate-200'
                                                    }`}>
                                                    {gig.is_active ? 'ATIVO' : 'INATIVO'}
                                                </span>
                                            ) : gig.status === 'PENDING' ? (
                                                <span className="bg-yellow-500/90 text-black px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                                                    PENDENTE
                                                </span>
                                            ) : gig.status === 'REJECTED' ? (
                                                <span className="bg-red-500/90 text-white px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                                                    REJEITADO
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <h3 className="text-base font-bold text-white mb-2 line-clamp-2 leading-snug h-10">
                                            {gig.title}
                                        </h3>

                                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                <span className="font-bold text-amber-400">{review?.avg || '—'}</span>
                                                {review && <span className="text-slate-600">({review.count})</span>}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
                                                <span className="font-bold">{sales}</span>
                                                <span className="text-slate-600 uppercase text-[10px] tracking-wider">Vendas</span>
                                            </span>
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">A partir de</p>
                                                <p className="text-xl font-black text-green-400">
                                                    R$ {fmt(gig.price)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Link to={`/dashboard/cartomante/gigs/novo?edit=${gig.id}`}>
                                                    <button className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(gig.id, gig.is_active)}
                                                    className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${gig.is_active
                                                        ? 'bg-amber-500/10 border-amber-500/15 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                                                        : 'bg-green-500/10 border-green-500/15 text-green-400 hover:bg-green-500/20 hover:text-green-300'
                                                        }`}>
                                                    {gig.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                </button>
                                                <CopyLinkIconButton
                                                    url={`/servico/${gig.id}`}
                                                    className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-all"
                                                />
                                                <Link to={`/servico/${gig.id}`}>
                                                    <button className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/15 flex items-center justify-center text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        <Link to="/dashboard/cartomante/gigs/novo"
                            className="rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center py-16 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group cursor-pointer min-h-[320px]"
                        >
                            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/15 group-hover:border-purple-500/25 transition-all">
                                <Plus className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                                Criar um Novo Gig
                            </p>
                            <p className="text-xs text-slate-600 mt-1">Adicione outro serviço místico</p>
                        </Link>
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            Insights de Desempenho
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl border border-white/10 bg-card-item">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Total de Pedidos</p>
                                <p className="text-2xl font-black text-white">{totalSales}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Em todos os gigs</p>
                            </div>
                            <div className="p-5 rounded-2xl border border-white/10 bg-card-item">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Gigs Ativos</p>
                                <p className="text-2xl font-black text-white">{activeGigs.length}</p>
                                <p className="text-[10px] text-slate-500 mt-1">de {gigs.length} no total</p>
                            </div>
                            <div className="p-5 rounded-2xl border border-white/10 bg-card-item">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Avaliação Média</p>
                                <p className="text-2xl font-black text-white">
                                    {Object.values(reviewStats).length > 0
                                        ? (Object.values(reviewStats).reduce((sum, r) => sum + r.avg, 0) / Object.values(reviewStats).length).toFixed(1)
                                        : '—'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {Object.values(reviewStats).reduce((sum, r) => sum + r.count, 0)} avaliações
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl border border-white/10 bg-card-item">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Receita Média / Gig</p>
                                <p className="text-2xl font-black text-white">
                                    {gigs.length > 0
                                        ? `R$ ${fmt(Math.round(gigs.reduce((sum, g) => sum + ((salesCounts[g.id] || 0) * g.price), 0) / gigs.length))}`
                                        : 'R$ 0,00'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">Ganhos líquidos</p>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </main>
        </div>
    )
}
