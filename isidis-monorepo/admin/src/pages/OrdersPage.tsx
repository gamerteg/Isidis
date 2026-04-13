import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listOrders, ORDER_STATUS_MAP, type AdminOrder } from '@/services/orders'
import { formatCurrency, formatDate } from '@/lib/utils'

const PAGE_SIZE = 50

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const status = searchParams.get('status') ?? 'all'
  const dispute = searchParams.get('dispute') === 'true'
  const page = parseInt(searchParams.get('page') ?? '0')

  const load = async () => {
    setLoading(true)
    try {
      const result = await listOrders({
        status: status === 'all' ? undefined : status,
        has_dispute: dispute || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setOrders(result.data)
      setCount(result.count)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, dispute, page])

  const setFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all' || value === '') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    next.delete('page')
    setSearchParams(next)
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">Todos os pedidos da plataforma — {count} no total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={v => setFilter('status', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Aguard. Pagamento</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="DELIVERED">Entregue</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={dispute ? 'destructive' : 'outline'}
          size="default"
          onClick={() => setFilter('dispute', dispute ? null : 'true')}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {dispute ? 'Mostrando disputas' : 'Ver só disputas'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cartomante</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Disputa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : orders.map(o => {
                  const statusInfo = ORDER_STATUS_MAP[o.status] ?? { label: o.status, variant: 'outline' as const }
                  return (
                    <TableRow key={o.id} className={o.has_dispute ? 'bg-red-900/10' : ''}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(o.created_at)}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[120px]">{o.client_name}</TableCell>
                      <TableCell className="text-sm text-violet-300 truncate max-w-[120px]">{o.reader_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">{o.gig_title}</TableCell>
                      <TableCell className="font-bold text-sm">{formatCurrency(o.amount_total)}</TableCell>
                      <TableCell>
                        <Badge variant={o.payment_method === 'CARD' ? 'default' : 'info'} className="text-[10px]">
                          {o.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {o.has_dispute ? (
                          <Link to={`/orders/${o.id}`}>
                            <AlertTriangle className="w-4 h-4 text-red-400 mx-auto hover:text-red-300" />
                          </Link>
                        ) : (
                          <Link to={`/orders/${o.id}`} className="text-xs text-muted-foreground hover:text-primary">
                            Ver
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setFilter('page', String(page - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setFilter('page', String(page + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
