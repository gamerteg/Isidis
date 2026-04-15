import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function markCompleted() {
    const abacateId = 'tran_m6uTraN2juBBhwsjUESJwFTQ'

    console.log(`Updating transaction with external_id ${abacateId} to COMPLETED...`)

    const { error } = await supabase
        .from('transactions')
        .update({ status: 'COMPLETED' })
        .eq('external_id', abacateId)
        .eq('type', 'WITHDRAWAL')

    if (error) {
        console.error('Error updating transaction:', error)
        process.exit(1)
    }

    console.log('Successfully updated status to COMPLETED.')
}

markCompleted()
