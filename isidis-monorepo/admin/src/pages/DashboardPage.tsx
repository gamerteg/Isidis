import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Sparkles,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SyncStatusBar } from '@/components/admin/SyncStatusBar'
import { OpsHealthCard } from '@/components/admin/OpsHealthCard'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { getDashboardOverview } from '@/services/users'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type AdminDashboardOverview } from '@/types/admin-api'

export function DashboardPage() {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const load = async (background = false) => {
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const nextOverview = await getDashboardOverview()
      setOverview(nextOverview)
      setSyncError(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dashboard'
      setSyncError(message)
      if (!background || !overview) {
        toast.error(message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useAutoRefresh(() => load(true), { enabled: Boolean(overview) })

  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-card animate-pulse border border-border" />
          ))}
        </div>
      </div>
    )
  }

  const stats = overview?.stats
  const recentOrders = overview?.recent_orders ?? []

  const pendingActions = [
    {
      label: 'Leitoras aguardando aprovacao',
      count: stats?.pendingReaders ?? 0,
      to: '/approvals',
      icon: CheckCircle2,
      color: 'text-amber-400',
    },
    {
      label: 'Gigs aguardando aprovacao',
      count: stats?.pendingGigs ?? 0,
      to: '/gigs',
      icon: Sparkles,
      color: 'text-violet-400',
    },
    {
      label: 'Disputas abertas',
      count: stats?.openDisputes ?? 0,
      to: '/orders?dispute=true',
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      label: 'Tickets de suporte abertos',
      count: stats?.openTickets ?? 0,
      to: '/tickets',
      icon: LifeBuoy,
      color: 'text-blue-400',
    },
  ]

  const totalPending = pendingActions.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visao geral da plataforma Isidis</p>
      </div>

      <SyncStatusBar
        lastUpdated={overview?.generated_at ?? null}
        error={syncError}
        refreshing={refreshing}
        onRefresh={() => {
          void load(true)
        }}
      />

      <OpsHealthCard health={overview?.health ?? null} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total de Usuarios</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.totalReaders ?? 0} cartomantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Cartomantes Ativas</CardTitle>
            <Sparkles className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedReaders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.pendingReaders ?? 0} pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.openDisputes ?? 0} em disputa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Receita da Plataforma</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(overview?.revenue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa acumulada em pedidos pagos e concluidos</p>
          </CardContent>
        </Card>
      </div>

      {totalPending > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Acoes Pendentes ({totalPending})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {pendingActions.map(({ label, count, to, icon: Icon, color }) =>
                count > 0 ? (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 p-4 rounded-xl bg-background/50 hover:bg-background/80 border border-border/50 hover:border-border transition-all group"
                  >
                    <Icon className={`w-5 h-5 ${color} shrink-0`} />
                    <div className="min-w-0">
                      <div className={`text-xl font-bold ${color}`}>{count}</div>
                      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
                    </div>
                  </Link>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="flex items-center gap-3 py-5">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Tudo em dia. Nenhuma acao pendente.</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-400" />
            Vendas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/30 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.gig_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.client_name} - {order.reader_name} • {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-green-400">{formatCurrency(order.amount_total)}</p>
                    <Badge
                      variant={
                        order.status === 'COMPLETED'
                          ? 'success'
                          : order.status === 'CANCELED'
                            ? 'destructive'
                            : 'info'
                      }
                      className="text-[10px]"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
