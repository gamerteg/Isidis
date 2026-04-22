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
    let mounted = true

    async function handleAuthChange(session: Session | null) {
      if (!mounted) return

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          
          if (!mounted) return

          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            isAdmin: profile?.role === 'ADMIN',
          })
        } catch (error) {
          console.error('[useAuth] Error fetching profile:', error)
          
          if (!mounted) return

          // If we have a session but can't fetch the profile, it might be a stale session.
          // We clear the state but don't force a sign out immediately to avoid loops,
          // but we set loading to false so the UI can respond.
          setState({
            user: session.user,
            session,
            profile: null,
            loading: false,
            isAdmin: false,
          })

          // Optional: If error is 401, sign out
          if (error instanceof Error && (error.message.includes('401') || error.message.includes('JWT'))) {
            supabase.auth.signOut()
          }
        }
      } else {
        setState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          isAdmin: false,
        })
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleAuthChange(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...state, signOut }
}

async function fetchProfile(userId: string): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
