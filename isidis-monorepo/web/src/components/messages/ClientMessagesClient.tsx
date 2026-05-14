
import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { ArrowLeft } from 'lucide-react'
import { ChatWindow } from '@/components/chat/chat-window'
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
        <div style={{ display: 'flex', height: '100%', gap: 0 }}>
            {/* Conversation List */}
            <div style={{
                width: activeConv ? '0' : '100%',
                maxWidth: 340,
                flexShrink: 0,
                overflowY: 'auto',
                display: activeConv ? 'none' : 'flex',
                flexDirection: 'column',
                gap: 0,
                borderRight: '1px solid rgba(255,255,255,.06)',
            }}
                className="md:!flex md:!w-80"
            >
                {/* Header */}
                <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 2 }}>
                        Inbox
                    </div>
                    <div className="font-serif" style={{ fontSize: 20, fontWeight: 400 }}>
                        Mensagens
                    </div>
                </div>

                {displayConversations.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
                        Nenhuma conversa ainda.
                    </div>
                ) : (
                    <div>
                        {displayConversations.map((conv, idx) => {
                            const isActive = activeConv?.otherUser.id === conv.otherUser.id && activeConv?.orderId === conv.orderId
                            const initials = (conv.otherUser.name || 'CA').slice(0, 2).toUpperCase()
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveConv(conv)}
                                    style={{
                                        width: '100%', textAlign: 'left', background: isActive ? 'rgba(167,139,250,.12)' : 'transparent',
                                        borderLeft: isActive ? '2px solid #a78bfa' : '2px solid transparent',
                                        padding: '12px 18px', cursor: 'pointer', borderTop: 'none', borderRight: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
                                        display: 'flex', gap: 10, alignItems: 'center',
                                        transition: 'background .15s',
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(160deg,#2a1b5e,#1a0e3d)',
                                        border: '1px solid rgba(167,139,250,.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: 700, color: '#a78bfa',
                                        overflow: 'hidden',
                                    }}>
                                        {conv.otherUser.avatar
                                            ? <img src={conv.otherUser.avatar} alt={conv.otherUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {conv.otherUser.name}
                                            </span>
                                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', flexShrink: 0, marginLeft: 4 }}>
                                                {timeAgo(conv.lastMessage.created_at)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                {conv.lastMessage.sender_id === currentUserId && 'Você: '}
                                                {conv.lastMessage.content || '—'}
                                            </span>
                                            {conv.unreadCount > 0 && (
                                                <span style={{
                                                    background: '#f87171', color: 'white', borderRadius: '50%',
                                                    minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                background: 'rgba(17,13,34,.5)',
            }}
                className={activeConv ? '!flex' : 'hidden md:!flex'}
            >
                {activeConv ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Mobile header */}
                        <div style={{
                            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }} className="md:hidden">
                            <button
                                type="button"
                                onClick={() => setActiveConv(null)}
                                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <ArrowLeft size={13} />
                            </button>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{activeConv.otherUser.name}</div>
                                <div style={{ fontSize: 9, color: 'rgba(74,222,128,.8)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                                    Online
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden' }}>
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
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 28, opacity: 0.2 }}>✦</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.25)' }}>Selecione uma conversa</div>
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
