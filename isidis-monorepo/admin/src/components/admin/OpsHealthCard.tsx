import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type AdminOpsHealth } from '@/types/admin-api'

interface OpsHealthCardProps {
  health: AdminOpsHealth | null
}

export function OpsHealthCard({ health }: OpsHealthCardProps) {
  if (!health?.has_issues) {
    return null
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          Saude Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {health.stuck_pending_payment_orders > 0 && (
            <Badge variant="warning">
              {health.stuck_pending_payment_orders} pedidos presos em PENDING_PAYMENT
            </Badge>
          )}
          {health.stuck_sale_credit_holds > 0 && (
            <Badge variant="warning">
              {health.stuck_sale_credit_holds} repasses em hold acima de 48h
            </Badge>
          )}
          {health.pending_withdrawals > 0 && (
            <Badge variant="warning">
              {health.pending_withdrawals} saques pendentes
            </Badge>
          )}
          {health.missing_env.map((envName) => (
            <Badge key={envName} variant="destructive">
              {envName} ausente
            </Badge>
          ))}
        </div>

        <div className="space-y-2 text-sm text-amber-100/90">
          {health.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
