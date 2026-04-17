import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
    Calendar, Clock, Tag, Sparkles,
    CreditCard, Eye, MessageSquare, MoreVertical,
    Star, Zap, Package, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { SearchInput } from '@/components/ui/search-input'
import { MainHero } from '@/components/marketing/MainHero'
import { useAuth } from '@/hooks/useAuth'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cancelOrder } from '@/app/actions/orders'
import { toast } from 'sonner'

function getTimeSince(createdAt: string) {
    const diff = Date.now() - new Date(createdAt).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d atrás`
    if (hours > 0) return `${hours}h atrás`
    return 'Agora mesmo'
}

function getDueTime(createdAt: string) {
    const deadline = new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000)
    const diff = deadline.getTime() - Date.now()
    if (diff <= 0) return { text: 'Atrasado', urgent: true }
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours < 6) return { text: `Vence em ${hours}h ${mins}m`, urgent: true }
    if (hours < 24) return { text: `Vence em ${hours}h`, urgent: false }
    const days = Math.floor(hours / 24)
    return { text: `Vence em ${days} dias`, urgent: false }
}

function getStatusBadge(status: string, price: number) {
    if (status === 'PAID') {
        if (price >= 30000) return { label: 'ENTREGA PRIORITÁRIA', color: 'bg-red-500/15 text-red-400 border-red-500/25' }
        if (price >= 15000) return { label: 'LEITURA COMPLETA', color: 'bg-green-500/15 text-green-400 border-green-500/25' }
        return { label: 'LEITURA PADRÃO', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' }
    }
    if (status === 'DELIVERED') return { label: 'ENTREGUE', color: 'bg-green-500/15 text-green-400 border-green-500/25' }
    if (status === 'COMPLETED') return { label: 'CONCLUÍDO', color: 'bg-green-500/15 text-green-400 border-green-500/25' }
    if (status === 'PENDING_PAYMENT') return { label: 'PAGAMENTO PENDENTE', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' }
    if (status === 'CANCELED') return { label: 'CANCELADO', color: 'bg-red-500/15 text-red-400 border-red-500/25' }
    return { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/25' }
}

const READER_CANCEL_REASONS = [
    'Acordo com o cliente',
    'Impossibilidade de entrega no prazo',
    'Problema técnico',
    'Solicitação do cliente',
    'Outro motivo',
]

export default function OrdersPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const currentTab = searchParams.get('tab') || 'active'
    const searchQuery = searchParams.get('q')?.toLowerCase() || ''

    const [profile, setProfile] = useState<any>(null)
    const [allOrders, setAllOrders] = useState<any[]>([])
    const [gigDetails, setGigDetails] = useState<Record<string, { title: string; image_url: string | null }>>({})
    const [clientDetails, setClientDetails] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({})
    const [loading, setLoading] = useState(true)
    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null; reason: string; submitting: boolean }>({
        open: false, orderId: null, reason: '', submitting: false,
    })

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/pedidos'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, ordersResult] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties').eq('id', user.id).single(),
                supabase.from('orders')
                    .select('id, status, amount_total, amount_reader_net, created_at, gig_id, client_id, delivery_content')
                    .eq('reader_id', user.id)
                    .order('created_at', { ascending: false }),
            ])

            setProfile(profileResult.data)
            const orders = ordersResult.data || []
            setAllOrders(orders)

            if (orders.length === 0) { setLoading(false); return }

            const gigIds = [...new Set(orders.map((o: any) => o.gig_id))]
            const clientIds = [...new Set(orders.map((o: any) => o.client_id))]

            const [gigsResult, clientsResult] = await Promise.all([
                supabase.from('gigs').select('id, title, image_url').in('id', gigIds),
                supabase.from('profiles').select('id, full_name, avatar_url').in('id', clientIds),
            ])

            const gigs: Record<string, any> = {}
            if (gigsResult.data) gigsResult.data.forEach((g: any) => { gigs[g.id] = { title: g.title, image_url: g.image_url } })
            setGigDetails(gigs)

            const clients: Record<string, any> = {}
            if (clientsResult.data) clientsResult.data.forEach((c: any) => { clients[c.id] = { full_name: c.full_name || 'Cliente', avatar_url: c.avatar_url } })
            setClientDetails(clients)

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando pedidos...</p></div>
    if (!user) return null

    const activeOrders = allOrders.filter(o => o.status === 'PAID')
    const pendingOrders = allOrders.filter(o => o.status === 'PENDING_PAYMENT')
    const completedOrders = allOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED')
    const canceledOrders = allOrders.filter(o => o.status === 'CANCELED')

    let displayOrders: any[] = []
    if (currentTab === 'pending') displayOrders = pendingOrders
    else if (currentTab === 'completed') displayOrders = completedOrders
    else if (currentTab === 'canceled') displayOrders = canceledOrders
    else displayOrders = activeOrders

    if (searchQuery) {
        displayOrders = displayOrders.filter(o => {
            const clientName = clientDetails[o.client_id]?.full_name?.toLowerCase() || ''
            return clientName.includes(searchQuery) || o.id.toLowerCase().includes(searchQuery)
        })
    }

    const fmt = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

    async function handleCancelOrder() {
        if (!cancelDialog.orderId || !cancelDialog.reason) return
        setCancelDialog(prev => ({ ...prev, submitting: true }))
        try {
            await cancelOrder(cancelDialog.orderId, cancelDialog.reason)
            setAllOrders(prev => prev.map(o => o.id === cancelDialog.orderId ? { ...o, status: 'CANCELED' } : o))
            toast.success('Pedido cancelado e reembolso iniciado.')
            setCancelDialog({ open: false, orderId: null, reason: '', submitting: false })
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao cancelar o pedido.')
            setCancelDialog(prev => ({ ...prev, submitting: false }))
        }
    }

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />

            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                <MainHero
                    className="pt-12 pb-12 px-4 md:px-8 mb-8"
                    padding="none"
                    maxWidth="full"
                    title="Pedidos Profissionais"
                    description="Gerencie suas consultas místicas e entregas com agilidade."
                    withMockup={false}
                >
                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                        <SearchInput placeholder="Buscar por cliente ou ID..." />
                        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 hover:text-indigo-300 hover:border-indigo-500/30 transition-all w-full sm:w-auto backdrop-blur-sm glass">
                            <Calendar className="w-4 h-4" />
                            Período
                        </button>
                        <span className="hidden sm:inline-flex text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 px-4 py-2 rounded-full whitespace-nowrap">
                            {activeOrders.length} Ativos
                        </span>
                    </div>
                </MainHero>

                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    <div className="flex items-center gap-6 border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
                        <Link to="/dashboard/cartomante/pedidos?tab=active"
                            className={`text-sm font-bold pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'active' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Ativos ({activeOrders.length})
                        </Link>
                        <Link to="/dashboard/cartomante/pedidos?tab=pending"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'pending' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Pendentes ({pendingOrders.length})
                        </Link>
                        <Link to="/dashboard/cartomante/pedidos?tab=completed"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'completed' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Concluídos ({completedOrders.length})
                        </Link>
                        <Link to="/dashboard/cartomante/pedidos?tab=canceled"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'canceled' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Cancelados
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {displayOrders.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-white/5 bg-white/5 p-16 text-center backdrop-blur-md">
                                <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-sm text-slate-400 font-bold">Nenhum pedido encontrado</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    {searchQuery ? `Não encontramos nada para "${searchQuery}"` : 'Tudo limpo por aqui!'}
                                </p>
                            </div>
                        ) : (
                            displayOrders.map((order) => {
                                const gig = gigDetails[order.gig_id]
                                const client = clientDetails[order.client_id]
                                const badge = getStatusBadge(order.status, order.amount_total)
                                const due = getDueTime(order.created_at)
                                const clientInitials = (client?.full_name || 'C')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()

                                return (
                                    <div
                                        key={order.id}
                                        className="rounded-[1.5rem] border border-white/5 bg-card-item hover:border-indigo-500/20 hover:bg-white/5 transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-5 group"
                                    >
                                        <div className="w-full md:w-16 h-32 md:h-16 rounded-2xl overflow-hidden bg-black/40 shrink-0 relative">
                                            {gig?.image_url ? (
                                                <img src={gig.image_url} alt={gig.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Tag className="w-6 h-6 text-indigo-700" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 md:hidden">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 w-full">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-600 font-mono">
                                                        ID: #MP-{order.id.substring(0, 6).toUpperCase()}
                                                    </span>
                                                    <span className={`hidden md:inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <span className="md:hidden flex items-center gap-1 text-slate-500 text-xs font-bold">
                                                    R$ {fmt(order.amount_reader_net)}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-white truncate mb-2">
                                                {gig?.title || 'Leitura de Tarot'}
                                            </h3>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                                                <span className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-white/5 border border-white/5">
                                                    {client?.avatar_url ? (
                                                        <img src={client.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[6px] text-white font-bold">
                                                            {clientInitials}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-300 font-medium">{client?.full_name || 'Cliente'}</span>
                                                </span>

                                                {order.status === 'PAID' && (
                                                    <span className={`flex items-center gap-1.5 ${due.urgent ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {due.text}
                                                    </span>
                                                )}

                                                {order.status === 'DELIVERED' && (
                                                    <span className="flex items-center gap-1.5 text-green-400">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Entregue • Criado {getTimeSince(order.created_at)}
                                                    </span>
                                                )}

                                                <span className="hidden md:flex items-center gap-1.5 text-slate-500 font-medium ml-auto">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    R$ {fmt(order.amount_reader_net)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-white/5 md:border-0 justify-end">
                                            {order.status === 'PAID' && (
                                                <Link to={`/dashboard/cartomante/pedido/${order.id}`} className="flex-1 md:flex-none">
                                                    <Button
                                                        className={`font-bold text-xs rounded-xl gap-2 h-9 px-4 w-full md:w-auto ${order.amount_total >= 30000
                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20'
                                                            : 'bg-white/5 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
                                                            }`}
                                                    >
                                                        {order.amount_total >= 30000 ? (
                                                            <><Zap className="w-3.5 h-3.5" /> Iniciar Entrega</>
                                                        ) : (
                                                            <><Sparkles className="w-3.5 h-3.5" /> Preparar Rascunho</>
                                                        )}
                                                    </Button>
                                                </Link>
                                            )}

                                            {order.status === 'DELIVERED' && (
                                                <Link to={`/dashboard/cartomante/pedido/${order.id}`} className="flex-1 md:flex-none">
                                                    <Button className="bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-bold text-xs rounded-xl gap-2 h-9 px-4 w-full md:w-auto">
                                                        <Eye className="w-3.5 h-3.5" /> Ver Entrega
                                                    </Button>
                                                </Link>
                                            )}

                                            <Link to={`/dashboard/cartomante/mensagens?orderId=${order.id}&clientId=${order.client_id}`}>
                                                <button className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            </Link>

                                            {order.status === 'DELIVERED' ? (
                                                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-500 hover:text-amber-400 transition-all bg-amber-500/10 border border-amber-500/20">
                                                    <Star className="w-4 h-4 fill-amber-500" />
                                                </button>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#0f0e1a] border border-white/10 text-slate-200 rounded-xl shadow-xl min-w-[180px]">
                                                        {order.status === 'PAID' && (
                                                            <DropdownMenuItem
                                                                className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer gap-2"
                                                                onClick={() => setCancelDialog({ open: true, orderId: order.id, reason: '', submitting: false })}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                                Cancelar Pedido
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {displayOrders.length > 0 && (
                        <div className="flex items-center justify-between mt-8 text-xs text-slate-600">
                            <span>Exibindo {displayOrders.length} pedido(s)</span>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-600 cursor-not-allowed bg-white/5">
                                    Anterior
                                </button>
                                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all bg-white/5">
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </PageContainer>
            </main>

            <Dialog open={cancelDialog.open} onOpenChange={(open) => !cancelDialog.submitting && setCancelDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="bg-[#0f0e1a] border border-white/10 text-slate-100 rounded-[1.5rem] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400" />
                            Cancelar Pedido
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">
                            O cliente será reembolsado automaticamente. Selecione o motivo do cancelamento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Select
                            value={cancelDialog.reason}
                            onValueChange={(val) => setCancelDialog(prev => ({ ...prev, reason: val }))}
                        >
                            <SelectTrigger className="bg-white/5 border border-white/10 text-slate-200 rounded-xl h-11">
                                <SelectValue placeholder="Selecione o motivo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f0e1a] border border-white/10 text-slate-200 rounded-xl">
                                {READER_CANCEL_REASONS.map(reason => (
                                    <SelectItem key={reason} value={reason} className="focus:bg-white/10">
                                        {reason}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            className="rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            onClick={() => setCancelDialog({ open: false, orderId: null, reason: '', submitting: false })}
                            disabled={cancelDialog.submitting}
                        >
                            Voltar
                        </Button>
                        <Button
                            className="rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
                            onClick={handleCancelOrder}
                            disabled={!cancelDialog.reason || cancelDialog.submitting}
                        >
                            {cancelDialog.submitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
