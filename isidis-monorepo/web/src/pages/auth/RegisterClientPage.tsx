import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RegisterClientPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) return
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role: 'CLIENT' },
        },
      })
      if (error) throw error
      setDone(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="font-display text-xl font-bold">Verifique seu e-mail</h2>
          <p className="text-muted-foreground text-sm">
            Enviamos um link de confirmação para <strong>{email}</strong>. Acesse seu e-mail para ativar sua conta.
          </p>
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full">Ir para o login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-background">
      <div className="absolute inset-0 bg-purple-glow pointer-events-none" />

      <div className="w-full max-w-sm mx-auto space-y-8 relative z-10">
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Criar conta</h1>
            <p className="text-sm text-muted-foreground">Comece sua jornada espiritual</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome completo"
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={e => setName(e.target.value)}
            leftIcon={<User size={16} />}
            required
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
          />
          <Input
            label="Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Criar minha conta
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Ao criar uma conta, você concorda com os nossos{' '}
          <span className="text-primary">Termos de Uso</span> e{' '}
          <span className="text-primary">Política de Privacidade</span>.
        </p>
      </div>
    </div>
  )
}
