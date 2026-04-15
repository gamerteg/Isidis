

import { createClient } from '@/lib/supabase/client'

export async function logAnalyticsEvent(
    gigId: string,
    readerId: string,
    eventType: 'impression' | 'view' | 'click_buy'
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
        .from('analytics_events')
        .insert({
            gig_id: gigId,
            reader_id: readerId,
            event_type: eventType,
            client_id: user?.id || null,
        })

    if (error) {
        console.error('Error logging analytics event:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
