import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function UnderReviewPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()
        supabase.from('profiles').select('verification_status, role').eq('id', user.id).single()
            .then(({ data }) => {
                if (data?.verification_status === 'APPROVED') {
                    navigate('/dashboard/cartomante')
                } else {
                    setLoading(false)
                }
            })
    }, [user, authLoading])

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        navigate('/login')
    }

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando...</p></div>
    if (!user) return null

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-card rounded-2xl border p-8 shadow-xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-300" />

                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-amber-500" />
                </div>

                <h1 className="text-2xl font-bold mb-3">Cadastro em Análise</h1>
                <p className="text-muted-foreground mb-6">
                    Recebemos seus dados e documentos! Nossa equipe está analisando seu perfil para garantir a segurança e qualidade da plataforma.
                </p>

                <div className="bg-muted/50 rounded-xl p-4 text-left text-sm space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Dados Pessoais recebidos</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Documentos enviados</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Aguardando aprovação final</span>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground/60 mb-6">
                    O prazo médio de análise é de 24 horas úteis. Você receberá um email assim que seu cadastro for aprovado.
                </p>

                <div className="flex flex-col gap-3">
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                        Sair da conta
                    </Button>
                </div>
            </div>

            <div className="mt-8 text-xs text-muted-foreground">
                <p>Precisa de ajuda? <Link to="/contato" className="underline hover:text-primary">Entre em contato</Link></p>
            </div>
        </div>
    )
}
