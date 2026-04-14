import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-senha`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar e-mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-background">
      <div className="absolute inset-0 bg-purple-glow pointer-events-none" />

      <div className="w-full max-w-sm mx-auto space-y-8 relative z-10 mt-10">
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground">Enviaremos um link para seu e-mail</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <Mail size={28} className="text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">Voltar ao login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail cadastrado"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Enviar link
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
