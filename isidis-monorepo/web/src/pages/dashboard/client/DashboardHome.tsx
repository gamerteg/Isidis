import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { getCategoryCounts, getBestSellingGigs } from '@/lib/data/stats'
import { UserSidebar } from '@/components/user-sidebar'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { usePresence } from '@/components/providers/presence-provider'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/apiClient'
import { createClient } from '@/lib/supabase/client'
import { listReaders } from '@/lib/readers'
import type { OrderSummary, ReaderListItem } from '@/types'
import {
    OrbBackground,
    MoonPhaseCard,
    ActiveOrderNudge,
    ChipFilter,
    ReaderCardRow,
    ReaderCard,
    type ReaderCardData,
} from '@/components/design'

const CATEGORY_EMOJI: Record<string, string> = {
    amor: '♥',
    trabalho: '✦',
    familia: '☽',
    espiritual: '◈',
    financas: '⊕',
    saude: '✿',
    carreira: '✦',
    profissional: '✦',
}

const AVATAR_GRADIENTS = [
    '#8b5cf6,#f472b6',
    '#f5c451,#d4a017',
    '#14b8a6,#0f766e',
    '#f472b6,#831843',
    '#fb7185,#dc2626',
    '#5eead4,#0891b2',
] as const

function readerToCard(
    reader: ReaderListItem,
    index: number,
    options: { online?: boolean } = {},
): ReaderCardData {
    const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
    const priceCents = reader.starting_price ?? 0
    return {
        id: reader.id,
        slug: reader.id,
        name: reader.full_name || 'Cartomante',
        specialty: reader.specialties?.[0] || 'Tarot & Vidência',
        rating: Number(reader.rating_average ?? 0),
        reviews: Number(reader.reviews_count ?? 0),
        price: Math.max(0, Math.round(priceCents / 100)),
        online: Boolean(options.online),
        avatar: (reader.full_name || 'CA').slice(0, 2).toUpperCase(),
        gradient,
    }
}

export default function DashboardHome() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const { onlineUsers } = usePresence()
    const [categoryCounts, setCategoryCounts] = useState<any[]>([])
    const [recommendedReaders, setRecommendedReaders] = useState<ReaderListItem[]>([])
    const [onlineReaders, setOnlineReaders] = useState<ReaderListItem[]>([])
    const [activeOrder, setActiveOrder] = useState<OrderSummary | null>(null)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)
    const [, setRefreshKey] = useState(0)

    useEffect(() => {
        const handleOrdersChanged = () => setRefreshKey((current) => current + 1)
        window.addEventListener('orders:changed', handleOrdersChanged)
        return () => window.removeEventListener('orders:changed', handleOrdersChanged)
    }, [])

    useEffect(() => {
        if (!authLoading && !user) navigate('/login')
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (authLoading || !user) return
        if (user.user_metadata?.role === 'READER') {
            navigate('/dashboard/cartomante')
            return
        }

        const supabase = createClient()
        let cancelled = false

        Promise.all([
            supabase.from('profiles').select('role').eq('id', user.id).single(),
            apiClient.get<{ data: { completed: boolean } }>('/me/quiz').catch(() => null),
            getCategoryCounts(),
            listReaders({ limit: 6 }),
            apiClient
                .get<{ data: OrderSummary[] }>('/orders', { params: { limit: 5 } })
                .catch(() => null),
        ]).then(([{ data: profileData }, quizResponse, categories, readersResponse, ordersResponse]) => {
            if (cancelled) return
            if (profileData?.role === 'READER') {
                navigate('/dashboard/cartomante')
                return
            }
            if (quizResponse && !quizResponse.data.data.completed) {
                navigate('/quiz-onboarding', { replace: true })
                return
            }
            setCategoryCounts(categories)
            setRecommendedReaders(readersResponse.data)

            const orders = ordersResponse?.data?.data ?? []
            const active = orders.find((o) => o.status === 'PAID' || o.status === 'DELIVERED')
            setActiveOrder(active ?? null)
        })

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading])

    useEffect(() => {
        const ids = Array.from(onlineUsers)
        if (ids.length === 0) {
            setOnlineReaders([])
            return
        }
        let cancelled = false
        listReaders({ ids, limit: 8 })
            .then((response) => {
                if (!cancelled) setOnlineReaders(response.data)
            })
            .catch(() => {
                if (!cancelled) setOnlineReaders([])
            })
        return () => {
            cancelled = true
        }
    }, [onlineUsers])

    const onlineIdSet = useMemo(() => new Set(onlineUsers), [onlineUsers])

    const onlineReaderCards = useMemo(
        () => onlineReaders.map((r, i) => readerToCard(r, i, { online: true })),
        [onlineReaders],
    )

    const recommendedCards = useMemo(
        () =>
            recommendedReaders
                .slice(0, 3)
                .map((r, i) => readerToCard(r, i, { online: onlineIdSet.has(r.id) })),
        [recommendedReaders, onlineIdSet],
    )

    if (authLoading || !user) {
        return (
            <div className="min-h-screen p-6 space-y-6 max-w-md mx-auto">
                <div className="skeleton h-10 w-56 rounded-xl" />
                <div className="skeleton h-20 rounded-2xl" />
                <div className="skeleton h-16 rounded-2xl" />
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton h-16 rounded-2xl" />
                    ))}
                </div>
                <div className="skeleton h-48 rounded-2xl" />
            </div>
        )
    }

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || 'Visitante'
    const notifDot = true

    const activeOrderNudge = activeOrder ? (
        <ActiveOrderNudge
            readerName={activeOrder.reader?.full_name || 'Sua cartomante'}
            deadline={formatDeadline(activeOrder)}
            progress={activeOrder.status === 'DELIVERED' ? 100 : 60}
            href={`/dashboard/pedido/${activeOrder.id}`}
        />
    ) : null

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />
            <RealtimeRefresher userId={user.id} />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8 overflow-x-hidden">
                <div className="mobile-canvas relative" style={{ padding: '16px 20px 0' }}>
                    <OrbBackground
                        orbs={[
                            { color: '#8b5cf6', size: 280, top: -100, right: -80, opacity: 0.25 },
                            { color: '#f5c451', size: 200, bottom: 100, left: -60, opacity: 0.12 },
                        ]}
                    />

                    {/* Header: greeting + bell */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 24,
                            paddingTop: 4,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '.15em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,.35)',
                                    marginBottom: 2,
                                }}
                            >
                                Bem-vinda de volta
                            </div>
                            <div
                                className="font-serif"
                                style={{
                                    fontSize: 26,
                                    fontWeight: 400,
                                    letterSpacing: '-.02em',
                                    lineHeight: 1.1,
                                }}
                            >
                                Olá,{' '}
                                <em className="text-gradient-aurora" style={{ fontStyle: 'italic' }}>
                                    {firstName}
                                </em>{' '}
                                ✦
                            </div>
                        </div>
                        <Link
                            to="/dashboard/notifications"
                            aria-label="Notificações"
                            style={{
                                position: 'relative',
                                background: 'rgba(255,255,255,.06)',
                                border: '1px solid rgba(255,255,255,.1)',
                                borderRadius: 12,
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,.7)',
                            }}
                        >
                            <Bell size={18} />
                            {notifDot && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: '#fb7185',
                                        border: '2px solid #07060d',
                                    }}
                                />
                            )}
                        </Link>
                    </div>

                    <MoonPhaseCard />

                    {activeOrderNudge}

                    {/* Categories */}
                    {categoryCounts.length > 0 && (
                        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700 }}>O que você busca?</div>
                                <Link
                                    to="/cartomantes"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#a78bfa',
                                        textDecoration: 'none',
                                    }}
                                >
                                    Ver todas
                                </Link>
                            </div>
                            <div
                                className="scrollbar-hide"
                                style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
                            >
                                {categoryCounts.map((cat) => {
                                    const emoji = CATEGORY_EMOJI[cat.slug?.toLowerCase?.()] ?? '✦'
                                    return (
                                        <ChipFilter
                                            key={cat.slug}
                                            label={cat.category}
                                            emoji={emoji}
                                            active={activeFilter === cat.slug}
                                            onClick={() => {
                                                setActiveFilter(cat.slug)
                                                navigate(
                                                    `/cartomantes?category=${encodeURIComponent(cat.slug)}`,
                                                )
                                            }}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Online readers */}
                    {onlineReaderCards.length > 0 && (
                        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#4ade80',
                                            boxShadow: '0 0 6px #4ade80',
                                        }}
                                    />
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>Online agora</span>
                                </div>
                                <Link
                                    to="/cartomantes"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#a78bfa',
                                        textDecoration: 'none',
                                    }}
                                >
                                    Ver todas
                                </Link>
                            </div>
                            <ReaderCardRow readers={onlineReaderCards} />
                        </div>
                    )}

                    {/* Recommended */}
                    {recommendedCards.length > 0 && (
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700 }}>Recomendadas para você</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {recommendedCards.map((r) => (
                                    <ReaderCard key={r.id} reader={r} variant="row" />
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ height: 40 }} />
                </div>
            </main>
        </div>
    )
}

function formatDeadline(order: OrderSummary): string {
    const hours = order.gigs?.delivery_time_hours ?? 48
    if (order.status === 'DELIVERED') return 'pronta para ver'
    if (hours <= 24) return `em até ${hours}h`
    const days = Math.ceil(hours / 24)
    return `em até ${days} ${days === 1 ? 'dia' : 'dias'}`
}
