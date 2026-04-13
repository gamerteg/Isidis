import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Eye, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listPendingReaders, type PendingReader } from '@/services/approvals'
import { formatDate } from '@/lib/utils'

export function ApprovalsPage() {
  const [readers, setReaders] = useState<PendingReader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listPendingReaders()
      .then(setReaders)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aprovações de Onboarding</h1>
        <p className="text-muted-foreground">Analise e aprove os cadastros de novas cartomantes</p>
      </div>

      {!loading && readers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold">Tudo em dia!</h3>
            <p className="text-muted-foreground text-sm">Nenhum cadastro pendente de aprovação.</p>
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
                    <TableHead>Cartomante</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead>Termos</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readers.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 overflow-hidden">
                            {r.avatar_url ? (
                              <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (r.full_name ?? '?').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.full_name}</p>
                            {r.social_name && <p className="text-xs text-muted-foreground">"{r.social_name}"</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{r.bio ?? '—'}</p>
                      </TableCell>
                      <TableCell>
                        {r.ethics_accepted_at ? (
                          <Badge variant="success">Aceito</Badge>
                        ) : (
                          <Badge variant="destructive">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="warning">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/approvals/${r.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            Analisar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
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
