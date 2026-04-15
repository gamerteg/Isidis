

import { createClient } from '@/lib/supabase/client'

import { createNotification } from './notifications'

export async function sendMessage({ receiverId, content, orderId, gigId, id }: { receiverId: string, content: string, orderId?: string, gigId?: string, id?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        order_id: orderId || null,
        gig_id: gigId || null,
        content,
        id: id || undefined,
    })

    if (error) {
        console.error('Error sending message:', error)
        return { error: 'Falha ao enviar mensagem' }
    }

    // No need to revalidate path generally as we use realtime, but we can if we want to update server components
    //  

    // Create notification for receiver
    try {
        // Get sender details for notification
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

        const senderName = senderProfile?.full_name || 'Usuário'

        await createNotification(
            receiverId,
            'MESSAGE',
            `Nova mensagem de ${senderName}`,
            content.length > 50 ? content.substring(0, 50) + '...' : content,
            orderId ? `/dashboard/leitura/${orderId}` : `/dashboard/cartomante/mensagens`
        )
    } catch (err) {
        console.error('Failed to create notification', err)
        // Don't fail the message send if notification fails
    }

    return { success: true }
}

export async function getMessages({ otherUserId, orderId }: { otherUserId: string, orderId?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    let query = supabase
        .from('messages')
        .select(`
            *,
            gig:gigs(id, title, price, image_url)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

    if (orderId) {
        query = query.eq('order_id', orderId)
    } else {
        query = query.is('order_id', null)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching messages:', error)
        return []
    }

    return data
}

export async function markMessagesRead(messageIds: string[]) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)

    if (error) console.error('Error marking messages as read:', error)
}



export async function getConversations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Fetch all messages where user is participant
    const { data: messages, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender:profiles!sender_id(full_name, avatar_url),
            receiver:profiles!receiver_id(full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching conversations:', error)
        return []
    }

    // Group by conversation (other user + order_id)
    const conversations = new Map()

    for (const msg of messages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const orderId = msg.order_id || 'general'
        const key = `${otherUserId}-${orderId}`

        if (!conversations.has(key)) {
            const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender
            conversations.set(key, {
                otherUser: {
                    id: otherUserId,
                    name: otherUser?.full_name || otherUser?.email || 'Usuário',
                    avatar: otherUser?.avatar_url
                },
                orderId: msg.order_id,
                lastMessage: {
                    content: msg.content,
                    created_at: msg.created_at,
                    is_read: msg.is_read,
                    sender_id: msg.sender_id
                },
                unreadCount: 0
            })
        }

        const conv = conversations.get(key)
        if (msg.receiver_id === user.id && !msg.is_read) {
            conv.unreadCount++
        }
    }

    return Array.from(conversations.values())
}

export async function getUnreadMessageCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return 0

    const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

    if (error) {
        console.error('Error fetching unread count:', error)
        return 0
    }

    return count || 0
}

export async function getActiveGigs() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.log('DEBUG: getActiveGigs - No user in session')
        return []
    }

    console.log('DEBUG: getActiveGigs - Fetching for user:', user.id)

    // First, let's just see if this user has ANY gigs at all
    const { data: allGigs, error: allGigsError } = await supabase
        .from('gigs')
        .select('id, owner_id, status, is_active')
        .eq('owner_id', user.id)

    if (allGigsError) {
        console.error('DEBUG: getActiveGigs - Error fetching all user gigs:', allGigsError)
    } else {
        console.log(`DEBUG: getActiveGigs - User has total ${allGigs?.length || 0} gigs. Statuses:`, allGigs?.map(g => `${g.status}(active=${g.is_active})`))
    }

    const { data, error } = await supabase
        .from('gigs')
        .select('id, title, price, image_url, is_active, status')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .in('status', ['APPROVED', 'PENDING'])
        .order('title')

    if (error) {
        console.error('DEBUG: getActiveGigs error:', error)
    }

    console.log('DEBUG: getActiveGigs final return count:', data?.length || 0)
    return data || []
}
