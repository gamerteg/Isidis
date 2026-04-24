
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const userId = 'e398ce01-a5df-4029-87ce-ac3c6b00ed42'
  
  // Find wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (walletError || !wallet) {
    console.error('Wallet not found for user:', userId)
    return
  }

  console.log('Wallet ID:', wallet.id)

  // List transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })

  if (txError) {
    console.error('Error fetching transactions:', txError)
    return
  }

  console.table(transactions.map(t => ({
    id: t.id,
    type: t.type,
    status: t.status,
    amount: (t.amount / 100).toFixed(2),
    created_at: t.created_at,
    order_id: t.order_id
  })))
}

run()
