
import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Bell, Check, ExternalLink, MessageCircle, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications'
import {  useNavigate  } from 'react-router-dom'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    created_at: string
}

import { createClient } from '@/lib/supabase/client'

export function NotificationsBell({ currentUserId }: { currentUserId?: string }) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    const { data: notifications = [], mutate } = useSWR('notifications', getNotifications, {
        refreshInterval: 30000,
        revalidateOnFocus: true
    })

    const unreadCount = notifications.filter((n: Notification) => !n.read).length

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMarkRead = async (id: string, link: string | null) => {
        // Optimistic update
        await mutate(notifications.map(n => n.id === id ? { ...n, read: true } : n), false)

        await markNotificationRead(id)
        // Revalidate to sync with server
        mutate()

        if (link) {
            setOpen(false)
            navigate(link)
        }
    }

    const handleMarkAllRead = async () => {
        // Optimistic update
        await mutate(notifications.map(n => ({ ...n, read: true })), false)

        await markAllNotificationsRead()
        mutate()
    }


    // Realtime subscription
    useEffect(() => {
        if (!currentUserId) return

        const supabase = createClient()
        const channel = supabase
            .channel(`notifications:${currentUserId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${currentUserId}`
            }, (payload) => {
                // Add new notification to list optimistically
                mutate((currentData: any) => {
                    const newNotification = payload.new;
                    if (!currentData) return [newNotification];
                    if (currentData.some((n: any) => n.id === newNotification.id)) return currentData;
                    return [newNotification, ...currentData];
                }, false);

                // Revalidate with server in the background to ensure sync
                mutate();
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [currentUserId, mutate])

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative w-10 h-10 rounded-xl border border-indigo-500/15 bg-[#12122a] flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0a0f]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1a1a24] border border-indigo-500/20 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-3 border-b border-indigo-500/10 bg-[#12122a]">
                        <h3 className="text-sm font-bold text-white">Notificações</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
                            >
                                Marcar todas lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs">Nenhuma notificação</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-indigo-500/5">
                                {notifications.map((n: Notification) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleMarkRead(n.id, n.link)}
                                        className={`p-4 hover:bg-white/5 cursor-pointer transition-colors relative ${!n.read ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        {!n.read && (
                                            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500" />
                                        )}
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">
                                                {n.type.includes('ORDER') ? (
                                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                                        <span className="text-xs">📦</span>
                                                    </div>
                                                ) : n.type.includes('REVIEW') ? (
                                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                                        <span className="text-xs">⭐</span>
                                                    </div>
                                                ) : n.type.includes('WITHDRAWAL') ? (
                                                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                                        <span className="text-xs">💰</span>
                                                    </div>
                                                ) : n.type.includes('MESSAGE') ? (
                                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                                        <MessageCircle className="w-4 h-4" />
                                                    </div>
                                                ) : n.type === 'ADMIN_GIG_PENDING' ? (
                                                    <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                ) : n.type === 'ADMIN_USER_PENDING' ? (
                                                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                                        <Users className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center">
                                                        <Bell className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className={`text-sm ${!n.read ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                                                    {n.title}
                                                </h4>
                                                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-slate-600 mt-2 block">
                                                    {new Date(n.created_at).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-indigo-500/10 bg-[#12122a] text-center">
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-indigo-400 hover:text-white h-8"
                            onClick={() => {
                                setOpen(false);
                                const isAdmin = notifications.some((n: Notification) => n.type.startsWith('ADMIN_'));
                                navigate(isAdmin ? '/admin' : '/dashboard/notifications')
                            }}
                        >
                            Ver todas as notificações
                            <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
