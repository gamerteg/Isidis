

import { createClient } from '@/lib/supabase/client'


export async function markNotificationRead(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    
    return { success: true }
}

export async function markAllNotificationsRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

    if (error) return { error: error.message }

    
    return { success: true }
}

export async function getNotifications() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    return data || []
}

export async function getNotificationsPaginated(page: number = 1, limit: number = 20) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], count: 0 }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw new Error(error.message)

    return { data: data || [], count: count || 0 }
}

export async function createNotification(userId: string, type: string, title: string, message: string, link: string | null = null) {
    const supabase = await createClient()

    // Check if a similar unread notification already exists to avoid spam
    // For messages, we might want to consolidate or just update the timestamp
    // But for now, let's just create a new one

    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            message,
            link,
            read: false
        })

    if (error) {
        console.error('Error creating notification:', error)
        return { error: error.message }
    }

    return { success: true }
}
