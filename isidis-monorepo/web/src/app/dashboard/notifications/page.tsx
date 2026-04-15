
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { getNotificationsPaginated, markAllNotificationsRead, markNotificationRead } from '@/app/actions/notifications'
import { Button } from '@/components/ui/button'
import { Bell, Check, Loader2 } from 'lucide-react'
import {  useNavigate  } from 'react-router-dom'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    created_at: string
}

export default function NotificationsPage() {
    const [page, setPage] = useState(1)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [total, setTotal] = useState(0)
    const navigate = useNavigate()

    const { data, isLoading, mutate } = useSWR(
        ['notifications-page', page],
        () => getNotificationsPaginated(page, 20),
        {
            onSuccess: (data) => {
                // If page 1, replace. If > 1, append? 
                // Actually SWR cache key changes, so simple pagination.
                // Or we can implementing Load More. Let's do Load More.
                if (page === 1) {
                    setNotifications(data.data)
                } else {
                    setNotifications(prev => [...prev, ...data.data])
                }
                setTotal(data.count)
            }
        }
    )

    const handleMarkAll = async () => {
        try {
            await markAllNotificationsRead()
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            mutate()
        } catch (error) {
            console.error(error)
        }
    }

    const handleMarkRead = async (id: string, link: string | null) => {
        try {
            await markNotificationRead(id)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
            if (link) navigate(link)
        } catch (error) {
            console.error(error)
        }
    }

    // Realtime subscription for notifications
    const supabase = createClient()
    useEffect(() => {
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const channel = supabase
                .channel('realtime_notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, () => {
                    mutate() // Refresh SWR data
                })
                .subscribe()

            return channel
        }

        let channel: any
        setupRealtime().then(c => channel = c)

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [supabase, mutate])

    const loadMore = () => setPage(p => p + 1)
    const hasMore = notifications.length < total

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Bell className="w-6 h-6 text-indigo-400" />
                        Notificações
                    </h1>
                    <p className="text-slate-400 mt-1">Histórico de atividades e avisos.</p>
                </div>
                {notifications.some(n => !n.read) && (
                    <Button onClick={handleMarkAll} variant="outline" className="text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/10">
                        <Check className="w-4 h-4 mr-2" />
                        Marcar todas como lidas
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {notifications.length === 0 && !isLoading ? (
                    <div className="py-12 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/5">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Nenhuma notificação encontrada.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleMarkRead(n.id, n.link)}
                            className={`p-6 rounded-xl border transition-all cursor-pointer hover:border-indigo-500/30 hover:bg-white/5
                                ${!n.read ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-[#12122a] border-white/5'}
                            `}
                        >
                            <div className="flex justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${!n.read ? 'bg-indigo-500 animate-pulse' : 'bg-transparent'}`} />
                                    <div>
                                        <h3 className={`text-base ${!n.read ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                                            {n.title}
                                        </h3>
                                        <p className="text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                        <span className="text-xs text-slate-600 mt-2 block capitalize">
                                            {n.type.toLowerCase().replace('_', ' ')} • {new Date(n.created_at).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                )}

                {hasMore && !isLoading && (
                    <div className="text-center pt-4">
                        <Button onClick={loadMore} variant="ghost" className="text-slate-400 hover:text-white">
                            Carregar antigas
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
