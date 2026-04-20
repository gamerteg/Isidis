import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { ProfileForm } from '@/components/profile/ReaderProfileForm'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { useAuth } from '@/hooks/useAuth'

export default function PerfilPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/perfil'); return }

        const supabase = createClient()
        supabase.from('profiles').select('*').eq('id', user.id).single()
            .then(({ data }) => { setProfile(data); setLoading(false) })
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando perfil...</p></div>
    if (!user) return null

    return (
        <div className="flex h-screen bg-background-deep overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />
            <main className="flex-1 overflow-y-auto w-full">
                <ProfileForm
                    email={user.email || ''}
                    profile={profile || {}}
                />
            </main>
        </div>
    )
}
