
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RecoverPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        const supabase = createClient()
        const callbackUrl = `${window.location.origin}/auth/callback?next=/update-password`

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: callbackUrl,
        })

        if (error) {
            console.error('Forgot password error:', error.message)
            setError('Não foi possível enviar o email de recuperação. Tente novamente.')
        } else {
            setSuccess('Verifique seu email para o link de recuperação.')
        }
        setLoading(false)
    }

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
                    <h1 className="font-display text-3xl font-light mb-2">Recuperar <em className="italic font-normal text-gradient-aurora">Senha</em></h1>
                    <p className="text-muted-foreground">Digite seu email para receber um link de recuperação.</p>
                </div>

                <div className="border-shine bg-card/40 backdrop-blur-xl rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm animate-scale-in">
                                {success}
                            </div>
                        )}

                        <Button type="submit" className="aurora border-shine w-full py-6 text-base font-bold text-white hover:opacity-90" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Mail className="mr-2 w-4 h-4" />}
                            Enviar Link
                        </Button>
                    </form>
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
