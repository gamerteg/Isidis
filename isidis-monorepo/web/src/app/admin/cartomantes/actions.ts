

import { createClient } from "@/lib/supabase/client"

import { sendReaderApproved, sendReaderRejected } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

export async function updateCartomanteStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Buscar nome antes de atualizar
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

    const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId)

    if (error) {
        console.error('Error updating cartomante status:', error)
        throw new Error('Failed to update status')
    }

    // ── Email ────────────────────────────────────────────────────────────────
    try {
        const readerEmail = await getUserEmail(userId)
        if (readerEmail) {
            if (status === 'APPROVED') {
                await sendReaderApproved({
                    readerEmail,
                    readerName: targetProfile?.full_name || 'Cartomante',
                })
            } else if (status === 'REJECTED') {
                await sendReaderRejected({
                    readerEmail,
                    readerName: targetProfile?.full_name || 'Cartomante',
                })
            }
            console.log('[Admin] Email de status do cartomante enviado para', readerEmail)
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de status:', emailErr)
    }

    
    
}
