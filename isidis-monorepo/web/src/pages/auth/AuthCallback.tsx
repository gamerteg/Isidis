import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { handleOAuthCallback } from '@/lib/auth/service'

type CallbackStatus = 'loading' | 'error'

export default function AuthCallbackPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const hasHandledCallback = useRef(false)
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (hasHandledCallback.current) return
    hasHandledCallback.current = true

    async function completeCallback() {
      const result = await handleOAuthCallback(new URLSearchParams(location.search))

      if (result.ok) {
        navigate(result.destination ?? '/dashboard', { replace: true })
        return
      }

      setStatus('error')
      setErrorMessage(result.error)

      const errorParams = new URLSearchParams({
        error: 'oauth_callback',
        error_description: result.error,
      })
      navigate(`/auth/auth-code-error?${errorParams.toString()}`, { replace: true })
    }

    void completeCallback()
  }, [location.search, navigate])

  if (status === 'error') {
    return (
      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Nao foi possivel entrar</h1>
            <p className="text-muted-foreground">
              {errorMessage ?? 'Tente entrar novamente para continuar.'}
            </p>
          </div>
          <Button asChild className="w-full rounded-xl py-6 font-bold">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Finalizando acesso</h1>
          <p className="text-muted-foreground">
            Estamos validando seu login com Google.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Aguarde um instante</span>
        </div>
      </section>
    </main>
  )
}
