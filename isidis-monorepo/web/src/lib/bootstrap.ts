import apiClient from '@/lib/apiClient'
import { createClient } from '@/lib/supabase/client'

export function sanitizeNextPath(next?: string | null) {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

export async function getReaderDestination(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', userId)
    .single()

  if (data?.verification_status === 'APPROVED') return '/dashboard/cartomante'
  if (data?.verification_status === 'PENDING') return '/dashboard/cartomante/under-review'
  return '/onboarding'
}

export async function getClientDestination() {
  try {
    const response = await apiClient.get<{ data: { completed: boolean } }>('/me/quiz')
    return response.data.data.completed ? '/dashboard' : '/quiz-onboarding'
  } catch {
    return '/dashboard'
  }
}

export async function getPostAuthDestination(
  role: string | undefined,
  userId: string,
  next?: string | null,
) {
  const safeNext = sanitizeNextPath(next)
  if (safeNext) return safeNext

  if (role === 'READER') {
    return getReaderDestination(userId)
  }

  // user_metadata pode estar desatualizado; confirma pelo profiles como fonte de verdade
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (data?.role === 'READER') {
    return getReaderDestination(userId)
  }

  return getClientDestination()
}
