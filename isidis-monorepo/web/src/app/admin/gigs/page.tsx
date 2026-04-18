import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { updateGigStatus } from '../actions'
import { Check, X, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

function GigApprovalCard({ gig, showActions = true, onStatusChange }: { gig: any, showActions?: boolean, onStatusChange?: () => void }) {
    const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
        await updateGigStatus(gig.id, status)
        onStatusChange?.()
    }

    return (
        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {gig.image_url ? (
                        <img src={gig.image_url} alt={gig.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sem imagem</div>
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-lg">{gig.title}</h3>
                            <p className="text-sm text-muted-foreground">por {gig.owner?.full_name}</p>
                        </div>
                        <Badge variant={gig.status === 'APPROVED' ? 'default' : gig.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {gig.status}
                        </Badge>
                    </div>
                    <p className="text-sm line-clamp-2">{gig.description}</p>
                    <div className="font-semibold">
                        {(gig.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="pt-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/servico/${gig.id}`} target="_blank">
                                <Eye className="w-4 h-4 mr-2" />Ver Gig Completa
                            </Link>
                        </Button>
                    </div>
                </div>

                {showActions && (
                    <div className="flex flex-col gap-2 justify-center border-l-0 md:border-l md:pl-6 border-border/50 mt-4 md:mt-0">
                        <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleAction('APPROVED')}>
                            <Check className="w-4 h-4" /> Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" className="w-full gap-2" onClick={() => handleAction('REJECTED')}>
                            <X className="w-4 h-4" /> Rejeitar
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function AdminGigsPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [gigs, setGigs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchGigs = async () => {
        const supabase = createClient()
        const { data } = await supabase.from('gigs').select('*, owner:profiles(*)').order('created_at', { ascending: false })
        setGigs(data || [])
    }

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
            if (data?.role !== 'ADMIN') { navigate('/'); return }
            fetchGigs().then(() => setLoading(false))
        })
    }, [user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando gigs...</div>

    const pendingGigs = gigs.filter(g => g.status === 'PENDING')

    return (
        <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Moderação de Gigs</h2>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pendentes ({pendingGigs.length})</TabsTrigger>
                    <TabsTrigger value="all">Todos ({gigs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4 space-y-4">
                    {pendingGigs.length === 0 && <p className="text-muted-foreground">Nenhum gig pendente de aprovação.</p>}
                    {pendingGigs.map((gig) => (
                        <GigApprovalCard key={gig.id} gig={gig} onStatusChange={fetchGigs} />
                    ))}
                </TabsContent>

                <TabsContent value="all" className="mt-4 space-y-4">
                    {gigs.map((gig) => (
                        <GigApprovalCard key={gig.id} gig={gig} showActions={false} />
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    )
}
