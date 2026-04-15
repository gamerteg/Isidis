
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/auth/actions'
import { Lock, Sparkles, Eye, EyeOff } from 'lucide-react'

export default function UpdatePasswordPage() {
    const [state, formAction] = useActionState(resetPassword, null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-primary w-80 h-80 -top-40 -right-40 animate-float" />
            <div className="orb orb-accent w-64 h-64 -bottom-32 -left-32 animate-float-slow" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-float">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Definir Nova Senha</h1>
                    <p className="text-muted-foreground">Digite sua nova senha abaixo.</p>
                </div>

                <div className="glass-strong rounded-2xl p-8">
                    <form action={formAction} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="******"
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

                        <div className="space-y-2">
                            <Label htmlFor="confirm_password" className="text-sm font-medium">Confirmar Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="******"
                                    required
                                    className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {state?.error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                                {state.error}
                            </div>
                        )}

                        <Button type="submit" className="w-full py-6 text-base font-bold animate-glow-pulse">
                            <Lock className="mr-2 w-4 h-4" />
                            Redefinir Senha
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
