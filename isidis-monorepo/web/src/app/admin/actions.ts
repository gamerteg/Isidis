


import { createClient } from '@/lib/supabase/client'
import { sendGigApproved, sendGigRejected } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

export async function updateGigStatus(gigId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Buscar dados do gig e do dono
    const { data: gig } = await supabase
        .from('gigs')
        .select('title, owner_id, profiles!gigs_owner_id_fkey(full_name)')
        .eq('id', gigId)
        .single()

    const { error } = await supabase
        .from('gigs')
        .update({ status })
        .eq('id', gigId)

    if (error) {
        console.error('Error updating gig status:', error)
        throw new Error('Failed to update status')
    }

    // ── Email para a cartomante ───────────────────────────────────────────────
    try {
        if (gig?.owner_id) {
            const readerEmail = await getUserEmail(gig.owner_id)
            const reader = gig.profiles as any

            if (readerEmail) {
                if (status === 'APPROVED') {
                    await sendGigApproved({
                        readerEmail,
                        readerName: reader?.full_name || 'Cartomante',
                        gigTitle: gig.title,
                        gigId,
                    })
                } else if (status === 'REJECTED') {
                    await sendGigRejected({
                        readerEmail,
                        readerName: reader?.full_name || 'Cartomante',
                        gigTitle: gig.title,
                    })
                }
                console.log('[Admin] Email de status do gig enviado para', readerEmail)
            }
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de status do gig:', emailErr)
    }

    
    
    
}
