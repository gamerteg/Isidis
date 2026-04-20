import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Mail, ArrowRight } from 'lucide-react'

export default function ConfirmEmailPage() {
    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-primary w-80 h-80 -top-40 -right-40 animate-float" />
            <div className="orb orb-accent w-64 h-64 -bottom-32 -left-32 animate-float-slow" />

            <div className="w-full max-w-md relative z-10 text-center animate-fade-in-up">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6 animate-float">
                    <Mail className="w-10 h-10 text-primary" />
                </div>

                <h1 className="text-3xl font-bold mb-3">Verifique seu email</h1>
                <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto">
                    Enviamos um link de confirmação para o seu email.
                    Clique no link para ativar sua conta e começar a usar o Isidis.
                </p>

                <div className="glass-strong rounded-2xl p-6 mb-6">
                    <div className="flex items-start gap-3 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-primary text-sm font-bold">📧</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">Não encontrou o email?</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Verifique a pasta de spam ou lixo eletrônico. O email pode levar alguns minutos para chegar.
                            </p>
                        </div>
                    </div>
                </div>

                <Button asChild className="font-bold rounded-xl px-8 py-5">
                    <Link to="/login">
                        Ir para o Login
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </Button>
            </div>
        </div>
    )
}
