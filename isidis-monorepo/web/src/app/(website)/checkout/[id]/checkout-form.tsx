import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { initMercadoPago, Payment, StatusScreen } from '@mercadopago/sdk-react'
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  checkPaymentStatus,
  getCheckoutConfig,
  submitCheckoutPayment,
} from '@/app/(website)/checkout/actions'
import type { CheckoutConfigResponse, GigAddOn, GigRequirement } from '@/types'

type CheckoutMethod = 'PIX' | 'CARD'

type BrickFormData = {
  paymentType: string
  selectedPaymentMethod: string
  formData: {
    token?: string
    issuer_id?: string
    payment_method_id?: string
    transaction_amount?: number
    installments?: number
    payer?: {
      email?: string
      first_name?: string
      last_name?: string
      firstName?: string
      lastName?: string
      identification?: {
        type?: string
        number?: string
      }
      address?: {
        zip_code?: string
        street_number?: string | number
        federal_unit?: string
        city?: string
        neighborhood?: string
        street_name?: string
      }
    }
  }
}

type BrickAdditionalData = {
  bin?: string
  lastFourDigits?: string
  cardholderName?: string
  paymentTypeId?: string
}

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
}

function formatCurrencyFromCents(cents?: number | null) {
  if (!cents) return 'R$ 0,00'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCurrencyFromReais(value?: number | null) {
  if (!value) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CheckoutForm({
  gigId,
  readerId: _readerId,
  amountTotal,
  selectedAddOns = [],
  requirements = [],
  existingOrderId,
  availablePaymentMethods = ['PIX', 'CARD'],
}: CheckoutFormProps) {
  const navigate = useNavigate()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const acceptsPix = availablePaymentMethods.includes('PIX')
  const acceptsCard = availablePaymentMethods.includes('CARD')

  const [method, setMethod] = useState<CheckoutMethod>(acceptsPix ? 'PIX' : 'CARD')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [sdkReady, setSdkReady] = useState(false)
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfigResponse | null>(null)
  const [orderId, setOrderId] = useState<string | null>(existingOrderId || null)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResultState | null>(null)
  const [requirementsAnswers, setRequirementsAnswers] = useState<Record<string, string>>({})

  const requiredQuestions = useMemo(
    () => requirements.filter((requirement) => requirement.required),
    [requirements],
  )
  const selectedAddOnIds = useMemo(
    () => selectedAddOns.map((addOn) => addOn.id),
    [selectedAddOns],
  )

  useEffect(() => {
    let cancelled = false

    async function loadCheckoutConfig() {
      try {
        const config = await getCheckoutConfig()
        if (cancelled) return

        initMercadoPago(config.public_key, { locale: config.locale })
        setCheckoutConfig(config)
        setSdkReady(true)
      } catch (checkoutConfigError: any) {
        if (cancelled) return
        setError(checkoutConfigError?.message ?? 'Nao foi possivel carregar o checkout do Mercado Pago.')
      } finally {
        if (!cancelled) {
          setConfigLoading(false)
        }
      }
    }

    void loadCheckoutConfig()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!checkoutResult?.paymentId) return

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(checkoutResult.paymentId)
        if (result.status === 'PAID') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          toast.success('Pagamento confirmado com sucesso!')
          navigate(`/dashboard/pedido/${result.orderId}`)
        }
      } catch {
        // Mantemos o polling rodando ate a confirmacao final.
      }
    }, 4000)

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [checkoutResult?.paymentId, navigate])

  const validateRequirements = useCallback((answers: Record<string, string>) => {
    const missing = requiredQuestions.filter((question) => !answers[question.id]?.trim())
    if (missing.length === 0) return null
    return 'Preencha as informacoes obrigatorias para continuar com o pedido.'
  }, [requiredQuestions])

  const paymentBrickCustomization = useMemo<ComponentProps<typeof Payment>['customization']>(() => {
    if (method === 'PIX') {
      return {
        paymentMethods: {
          bankTransfer: 'all',
          types: {
            included: ['bank_transfer'],
          },
        },
        visual: {
          defaultPaymentOption: {
            bankTransferForm: true,
          },
        },
      }
    }

    return {
      paymentMethods: {
        creditCard: 'all',
        debitCard: 'all',
        minInstallments: 1,
        maxInstallments: 1,
        types: {
          included: ['creditCard', 'debitCard'],
        },
      },
      visual: {
        defaultPaymentOption: {
          creditCardForm: true,
        },
      },
    }
  }, [method])

  const handleCardProSubmit = useCallback(async () => {
    const requirementsError = validateRequirements(requirementsAnswers)
    if (requirementsError) {
      setError(requirementsError)
      return
    }

    setSubmitting(true)
    setError('')

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
    } catch (err: any) {
      setError(err?.message ?? 'Nao foi possivel processar o pagamento.')
      setSubmitting(false)
    }
  }, [existingOrderId, gigId, orderId, requirementsAnswers, selectedAddOnIds, validateRequirements])

  const handleBrickSubmit = useCallback(async (paymentData: BrickFormData, additionalData?: BrickAdditionalData | null) => {
    const requirementsError = validateRequirements(requirementsAnswers)
    if (requirementsError) {
      setError(requirementsError)
      throw new Error(requirementsError)
    }

    setSubmitting(true)
    setError('')

    try {
      const result = await submitCheckoutPayment({
        order_id: orderId ?? existingOrderId,
        gig_id: gigId,
        add_on_ids: selectedAddOnIds,
        requirements_answers: requirementsAnswers,
        payment_method: method,
        transaction_amount: paymentData.formData.transaction_amount,
        card_token: paymentData.formData.token,
        payment_method_id: paymentData.formData.payment_method_id,
        installments: paymentData.formData.installments,
        issuer_id: paymentData.formData.issuer_id,
        payer: paymentData.formData.payer,
        brick_payment_type: paymentData.paymentType,
        brick_selected_payment_method: paymentData.selectedPaymentMethod,
        brick_additional_data: additionalData ?? undefined,
        card_holder_name: additionalData?.cardholderName,
      })

      const resolvedOrderId = result.order_id
      const paymentId =
        result.payment_id ?? result.mercadopago_payment_id ?? result.pix_qr_code_id

      setOrderId(resolvedOrderId)

      if (!paymentId) {
        throw new Error('Mercado Pago nao retornou o identificador do pagamento.')
      }

      const nextResult: CheckoutResultState = {
        orderId: resolvedOrderId,
        paymentId,
        method,
        status: result.status,
        amountCardFee: result.amount_card_fee ?? null,
        pix: result.pix
          ? {
              qrcode: result.pix.qr_code_base64,
              content: result.pix.copy_paste_code,
              expiresAt: result.pix.expires_at,
            }
          : undefined,
      }

      setCheckoutResult(nextResult)

      if (method === 'CARD' && result.status === 'CONFIRMED') {
        toast.success('Pagamento confirmado com sucesso!')
        navigate(`/dashboard/pedido/${resolvedOrderId}`)
        return
      }

      toast.success(
        method === 'PIX'
          ? 'PIX gerado com sucesso!'
          : 'Pagamento enviado ao Mercado Pago. Estamos acompanhando a confirmacao.',
      )
    } catch (submitError: any) {
      const message = submitError?.message ?? 'Nao foi possivel processar o pagamento.'
      setError(message)
      throw submitError
    } finally {
      setSubmitting(false)
    }
  }, [
    existingOrderId,
    gigId,
    method,
    navigate,
    orderId,
    requirementsAnswers,
    selectedAddOnIds,
    validateRequirements,
  ])

  const copyToClipboard = async () => {
    const pixContent = checkoutResult?.pix?.content
    if (!pixContent) return

    try {
      await navigator.clipboard.writeText(pixContent)
    } catch {
      const element = document.createElement('textarea')
      element.value = pixContent
      element.style.position = 'fixed'
      element.style.opacity = '0'
      document.body.appendChild(element)
      element.select()
      document.execCommand('copy')
      document.body.removeChild(element)
    }

    setCopied(true)
    toast.success('Codigo PIX copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const pixActive = checkoutResult?.method === 'PIX' && checkoutResult.pix
  const cardActive = checkoutResult?.method === 'CARD'

  return (
    <div className="w-full space-y-6">
      {(acceptsPix && acceptsCard) ? (
        <Tabs value={method} onValueChange={(value) => setMethod(value as CheckoutMethod)}>
          <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-white/5 p-1">
            <TabsTrigger value="PIX" className="rounded-xl py-3 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
              <QrCode className="h-4 w-4" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="CARD" className="rounded-xl py-3 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-300">
              <CreditCard className="h-4 w-4" />
              Credito e debito
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PIX" className="mt-0">
            <CheckoutBrickCard
              amountTotal={amountTotal}
              configLoading={configLoading}
              sdkReady={sdkReady}
              error={error}
              submitting={submitting}
              requirements={requirements}
              requirementsAnswers={requirementsAnswers}
              setRequirementsAnswers={setRequirementsAnswers}
              pixActive={pixActive}
              checkoutResult={checkoutResult}
              copyToClipboard={copyToClipboard}
              copied={copied}
              paymentBrickCustomization={paymentBrickCustomization}
              handleBrickSubmit={handleBrickSubmit}
              method={method}
              checkoutConfig={checkoutConfig}
            />
          </TabsContent>

          <TabsContent value="CARD" className="mt-0">
            <CheckoutBrickCard
              amountTotal={amountTotal}
              configLoading={configLoading}
              sdkReady={sdkReady}
              error={error}
              submitting={submitting}
              requirements={requirements}
              requirementsAnswers={requirementsAnswers}
              setRequirementsAnswers={setRequirementsAnswers}
              pixActive={false}
              checkoutResult={cardActive ? checkoutResult : null}
              copyToClipboard={copyToClipboard}
              copied={copied}
              paymentBrickCustomization={paymentBrickCustomization}
              handleBrickSubmit={handleBrickSubmit}
              onCardProSubmit={handleCardProSubmit}
              method={method}
              checkoutConfig={checkoutConfig}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <CheckoutBrickCard
          amountTotal={amountTotal}
          configLoading={configLoading}
          sdkReady={sdkReady}
          error={error}
          submitting={submitting}
          requirements={requirements}
          requirementsAnswers={requirementsAnswers}
          setRequirementsAnswers={setRequirementsAnswers}
          pixActive={pixActive}
          checkoutResult={checkoutResult}
          copyToClipboard={copyToClipboard}
          copied={copied}
          paymentBrickCustomization={paymentBrickCustomization}
          handleBrickSubmit={handleBrickSubmit}
          onCardProSubmit={handleCardProSubmit}
          method={method}
          checkoutConfig={checkoutConfig}
        />
      )}
    </div>
  )
}

interface CheckoutBrickCardProps {
  amountTotal: number
  configLoading: boolean
  sdkReady: boolean
  error: string
  submitting: boolean
  requirements: GigRequirement[]
  requirementsAnswers: Record<string, string>
  setRequirementsAnswers: Dispatch<SetStateAction<Record<string, string>>>
  pixActive: CheckoutResultState['pix'] | false | null | undefined
  checkoutResult: CheckoutResultState | null
  copyToClipboard: () => Promise<void>
  copied: boolean
  paymentBrickCustomization: ComponentProps<typeof Payment>['customization']
  handleBrickSubmit: (paymentData: BrickFormData, additionalData?: BrickAdditionalData | null) => Promise<void>
  onCardProSubmit?: () => Promise<void>
  method: CheckoutMethod
  checkoutConfig: CheckoutConfigResponse | null
}

function CheckoutBrickCard({
  amountTotal,
  configLoading,
  sdkReady,
  error,
  submitting,
  requirements,
  requirementsAnswers,
  setRequirementsAnswers,
  pixActive,
  checkoutResult,
  copyToClipboard,
  copied,
  paymentBrickCustomization,
  handleBrickSubmit,
  onCardProSubmit,
  method,
  checkoutConfig,
}: CheckoutBrickCardProps) {
  const statusReturnUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard/pedido/${checkoutResult?.orderId ?? ''}`
    : undefined

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#100f1d]/85 p-5 shadow-[0_30px_120px_rgba(7,6,22,0.45)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {method === 'CARD' ? 'Checkout Pro oficial do Mercado Pago' : 'Checkout Bricks oficial do Mercado Pago'}
            </p>
            <p className="text-xs text-slate-400">
              {method === 'PIX'
                ? 'O PIX e iniciado pelo Brick e a confirmacao segue monitorada pela Isidis.'
                : 'Voce sera redirecionado para o ambiente seguro do Mercado Pago para inserir os dados do cartao.'}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-slate-300 sm:flex">
          <LockKeyhole className="h-3.5 w-3.5 text-slate-400" />
          Ambiente protegido
        </div>
      </div>

      {requirements.length > 0 ? (
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
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {pixActive ? (
        <div className="space-y-5">
          <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              PIX pronto para pagamento
            </div>

            {checkoutResult?.pix?.qrcode ? (
              <div className="mx-auto mt-5 w-fit rounded-[1.25rem] bg-white p-4 shadow-xl">
                <img
                  src={checkoutResult.pix.qrcode.startsWith('data:') ? checkoutResult.pix.qrcode : `data:image/png;base64,${checkoutResult.pix.qrcode}`}
                  alt="QR Code PIX"
                  className="h-52 w-52 rounded-lg"
                />
              </div>
            ) : null}

            <p className="mt-4 text-sm text-slate-300">
              Escaneie o QR Code no seu banco ou copie o codigo abaixo.
            </p>
            {checkoutResult?.pix?.expiresAt ? (
              <p className="mt-1 text-xs text-slate-500">
                Expira em {new Date(checkoutResult.pix.expiresAt).toLocaleString('pt-BR')}
              </p>
            ) : null}
          </div>

          {checkoutResult?.pix?.content ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <Label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">Codigo copia e cola</Label>
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
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Codigo copiado' : 'Copiar codigo PIX'}
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando confirmacao do pagamento para liberar o pedido.
          </div>
        </div>
      ) : checkoutResult?.method === 'CARD' ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-sky-500/15 bg-sky-500/5 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-white">Pagamento enviado ao Mercado Pago</span>
              <span className="rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
                bricks
              </span>
            </div>
            <p className="mt-2 text-slate-400">
              Estamos acompanhando a confirmacao do cartao. Se o emissor exigir validacao extra, o status abaixo sera atualizado automaticamente.
            </p>
            {checkoutResult.amountCardFee ? (
              <p className="mt-3 text-xs text-sky-200">
                Taxa operacional desta cobranca: {formatCurrencyFromCents(checkoutResult.amountCardFee)}.
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white p-3">
            <StatusScreen
              initialization={{ paymentId: checkoutResult.paymentId }}
              customization={statusReturnUrl ? { backUrls: { return: statusReturnUrl, error: statusReturnUrl } } : undefined}
              locale="pt-BR"
            />
          </div>
        </div>
      ) : method === 'CARD' ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">Pagamento com Cartao via Checkout Pro</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Voce sera redirecionado ao ambiente seguro do Mercado Pago.</li>
              <li>Credito e debito disponiveis, 1 parcela sem juros pela Isidis.</li>
              <li>Apos o pagamento, voce voltara automaticamente para acompanhar o pedido.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Valor desta compra: {formatCurrencyFromReais(amountTotal)}.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void onCardProSubmit?.()}
            disabled={submitting}
            className="w-full rounded-2xl bg-sky-600 py-6 text-base font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparando pagamento...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pagar com Cartao
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">PIX com Checkout Bricks</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>O Mercado Pago monta o formulario do PIX direto no Brick.</li>
              <li>Depois da confirmacao, mantemos o QR Code e o acompanhamento aqui na Isidis.</li>
              <li>O pedido nasce no backend com os requisitos preenchidos e o valor validado no servidor.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Valor desta compra: {formatCurrencyFromReais(amountTotal)}.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white p-3">
            {configLoading ? (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando Checkout Bricks...
              </div>
            ) : sdkReady ? (
              <Payment
                key={`pix-${checkoutResult?.paymentId ?? 'new'}`}
                initialization={{
                  amount: amountTotal,
                  payer: checkoutConfig?.payer,
                }}
                customization={paymentBrickCustomization}
                locale="pt-BR"
                onSubmit={handleBrickSubmit}
                onReady={() => undefined}
                onError={(brickError) => {
                  console.error('[MercadoPago Brick]', brickError)
                }}
              />
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-sm text-rose-500">
                Nao foi possivel inicializar o checkout do Mercado Pago.
              </div>
            )}
          </div>

          {submitting ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando dados para o Mercado Pago...
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
