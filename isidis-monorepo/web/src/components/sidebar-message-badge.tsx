
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUnreadMessageCount } from '@/lib/actions/chat'

interface SidebarMessageBadgeProps {
    userId: string
}

export function SidebarMessageBadge({ userId }: SidebarMessageBadgeProps) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        // Initial fetch
        getUnreadMessageCount().then(setCount)

        const supabase = createClient()
        const channel = supabase
            .channel(`sidebar_messages:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            }, (payload) => {
                // Increment on new message
                setCount(prev => prev + 1)
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            }, (payload: any) => {
                // Decrement if message is read
                if (payload.new.is_read && !payload.old.is_read) {
                    setCount(prev => Math.max(0, prev - 1))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    if (count === 0) return null

    return (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
        </span>
    )
}
