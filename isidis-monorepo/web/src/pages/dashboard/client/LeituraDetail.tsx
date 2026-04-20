import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChatWindow } from '@/components/chat/chat-window'
import { PrintReadingButton } from '@/components/print-reading-button'
import { useAuth } from '@/hooks/useAuth'
import { getOrderDetail } from '@/lib/actions/checkout'
import { ReadingCards } from '@/components/readings/ReadingCards'
import { PhysicalReadingView } from '@/components/readings/PhysicalReadingView'
import type { OrderDetail } from '@/types'

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

function normalizeDigitalCards(deliveryContent: any) {
  const cards = Array.isArray(deliveryContent?.cards) ? deliveryContent.cards : []

  return cards.map((card: any, index: number) => ({
    position_name:
      card.position_name ||
      (card.position === 'reversed' ? `Carta ${index + 1} invertida` : `Carta ${index + 1}`),
    card_image: card.card_image || card.image || fallbackCardImage,
    meaning: card.meaning || card.interpretation || 'Sem interpretacao registrada.',
    audio_url: card.audio_url || card.audioBase64 || null,
    card_name: card.card_name || card.name || undefined,
  }))
}

export default function ReadingRoomPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

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
  const readerAvatar = order?.reader?.avatar_url || undefined

  const normalizedCards = useMemo(() => normalizeDigitalCards(deliveryContent), [deliveryContent])
  const physicalSections = useMemo(() => normalizePhysicalSections(deliveryContent), [deliveryContent])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Carregando leitura...</p>
      </div>
    )
  }

  if (!order) return null

  if ((deliveryContent?.method === 'PHYSICAL' || deliveryContent?.mode === 'physical') && physicalSections.length > 0) {
    return (
      <PhysicalReadingView
        readingTitle={deliveryContent.readingTitle || deliveryContent.summary || order.gigs?.title || 'Sua Leitura'}
        sections={physicalSections}
        readerName={readerName}
        deliveredAt={order.delivered_at || order.created_at}
      />
    )
  }

  const content = {
    summary:
      deliveryContent?.summary ||
      (deliveryContent?.spreadName ? `Leitura: ${deliveryContent.spreadName}` : 'Interpretacao Geral'),
    cards: normalizedCards.length > 0
      ? normalizedCards
      : [
          {
            position_name: 'Passado',
            card_image: fallbackCardImage,
            meaning: 'Conteudo da leitura ainda indisponivel.',
            card_name: 'Aguardando sincronizacao',
          },
        ],
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-12 flex justify-between items-center">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground no-print">
            <Link to={`/dashboard/pedido/${order.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao pedido
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-center">Sua Leitura</h1>
          <div className="w-24 flex justify-end">
            <PrintReadingButton />
          </div>
        </header>

        <ReadingCards cards={content.cards} />

        <Card className="max-w-3xl mx-auto bg-card/60 border-primary/20 backdrop-blur-md p-8 mt-12 shadow-2xl shadow-primary/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Interpretacao da Mestra
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {content.summary}
          </p>
        </Card>
      </div>

      {user && order && (
        <div className="fixed bottom-6 right-6 z-50 no-print">
          <ChatWindow
            currentUser={{ id: user.id }}
            otherUser={{ id: order.reader?.id || '', name: readerName, avatar: readerAvatar }}
            orderId={id}
            title="Dúvidas sobre a leitura?"
            variant="floating"
          />
        </div>
      )}
    </div>
  )
}
