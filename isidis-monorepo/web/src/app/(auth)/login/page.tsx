
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/auth/actions'
import { Link, useSearchParams } from 'react-router-dom'
import { LogIn, Sparkles, Eye, EyeOff } from 'lucide-react'
import { PageSection } from '@/components/layout/PageSection'

export default function LoginPage() {
    const [state, formAction] = useActionState(login, null)
    const [showPassword, setShowPassword] = useState(false)
    const [searchParams] = useSearchParams()
    const next = searchParams.get('next')

    return (
        <PageSection padding="none" withOrbs withShootingStars className="min-h-screen flex items-center justify-center">

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/5 border border-primary/10 mb-6 animate-float">
                        <img src="/logo.png" alt="Isidis Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta</h1>
                    <p className="text-muted-foreground">Entre para acessar sua jornada espiritual.</p>
                </div>

                <div className="glass-strong rounded-2xl p-8">
                    <form action={formAction} className="space-y-5">
                        {next ? <input type="hidden" name="next" value={next} /> : null}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                                className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                                <Link to="/recover" className="text-xs text-primary hover:underline">
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Sua senha"
                                    required
                                    className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {state?.error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                                {state.error}
                            </div>
                        )}

                        <Button type="submit" className="w-full py-6 text-base font-bold animate-glow-pulse">
                            <LogIn className="mr-2 w-4 h-4" />
                            Entrar
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Não tem conta?{' '}
                    <Link to="/register" className="text-primary font-semibold hover:underline">
                        Criar Conta
                    </Link>
                </p>
            </div>
        </PageSection>
    )
}
