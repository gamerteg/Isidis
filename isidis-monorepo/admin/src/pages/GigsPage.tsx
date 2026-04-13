import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listAllGigs, approveGig, rejectGig, formatDeliveryMethod, formatModality, type PendingGig } from '@/services/gigs'
import { formatCurrency, formatDate } from '@/lib/utils'

export function GigsPage() {
  const [gigs, setGigs] = useState<PendingGig[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = (status: string) => {
    setLoading(true)
    listAllGigs(status === 'all' ? undefined : status)
      .then(setGigs)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    try {
      await approveGig(id)
      toast.success('Gig aprovada!')
      setGigs(g => g.filter(x => x.id !== id))
    } catch {
      toast.error('Erro ao aprovar.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    try {
      await rejectGig(id)
      toast.success('Gig rejeitada.')
      setGigs(g => g.filter(x => x.id !== id))
    } catch {
      toast.error('Erro ao rejeitar.')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gigs & Serviços</h1>
          <p className="text-muted-foreground">Aprove ou rejeite os serviços das cartomantes</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="APPROVED">Aprovadas</SelectItem>
            <SelectItem value="REJECTED">Rejeitadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!loading && gigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Sparkles className="w-12 h-12 text-violet-400 mb-4" />
            <p className="text-muted-foreground">Nenhum gig com status "{statusFilter}".</p>
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
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Gig</TableHead>
                    <TableHead>Cartomante</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    {statusFilter === 'PENDING' && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gigs.map(g => (
                    <React.Fragment key={g.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                        <TableCell>
                          {expanded === g.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {g.image_url && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                                <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="font-medium text-sm">{g.title}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.owner_name}</TableCell>
                        <TableCell className="font-medium text-sm">{formatCurrency(g.price)}</TableCell>
                        <TableCell className="text-sm">{g.modality ? formatModality(g.modality) : '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.delivery_method ? formatDeliveryMethod(g.delivery_method) : '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(g.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={g.status === 'APPROVED' ? 'success' : g.status === 'REJECTED' ? 'destructive' : 'warning'}>
                            {g.status}
                          </Badge>
                        </TableCell>
                        {statusFilter === 'PENDING' && (
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={processing === g.id}
                                onClick={() => handleReject(g.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="success"
                                disabled={processing === g.id}
                                onClick={() => handleApprove(g.id)}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded === g.id && (
                        <TableRow>
                          <TableCell colSpan={statusFilter === 'PENDING' ? 9 : 8} className="bg-muted/20">
                            <div className="py-3 px-2 space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</p>
                              <p className="text-sm text-foreground">{g.description ?? '—'}</p>
                              {g.delivery_time_hours && (
                                <p className="text-xs text-muted-foreground">Prazo de entrega: {g.delivery_time_hours}h</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
