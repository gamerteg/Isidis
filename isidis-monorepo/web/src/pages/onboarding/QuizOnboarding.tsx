import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import confetti from 'canvas-confetti'

import apiClient from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    field: 'intention' as const,
    question: 'O que mais pesa pra você hoje?',
    options: [
      { value: 'AMOR', label: 'Amor', emoji: '💕' },
      { value: 'CARREIRA', label: 'Carreira', emoji: '💼' },
      { value: 'FINANCAS', label: 'Finanças', emoji: '💰' },
      { value: 'SAUDE', label: 'Saúde', emoji: '🌿' },
      { value: 'ESPIRITUALIDADE', label: 'Espiritualidade', emoji: '✨' },
      { value: 'FAMILIA', label: 'Família', emoji: '🏡' },
      { value: 'DECISAO', label: 'Decisão', emoji: '🔮' },
    ],
  },
  {
    field: 'modality' as const,
    question: 'Como prefere receber a leitura?',
    options: [
      { value: 'TAROT', label: 'Tarot', emoji: '🃏' },
      { value: 'ORACULO', label: 'Oráculo', emoji: '🌙' },
      { value: 'BARALHO_CIGANO', label: 'Baralho cigano', emoji: '🌹' },
      { value: 'ASTROLOGIA', label: 'Astrologia', emoji: '⭐' },
      { value: 'OUTRO', label: 'Sugerir para mim', emoji: '🤍' },
    ],
  },
  {
    field: 'urgency' as const,
    question: 'Em que ritmo precisa disso?',
    options: [
      { value: 'AGORA', label: 'Agora', emoji: '⚡' },
      { value: 'PROXIMOS_DIAS', label: 'Nos próximos dias', emoji: '📅' },
      { value: 'COM_CALMA', label: 'Com calma', emoji: '🕊️' },
    ],
  },
]

type FormState = { intention: string; modality: string; urgency: string }

export default function QuizOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>({ intention: '', modality: '', urgency: '' })
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [pending, setPending] = useState<string | null>(null)
  const stepKey = `${stepIndex}-${direction}`
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login?next=/quiz-onboarding'); return }
    if (user.user_metadata?.role === 'READER') { navigate('/dashboard/cartomante'); return }
    apiClient
      .get<{ data: { completed: boolean; intention?: string; modality?: string; urgency?: string } }>('/me/quiz')
      .then((res) => {
        if (res.data.data.completed) {
          setForm({
            intention: res.data.data.intention || '',
            modality: res.data.data.modality || '',
            urgency: res.data.data.urgency || '',
          })
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [authLoading, navigate, user])

  // Confetti + auto-redirect after done
  useEffect(() => {
    if (!done) return
    const end = Date.now() + 2800
    const burst = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#a78bfa', '#60a5fa', '#34d399'] })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#a78bfa', '#f472b6', '#fbbf24'] })
      if (Date.now() < end) requestAnimationFrame(burst)
    }
    requestAnimationFrame(burst)
    const t = setTimeout(() => navigate('/dashboard', { replace: true }), 3000)
    return () => clearTimeout(t)
  }, [done, navigate])

  const step = STEPS[stepIndex]

  const handleSelect = (value: string) => {
    if (pending || submitting) return
    setPending(value)
    timerRef.current = setTimeout(async () => {
      const updated = { ...form, [step.field]: value }
      setForm(updated)
      setPending(null)

      if (stepIndex < STEPS.length - 1) {
        setDirection('forward')
        setStepIndex(stepIndex + 1)
        return
      }

      // Last step — submit
      setSubmitting(true)
      setError('')
      try {
        await apiClient.post('/me/quiz', updated)
        setDone(true)
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Não foi possível salvar. Tente novamente.')
        setSubmitting(false)
      }
    }, 180)
  }

  const goBack = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPending(null)
    setDirection('back')
    setStepIndex(i => Math.max(i - 1, 0))
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05040d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Done screen
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#05040d] px-4 text-center">
        <div className="text-6xl mb-6 animate-in zoom-in-50 fade-in duration-500">🔮</div>
        <h2 className="text-2xl font-display font-light text-white mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          Tudo certo!
        </h2>
        <p className="text-slate-400 text-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          Preparando seu painel personalizado...
        </p>
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  const animClass = direction === 'forward'
    ? 'animate-in slide-in-from-right-8 fade-in duration-300'
    : 'animate-in slide-in-from-left-8 fade-in duration-300'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.14),_transparent_30%),linear-gradient(180deg,_#05040d,_#0a0914_100%)] px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIndex ? 'bg-primary' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* Back button */}
        {stepIndex > 0 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        )}

        {/* Step label */}
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          {stepIndex + 1} de {STEPS.length}
        </p>

        {/* Question */}
        <h1
          key={stepKey + '-q'}
          className={`text-2xl font-display font-light text-white mb-8 leading-tight ${animClass}`}
        >
          {step.question}
        </h1>

        {/* Options */}
        <div
          key={stepKey}
          className={`space-y-3 ${animClass}`}
        >
          {step.options.map((opt) => {
            const selected = form[step.field] === opt.value || pending === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                disabled={submitting}
                className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${
                  selected
                    ? 'border-primary/60 bg-primary/15 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                }`}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className={`text-base font-medium ${selected ? 'text-white' : 'text-slate-200'}`}>
                  {opt.label}
                </span>
                {pending === opt.value && submitting && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.urgency && handleSelect(form.urgency)}
              className="mt-2 w-full text-sm text-rose-300 hover:text-white"
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
