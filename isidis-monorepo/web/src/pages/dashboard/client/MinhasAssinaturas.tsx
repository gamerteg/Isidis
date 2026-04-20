import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Repeat, Clock, CreditCard, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserSidebar } from '@/components/user-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { MainHero } from '@/components/marketing/MainHero'
import { useAuth } from '@/hooks/useAuth'

function getFrequencyLabel(readingsPerMonth: number) {
    if (readingsPerMonth === 4) return 'Semanal'
    if (readingsPerMonth === 2) return 'Quinzenal'
    return 'Mensal'
}

function getDaysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return { text: 'Tiragem pendente!', urgent: true }
    if (days === 1) return { text: 'Amanhã', urgent: true }
    return { text: `Em ${days} dias`, urgent: false }
}

export default function ClientSubscriptionsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [allSubs, setAllSubs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/minhas-assinaturas'); return }

        const supabase = createClient()
        supabase.from('subscriptions').select(`
            *,
            gig:gigs(title),
            reader:profiles!reader_id(full_name, avatar_url)
        `).eq('client_id', user.id).order('created_at', { ascending: false })
            .then(({ data }) => { setAllSubs(data || []); setLoading(false) })
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando assinaturas...</p></div>
    if (!user) return null

    const activeSubs = allSubs.filter(s => s.status === 'ACTIVE')
    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/25',
        PAUSED: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/25',
        EXPIRED: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
    }
    const statusLabels: Record<string, string> = {
        ACTIVE: 'ATIVA', PAUSED: 'PAUSADA', CANCELLED: 'CANCELADA', EXPIRED: 'EXPIRADA',
    }

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />

            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                <MainHero
                    className="pt-12 pb-12 px-4 md:px-8 mb-8"
                    padding="none"
                    maxWidth="full"
                    title="Minhas Assinaturas"
                    description="Gerencie seus planos de acompanhamento espiritual contínuo."
                    withMockup={false}
                >
                    <div className="flex items-center gap-3 mt-6">
                        <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 px-4 py-2 rounded-full whitespace-nowrap">
                            {activeSubs.length} Assinatura{activeSubs.length !== 1 ? 's' : ''} Ativa{activeSubs.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </MainHero>

                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    <div className="space-y-4">
                        {allSubs.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-white/5 bg-white/5 p-16 text-center backdrop-blur-md">
                                <Repeat className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-sm text-slate-400 font-bold">Nenhuma assinatura ativa</p>
                                <p className="text-xs text-slate-600 mt-1">Explore nossos serviços recorrentes para acompanhamento contínuo.</p>
                                <Link to="/cartomantes" className="inline-block mt-6">
                                    <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-10 px-6">
                                        Explorar Cartomantes
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            allSubs.map(sub => {
                                const reader = sub.reader
                                const gig = sub.gig
                                const nextDue = getDaysUntil(sub.next_reading_due)
                                const readerInitials = (reader?.full_name || 'C').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

                                return (
                                    <div key={sub.id} className="rounded-[1.5rem] border border-white/5 bg-card-item hover:border-purple-500/20 hover:bg-white/5 transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-5">
                                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                            {reader?.avatar_url ? (
                                                <img src={reader.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-purple-400">{readerInitials}</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${statusColors[sub.status]}`}>
                                                    {statusLabels[sub.status]}
                                                </span>
                                                <span className="text-[10px] text-slate-600">
                                                    {getFrequencyLabel(sub.readings_per_month)} • {sub.readings_done_this_period}/{sub.readings_per_month} tiragens realizadas
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-white truncate mb-1">{gig?.title || 'Assinatura'}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-indigo-400" />Com {reader?.full_name || 'Cartomante'}</span>
                                                <span className="flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-emerald-400" />R$ {fmt(sub.monthly_price)}/mês</span>
                                                {sub.status === 'ACTIVE' && (
                                                    <span className={`flex items-center gap-1.5 ${nextDue.urgent ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
                                                        <Clock className="w-3 h-3" />Próxima: {nextDue.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-t-0">
                                            <Link to={`/dashboard/mensagens?readerId=${sub.reader_id}`} className="w-full sm:w-auto">
                                                <Button className="w-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 h-10 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                                    <MessageSquare className="w-4 h-4" />Mensagem
                                                </Button>
                                            </Link>
                                            {sub.status === 'ACTIVE' && (
                                                <Button variant="outline" className="w-full sm:w-auto border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-10 px-4 rounded-xl flex items-center justify-center transition-colors font-bold">
                                                    Cancelar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </PageContainer>
            </main>
        </div>
    )
}
