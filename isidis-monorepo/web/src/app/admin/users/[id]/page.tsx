import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import AdminUserEditForm from './edit-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function AdminUserEditPage() {
    const { id } = useParams<{ id: string }>()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [userData, setUserData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }
        if (!id) return

        const supabase = createClient()

        const fetchData = async () => {
            const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (adminProfile?.role !== 'ADMIN') { navigate('/'); return }

            const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
            if (!profile) { navigate('/admin/users'); return }

            setUserData({
                id,
                email: profile.email || '',
                full_name: profile.full_name || '',
                role: profile.role || 'CLIENT',
                bio: profile.bio || '',
                avatar_url: profile.avatar_url || '',
                cellphone: profile.cellphone || '',
                tax_id: profile.tax_id || '',
                cpf_cnpj: profile.cpf_cnpj || '',
                pix_key_type: profile.pix_key_type || '',
                pix_key: profile.pix_key || '',
            })
            setLoading(false)
        }

        fetchData()
    }, [id, user, authLoading])

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
    if (!userData) return null

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link to="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h2 className="font-display text-3xl font-semibold tracking-tight">Editar Usuário</h2>
                    <p className="text-muted-foreground">ID: <span className="font-mono text-xs">{id}</span></p>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Informações do Perfil</CardTitle></CardHeader>
                    <CardContent>
                        <AdminUserEditForm user={userData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
