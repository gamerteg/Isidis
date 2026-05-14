import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { checkPaymentStatus, submitCheckoutPayment } from '@/lib/actions/checkout'
import {
    OrbBackground,
    StepProgressBar,
    PixPaymentStep,
    TarotMini,
    getArcanoFor,
} from '@/components/design'
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
    readerName,
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
    const [submitting, setSubmitting] = useState(false)
    const [orderId, setOrderId] = useState<string | null>(existingOrderId || null)
    const [checkoutResult, setCheckoutResult] = useState<CheckoutResultState | null>(null)
    const [requirementsAnswers, setRequirementsAnswers] = useState<Record<string, string>>({})
    const [pollCount, setPollCount] = useState(0)
    const [pollError, setPollError] = useState(false)

    const steps = useMemo(
        () =>
            requirements.length > 0
                ? (['confirm', 'pergunta', 'pagamento'] as const)
                : (['confirm', 'pagamento'] as const),
        [requirements.length],
    )
    const [stepIndex, setStepIndex] = useState(0)
    const currentStep = steps[stepIndex]

    const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

    const requiredQuestions = useMemo(() => requirements.filter((r) => r.required), [requirements])
    const selectedAddOnIds = useMemo(() => selectedAddOns.map((a) => a.id), [selectedAddOns])

    const stepLabels = useMemo(() => {
        if (requirements.length > 0) return ['Confirmar', 'Perguntas', 'Pagamento']
        return ['Confirmar', 'Pagamento']
    }, [requirements.length])

    // Polling após PIX gerado
    useEffect(() => {
        if (!checkoutResult?.paymentId) return
        setPollCount(0)
        setPollError(false)
        const paymentId = checkoutResult.paymentId
        const oid = checkoutResult.orderId
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const result = await checkPaymentStatus(paymentId, oid)
                setPollError(false)
                if (result.status === 'PAID') {
                    clearInterval(pollingIntervalRef.current!)
                    toast.success('Pagamento confirmado!')
                    navigate(`/dashboard/pedido/${result.orderId}`)
                } else {
                    setPollCount((c) => c + 1)
                }
            } catch {
                setPollError(true)
                setPollCount((c) => c + 1)
            }
        }, 3000)
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        }
    }, [checkoutResult?.paymentId, navigate])

    const validateRequirements = useCallback(
        (answers: Record<string, string>) => {
            const missing = requiredQuestions.filter((q) => !answers[q.id]?.trim())
            if (missing.length === 0) return null
            return 'Preencha as informações obrigatórias para continuar.'
        },
        [requiredQuestions],
    )

    const handleCardProSubmit = useCallback(async () => {
        const err = validateRequirements(requirementsAnswers)
        if (err) {
            setError(err)
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
                setError('Não foi possível obter o link de pagamento. Tente novamente.')
                setSubmitting(false)
            }
        } catch (e: any) {
            setError(e?.message ?? 'Não foi possível processar o pagamento.')
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
            const paymentId =
                result.payment_id ?? result.mercadopago_payment_id ?? result.pix_qr_code_id
            setOrderId(resolvedOrderId)
            if (!paymentId) throw new Error('Não foi possível identificar o pagamento.')
            setCheckoutResult({
                orderId: resolvedOrderId,
                paymentId,
                method: 'PIX',
                status: result.status,
                pix: result.pix
                    ? {
                          qrcode: result.pix.qr_code_base64,
                          content: result.pix.copy_paste_code,
                          expiresAt: result.pix.expires_at,
                      }
                    : undefined,
            })
            toast.success('PIX gerado com sucesso!')
        } catch (e: any) {
            setError(e?.message ?? 'Não foi possível processar o pagamento.')
        } finally {
            setSubmitting(false)
        }
    }, [existingOrderId, gigId, orderId, requirementsAnswers, selectedAddOnIds])

    const pixActive = checkoutResult?.method === 'PIX' && checkoutResult.pix
    const arcanoData = getArcanoFor(gigTitle)

    // ─── Passo 1: Confirmar serviço ─────────────────────────────────────────────
    if (currentStep === 'confirm') {
        return (
            <div style={{ position: 'relative' }}>
                <OrbBackground
                    orbs={[{ color: '#8b5cf6', size: 200, top: -60, right: -40, opacity: 0.18 }]}
                />

                <StepProgressBar steps={stepLabels} current={0} />

                <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(91,33,182,.3) 0%, rgba(30,20,60,.7) 100%)',
                            border: '1px solid rgba(167,139,250,.2)',
                            borderRadius: 20,
                            padding: '20px 18px',
                            display: 'flex',
                            gap: 14,
                            alignItems: 'flex-start',
                        }}
                    >
                        <TarotMini
                            arcano={arcanoData.arcano}
                            arcanoName={gigTitle}
                            gradient={arcanoData.gradient}
                            width={52}
                            height={66}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '.15em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(167,139,250,.7)',
                                    marginBottom: 4,
                                }}
                            >
                                Serviço selecionado
                            </div>
                            <div
                                className="font-serif"
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {gigTitle}
                            </div>
                            {readerName && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                                    com {readerName}
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 4 }}>
                                Entrega em até {deliveryHours ?? 48}h
                            </div>
                        </div>
                    </div>
                </div>

                {gigDescription && (
                    <div
                        style={{
                            fontSize: 13,
                            color: 'rgba(255,255,255,.5)',
                            lineHeight: 1.6,
                            marginBottom: 16,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {gigDescription}
                    </div>
                )}

                {/* Garantias */}
                <div
                    style={{
                        background: 'rgba(255,255,255,.03)',
                        border: '1px solid rgba(255,255,255,.07)',
                        borderRadius: 16,
                        padding: '14px 16px',
                        marginBottom: 16,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {[
                        { icon: '✦', text: 'Leitora verificada pelo Isidis' },
                        { icon: '✦', text: 'Entrega garantida no prazo' },
                        { icon: '✦', text: 'Pagamento seguro via Mercado Pago' },
                    ].map((item) => (
                        <div
                            key={item.text}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                                fontSize: 12,
                                color: 'rgba(255,255,255,.6)',
                            }}
                        >
                            <span style={{ color: '#a78bfa', fontSize: 10 }}>{item.icon}</span>
                            {item.text}
                        </div>
                    ))}
                </div>

                {/* Resumo de preço */}
                <div
                    style={{
                        background: 'rgba(255,255,255,.04)',
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: 16,
                        padding: '14px 16px',
                        marginBottom: 20,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            color: 'rgba(255,255,255,.5)',
                            marginBottom: 6,
                        }}
                    >
                        <span>Serviço base</span>
                        <span>{formatBRL(basePrice)}</span>
                    </div>
                    {selectedAddOns.map((a) => (
                        <div
                            key={a.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 12,
                                color: 'rgba(255,255,255,.5)',
                                marginBottom: 6,
                            }}
                        >
                            <span>+ {a.title}</span>
                            <span>{formatBRLFromCents(a.price)}</span>
                        </div>
                    ))}
                    <div
                        style={{
                            borderTop: '1px solid rgba(255,255,255,.08)',
                            paddingTop: 10,
                            marginTop: 4,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 15,
                            fontWeight: 800,
                        }}
                    >
                        <span>Total</span>
                        <span style={{ color: '#f5c451' }}>{formatBRL(amountTotal)}</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn-primary-design"
                    style={{ width: '100%', padding: '14px', fontSize: 14, position: 'relative', zIndex: 1 }}
                    onClick={goNext}
                >
                    Continuar
                </button>
            </div>
        )
    }

    // ─── Passo 2: Perguntas ─────────────────────────────────────────────────────
    if (currentStep === 'pergunta') {
        const handleRequirementsNext = () => {
            const err = validateRequirements(requirementsAnswers)
            if (err) {
                setError(err)
                return
            }
            setError('')
            goNext()
        }

        return (
            <div style={{ position: 'relative' }}>
                <OrbBackground
                    orbs={[{ color: '#f472b6', size: 160, top: -40, right: -40, opacity: 0.14 }]}
                />

                <StepProgressBar steps={stepLabels} current={1} />

                <button
                    type="button"
                    onClick={goBack}
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
                        marginBottom: 16,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <ArrowLeft size={14} />
                </button>

                <div
                    className="font-serif"
                    style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, position: 'relative', zIndex: 1 }}
                >
                    Informações para a leitura
                </div>
                <div
                    style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,.4)',
                        marginBottom: 20,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    Sua cartomante receberá essas respostas com o pedido.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20, position: 'relative', zIndex: 1 }}>
                    {requirements.map((req) => (
                        <div key={req.id}>
                            <Label
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'rgba(255,255,255,.7)',
                                    display: 'block',
                                    marginBottom: 6,
                                }}
                            >
                                {req.question}
                                {req.required && (
                                    <span style={{ color: '#f87171', marginLeft: 3 }}>*</span>
                                )}
                            </Label>
                            {req.type === 'choice' && req.options?.length ? (
                                <select
                                    value={requirementsAnswers[req.id] || ''}
                                    onChange={(e) =>
                                        setRequirementsAnswers((cur) => ({
                                            ...cur,
                                            [req.id]: e.target.value,
                                        }))
                                    }
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,.05)',
                                        border: '1px solid rgba(255,255,255,.1)',
                                        borderRadius: 12,
                                        padding: '10px 12px',
                                        fontSize: 13,
                                        color: 'rgba(255,255,255,.8)',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="">Selecione uma opção</option>
                                    {req.options.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Textarea
                                    value={requirementsAnswers[req.id] || ''}
                                    onChange={(e) =>
                                        setRequirementsAnswers((cur) => ({
                                            ...cur,
                                            [req.id]: e.target.value,
                                        }))
                                    }
                                    placeholder="Escreva aqui..."
                                    className="min-h-[100px] rounded-2xl border-white/10 bg-[#0c0b17] text-slate-100 placeholder:text-slate-500"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div
                        style={{
                            fontSize: 12,
                            color: '#f87171',
                            background: 'rgba(248,113,113,.1)',
                            border: '1px solid rgba(248,113,113,.2)',
                            borderRadius: 10,
                            padding: '10px 12px',
                            marginBottom: 14,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="button"
                    className="btn-primary-design"
                    style={{ width: '100%', padding: '14px', fontSize: 14, position: 'relative', zIndex: 1 }}
                    onClick={handleRequirementsNext}
                >
                    Continuar para o pagamento
                </button>
            </div>
        )
    }

    // ─── Passo 3: Pagamento ─────────────────────────────────────────────────────
    const paymentStepIndex = steps.length - 1

    // PIX ativo — mostrar PixPaymentStep
    if (pixActive) {
        const pixCode = checkoutResult?.pix?.content ?? ''
        const qrBase64 = checkoutResult?.pix?.qrcode
        const qrSrc = qrBase64
            ? qrBase64.startsWith('data:')
                ? qrBase64
                : `data:image/png;base64,${qrBase64}`
            : undefined

        const expiresInSec = checkoutResult?.pix?.expiresAt
            ? Math.max(0, Math.round((new Date(checkoutResult.pix.expiresAt).getTime() - Date.now()) / 1000))
            : 872

        const pixSummary = [
            { label: gigTitle, value: formatBRL(basePrice) },
            ...selectedAddOns.map((a) => ({ label: a.title, value: formatBRLFromCents(a.price) })),
        ]

        return (
            <div style={{ position: 'relative' }}>
                <PixPaymentStep
                    pixCode={pixCode}
                    amount={formatBRL(amountTotal)}
                    summary={pixSummary}
                    qrImageSrc={qrSrc}
                    expiresInSec={expiresInSec}
                    onBack={goBack}
                    onConfirm={() => navigate(`/dashboard/pedido/${checkoutResult.orderId}`)}
                />

                {/* Polling status */}
                <div style={{ padding: '0 18px 20px', position: 'relative', zIndex: 1 }}>
                    {pollError ? (
                        <div
                            style={{
                                background: 'rgba(245,196,81,.08)',
                                border: '1px solid rgba(245,196,81,.2)',
                                borderRadius: 12,
                                padding: '12px 14px',
                                fontSize: 12,
                                color: 'rgba(245,196,81,.8)',
                                textAlign: 'center',
                            }}
                        >
                            Verifique o status do pagamento no painel.
                            <button
                                type="button"
                                className="btn-ghost-design"
                                style={{ marginTop: 8, width: '100%', padding: '9px', fontSize: 12 }}
                                onClick={() => navigate('/dashboard')}
                            >
                                Ver meus pedidos
                            </button>
                        </div>
                    ) : pollCount >= 40 ? (
                        <div
                            style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,.35)',
                                textAlign: 'center',
                            }}
                        >
                            O pagamento pode levar alguns minutos para ser confirmado.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                fontSize: 11,
                                color: 'rgba(255,255,255,.3)',
                            }}
                        >
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            Aguardando confirmação...{' '}
                            {pollCount > 0 ? `(${pollCount})` : ''}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div style={{ position: 'relative' }}>
            <OrbBackground
                orbs={[{ color: '#8b5cf6', size: 180, top: -40, left: -40, opacity: 0.16 }]}
            />

            <StepProgressBar steps={stepLabels} current={paymentStepIndex} />

            {!checkoutResult && (
                <button
                    type="button"
                    onClick={goBack}
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
                        marginBottom: 16,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <ArrowLeft size={14} />
                </button>
            )}

            {/* Resumo compacto */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                <span
                    style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,.7)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '60%',
                    }}
                >
                    {gigTitle}
                </span>
                <span
                    className="font-serif"
                    style={{ fontSize: 16, fontWeight: 700, color: '#f5c451' }}
                >
                    {formatBRL(amountTotal)}
                </span>
            </div>

            {/* Method selector */}
            {acceptsPix && acceptsCard && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginBottom: 16,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {(['PIX', 'CARD'] as CheckoutMethod[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMethod(m)}
                            style={{
                                padding: '12px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: method === m
                                    ? '1px solid rgba(167,139,250,.4)'
                                    : '1px solid rgba(255,255,255,.08)',
                                background: method === m
                                    ? 'rgba(167,139,250,.15)'
                                    : 'rgba(255,255,255,.04)',
                                color: method === m ? '#a78bfa' : 'rgba(255,255,255,.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            {m === 'PIX' ? '⚡ PIX' : '💳 Cartão'}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div
                    style={{
                        fontSize: 12,
                        color: '#f87171',
                        background: 'rgba(248,113,113,.1)',
                        border: '1px solid rgba(248,113,113,.2)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        marginBottom: 14,
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {error}
                </div>
            )}

            {method === 'CARD' ? (
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div
                        style={{
                            background: 'rgba(14,165,233,.08)',
                            border: '1px solid rgba(14,165,233,.2)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            fontSize: 12,
                            color: 'rgba(186,230,253,.8)',
                            textAlign: 'center',
                            lineHeight: 1.6,
                            marginBottom: 14,
                        }}
                    >
                        Você será redirecionado para o{' '}
                        <strong>Mercado Pago</strong> para finalizar com segurança.
                    </div>
                    <button
                        type="button"
                        className="btn-primary-design"
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            opacity: submitting ? 0.6 : 1,
                        }}
                        onClick={() => void handleCardProSubmit()}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Preparando...
                            </>
                        ) : (
                            <>
                                <CreditCard size={14} />
                                Pagar {formatBRL(amountTotal)}
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <button
                        type="button"
                        className="btn-primary-design"
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            opacity: submitting ? 0.6 : 1,
                        }}
                        onClick={() => void handlePixDirectSubmit()}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Gerando PIX...
                            </>
                        ) : (
                            <>⚡ Gerar QR Code PIX — {formatBRL(amountTotal)}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
