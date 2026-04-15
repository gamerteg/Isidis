import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

export default function ApprovalsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [pendingReaders, setPendingReaders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (adminProfile?.role !== 'ADMIN') { navigate('/'); return }

            const { data } = await supabase.from('profiles')
                .select('*').eq('role', 'READER').eq('verification_status', 'PENDING')
                .order('created_at', { ascending: false })
            setPendingReaders(data || [])
            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Solicitação de Onboarding</h1>
                    <p className="text-muted-foreground">Analise e aprove as solicitações de onboarding de novas cartomantes.</p>
                </div>
            </div>

            {pendingReaders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-card/50">
                    <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-lg font-medium">Tudo em dia!</h3>
                    <p className="text-muted-foreground">Não há solicitações pendentes no momento.</p>
                </div>
            ) : (
                <div className="border rounded-xl bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Data Cadastro</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pendingReaders.map((reader) => (
                                    <tr key={reader.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{reader.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{reader.social_name || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(reader.created_at || Date.now()).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                <Clock className="w-3 h-3 mr-1" />Pendente
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link to={`/admin/approvals/${reader.id}`}>
                                                    <Eye className="w-4 h-4 mr-2" />Analisar
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
