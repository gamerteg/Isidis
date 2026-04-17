import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadMercadoPago } from '@mercadopago/sdk-js'
import type {
  ICardPaymentBrickPayer,
  ICardPaymentFormData,
} from '@mercadopago/sdk-react/esm/bricks/cardPayment/type'
import { Loader2, Copy, CheckCircle2, QrCode, ShieldCheck, CreditCard, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  checkPaymentStatus,
  createCardPayment,
  createPixPayment,
  getCheckoutConfig,
} from '@/app/(website)/checkout/actions'
import type { CheckoutConfigResponse, GigAddOn, GigRequirement } from '@/types'

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string
    MercadoPago?: new (
      publicKey: string,
      options?: {
        locale?: string
      }
    ) => MercadoPagoClient
  }
}

interface PixData {
  qrcode: string
  content: string
  paymentId: string
  expiresAt?: string | null
}

interface CardFormState {
  holder_name: string
  postal_code: string
  address_number: string
}

interface MercadoPagoBrickController {
  unmount?: () => void | Promise<void>
}

interface MercadoPagoBricksBuilder {
  create: (
    name: 'cardPayment',
    containerId: string,
    settings: {
      initialization: {
        amount: number
        payer?: {
          email?: string
          identification?: {
            type: string
            number: string
          }
        }
      }
      customization: {
        paymentMethods: {
          minInstallments: number
          maxInstallments: number
          types: {
            included: readonly string[]
          }
        }
        visual: {
          hideFormTitle: boolean
        }
      }
      callbacks: {
        onReady: () => void
        onSubmit: (formData: ICardPaymentFormData<ICardPaymentBrickPayer>) => Promise<void>
        onError: (error?: { message?: string }) => void
      }
      locale: string
    },
  ) => Promise<MercadoPagoBrickController>
}

interface MercadoPagoClient {
  bricks: () => MercadoPagoBricksBuilder
}

interface MercadoPagoCardBrickProps {
  publicKey: string
  locale: string
  initialization: {
    amount: number
    payer?: {
      email?: string
      identification?: {
        type: string
        number: string
      }
    }
  }
  customization: {
    paymentMethods: {
      minInstallments: number
      maxInstallments: number
      types: {
        included: readonly string[]
      }
    }
    visual: {
      hideFormTitle: boolean
    }
  }
  onReady: () => void
  onSubmit: (formData: ICardPaymentFormData<ICardPaymentBrickPayer>) => Promise<void>
  onError: (error?: { message?: string }) => void
}

interface CheckoutFormProps {
  gigId: string
  readerId: string
  amountTotal: number
  selectedAddOns?: GigAddOn[]
  requirements?: GigRequirement[]
  existingOrderId?: string
}

function formatCurrency(cents?: number | null) {
  if (!cents) return 'R$ 0,00'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function loadMercadoPagoSecurityScript(onDeviceId: (deviceId: string) => void) {
  const updateDeviceId = () => {
    const nextDeviceId = window.MP_DEVICE_SESSION_ID
    if (nextDeviceId) {
      onDeviceId(nextDeviceId)
    }
  }

  updateDeviceId()

  const existingScript = document.getElementById('mercadopago-security-js') as HTMLScriptElement | null
  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      updateDeviceId()
    }

    return () => undefined
  }

  const script = document.createElement('script')
  script.id = 'mercadopago-security-js'
  script.src = 'https://www.mercadopago.com/v2/security.js'
  script.async = true
  script.setAttribute('view', 'checkout')
  script.onload = () => {
    script.dataset.loaded = 'true'
    updateDeviceId()
  }
  document.body.appendChild(script)

  return () => undefined
}

function getBrickErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return 'Nao foi possivel carregar o formulario do Mercado Pago.'
}

const MercadoPagoCardBrick = memo(function MercadoPagoCardBrick({
  publicKey,
  locale,
  initialization,
  customization,
  onReady,
  onSubmit,
  onError,
}: MercadoPagoCardBrickProps) {
  const containerId = useMemo(() => `mp-card-brick-${crypto.randomUUID()}`, [])
  const controllerRef = useRef<MercadoPagoBrickController | null>(null)

  useEffect(() => {
    let disposed = false

    const renderBrick = async () => {
      try {
        await loadMercadoPago()

        if (disposed) return

        if (!window.MercadoPago) {
          throw new Error('SDK do Mercado Pago indisponivel no navegador.')
        }

        const mercadoPago = new window.MercadoPago(publicKey, { locale })
        const bricksBuilder = mercadoPago.bricks()

        if (controllerRef.current?.unmount) {
          await Promise.resolve(controllerRef.current.unmount())
          controllerRef.current = null
        }

        if (disposed) return

        controllerRef.current = await bricksBuilder.create('cardPayment', containerId, {
          initialization,
          customization,
          callbacks: {
            onReady,
            onSubmit,
            onError,
          },
          locale,
        })
      } catch (brickError) {
        if (disposed) return
        onError({ message: getBrickErrorMessage(brickError) })
      }
    }

    void renderBrick()

    return () => {
      disposed = true
      const currentController = controllerRef.current
      controllerRef.current = null

      if (currentController?.unmount) {
        void Promise.resolve(currentController.unmount()).catch(() => undefined)
      }
    }
  }, [containerId, customization, initialization, locale, onError, onReady, onSubmit, publicKey])

  return <div id={containerId} />
})

export function CheckoutForm({
  gigId,
  readerId,
  amountTotal,
  selectedAddOns = [],
  requirements = [],
  existingOrderId,
}: CheckoutFormProps) {
  const navigate = useNavigate()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestRequirementsAnswersRef = useRef<Record<string, string>>({})
  const latestCardFormRef = useRef<CardFormState>({
    holder_name: '',
    postal_code: '',
    address_number: '',
  })
  const latestOrderIdRef = useRef<string | null>(existingOrderId || null)
  const latestDeviceIdRef = useRef('')

  const [method, setMethod] = useState<'PIX' | 'CARD'>('PIX')
  const [loading, setLoading] = useState(false)
  const [cardSubmitting, setCardSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(existingOrderId || null)
  const [copied, setCopied] = useState(false)
  const [cardFee, setCardFee] = useState<number | null>(null)
  const [requirementsAnswers, setRequirementsAnswers] = useState<Record<string, string>>({})
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfigResponse | null>(null)
  const [checkoutConfigError, setCheckoutConfigError] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [cardForm, setCardForm] = useState<CardFormState>({
    holder_name: '',
    postal_code: '',
    address_number: '',
  })

  const requiredQuestions = useMemo(
    () => requirements.filter((requirement) => requirement.required),
    [requirements],
  )
  const selectedAddOnIds = useMemo(
    () => selectedAddOns.map((addOn) => addOn.id),
    [selectedAddOns],
  )
  const brickInitialization = useMemo(
    () => ({
      amount: amountTotal,
      ...(checkoutConfig?.payer && {
        payer: {
          ...(checkoutConfig.payer.email && { email: checkoutConfig.payer.email }),
          ...(checkoutConfig.payer.identification && {
            identification: checkoutConfig.payer.identification,
          }),
        },
      }),
    }),
    [amountTotal, checkoutConfig],
  )
  const brickCustomization = useMemo(
    () => ({
      paymentMethods: {
        minInstallments: 1,
        maxInstallments: 1,
        types: {
          included: ['credit_card' as const],
        },
      },
      visual: {
        hideFormTitle: true,
      },
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false

    void getCheckoutConfig()
      .then((config) => {
        if (cancelled) return

        setCheckoutConfig(config)
      })
      .catch(() => {
        if (cancelled) return
        setCheckoutConfigError('Nao foi possivel carregar o checkout do Mercado Pago agora.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const dispose = loadMercadoPagoSecurityScript((nextDeviceId) => {
      setDeviceId(nextDeviceId)
    })

    const intervalId = window.setInterval(() => {
      if (window.MP_DEVICE_SESSION_ID) {
        setDeviceId(window.MP_DEVICE_SESSION_ID)
      }
    }, 1500)

    return () => {
      dispose()
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    latestRequirementsAnswersRef.current = requirementsAnswers
  }, [requirementsAnswers])

  useEffect(() => {
    latestCardFormRef.current = cardForm
  }, [cardForm])

  useEffect(() => {
    latestOrderIdRef.current = orderId
  }, [orderId])

  useEffect(() => {
    latestDeviceIdRef.current = deviceId
  }, [deviceId])

  useEffect(() => {
    if (!paymentId) return

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(paymentId)
        if (result.status === 'PAID') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          toast.success('Pagamento confirmado com sucesso!')
          navigate(`/dashboard/pedido/${result.orderId}`)
        }
      } catch {
        // Continua o polling ate chegar a confirmacao oficial.
      }
    }, 4000)

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [navigate, paymentId])

  const validateRequirements = useCallback((answers: Record<string, string>) => {
    const missing = requiredQuestions.filter((question) => !answers[question.id]?.trim())
    if (missing.length === 0) return null
    return 'Preencha as informacoes obrigatorias para continuar com o pedido.'
  }, [requiredQuestions])

  const validateCardSupplementalFields = useCallback((cardFormState: CardFormState) => {
    const sanitizedPostalCode = cardFormState.postal_code.replace(/\D/g, '')

    if (!cardFormState.holder_name.trim()) {
      return 'Informe o nome impresso no cartao.'
    }

    if (sanitizedPostalCode.length !== 8) {
      return 'Informe um CEP valido para o titular do cartao.'
    }

    if (!cardFormState.address_number.trim()) {
      return 'Informe o numero do endereco do titular.'
    }

    return null
  }, [])

  const handlePixCheckout = async () => {
    const requirementsError = validateRequirements(requirementsAnswers)
    if (requirementsError) {
      setError(requirementsError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await createPixPayment(
        gigId,
        selectedAddOns.map((addOn) => addOn.id),
        requirementsAnswers,
        orderId ?? existingOrderId,
      )

      if (result.error) {
        setError(result.error)
        return
      }

      if (!result.qrcode || !result.content || !result.pixId || !result.orderId) {
        setError('Nao foi possivel gerar o QR Code do PIX.')
        return
      }

      setPixData({
        qrcode: result.qrcode,
        content: result.content.trim(),
        paymentId: result.pixId,
        expiresAt: result.expiresAt,
      })
      setPaymentId(result.pixId)
      setOrderId(result.orderId)
      toast.success('PIX gerado com sucesso!')
    } finally {
      setLoading(false)
    }
  }

  const handleCardBrickSubmit = useCallback(async (
    formData: ICardPaymentFormData<ICardPaymentBrickPayer>
  ) => {
    const currentRequirementsAnswers = latestRequirementsAnswersRef.current
    const currentCardForm = latestCardFormRef.current
    const currentOrderId = latestOrderIdRef.current
    const currentDeviceId = latestDeviceIdRef.current

    const requirementsError = validateRequirements(currentRequirementsAnswers)
    if (requirementsError) {
      setError(requirementsError)
      throw new Error(requirementsError)
    }

    const cardSupplementalError = validateCardSupplementalFields(currentCardForm)
    if (cardSupplementalError) {
      setError(cardSupplementalError)
      throw new Error(cardSupplementalError)
    }

    setCardSubmitting(true)
    setError('')

    try {
      const result = await createCardPayment(
        gigId,
        selectedAddOnIds,
        currentRequirementsAnswers,
        {
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          issuer_id: formData.issuer_id || undefined,
          holder_name: currentCardForm.holder_name.trim(),
          postal_code: currentCardForm.postal_code.replace(/\D/g, ''),
          address_number: currentCardForm.address_number.trim(),
          device_id: currentDeviceId || undefined,
        },
        currentOrderId ?? existingOrderId,
      )

      if (result.error) {
        setError(result.error)
        throw new Error(result.error)
      }

      if (!result.orderId || !result.paymentId) {
        const genericError = 'Nao foi possivel iniciar a cobranca no cartao.'
        setError(genericError)
        throw new Error(genericError)
      }

      setOrderId(result.orderId)
      setPaymentId(result.paymentId)
      setCardFee(result.amountCardFee ?? null)

      if (result.status === 'CONFIRMED') {
        toast.success('Cartao aprovado!')
        navigate(`/dashboard/pedido/${result.orderId}`)
        return
      }

      toast.success('Pagamento em analise. Vamos acompanhar o status automaticamente.')
    } finally {
      setCardSubmitting(false)
    }
  }, [
    existingOrderId,
    gigId,
    navigate,
    selectedAddOnIds,
    validateCardSupplementalFields,
    validateRequirements,
  ])

  const handleBrickError = useCallback((brickError?: { message?: string }) => {
    const message = brickError?.message || 'Nao foi possivel carregar o formulario do Mercado Pago.'
    setError(message)
  }, [])

  const handleBrickReady = useCallback(() => {
    setError((currentError) =>
      currentError === 'Nao foi possivel carregar o formulario do Mercado Pago.' ? '' : currentError,
    )
  }, [])

  const copyToClipboard = async () => {
    if (!pixData?.content) return
    try {
      await navigator.clipboard.writeText(pixData.content)
    } catch {
      const el = document.createElement('textarea')
      el.value = pixData.content
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    toast.success('Codigo PIX copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const isPollingCard = method === 'CARD' && Boolean(paymentId) && Boolean(orderId)

  return (
    <div className="w-full space-y-6">
      <Tabs value={method} onValueChange={(value) => setMethod(value as 'PIX' | 'CARD')}>
        <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white/5 p-1">
          <TabsTrigger value="PIX" className="rounded-xl py-3 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            <QrCode className="h-4 w-4" />
            PIX instantaneo
          </TabsTrigger>
          <TabsTrigger value="CARD" className="rounded-xl py-3 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-300">
            <CreditCard className="h-4 w-4" />
            Cartao de credito
          </TabsTrigger>
        </TabsList>

        <div className="rounded-[1.75rem] border border-white/10 bg-[#100f1d]/85 p-5 shadow-[0_30px_120px_rgba(7,6,22,0.45)] backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pagamento processado pelo backend da Isidis</p>
                <p className="text-xs text-slate-400">Checkout seguro com tokenizacao oficial do Mercado Pago.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-slate-300 sm:flex">
              <LockKeyhole className="h-3.5 w-3.5 text-slate-400" />
              Ambiente protegido
            </div>
          </div>

          {requirements.length > 0 && (
            <div className="mb-6 space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-sm font-semibold text-white">Informacoes para a leitura</p>
                <p className="text-xs text-slate-400">
                  Essas respostas seguem junto com o pedido para a cartomante assim que o pagamento for confirmado.
                </p>
              </div>

              <div className="space-y-4">
                {requirements.map((requirement) => (
                  <div key={requirement.id} className="space-y-2">
                    <Label className="text-sm text-slate-200">
                      {requirement.question}
                      {requirement.required ? <span className="ml-1 text-rose-400">*</span> : null}
                    </Label>

                    {requirement.type === 'choice' && requirement.options?.length ? (
                      <select
                        value={requirementsAnswers[requirement.id] || ''}
                        onChange={(event) =>
                          setRequirementsAnswers((current) => ({
                            ...current,
                            [requirement.id]: event.target.value,
                          }))
                        }
                        className="flex h-11 w-full rounded-xl border border-white/10 bg-[#0c0b17] px-3 text-sm text-slate-100 outline-none transition focus:border-primary"
                      >
                        <option value="">Selecione uma opcao</option>
                        {requirement.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Textarea
                        value={requirementsAnswers[requirement.id] || ''}
                        onChange={(event) =>
                          setRequirementsAnswers((current) => ({
                            ...current,
                            [requirement.id]: event.target.value,
                          }))
                        }
                        placeholder="Escreva aqui as informacoes que vao orientar a leitura."
                        className="min-h-[110px] rounded-2xl border-white/10 bg-[#0c0b17] text-slate-100 placeholder:text-slate-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <TabsContent value="PIX" className="mt-0 space-y-4">
            {pixData ? (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    PIX pronto para pagamento
                  </div>

                  <div className="mx-auto mt-5 w-fit rounded-[1.25rem] bg-white p-4 shadow-xl">
                    <img
                      src={pixData.qrcode.startsWith('data:') ? pixData.qrcode : `data:image/png;base64,${pixData.qrcode}`}
                      alt="QR Code PIX"
                      className="h-52 w-52 rounded-lg"
                    />
                  </div>

                  <p className="mt-4 text-sm text-slate-300">
                    Escaneie o QR Code no seu banco ou copie o codigo abaixo.
                  </p>
                  {pixData.expiresAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Expira em {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <Label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Codigo copia e cola</Label>
                  <Textarea
                    readOnly
                    value={pixData.content}
                    className="min-h-[120px] rounded-2xl border-white/10 bg-[#090812] font-mono text-xs text-slate-200"
                  />
                  <Button
                    type="button"
                    onClick={copyToClipboard}
                    variant="secondary"
                    className="mt-3 w-full rounded-xl bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Codigo copiado' : 'Copiar codigo PIX'}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando confirmacao do pagamento para liberar o pedido.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">Como funciona</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    <li>Geramos o PIX no momento da confirmacao do pedido.</li>
                    <li>Assim que o pagamento compensar, voce vai direto para o acompanhamento.</li>
                    <li>Os requisitos da leitura ja seguem salvos com a cobranca.</li>
                  </ul>
                </div>

                <Button
                  type="button"
                  onClick={handlePixCheckout}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-emerald-500 text-base font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  {loading && method === 'PIX' ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Gerando PIX
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-5 w-5" />
                      Gerar PIX seguro
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="CARD" className="mt-0 space-y-4">
            <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="holder_name" className="text-slate-200">Nome impresso no cartao</Label>
                <Input
                  id="holder_name"
                  value={cardForm.holder_name}
                  onChange={(event) => setCardForm((current) => ({ ...current, holder_name: event.target.value }))}
                  placeholder="Como aparece no cartao"
                  className="h-12 rounded-xl border-white/10 bg-[#0c0b17] text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-slate-200">CEP do titular</Label>
                <Input
                  id="postal_code"
                  inputMode="numeric"
                  value={cardForm.postal_code}
                  onChange={(event) =>
                    setCardForm((current) => ({
                      ...current,
                      postal_code: event.target.value.replace(/\D/g, '').slice(0, 8),
                    }))
                  }
                  placeholder="00000000"
                  className="h-12 rounded-xl border-white/10 bg-[#0c0b17] text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_number" className="text-slate-200">Numero do endereco</Label>
                <Input
                  id="address_number"
                  value={cardForm.address_number}
                  onChange={(event) => setCardForm((current) => ({ ...current, address_number: event.target.value }))}
                  placeholder="123"
                  className="h-12 rounded-xl border-white/10 bg-[#0c0b17] text-slate-100"
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-sky-500/15 bg-sky-500/5 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">Cartao a vista</span>
                <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                  1 parcela
                </span>
              </div>
              <p className="mt-2 text-slate-400">
                O cartao e tokenizado no navegador pelo Mercado Pago, e a Isidis recebe apenas o token para criar o pagamento.
              </p>
              {deviceId ? (
                <p className="mt-2 text-xs text-slate-500">Protecao antifraude ativa para este checkout.</p>
              ) : null}
              {cardFee ? (
                <p className="mt-3 text-xs text-sky-200">
                  Taxa operacional desta cobranca: {formatCurrency(cardFee)}.
                </p>
              ) : null}
            </div>

            {checkoutConfigError ? (
              <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">
                {checkoutConfigError}
              </div>
            ) : checkoutConfig ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white p-4 text-slate-950 shadow-[0_20px_60px_rgba(8,6,24,0.22)]">
                <MercadoPagoCardBrick
                  publicKey={checkoutConfig.public_key}
                  locale={checkoutConfig.locale}
                  initialization={brickInitialization}
                  customization={brickCustomization}
                  onReady={handleBrickReady}
                  onSubmit={handleCardBrickSubmit}
                  onError={handleBrickError}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-black/20 px-4 py-10 text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando checkout do Mercado Pago...
              </div>
            )}

            {isPollingCard ? (
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cartao enviado. Estamos acompanhando a confirmacao em tempo real.
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Assim que o gateway responder, voce sera levado automaticamente para o pedido {orderId?.slice(0, 8)}.
                </p>
              </div>
            ) : null}

            {cardSubmitting ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando pagamento tokenizado ao Mercado Pago...
              </div>
            ) : null}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
