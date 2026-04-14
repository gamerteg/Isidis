import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GripVertical, X } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, type Gig, type Requirement, type AddOn } from '@/lib/api'
import { SPECIALTY_MAP } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'

const CATEGORIES = Object.keys(SPECIALTY_MAP)
const CATEGORY_LABELS: Record<string, string> = SPECIALTY_MAP

const DELIVERY_METHODS = ['DIGITAL_SPREAD', 'PHYSICAL_PHOTO', 'VIDEO', 'OTHER']
const DELIVERY_METHOD_LABELS: Record<string, string> = {
  DIGITAL_SPREAD: '🔮 Tiragem Digital',
  PHYSICAL_PHOTO: '📷 Foto Física',
  VIDEO: '🎥 Vídeo',
  OTHER: '📦 Outro',
}

const ADDON_TYPES = ['SPEED', 'EXTRA', 'CUSTOM']
const ADDON_TYPE_LABELS: Record<string, string> = {
  SPEED: '⚡ Urgência',
  EXTRA: '✨ Extra',
  CUSTOM: '🎨 Personalizado',
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface ReqDraft extends Omit<Requirement, 'id'> {
  localId: string
  id: string
  newOption?: string
}

interface AddOnDraft extends Omit<AddOn, 'id'> {
  localId: string
  id: string
}

export function GigEditorPage() {
  const { gigId } = useParams<{ gigId: string }>()
  const navigate = useNavigate()
  const isEditing = !!gigId

  const { data: existing, isLoading: loadingExisting } = useSWR(
    gigId ? `/gigs/${gigId}` : null,
    () => api.get<{ data: Gig }>(`/gigs/${gigId}`),
  )

  // Basic fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('TAROT')
  const [deliveryMethod, setDeliveryMethod] = useState('DIGITAL_SPREAD')
  const [deliveryHours, setDeliveryHours] = useState('48')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['PIX', 'CARD'])

  // Requirements
  const [requirements, setRequirements] = useState<ReqDraft[]>([])

  // Add-ons
  const [addOns, setAddOns] = useState<AddOnDraft[]>([])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (existing?.data) {
      const g = existing.data
      setTitle(g.title)
      setDescription(g.description)
      setPrice(String(g.price / 100))
      setCategory(g.category ?? 'TAROT')
      setDeliveryMethod(g.delivery_method)
      setDeliveryHours(String(g.delivery_time_hours))
      setPaymentMethods(g.payment_methods ?? ['PIX', 'CARD'])
      setRequirements(
        (g.requirements ?? []).map(r => ({ ...r, localId: r.id, newOption: '' }))
      )
      setAddOns(
        (g.add_ons ?? []).map(a => ({ ...a, localId: a.id }))
      )
    }
  }, [existing])

  const togglePayment = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    )
  }

  // ─── Requirements ─────────────────────────────────────────────────────────

  const addRequirement = () => {
    const id = uid()
    setRequirements(prev => [
      ...prev,
      { localId: id, id, label: '', type: 'text', required: true, options: [], newOption: '' },
    ])
  }

  const removeRequirement = (localId: string) =>
    setRequirements(prev => prev.filter(r => r.localId !== localId))

  const updateReq = (localId: string, patch: Partial<ReqDraft>) =>
    setRequirements(prev => prev.map(r => r.localId === localId ? { ...r, ...patch } : r))

  const addOption = (localId: string, opt: string) => {
    if (!opt.trim()) return
    setRequirements(prev => prev.map(r =>
      r.localId === localId
        ? { ...r, options: [...(r.options ?? []), opt.trim()], newOption: '' }
        : r
    ))
  }

  const removeOption = (localId: string, idx: number) =>
    setRequirements(prev => prev.map(r =>
      r.localId === localId
        ? { ...r, options: (r.options ?? []).filter((_, i) => i !== idx) }
        : r
    ))

  // ─── Add-ons ──────────────────────────────────────────────────────────────

  const addAddOn = () => {
    const id = uid()
    setAddOns(prev => [
      ...prev,
      { localId: id, id, label: '', price: 0, type: 'EXTRA' },
    ])
  }

  const removeAddOn = (localId: string) =>
    setAddOns(prev => prev.filter(a => a.localId !== localId))

  const updateAddOn = (localId: string, patch: Partial<AddOnDraft>) =>
    setAddOns(prev => prev.map(a => a.localId === localId ? { ...a, ...patch } : a))

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const priceInCents = Math.round(parseFloat(price) * 100)
    if (!title.trim() || !description.trim()) {
      toast.error('Preencha título e descrição')
      return
    }
    if (isNaN(priceInCents) || priceInCents < 100) {
      toast.error('O preço mínimo é R$ 1,00')
      return
    }
    if (paymentMethods.length === 0) {
      toast.error('Selecione pelo menos uma forma de pagamento')
      return
    }
    const invalidReqs = requirements.filter(r => !r.label.trim())
    if (invalidReqs.length > 0) {
      toast.error('Preencha o rótulo de todos os campos de informação')
      return
    }
    const invalidAddOns = addOns.filter(a => !a.label.trim() || a.price < 0)
    if (invalidAddOns.length > 0) {
      toast.error('Preencha o rótulo e preço de todos os extras')
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: priceInCents,
        category,
        delivery_method: deliveryMethod,
        delivery_time_hours: parseInt(deliveryHours),
        payment_methods: paymentMethods,
        requirements: requirements.map(({ localId, newOption, ...r }) => ({
          id: r.id,
          label: r.label,
          type: r.type,
          required: r.required,
          options: r.options ?? [],
        })),
        add_ons: addOns.map(({ localId, ...a }) => ({
          id: a.id,
          label: a.label,
          price: Math.round(a.price * 100),
          type: a.type,
        })),
      }

      if (isEditing) {
        await api.patch(`/gigs/${gigId}`, payload)
        toast.success('Serviço atualizado!')
      } else {
        await api.post('/gigs', payload)
        toast.success('Serviço criado! Aguardando aprovação.')
      }
      navigate('/leitora/gigs')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar serviço')
    } finally {
      setLoading(false)
    }
  }

  if (loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in pb-8">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>
        <h1 className="font-display text-xl font-bold">
          {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-6">
        {/* ── Informações básicas ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Informações básicas
          </h2>

          <Input
            label="Título do serviço *"
            placeholder="Ex: Tiragem de 3 cartas — Presente, Passado e Futuro"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Descrição *"
            placeholder="Descreva o que você entregará, como a consulta funciona, o que o cliente pode esperar..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="min-h-28"
            required
          />

          <Input
            label="Preço (R$) *"
            type="number"
            placeholder="49.90"
            min="1"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
          />
        </section>

        {/* ── Categoria ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categoria
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  category === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {CATEGORY_LABELS[c] ?? c}
              </button>
            ))}
          </div>
        </section>

        {/* ── Entrega ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Entrega
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_METHODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setDeliveryMethod(m)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  deliveryMethod === m
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <p className={`text-xs font-medium ${deliveryMethod === m ? 'text-primary' : 'text-foreground'}`}>
                  {DELIVERY_METHOD_LABELS[m]}
                </p>
              </button>
            ))}
          </div>

          <Input
            label="Prazo de entrega (horas) *"
            type="number"
            placeholder="48"
            min="1"
            value={deliveryHours}
            onChange={e => setDeliveryHours(e.target.value)}
            required
          />
        </section>

        {/* ── Formas de pagamento ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Formas de pagamento aceitas
          </h2>
          <div className="flex gap-3">
            {['PIX', 'CARD'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => togglePayment(m)}
                className={`flex-1 py-2.5 rounded-2xl border text-sm font-medium transition-all ${
                  paymentMethods.includes(m)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {m === 'PIX' ? '🟢 PIX' : '💳 Cartão'}
              </button>
            ))}
          </div>
        </section>

        {/* ── Informações solicitadas ao cliente ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Informações do cliente
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dados que você precisa antes de iniciar a leitura
              </p>
            </div>
            <button
              type="button"
              onClick={addRequirement}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>

          {requirements.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 rounded-2xl border border-dashed border-border">
              Nenhum campo adicionado. Clique em "Adicionar" para pedir informações ao cliente.
            </p>
          )}

          {requirements.map((req) => (
            <Card key={req.localId}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <GripVertical size={16} className="text-muted-foreground mt-2.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Ex: Nome completo, Data de nascimento..."
                      value={req.label}
                      onChange={e => updateReq(req.localId, { label: e.target.value })}
                    />

                    {/* Type selector */}
                    <div className="flex gap-2">
                      {(['text', 'choice'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateReq(req.localId, { type: t })}
                          className={`flex-1 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            req.type === t
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {t === 'text' ? '📝 Texto livre' : '☑ Múltipla escolha'}
                        </button>
                      ))}
                    </div>

                    {/* Choice options */}
                    {req.type === 'choice' && (
                      <div className="space-y-2">
                        {(req.options ?? []).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-xs px-3 py-1.5 rounded-xl bg-muted/40 border border-border">
                              {opt}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOption(req.localId, idx)}
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            className="flex-1 h-9 px-3 rounded-xl border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                            placeholder="Nova opção..."
                            value={req.newOption ?? ''}
                            onChange={e => updateReq(req.localId, { newOption: e.target.value })}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addOption(req.localId, req.newOption ?? '')
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addOption(req.localId, req.newOption ?? '')}
                            disabled={!req.newOption?.trim()}
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Required toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={req.required}
                        onChange={e => updateReq(req.localId, { required: e.target.checked })}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">Campo obrigatório</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRequirement(req.localId)}
                    className="text-muted-foreground hover:text-red-400 transition-colors mt-2 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* ── Extras (add-ons) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Extras opcionais
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Serviços adicionais que o cliente pode contratar
              </p>
            </div>
            <button
              type="button"
              onClick={addAddOn}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>

          {addOns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 rounded-2xl border border-dashed border-border">
              Nenhum extra adicionado. Extras aumentam o ticket médio.
            </p>
          )}

          {addOns.map((addon) => (
            <Card key={addon.localId}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Ex: Entrega em 24h, Carta extra, Interpretação aprofundada..."
                      value={addon.label}
                      onChange={e => updateAddOn(addon.localId, { label: e.target.value })}
                    />

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          label="Preço adicional (R$)"
                          type="number"
                          placeholder="19.90"
                          min="0"
                          step="0.01"
                          value={addon.price > 0 ? String(addon.price) : ''}
                          onChange={e => updateAddOn(addon.localId, { price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    {/* Type selector */}
                    <div className="flex gap-1.5 flex-wrap">
                      {ADDON_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateAddOn(addon.localId, { type: t as AddOn['type'] })}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                            addon.type === t
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {ADDON_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAddOn(addon.localId)}
                    className="text-muted-foreground hover:text-red-400 transition-colors mt-2 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {isEditing ? 'Salvar alterações' : 'Criar serviço'}
        </Button>
      </form>
    </div>
  )
}
