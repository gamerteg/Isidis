import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getTickets } from '@/app/actions/tickets'
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LifeBuoy, Clock, MessageSquare, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/page-skeleton'

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

export default function TicketsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }
        getTickets().then((data) => { setTickets(data || []); setLoading(false) })
    }, [user, authLoading])

    if (authLoading || loading) return <PageSkeleton rows={3} />

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Suporte</h1>
                    <p className="text-muted-foreground">O que podemos ajudar hoje?</p>
                </div>
                <CreateTicketDialog />
            </div>

            {tickets.length === 0 ? (
                <Card className="border-dashed py-8">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <LifeBuoy className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Nenhum ticket aberto</h3>
                            <p className="text-muted-foreground max-w-sm">
                                Se você tiver alguma dúvida ou problema, sinta-se à vontade para abrir um novo ticket.
                            </p>
                        </div>
                        <CreateTicketDialog />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {tickets.map((ticket) => (
                        <Link key={ticket.id} to={`/dashboard/tickets/${ticket.id}`}>
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={statusMap[ticket.status]?.color}>
                                            {statusMap[ticket.status]?.label}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            #{ticket.id.substring(0, 8)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(ticket.created_at), "d 'de' MMMM, HH:mm", { locale: ptBR })}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                {ticket.subject}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Categoria: <span className="text-foreground">{categoryMap[ticket.category]}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <MessageSquare className="w-4 h-4" />
                                                Mais detalhes...
                                            </div>
                                            {(ticket.priority === 'HIGH' || ticket.priority === 'URGENT') && (
                                                <Badge variant="destructive" className="animate-pulse">
                                                    Alta Prioridade
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
