import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Check, X, User, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateCartomanteStatus } from './actions'
import { useAuth } from '@/hooks/useAuth'

export default function CartomantesApprovalPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [pendingCartomantes, setPendingCartomantes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('profiles')
            .select('*').eq('role', 'CARTOMANTE').eq('verification_status', 'PENDING')
            .order('created_at', { ascending: false })
        setPendingCartomantes(data || [])
    }

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()
        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
            if (data?.role !== 'ADMIN') { navigate('/'); return }
            fetchData().then(() => setLoading(false))
        })
    }, [user, authLoading])

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        await updateCartomanteStatus(id, status)
        fetchData()
    }

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-6">Cartomante Applications</h1>
            <div className="grid gap-4">
                {pendingCartomantes.length === 0 ? (
                    <div className="text-slate-500 p-8 border border-white/5 rounded-xl text-center">
                        No pending applications.
                    </div>
                ) : (
                    pendingCartomantes.map((profile) => (
                        <div key={profile.id} className="bg-[#12121a] border border-white/10 rounded-xl p-6 flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden shrink-0">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-white">{profile.full_name || 'Unnamed'}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                                            CPF/CNPJ: {profile.cpf_cnpj || 'N/A'}
                                        </span>
                                        {profile.instagram_handle && (
                                            <a href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-xs text-pink-400 flex items-center gap-1 hover:bg-pink-500/20">
                                                <Instagram className="w-3 h-3" />@{profile.instagram_handle.replace('@', '')}
                                            </a>
                                        )}
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                                            Exp: {profile.experience_years} years
                                        </span>
                                    </div>
                                    {profile.bio && (
                                        <p className="text-sm text-slate-500 mt-2 max-w-2xl bg-black/20 p-3 rounded-lg border border-white/5">
                                            {profile.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <Button className="w-32 bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => handleAction(profile.id, 'APPROVED')}>
                                    <Check className="w-4 h-4" /> Approve
                                </Button>
                                <Button variant="destructive" className="w-32 gap-2" onClick={() => handleAction(profile.id, 'REJECTED')}>
                                    <X className="w-4 h-4" /> Reject
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
