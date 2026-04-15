import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function approveWithdrawal() {
    const txnId = 'fbe38bed-0b03-4da0-914f-8eae0112d2e2'
    const userId = 'dc09821f-708d-4fb9-9ff3-3a89948c970a'

    console.log(`Approving withdrawal ${txnId} for user ${userId}...`)

    const { error } = await supabase
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('id', txnId)

    if (error) {
        console.error('Error approving withdrawal:', error)
        process.exit(1)
    }

    console.log('Successfully approved withdrawal.')

    // Verify wallet balance
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (wallet) {
        const { data: txns } = await supabase
            .from('transactions')
            .select('amount, status, type')
            .eq('wallet_id', wallet.id)

        let totalEarnings = 0
        let pendingBalance = 0
        let availableBalance = 0

        txns?.forEach((t) => {
            if (t.type === 'SALE_CREDIT') {
                totalEarnings += t.amount
                if (t.status === 'PENDING') pendingBalance += t.amount
                if (t.status === 'COMPLETED') availableBalance += t.amount
            }
            if (t.type === 'WITHDRAWAL' && (t.status === 'COMPLETED' || t.status === 'PENDING')) {
                availableBalance += t.amount
            }
        })

        console.log(`New Balances: Total Earnings: ${totalEarnings}, Pending: ${pendingBalance}, Available: ${availableBalance}`)
    }
}

approveWithdrawal()
