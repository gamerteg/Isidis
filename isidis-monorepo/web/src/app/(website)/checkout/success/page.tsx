import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    if (!orderId) return

    const timeout = window.setTimeout(() => {
      navigate(`/dashboard/pedido/${orderId}`, { replace: true })
    }, 1400)

    return () => window.clearTimeout(timeout)
  }, [navigate, orderId])

  return (
    <div className="container mx-auto flex min-h-[75vh] items-center justify-center px-4 py-24">
      <Card className="w-full max-w-lg rounded-[2rem] border border-emerald-500/20 bg-[#0a0a12] text-slate-100 shadow-[0_30px_120px_rgba(10,14,28,0.35)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl text-white">Pedido confirmado</CardTitle>
          <CardDescription className="text-slate-400">
            O fluxo novo do web acompanha tudo pelo detalhe do pedido. Voce sera redirecionado automaticamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Proximo passo</p>
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
