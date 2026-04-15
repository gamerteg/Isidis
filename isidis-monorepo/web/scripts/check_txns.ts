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

async function checkTransactions() {
    const userId = 'dc09821f-708d-4fb9-9ff3-3a89948c970a'

    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (walletError) {
        console.error('Error fetching wallet:', walletError)
        process.exit(1)
    }

    console.log(`Wallet found: ${wallet.id}`)

    const { data: txns, error: txnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })

    if (txnsError) {
        console.error('Error fetching transactions:', txnsError)
        process.exit(1)
    }

    console.log('Transactions found:', JSON.stringify(txns, null, 2))
}

checkTransactions()
