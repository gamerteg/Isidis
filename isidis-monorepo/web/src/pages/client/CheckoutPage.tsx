import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, QrCode, CreditCard, ChevronRight } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, type Gig } from '@/lib/api'
import { formatCurrency, DELIVERY_METHOD_MAP } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'

type PaymentMethod = 'PIX' | 'CARD'

export function CheckoutPage() {
  const { gigId } = useParams<{ gigId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const selectedAddOns: string[] = location.state?.selectedAddOns ?? []

  const [method, setMethod] = useState<PaymentMethod>('PIX')
  const [requirements, setRequirements] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Card fields
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardPostalCode, setCardPostalCode] = useState('')
  const [cardAddressNumber, setCardAddressNumber] = useState('')

  const { data, isLoading } = useSWR(
    gigId ? `/gigs/${gigId}` : null,
    () => api.get<{ data: Gig & { profiles: any } }>(`/gigs/${gigId}`),
  )

  const gig = data?.data

  const totalAddOns = (gig?.add_ons ?? [])
    .filter(a => selectedAddOns.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0)
  const totalPrice = (gig?.price ?? 0) + totalAddOns

  const handleSubmit = async () => {
    if (!gig) return

    // Validate required requirements
    const missing = (gig.requirements ?? []).filter(
      r => r.required && !requirements[r.id]?.trim()
    )
    if (missing.length > 0) {
      toast.error(`Preencha: ${missing.map(r => r.label).join(', ')}`)
      return
    }

    setLoading(true)
    try {
      if (method === 'PIX') {
        const res = await api.post<any>('/checkout/create', {
          gig_id: gigId,
          add_on_ids: selectedAddOns,
          requirements_answers: requirements,
          payment_method: 'PIX',
        })
        navigate(`/checkout/${gigId}/pix`, {
          state: { pixData: res.data, orderId: res.data.order_id },
        })
      } else {
        // For CARD, we'd need Asaas.js tokenization — redirect to a dedicated card page
        toast.error('Pagamento por cartão requer integração com SDK Asaas. Configure o VITE_ASAAS_ENV para habilitar.')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao processar pedido')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!gig) return null

  const availableMethods = gig.payment_methods ?? ['PIX', 'CARD']

  return (
    <div className="animate-fade-in pb-32">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>
        <h1 className="font-display text-xl font-bold mt-2">Finalizar pedido</h1>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Order summary */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm mb-3">Resumo do pedido</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{gig.title}</span>
                <span>{formatCurrency(gig.price)}</span>
              </div>
              {(gig.add_ons ?? [])
                .filter(a => selectedAddOns.includes(a.id))
                .map(a => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">+ {a.label}</span>
                    <span>{formatCurrency(a.price)}</span>
                  </div>
                ))}
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-gold">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        {(gig.requirements ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm">Informações necessárias</h2>
            {gig.requirements.map(req => (
              <div key={req.id}>
                {req.type === 'text' ? (
                  <Input
                    label={`${req.label}${req.required ? ' *' : ''}`}
                    placeholder="Sua resposta..."
                    value={requirements[req.id] ?? ''}
                    onChange={e => setRequirements(r => ({ ...r, [req.id]: e.target.value }))}
                  />
                ) : (
                  <div>
                    <label className="text-sm font-medium text-foreground/80 block mb-1.5">
                      {req.label}{req.required ? ' *' : ''}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(req.options ?? []).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setRequirements(r => ({ ...r, [req.id]: opt }))}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                            requirements[req.id] === opt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Payment method */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Forma de pagamento</h2>
          {availableMethods.includes('PIX') && (
            <button
              onClick={() => setMethod('PIX')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                method === 'PIX' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <QrCode size={20} className="text-green-400" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">PIX</p>
                <p className="text-xs text-muted-foreground">Aprovação instantânea</p>
              </div>
              {method === 'PIX' && <div className="w-4 h-4 rounded-full bg-primary" />}
            </button>
          )}
          {availableMethods.includes('CARD') && (
            <button
              onClick={() => setMethod('CARD')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                method === 'CARD' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <CreditCard size={20} className="text-blue-400" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Cartão de crédito</p>
                <p className="text-xs text-muted-foreground">Taxa adicional pode ser aplicada</p>
              </div>
              {method === 'CARD' && <div className="w-4 h-4 rounded-full bg-primary" />}
            </button>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-5 py-4 bg-background/95 backdrop-blur-md border-t border-border">
        <Button className="w-full" size="lg" loading={loading} onClick={handleSubmit}>
          {method === 'PIX' ? 'Gerar QR Code PIX' : 'Pagar com Cartão'}
        </Button>
      </div>
    </div>
  )
}
