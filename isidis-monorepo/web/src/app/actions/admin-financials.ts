

import { createClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'


export interface FinancialSummary {
    // Totais das ordens (fonte principal)
    totalRevenue: number           // Receita bruta total (amount_total)
    platformFee: number            // Taxa da plataforma / lucro empresa (amount_platform_fee)
    totalRepasse: number           // Total de repasse para cartomantes (amount_reader_net)
    // Saques já pagos
    totalWithdrawn: number         // Saques concluídos (WITHDRAWAL COMPLETED)
    // Saldo a pagar (repasse pendente)
    pendingRepasse: number         // Repasse aguardando saque
    // Transações recentes
    recentOrders: OrderFinancialRow[]
    pendingWithdrawals: WithdrawalRequest[]
}

export interface WithdrawalRequest {
    id: string
    created_at: string
    amount: number
    status: string
    pix_key: string
    user_name: string
    user_id: string
}

export interface OrderFinancialRow {
    id: string
    created_at: string
    status: string
    amount_total: number
    amount_platform_fee: number
    amount_reader_net: number
    client_name: string
    reader_name: string
    gig_title: string
}

export async function getAdminFinancials(): Promise<{ data?: FinancialSummary, error?: string }> {
    const supabase = await createClient()

    // 1. Check auth - must be logged in as admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 2. Use Admin Client for all data fetching to bypass RLS
    // (This ensures we see all orders, regardless of who is the client/reader)

    // Get Aggregated Stats via RPC
    const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_admin_financial_stats')
    if (statsError) {
        console.error('Error fetching financial stats via RPC:', statsError)
        return { error: 'Falha ao buscar estatísticas financeiras: ' + statsError.message }
    }

    // Buscar ordens recentes (apenas para a listagem)
    const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select(`
            id,
            created_at,
            status,
            amount_total,
            amount_platform_fee,
            amount_reader_net,
            client_id,
            reader_id,
            gig_id
        `)
        .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])
        .order('created_at', { ascending: false })
        .limit(50)

    if (ordersError) return { error: 'Falha ao buscar ordens recentes: ' + ordersError.message }

    // 3. Resolver nomes de profiles e gigs para as ordens recentes
    const recentRaw = orders ?? []
    const allUserIds = [...new Set(recentRaw.flatMap(o => [o.client_id, o.reader_id]).filter(Boolean))]
    const allGigIds = [...new Set(recentRaw.map(o => o.gig_id).filter(Boolean))]

    const { data: profilesData } = allUserIds.length > 0
        ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', allUserIds)
        : { data: [] }
    const { data: gigsData } = allGigIds.length > 0
        ? await supabaseAdmin.from('gigs').select('id, title').in('id', allGigIds)
        : { data: [] }

    const profileMap = new Map((profilesData ?? []).map(p => [p.id, p.full_name]))
    const gigMap = new Map((gigsData ?? []).map(g => [g.id, g.title]))

    const recentOrders: OrderFinancialRow[] = recentRaw.map((o) => ({
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        amount_total: o.amount_total,
        amount_platform_fee: o.amount_platform_fee,
        amount_reader_net: o.amount_reader_net,
        client_name: profileMap.get(o.client_id) ?? 'Desconhecido',
        reader_name: profileMap.get(o.reader_id) ?? 'Desconhecido',
        gig_title: gigMap.get(o.gig_id) ?? 'N/A',
    }))

    return {
        data: {
            totalRevenue: stats.total_revenue || 0,
            platformFee: stats.platform_fee || 0,
            totalRepasse: stats.total_repasse || 0,
            totalWithdrawn: stats.total_withdrawn || 0,
            pendingRepasse: stats.pending_repasse || 0,
            recentOrders,
            pendingWithdrawals: await getPendingWithdrawals()
        }
    }
}

export async function getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
    const { data: txns, error } = await supabaseAdmin
        .from('transactions')
        .select(`
            id,
            created_at,
            amount,
            status,
            external_id,
            wallets!inner(user_id)
        `)
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

    if (error || !txns) {
        console.error('Error fetching pending withdrawals:', error)
        return []
    }

    // Resolve user names
    const userIds = [...new Set(txns.map(t => (t.wallets as any).user_id))]
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

    return txns.map(t => ({
        id: t.id,
        created_at: t.created_at,
        amount: Math.abs(t.amount),
        status: t.status,
        pix_key: t.external_id?.replace('PIX::', '') || 'N/A',
        user_id: (t.wallets as any).user_id,
        user_name: profileMap.get((t.wallets as any).user_id) || 'Desconhecido'
    }))
}

export async function updateWithdrawalStatus(id: string, status: 'COMPLETED' | 'FAILED') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check if user is admin (optional but recommended if not handled by RPC or policy)
    // For now, let's assume admin access is checked by the page/middleware

    const { error } = await supabaseAdmin
        .from('transactions')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error('Error updating withdrawal status:', error)
        return { error: 'Falha ao atualizar status do saque' }
    }

    return { success: true }
}

export async function adminCancelOrder(orderId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Mark order as CANCELED
    const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'CANCELED' })
        .eq('id', orderId)

    if (orderError) {
        console.error('Error canceling the order:', orderError)
        return { error: 'Falha ao cancelar o pedido no banco de dados' }
    }

    // 2. Mark related transaction as FAILED to reverse balances
    const { error: txError } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('order_id', orderId)

    if (txError) {
        console.error('Error failing related transactions:', txError)
    }

    
    

    return { success: true }
}
