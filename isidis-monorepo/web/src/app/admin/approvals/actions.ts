


import { createClient } from '@/lib/supabase/client'

import { sendReaderApproved, sendReaderRejected } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

// In browser/CSR context, admin operations use the regular client with RLS.
// Service role operations must go through the Fastify API backend.
const getAdminClient = () => createClient()

export async function approveReader(readerId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'ADMIN') throw new Error('Unauthorized')

    // Buscar nome antes de atualizar
    const { data: readerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', readerId)
        .single()

    const supabaseAdmin = await getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'APPROVED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error approving reader:', error)
        throw new Error('Failed to approve reader')
    }

    // ── Email ────────────────────────────────────────────────────────────────
    try {
        const readerEmail = await getUserEmail(readerId)
        if (readerEmail) {
            await sendReaderApproved({
                readerEmail,
                readerName: readerProfile?.full_name || 'Cartomante',
            })
            console.log('[Admin] Email de aprovação enviado para', readerEmail)
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de aprovação:', emailErr)
    }

    return { success: true }
}

export async function rejectReader(readerId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'ADMIN') throw new Error('Unauthorized')

    // Buscar nome antes de atualizar
    const { data: readerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', readerId)
        .single()

    const supabaseAdmin = await getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'REJECTED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error rejecting reader:', error)
        throw new Error('Failed to reject reader')
    }

    // ── Email ────────────────────────────────────────────────────────────────
    try {
        const readerEmail = await getUserEmail(readerId)
        if (readerEmail) {
            await sendReaderRejected({
                readerEmail,
                readerName: readerProfile?.full_name || 'Cartomante',
            })
            console.log('[Admin] Email de rejeição enviado para', readerEmail)
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de rejeição:', emailErr)
    }

    return { success: true }
}
