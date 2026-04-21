import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCategoryCounts, getBestSellingGigs } from '@/lib/data/stats'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserSidebar } from '@/components/user-sidebar'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { OnlineReaders } from '@/components/online-readers'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/apiClient'
import { createClient } from '@/lib/supabase/client'

export default function DashboardHome() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [categoryCounts, setCategoryCounts] = useState<any[]>([])
    const [recommendedGigs, setRecommendedGigs] = useState<any[]>([])
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        const handleOrdersChanged = () => setRefreshKey((current) => current + 1)
        window.addEventListener('orders:changed', handleOrdersChanged)

        return () => {
            window.removeEventListener('orders:changed', handleOrdersChanged)
        }
    }, [])

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }
        if (user.user_metadata?.role === 'READER') { navigate('/dashboard/cartomante'); return }

        const supabase = createClient()

        Promise.all([
            supabase.from('profiles').select('role').eq('id', user.id).single(),
            apiClient.get<{ data: { completed: boolean } }>('/me/quiz').catch(() => null),
            getCategoryCounts(),
            getBestSellingGigs(4),
        ]).then(([{ data: profileData }, quizResponse, categories, gigs]) => {
            if (profileData?.role === 'READER') {
                navigate('/dashboard/cartomante')
                return
            }
            if (quizResponse && !quizResponse.data.data.completed) {
                navigate('/quiz-onboarding', { replace: true })
                return
            }

            setCategoryCounts(categories)
            setRecommendedGigs(gigs)
        })
    }, [user, authLoading, navigate, refreshKey])

    if (authLoading || !user) return (
        <div className="min-h-screen p-6 space-y-6 max-w-4xl mx-auto">
            <div className="skeleton h-8 w-48 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-24 rounded-2xl" />
                ))}
            </div>
            <div className="skeleton h-64 rounded-2xl" />
        </div>
    )

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Visitante'

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />
            <RealtimeRefresher userId={user.id} />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8">
                {/* Hero editorial */}
                <section className="px-6 md:px-10 pt-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="flex justify-center mb-3">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Portal Espiritual</span>
                        </div>
                        <h1 className="font-display text-[44px] md:text-[60px] leading-[0.95] tracking-[-0.02em] font-light">
                            Olá, {firstName}. <em className="italic font-normal text-gradient-aurora">O que as cartas têm para você hoje?</em>
                        </h1>
                        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Sintonize sua energia e escolha o caminho para a sua próxima descoberta.</p>
                    </div>
                </section>

                <div className="px-4 md:px-10 py-6 md:py-10 max-w-7xl mx-auto w-full">

                    {/* 2. Necessidade Imediata */}
                    <div className="mb-16">
                        <PageHeader
                            badge="Direcionamento"
                            badgeIcon={<span>✦</span>}
                            title="Necessidade"
                            subtitle="Imediata"
                            className="mb-8"
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                            {categoryCounts.map((item, i) => (
                                <Link to={`/cartomantes?category=${encodeURIComponent(item.slug)}`} key={i} className="group relative h-[280px] md:h-[380px] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border-shine bg-card-deep transition-all hover:-translate-y-1">
                                    <img
                                        src={item.image}
                                        alt={item.category}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 p-4 md:p-8">
                                        <h3 className="text-lg md:text-2xl font-display text-white leading-tight mb-1">{item.category}</h3>
                                        <p className="text-[9px] md:text-[11px] text-purple-300 font-bold tracking-wider uppercase">{item.count} Profissionais</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* 3. Cartomantes Online */}
                    <div className="mb-16">
                        <div className="flex items-end justify-between mb-8">
                            <PageHeader
                                badge="Live"
                                badgeIcon={<span style={{ color: '#4ade80' }}>●</span>}
                                title="Online"
                                subtitle="Agora"
                                className="mb-0"
                            />
                            <Link to="/cartomantes" className="text-sm font-bold flex items-center hover:underline" style={{ color: 'var(--violet-bright)' }}>
                                Ver todas <ArrowRight className="ml-1 w-4 h-4" />
                            </Link>
                        </div>

                        <OnlineReaders />
                    </div>

                    {/* 5. Recomendados */}
                    <div className="mb-16">
                        <PageHeader
                            badge="Curadoria"
                            badgeIcon={<span>✦</span>}
                            title="Serviços"
                            subtitle="Recomendados"
                            className="mb-8"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {recommendedGigs && recommendedGigs.map((gig, i) => (
                                <Link to={`/servico/${gig.id}`} key={gig.id} className="border-shine rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group transition-all flex flex-col hover:-translate-y-1" style={{ background: '#110d22' }}>
                                    <div className="h-40 md:h-48 relative overflow-hidden">
                                        <img
                                            src={gig.image_url || 'https://images.unsplash.com/photo-1630325458098-4fc173335e21?q=80&w=800'}
                                            alt={gig.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <Badge className="bg-amber-400 text-black font-bold border-none hover:bg-amber-500 text-[9px] md:text-[10px] uppercase tracking-wider">
                                                {i === 0 ? 'Mais Vendida' : i === 1 ? 'Destaque' : '5 Estrelas'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-5 md:p-6 flex flex-col flex-1">
                                        <h3 className="text-lg md:text-xl font-display text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">{gig.title}</h3>
                                        <p className="text-xs md:text-sm text-slate-400 line-clamp-2 mb-6 flex-1">{gig.description || 'Uma leitura profunda para iluminar seus caminhos.'}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-6 h-6 rounded-full overflow-hidden">
                                                    <img
                                                        src={gig.owner?.avatar_url || 'https://github.com/shadcn.png'}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <span className="text-[10px] md:text-xs text-slate-300">{gig.owner?.full_name}</span>
                                            </div>
                                            <span className="text-base md:text-lg font-display text-white">R$ {gig.price / 100}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Space for Scroll */}
                <div className="h-24 md:h-12" />
            </main>
        </div>
    )
}
