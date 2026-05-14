import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    ArrowLeft,
    Check,
    MessageSquare,
    Sparkles,
    XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getOrderDetail } from '@/lib/actions/checkout'
import { cancelOrder } from '@/lib/actions/orders'
import { useAuth } from '@/hooks/useAuth'
import type { OrderDetail, OrderStatus } from '@/types'
import { toast } from 'sonner'
import {
    OrbBackground,
    TarotMini,
    getArcanoFor,
} from '@/components/design'

const CLIENT_CANCEL_REASONS = [
    'Mudança de planos',
    'Erro na compra',
    'Demora na resposta da cartomante',
    'Encontrei outra opção',
    'Outro motivo',
]

type TimelineStep = { label: string; desc: string; done: boolean; active: boolean }

function buildTimeline(order: OrderDetail): TimelineStep[] {
    const s = order.status
    const createdAt = new Date(order.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    })
    return [
        {
            label: 'Pedido recebido',
            desc: createdAt,
            done: true,
            active: s === 'PENDING_PAYMENT',
        },
        {
            label: 'Pagamento confirmado',
            desc: s === 'PENDING_PAYMENT' ? 'Aguardando' : createdAt,
            done: s !== 'PENDING_PAYMENT' && s !== 'CANCELED',
            active: s === 'PENDING_PAYMENT',
        },
        {
            label: 'Leitura em preparo',
            desc: s === 'PAID' ? 'Em andamento' : s === 'CANCELED' ? '—' : 'Concluído',
            done: s === 'DELIVERED' || s === 'COMPLETED',
            active: s === 'PAID',
        },
        {
            label: 'Entrega da tiragem',
            desc: s === 'DELIVERED' || s === 'COMPLETED' ? 'Entregue' : 'Aguardando',
            done: s === 'DELIVERED' || s === 'COMPLETED',
            active: s === 'PAID',
        },
        {
            label: 'Avaliação',
            desc: s === 'COMPLETED' ? 'Concluído' : 'Após a entrega',
            done: s === 'COMPLETED',
            active: s === 'DELIVERED',
        },
    ]
}

function progressFor(status: OrderStatus): number {
    switch (status) {
        case 'PENDING_PAYMENT':
            return 10
        case 'PAID':
            return 50
        case 'DELIVERED':
            return 85
        case 'COMPLETED':
            return 100
        default:
            return 0
    }
}

function statusBadge(status: OrderStatus) {
    switch (status) {
        case 'DELIVERED':
        case 'COMPLETED':
            return { label: 'Pronta', bg: 'rgba(74,222,128,.12)', fg: '#4ade80', border: 'rgba(74,222,128,.2)' }
        case 'PAID':
            return { label: 'Em entrega', bg: 'rgba(167,139,250,.15)', fg: '#a78bfa', border: 'rgba(167,139,250,.25)' }
        case 'PENDING_PAYMENT':
            return { label: 'Aguardando', bg: 'rgba(250,204,21,.15)', fg: '#facc15', border: 'rgba(250,204,21,.25)' }
        case 'CANCELED':
            return { label: 'Cancelado', bg: 'rgba(248,113,113,.12)', fg: '#f87171', border: 'rgba(248,113,113,.25)' }
    }
}

function formatMoney(valueCents: number | null | undefined) {
    return ((valueCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function shortId(id: string) {
    return `#MP-${id.replace(/-/g, '').toUpperCase().slice(0, 6)}`
}

function formatDeadline(order: OrderDetail): string {
    const hours = order.gigs?.delivery_time_hours ?? 48
    const created = new Date(order.created_at).getTime()
    const target = new Date(created + hours * 3600 * 1000)
    const today = new Date()
    const sameDay =
        target.getDate() === today.getDate() &&
        target.getMonth() === today.getMonth() &&
        target.getFullYear() === today.getFullYear()
    const tomorrow = new Date(today.getTime() + 86400000)
    const isTomorrow =
        target.getDate() === tomorrow.getDate() &&
        target.getMonth() === tomorrow.getMonth() &&
        target.getFullYear() === tomorrow.getFullYear()
    const hh = String(target.getHours()).padStart(2, '0')
    if (sameDay) return `Hoje, ${hh}h`
    if (isTomorrow) return `Amanhã, ${hh}h`
    return target.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' })
}

export default function ClientOrderDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()

    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [cancelDialog, setCancelDialog] = useState<{
        open: boolean
        reason: string
        submitting: boolean
    }>({ open: false, reason: '', submitting: false })

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(`/login?next=/dashboard/pedido/${id}`)
            return
        }
        if (!id) return

        getOrderDetail(id)
            .then((data) => setOrder(data))
            .catch(
                (requestError: any) =>
                    setError(requestError?.response?.data?.error || 'Não foi possível carregar o pedido.'),
            )
            .finally(() => setLoading(false))
    }, [authLoading, id, navigate, user])

    const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order])
    const arcano = useMemo(() => {
        if (!order) return getArcanoFor()
        return getArcanoFor(order.gigs?.title ?? order.gigs?.delivery_method)
    }, [order])

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-deep">
                <p className="text-slate-400 text-sm">Carregando pedido...</p>
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 bg-background-deep">
                <p className="text-sm text-slate-400 text-center max-w-sm">
                    {error || 'Não encontramos este pedido no painel do cliente.'}
                </p>
                <Link
                    to="/dashboard/minhas-tiragens"
                    className="btn-primary-design"
                    style={{ padding: '10px 24px', fontSize: 13, display: 'inline-block' }}
                >
                    Voltar para minhas tiragens
                </Link>
            </div>
        )
    }

    const status = statusBadge(order.status)!
    const canOpenReading = order.status === 'DELIVERED' || order.status === 'COMPLETED'
    const canPay = order.status === 'PENDING_PAYMENT'
    const canCancel = order.status === 'PAID'
    const selectedAddOns =
        order.gigs?.add_ons?.filter((item) => order.selected_addons?.includes(item.id)) ?? []
    const readerInitials = (order.reader?.full_name ?? 'CA').slice(0, 2).toUpperCase()
    const progress = progressFor(order.status)

    async function handleCancelOrder() {
        if (!id || !cancelDialog.reason) return
        setCancelDialog((prev) => ({ ...prev, submitting: true }))
        try {
            await cancelOrder(id, cancelDialog.reason)
            toast.success('Pedido cancelado. O reembolso será processado em até 5 dias úteis.')
            navigate('/dashboard/minhas-tiragens')
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Erro ao cancelar o pedido.')
            setCancelDialog((prev) => ({ ...prev, submitting: false }))
        }
    }

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans pb-24 md:pb-8 overflow-x-hidden">
            <div className="mobile-canvas relative" style={{ padding: '16px 20px 0' }}>
                <OrbBackground
                    orbs={[{ color: '#8b5cf6', size: 250, top: -50, right: -50, opacity: 0.2 }]}
                />

                {/* Header: back + order id */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 20,
                        paddingTop: 4,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <Link
                        to="/dashboard/minhas-tiragens"
                        aria-label="Voltar"
                        style={{
                            background: 'rgba(255,255,255,.06)',
                            border: '1px solid rgba(255,255,255,.1)',
                            borderRadius: 10,
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: 'rgba(255,255,255,.8)',
                        }}
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '.15em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,.35)',
                            }}
                        >
                            Seu pedido
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{shortId(order.id)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 8,
                                background: status.bg,
                                color: status.fg,
                                border: `1px solid ${status.border}`,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {status.label}
                        </span>
                    </div>
                </div>

                {/* Status card */}
                <div
                    style={{
                        background: 'linear-gradient(135deg,rgba(42,27,94,.95),rgba(26,14,61,.95))',
                        border: '1px solid rgba(167,139,250,.25)',
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 16,
                        position: 'relative',
                        overflow: 'hidden',
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'radial-gradient(circle,rgba(167,139,250,.3),transparent 70%)',
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 14,
                            position: 'relative',
                        }}
                    >
                        {order.reader?.avatar_url ? (
                            <img
                                src={order.reader.avatar_url}
                                alt={order.reader.full_name ?? ''}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg,#8b5cf6,#f472b6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: 'white',
                                    flexShrink: 0,
                                }}
                            >
                                {readerInitials}
                            </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'white',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {order.reader?.full_name ?? 'Cartomante'}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                                {order.gigs?.title ?? 'Leitura'}
                            </div>
                        </div>
                        <Link
                            to="/dashboard/mensagens"
                            style={{
                                marginLeft: 'auto',
                                background: 'rgba(167,139,250,.15)',
                                border: '1px solid rgba(167,139,250,.25)',
                                borderRadius: 10,
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#a78bfa',
                                textDecoration: 'none',
                                flexShrink: 0,
                            }}
                        >
                            Chat
                        </Link>
                    </div>

                    <div style={{ marginBottom: 10, position: 'relative' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 10,
                                fontWeight: 700,
                                marginBottom: 6,
                            }}
                        >
                            <span style={{ color: 'rgba(255,255,255,.4)' }}>Progresso da leitura</span>
                            <span style={{ color: '#a78bfa' }}>{progress}%</span>
                        </div>
                        <div
                            style={{
                                height: 6,
                                borderRadius: 99,
                                background: 'rgba(255,255,255,.1)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${progress}%`,
                                    borderRadius: 99,
                                    background: 'linear-gradient(90deg,#8b5cf6,#f5c451)',
                                    boxShadow: '0 0 8px rgba(167,139,250,.4)',
                                    transition: 'width .4s',
                                }}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            position: 'relative',
                        }}
                    >
                        <span style={{ color: 'rgba(255,255,255,.4)' }}>Entrega até</span>
                        <span style={{ fontWeight: 700, color: '#f5c451' }}>{formatDeadline(order)}</span>
                    </div>
                </div>

                {/* Gig detail card */}
                <div className="surface-card" style={{ padding: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <TarotMini
                            arcano={arcano.arcano}
                            arcanoName={arcano.arcanoName}
                            gradient={arcano.gradient}
                            width={50}
                            height={65}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>
                                {order.gigs?.title ?? 'Leitura'}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                <span
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        background: 'rgba(244,114,182,.15)',
                                        color: '#f472b6',
                                        border: '1px solid rgba(244,114,182,.2)',
                                    }}
                                >
                                    {order.gigs?.delivery_method ?? 'Leitura'}
                                </span>
                                {order.gigs?.delivery_time_hours && (
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: 6,
                                            background: 'rgba(255,255,255,.06)',
                                            color: 'rgba(255,255,255,.4)',
                                            border: '1px solid rgba(255,255,255,.1)',
                                        }}
                                    >
                                        até {order.gigs.delivery_time_hours}h
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>
                                Pedido feito em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                        <div
                            className="font-serif"
                            style={{
                                fontSize: 20,
                                fontWeight: 600,
                                color: 'white',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            {formatMoney(order.amount_total)}
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="surface-card" style={{ padding: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '.15em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,.35)',
                            marginBottom: 14,
                        }}
                    >
                        Jornada da leitura
                    </div>
                    {timeline.map((step, i) => (
                        <div key={step.label} style={{ display: 'flex', gap: 12, marginBottom: i < timeline.length - 1 ? 12 : 0 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        background: step.done
                                            ? '#4ade80'
                                            : step.active
                                                ? '#a78bfa'
                                                : 'rgba(255,255,255,.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: step.active ? '2px solid rgba(167,139,250,.5)' : 'none',
                                    }}
                                >
                                    {step.done && <Check size={10} color="#07060d" strokeWidth={3} />}
                                    {step.active && !step.done && (
                                        <div
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: 'white',
                                            }}
                                        />
                                    )}
                                </div>
                                {i < timeline.length - 1 && (
                                    <div
                                        style={{
                                            width: 1,
                                            height: 20,
                                            background: step.done
                                                ? 'rgba(74,222,128,.3)'
                                                : 'rgba(255,255,255,.08)',
                                            marginTop: 2,
                                        }}
                                    />
                                )}
                            </div>
                            <div style={{ paddingTop: 1 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: step.done || step.active ? 700 : 500,
                                        color: step.done
                                            ? 'rgba(255,255,255,.9)'
                                            : step.active
                                                ? '#a78bfa'
                                                : 'rgba(255,255,255,.35)',
                                    }}
                                >
                                    {step.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,.3)',
                                        marginTop: 1,
                                    }}
                                >
                                    {step.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Requirements (if any) */}
                {order.requirements_answers && Object.keys(order.requirements_answers).length > 0 && (
                    <div className="surface-card" style={{ padding: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '.15em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,.35)',
                                marginBottom: 12,
                            }}
                        >
                            Seu briefing
                        </div>
                        {Object.entries(order.requirements_answers).map(([key, value]) => {
                            const question =
                                order.gigs?.requirements?.find((r) => r.id === key)?.question ?? key
                            return (
                                <div key={key} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 3 }}>
                                        {question}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,.8)',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {value}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Financial summary */}
                <div className="surface-card" style={{ padding: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '.15em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,.35)',
                            marginBottom: 10,
                        }}
                    >
                        Resumo
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: 'rgba(255,255,255,.5)' }}>Serviço</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(order.gigs?.price)}</span>
                    </div>
                    {selectedAddOns.map((addOn) => (
                        <div
                            key={addOn.id}
                            style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}
                        >
                            <span style={{ color: 'rgba(255,255,255,.4)' }}>{addOn.title}</span>
                            <span>{formatMoney(Math.round(addOn.price * 100))}</span>
                        </div>
                    ))}
                    <div
                        style={{
                            borderTop: '1px solid rgba(255,255,255,.08)',
                            marginTop: 10,
                            paddingTop: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 14,
                            fontWeight: 800,
                        }}
                    >
                        <span>Total</span>
                        <span style={{ color: '#f5c451' }}>{formatMoney(order.amount_total)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
                    {canPay && (
                        <Link
                            to={`/checkout/${order.gigs?.id}?order_id=${order.id}`}
                            className="btn-gold-design"
                            style={{
                                padding: 14,
                                fontSize: 14,
                                textAlign: 'center',
                                textDecoration: 'none',
                                display: 'block',
                            }}
                        >
                            ✦ Concluir pagamento
                        </Link>
                    )}
                    {canOpenReading && (
                        <Link
                            to={`/dashboard/leitura/${order.id}`}
                            className="btn-primary-design"
                            style={{
                                padding: 14,
                                fontSize: 14,
                                textAlign: 'center',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Sparkles size={16} /> Abrir leitura
                        </Link>
                    )}
                    <Link
                        to="/dashboard/mensagens"
                        className="btn-ghost-design"
                        style={{
                            padding: 13,
                            fontSize: 13,
                            textAlign: 'center',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <MessageSquare size={14} /> Falar com {order.reader?.full_name?.split(' ')[0] ?? 'cartomante'}
                    </Link>
                    {canCancel && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    setCancelDialog({ open: true, reason: '', submitting: false })
                                }
                                style={{
                                    padding: 13,
                                    fontSize: 13,
                                    background: 'rgba(248,113,113,.08)',
                                    border: '1px solid rgba(248,113,113,.2)',
                                    borderRadius: 12,
                                    color: '#f87171',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                <XCircle size={14} /> Cancelar pedido
                            </button>
                            <p
                                style={{
                                    textAlign: 'center',
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,.25)',
                                }}
                            >
                                Disponível por 2h após o pagamento, enquanto a leitura não for iniciada.
                            </p>
                        </>
                    )}
                </div>

                <div style={{ height: 40 }} />
            </div>

            <Dialog
                open={cancelDialog.open}
                onOpenChange={(open) =>
                    !cancelDialog.submitting && setCancelDialog((prev) => ({ ...prev, open }))
                }
            >
                <DialogContent className="bg-[#0f0e1a] border border-white/10 text-slate-100 rounded-[1.5rem] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400" />
                            Cancelar Pedido
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">
                            Ao confirmar, o reembolso será processado automaticamente em até 5 dias úteis.
                            Selecione o motivo:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Select
                            value={cancelDialog.reason}
                            onValueChange={(val) =>
                                setCancelDialog((prev) => ({ ...prev, reason: val }))
                            }
                        >
                            <SelectTrigger className="bg-white/5 border border-white/10 text-slate-200 rounded-xl h-11">
                                <SelectValue placeholder="Selecione o motivo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f0e1a] border border-white/10 text-slate-200 rounded-xl">
                                {CLIENT_CANCEL_REASONS.map((reason) => (
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
                            onClick={() =>
                                setCancelDialog({ open: false, reason: '', submitting: false })
                            }
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
