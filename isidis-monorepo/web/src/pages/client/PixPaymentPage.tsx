import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { Copy, CheckCircle, Clock, ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api, type PaymentStatusResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type PixState = {
  pixData: {
    order_id: string
    pix_qr_code_id: string
    amount_total: number
    pix: { qr_code_base64: string; copy_paste_code: string; expires_at: string }
  }
  orderId: string
}

export function PixPaymentPage() {
  const navigate = useNavigate()
  const { gigId } = useParams()
  const location = useLocation()
  const state = location.state as PixState | null

  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'OVERDUE'>('PENDING')
  const [polling, setPolling] = useState(true)

  const pixData = state?.pixData
  const paymentId = pixData?.pix_qr_code_id

  const checkStatus = useCallback(async () => {
    if (!paymentId) return
    try {
      const res = await api.get<PaymentStatusResponse>(`/checkout/status/${paymentId}`)
      const s = res.data.status
      setStatus(s)
      if (s === 'PAID') {
        setPolling(false)
        toast.success('Pagamento confirmado! 🎉')
        setTimeout(() => {
          navigate(`/pedidos/${res.data.order_id}`, { replace: true })
        }, 2000)
      } else if (s === 'OVERDUE') {
        setPolling(false)
      }
    } catch (_) {}
  }, [paymentId, navigate])

  useEffect(() => {
    if (!polling) return
    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [polling, checkStatus])

  const copyCode = async () => {
    if (!pixData?.pix.copy_paste_code) return
    await navigator.clipboard.writeText(pixData.pix.copy_paste_code)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  if (!pixData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Dados do PIX não encontrados</p>
      </div>
    )
  }

  if (status === 'PAID') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center animate-pulse-glow">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-green-400">Pago!</h2>
        <p className="text-muted-foreground text-center">Redirecionando para o seu pedido…</p>
        <Spinner />
      </div>
    )
  }

  if (status === 'OVERDUE') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Clock size={40} className="text-red-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-red-400">PIX expirado</h2>
        <p className="text-muted-foreground text-center">O tempo para pagamento se esgotou.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Tentar novamente</Button>
      </div>
    )
  }

  const expiresAt = new Date(pixData.pix.expires_at)
  const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60))

  return (
    <div className="min-h-screen px-5 py-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-xl font-bold">Pagamento PIX</h1>
      </div>

      <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
        {/* Amount */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
          <p className="font-display text-3xl font-bold text-gold">
            {formatCurrency(pixData.amount_total)}
          </p>
          {timeLeft > 0 && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center">
              <Clock size={12} />
              Expira em ~{timeLeft} min
            </p>
          )}
        </div>

        {/* QR Code */}
        <div className="p-4 bg-white rounded-3xl shadow-xl shadow-primary/10">
          <img
            src={`data:image/png;base64,${pixData.pix.qr_code_base64}`}
            alt="QR Code PIX"
            className="w-56 h-56 object-contain"
          />
        </div>

        {/* Polling indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Aguardando confirmação do pagamento…
        </div>

        {/* Copy code */}
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground text-center">Ou use o código Pix Copia e Cola</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-xs text-muted-foreground truncate font-mono">
              {pixData.pix.copy_paste_code}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={checkStatus}
          className="text-muted-foreground"
        >
          <RefreshCw size={14} />
          Verificar manualmente
        </Button>
      </div>
    </div>
  )
}
