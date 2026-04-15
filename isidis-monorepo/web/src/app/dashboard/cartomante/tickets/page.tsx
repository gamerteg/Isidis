import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { getTickets } from '@/app/actions/tickets'
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LifeBuoy, Clock, MessageSquare, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const statusMap: Record<string, { label: string, color: string }> = {
    'OPEN': { label: 'Aberto', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    'CLOSED': { label: 'Fechado', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

const categoryMap: Record<string, string> = {
    'REEMBOLSO': 'Reembolso',
    'SAQUE': 'Saque',
    'MUDANCA_PIX': 'Mudança de Pix',
    'DUVIDA': 'Dúvida',
    'OUTRO': 'Outro',
}

export default function CartomanteTicketsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/tickets'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, ticketsData] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties').eq('id', user.id).single(),
                getTickets(),
            ])
            setProfile(profileResult.data)
            setTickets(ticketsData || [])
            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando tickets...</p></div>
    if (!user) return null

    return (
        <div className="flex h-screen bg-background-deep overflow-hidden font-sans selection:bg-purple-500/30 text-slate-200">
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="flex-1 overflow-y-auto w-full relative">
                <PageContainer className="py-8 md:py-12">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 mb-2 pl-1">
                        <span className="text-purple-400 font-bold">Isidis</span>
                        <span>›</span>
                        <span className="text-amber-400 font-bold">Suporte</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                Central de Ajuda
                                <Sparkles className="w-6 h-6 text-amber-400" />
                            </h1>
                            <p className="text-slate-400 mt-2">
                                Abra chamados para resolver questões sobre pagamentos, conta ou dúvidas gerais.
                            </p>
                        </div>
                        <CreateTicketDialog />
                    </div>

                    {tickets.length === 0 ? (
                        <PageSection variant="glass" className="py-16 text-center border-dashed border-2 border-white/5">
                            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
                                <LifeBuoy className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Nenhum ticket aberto</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mb-8">
                                Se você tiver alguma dúvida ou problema, sinta-se à vontade para abrir um novo ticket.
                            </p>
                            <CreateTicketDialog />
                        </PageSection>
                    ) : (
                        <div className="grid gap-4">
                            {tickets.map((ticket) => (
                                <Link key={ticket.id} to={`/dashboard/cartomante/tickets/${ticket.id}`} className="block group">
                                    <div className="bg-[#12121a] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all hover:shadow-[0_0_30px_-5px_theme(colors.indigo.500/0.1)] relative overflow-hidden">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={`${statusMap[ticket.status]?.color} backdrop-blur-sm`}>
                                                        {statusMap[ticket.status]?.label}
                                                    </Badge>
                                                    <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded">
                                                        #{ticket.id.substring(0, 8)}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Clock className="w-3 h-3" />
                                                        {format(new Date(ticket.created_at), "d 'de' MMMM, HH:mm", { locale: ptBR })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
                                                        {ticket.subject}
                                                    </h3>
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        Categoria: <span className="text-slate-200">{categoryMap[ticket.category]}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                                    Ver detalhes
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                {(ticket.priority === 'HIGH' || ticket.priority === 'URGENT') && (
                                                    <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Alta Prioridade
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </PageContainer>
            </main>
        </div>
    )
}
