
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Send, User, ShieldCheck, MessageSquare, LifeBuoy } from 'lucide-react'
import { addTicketMessage } from '@/lib/actions/tickets'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    content: string
    created_at: string
    sender_id: string
    sender: {
        full_name: string | null
        avatar_url: string | null
        role: string
    }
}

export function TicketChat({
    ticketId,
    initialMessages,
    currentUserId
}: {
    ticketId: string,
    initialMessages: Message[],
    currentUserId: string
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        const scrollToBottom = () => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        const channel = supabase
            .channel(`ticket_messages:${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ticket_messages',
                    filter: `ticket_id=eq.${ticketId}`,
                },
                async (payload) => {
                    // Fetch sender info for the new message
                    const { data: senderData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url, role')
                        .eq('id', payload.new.sender_id)
                        .single()

                    const newMsg: Message = {
                        id: payload.new.id,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        sender_id: payload.new.sender_id,
                        sender: senderData as any
                    }

                    setMessages((prev) => {
                        if (prev.find(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [ticketId, supabase])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        try {
            const result = await addTicketMessage({ ticketId, content: newMessage })
            if (result.success) {
                setNewMessage('')
            } else {
                toast.error(result.error || 'Erro ao enviar mensagem')
            }
        } catch (error) {
            toast.error('Erro ao enviar mensagem')
        } finally {
            setSending(false)
        }
    }

    return (
        <Card className="flex flex-col h-[600px] border-border/50">
            <CardHeader className="py-4 border-b border-border/50 bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Histórico da Conversa
                </h3>
            </CardHeader>
            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    const isAdmin = msg.sender.role === 'ADMIN'

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col max-w-[80%] space-y-1",
                                isOwn ? "ml-auto items-end" : "mr-auto items-start"
                            )}
                        >
                            <div className="flex items-center gap-2 px-1">
                                {!isOwn && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        {isAdmin && <ShieldCheck className="w-3 h-3 text-primary" />}
                                        {msg.sender.full_name || 'Usuário'}
                                        {isAdmin && ' (Suporte)'}
                                    </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                </span>
                            </div>
                            <div
                                className={cn(
                                    "px-4 py-2 rounded-2xl text-sm shadow-sm",
                                    isOwn
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : isAdmin
                                            ? "bg-black/5 dark:bg-white/10 border border-primary/20 rounded-tl-none"
                                            : "bg-muted rounded-tl-none"
                                )}
                            >
                                {msg.content}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
            <CardFooter className="p-4 border-t border-border/50 bg-card">
                <form onSubmit={handleSend} className="flex w-full gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem aqui..."
                        className="min-h-[44px] max-h-[120px] resize-none py-3"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend(e)
                            }
                        }}
                    />
                    <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="h-[44px] w-[44px] shrink-0">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}
