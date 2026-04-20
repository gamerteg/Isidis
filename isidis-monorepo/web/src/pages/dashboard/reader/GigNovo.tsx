import React, { Suspense, useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const GigForm = React.lazy(() => import('@/components/gigs/GigForm').then(mod => ({ default: mod.GigForm })))

export default function NovoGigPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
    const [initialData, setInitialData] = useState<any>(undefined)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/cartomante/gigs/novo'); return }

        const supabase = createClient()
        const editId = searchParams.get('edit')

        const fetchData = async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('verification_status')
                .eq('id', user.id)
                .single()

            setVerificationStatus(profile?.verification_status || null)

            if (editId && profile?.verification_status === 'APPROVED') {
                const { data: gig } = await supabase
                    .from('gigs')
                    .select('*')
                    .eq('id', editId)
                    .eq('owner_id', user.id)
                    .single()

                if (gig) setInitialData(gig)
            }

            setLoading(false)
        }

        fetchData()
    }, [user, authLoading, searchParams])

    if (authLoading || loading) return <div className="p-8 text-center text-slate-400">Carregando...</div>

    if (verificationStatus !== 'APPROVED') {
        return (
            <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
                <div className="bg-[#12122a] border border-indigo-500/20 rounded-2xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⏳</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Verificação Necessária</h1>
                    <p className="text-slate-400 mb-6">
                        Para manter a qualidade do nosso santuário, você precisa completar seu perfil profissional antes de criar serviços.
                        Após salvar seu perfil completo, você poderá criar seus gigs.
                    </p>
                    <Link to="/dashboard/cartomante/perfil" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
                        Complete Profile
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Carregando formulário...</div>}>
            <GigForm initialData={initialData} />
        </Suspense>
    )
}
