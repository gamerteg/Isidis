import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  Sparkles,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { checkPaymentStatus, submitCheckoutPayment } from '@/lib/actions/checkout'
import type { GigAddOn, GigRequirement } from '@/types'

type CheckoutMethod = 'PIX' | 'CARD'

interface CheckoutResultState {
  orderId: string
  paymentId: string
  method: CheckoutMethod
  status?: string
  amountCardFee?: number | null
  pix?: {
    qrcode: string | null
    content: string | null
    expiresAt?: string | null
  }
}

interface CheckoutFormProps {
  gigId: string
  readerId: string
  amountTotal: number
  selectedAddOns?: GigAddOn[]
  requirements?: GigRequirement[]
  existingOrderId?: string
  availablePaymentMethods?: CheckoutMethod[]
  // Dados para o resumo (passo 1)
  gigTitle: string
  gigDescription?: string
  gigImageUrl?: string
  readerName?: string
  readerAvatarUrl?: string
  deliveryHours?: number
  basePrice: number
  addOnsTotal?: number
}

function formatBRL(value?: number | null) {
  if (!value) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatBRLFromCents(cents?: number | null) {
  if (!cents) return 'R$ 0,00'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CheckoutForm({
  gigId,
  readerId: _readerId,
  amountTotal,
  selectedAddOns = [],
  requirements = [],
  existingOrderId,
  availablePaymentMethods = ['PIX', 'CARD'],
  gigTitle,
  gigDescription,
  gigImageUrl,
  readerName,
  readerAvatarUrl,
  deliveryHours,
  basePrice,
  addOnsTotal = 0,
}: CheckoutFormProps) {
  const navigate = useNavigate()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const acceptsPix = availablePaymentMethods.includes('PIX')
  const acceptsCard = availablePaymentMethods.includes('CARD')

  const [method, setMethod] = useState<CheckoutMethod>(acceptsPix ? 'PIX' : 'CARD')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(existingOrderId || null)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResultState | null>(null)
  const [requirementsAnswers, setRequirementsAnswers] = useState<Record<string, string>>({})
  const [pollCount, setPollCount] = useState(0)
  const [pollError, setPollError] = useState(false)

  // Passo: summary → (requirements) → payment
  const steps = useMemo(
    () => requirements.length > 0
      ? ['summary', 'requirements', 'payment'] as const
      : ['summary', 'payment'] as const,
    [requirements.length],
  )
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = steps[stepIndex]

  const goNext = () => setStepIndex(i => Math.min(i + 1, steps.length - 1))
  const goBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const requiredQuestions = useMemo(
    () => requirements.filter((r) => r.required),
    [requirements],
  )
  const selectedAddOnIds = useMemo(
    () => selectedAddOns.map((a) => a.id),
    [selectedAddOns],
  )

  // Polling de status após PIX gerado
  useEffect(() => {
    if (!checkoutResult?.paymentId) return
    setPollCount(0)
    setPollError(false)
    const paymentId = checkoutResult.paymentId
    const orderId = checkoutResult.orderId
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(paymentId, orderId)
        setPollError(false)
        if (result.status === 'PAID') {
          clearInterval(pollingIntervalRef.current!)
          toast.success('Pagamento confirmado!')
          navigate(`/dashboard/pedido/${result.orderId}`)
        } else {
          setPollCount(c => c + 1)
        }
      } catch {
        setPollError(true)
        setPollCount(c => c + 1)
      }
    }, 5000)
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current) }
  }, [checkoutResult?.paymentId, navigate])

  const validateRequirements = useCallback((answers: Record<string, string>) => {
    const missing = requiredQuestions.filter((q) => !answers[q.id]?.trim())
    if (missing.length === 0) return null
    return 'Preencha as informacoes obrigatorias para continuar.'
  }, [requiredQuestions])

  const handleCardProSubmit = useCallback(async () => {
    const err = validateRequirements(requirementsAnswers)
    if (err) { setError(err); return }
    setSubmitting(true); setError('')
    try {
      const result = await submitCheckoutPayment({
        order_id: orderId ?? existingOrderId,
        gig_id: gigId,
        add_on_ids: selectedAddOnIds,
        requirements_answers: requirementsAnswers,
        payment_method: 'CARD',
      })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      } else {
        setError('Nao foi possivel obter o link de pagamento. Tente novamente.')
        setSubmitting(false)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Nao foi possivel processar o pagamento.')
      setSubmitting(false)
    }
  }, [existingOrderId, gigId, orderId, requirementsAnswers, selectedAddOnIds, validateRequirements])

  const handlePixDirectSubmit = useCallback(async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await submitCheckoutPayment({
        order_id: orderId ?? existingOrderId,
        gig_id: gigId,
        add_on_ids: selectedAddOnIds,
        requirements_answers: requirementsAnswers,
        payment_method: 'PIX',
      })
      const resolvedOrderId = result.order_id
      const paymentId = result.payment_id ?? result.mercadopago_payment_id ?? result.pix_qr_code_id
      setOrderId(resolvedOrderId)
      if (!paymentId) throw new Error('Não foi possível identificar o pagamento.')
      setCheckoutResult({
        orderId: resolvedOrderId, paymentId, method: 'PIX',
        status: result.status,
        pix: result.pix ? {
          qrcode: result.pix.qr_code_base64,
          content: result.pix.copy_paste_code,
          expiresAt: result.pix.expires_at,
        } : undefined,
      })
      toast.success('PIX gerado com sucesso!')
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível processar o pagamento.')
    } finally {
      setSubmitting(false)
    }
  }, [existingOrderId, gigId, orderId, requirementsAnswers, selectedAddOnIds])

  const copyToClipboard = async () => {
    const content = checkoutResult?.pix?.content
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      const el = document.createElement('textarea')
      el.value = content; el.style.position = 'fixed'; el.style.opacity = '0'
      document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true)
    toast.success('Codigo PIX copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const pixActive = checkoutResult?.method === 'PIX' && checkoutResult.pix
  const totalSteps = steps.length

  // ─── Progress bar ───────────────────────────────────────────────────────────
  const progressBar = (
    <div className="flex gap-1.5 mb-8">
      {steps.map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= stepIndex ? 'bg-primary' : 'bg-white/10'}`}
        />
      ))}
    </div>
  )

  // ─── Passo 1: Resumo ────────────────────────────────────────────────────────
  if (currentStep === 'summary') {
    return (
      <div className="w-full">
        {progressBar}

        {/* Imagem do serviço */}
        <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-6 bg-white/5">
          {gigImageUrl || readerAvatarUrl ? (
            <img
              src={gigImageUrl || readerAvatarUrl}
              alt={gigTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-12 w-12 text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5">
            <h1 className="text-2xl font-display font-light text-white leading-tight">{gigTitle}</h1>
            {readerName && (
              <p className="text-sm text-slate-300 mt-1">com {readerName}</p>
            )}
          </div>
        </div>

        {/* Descrição */}
        {gigDescription && (
          <p className="text-sm text-slate-400 leading-6 mb-6 line-clamp-3">{gigDescription}</p>
        )}

        {/* Detalhes */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Clock3 className="h-4 w-4 text-sky-300 mb-2" />
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Entrega</p>
            <p className="text-sm font-semibold text-white mt-1">{deliveryHours || 48}h</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Sparkles className="h-4 w-4 text-violet-300 mb-2" />
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Extras</p>
            <p className="text-sm font-semibold text-white mt-1">{selectedAddOns.length} item(ns)</p>
          </div>
        </div>

        {/* Preço */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-8 space-y-3 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Serviço base</span>
            <span>{formatBRL(basePrice)}</span>
          </div>
          {selectedAddOns.map((a) => (
            <div key={a.id} className="flex justify-between text-slate-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {a.title}
              </span>
              <span>{formatBRLFromCents(a.price)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
            <span>Total</span>
            <span className="text-gradient-violet">{formatBRL(amountTotal)}</span>
          </div>
        </div>

        <Button
          onClick={goNext}
          className="w-full py-6 text-base font-bold rounded-2xl aurora border-shine text-white hover:opacity-90"
        >
          Continuar
        </Button>
      </div>
    )
  }

  // ─── Passo 2: Perguntas ─────────────────────────────────────────────────────
  if (currentStep === 'requirements') {
    const handleRequirementsNext = () => {
      const err = validateRequirements(requirementsAnswers)
      if (err) { setError(err); return }
      setError('')
      goNext()
    }

    return (
      <div className="w-full">
        {progressBar}

        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h2 className="text-xl font-display font-light text-white mb-1">Informações para a leitura</h2>
        <p className="text-sm text-slate-400 mb-6">Sua cartomante receberá essas respostas junto com o pedido.</p>

        <div className="space-y-5 mb-8">
          {requirements.map((req) => (
            <div key={req.id} className="space-y-2">
              <Label className="text-sm text-slate-200">
                {req.question}
                {req.required && <span className="ml-1 text-rose-400">*</span>}
              </Label>
              {req.type === 'choice' && req.options?.length ? (
                <select
                  value={requirementsAnswers[req.id] || ''}
                  onChange={(e) => setRequirementsAnswers(cur => ({ ...cur, [req.id]: e.target.value }))}
                  className="flex h-11 w-full rounded-xl border border-white/10 bg-[#0c0b17] px-3 text-sm text-slate-100 outline-none transition focus:border-primary"
                >
                  <option value="">Selecione uma opcao</option>
                  {req.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Textarea
                  value={requirementsAnswers[req.id] || ''}
                  onChange={(e) => setRequirementsAnswers(cur => ({ ...cur, [req.id]: e.target.value }))}
                  placeholder="Escreva aqui..."
                  className="min-h-[110px] rounded-2xl border-white/10 bg-[#0c0b17] text-slate-100 placeholder:text-slate-500"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <Button
          onClick={handleRequirementsNext}
          className="w-full py-6 text-base font-bold rounded-2xl aurora border-shine text-white hover:opacity-90"
        >
          Continuar para o pagamento
        </Button>
      </div>
    )
  }

  // ─── Passo 3: Pagamento ─────────────────────────────────────────────────────
  const paymentStep = (
    <div className="w-full">
      {progressBar}

      {!checkoutResult && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      {/* Resumo compacto */}
      {!checkoutResult && (
        <div className="flex items-center justify-between mb-6 px-1">
          <span className="text-sm text-slate-300 truncate max-w-[60%]">{gigTitle}</span>
          <span className="text-base font-semibold text-white">{formatBRL(amountTotal)}</span>
        </div>
      )}

      {/* Tabs PIX / Cartão */}
      {!checkoutResult && acceptsPix && acceptsCard && (
        <Tabs value={method} onValueChange={(v) => setMethod(v as CheckoutMethod)} className="mb-5">
          <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white/5 p-1">
            <TabsTrigger value="PIX" className="rounded-xl py-3 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
              <QrCode className="h-4 w-4 mr-2" /> PIX
            </TabsTrigger>
            <TabsTrigger value="CARD" className="rounded-xl py-3 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-300">
              <CreditCard className="h-4 w-4 mr-2" /> Cartão
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Resultado PIX */}
      {pixActive ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> PIX pronto para pagamento
            </div>
            {checkoutResult?.pix?.qrcode && (
              <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4 shadow-xl">
                <img
                  src={checkoutResult.pix.qrcode.startsWith('data:') ? checkoutResult.pix.qrcode : `data:image/png;base64,${checkoutResult.pix.qrcode}`}
                  alt="QR Code PIX"
                  className="h-52 w-52 rounded-lg"
                />
              </div>
            )}
            <p className="mt-4 text-sm text-slate-300">Escaneie no seu banco ou copie o código abaixo.</p>
            {checkoutResult?.pix?.expiresAt && (
              <p className="mt-1 text-xs text-slate-500">
                Expira em {new Date(checkoutResult.pix.expiresAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {checkoutResult?.pix?.content && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <Label className="mb-2 block text-xs uppercase tracking-widest text-slate-500">Código copia e cola</Label>
              <Textarea
                readOnly
                value={checkoutResult.pix.content}
                className="min-h-[120px] rounded-2xl border-white/10 bg-[#090812] font-mono text-xs text-slate-200"
              />
              <Button
                type="button"
                onClick={() => void copyToClipboard()}
                variant="secondary"
                className="mt-3 w-full rounded-xl bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Código copiado' : 'Copiar código PIX'}
              </Button>
            </div>
          )}

          {/* Status do polling */}
          {pollError ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200 text-center space-y-3">
              <p>Não conseguimos verificar o status automaticamente.</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full rounded-xl text-amber-200 hover:text-white border border-amber-500/30"
              >
                Ver meus pedidos
              </Button>
            </div>
          ) : pollCount >= 24 ? (
            <div className="rounded-2xl border border-slate-500/30 bg-slate-500/10 px-4 py-4 text-sm text-slate-300 text-center space-y-3">
              <p>O pagamento pode levar alguns minutos para ser confirmado pelo banco.</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full rounded-xl text-slate-300 hover:text-white border border-slate-500/30"
              >
                Já paguei — Ver meus pedidos
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando confirmação do banco...
            </div>
          )}
        </div>

      ) : method === 'CARD' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-4 text-sm text-sky-200 text-center leading-6">
            Você será redirecionado para o <span className="font-semibold">Mercado Pago</span> para finalizar o pagamento com segurança.
          </div>
          <Button
            type="button"
            onClick={() => void handleCardProSubmit()}
            disabled={submitting}
            className="w-full py-6 text-base font-bold rounded-2xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Preparando pagamento...</>
            ) : (
              <><CreditCard className="h-5 w-5 mr-2" /> Pagar {formatBRL(amountTotal)}</>
            )}
          </Button>
        </div>

      ) : (
        /* PIX — chamada direta, sem Brick */
        <div className="space-y-4">
          <Button
            type="button"
            onClick={() => void handlePixDirectSubmit()}
            disabled={submitting}
            className="w-full py-6 text-base font-bold rounded-2xl aurora border-shine text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Gerando PIX...</>
            ) : (
              <><QrCode className="h-5 w-5 mr-2" /> Gerar QR Code PIX — {formatBRL(amountTotal)}</>
            )}
          </Button>
        </div>
      )}
    </div>
  )

  return paymentStep
}
