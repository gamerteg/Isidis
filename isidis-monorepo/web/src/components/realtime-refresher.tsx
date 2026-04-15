import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'

interface RealtimeRefresherProps {
  userId: string
}

export function RealtimeRefresher({ userId }: RealtimeRefresherProps) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const emitRefresh = () => {
      window.dispatchEvent(
        new CustomEvent('orders:changed', {
          detail: { userId },
        }),
      )
    }

    const channel = supabase
      .channel(`orders_refresh_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${userId}`,
        },
        emitRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `reader_id=eq.${userId}`,
        },
        emitRefresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return null
}
