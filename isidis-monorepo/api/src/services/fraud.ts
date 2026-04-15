import { SupabaseClient } from '@supabase/supabase-js'

interface FraudCheckParams {
  clientId: string
  gigId: string
  amount: number
  clientIp: string
  clientCreatedAt: string
}

export interface FraudCheckResult {
  allowed: boolean
  reason?: string
  flags: string[]
}

export async function checkFraud(
  supabase: SupabaseClient,
  params: FraudCheckParams
): Promise<FraudCheckResult> {
  const flags: string[] = []
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { count: ordersLastHour } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.clientId)
    .gte('created_at', oneHourAgo)
    .neq('status', 'CANCELED')

  if ((ordersLastHour ?? 0) >= 3) {
    return {
      allowed: false,
      reason: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos.',
      flags: ['velocity_hourly'],
    }
  }

  const { count: ordersLastDay } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.clientId)
    .gte('created_at', oneDayAgo)
    .neq('status', 'CANCELED')

  if ((ordersLastDay ?? 0) >= 10) {
    return {
      allowed: false,
      reason: 'Limite diario de pedidos atingido.',
      flags: ['velocity_daily'],
    }
  }

  const accountAge = now.getTime() - new Date(params.clientCreatedAt).getTime()
  if (accountAge < 24 * 60 * 60 * 1000 && params.amount > 20000) {
    flags.push('new_account_high_value')
  }

  // Restriction for active_duplicate_gig removed by user request
  // Multiple concurrent orders for the same gig by the same user are now permitted.

  const { count: expiredPix } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'CANCELED')
    .eq('payment_method', 'PIX')
    .gte('created_at', oneHourAgo)
    .contains('metadata', { client_ip: params.clientIp })

  if ((expiredPix ?? 0) >= 5) {
    return {
      allowed: false,
      reason: 'Muitas tentativas. Tente novamente mais tarde.',
      flags: ['pix_expired_velocity'],
    }
  }

  return { allowed: true, flags }
}
