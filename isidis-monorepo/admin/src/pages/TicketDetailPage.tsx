import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getTicketDetail, sendTicketMessage, updateTicketStatus, subscribeToTicketMessages,
  TICKET_STATUS_MAP, TICKET_PRIORITY_MAP, TICKET_CATEGORY_MAP,
  type TicketDetail, type TicketMessage,
} from '@/services/tickets'
import { supabaseAdmin } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getTicketDetail(id).then(t => {
      setTicket(t)
      setMessages(t?.messages ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  // Realtime subscription
  useEffect(() => {
    if (!id) return
    const unsub = subscribeToTicketMessages(id, async (newMsg) => {
      // Fetch sender name
      const { data: sender } = await supabaseAdmin
        .from('profiles')
        .select('full_name, role')
        .eq('id', newMsg.sender_id)
        .single()

      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, {
          id: newMsg.id,
          created_at: newMsg.created_at,
          content: newMsg.content,
          sender_id: newMsg.sender_id,
          sender_name: sender?.full_name ?? 'Usuário',
          is_admin: sender?.role === 'ADMIN',
        }]
      })
    })
    return unsub
  }, [id])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!id || !user || !message.trim()) return
    const content = message.trim()
    setMessage('')
    setSending(true)
    try {
      await sendTicketMessage(id, user.id, content)
      // Optimistic insert
      setMessages(prev => [...prev, {
        id: `optimistic-${Date.now()}`,
        created_at: new Date().toISOString(),
        content,
        sender_id: user.id,
        sender_name: profile?.full_name ?? 'Admin',
        is_admin: true,
      }])
    } catch {
      toast.error('Erro ao enviar mensagem.')
      setMessage(content)
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!id) return
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(id, status as TicketDetail['status'])
      setTicket(t => t ? { ...t, status: status as TicketDetail['status'] } : t)
      toast.success('Status atualizado.')
    } catch {
      toast.error('Erro ao atualizar status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>
  if (!ticket) return <div className="p-8 text-muted-foreground">Ticket não encontrado.</div>

  const statusInfo = TICKET_STATUS_MAP[ticket.status]
  const priorityInfo = TICKET_PRIORITY_MAP[ticket.priority]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b border-border/50 py-3 px-5">
              <CardTitle className="text-sm">Conversa do Ticket</CardTitle>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm mt-8">Nenhuma mensagem ainda.</p>
              )}
              {messages.map(m => (
                <div
                  key={m.id}
                  className={cn('flex', m.is_admin ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                    m.is_admin
                      ? 'bg-primary/20 text-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    <p className="font-semibold text-xs mb-1 opacity-60">
                      {m.is_admin ? 'Admin' : m.sender_name}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className="text-[10px] opacity-40 mt-1 text-right">{formatDateTime(m.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t border-border/50 p-4">
              <div className="flex gap-2">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Escreva uma resposta… (Enter para enviar)"
                  rows={2}
                  className="flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'}
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending || ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'}
                  size="icon"
                  className="self-end h-10 w-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {(ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && (
                <p className="text-xs text-muted-foreground mt-2">Ticket {ticket.status === 'CLOSED' ? 'fechado' : 'resolvido'} — não é possível enviar mensagens.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Usuário</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{ticket.user_name}</p>
              <p className="text-muted-foreground">{ticket.user_role === 'READER' ? 'Cartomante' : 'Cliente'}</p>
              <Link to={`/users/${ticket.user_id}`} className="text-xs text-primary hover:underline">
                Ver perfil completo
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Gerenciar Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Status</p>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Aberto</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Atendimento</SelectItem>
                    <SelectItem value="RESOLVED">Resolvido</SelectItem>
                    <SelectItem value="CLOSED">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Categoria</p>
                <p className="text-sm font-medium">{TICKET_CATEGORY_MAP[ticket.category] ?? ticket.category}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Prioridade</p>
                <p className={`text-sm font-medium ${priorityInfo.color}`}>{priorityInfo.label}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Aberto em</p>
                <p className="text-sm">{formatDateTime(ticket.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
