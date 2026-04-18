import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminUsersPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profiles, setProfiles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()

        const fetchData = async () => {
            const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (adminProfile?.role !== 'ADMIN') { navigate('/'); return }

            const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
            setProfiles(data || [])
            setLoading(false)
        }

        fetchData()
    }, [user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando usuários...</div>

    return (
        <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Gerenciar Usuários</h2>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={profile.avatar_url || ''} />
                                        <AvatarFallback>{profile.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{profile.full_name || 'Sem nome'}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{profile.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={profile.role === 'ADMIN' ? 'destructive' : profile.role === 'READER' ? 'default' : 'secondary'}>
                                        {profile.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-green-500 border-green-500/50">OK</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link to={`/admin/users/${profile.id}`}>
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
