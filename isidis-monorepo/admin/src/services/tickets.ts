import { supabase } from '@/lib/supabase'
import { apiGet, apiPost } from '@/lib/apiClient'

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
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
  const response = await apiGet<{ data: Ticket[] }>(`/admin/tickets${query}`)
  return response.data
}

export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  try {
    const response = await apiGet<{ data: TicketDetail }>(`/admin/tickets/${id}`)
    return response.data
  } catch {
    return null
  }
}

export async function sendTicketMessage(
  ticketId: string,
  _senderId: string,
  content: string
): Promise<void> {
  await apiPost(`/admin/tickets/${ticketId}/messages`, { content })
}

export async function updateTicketStatus(id: string, status: Ticket['status']): Promise<void> {
  await apiPost(`/admin/tickets/${id}/status`, { status })
}

export function subscribeToTicketMessages(ticketId: string, onMessage: () => void) {
  const channel = supabase
    .channel(`ticket_messages:${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
      () => onMessage()
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export const TICKET_STATUS_MAP = {
  OPEN: { label: 'Aberto', variant: 'info' as const },
  IN_PROGRESS: { label: 'Em Atendimento', variant: 'warning' as const },
  RESOLVED: { label: 'Resolvido', variant: 'success' as const },
  CLOSED: { label: 'Fechado', variant: 'outline' as const },
}

export const TICKET_PRIORITY_MAP = {
  LOW: { label: 'Baixa', color: 'text-muted-foreground' },
  MEDIUM: { label: 'Media', color: 'text-blue-400' },
  HIGH: { label: 'Alta', color: 'text-amber-400' },
  URGENT: { label: 'Urgente', color: 'text-red-500 font-bold' },
}

export const TICKET_CATEGORY_MAP: Record<string, string> = {
  REEMBOLSO: 'Reembolso',
  SAQUE: 'Saque',
  MUDANCA_PIX: 'Mudanca de PIX',
  DUVIDA: 'Duvida',
  OUTRO: 'Outro',
}
