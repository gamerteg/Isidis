import { useEffect, useState } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AdminProfile {
  id: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

interface AuthState {
  user: User | null
  profile: AdminProfile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isAdmin: false,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
          isAdmin: profile?.role === 'ADMIN',
        })
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
          isAdmin: profile?.role === 'ADMIN',
        })
      } else {
        setState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          isAdmin: false,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...state, signOut }
}

async function fetchProfile(userId: string): Promise<AdminProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', userId)
    .single()
  return data
}
