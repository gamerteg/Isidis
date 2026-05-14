import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/apiClient'
import { UserSidebar } from '@/components/user-sidebar'
import { OrbBackground, TarotMini, getArcanoFor, StarRating } from '@/components/design'
import type { OrderSummary, OrderStatus } from '@/types'

type StatusVisual = {
    label: string
    bg: string
    fg: string
    border: string
}

const STATUS_VISUALS: Record<OrderStatus, StatusVisual> = {
    PENDING_PAYMENT: {
        label: 'Aguardando',
        bg: 'rgba(250,204,21,0.15)',
        fg: '#facc15',
        border: 'rgba(250,204,21,0.25)',
    },
    PAID: {
        label: 'Em entrega',
        bg: 'rgba(167,139,250,0.15)',
        fg: '#a78bfa',
        border: 'rgba(167,139,250,0.25)',
    },
    DELIVERED: {
        label: 'Pronta',
        bg: 'rgba(74,222,128,0.12)',
        fg: '#4ade80',
        border: 'rgba(74,222,128,0.2)',
    },
    COMPLETED: {
        label: 'Concluído',
        bg: 'rgba(74,222,128,0.12)',
        fg: '#4ade80',
        border: 'rgba(74,222,128,0.2)',
    },
    CANCELED: {
        label: 'Cancelado',
        bg: 'rgba(248,113,113,0.12)',
        fg: '#f87171',
        border: 'rgba(248,113,113,0.25)',
    },
}

function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
    if (sameDay) return 'hoje'
    const yesterday = new Date(now.getTime() - 86400000)
    if (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
    ) {
        return 'ontem'
    }
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMoney(cents: number) {
    return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

function shortId(id: string) {
    const clean = id.replace(/-/g, '').toUpperCase()
    return `#MP-${clean.slice(0, 6)}`
}

function destinationFor(order: OrderSummary): string {
    if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
        return `/dashboard/leitura/${order.id}`
    }
    return `/dashboard/pedido/${order.id}`
}

export default function MinhasTiragensPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [orders, setOrders] = useState<OrderSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate('/login?next=/dashboard/minhas-tiragens')
            return
        }

        apiClient
            .get<{ data: OrderSummary[] }>('/orders', { params: { limit: 50 } })
            .then(({ data }) => setOrders(data.data ?? []))
            .finally(() => setLoading(false))
    }, [user, authLoading, navigate])

    const orderCards = useMemo(() => {
        return orders.map((o, i) => {
            const arcano = getArcanoFor(o.gigs?.title ?? o.gigs?.delivery_method)
            const status = STATUS_VISUALS[o.status] ?? STATUS_VISUALS.COMPLETED
            return { order: o, arcano, status, index: i }
        })
    }, [orders])

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-deep">
                <p className="text-slate-400 text-sm">Carregando tiragens...</p>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8 overflow-x-hidden">
                <div className="mobile-canvas relative" style={{ padding: '16px 18px 0' }}>
                    <OrbBackground
                        orbs={[{ color: '#5b21b6', size: 200, top: -40, right: -40, opacity: 0.2 }]}
                    />

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 20,
                            paddingTop: 4,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '.2em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,.3)',
                                    marginBottom: 2,
                                }}
                            >
                                Seu oráculo
                            </div>
                            <div
                                className="font-serif"
                                style={{ fontSize: 24, fontWeight: 400, letterSpacing: '-.02em' }}
                            >
                                Minhas{' '}
                                <em className="text-gradient-aurora" style={{ fontStyle: 'italic' }}>
                                    tiragens
                                </em>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div
                                className="font-serif"
                                style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}
                            >
                                {orders.length}
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    color: 'rgba(255,255,255,.35)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '.12em',
                                }}
                            >
                                total
                            </div>
                        </div>
                    </div>

                    {orderCards.length === 0 ? (
                        <div
                            style={{
                                padding: 32,
                                textAlign: 'center',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                borderRadius: 20,
                                background: 'rgba(17,13,34,0.5)',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                                Nenhuma tiragem ainda
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: 'rgba(255,255,255,.4)',
                                    marginBottom: 16,
                                }}
                            >
                                Encontre uma guia e peça sua primeira leitura.
                            </div>
                            <Link
                                to="/cartomantes"
                                className="btn-primary-design"
                                style={{
                                    display: 'inline-block',
                                    padding: '10px 24px',
                                    fontSize: 13,
                                    textDecoration: 'none',
                                }}
                            >
                                Explorar cartomantes
                            </Link>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            {orderCards.map(({ order, arcano, status }) => (
                                <Link
                                    key={order.id}
                                    to={destinationFor(order)}
                                    style={{
                                        background: 'rgba(17,13,34,.9)',
                                        border: '1px solid rgba(255,255,255,.07)',
                                        borderRadius: 18,
                                        overflow: 'hidden',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'all .2s',
                                        display: 'block',
                                    }}
                                >
                                    <div style={{ padding: 14 }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                            <TarotMini
                                                arcano={arcano.arcano}
                                                arcanoName="Arcano"
                                                gradient={arcano.gradient}
                                                width={46}
                                                height={58}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: 9,
                                                        color: 'rgba(255,255,255,.3)',
                                                        fontFamily: 'JetBrains Mono, monospace',
                                                        marginBottom: 3,
                                                    }}
                                                >
                                                    {shortId(order.id)}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        marginBottom: 3,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {order.gigs?.title ?? 'Leitura de Tarot'}
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: 10,
                                                        color: 'rgba(255,255,255,.4)',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    <span>com {order.reader?.full_name ?? 'Cartomante'}</span>
                                                    <span>·</span>
                                                    <span>{formatDate(order.created_at)}</span>
                                                </div>
                                                {(order.status === 'COMPLETED' ||
                                                    order.status === 'DELIVERED') && (
                                                    <StarRating value={5} size={10} />
                                                )}
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <span
                                                    style={{
                                                        fontSize: 9,
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: 6,
                                                        background: status.bg,
                                                        color: status.fg,
                                                        border: `1px solid ${status.border}`,
                                                        whiteSpace: 'nowrap',
                                                        display: 'block',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {status.label}
                                                </span>
                                                <div
                                                    className="font-serif"
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        color: 'white',
                                                    }}
                                                >
                                                    {formatMoney(order.amount_total)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    <div style={{ height: 40 }} />
                </div>
            </main>
        </div>
    )
}
