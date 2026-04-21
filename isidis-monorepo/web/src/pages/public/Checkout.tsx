import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { GigAddOn, GigRequirement } from '@/types'

const CheckoutForm = lazy(() => import('@/components/checkout/CheckoutForm').then((mod) => ({ default: mod.CheckoutForm })))


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
      <div className="flex min-h-screen items-center justify-center bg-[#05040d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05040d] text-white">
        <p>Serviço não encontrado.</p>
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_24%),linear-gradient(180deg,_#05040d,_#0b0916_32%,_#07060f_100%)]">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
            gigTitle={gig.title}
            gigDescription={gig.description}
            gigImageUrl={gig.image_url}
            readerName={reader?.full_name}
            readerAvatarUrl={reader?.avatar_url}
            deliveryHours={gig.delivery_time_hours}
            basePrice={basePrice}
            addOnsTotal={addOnsTotal}
          />
        </Suspense>
      </div>
    </div>
  )
}
