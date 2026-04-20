import { createClient } from '@/lib/supabase/client'
import { createNotification } from './notifications'
import { getUserEmail } from '@/lib/supabase/get-user-email'

export type TicketCategory = 'REEMBOLSO' | 'SAQUE' | 'MUDANCA_PIX' | 'DUVIDA' | 'OUTRO';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export async function createTicket({
    subject,
    category,
    content,
    priority = 'MEDIUM'
}: {
    subject: string,
    category: TicketCategory,
    content: string,
    priority?: TicketPriority
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
            user_id: user.id,
            subject,
            category,
            priority: priority as TicketPriority,
            status: 'OPEN'
        })
        .select()
        .single()

    if (ticketError) {
        console.error('Error creating ticket:', ticketError)
        return { error: 'Falha ao criar ticket' }
    }

    const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
            ticket_id: ticket.id,
            sender_id: user.id,
            content
        })

    if (messageError) {
        console.error('Error creating ticket message:', messageError)
        return { error: 'Ticket criado, mas falha ao enviar primeira mensagem' }
    }

    return { success: true, ticketId: ticket.id }
}

export async function addTicketMessage({
    ticketId,
    content
}: {
    ticketId: string,
    content: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const { data: ticket, error: ticketErr } = await supabase
        .from('tickets')
        .select('user_id, status')
        .eq('id', ticketId)
        .single()

    if (ticketErr || !ticket) return { error: 'Ticket não encontrado' }

    const { error } = await supabase
        .from('ticket_messages')
        .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            content
        })

    if (error) {
        console.error('Error adding ticket message:', error)
        return { error: 'Falha ao enviar mensagem' }
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'ADMIN' && ticket.status === 'OPEN') {
        await supabase.from('tickets').update({ status: 'IN_PROGRESS' }).eq('id', ticketId)
    }

    try {
        const receiverId = profile?.role === 'ADMIN' ? ticket.user_id : null

        if (receiverId) {
            await createNotification(
                receiverId,
                'SYSTEM',
                `Nova resposta no ticket: ${ticketId.substring(0, 8)}`,
                content.length > 50 ? content.substring(0, 50) + '...' : content,
                `/dashboard/tickets/${ticketId}`
            )
        }
    } catch (err) {
        console.error('Failed to create notification', err)
    }

    return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)

    if (error) {
        console.error('Error updating ticket status:', error)
        return { error: 'Falha ao atualizar status' }
    }

    return { success: true }
}

export async function getTickets() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching tickets:', error)
        return []
    }

    return data
}

export async function getTicketWithMessages(ticketId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
            *,
            user:profiles!user_id(full_name, avatar_url, role)
        `)
        .eq('id', ticketId)
        .single()

    if (ticketError || !ticket) return null

    const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .select(`
            *,
            sender:profiles!sender_id(full_name, avatar_url, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    if (messagesError) {
        console.error('Error fetching ticket messages:', messagesError)
        return { ...ticket, messages: [] }
    }

    return { ...ticket, messages }
}
