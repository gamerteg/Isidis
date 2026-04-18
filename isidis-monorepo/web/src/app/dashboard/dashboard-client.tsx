
import { useState, useEffect } from 'react'
import {
    ShoppingBag, CreditCard,
    BookOpen, Heart, Settings, HelpCircle, LogOut, ArrowRight,
    Sparkles, Eye, Star, X
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ReviewModal } from '@/components/review-modal'
import { NotificationsBell } from '@/components/notifications-bell'
import { toggleFavoriteOrder } from '@/app/actions/orders'
import { toast } from 'sonner'
import { signout } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'
import {  useNavigate  } from 'react-router-dom'
import { UserSidebar } from '@/components/user-sidebar'

interface OrderData {
    id: string
    status: string
    amount_total: number
    created_at: string
    gigTitle: string
    readerName: string
    readerAvatar: string | null
    gigId: string
    readerId: string
    reviewRating: number | null
    isFavorite: boolean
    deliveryTimeHours: number
}

interface StatusConfig {
    label: string
    color: string
    filterLabel: string
}

interface DashboardClientProps {
    orders: OrderData[]
    userId: string
    userName: string
    userInitials: string
    totalReadings: number
    statusConfig: Record<string, StatusConfig>
}

export function DashboardClient({
    orders,
    userId,
    userName,
    userInitials,
    totalReadings,
    statusConfig,
}: DashboardClientProps) {

    const filters = [
        { key: 'all', label: 'Todas as Leituras' },
        { key: 'DELIVERED', label: 'Prontas' },
        { key: 'PAID', label: 'Em Andamento' },
        { key: 'PENDING_PAYMENT', label: 'Pendentes' },
    ]
    const [activeFilter, setActiveFilter] = useState('all')
    const [localOrders, setLocalOrders] = useState(orders)
    const [trackingOrder, setTrackingOrder] = useState<OrderData | null>(null)
    const navigate = useNavigate()
    const supabase = createClient()

    // Realtime subscription for orders
    useEffect(() => {
        const channel = supabase
            .channel('dashboard_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `client_id=eq.${userId}`
            }, (payload: any) => {
                if (!payload?.new?.id) return

                setLocalOrders((current) =>
                    current.map((order) =>
                        order.id === payload.new.id
                            ? {
                                ...order,
                                status: payload.new.status,
                                amount_total: payload.new.amount_total ?? order.amount_total,
                            }
                            : order,
                    ),
                )
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, userId])

    useEffect(() => {
        const handleReviewSubmitted = (event: Event) => {
            const customEvent = event as CustomEvent<{ orderId?: string; rating?: number }>
            const orderId = customEvent.detail?.orderId
            const rating = customEvent.detail?.rating ?? null

            if (!orderId) return

            setLocalOrders((current) =>
                current.map((order) =>
                    order.id === orderId
                        ? { ...order, reviewRating: rating }
                        : order
                )
            )
        }

        window.addEventListener('review:submitted', handleReviewSubmitted as EventListener)
        return () => {
            window.removeEventListener('review:submitted', handleReviewSubmitted as EventListener)
        }
    }, [])

    // Update local state when props change
    useEffect(() => {
        setLocalOrders(orders)
    }, [orders])

    const handleToggleFavorite = async (orderId: string, currentStatus: boolean) => {
        setLocalOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, isFavorite: !currentStatus } : o
        ))

        try {
            const result = await toggleFavoriteOrder(orderId, !currentStatus)
            if (!result.success) throw new Error('Failed to update')
            toast.success(currentStatus ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
        } catch (error) {
            setLocalOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, isFavorite: currentStatus } : o
            ))
            toast.error('Erro ao atualizar favorito')
        }
    }

    const filteredOrders = activeFilter === 'all'
        ? localOrders
        : activeFilter === 'favorites'
            ? localOrders.filter(o => o.isFavorite)
            : localOrders.filter(o => o.status === activeFilter)

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-background">
            <UserSidebar
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-50">
                        <div>
                            <h1 className="font-display text-[32px] md:text-[40px] leading-[0.95] tracking-[-0.02em] font-light mb-1">Minhas <em className="italic font-normal text-gradient-aurora">Leituras</em></h1>
                            <p className="text-xs md:text-sm text-slate-500">Acompanhe sua jornada espiritual e insights.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-md p-1.5 pl-3 rounded-xl border border-white/5 shadow-lg w-full sm:w-auto justify-between sm:justify-start">
                            <div className="text-left flex-1 sm:flex-none">
                                <p className="text-xs md:text-sm font-bold text-foreground">{userName}</p>
                                <div className="flex items-center gap-1 justify-end sm:justify-end">
                                    <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground">Leituras:</span>
                                    <span className="text-[10px] md:text-xs font-bold text-primary">{totalReadings}</span>
                                </div>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs md:text-sm border border-primary/30 shrink-0">
                                {userInitials}
                            </div>
                            <div className="pl-2 border-l border-white/10 ml-1 md:ml-2">
                                <NotificationsBell currentUserId={userId} />
                            </div>
                        </div>
                    </header>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        {filters.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${activeFilter === f.key
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'bg-card/50 text-muted-foreground hover:text-foreground border border-white/5 hover:border-primary/30'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Orders Grid */}
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <ShoppingBag className="h-16 w-16 text-slate-700 mb-6" />
                            <h2 className="font-display text-2xl font-light mb-2">
                                {activeFilter === 'all' ? 'Nenhuma leitura ainda' : 'Nenhuma leitura nesta categoria'}
                            </h2>
                            <p className="text-slate-500 mb-6 max-w-md">
                                Explore nossas cartomantes e agende sua primeira leitura para começar sua jornada espiritual.
                            </p>
                            <Button asChild className="bg-indigo-500 hover:bg-indigo-600">
                                <Link to="/cartomantes">Explorar Cartomantes</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filteredOrders.map(order => {
                                const status = statusConfig[order.status] || statusConfig.PENDING_PAYMENT
                                const readerInitials = order.readerName.substring(0, 2).toUpperCase()
                                const isReady = order.status === 'DELIVERED' || order.status === 'COMPLETED'
                                const isPaid = order.status === 'PAID'
                                const isPending = order.status === 'PENDING_PAYMENT'
                                const hasReview = order.reviewRating !== null

                                return (
                                    <div
                                        key={order.id}
                                        className="flex flex-col rounded-2xl border border-white/5 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-primary/30 transition-all duration-300 group overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
                                    >
                                        <div className="p-5 flex flex-col h-full">
                                            {/* Top: Avatar + Status + Favorite */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-3">
                                                    <div className="relative">
                                                        {order.readerAvatar ? (
                                                            <div className="relative w-14 h-14 rounded-full border-2 border-primary/20 overflow-hidden">
                                                                <img
                                                                    src={order.readerAvatar}
                                                                    alt={order.readerName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-900 flex items-center justify-center text-white font-bold text-lg border-2 border-primary/20">
                                                                {readerInitials}
                                                            </div>
                                                        )}
                                                        {isReady && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#12122a]" />
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider h-fit ${status.color}`}>
                                                        {status.label}
                                                    </Badge>
                                                </div>

                                                <button
                                                    onClick={() => handleToggleFavorite(order.id, order.isFavorite)}
                                                    className={`p-2 rounded-full transition-all hover:bg-white/10 ${order.isFavorite ? 'text-pink-500' : 'text-slate-400 hover:text-pink-400'
                                                        }`}
                                                >
                                                    <Heart className={`w-5 h-5 ${order.isFavorite ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Reader Name + Service */}
                                            <h3 className="font-bold text-white text-base mb-0.5 group-hover:text-indigo-300 transition-colors">
                                                {order.readerName}
                                            </h3>
                                            <p className="text-sm text-slate-500 italic mb-4">
                                                {order.gigTitle}
                                            </p>

                                            {/* Status-specific content */}
                                            {isPaid && (
                                                <div className="mb-4 p-3 rounded-xl bg-[#0a0a14] border border-indigo-500/10">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs text-slate-500">Preparação</span>
                                                        <span className="text-xs font-bold text-blue-400">Em andamento</span>
                                                    </div>
                                                    <Progress value={50} className="h-1.5" />
                                                </div>
                                            )}

                                            {isPending && (
                                                <p className="text-xs text-yellow-500/80 mb-4 leading-relaxed">
                                                    Verificação de pagamento pendente. Uma vez confirmado, a profissional iniciará sua leitura.
                                                </p>
                                            )}

                                            {hasReview && (
                                                <div className="flex items-center gap-1 mb-4 text-xs">
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <Star key={i} className={`w-3.5 h-3.5 ${i <= (order.reviewRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}`} />
                                                    ))}
                                                    <span className="text-slate-500 ml-1">Sua Avaliação</span>
                                                </div>
                                            )}

                                            {!hasReview && isReady && (
                                                <div className="mb-4 mt-auto">
                                                    <p className="text-xs text-indigo-300 mb-2">Sua leitura foi entregue!</p>
                                                    <ReviewModal
                                                        orderId={order.id}
                                                        gigId={order.gigId}
                                                        readerId={order.readerId}
                                                    >
                                                        <Button size="sm" variant="outline" className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 h-8 text-xs">
                                                            <Star className="w-3 h-3 mr-2" />
                                                            Avaliar Atendimento
                                                        </Button>
                                                    </ReviewModal>
                                                </div>
                                            )}

                                            {/* Footer: Date + Action */}
                                            <div className="flex items-center justify-between pt-3 border-t border-indigo-500/10 mt-auto">
                                                <span className="text-xs text-slate-600">
                                                    {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </span>

                                                <div className="flex gap-2">
                                                    {isReady && (
                                                        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 gap-1.5 h-8 text-xs font-bold shadow-lg shadow-primary/20">
                                                            <Link to={`/dashboard/leitura/${order.id}`}>
                                                                <Eye className="w-3.5 h-3.5" />
                                                                {order.status === 'COMPLETED' ? 'Rever' : 'Ver Leitura'}
                                                            </Link>
                                                        </Button>
                                                    )}

                                                    {isPaid && (
                                                        <Button asChild variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-8 text-xs font-bold">
                                                            <Link to={`/dashboard/pedido/${order.id}`}>
                                                                Acompanhar
                                                            </Link>
                                                        </Button>
                                                    )}

                                                    {isPending && (
                                                        <Button asChild size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black h-8 text-xs font-bold gap-1.5">
                                                            <Link to={`/dashboard/pedido/${order.id}`}>
                                                                <CreditCard className="w-3.5 h-3.5" />
                                                                Ver pedido
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* CTA Banner */}
                    <div className="mt-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-[#1a1040] to-indigo-950 border border-indigo-500/20 p-8">
                        <div className="relative z-10 max-w-lg">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Pronta para sua próxima revelação?
                            </h3>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                Explore nossas mestras mais bem avaliadas e descubra os segredos escritos nas estrelas.
                            </p>
                            <Button asChild variant="outline" className="border-indigo-400 text-indigo-300 hover:bg-indigo-500/10 gap-2">
                                <Link to="/cartomantes">
                                    Explorar Profissionais
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
                            <Sparkles className="w-32 h-32 text-indigo-400" />
                        </div>
                    </div>
                </div>
            </main>

            {/* Tracking Modal */}
            {trackingOrder && (
                <TrackingModal
                    order={trackingOrder}
                    onClose={() => setTrackingOrder(null)}
                />
            )}
        </div>
    )
}

function TrackingModal({ order, onClose }: { order: OrderData, onClose: () => void }) {
    const createdAt = new Date(order.created_at)
    const deliveryEstimate = new Date(createdAt.getTime() + order.deliveryTimeHours * 60 * 60 * 1000)

    const now = new Date()
    const totalTime = order.deliveryTimeHours * 60 * 60 * 1000
    const elapsed = now.getTime() - createdAt.getTime()
    const progress = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100)

    const steps = [
        { label: 'Pedido Realizado', date: createdAt, status: 'completed' },
        { label: 'Pagamento Confirmado', date: createdAt, status: 'completed' },
        { label: 'Em Preparação', status: 'current' },
        { label: 'Entrega Estimada', date: deliveryEstimate, status: 'upcoming' },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#12122a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-card/50">
                    <div>
                        <h3 className="font-bold text-lg text-white">Acompanhar Leitura</h3>
                        <p className="text-xs text-slate-500">ID: {order.id.substring(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Progresso da Preparação</span>
                            <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic text-center">
                            A cartomante está canalizando as energias para sua leitura.
                        </p>
                    </div>

                    <div className="space-y-6 relative">
                        {/* Vertical line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/5" />

                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-4 relative z-10">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.status === 'completed' ? 'bg-indigo-500 text-white' :
                                    step.status === 'current' ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-400 animate-pulse' :
                                        'bg-[#0a0a14] border border-white/10 text-slate-700'
                                    }`}>
                                    {step.status === 'completed' ? (
                                        <CheckCircle2 size={12} className="w-3.5 h-3.5" />
                                    ) : (
                                        <div className={`w-1.5 h-1.5 rounded-full ${step.status === 'current' ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm font-bold ${step.status === 'upcoming' ? 'text-slate-500' : 'text-white'}`}>
                                            {step.label}
                                        </p>
                                        {step.date && (
                                            <span className="text-[10px] text-slate-500">
                                                {step.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {step.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    {step.status === 'current' && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Aguardando a conclusão pela cartomante {order.readerName}.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-white mb-1">Previsão de Entrega</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Sua leitura deve estar pronta até <strong>{deliveryEstimate.toLocaleDateString('pt-BR')} às {deliveryEstimate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>.
                                Você receberá uma notificação assim que estiver disponível.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-card/30 border-t border-white/5">
                    <Button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 text-white border-white/10 h-10 rounded-xl">
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    )
}

function CheckCircle2({ size = 24, className = "" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}
