import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const statusMap: Record<string, { label: string, color: string }> = {
    'OPEN': { label: 'Aberto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    'CLOSED': { label: 'Fechado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

const priorityMap: Record<string, { label: string, color: string }> = {
    'LOW': { label: 'Baixa', color: 'text-gray-400' },
    'MEDIUM': { label: 'Média', color: 'text-blue-400' },
    'HIGH': { label: 'Alta', color: 'text-orange-400' },
    'URGENT': { label: 'Urgente', color: 'text-red-500 font-bold' },
}

export default function AdminTicketsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
            if (data?.role !== 'ADMIN') { navigate('/'); return }

            supabase
                .from('tickets')
                .select('*, user:profiles!user_id(full_name)')
                .order('created_at', { ascending: false })
                .then(({ data: ticketData, error: ticketError }) => {
                    if (ticketError) {
                        console.error('Error fetching admin tickets:', ticketError)
                        setError(ticketError.message)
                    } else {
                        setTickets(ticketData || [])
                    }
                    setLoading(false)
                })
        })
    }, [user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando tickets...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tickets de Suporte</h2>
                    <p className="text-muted-foreground">
                        Gerencie as solicitações de suporte dos usuários e cartomantes.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">Erro ao carregar tickets</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Todos os Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID / Assunto</TableHead>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Prioridade</TableHead>
                                <TableHead>Criado em</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{ticket.subject}</span>
                                            <span className="text-xs text-muted-foreground">#{ticket.id.substring(0, 8)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{ticket.user?.full_name || 'Usuário'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{ticket.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={statusMap[ticket.status]?.color}>
                                            {statusMap[ticket.status]?.label || ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className={priorityMap[ticket.priority]?.color}>
                                            {priorityMap[ticket.priority]?.label || ticket.priority}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link to={`/admin/tickets/${ticket.id}`}>
                                            <Badge className="cursor-pointer hover:bg-primary/80">Atender</Badge>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tickets.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        Nenhum ticket encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
