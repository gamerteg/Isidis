import { useNavigate } from 'react-router-dom'
import { TrendingUp, Package, Star, DollarSign, Clock, ArrowRight, Bell } from 'lucide-react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { api, type ReaderDashboard } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export function ReaderDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data, isLoading } = useSWR(
    '/readers/me/dashboard',
    () => api.get<ReaderDashboard>('/readers/me/dashboard'),
  )

  const metrics = data?.data?.metrics

  const StatCard = ({ icon: Icon, label, value, sub, color = 'text-primary' }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Icon size={18} className={color} />
        </div>
        <p className="text-xl font-bold">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.full_name} size="md" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Olá, {profile?.full_name?.split(' ')[0]} 🌙</p>
            <h1 className="font-display text-xl font-bold">Seu painel</h1>
          </div>
          {metrics && metrics.unread_paid_orders > 0 && (
            <div className="relative">
              <Bell size={22} className="text-primary" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                {metrics.unread_paid_orders}
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : metrics ? (
        <div className="px-5 space-y-5 pb-8">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={DollarSign}
              label="Vendas líquidas (30d)"
              value={formatCurrency(metrics.net_last_30_days)}
              sub={`Bruto: ${formatCurrency(metrics.sales_last_30_days)}`}
              color="text-gold"
            />
            <StatCard
              icon={Package}
              label="Pedidos pagos"
              value={metrics.paid_orders}
              sub={`${metrics.pending_payment_orders} aguardando`}
              color="text-blue-400"
            />
            <StatCard
              icon={Star}
              label="Serviços ativos"
              value={metrics.active_gigs}
              sub={`${metrics.gigs_in_review} em revisão`}
              color="text-yellow-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Entregas feitas"
              value={metrics.delivered_orders}
              sub={metrics.average_ticket_last_30_days > 0
                ? `Ticket médio: ${formatCurrency(metrics.average_ticket_last_30_days)}`
                : undefined}
              color="text-green-400"
            />
          </div>

          {/* Payment breakdown */}
          {(metrics.pix_orders_last_30_days > 0 || metrics.card_orders_last_30_days > 0) && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Pedidos recebidos nos últimos 30 dias</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">🟢 PIX</span>
                    <span className="font-medium">{metrics.pix_orders_last_30_days} pedidos</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400">💳 Cartão</span>
                    <span className="font-medium">{metrics.card_orders_last_30_days} pedidos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <div className="space-y-2">
            <button
              onClick={() => navigate('/leitora/pedidos?status=PAID')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-orange-400" />
                <div className="text-left">
                  <p className="text-sm font-medium">Pedidos pendentes</p>
                  <p className="text-xs text-muted-foreground">{metrics.paid_orders} aguardando entrega</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/leitora/gigs/novo')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Star size={18} className="text-primary" />
                <p className="text-sm font-medium text-primary">Criar novo serviço</p>
              </div>
              <ArrowRight size={16} className="text-primary" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-16 text-center text-muted-foreground text-sm">
          Não foi possível carregar o painel. Tente novamente.
        </div>
      )}
    </div>
  )
}
