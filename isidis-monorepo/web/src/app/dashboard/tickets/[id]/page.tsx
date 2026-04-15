import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTicketWithMessages } from '@/app/actions/tickets'
import { TicketChat } from '@/components/tickets/ticket-chat'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, Clock, Info, LifeBuoy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const statusMap: Record<string, { label: string, color: string }> = {
    'OPEN': { label: 'Aberto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    'CLOSED': { label: 'Fechado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

const categoryMap: Record<string, string> = {
    'REEMBOLSO': 'Reembolso',
    'SAQUE': 'Saque',
    'MUDANCA_PIX': 'Mudança de Pix',
    'DUVIDA': 'Dúvida',
    'OUTRO': 'Outro',
}

export default function TicketDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [ticket, setTicket] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }
        if (!id) return
        getTicketWithMessages(id).then((data) => { setTicket(data); setLoading(false) })
    }, [id, user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando...</p></div>
    if (!ticket || !user) return null

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard/tickets" className="p-2 rounded-full hover:bg-muted transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {ticket.subject}
                        <Badge variant="outline" className={statusMap[ticket.status]?.color}>
                            {statusMap[ticket.status]?.label}
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Ticket #{ticket.id.substring(0, 8)} • {categoryMap[ticket.category]}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TicketChat
                        ticketId={ticket.id}
                        initialMessages={ticket.messages}
                        currentUserId={user.id}
                    />
                </div>

                <div className="space-y-6">
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Info className="w-4 h-4 text-primary" />
                                Detalhes do Ticket
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Solicitado em</p>
                                <p className="text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    {format(new Date(ticket.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Status</p>
                                <Badge variant="outline" className={statusMap[ticket.status]?.color}>
                                    {statusMap[ticket.status]?.label}
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Prioridade</p>
                                <p className="text-sm">
                                    {ticket.priority === 'LOW' && 'Baixa'}
                                    {ticket.priority === 'MEDIUM' && 'Média'}
                                    {ticket.priority === 'HIGH' && 'Alta'}
                                    {ticket.priority === 'URGENT' && 'Urgente'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <LifeBuoy className="w-5 h-5 text-primary shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Precisa de ajuda urgente?</p>
                                    <p className="text-xs text-muted-foreground">
                                        Nosso tempo médio de resposta é de 4 a 24 horas úteis.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
