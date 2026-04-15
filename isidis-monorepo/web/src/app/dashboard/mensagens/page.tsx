import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { getConversations } from '@/app/actions/chat'
import { MessagesClient } from './messages-client'
import { UserSidebar } from '@/components/user-sidebar'
import { useAuth } from '@/hooks/useAuth'

export default function MessagesPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [conversations, setConversations] = useState<any[]>([])
    const [targetCartomante, setTargetCartomante] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const orderId = searchParams.get('orderId') || undefined
    const cartomanteId = searchParams.get('cartomanteId') || undefined

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        const fetchAll = async () => {
            const convs = await getConversations()
            setConversations(convs || [])

            if (cartomanteId) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('id', cartomanteId)
                    .single()
                if (profileData) {
                    setTargetCartomante({
                        id: profileData.id,
                        name: profileData.full_name || 'Cartomante',
                        avatar: profileData.avatar_url,
                    })
                }
            }
            setLoading(false)
        }

        fetchAll()
    }, [user, authLoading, cartomanteId])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando...</p></div>
    if (!user) return null

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />
            <main className="relative z-10 flex-1 h-screen flex flex-col overflow-hidden pb-safe md:pb-0">
                <div className="flex-1 overflow-hidden p-4 md:p-8">
                    <MessagesClient
                        initialConversations={conversations}
                        currentUserId={user.id}
                        initialOrderId={orderId}
                        targetCartomante={targetCartomante}
                    />
                </div>
            </main>
        </div>
    )
}
