import { useNavigate } from 'react-router-dom'
import { Wallet, ArrowDownLeft, ArrowUpRight, Lock, Clock } from 'lucide-react'
import useSWR from 'swr'
import { api, type WalletBalance, type Transaction } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

export function WalletPage() {
  const navigate = useNavigate()

  const { data: balanceData, isLoading: loadingBalance } = useSWR(
    '/wallet/balance',
    () => api.get<{ data: WalletBalance }>('/wallet/balance'),
  )

  const { data: txData, isLoading: loadingTx } = useSWR(
    '/wallet/transactions',
    () => api.get<{ data: Transaction[] }>('/wallet/transactions?limit=20'),
  )

  const balance = balanceData?.data
  const transactions = txData?.data ?? []

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="px-5 pt-4 pb-4">
        <h1 className="font-display text-2xl font-bold">Carteira</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Balance card */}
        {loadingBalance ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : balance ? (
          <div
            className="relative rounded-3xl p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2D1B3D 0%, #4A2060 100%)' }}
          >
            <div className="absolute inset-0 bg-purple-glow opacity-40" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-primary/70 text-sm mb-3">
                <Wallet size={16} />
                Saldo disponível
              </div>
              <p className="font-display text-4xl font-bold text-gold-gradient">
                {formatCurrency(balance.available)}
              </p>
              {balance.pending > 0 && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Lock size={13} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(balance.pending)} em bloqueio (hold 48h)
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Pending timeline */}
        {balance?.timeline && balance.timeline.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                <Clock size={12} />
                Desbloqueios programados
              </p>
              <div className="space-y-2">
                {balance.timeline.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Desbloqueia em {formatDate(item.unlocks_at)}
                    </span>
                    <span className="font-medium text-green-400">+{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdraw button */}
        <Button
          className="w-full"
          size="lg"
          variant="gold"
          disabled={!balance || balance.available < 100}
          onClick={() => navigate('/leitora/wallet/sacar')}
        >
          <ArrowUpRight size={18} />
          Sacar via PIX
        </Button>

        {balance && balance.available < 100 && (
          <p className="text-xs text-center text-muted-foreground">
            Saldo mínimo para saque: R$ 1,00
          </p>
        )}

        {/* Transaction history */}
        <div>
          <h2 className="font-semibold text-sm mb-3">Histórico</h2>
          {loadingTx ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação ainda</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'CREDIT' ? 'bg-green-500/10' : 'bg-orange-500/10'
                  }`}>
                    {tx.type === 'CREDIT'
                      ? <ArrowDownLeft size={14} className="text-green-400" />
                      : <ArrowUpRight size={14} className="text-orange-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {tx.type === 'CREDIT' ? 'Crédito recebido' : 'Saque'}
                    </p>
                    {tx.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{tx.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'CREDIT' ? 'text-green-400' : 'text-foreground'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <Badge
                      variant={tx.status === 'COMPLETED' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'error'}
                      className="text-[9px]"
                    >
                      {tx.status === 'COMPLETED' ? 'Concluído' : tx.status === 'PENDING' ? 'Pendente' : 'Falhou'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
