import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import OnboardingPage from '@/components/onboarding/ReaderOnboardingClient'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function Page() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(undefined)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()
        supabase.from('profiles')
            .select('tax_id, cnpj, pix_key, pix_key_type, verification_status')
            .eq('id', user.id).single()
            .then(({ data }) => {
                if (data?.verification_status === 'APPROVED') {
                    navigate('/dashboard/cartomante')
                } else {
                    setProfile(data || undefined)
                    setLoading(false)
                }
            })
    }, [user, authLoading])

    if (authLoading || loading) return <PageSkeleton rows={2} />
    if (!user) return null

    return <OnboardingPage initialProfile={profile} />
}
