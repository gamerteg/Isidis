import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const abacateApiKey = process.env.ABACATE_PAY_API_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !abacateApiKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function syncWithdrawal() {
    const userId = 'dc09821f-708d-4fb9-9ff3-3a89948c970a'

    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (!wallet) {
        console.error('Wallet not found')
        process.exit(1)
    }

    const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .eq('type', 'WITHDRAWAL')
        .order('created_at', { ascending: false })
        .limit(1)

    if (!txns || txns.length === 0) {
        console.error('No withdrawal transaction found')
        process.exit(1)
    }

    const txn = txns[0]
    console.log('Transaction found in DB:', JSON.stringify(txn, null, 2))

    if (txn.status !== 'PENDING') {
        console.log('Transaction is already', txn.status)
    }

    const abacateId = txn.external_id
    console.log(`Checking status for AbacatePay ID: ${abacateId}...`)

    // The documentation says we can get details using GET /withdraw/get
    // However, the example shows no ID in the URL, but mention query params.
    // "Query Parameters: externalId" (the one we sent)
    // Wait, if it's GET /withdraw/get?externalId=..., let's try that.

    // Actually, some APIs use the ID directly in the path or as a param.
    // Re-reading chunk 255: GET https://api.abacatepay.com/v1/withdraw/get?externalId=withdraw-1234

    // Wait, I don't have the "withdraw-redo-..." externalId here directly unless I stored it.
    // Oh, I stored the AbacatePay ID (tran_...) in external_id!

    // Let's try to list withdrawals to find it if we can't get it by ID.
    // Or maybe the get endpoint accepts the tran_... ID?

    const response = await fetch(`https://api.abacatepay.com/v1/withdraw/list`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${abacateApiKey}`
        }
    })

    const body = await response.json()
    console.log('AbacatePay Recent Withdrawals:', JSON.stringify(body, null, 2))

    const remoteTxn = body.data?.find((d: any) => d.id === abacateId)
    if (remoteTxn) {
        console.log('Remote Transaction Status:', remoteTxn.status)
        if (remoteTxn.status === 'DONE' || remoteTxn.status === 'COMPLETED' || remoteTxn.status === 'PAID') {
            // AbacatePay uses different status strings? Chunk 171 response shows "PENDING".
            // Grounding says "withdraw.done" event. So status might be DONE.

            console.log('Updating DB status to COMPLETED...')
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ status: 'COMPLETED' })
                .eq('id', txn.id)

            if (updateError) console.error('Error updating status:', updateError)
            else console.log('Successfully updated status to COMPLETED.')
        }
    } else {
        console.log('Transaction not found in AbacatePay list.')
    }
}

syncWithdrawal()
