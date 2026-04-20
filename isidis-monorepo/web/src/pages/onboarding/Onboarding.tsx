import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import ReaderOnboardingPage from '@/pages/dashboard/reader/Onboarding'
import { useAuth } from '@/hooks/useAuth'
import { getReaderDestination } from '@/lib/bootstrap'

export default function ReaderOnboardingEntryPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login?next=/onboarding')
      return
    }

    if (user.user_metadata?.role !== 'READER') {
      navigate('/dashboard')
      return
    }

    getReaderDestination(user.id).then((destination) => {
      if (destination !== '/onboarding') {
        navigate(destination, { replace: true })
      }
    })
  }, [loading, navigate, user])

  if (loading || !user || user.user_metadata?.role !== 'READER') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Carregando onboarding...</p>
      </div>
    )
  }

  return <ReaderOnboardingPage />
}
