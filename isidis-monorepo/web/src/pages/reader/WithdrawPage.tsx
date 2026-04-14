import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wallet } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, type WalletBalance } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const PIX_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Chave Aleatória' },
]

export function WithdrawPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: balanceData } = useSWR(
    '/wallet/balance',
    () => api.get<{ data: WalletBalance }>('/wallet/balance'),
  )

  const available = balanceData?.data?.available ?? 0

  const [amount, setAmount] = useState('')
  const [pixKeyType, setPixKeyType] = useState(profile?.pix_key_type ?? 'CPF')
  const [pixKey, setPixKey] = useState(profile?.pix_key ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountInCents = Math.round(parseFloat(amount) * 100)

    if (amountInCents < 100) {
      toast.error('Valor mínimo de saque é R$ 1,00')
      return
    }
    if (amountInCents > available) {
      toast.error('Saldo insuficiente')
      return
    }
    if (!pixKey.trim()) {
      toast.error('Informe sua chave PIX')
      return
    }

    setLoading(true)
    try {
      await api.post('/wallet/withdraw', {
        amount: amountInCents,
        pix_key_type: pixKeyType,
        pix_key: pixKey.trim(),
      })
      toast.success('Saque solicitado com sucesso!')
      navigate('/leitora/wallet', { replace: true })
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao solicitar saque')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft size={20} />
          <span className="text-sm">Carteira</span>
        </button>
        <h1 className="font-display text-xl font-bold">Solicitar Saque</h1>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Balance */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Wallet size={13} />
            Saldo disponível
          </div>
          <p className="font-display text-2xl font-bold text-gold">{formatCurrency(available)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Valor do saque (R$)"
            type="number"
            placeholder="0.00"
            min="1"
            max={available / 100}
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />

          {/* Quick amounts */}
          <div className="flex gap-2">
            {[50, 100, 200, 500].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(Math.min(v, available / 100).toString())}
                disabled={available < v * 100}
                className="flex-1 py-2 rounded-xl bg-card border border-border text-xs font-medium hover:border-primary/40 disabled:opacity-40 transition-colors"
              >
                R$ {v}
              </button>
            ))}
          </div>

          {/* PIX key type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Tipo de chave PIX</label>
            <div className="flex flex-wrap gap-2">
              {PIX_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPixKeyType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    pixKeyType === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Chave PIX"
            placeholder={
              pixKeyType === 'CPF' ? '000.000.000-00' :
              pixKeyType === 'EMAIL' ? 'seu@email.com' :
              pixKeyType === 'PHONE' ? '+55 11 99999-9999' :
              'Sua chave PIX'
            }
            value={pixKey}
            onChange={e => setPixKey(e.target.value)}
            required
          />

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-muted-foreground">
            O saque será processado em até 1 dia útil. Mínimo de R$ 1,00.
          </div>

          <Button type="submit" className="w-full" size="lg" variant="gold" loading={loading}>
            Solicitar saque
          </Button>
        </form>
      </div>
    </div>
  )
}
