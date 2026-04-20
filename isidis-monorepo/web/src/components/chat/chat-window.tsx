
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getActiveGigs, sendMessage, getMessages, markMessagesRead } from '@/lib/actions/chat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, X, MessageCircle, Minimize2, Maximize2, Loader2, Sparkles, Plus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from 'react-router-dom'


interface Gig {
    id: string
    title: string
    price: number
    image_url: string | null
    status?: string
}

interface Message {
    id: string
    sender_id: string
    content: string
    created_at: string
    is_read: boolean
    gig_id?: string
    gig?: Gig
}

interface ChatWindowProps {
    currentUser: { id: string }
    otherUser: { id: string, name: string, avatar?: string }
    orderId?: string
    variant?: 'floating' | 'inline'
    title?: string
    isCartomante?: boolean
    onBack?: () => void
}

export function ChatWindow({ currentUser, otherUser, orderId, variant = 'floating', title, isCartomante = false, onBack }: ChatWindowProps) {
    const [isOpen, setIsOpen] = useState(variant === 'inline')
    const [newMessage, setNewMessage] = useState('')
    const [isMinimized, setIsMinimized] = useState(false)
    const [availableGigs, setAvailableGigs] = useState<Gig[]>([])
    const [isGigsLoading, setIsGigsLoading] = useState(false)
    const [isGigMenuOpen, setIsGigMenuOpen] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()
    const inputRef = useRef<HTMLInputElement>(null)

    // SWR Key for caching
    const swrKey = isOpen ? `chat/${currentUser.id}/${otherUser.id}/${orderId || 'general'}` : null

    // Fetch messages using SWR
    const { data: messages = [], isLoading, mutate: mutateMessages } = useSWR(
        swrKey,
        () => getMessages({ otherUserId: otherUser.id, orderId }),
        {
            refreshInterval: 5000, // Fallback polling every 5s
            revalidateOnFocus: true,
        }
    )

    // Fetch gigs on mount (if user works as cartomante)
    useEffect(() => {
        if (isOpen && !isMinimized && isCartomante && availableGigs.length === 0) {
            setIsGigsLoading(true)
            getActiveGigs()
                .then((gigs: Gig[]) => {
                    setAvailableGigs(gigs || [])
                })
                .catch((err: any) => console.error('Failed to load gigs', err))
                .finally(() => setIsGigsLoading(false))
        }
    }, [isOpen, isMinimized, availableGigs.length])

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0 && isOpen && !isMinimized) {
            scrollToBottom()
        }
    }, [messages.length, isOpen, isMinimized])

    // Mark existing unread messages as read when window opens or new messages arrive
    useEffect(() => {
        if (!isOpen || isMinimized || isLoading || messages.length === 0) return

        const unreadMessages = messages.filter(
            msg => !msg.is_read && msg.sender_id === otherUser.id
        )

        if (unreadMessages.length > 0) {
            const ids = unreadMessages.map(m => m.id)
            markMessagesRead(ids)

            // Optimistically update local cache to prevent repeated calls
            mutateMessages(current => {
                if (!current) return current
                return current.map(m =>
                    ids.includes(m.id) ? { ...m, is_read: true } : m
                )
            }, false)
        }
    }, [messages, isOpen, isMinimized, isLoading, otherUser.id, mutateMessages])

    // Subscribe to realtime messages
    useEffect(() => {
        if (!isOpen) return

        const channel = supabase
            .channel(`chat:${currentUser.id}:${otherUser.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: orderId ? `order_id=eq.${orderId}` : `order_id=is.null`,
            }, async (payload) => {
                const newMsg = payload.new as Message
                // We need to fetch the gig details if present, but for now we'll just let SWR revalidate
                // or we could optimistically fetch it. simpler to just revalidate.

                // Optimistic update check
                await mutateMessages(async (currentMessages) => {
                    // If we have a gig_id, we might want to force a fetch to get the joined gig data
                    // But for immediate feedback, we can just show the message content
                    if (newMsg.gig_id) {
                        try {
                            // Quick fetch for the single message to get relations
                            const { data } = await supabase
                                .from('messages')
                                .select('*, gig:gigs(id, title, price, image_url, slug)')
                                .eq('id', newMsg.id)
                                .single()
                            if (data) return [...(currentMessages || []), data]
                        } catch (e) { console.error(e) }
                    }

                    if (!currentMessages) return [newMsg]
                    if (currentMessages.find(m => m.id === newMsg.id)) return currentMessages
                    return [...currentMessages, newMsg]
                })

                if (newMsg.sender_id === otherUser.id && !document.hidden && !isMinimized) {
                    markMessagesRead([newMsg.id])
                }
                scrollToBottom()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [isOpen, currentUser.id, otherUser.id, orderId, supabase, mutateMessages, isMinimized])

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        }, 100)
    }

    const handleSend = async (customContent?: string, gigId?: string) => {
        const msgContent = customContent || newMessage
        if (!msgContent.trim() && !gigId) return

        const tempId = crypto.randomUUID()
        setNewMessage('') // Clear input immediately

        // Close menu if open
        setIsGigMenuOpen(false)

        // Optimistic message
        // Note: For gig messages, we won't have the full gig data immediately in the optimistic UI
        // unless we pass it in. For simplicity, we'll let the text show and wait for server/realtime for the card
        // OR we can find the gig in availableGigs
        let optimisticGig = undefined
        if (gigId && availableGigs.length > 0) {
            optimisticGig = availableGigs.find(g => g.id === gigId)
        }

        const optimisticMsg: Message = {
            id: tempId,
            sender_id: currentUser.id,
            content: msgContent,
            created_at: new Date().toISOString(),
            is_read: false,
            gig_id: gigId,
            gig: optimisticGig
        }

        // Optimistic update
        await mutateMessages((current) => [...(current || []), optimisticMsg], false)
        scrollToBottom()

        try {
            const response = await sendMessage({
                receiverId: otherUser.id,
                content: msgContent,
                orderId,
                gigId,
                id: tempId
            })

            if (response?.error) {
                toast.error(response.error)
                throw new Error(response.error)
            }
        } catch (error) {
            console.error('Failed to send', error)
            toast.error('Erro ao enviar mensagem. Tente novamente.')
            // Rollback on error
            await mutateMessages((current) => current?.filter(m => m.id !== tempId), false)
            if (!customContent) setNewMessage(msgContent) // Restore input if it was text
        }
    }

    if (!isOpen && variant === 'floating') {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white z-50 animate-bounce-subtle"
            >
                <MessageCircle className="w-6 h-6" />
            </Button>
        )
    }

    const containerClasses = variant === 'floating'
        ? cn(
            "fixed bottom-6 right-6 w-80 md:w-96 bg-card border border-border/50 shadow-2xl rounded-2xl overflow-hidden z-50 transition-all duration-300 flex flex-col",
            isMinimized ? "h-14" : "h-[500px]"
        )
        : "w-full h-full bg-card/30 border border-border/50 rounded-2xl flex flex-col"

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 md:hidden" onClick={onBack}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold text-sm text-foreground">
                        {title || otherUser.name}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {variant === 'floating' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
                            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                        </Button>
                    )}
                    {variant === 'floating' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50 scroll-smooth">
                        {isLoading && messages.length === 0 && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!isLoading && messages.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground mt-10">
                                <p>Comece a conversa com {otherUser.name}.</p>
                                <p>Pergunte sobre leituras ou tire dúvidas.</p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isMe = msg.sender_id === currentUser.id
                            return (
                                <div key={msg.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                                    {/* Gig Card if present */}
                                    {msg.gig && (
                                        <div className={cn(
                                            "w-64 rounded-xl border overflow-hidden mb-1",
                                            isMe ? "bg-card/80 border-primary/20" : "bg-card/80 border-border/50"
                                        )}>
                                            <div className="h-32 w-full bg-muted relative">
                                                {msg.gig.image_url ? (
                                                    <img src={msg.gig.image_url} alt={msg.gig.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/20">
                                                        <img src="/logo.png" alt="" width={32} height={32} className="w-8 h-8 object-contain opacity-50" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <h4 className="font-bold text-sm text-white line-clamp-1">{msg.gig.title}</h4>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs text-green-400 font-bold">R$ {(msg.gig.price / 100).toFixed(2)}</span>
                                                    <Link to={`/checkout/${msg.gig.id}`}>
                                                        <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
                                                            Contratar
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    {msg.content && (
                                        <div className={cn(
                                            "max-w-[80%] px-3 py-2 rounded-xl text-sm break-words",
                                            isMe
                                                ? "bg-indigo-600/80 text-white rounded-br-none"
                                                : "bg-muted text-foreground rounded-bl-none"
                                        )}>
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-border/50 bg-card/50 shrink-0">
                        {/* Gig Selector */}
                        {isCartomante && availableGigs.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                            </div>
                        )}

                        <div className="flex gap-2 items-end">
                            {isCartomante && (
                                <DropdownMenu open={isGigMenuOpen} onOpenChange={setIsGigMenuOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="shrink-0 h-10 px-3 flex gap-2 items-center text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
                                            disabled={isGigsLoading}
                                        >
                                            {isGigsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            <span className="hidden sm:inline text-xs font-bold">Oferta</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-72 p-0 bg-card border-border/50 shadow-xl" align="start" side="top">
                                        <div className="p-3 border-b border-border/50">
                                            <h3 className="text-sm font-bold text-foreground">Recomendar Serviço</h3>
                                            <p className="text-[10px] text-muted-foreground mt-1 text-balance">
                                                Escolha um de seus serviços para oferecer ao consulente.
                                            </p>
                                        </div>
                                        <ScrollArea className="h-72">
                                            <div className="p-1 space-y-1">
                                                {availableGigs.length > 0 ? (
                                                    availableGigs.map(gig => (
                                                        <DropdownMenuItem
                                                            key={gig.id}
                                                            onClick={() => handleSend(`Confira este serviço: ${gig.title}`, gig.id)}
                                                            className="w-full text-left p-2 rounded-lg hover:bg-accent/50 transition-colors flex gap-2 items-start cursor-pointer"
                                                        >
                                                            <div className="w-12 h-12 rounded-md bg-muted shrink-0 overflow-hidden border border-border/50">
                                                                {gig.image_url ? (
                                                                    <img src={gig.image_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/10">
                                                                        <img src="/logo.png" alt="" width={16} height={16} className="w-4 h-4 object-contain opacity-30" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">{gig.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-1.5 py-0.5 rounded">
                                                                        R$ {(gig.price / 100).toFixed(2)}
                                                                    </span>
                                                                    {gig.status === 'PENDING' && (
                                                                        <span className="text-[8px] text-yellow-500 font-bold px-1 py-0.5 bg-yellow-500/10 rounded uppercase">Pendente</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </DropdownMenuItem>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <p className="text-xs text-muted-foreground">
                                                            {isGigsLoading ? "Carregando serviços..." : "Nenhum serviço disponível para oferecer."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSend()
                                }}
                                className="flex-1 flex gap-2"
                            >
                                <Input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    className="bg-background/50 border-border/50 focus-visible:ring-primary/50"
                                />
                                <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90" disabled={!newMessage.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
