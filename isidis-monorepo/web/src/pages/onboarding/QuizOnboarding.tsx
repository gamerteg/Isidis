import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowRight, Sparkles } from 'lucide-react'

import apiClient from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const intentions = [
  { value: 'AMOR', label: 'Amor', description: 'Relacionamentos, conexao e vida afetiva.' },
  { value: 'CARREIRA', label: 'Carreira', description: 'Trabalho, metas e proximos movimentos.' },
  { value: 'FINANCAS', label: 'Financas', description: 'Dinheiro, estabilidade e oportunidades.' },
  { value: 'SAUDE', label: 'Saude', description: 'Bem-estar, energia e equilibrio.' },
  { value: 'ESPIRITUALIDADE', label: 'Espiritualidade', description: 'Intuicao, limpeza e autoconhecimento.' },
  { value: 'FAMILIA', label: 'Familia', description: 'Lares, vinculos e convivencias delicadas.' },
  { value: 'DECISAO', label: 'Decisao', description: 'Quando voce precisa escolher um caminho.' },
] as const

const modalities = [
  { value: 'TAROT', label: 'Tarot', description: 'Leitura classica e profunda.' },
  { value: 'ORACULO', label: 'Oraculo', description: 'Mensagens mais leves e intuitivas.' },
  { value: 'BARALHO_CIGANO', label: 'Baralho cigano', description: 'Objetividade, direcao e situacoes praticas.' },
  { value: 'ASTROLOGIA', label: 'Astrologia', description: 'Ciclos, tendencias e mapa energetico.' },
  { value: 'OUTRO', label: 'Quero ajuda para escolher', description: 'Deixe a plataforma sugerir o melhor formato.' },
] as const

const urgencyOptions = [
  { value: 'AGORA', label: 'Preciso agora', description: 'Quero uma leitura o quanto antes.' },
  { value: 'PROXIMOS_DIAS', label: 'Nos proximos dias', description: 'Posso receber em breve, sem extrema urgencia.' },
  { value: 'COM_CALMA', label: 'Com calma', description: 'Estou aberta a uma escolha mais cuidadosa.' },
] as const

type QuizFormState = {
  intention: string
  modality: string
  urgency: string
}

export default function QuizOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<QuizFormState>({
    intention: '',
    modality: '',
    urgency: '',
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login?next=/quiz-onboarding')
      return
    }
    if (user.user_metadata?.role === 'READER') {
      navigate('/dashboard/cartomante')
      return
    }

    apiClient
      .get<{ data: { completed: boolean; intention?: string; modality?: string; urgency?: string } }>('/me/quiz')
      .then((response) => {
        if (response.data.data.completed) {
          setForm({
            intention: response.data.data.intention || '',
            modality: response.data.data.modality || '',
            urgency: response.data.data.urgency || '',
          })
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [authLoading, navigate, user])

  const submit = async () => {
    if (!form.intention || !form.modality || !form.urgency) {
      setError('Escolha uma opcao em cada etapa antes de continuar.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await apiClient.post('/me/quiz', form)
      navigate('/dashboard', { replace: true })
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || 'Nao foi possivel salvar suas preferencias agora.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Carregando quiz de onboarding...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.16),_transparent_28%),linear-gradient(180deg,_#05040d,_#0a0914_30%,_#06050d_100%)] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Quiz de onboarding
          </span>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-5xl">
            Ajuste rapido de intencao para o web sugerir a leitura certa logo no primeiro acesso.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
            Este passo fecha a paridade do fluxo com o app e melhora a curadoria inicial sem mexer na identidade premium do site.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Seu onboarding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-400">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">1. Intencao principal</p>
                <p className="mt-1">Define que tipo de orientacao tem mais prioridade agora.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">2. Modalidade</p>
                <p className="mt-1">Ajuda a plataforma a destacar cartomantes e formatos mais aderentes.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">3. Urgencia</p>
                <p className="mt-1">Refina o ritmo do atendimento para as sugestoes iniciais do painel.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:col-span-2">
            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Qual tema pesa mais hoje?</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {intentions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, intention: option.value }))}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${
                      form.intention === option.value
                        ? 'border-violet-400/40 bg-violet-400/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Como voce prefere receber a leitura?</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {modalities.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, modality: option.value }))}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${
                      form.modality === option.value
                        ? 'border-sky-400/40 bg-sky-400/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl">Em que ritmo isso precisa acontecer?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgencyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, urgency: option.value }))}
                    className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                      form.urgency === option.value
                        ? 'border-emerald-400/40 bg-emerald-400/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <p className="font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                  </button>
                ))}

                {error ? (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="mt-2 h-12 w-full rounded-2xl bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando preferencias
                    </>
                  ) : (
                    <>
                      Continuar para o painel
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
