
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import {  useSearchParams  } from 'react-router-dom'
import { Suspense } from 'react'

function AuthCodeErrorContent() {
    const [searchParams] = useSearchParams()
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-destructive w-80 h-80 -top-40 -right-40 animate-float" />
            <div className="orb orb-primary w-64 h-64 -bottom-32 -left-32 animate-float-slow" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 mb-4 animate-float">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Link Inválido ou Expirado</h1>
                    <p className="text-muted-foreground">Não foi possível verificar seu código de acesso.</p>
                </div>

                <div className="glass-strong rounded-2xl p-8 text-center space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Isso pode acontecer se o link já foi utilizado ou se expirou. Por favor, solicite um novo link de recuperação.
                    </p>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs text-left overflow-auto max-h-32">
                            <p className="font-bold">Detalhes do erro:</p>
                            <p>{error}: {errorDescription}</p>
                        </div>
                    )}

                    <Button asChild className="w-full py-6 text-base font-bold animate-glow-pulse">
                        <Link to="/recover">
                            Tentar Novamente
                        </Link>
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o login
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function AuthCodeErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthCodeErrorContent />
        </Suspense>
    )
}
