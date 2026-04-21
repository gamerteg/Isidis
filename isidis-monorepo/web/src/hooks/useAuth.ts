import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(prev => {
        const next = session?.user ?? null
        if (prev?.id === next?.id) return prev
        return next
      })
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(prev => {
        const next = session?.user ?? null
        if (prev?.id === next?.id) return prev
        return next
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
