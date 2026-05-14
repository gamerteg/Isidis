import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getOrderDetail } from '@/lib/actions/checkout'
import { submitReview } from '@/lib/actions/reviews'
import apiClient from '@/lib/apiClient'
import { UserSidebar } from '@/components/user-sidebar'
import { PhysicalReadingView } from '@/components/readings/PhysicalReadingView'
import {
    OrbBackground,
    AudioWaveformPlayer,
    CardRevealGrid,
    StarRating,
    getArcanoFor,
} from '@/components/design'
import type { OrderDetail } from '@/types'
import type { RevealCardData } from '@/components/design'

const fallbackCardImage = 'https://sacred-texts.com/tarot/pkt/img/ar00.jpg'

function normalizePhysicalSections(deliveryContent: any) {
    if (deliveryContent?.mode === 'physical' && Array.isArray(deliveryContent.sections)) {
        return deliveryContent.sections
    }
    if (deliveryContent?.method !== 'PHYSICAL' || !Array.isArray(deliveryContent.sections)) {
        return []
    }
    const groupedSections = new Map<string, {
        id: string
        title: string
        photoUrl: string | null
        audioUrl: string | null
        interpretation: string
    }>()
    deliveryContent.sections.forEach((section: any, index: number) => {
        const key = section.section_id || section.title || `section-${Math.floor(index / 3) + 1}`
        const current = groupedSections.get(key) || {
            id: key,
            title: section.title || `Tiragem ${groupedSections.size + 1}`,
            photoUrl: null,
            audioUrl: null,
            interpretation: '',
        }
        if (section.type === 'photo') current.photoUrl = section.url || null
        if (section.type === 'audio') current.audioUrl = section.url || null
        if (section.type === 'text') current.interpretation = section.content || ''
        groupedSections.set(key, current)
    })
    return Array.from(groupedSections.values())
}

function toRevealCards(deliveryContent: any): RevealCardData[] {
    const cards = Array.isArray(deliveryContent?.cards) ? deliveryContent.cards : []
    if (cards.length === 0) return []
    return cards.map((card: any, index: number) => {
        const category = card.category || card.position_name || ''
        const arcanoData = getArcanoFor(category)
        return {
            pos: card.position_name || (card.position === 'reversed' ? `Carta ${index + 1} inv.` : `Carta ${index + 1}`),
            arcano: arcanoData.arcano,
            arcanoName: card.card_name || card.name || arcanoData.arcano,
            gradient: arcanoData.gradient,
            message: card.meaning || card.interpretation || 'Sem interpretação registrada.',
        } satisfies RevealCardData
    })
}

function shortId(id: string) {
    const clean = id.replace(/-/g, '').toUpperCase()
    return `#MP-${clean.slice(0, 6)}`
}

type ReviewState = 'idle' | 'open' | 'submitting' | 'done'

export default function LeituraDetailPage() {
    const { id } = useParams<{ id: string }>()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [allRevealed, setAllRevealed] = useState(false)
    const [reviewState, setReviewState] = useState<ReviewState>('idle')
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewError, setReviewError] = useState<string | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            navigate(`/login?next=/dashboard/leitura/${id}`)
            return
        }
        if (!id) return

        getOrderDetail(id)
            .then((data) => {
                if (!['DELIVERED', 'COMPLETED'].includes(data.status)) {
                    navigate(`/dashboard/pedido/${id}`, { replace: true })
                    return
                }
                setOrder(data)
            })
            .catch(() => navigate('/dashboard/minhas-tiragens'))
            .finally(() => setLoading(false))
    }, [authLoading, id, navigate, user])

    const deliveryContent = order?.delivery_content
    const readerName = order?.reader?.full_name || 'Cartomante'
    const isPhysical =
        (deliveryContent?.method === 'PHYSICAL' || deliveryContent?.mode === 'physical') &&
        Array.isArray(deliveryContent?.sections) &&
        deliveryContent.sections.length > 0

    const physicalSections = useMemo(() => normalizePhysicalSections(deliveryContent), [deliveryContent])
    const revealCards = useMemo(() => toRevealCards(deliveryContent), [deliveryContent])

    const audioSrc: string | undefined =
        deliveryContent?.audio_url ||
        deliveryContent?.audioUrl ||
        (Array.isArray(deliveryContent?.cards) && deliveryContent.cards[0]?.audio_url) ||
        undefined

    const summaryText =
        deliveryContent?.summary ||
        (deliveryContent?.spreadName ? `Leitura: ${deliveryContent.spreadName}` : null)

    const alreadyReviewed = order?.status === 'COMPLETED'

    async function handleSubmitReview() {
        if (!order) return
        setReviewState('submitting')
        setReviewError(null)
        try {
            await apiClient.post(`/orders/${order.id}/review`, {
                rating: reviewRating,
                comment: reviewComment.trim() || undefined,
            })
            setReviewState('done')
            setOrder((prev) => prev ? { ...prev, status: 'COMPLETED' } : prev)
        } catch {
            setReviewError('Não foi possível enviar a avaliação. Tente novamente.')
            setReviewState('open')
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-deep">
                <p className="text-slate-400 text-sm">Carregando leitura...</p>
            </div>
        )
    }

    if (!order) return null

    if (isPhysical) {
        return (
            <PhysicalReadingView
                readingTitle={deliveryContent.readingTitle || deliveryContent.summary || order.gigs?.title || 'Sua Leitura'}
                sections={physicalSections}
                readerName={readerName}
                deliveredAt={order.delivered_at || order.created_at}
            />
        )
    }

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'você'
    const isNew = order.status === 'DELIVERED'

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8 overflow-x-hidden">
                <div className="mobile-canvas relative" style={{ padding: '16px 18px 0' }}>
                    <OrbBackground
                        orbs={[
                            { color: '#8b5cf6', size: 220, top: -50, right: -40, opacity: 0.2 },
                            { color: '#f472b6', size: 160, bottom: 200, left: -40, opacity: 0.12 },
                        ]}
                    />

                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 20,
                            paddingTop: 4,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => navigate(`/dashboard/pedido/${order.id}`)}
                            style={{
                                background: 'rgba(255,255,255,.06)',
                                border: '1px solid rgba(255,255,255,.1)',
                                borderRadius: 10,
                                width: 34,
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            <ArrowLeft size={15} />
                        </button>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 9,
                                    color: 'rgba(255,255,255,.3)',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    marginBottom: 1,
                                }}
                            >
                                {shortId(order.id)}
                            </div>
                            <div className="font-serif" style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-.01em' }}>
                                Sua{' '}
                                <em className="text-gradient-aurora" style={{ fontStyle: 'italic' }}>
                                    tiragem
                                </em>{' '}
                                chegou
                            </div>
                        </div>
                        {isNew && (
                            <span
                                style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(167,139,250,.2)',
                                    color: '#a78bfa',
                                    border: '1px solid rgba(167,139,250,.3)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Nova ✦
                            </span>
                        )}
                    </div>

                    {/* Reader message card */}
                    {summaryText && (
                        <div
                            style={{
                                background: 'linear-gradient(135deg, rgba(91,33,182,.25) 0%, rgba(30,20,60,.6) 100%)',
                                border: '1px solid rgba(167,139,250,.2)',
                                borderRadius: 18,
                                padding: '16px 18px',
                                marginBottom: 20,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '.15em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(167,139,250,.7)',
                                    marginBottom: 8,
                                }}
                            >
                                Mensagem de {readerName}
                            </div>
                            <p
                                className="font-serif"
                                style={{
                                    fontSize: 14,
                                    fontStyle: 'italic',
                                    color: 'rgba(255,255,255,.8)',
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}
                            >
                                "{summaryText}"
                            </p>
                        </div>
                    )}

                    {/* Audio player */}
                    {audioSrc && (
                        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'rgba(255,255,255,.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '.12em',
                                    marginBottom: 8,
                                }}
                            >
                                Áudio da leitora
                            </div>
                            <AudioWaveformPlayer src={audioSrc} title={`Áudio de ${readerName}`} />
                        </div>
                    )}

                    {/* Cards section */}
                    {revealCards.length > 0 ? (
                        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 12,
                                }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 700 }}>Suas cartas</div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>
                                    {revealCards.length} {revealCards.length === 1 ? 'carta' : 'cartas'}
                                </div>
                            </div>
                            <CardRevealGrid
                                cards={revealCards}
                                onAllRevealed={() => setAllRevealed(true)}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                padding: 24,
                                textAlign: 'center',
                                background: 'rgba(17,13,34,.5)',
                                border: '1px dashed rgba(255,255,255,.1)',
                                borderRadius: 18,
                                marginBottom: 20,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div style={{ fontSize: 28, marginBottom: 6 }}>✦</div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                                Sua leitura está chegando
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                                As cartas serão reveladas em breve.
                            </div>
                        </div>
                    )}

                    {/* Review CTA — show when all cards revealed and not yet reviewed */}
                    {(allRevealed || revealCards.length === 0) && !alreadyReviewed && reviewState === 'idle' && (
                        <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                            <button
                                type="button"
                                className="btn-gold-design"
                                style={{ width: '100%', padding: '13px', fontSize: 14 }}
                                onClick={() => setReviewState('open')}
                            >
                                ⭐ Avaliar leitura
                            </button>
                        </div>
                    )}

                    {/* Review modal inline */}
                    {reviewState === 'open' || reviewState === 'submitting' ? (
                        <div
                            style={{
                                background: 'rgba(17,13,34,.95)',
                                border: '1px solid rgba(167,139,250,.25)',
                                borderRadius: 20,
                                padding: '20px 18px',
                                marginBottom: 20,
                                position: 'relative',
                                zIndex: 2,
                            }}
                        >
                            <div className="font-serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                                Como foi sua leitura?
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginBottom: 16 }}>
                                Sua opinião ajuda outras consulentes a escolherem sua guia.
                            </div>

                            {/* Star picker */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setReviewRating(star)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 2,
                                            fontSize: 28,
                                            lineHeight: 1,
                                            color: star <= reviewRating ? '#f5c451' : 'rgba(255,255,255,.15)',
                                            transition: 'color .15s',
                                        }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Deixe um comentário opcional..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,.05)',
                                    border: '1px solid rgba(255,255,255,.1)',
                                    borderRadius: 12,
                                    padding: '10px 12px',
                                    fontSize: 13,
                                    color: 'rgba(255,255,255,.8)',
                                    resize: 'none',
                                    outline: 'none',
                                    marginBottom: 12,
                                    boxSizing: 'border-box',
                                }}
                            />

                            {reviewError && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: '#f87171',
                                        marginBottom: 10,
                                    }}
                                >
                                    {reviewError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn-ghost-design"
                                    style={{ flex: 1, padding: '11px', fontSize: 13 }}
                                    onClick={() => setReviewState('idle')}
                                    disabled={reviewState === 'submitting'}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-design"
                                    style={{ flex: 2, padding: '11px', fontSize: 13 }}
                                    onClick={handleSubmitReview}
                                    disabled={reviewState === 'submitting'}
                                >
                                    {reviewState === 'submitting' ? 'Enviando...' : 'Enviar avaliação'}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Post-review thank you */}
                    {reviewState === 'done' && (
                        <div
                            style={{
                                background: 'linear-gradient(135deg, rgba(74,222,128,.12) 0%, rgba(17,13,34,.6) 100%)',
                                border: '1px solid rgba(74,222,128,.2)',
                                borderRadius: 18,
                                padding: '20px 18px',
                                textAlign: 'center',
                                marginBottom: 20,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <div style={{ fontSize: 28, marginBottom: 6 }}>✦</div>
                            <div
                                className="font-serif"
                                style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}
                            >
                                Obrigada, {firstName}!
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
                                Sua avaliação foi enviada com sucesso.
                            </div>
                            <div style={{ marginTop: 10 }}>
                                <StarRating value={reviewRating} size={14} />
                            </div>
                        </div>
                    )}

                    {/* Already reviewed */}
                    {alreadyReviewed && reviewState !== 'done' && (
                        <div
                            style={{
                                background: 'rgba(255,255,255,.03)',
                                border: '1px solid rgba(255,255,255,.07)',
                                borderRadius: 14,
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 20,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <StarRating value={5} size={12} />
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>
                                Leitura já avaliada
                            </span>
                        </div>
                    )}

                    {/* Chat CTA */}
                    <div style={{ position: 'relative', zIndex: 1, marginBottom: 20 }}>
                        <button
                            type="button"
                            className="btn-ghost-design"
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                            onClick={() => navigate(`/dashboard/mensagens?reader=${order.reader?.id ?? ''}`)}
                        >
                            <MessageCircle size={14} />
                            Falar com {readerName}
                        </button>
                    </div>

                    <div style={{ height: 40 }} />
                </div>
            </main>
        </div>
    )
}
