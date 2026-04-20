
import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { ChatWindow } from '@/components/chat/chat-window'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { getConversations } from '@/lib/actions/chat'

interface Conversation {
    otherUser: {
        id: string
        name: string
        avatar?: string
    }
    orderId: string | null
    lastMessage: {
        content: string
        created_at: string
        is_read: boolean
        sender_id: string
    }
    unreadCount: number
}

interface MessagesClientProps {
    initialConversations: Conversation[]
    currentUserId: string
    initialOrderId?: string
    targetCartomante?: {
        id: string
        name: string
        avatar?: string
    } | null
}

export function MessagesClient({ initialConversations, currentUserId, initialOrderId, targetCartomante }: MessagesClientProps) {
    // SWR for data fetching
    // refreshInterval: 5000 (5 seconds) ensures we always get updates even if realtime fails
    const { data: conversations, mutate } = useSWR('conversations', getConversations, {
        fallbackData: initialConversations,
        refreshInterval: 5000,
        revalidateOnFocus: true
    })

    const [activeConv, setActiveConv] = useState<Conversation | null>(null)
    const supabase = createClient()
    const initializedRef = useRef(false)

    useEffect(() => {
        if ((initialOrderId || targetCartomante) && !initializedRef.current) {
            console.log('Trying to init chat. OrderId:', initialOrderId, 'Cartomante:', targetCartomante)

            if (conversations) {
                // Try to find existing conversation
                let found = null

                if (initialOrderId) {
                    found = conversations.find(c => c.orderId === initialOrderId)
                } else if (targetCartomante) {
                    found = conversations.find(c => c.otherUser.id === targetCartomante.id && !c.orderId)
                }

                console.log('Found conversation:', found)

                if (found) {
                    setActiveConv(found)
                    initializedRef.current = true
                } else if (targetCartomante) {
                    console.log('Creating temp conversation with cartomante:', targetCartomante)
                    // Create temporary conversation if not found
                    setActiveConv({
                        otherUser: targetCartomante,
                        orderId: initialOrderId || null,
                        lastMessage: {
                            content: '',
                            created_at: new Date().toISOString(),
                            is_read: true,
                            sender_id: currentUserId
                        },
                        unreadCount: 0
                    })
                    initializedRef.current = true
                }
            }
        }
    }, [initialOrderId, conversations, targetCartomante, currentUserId])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`inbox:${currentUserId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                console.log('Realtime update received, mutating SWR...', payload)
                mutate() // Instant revalidation on event
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId, mutate, supabase])

    const displayConversations = conversations || initialConversations

    return (
        <div className="flex h-full gap-6">
            {/* Conversation List */}
            <div className={`w-full md:w-1/3 lg:w-1/4 space-y-4 overflow-y-auto pr-2 ${activeConv ? 'hidden md:block' : 'block'}`}>
                <h2 className="text-xl font-bold text-foreground">Mensagens</h2>
                {displayConversations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma conversa ainda.</p>
                ) : (
                    <div className="space-y-2">
                        {displayConversations.map((conv, idx) => (
                            <Card
                                key={idx}
                                onClick={() => setActiveConv(conv)}
                                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors border-border/40 ${activeConv?.otherUser.id === conv.otherUser.id && activeConv?.orderId === conv.orderId ? 'bg-accent border-primary/50' : 'bg-card/50'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-sm text-foreground">{conv.otherUser.name}</h3>
                                    {conv.unreadCount > 0 && (
                                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{conv.unreadCount}</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                    {conv.lastMessage.sender_id === currentUserId && 'Você: '}
                                    {conv.lastMessage.content}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                    <span>{conv.orderId ? `Pedido #${conv.orderId.substring(0, 8)}` : 'Pré-venda'}</span>
                                    <span>{timeAgo(conv.lastMessage.created_at)}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className={`flex-1 bg-card/30 rounded-2xl border border-border/40 overflow-hidden relative ${activeConv ? 'block' : 'hidden md:block'}`}>
                {activeConv ? (
                    <div className="w-full h-full flex flex-col">
                        {/* Mobile Header */}
                        <div className="md:hidden p-4 border-b border-white/10 flex items-center gap-3 bg-card/50">
                            <button
                                onClick={() => setActiveConv(null)}
                                className="text-sm font-bold text-primary hover:text-primary/80"
                            >
                                ← Voltar
                            </button>
                            <span className="font-bold truncate">{activeConv.otherUser.name}</span>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <ChatWindow
                                currentUser={{ id: currentUserId }}
                                otherUser={activeConv.otherUser}
                                orderId={activeConv.orderId || undefined}
                                variant="inline"
                                title={activeConv.orderId ? `${activeConv.otherUser.name} (Pedido)` : `${activeConv.otherUser.name} (Pré-venda)`}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Selecione uma conversa para ver as mensagens.
                    </div>
                )}
            </div>
        </div>
    )
}

function timeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'agora'

    const minutes = Math.floor(diffInSeconds / 60)
    if (minutes < 60) return `${minutes}m atrás`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h atrás`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d atrás`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months} mes(es) atrás`

    return 'há muito tempo'
}
