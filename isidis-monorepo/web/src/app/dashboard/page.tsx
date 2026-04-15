import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Profile, Gig } from '@/types'
import { getCategoryCounts, getBestSellingGigs } from '@/lib/data/stats'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserSidebar } from '@/components/user-sidebar'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { OnlineReaders } from '@/components/online-readers'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/apiClient'

export default function DashboardHome() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [activeReaders, setActiveReaders] = useState<Profile[]>([])
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
            apiClient.get<{ data: { completed: boolean } }>('/me/quiz').catch(() => null),
            supabase.from('profiles').select('*').eq('role', 'READER').eq('verification_status', 'APPROVED').limit(50).returns<Profile[]>(),
            getCategoryCounts(),
            getBestSellingGigs(4),
        ]).then(([quizResponse, readersResponse, categories, gigs]) => {
            if (quizResponse && !quizResponse.data.data.completed) {
                navigate('/quiz-onboarding', { replace: true })
                return
            }

            setActiveReaders(readersResponse.data || [])
            setCategoryCounts(categories)
            setRecommendedGigs(gigs)
        })
    }, [user, authLoading, navigate, refreshKey])

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando...</p></div>

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Visitante'

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />
            <RealtimeRefresher userId={user.id} />

            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                {/* 1. Header Hero (Full Width) */}
                <PageSection padding="xl" withShootingStars={true} className="mb-0 border-b border-white/5">
                    <PageContainer>
                        <PageHeader
                            title={
                                <>
                                    Olá, {firstName}. <br />
                                    <span className="italic font-serif text-slate-300 text-2xl md:text-3xl lg:text-4xl">
                                        O que as cartas<br className="hidden sm:block" /> têm para você hoje?
                                    </span>
                                </>
                            }
                            titleClassName="text-3xl md:text-5xl lg:text-6xl leading-[1.1]"
                            description="Sintonize sua energia e escolha o caminho para a sua próxima descoberta emocional."
                            className="pt-4 md:pt-8"
                            align="center"
                        />
                    </PageContainer>
                </PageSection>

                <PageContainer className="px-3 md:px-8 py-6 md:py-12">

                    {/* 2. Necessidade Imediata */}
                    <PageSection padding="none" className="mb-16">
                        <PageHeader
                            badge="Direcionamento"
                            title="Necessidade Imediata"
                            className="mb-8"
                        />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                            {categoryCounts.map((item, i) => (
                                <Link to={`/cartomantes?category=${encodeURIComponent(item.slug)}`} key={i} className="group relative h-[280px] md:h-[380px] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 bg-card-deep hover:border-purple-500/30 transition-all hover:-translate-y-1">
                                    <img
                                        src={item.image}
                                        alt={item.category}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    <div className="absolute bottom-0 left-0 p-4 md:p-8">
                                        <h3 className="text-lg md:text-2xl font-serif text-white leading-tight mb-1">{item.category}</h3>
                                        <p className="text-[9px] md:text-[11px] text-purple-300 font-bold tracking-wider uppercase">{item.count} Profissionais</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </PageSection>

                    {/* 3. Cartomantes Online */}
                    <PageSection padding="none" className="mb-16">
                        <div className="flex items-end justify-between mb-8">
                            <PageHeader
                                badge="Live"
                                title="Online Agora"
                                className="mb-0"
                            />
                            <Link to="/cartomantes" className="text-purple-400 text-xs md:text-sm font-bold flex items-center hover:text-purple-300">
                                Ver todas <ArrowRight className="ml-1 w-4 h-4" />
                            </Link>
                        </div>

                        <OnlineReaders initialReaders={activeReaders} />
                    </PageSection>

                    {/* 5. Recomendados */}
                    <PageSection padding="none" className="mb-16">
                        <PageHeader
                            badge="Curadoria"
                            title="Recomendados"
                            className="mb-8"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {recommendedGigs && recommendedGigs.map((gig, i) => (
                                <Link to={`/servico/${gig.id}`} key={gig.id} className="bg-card-item border border-white/5 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group hover:border-purple-500/30 transition-all flex flex-col">
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
                                        <h3 className="text-lg md:text-xl font-serif text-white mb-2 leading-tight group-hover:text-purple-400 transition-colors">{gig.title}</h3>
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
                                            <span className="text-base md:text-lg font-serif text-white">R$ {gig.price / 100}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </PageSection>
                </PageContainer>

                {/* Footer Space for Scroll */}
                <div className="h-24 md:h-12" />
            </main>
        </div>
    )
}
