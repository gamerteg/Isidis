import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Sparkles, DollarSign, Activity } from 'lucide-react'
import { getAdminFinancials } from '@/app/actions/admin-financials'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (adminProfile?.role !== 'ADMIN') { navigate('/'); return }

            const [userCount, readerCount, gigCount, pendingGigsCount, orderCount, financials, profiles] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER'),
                supabase.from('gigs').select('*', { count: 'exact', head: true }),
                supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                supabase.from('orders').select('*', { count: 'exact', head: true }),
                getAdminFinancials(),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
            ])

            setData({
                userCount: userCount.count,
                readerCount: readerCount.count,
                gigCount: gigCount.count,
                pendingGigsCount: pendingGigsCount.count,
                orderCount: orderCount.count,
                financialData: financials.data,
                recentProfiles: profiles.data || [],
            })
            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
    if (!data) return null

    const { userCount, readerCount, gigCount, pendingGigsCount, orderCount, financialData, recentProfiles } = data

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount || 0}</div>
                        <p className="text-xs text-muted-foreground">{readerCount || 0} são cartomantes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gigs Ativos</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{gigCount || 0}</div>
                        <p className="text-xs text-muted-foreground">{pendingGigsCount || 0} pendentes de aprovação</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orderCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Pedidos totais</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">
                            {financialData ? formatCurrency(financialData.platformFee) : 'R$ 0,00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Lucro da plataforma</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Usuários Recentes</CardTitle>
                        <CardDescription>Últimos 5 usuários cadastrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {recentProfiles.map((profile: any) => (
                                <li key={profile.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                    <div className="flex flex-col min-w-0">
                                        <Link to={`/admin/users/${profile.id}`} className="font-medium hover:underline truncate">
                                            {profile.full_name || 'Usuário'}
                                        </Link>
                                        <span className="text-sm text-muted-foreground font-mono text-xs">{profile.id}</span>
                                    </div>
                                    <Badge variant="outline" className="w-fit">{profile.role}</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card-deep">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-violet-400" />
                            Vendas Recentes
                        </CardTitle>
                        <CardDescription>As últimas 5 transações na plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {financialData?.recentOrders.slice(0, 5).map((order: any) => (
                                <li key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{order.gig_title}</span>
                                        <span className="text-sm text-muted-foreground truncate">
                                            {order.client_name} → {order.reader_name}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:items-end">
                                        <span className="font-bold text-green-400">{formatCurrency(order.amount_total)}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                </li>
                            ))}
                            {!financialData?.recentOrders?.length && (
                                <li className="text-center text-muted-foreground py-4">Nenhuma venda recente</li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
