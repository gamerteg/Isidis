import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { getConversations } from '@/lib/actions/chat'
import { MessagesClient } from '@/components/messages/ReaderMessagesClient'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'
import { useAuth } from '@/hooks/useAuth'

export default function MessagesPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const orderId = searchParams.get('orderId') || undefined
    const clientId = searchParams.get('clientId') || undefined

    const [profile, setProfile] = useState<any>(null)
    const [conversations, setConversations] = useState<any[]>([])
    const [targetClient, setTargetClient] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const [profileResult, convs] = await Promise.all([
                supabase.from('profiles').select('full_name, avatar_url, specialties, verification_status').eq('id', user.id).single(),
                getConversations(),
            ])

            setProfile(profileResult.data)
            setConversations(convs || [])

            if (clientId) {
                const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', clientId).single()
                if (data) setTargetClient({ id: data.id, name: data.full_name || 'Cliente', avatar: data.avatar_url })
            }

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading, clientId])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando mensagens...</p></div>
    if (!user) return null

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />
            <main className="relative z-10 flex-1 h-screen flex flex-col overflow-hidden pb-safe md:pb-0">
                <div className="flex-1 overflow-hidden p-4 md:p-8">
                    <MessagesClient
                        initialConversations={conversations}
                        currentUserId={user.id}
                        initialOrderId={orderId}
                        targetClient={targetClient}
                    />
                </div>
            </main>
        </div>
    )
}
