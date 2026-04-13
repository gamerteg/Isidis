import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listUsers, type AdminUser } from '@/services/users'
import { formatDate } from '@/lib/utils'

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'info' | 'destructive' }> = {
  CLIENT: { label: 'Cliente', variant: 'default' },
  READER: { label: 'Cartomante', variant: 'info' },
  ADMIN: { label: 'Admin', variant: 'destructive' },
}

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  APPROVED: { label: 'Aprovada', variant: 'success' },
  PENDING: { label: 'Pendente', variant: 'warning' },
  REJECTED: { label: 'Rejeitada', variant: 'destructive' },
  SUSPENDED: { label: 'Suspensa', variant: 'destructive' },
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Gerencie todos os usuários da plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CLIENT">Clientes</SelectItem>
                <SelectItem value="READER">Cartomantes</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando usuários…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(user => {
                  const role = ROLE_LABELS[user.role]
                  const status = user.verification_status ? STATUS_LABELS[user.verification_status] : null
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{user.full_name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{user.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={role.variant}>{role.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <Badge variant={status.variant}>{status.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/users/${user.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
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

      <p className="text-xs text-muted-foreground">{filtered.length} usuário(s) exibido(s)</p>
    </div>
  )
}
