import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getOrderDetail } from '@/lib/actions/checkout'
import { cancelOrder } from '@/lib/actions/orders'
import { useAuth } from '@/hooks/useAuth'
import type { OrderDetail, OrderStatus } from '@/types'
import { toast } from 'sonner'

const CLIENT_CANCEL_REASONS = [
  'Mudança de planos',
  'Erro na compra',
  'Demora na resposta da cartomante',
  'Encontrei outra opção',
  'Outro motivo',
]

const statusMap: Record<OrderStatus, { label: string; tone: string; description: string }> = {
  PENDING_PAYMENT: {
    label: 'Aguardando pagamento',
    tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    description: 'O pedido ja foi criado e fica aguardando a confirmacao do pagamento.',
  },
  PAID: {
    label: 'Em preparo',
    tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    description: 'Pagamento confirmado. A cartomante ja pode iniciar a leitura.',
  },
  DELIVERED: {
    label: 'Leitura entregue',
    tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    description: 'A leitura esta pronta para consulta no ambiente do cliente.',
  },
  COMPLETED: {
    label: 'Pedido concluido',
    tone: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
    description: 'O ciclo do pedido foi concluido e a leitura segue disponivel para revisita.',
  },
  CANCELED: {
    label: 'Pedido cancelado',
    tone: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    description: 'Este pedido foi cancelado e nao recebe novas atualizacoes.',
  },
}

function formatMoney(value?: number | null) {
  return ((value || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Timeline({ status }: { status: OrderStatus }) {
  const steps = [
    { key: 'PENDING_PAYMENT', label: 'Pedido criado' },
    { key: 'PAID', label: 'Pagamento confirmado' },
    { key: 'DELIVERED', label: 'Leitura entregue' },
    { key: 'COMPLETED', label: 'Encerramento' },
  ] as const

  const currentIndex = steps.findIndex((step) => step.key === status)

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {steps.map((step, index) => {
        const completed = currentIndex >= index || (status === 'CANCELED' && index === 0)
        return (
          <div key={step.key} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${completed ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-500'}`}>
              {completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {completed ? 'Etapa registrada no pedido.' : 'Aguardando esta etapa ser concluida.'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function ClientOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; reason: string; submitting: boolean }>({
    open: false, reason: '', submitting: false,
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/login?next=/dashboard/pedido/${id}`)
      return
    }
    if (!id) return

    getOrderDetail(id)
      .then((data) => setOrder(data))
      .catch((requestError: any) => setError(requestError?.response?.data?.error || 'Nao foi possivel carregar o pedido.'))
      .finally(() => setLoading(false))
  }, [authLoading, id, navigate, user])

  const status = useMemo(
    () => (order?.status ? statusMap[order.status] : statusMap.PENDING_PAYMENT),
    [order?.status],
  )

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Carregando pedido...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg rounded-[2rem] border border-rose-500/20 bg-[#0c0b14] text-slate-100">
          <CardHeader>
            <CardTitle>Pedido indisponivel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">{error || 'Nao encontramos este pedido no painel do cliente.'}</p>
            <Button asChild className="rounded-2xl">
              <Link to="/dashboard/minhas-tiragens">Voltar para minhas tiragens</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedAddOns = (order.gigs?.add_ons || []).filter((item) => order.selected_addons?.includes(item.id))
  const canOpenReading = order.status === 'DELIVERED' || order.status === 'COMPLETED'
  const canPay = order.status === 'PENDING_PAYMENT'
  const canCancel = order.status === 'PAID'

  async function handleCancelOrder() {
    if (!id || !cancelDialog.reason) return
    setCancelDialog(prev => ({ ...prev, submitting: true }))
    try {
      await cancelOrder(id, cancelDialog.reason)
      toast.success('Pedido cancelado. O reembolso será processado em até 5 dias úteis.')
      navigate('/dashboard/minhas-tiragens')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao cancelar o pedido.')
      setCancelDialog(prev => ({ ...prev, submitting: false }))
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(180deg,_#05040d,_#0a0914_30%,_#06050d_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-3 rounded-full px-0 text-slate-400 hover:bg-transparent hover:text-white">
              <Link to="/dashboard/minhas-tiragens">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para minhas tiragens
              </Link>
            </Button>
            <h1 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] font-light">Pedido <em className="italic font-normal text-gradient-aurora">#{order.id.slice(0, 8)}</em></h1>
            <p className="mt-2 text-sm text-slate-400">
              Um unico lugar para acompanhar pagamento, preparo e entrega da sua leitura.
            </p>
          </div>

          <div className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold ${status.tone}`}>
            {status.label}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    {order.reader?.avatar_url ? (
                      <img src={order.reader.avatar_url} alt={order.reader.full_name} className="h-16 w-16 rounded-full border border-white/10 object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <UserRound className="h-7 w-7 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cartomante</p>
                      <p className="text-xl font-semibold text-white">{order.reader?.full_name || 'Profissional Isidis'}</p>
                      <p className="text-sm text-slate-400">{order.gigs?.title}</p>
                    </div>
                  </div>

                  <div className="md:ml-auto md:max-w-[18rem]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status atual</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{status.description}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-300 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pagamento</p>
                    <p className="mt-1 flex items-center gap-2 text-white">
                      {order.payment_method === 'CARD' ? <CreditCard className="h-4 w-4 text-sky-300" /> : <QrCode className="h-4 w-4 text-emerald-300" />}
                      {order.payment_method === 'CARD' ? 'Cartao' : 'PIX'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Criado em</p>
                    <p className="mt-1 text-white">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prazo estimado</p>
                    <p className="mt-1 text-white">{order.gigs?.delivery_time_hours || 48} horas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Timeline status={order.status} />

            {order.requirements_answers && Object.keys(order.requirements_answers).length > 0 ? (
              <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Briefing enviado para a leitura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(order.requirements_answers).map(([key, value]) => (
                    <div key={key} className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {order.gigs?.requirements?.find((requirement) => requirement.id === key)?.question || key}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Resumo financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Servico</span>
                  <span className="text-white">{formatMoney(order.gigs?.price)}</span>
                </div>

                {selectedAddOns.map((addOn) => (
                  <div key={addOn.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{addOn.title}</span>
                    <span className="text-white">{formatMoney(Math.round(addOn.price * 100))}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="text-lg font-semibold text-white">{formatMoney(order.amount_total)}</span>
                </div>

                {order.amount_card_fee ? (
                  <div className="rounded-[1.25rem] border border-sky-400/15 bg-sky-400/5 p-4 text-xs leading-6 text-slate-300">
                    Taxa operacional da cobranca em cartao: <strong className="text-sky-200">{formatMoney(order.amount_card_fee)}</strong>.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Proximos passos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canPay ? (
                  <Button asChild className="h-12 w-full rounded-2xl bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300">
                    <Link to={`/checkout/${order.gigs?.id}?order_id=${order.id}`}>
                      Concluir pagamento
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Link>
                  </Button>
                ) : null}

                {canOpenReading ? (
                  <Button asChild className="h-12 w-full rounded-2xl bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300">
                    <Link to={`/dashboard/leitura/${order.id}`}>
                      Abrir leitura
                      <Sparkles className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}

                <Button asChild variant="outline" className="h-12 w-full rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/5">
                  <Link to="/dashboard/mensagens">
                    Falar no chat
                    <MessageSquareText className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {canCancel && (
                  <>
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-2xl border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setCancelDialog({ open: true, reason: '', submitting: false })}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Pedido
                    </Button>
                    <p className="text-center text-xs text-slate-600">
                      Disponível por 2h após o pagamento, enquanto a leitura não for iniciada.
                    </p>
                  </>
                )}

                <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-400">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Painel unificado
                  </div>
                  <p className="mt-2">
                    PIX, cartao, entrega e leitura final agora compartilham o mesmo fluxo de acompanhamento dentro do web.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => !cancelDialog.submitting && setCancelDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-[#0f0e1a] border border-white/10 text-slate-100 rounded-[1.5rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Cancelar Pedido
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Ao confirmar, o reembolso será processado automaticamente em até 5 dias úteis. Selecione o motivo:
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={cancelDialog.reason}
              onValueChange={(val) => setCancelDialog(prev => ({ ...prev, reason: val }))}
            >
              <SelectTrigger className="bg-white/5 border border-white/10 text-slate-200 rounded-xl h-11">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0e1a] border border-white/10 text-slate-200 rounded-xl">
                {CLIENT_CANCEL_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason} className="focus:bg-white/10">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              onClick={() => setCancelDialog({ open: false, reason: '', submitting: false })}
              disabled={cancelDialog.submitting}
            >
              Voltar
            </Button>
            <Button
              className="rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
              onClick={handleCancelOrder}
              disabled={!cancelDialog.reason || cancelDialog.submitting}
            >
              {cancelDialog.submitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
