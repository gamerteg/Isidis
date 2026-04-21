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
import { toggleGigStatus } from '@/lib/actions/reader'
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

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8">
                {/* Hero editorial */}
                <section className="px-6 md:px-10 pt-10 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="max-w-[1600px] mx-auto">
                        <div className="flex items-start justify-between gap-6 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-4 h-4" style={{ color: 'var(--violet-bright)' }} />
                                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Catálogo Místico</span>
                                </div>
                                <h1 className="font-display text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.02em] font-light">
                                    Meus <em className="italic font-normal text-gradient-aurora">Arcanos</em>
                                </h1>
                                <p className="mt-3 text-muted-foreground">{activeGigs.length} serviço(s) ativo(s) no marketplace.</p>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Link to="/dashboard/cartomante/gigs/novo">
                                    <Button className="aurora border-shine text-white font-bold text-sm rounded-xl gap-2 h-10 px-5 hover:opacity-90">
                                        <Plus className="w-4 h-4" />
                                        Criar Gig
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="px-6 md:px-10 py-6 max-w-[1600px] mx-auto w-full">
                    <div className="flex items-center gap-6 mb-8 overflow-x-auto scrollbar-hide pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <button className="text-sm font-bold pb-3 whitespace-nowrap tab-active text-white relative">
                            Ativos ({activeGigs.length})
                        </button>
                        <button className="text-sm font-medium pb-3 text-muted-foreground hover:text-foreground whitespace-nowrap">
                            Rascunhos (0)
                        </button>
                        <button className="text-sm font-medium pb-3 text-muted-foreground hover:text-foreground whitespace-nowrap">
                            Inativos ({inactiveGigs.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                        {gigs.map((gig, index) => {
                            const sales = salesCounts[gig.id] || 0
                            const review = reviewStats[gig.id]
                            const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
                            const arcaneNum = romanNumerals[index] || String(index + 1)

                            return (
                                <div
                                    key={gig.id}
                                    className="rounded-2xl border-shine overflow-hidden transition-all duration-400 group hover:-translate-y-1"
                                    style={{ background: '#110d22', transition: 'transform 0.4s cubic-bezier(.16,1,.3,1), box-shadow 0.4s' }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 50px -10px rgba(139,92,246,0.25)')}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden card-tarot-mini">
                                        {gig.image_url ? (
                                            <img
                                                src={gig.image_url}
                                                alt={gig.title}
                                                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 relative z-10"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center relative z-10">
                                                <Tag className="w-12 h-12" style={{ color: 'var(--violet-bright)', opacity: 0.4 }} />
                                            </div>
                                        )}
                                        {/* Arcane roman numeral */}
                                        <div className="absolute top-3 left-3 z-20">
                                            <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md" style={{ color: '#f5c451', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                                                {arcaneNum}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-20">
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
                                                <p className="font-mono text-xl font-semibold text-green-400">
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
                            className="rounded-2xl flex flex-col items-center justify-center py-16 transition-all group cursor-pointer min-h-[320px]"
                            style={{ border: '2px dashed rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.03)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.06)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.03)' }}
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
                        <h2 className="font-display text-2xl font-light flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5" style={{ color: '#f5c451' }} />
                            Insights de <em className="italic font-normal text-gradient-aurora">Desempenho</em>
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl border-shine" style={{ background: '#110d22' }}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Total de Pedidos</p>
                                <p className="font-mono text-2xl font-semibold text-white">{totalSales}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Em todos os gigs</p>
                            </div>
                            <div className="p-5 rounded-2xl border-shine" style={{ background: '#110d22' }}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Gigs Ativos</p>
                                <p className="font-mono text-2xl font-semibold text-white">{activeGigs.length}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">de {gigs.length} no total</p>
                            </div>
                            <div className="p-5 rounded-2xl border-shine" style={{ background: '#110d22' }}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Avaliação Média</p>
                                <p className="font-mono text-2xl font-semibold text-white">
                                    {Object.values(reviewStats).length > 0
                                        ? (Object.values(reviewStats).reduce((sum, r) => sum + r.avg, 0) / Object.values(reviewStats).length).toFixed(1)
                                        : '—'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {Object.values(reviewStats).reduce((sum, r) => sum + r.count, 0)} avaliações
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl border-shine" style={{ background: '#110d22' }}>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Receita Média / Gig</p>
                                <p className="font-mono text-2xl font-semibold text-white">
                                    {gigs.length > 0
                                        ? `R$ ${fmt(Math.round(gigs.reduce((sum, g) => sum + ((salesCounts[g.id] || 0) * g.price), 0) / gigs.length))}`
                                        : 'R$ 0,00'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-1">Ganhos líquidos</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
