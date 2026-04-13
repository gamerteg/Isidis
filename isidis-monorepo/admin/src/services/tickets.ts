import { supabase, supabaseAdmin } from '@/lib/supabase'

export interface Ticket {
  id: string
  created_at: string
  subject: string
  category: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  user_id: string
  user_name: string
  user_role: string
}

export interface TicketMessage {
  id: string
  created_at: string
  content: string
  sender_id: string
  sender_name: string
  is_admin: boolean
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[]
  description: string | null
}

export async function listTickets(statusFilter?: string): Promise<Ticket[]> {
  let query = supabaseAdmin
    .from('tickets')
    .select('id, created_at, subject, category, status, priority, user_id')
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) throw error
  const tickets = data ?? []

  const userIds = [...new Set(tickets.map(t => t.user_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return tickets.map(t => ({
    ...t,
    user_name: profileMap.get(t.user_id)?.full_name ?? 'Usuário',
    user_role: profileMap.get(t.user_id)?.role ?? 'CLIENT',
  }))
}

export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ticket) return null

  const { data: messagesRaw } = await supabaseAdmin
    .from('ticket_messages')
    .select('id, created_at, content, sender_id')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const messages = messagesRaw ?? []
  const senderIds = [...new Set(messages.map(m => m.sender_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .in('id', senderIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const { data: ticketUser } = await supabaseAdmin
    .from('profiles')
    .select('full_name, role')
    .eq('id', ticket.user_id)
    .single()

  return {
    ...ticket,
    user_name: ticketUser?.full_name ?? 'Usuário',
    user_role: ticketUser?.role ?? 'CLIENT',
    messages: messages.map(m => ({
      id: m.id,
      created_at: m.created_at,
      content: m.content,
      sender_id: m.sender_id,
      sender_name: profileMap.get(m.sender_id)?.full_name ?? 'Usuário',
      is_admin: profileMap.get(m.sender_id)?.role === 'ADMIN',
    })),
  }
}

export async function sendTicketMessage(ticketId: string, senderId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, sender_id: senderId, content })
  if (error) throw error

  // Auto move to IN_PROGRESS if OPEN
  await supabase
    .from('tickets')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', ticketId)
    .eq('status', 'OPEN')
}

export async function updateTicketStatus(id: string, status: Ticket['status']): Promise<void> {
  const { error } = await supabaseAdmin
    .from('tickets')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export function subscribeToTicketMessages(
  ticketId: string,
  onMessage: (msg: { id: string; created_at: string; content: string; sender_id: string }) => void
) {
  const channel = supabase
    .channel(`ticket_messages:${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
      payload => onMessage(payload.new as { id: string; created_at: string; content: string; sender_id: string })
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export const TICKET_STATUS_MAP = {
  OPEN: { label: 'Aberto', variant: 'info' as const },
  IN_PROGRESS: { label: 'Em Atendimento', variant: 'warning' as const },
  RESOLVED: { label: 'Resolvido', variant: 'success' as const },
  CLOSED: { label: 'Fechado', variant: 'outline' as const },
}

export const TICKET_PRIORITY_MAP = {
  LOW: { label: 'Baixa', color: 'text-muted-foreground' },
  MEDIUM: { label: 'Média', color: 'text-blue-400' },
  HIGH: { label: 'Alta', color: 'text-amber-400' },
  URGENT: { label: 'Urgente', color: 'text-red-500 font-bold' },
}

export const TICKET_CATEGORY_MAP: Record<string, string> = {
  REEMBOLSO: 'Reembolso',
  SAQUE: 'Saque',
  MUDANCA_PIX: 'Mudança de PIX',
  DUVIDA: 'Dúvida',
  OUTRO: 'Outro',
}
