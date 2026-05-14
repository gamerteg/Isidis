import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sanitizeNextPath, signInWithGoogle, signInWithPassword } from '@/lib/auth/service'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Chrome, Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { PageSection } from '@/components/layout/PageSection'

export default function LoginPage() {
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPasswordLoading, setIsPasswordLoading] = useState(false)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const [searchParams] = useSearchParams()
    const next = sanitizeNextPath(searchParams.get('next'))
    const isPending = isPasswordLoading || isGoogleLoading
    const registerPath = next ? `/register?next=${encodeURIComponent(next)}` : '/register'

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setIsPasswordLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await signInWithPassword({
            email: String(formData.get('email') ?? ''),
            password: String(formData.get('password') ?? ''),
            next,
        })

        if (result.ok) {
            navigate(result.destination ?? '/dashboard', { replace: true })
            return
        }

        setError(result.error)
        setIsPasswordLoading(false)
    }

    const handleGoogleSignIn = async () => {
        setError(null)
        setIsGoogleLoading(true)

        const result = await signInWithGoogle({ next })

        if (!result.ok) {
            setError(result.error)
            setIsGoogleLoading(false)
        }
    }

    return (
        <PageSection padding="none" withOrbs withShootingStars className="min-h-screen flex items-center justify-center overflow-y-auto pb-safe">
            <div className="w-full max-w-md relative z-10 animate-fade-in-up py-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/5 border border-primary/10 mb-6 animate-float">
                        <img src="/logo.png" alt="Isidis Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="font-display text-3xl font-light mb-2">Bem-vindo de <em className="italic font-normal text-gradient-aurora">volta</em></h1>
                    <p className="text-muted-foreground">Entre para acessar sua jornada espiritual.</p>
                </div>

                <div className="border-shine rounded-2xl bg-card/40 backdrop-blur-xl p-8">
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                                disabled={isPending}
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
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Sua senha"
                                    required
                                    disabled={isPending}
                                    className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isPending}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={isPending} className="aurora border-shine w-full py-6 text-base font-bold text-white hover:opacity-90">
                            {isPasswordLoading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <LogIn className="mr-2 w-4 h-4" />}
                            {isPasswordLoading ? 'Entrando...' : 'Entrar'}
                        </Button>
                    </form>

                    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="h-px flex-1 bg-border/60" />
                        <span>ou</span>
                        <div className="h-px flex-1 bg-border/60" />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={handleGoogleSignIn}
                        className="w-full py-6 text-base font-semibold bg-background/40"
                    >
                        {isGoogleLoading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Chrome className="mr-2 w-4 h-4" />}
                        {isGoogleLoading ? 'Conectando...' : 'Continuar com Google'}
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Não tem conta?{' '}
                    <Link to={registerPath} className="text-primary font-semibold hover:underline">
                        Criar Conta
                    </Link>
                </p>
            </div>
        </PageSection>
    )
}
