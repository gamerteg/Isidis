import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, CreditCard, QrCode, Plus, Minus, Check } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { api, type Gig, type AddOn } from '@/lib/api'
import { formatCurrency, DELIVERY_METHOD_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'

export function GigDetailPage() {
  const { gigId } = useParams<{ gigId: string }>()
  const navigate = useNavigate()
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  const { data, isLoading } = useSWR(
    gigId ? `/gigs/${gigId}` : null,
    () => api.get<{ data: Gig & { profiles: any } }>(`/gigs/${gigId}`),
  )

  const gig = data?.data

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const totalAddOns = (gig?.add_ons ?? [])
    .filter((a: AddOn) => selectedAddOns.includes(a.id))
    .reduce((sum: number, a: AddOn) => sum + a.price, 0)

  const totalPrice = (gig?.price ?? 0) + totalAddOns

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Serviço não encontrado</p>
      </div>
    )
  }

  const reader = (gig as any).profiles

  return (
    <div className="animate-fade-in pb-32">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Image */}
      {gig.image_url && (
        <img src={gig.image_url} alt={gig.title} className="w-full h-52 object-cover" />
      )}

      <div className="px-5 py-5 space-y-5">
        {/* Title & price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{gig.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Entrega em até {gig.delivery_time_hours}h</span>
              <Badge variant="muted">{DELIVERY_METHOD_MAP[gig.delivery_method] ?? gig.delivery_method}</Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gold">{formatCurrency(gig.price)}</p>
          </div>
        </div>

        {/* Reader info */}
        {reader && (
          <button
            onClick={() => navigate(`/leitora/${reader.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
          >
            <Avatar src={reader.avatar_url} name={reader.full_name} size="md" />
            <div className="text-left">
              <p className="text-sm font-medium">{reader.full_name}</p>
              <p className="text-xs text-muted-foreground">Ver perfil completo →</p>
            </div>
          </button>
        )}

        {/* Description */}
        <div>
          <h2 className="font-semibold text-sm mb-2">Sobre este serviço</h2>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
            {gig.description}
          </p>
        </div>

        {/* Tags */}
        {gig.tags && gig.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {gig.tags.map(tag => (
              <Badge key={tag} variant="muted">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Add-ons */}
        {gig.add_ons && gig.add_ons.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm mb-3">Extras opcionais</h2>
            <div className="space-y-2">
              {gig.add_ons.map((addon: AddOn) => {
                const selected = selectedAddOns.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddOn(addon.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-primary bg-primary' : 'border-border'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{addon.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-gold">+{formatCurrency(addon.price)}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment methods */}
        <div>
          <h2 className="font-semibold text-sm mb-2">Formas de pagamento</h2>
          <div className="flex gap-2">
            {(gig.payment_methods ?? ['PIX', 'CARD']).includes('PIX') && (
              <Badge variant="success"><QrCode size={12} /> PIX</Badge>
            )}
            {(gig.payment_methods ?? ['PIX', 'CARD']).includes('CARD') && (
              <Badge variant="info"><CreditCard size={12} /> Cartão</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-5 py-4 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            Total{selectedAddOns.length > 0 ? ` (${selectedAddOns.length} extras)` : ''}
          </span>
          <span className="text-xl font-bold text-gold">{formatCurrency(totalPrice)}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate(`/checkout/${gig.id}`, { state: { selectedAddOns } })}
        >
          Contratar agora
        </Button>
      </div>
    </div>
  )
}
