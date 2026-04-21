import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import {
    Repeat, CalendarDays, Users, Clock,
    CreditCard, MessageSquare, Sparkles, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
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

export default function SubscriptionsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [allSubs, setAllSubs] = useState<any[]>([])
    const [clientDetails, setClientDetails] = useState<Record<string, any>>({})
    const [gigDetails, setGigDetails] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/assinaturas'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, subsResult] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties').eq('id', user.id).single(),
                supabase.from('subscriptions').select('*').eq('reader_id', user.id).order('created_at', { ascending: false }),
            ])

            setProfile(profileResult.data)
            const subs = subsResult.data || []
            setAllSubs(subs)

            if (subs.length === 0) { setLoading(false); return }

            const clientIds = [...new Set(subs.map((s: any) => s.client_id))]
            const gigIds = [...new Set(subs.map((s: any) => s.gig_id).filter(Boolean))]

            const [clientsResult, gigsResult] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds),
                gigIds.length > 0 ? supabase.from('gigs').select('id, title').in('id', gigIds) : Promise.resolve({ data: [] }),
            ])

            const clients: Record<string, any> = {}
            if (clientsResult.data) clientsResult.data.forEach((c: any) => { clients[c.id] = { full_name: c.full_name || 'Cliente', avatar_url: c.avatar_url } })
            setClientDetails(clients)

            const gigs: Record<string, any> = {}
            if (gigsResult.data) gigsResult.data.forEach((g: any) => { gigs[g.id] = { title: g.title } })
            setGigDetails(gigs)

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando assinaturas...</p></div>
    if (!user) return null

    const activeSubs = allSubs.filter(s => s.status === 'ACTIVE')
    const pausedSubs = allSubs.filter(s => s.status === 'PAUSED')
    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    const monthlyRevenue = activeSubs.reduce((sum, sub) => sum + (sub.monthly_price - Math.round(sub.monthly_price * 0.15)), 0)

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
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8">
                <MainHero
                    className="pt-12 pb-12 px-4 md:px-8 mb-8"
                    padding="none"
                    maxWidth="full"
                    title="Assinaturas Recorrentes"
                    description="Gerencie seus clientes com planos mensais de tiragens periódicas."
                    withMockup={false}
                >
                    <div className="flex items-center gap-3 mt-6">
                        <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 px-4 py-2 rounded-full whitespace-nowrap">
                            {activeSubs.length} Ativa{activeSubs.length !== 1 ? 's' : ''}
                        </span>
                        {monthlyRevenue > 0 && (
                            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-4 py-2 rounded-full whitespace-nowrap">
                                Receita: R$ {fmt(monthlyRevenue)}/mês
                            </span>
                        )}
                    </div>
                </MainHero>

                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
                            <Users className="w-5 h-5 text-purple-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{activeSubs.length}</p>
                            <p className="text-xs text-slate-500">Assinantes Ativos</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
                            <CreditCard className="w-5 h-5 text-emerald-400 mb-2" />
                            <p className="text-2xl font-bold text-white">R$ {fmt(monthlyRevenue)}</p>
                            <p className="text-xs text-slate-500">Receita Mensal</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
                            <AlertCircle className="w-5 h-5 text-amber-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{pausedSubs.length}</p>
                            <p className="text-xs text-slate-500">Pausadas</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm">
                            <CalendarDays className="w-5 h-5 text-indigo-400 mb-2" />
                            <p className="text-2xl font-bold text-white">
                                {activeSubs.filter(s => new Date(s.next_reading_due) <= new Date()).length}
                            </p>
                            <p className="text-xs text-slate-500">Tiragens Pendentes</p>
                        </div>
                    </div>

                    {activeSubs.filter(s => new Date(s.next_reading_due) <= new Date()).length > 0 && (
                        <div className="mb-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-bold text-purple-300">Tiragens Pendentes</span>
                            </div>
                            <div className="space-y-3">
                                {activeSubs.filter(s => new Date(s.next_reading_due) <= new Date()).map(sub => {
                                    const client = clientDetails[sub.client_id]
                                    const gig = sub.gig_id ? gigDetails[sub.gig_id] : null
                                    return (
                                        <div key={sub.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                <Repeat className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{client?.full_name || 'Cliente'}</p>
                                                <p className="text-xs text-slate-500 truncate">{gig?.title || 'Assinatura'} • {getFrequencyLabel(sub.readings_per_month)}</p>
                                            </div>
                                            <Link to={`/dashboard/cartomante/mensagens?clientId=${sub.client_id}`}>
                                                <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-8 px-4">
                                                    Fazer Tiragem
                                                </Button>
                                            </Link>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <h3 className="text-lg font-bold text-white mb-4">Todas as Assinaturas</h3>
                    <div className="space-y-4">
                        {allSubs.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-white/5 bg-white/5 p-16 text-center backdrop-blur-md">
                                <Repeat className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-sm text-slate-400 font-bold">Nenhuma assinatura encontrada</p>
                                <p className="text-xs text-slate-600 mt-1">Crie um gig recorrente para começar a receber assinantes!</p>
                            </div>
                        ) : (
                            allSubs.map(sub => {
                                const client = clientDetails[sub.client_id]
                                const gig = sub.gig_id ? gigDetails[sub.gig_id] : null
                                const nextDue = getDaysUntil(sub.next_reading_due)
                                const clientInitials = (client?.full_name || 'C').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

                                return (
                                    <div key={sub.id} className="rounded-[1.5rem] border border-white/5 bg-card-item hover:border-purple-500/20 hover:bg-white/5 transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-5">
                                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                            {client?.avatar_url ? (
                                                <img src={client.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-purple-400">{clientInitials}</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${statusColors[sub.status]}`}>
                                                    {statusLabels[sub.status]}
                                                </span>
                                                <span className="text-[10px] text-slate-600">
                                                    {getFrequencyLabel(sub.readings_per_month)} • {sub.readings_done_this_period}/{sub.readings_per_month} tiragens
                                                </span>
                                            </div>
                                            <h3 className="text-base font-bold text-white truncate mb-1">{client?.full_name || 'Cliente'}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" />{gig?.title || 'Serviço'}</span>
                                                <span className="flex items-center gap-1.5"><CreditCard className="w-3 h-3" />R$ {fmt(sub.monthly_price)}/mês</span>
                                                {sub.status === 'ACTIVE' && (
                                                    <span className={`flex items-center gap-1.5 ${nextDue.urgent ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
                                                        <Clock className="w-3 h-3" />Próxima: {nextDue.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                            <Link to={`/dashboard/cartomante/mensagens?clientId=${sub.client_id}`}>
                                                <button className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            </Link>
                                            {sub.status === 'ACTIVE' && new Date(sub.next_reading_due) <= new Date() && (
                                                <Link to={`/dashboard/cartomante/mensagens?clientId=${sub.client_id}`}>
                                                    <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-9 px-4">
                                                        <Repeat className="w-3.5 h-3.5 mr-1" />Fazer Tiragem
                                                    </Button>
                                                </Link>
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
