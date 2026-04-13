import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listTickets, TICKET_STATUS_MAP, TICKET_PRIORITY_MAP, TICKET_CATEGORY_MAP, type Ticket } from '@/services/tickets'
import { formatDateTime } from '@/lib/utils'

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    listTickets(statusFilter === 'all' ? undefined : statusFilter)
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets de Suporte</h1>
          <p className="text-muted-foreground">Gerencie as solicitações dos usuários e cartomantes</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OPEN">Abertos</SelectItem>
            <SelectItem value="IN_PROGRESS">Em Atendimento</SelectItem>
            <SelectItem value="RESOLVED">Resolvidos</SelectItem>
            <SelectItem value="CLOSED">Fechados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <LifeBuoy className="w-12 h-12 text-primary mb-4" />
            <p className="text-muted-foreground">Nenhum ticket encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(t => {
                    const statusInfo = TICKET_STATUS_MAP[t.status]
                    const priorityInfo = TICKET_PRIORITY_MAP[t.priority]
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{t.subject}</p>
                            <p className="text-xs text-muted-foreground">#{t.id.slice(0, 8)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{t.user_name}</p>
                            <p className="text-xs text-muted-foreground">{t.user_role === 'READER' ? 'Cartomante' : 'Cliente'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {TICKET_CATEGORY_MAP[t.category] ?? t.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/tickets/${t.id}`}>Atender</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
