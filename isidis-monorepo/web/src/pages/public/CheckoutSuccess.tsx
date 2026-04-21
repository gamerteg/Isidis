import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { checkPaymentStatus } from '@/lib/actions/checkout'

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const orderId = searchParams.get('order_id')
  // Mercado Pago Checkout Pro retorna estes params na URL de sucesso
  const paymentId =
    searchParams.get('payment_id') ??
    searchParams.get('collection_id') ??
    null
  const collectionStatus = searchParams.get('collection_status')

  const [reconciled, setReconciled] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tenta reconciliar o pagamento chamando o backend
  useEffect(() => {
    if (!orderId) return
    if (reconciled) return

    // Se não temos paymentId do MP, redireciona direto (pode ser acesso manual)
    if (!paymentId) {
      redirectTimerRef.current = setTimeout(() => {
        navigate(`/dashboard/pedido/${orderId}`, { replace: true })
      }, 1500)
      return () => {
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
      }
    }

    // Polling: chama checkPaymentStatus que vai acionar processPaidMpOrder no backend
    const poll = async () => {
      try {
        const result = await checkPaymentStatus(paymentId, orderId)
        if (result.status === 'PAID') {
          setReconciled(true)
          if (pollingRef.current) clearInterval(pollingRef.current)
          // Pequena pausa para mostrar confirmação visual
          redirectTimerRef.current = setTimeout(() => {
            navigate(`/dashboard/pedido/${result.orderId ?? orderId}`, { replace: true })
          }, 1200)
        } else {
          setPollCount((c) => c + 1)
        }
      } catch {
        setPollCount((c) => c + 1)
      }
    }

    // Primeira tentativa imediata
    void poll()

    // Depois, a cada 3 segundos
    pollingRef.current = setInterval(() => {
      void poll()
    }, 3000)

    // Timeout de segurança: após 60s (~20 tentativas), redireciona mesmo sem confirmação
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
    <div className="container mx-auto flex min-h-[75vh] items-center justify-center px-4 py-24">
      <Card className="w-full max-w-lg rounded-[2rem] border border-emerald-500/20 bg-[#0a0a12] text-slate-100 shadow-[0_30px_120px_rgba(10,14,28,0.35)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            {reconciled ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl text-white">
            {reconciled ? 'Pagamento confirmado!' : 'Confirmando pagamento...'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {reconciled
              ? 'Seu pedido foi confirmado com sucesso. Você será redirecionado automaticamente.'
              : 'Estamos verificando seu pagamento junto ao Mercado Pago. Aguarde um instante...'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!reconciled && paymentId && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando pagamento... {pollCount > 0 ? `(tentativa ${pollCount})` : ''}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Próximo passo</p>
            <p className="mt-1">
              O painel mostra pagamento, preparo, entrega e leitura final no mesmo lugar, sem precisar voltar para o checkout.
            </p>
          </div>

          {orderId ? (
            <Button asChild className="h-12 w-full rounded-2xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">
              <Link to={`/dashboard/pedido/${orderId}`}>
                Ir para o pedido
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="h-12 w-full rounded-2xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">
              <Link to="/dashboard/minhas-tiragens">
                Abrir painel do cliente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
