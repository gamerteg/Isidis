import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Star, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, type Order, type DeliveryContent, type DeliveryCard, type DeliverySection } from '@/lib/api'
import { formatCurrency, formatDateTime, ORDER_STATUS_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { StarRating } from '@/components/shared/StarRating'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

// ─── Delivery viewer sub-components ──────────────────────────────────────────

function CardItem({ card }: { card: DeliveryCard }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm">🃏</span>
          <span className="font-semibold text-sm">{card.name}</span>
          <Badge variant={card.position === 'upright' ? 'success' : 'warning'} className="text-[10px]">
            {card.position === 'upright' ? 'Normal' : 'Invertida'}
          </Badge>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-primary/10">
          {card.interpretation && (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line pt-3">
              {card.interpretation}
            </p>
          )}
          {card.audio_url && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Volume2 size={14} className="text-primary shrink-0" />
              <audio controls className="flex-1 h-8" src={card.audio_url}>
                Seu navegador não suporta o player.
              </audio>
            </div>
          )}
          {!card.interpretation && !card.audio_url && (
            <p className="text-xs text-muted-foreground pt-2 italic">Sem interpretação adicional</p>
          )}
        </div>
      )}
    </div>
  )
}

function SectionItem({ section }: { section: DeliverySection }) {
  if (section.type === 'text') {
    return (
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
        {section.content}
      </p>
    )
  }
  if (section.type === 'audio') {
    return (
      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-primary shrink-0" />
          <audio controls className="flex-1 h-8" src={section.url}>
            Seu navegador não suporta o player.
          </audio>
        </div>
        {section.content && (
          <p className="text-xs text-muted-foreground">{section.content}</p>
        )}
      </div>
    )
  }
  if (section.type === 'photo') {
    return (
      <div>
        <img
          src={section.url}
          alt="Tiragem"
          className="w-full rounded-xl object-cover max-h-64"
        />
        {section.content && (
          <p className="text-xs text-muted-foreground mt-1">{section.content}</p>
        )}
      </div>
    )
  }
  return null
}

function DeliveryViewer({ delivery }: { delivery: DeliveryContent }) {
  return (
    <div className="space-y-4">
      {/* General summary */}
      {delivery.summary && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            ✨ Mensagem da leitora
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {delivery.summary}
          </p>
        </div>
      )}

      {/* Digital spread — cards */}
      {delivery.method === 'DIGITAL_SPREAD' && delivery.cards?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            🔮 Tiragem digital — {delivery.cards.length} carta{delivery.cards.length > 1 ? 's' : ''}
          </p>
          {[...delivery.cards].sort((a, b) => a.order - b.order).map(card => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      )}

      {/* Physical — sections */}
      {delivery.method === 'PHYSICAL' && delivery.sections?.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">📷 Tiragem física</p>
          {[...delivery.sections].sort((a, b) => a.order - b.order).map((sec, i) => (
            <SectionItem key={i} section={sec} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClientOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const { data, isLoading, mutate } = useSWR(
    orderId ? `/orders/${orderId}` : null,
    () => api.get<{ data: Order }>(`/orders/${orderId}`),
  )

  const order = data?.data
  const statusInfo = ORDER_STATUS_MAP[order?.status ?? '']

  const submitReview = async () => {
    if (rating === 0) { toast.error('Selecione uma nota'); return }
    setSubmittingReview(true)
    try {
      await api.post(`/orders/${orderId}/review`, { rating, comment: reviewText.trim() || undefined })
      toast.success('Avaliação enviada!')
      mutate()
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar avaliação')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Pedido não encontrado</p></div>
  }

  const delivery = order.delivery_content
  const reader = order.reader as any
  const gig = order.gigs as any

  return (
    <div className="animate-fade-in pb-8">
      {/* Sticky header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
          <span className="text-sm">Meus pedidos</span>
        </button>
        <div className="flex items-center justify-between mt-2">
          <h1 className="font-display text-xl font-bold">Detalhes do Pedido</h1>
          <Badge variant={
            order.status === 'DELIVERED' ? 'success' :
            order.status === 'PAID' ? 'info' :
            order.status === 'PENDING_PAYMENT' ? 'warning' : 'error'
          }>
            {statusInfo?.label ?? order.status}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Reader card */}
        {reader && (
          <button
            onClick={() => navigate(`/leitora/${reader.id}`)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
          >
            <Avatar src={reader.avatar_url} name={reader.full_name} size="md" />
            <div>
              <p className="text-sm font-medium">{reader.full_name}</p>
              <p className="text-xs text-muted-foreground">{gig?.title}</p>
            </div>
          </button>
        )}

        {/* Order summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pedido feito em</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pagamento</span>
              <span>{order.payment_method === 'PIX' ? '🟢 PIX' : '💳 Cartão'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-semibold text-gold">{formatCurrency(order.amount_total)}</span>
            </div>
            {order.delivered_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entregue em</span>
                <span>{formatDateTime(order.delivered_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements answers */}
        {order.requirements_answers && Object.keys(order.requirements_answers).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Suas respostas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {Object.entries(order.requirements_answers).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-sm">{value as string}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Delivery content ── */}
        {delivery && order.status === 'DELIVERED' && (
          <div>
            <h2 className="font-display text-lg font-bold mb-3">✨ Sua leitura</h2>
            <div className="p-5 rounded-3xl border border-primary/30 bg-card"
              style={{ background: 'linear-gradient(135deg, rgba(45,27,61,0.6) 0%, rgba(74,32,96,0.4) 100%)' }}
            >
              <DeliveryViewer delivery={delivery} />
            </div>
          </div>
        )}

        {/* Awaiting delivery */}
        {order.status === 'PAID' && !delivery && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Clock size={28} className="text-primary" />
            </div>
            <p className="font-display font-semibold">Aguardando sua leitura</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              A leitora está preparando sua consulta com dedicação. Você será notificado quando estiver pronto.
            </p>
          </div>
        )}

        {/* Review form */}
        {order.status === 'DELIVERED' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Star size={14} className="text-gold" />
                Avalie sua experiência
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <StarRating value={rating} onChange={setRating} />
              <textarea
                className="w-full min-h-20 px-3 py-2 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                placeholder="Compartilhe sua experiência com esta leitura..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
              <Button
                className="w-full"
                size="sm"
                loading={submittingReview}
                disabled={rating === 0}
                onClick={submitReview}
              >
                Enviar avaliação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
