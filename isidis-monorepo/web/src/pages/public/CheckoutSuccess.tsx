import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { checkPaymentStatus } from '@/lib/actions/checkout'
import { OrbBackground, SuccessAnimation } from '@/components/design'

export default function CheckoutSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const orderId = searchParams.get('order_id')
    const paymentId =
        searchParams.get('payment_id') ??
        searchParams.get('collection_id') ??
        null

    const [reconciled, setReconciled] = useState(false)
    const [pollCount, setPollCount] = useState(0)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!orderId) return
        if (reconciled) return

        if (!paymentId) {
            redirectTimerRef.current = setTimeout(() => {
                navigate(`/dashboard/pedido/${orderId}`, { replace: true })
            }, 2500)
            return () => {
                if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
            }
        }

        const poll = async () => {
            try {
                const result = await checkPaymentStatus(paymentId, orderId)
                if (result.status === 'PAID') {
                    setReconciled(true)
                    if (pollingRef.current) clearInterval(pollingRef.current)
                    redirectTimerRef.current = setTimeout(() => {
                        navigate(`/dashboard/pedido/${result.orderId ?? orderId}`, { replace: true })
                    }, 2000)
                } else {
                    setPollCount((c) => c + 1)
                }
            } catch {
                setPollCount((c) => c + 1)
            }
        }

        void poll()
        pollingRef.current = setInterval(() => void poll(), 3000)

        const safetyTimeout = setTimeout(() => {
            if (pollingRef.current) clearInterval(pollingRef.current)
            navigate(`/dashboard/pedido/${orderId}`, { replace: true })
        }, 60_000)

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current)
            if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
            clearTimeout(safetyTimeout)
        }
    }, [navigate, orderId, paymentId, reconciled])

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#07060d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 18px',
                fontFamily: 'Manrope, sans-serif',
            }}
        >
            <div className="mobile-canvas" style={{ width: '100%' }}>
                <div style={{ position: 'relative' }}>
                    <OrbBackground
                        orbs={[
                            { color: '#8b5cf6', size: 260, top: -80, right: -60, opacity: 0.22 },
                            { color: '#4ade80', size: 180, bottom: 0, left: -40, opacity: 0.12 },
                        ]}
                    />

                    {/* Success card */}
                    <div
                        style={{
                            background: 'rgba(17,13,34,.95)',
                            border: '1px solid rgba(255,255,255,.08)',
                            borderRadius: 24,
                            padding: '32px 24px',
                            textAlign: 'center',
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {/* Animation */}
                        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                            <SuccessAnimation />
                        </div>

                        <div
                            className="font-serif"
                            style={{
                                fontSize: 24,
                                fontWeight: 400,
                                letterSpacing: '-.02em',
                                marginBottom: 6,
                                color: 'white',
                            }}
                        >
                            {reconciled ? 'Pedido realizado!' : 'Confirmando pagamento...'}
                        </div>

                        <div
                            style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,.5)',
                                lineHeight: 1.5,
                                marginBottom: 24,
                                maxWidth: 280,
                                margin: '0 auto 24px',
                            }}
                        >
                            {reconciled
                                ? 'Sua leitora foi notificada e vai começar a preparar sua tiragem.'
                                : paymentId
                                    ? `Verificando pagamento${pollCount > 0 ? ` (${pollCount})` : ''}...`
                                    : 'Você será redirecionada em instantes.'}
                        </div>

                        {/* Delivery estimate */}
                        <div
                            style={{
                                background: 'rgba(167,139,250,.1)',
                                border: '1px solid rgba(167,139,250,.2)',
                                borderRadius: 14,
                                padding: '14px 16px',
                                marginBottom: 20,
                                textAlign: 'left',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '.15em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(167,139,250,.7)',
                                    marginBottom: 6,
                                }}
                            >
                                Previsão de entrega
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f5c451' }}>
                                Em até 48 horas
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                                Você receberá uma notificação quando estiver pronta.
                            </div>
                        </div>

                        {/* CTA */}
                        {orderId ? (
                            <Link
                                to={`/dashboard/pedido/${orderId}`}
                                className="btn-primary-design"
                                style={{
                                    display: 'block',
                                    padding: '13px',
                                    fontSize: 14,
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                }}
                            >
                                Acompanhar pedido
                            </Link>
                        ) : (
                            <Link
                                to="/dashboard/minhas-tiragens"
                                className="btn-primary-design"
                                style={{
                                    display: 'block',
                                    padding: '13px',
                                    fontSize: 14,
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                }}
                            >
                                Ver minhas tiragens
                            </Link>
                        )}

                        <div
                            style={{
                                marginTop: 12,
                                fontSize: 10,
                                color: 'rgba(255,255,255,.25)',
                            }}
                        >
                            Sua leitora é notificada automaticamente
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
