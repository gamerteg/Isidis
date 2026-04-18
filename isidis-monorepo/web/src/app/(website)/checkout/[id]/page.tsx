import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3, ShieldCheck, Sparkles, User } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { GigAddOn, GigRequirement } from '@/types'

const CheckoutForm = lazy(() => import('./checkout-form').then((mod) => ({ default: mod.CheckoutForm })))

function formatCurrencyFromCents(value: number) {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCurrencyFromReais(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [gig, setGig] = useState<any>(null)
  const [reader, setReader] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const addons = searchParams.get('addons') || ''
  const orderId = searchParams.get('order_id') || undefined
  const selectedAddOnIds = addons ? addons.split(',') : []

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const nextPath = `/checkout/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      navigate(`/login?next=${encodeURIComponent(nextPath)}`)
      return
    }
    if (!id) return

    const supabase = createClient()

    supabase
      .from('gigs')
      .select('id, title, description, price, image_url, owner_id, add_ons, requirements, delivery_time_hours, payment_methods')
      .eq('id', id)
      .single()
      .then(async ({ data: gigData }) => {
        if (!gigData) {
          setLoading(false)
          return
        }

        setGig(gigData)

        const { data: readerData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, rating_average, reviews_count')
          .eq('id', gigData.owner_id)
          .single()

        setReader(readerData)
        setLoading(false)
      })
  }, [authLoading, id, navigate, searchParams, user])

  const selectedAddOns = useMemo(
    () => ((gig?.add_ons || []) as GigAddOn[]).filter((addOn) => selectedAddOnIds.includes(addOn.id)),
    [gig?.add_ons, selectedAddOnIds],
  )

  if (authLoading || loading) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-24 text-white">
        <p>Carregando checkout...</p>
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-24 text-white">
        <p>Servico nao encontrado.</p>
      </div>
    )
  }

  const basePrice = gig.price / 100
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + (addOn.price / 100), 0)
  const orderTotal = basePrice + addOnsTotal
  const requirements = (gig.requirements || []) as GigRequirement[]
  const paymentMethods = Array.isArray(gig.payment_methods)
    ? gig.payment_methods.filter((method: unknown): method is 'PIX' | 'CARD' =>
        method === 'PIX' || method === 'CARD',
      )
    : ['PIX', 'CARD']

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_24%),linear-gradient(180deg,_#05040d,_#0b0916_32%,_#07060f_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 md:px-6 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:py-10">
        <section className="order-1 relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-transparent blur-3xl" />

          <Suspense
            fallback={
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-slate-400">
                Carregando checkout...
              </div>
            }
          >
            <CheckoutForm
              gigId={gig.id}
              readerId={gig.owner_id}
              amountTotal={orderTotal}
              selectedAddOns={selectedAddOns}
              requirements={requirements}
              existingOrderId={orderId}
              availablePaymentMethods={paymentMethods}
            />
          </Suspense>
        </section>

        <aside className="order-2 lg:sticky lg:top-8">
          <div className="border-shine overflow-hidden rounded-[1.75rem] bg-[#110d22]/80 p-5 shadow-[0_30px_100px_rgba(8,6,24,0.28)] backdrop-blur-xl md:p-6">
            <div className="flex items-start gap-4">
              {gig.image_url ? (
                <img
                  src={gig.image_url}
                  alt={gig.title}
                  className="h-20 w-20 rounded-[1.25rem] border border-white/10 object-cover"
                />
              ) : reader?.avatar_url ? (
                <img
                  src={reader.avatar_url}
                  alt={reader.full_name || ''}
                  className="h-20 w-20 rounded-[1.25rem] border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[1.25rem] border border-white/10 bg-white/5">
                  <User className="h-8 w-8 text-slate-500" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                    Resumo do pedido
                  </span>
                  <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Checkout seguro
                  </span>
                </div>

                <h1 className="text-xl font-semibold leading-tight text-white md:text-2xl">
                  {gig.title}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  com {reader?.full_name || 'Cartomante Isidis'}
                </p>
              </div>
            </div>

            {gig.description ? (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                {gig.description}
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <Clock3 className="h-4 w-4 text-sky-300" />
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Entrega</p>
                <p className="mt-1 text-sm font-semibold text-white">{gig.delivery_time_hours || 48}h</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Extras</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedAddOns.length} item(ns)</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-[#0d0b18]/80 p-4">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Servico base</span>
                  <span>{formatCurrencyFromCents(gig.price)}</span>
                </div>

                {selectedAddOns.map((addOn) => (
                  <div key={addOn.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {addOn.title}
                    </span>
                    <span>{formatCurrencyFromCents(addOn.price)}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
                  <span>Total</span>
                  <span className="font-mono text-gradient-violet">{formatCurrencyFromReais(orderTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pagamento e acompanhamento centralizados</p>
                <p className="mt-1 text-xs leading-6 text-slate-400">
                  O pedido nasce no backend e segue para o mesmo detalhe de acompanhamento depois da confirmacao.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
