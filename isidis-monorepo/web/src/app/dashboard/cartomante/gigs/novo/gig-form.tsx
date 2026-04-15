
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Loader2, CheckCircle2, ChevronRight, ChevronLeft,
    LayoutGrid, DollarSign, Image as ImageIcon, Sparkles,
    CreditCard, Clock, Star, ArrowRight, User, MousePointerClick,
    Camera, MessageCircle, AlertCircle, Repeat, CalendarDays
} from 'lucide-react'
import {  useNavigate  } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { GigRequirement, GigAddOn, Gig } from '@/types'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { createGig, updateGig } from '../../actions'
import { CopyLinkButton } from '@/components/copy-link-button'

// Steps configuration
const STEPS = [
    { id: 1, label: 'Detalhes Básicos' },
    { id: 2, label: 'Preço e Entrega' },
    { id: 3, label: 'Extras' },
    { id: 4, label: 'Visual' },
    { id: 5, label: 'Requisitos' },
    { id: 6, label: 'Método de Entrega' },
]

const CATEGORIES = [
    { id: 'Love & Relationships', label: 'Amor e Relacionamentos', icon: '❤️' },
    { id: 'Career & Finance', label: 'Carreira e Finanças', icon: '💼' },
    { id: 'Spiritual Growth', label: 'Crescimento Espiritual', icon: '✨' },
    { id: 'General Reading', label: 'Leitura Geral', icon: '🔮' },
    { id: 'Health & Wellness', label: 'Saúde e Bem-estar', icon: '🌿' },
]

const DECKS = [
    { id: 'Rider-Waite', label: 'Rider-Waite', type: 'estilo' },
    { id: 'Marseille', label: 'Marselha', type: 'clássico' },
    { id: 'Thoth Tarot', label: 'Thoth Tarot', type: 'oculto' },
    { id: 'Oracle Cards', label: 'Oráculos', type: 'divino' },
    { id: 'Lenormand', label: 'Lenormand', type: 'estilo' },
    { id: 'Custom', label: 'Baralho Próprio', type: 'novo' },
]

const DELIVERY_TIMES = [
    { value: 24, label: '24 Horas' },
    { value: 48, label: '48 Horas' },
    { value: 72, label: '3 Dias' },
    { value: 168, label: '7 Dias' },
]

export function GigForm({ initialData }: { initialData?: Gig }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [createdGigId, setCreatedGigId] = useState<string | null>(null)
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        category: initialData?.category || '',
        description: initialData?.description || '',
        price: initialData ? (initialData.price / 100).toString() : '',
        delivery_time_hours: initialData?.delivery_time_hours || 48,
        delivery_method: initialData?.delivery_method || 'DIGITAL_SPREAD',
        image_url: initialData?.image_url || '',
        tags: initialData?.tags || [] as string[],
        requirements: initialData?.requirements || [] as GigRequirement[],
        add_ons: initialData?.add_ons || [] as GigAddOn[],
        pricing_type: initialData?.pricing_type || 'ONE_TIME' as 'ONE_TIME' | 'RECURRING',
        readings_per_month: initialData?.readings_per_month || 4,
    })

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleTagToggle = (tag: string) => {
        setFormData(prev => {
            const tags = prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
            return { ...prev, tags }
        })
    }

    const addRequirement = () => {
        const newReq: GigRequirement = {
            id: crypto.randomUUID(),
            question: '',
            type: 'text',
            required: true
        }
        setFormData(prev => ({
            ...prev,
            requirements: [...prev.requirements, newReq]
        }))
    }

    const removeRequirement = (id: string) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.filter(r => r.id !== id)
        }))
    }

    const updateRequirement = (id: string, field: keyof GigRequirement, value: any) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.map(r => r.id === id ? { ...r, [field]: value } : r)
        }))
    }

    const addAddOn = () => {
        const newAddOn: GigAddOn = {
            id: crypto.randomUUID(),
            title: '',
            description: '',
            price: 0,
            type: 'EXTRA'
        }
        setFormData(prev => ({
            ...prev,
            add_ons: [...prev.add_ons, newAddOn]
        }))
    }

    const removeAddOn = (id: string) => {
        setFormData(prev => ({
            ...prev,
            add_ons: prev.add_ons.filter(a => a.id !== id)
        }))
    }

    const updateAddOn = (id: string, field: keyof GigAddOn, value: any) => {
        setFormData(prev => ({
            ...prev,
            add_ons: prev.add_ons.map(a => a.id === id ? { ...a, [field]: value } : a)
        }))
    }

    const [uploadingImage, setUploadingImage] = useState(false)

    const handleImageUpload = async (file: File) => {
        try {
            setUploadingImage(true)
            setError('')

            // Dynamic import to avoid SSR issues if any, or just standard import
            const { uploadGigImage } = await import('@/lib/supabase/gig-storage')

            const { url, error } = await uploadGigImage(file)

            if (error) {
                setError('Erro ao enviar imagem: ' + error)
            } else if (url) {
                handleChange('image_url', url)
            }
        } catch (err) {
            console.error(err)
            setError('Falha no envio da imagem')
        } finally {
            setUploadingImage(false)
        }
    }

    const nextStep = () => {
        if (step < 6) setStep(s => s + 1)
    }

    const prevStep = () => {
        if (step > 1) setStep(s => s - 1)
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError('')

        const data = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'tags' || key === 'requirements' || key === 'add_ons') {
                data.append(key, JSON.stringify(value))
            } else {
                data.append(key, String(value))
            }
        })

        const result = initialData?.id
            ? await updateGig(initialData.id, data)
            : await createGig(data)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        } else {
            if (result?.id) {
                setCreatedGigId(result?.id)
            }
            setStep(7)
            setLoading(false)
        }
    }

    // Calculations
    const price = parseFloat(formData.price || '0')
    const platformFee = price * 0.15
    const earnings = price - platformFee

    // Progress Calculation
    const progress = (Math.min(step, 6) / 6) * 100

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
            {/* Header & Stepper */}
            <div className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5 pb-1">
                <div className="container mx-auto px-6 py-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-6">
                        <Link to="/dashboard/cartomante/gigs" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
                            {initialData?.id ? 'Editar Serviço' : 'Criar Novo Serviço'}
                        </Link>
                        <div className="text-sm font-medium text-indigo-400">
                            Passo {step} de 6: <span className="text-white ml-2">{STEPS[step - 1].label}</span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-6xl">
                <div className="flex flex-col lg:flex-row gap-16">

                    {/* LEFT COLUMN: FORM */}
                    <div className="flex-1 w-full space-y-12">

                        {/* Step 1: Basic Details */}
                        {step === 1 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">Comece com o essencial</h2>
                                    <p className="text-slate-400 text-lg">Atraia clientes definindo o escopo e a energia da sua leitura.</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">Título do Serviço</Label>
                                    <div className="relative">
                                        <Input
                                            value={formData.title}
                                            onChange={e => handleChange('title', e.target.value)}
                                            placeholder="ex: Leitura Profunda da Cruz Celta para Orientação Espiritual"
                                            className="bg-[#12121a] border-white/10 text-white h-16 text-lg rounded-xl pl-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-sm hidden sm:block">
                                            {formData.title.length}/80
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500">Use palavras evocativas como 'Profunda', 'Alma' ou 'Caminho' para se destacar.</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">Categoria Principal</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                type="button"
                                                key={cat.id}
                                                onClick={() => handleChange('category', cat.id)}
                                                className={`p-6 rounded-2xl border text-left transition-all hover:border-indigo-500/50 ${formData.category === cat.id
                                                    ? 'bg-[#1a1a24] border-indigo-500 text-white shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]'
                                                    : 'bg-[#12121a] border-white/5 text-slate-400'
                                                    }`}
                                            >
                                                <div className="text-2xl mb-3">{cat.icon}</div>
                                                <div className="font-semibold text-lg">{cat.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">Descrição</Label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        placeholder="Descreva a jornada que você oferecerá ao cliente. Quais baralhos você usa? Qual é o seu estilo de leitura?"
                                        rows={8}
                                        className="w-full bg-[#12121a] border border-white/10 rounded-2xl p-6 text-white text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 resize-none"
                                    />
                                    {/* Formatting Toolbar could go here */}
                                    <div className="flex gap-4 text-slate-500 text-sm px-2">
                                        <span className="font-bold cursor-pointer hover:text-white">B</span>
                                        <span className="italic cursor-pointer hover:text-white">I</span>
                                        <span className="underline cursor-pointer hover:text-white">U</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Pricing */}
                        {step === 2 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">Defina sua troca de energia</h2>
                                    <p className="text-slate-400 text-lg">Determine o valor do seu serviço espiritual e seu compromisso com o cliente.</p>
                                </div>

                                {/* Pricing Type Toggle */}
                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">Tipo de Cobrança</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('pricing_type', 'ONE_TIME')}
                                            className={`p-6 rounded-2xl border-2 text-left transition-all relative group ${formData.pricing_type === 'ONE_TIME'
                                                ? 'bg-[#1a1a24] border-indigo-500 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]'
                                                : 'bg-[#12121a] border-white/5 hover:border-indigo-500/30'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${formData.pricing_type === 'ONE_TIME' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'}`}>
                                                <CreditCard className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">Avulso</h3>
                                            <p className="text-sm text-slate-400">Cliente paga uma vez e recebe uma tiragem.</p>
                                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.pricing_type === 'ONE_TIME' ? 'border-indigo-500' : 'border-slate-700'}`}>
                                                {formData.pricing_type === 'ONE_TIME' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleChange('pricing_type', 'RECURRING')}
                                            className={`p-6 rounded-2xl border-2 text-left transition-all relative group ${formData.pricing_type === 'RECURRING'
                                                ? 'bg-[#1a1a24] border-purple-500 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]'
                                                : 'bg-[#12121a] border-white/5 hover:border-purple-500/30'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${formData.pricing_type === 'RECURRING' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-slate-500'}`}>
                                                <Repeat className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">Assinatura Recorrente</h3>
                                            <p className="text-sm text-slate-400">Cliente paga mensalmente e recebe tiragens periódicas.</p>
                                            <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.pricing_type === 'RECURRING' ? 'border-purple-500' : 'border-slate-700'}`}>
                                                {formData.pricing_type === 'RECURRING' && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Readings per month (only for RECURRING) */}
                                {formData.pricing_type === 'RECURRING' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-slate-300 text-base">Frequência de Tiragens</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { value: 1, label: '1x por mês', desc: 'Mensal' },
                                                { value: 2, label: '2x por mês', desc: 'Quinzenal' },
                                                { value: 4, label: '4x por mês', desc: 'Semanal' },
                                            ].map(freq => (
                                                <button
                                                    key={freq.value}
                                                    type="button"
                                                    onClick={() => handleChange('readings_per_month', freq.value)}
                                                    className={`p-4 rounded-xl border text-center transition-all ${formData.readings_per_month === freq.value
                                                        ? 'bg-purple-900/20 border-purple-500 text-purple-300'
                                                        : 'bg-[#12121a] border-white/5 text-slate-400 hover:border-purple-500/30'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-center gap-2 mb-1">
                                                        <CalendarDays className="w-4 h-4" />
                                                        <span className="font-bold text-white">{freq.label}</span>
                                                    </div>
                                                    <span className="text-xs">{freq.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <Repeat className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-purple-200">
                                                O cliente pagará <strong>R$ {price.toFixed(2)}/mês</strong> e receberá <strong>{formData.readings_per_month} tiragem{formData.readings_per_month > 1 ? 's' : ''}</strong> por mês. Você será notificada quando for hora de cada tiragem.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">
                                        {formData.pricing_type === 'RECURRING' ? 'Preço Mensal (BRL)' : 'Preço do Serviço (BRL)'}
                                    </Label>
                                    <div className="bg-[#12121a] border border-white/10 rounded-2xl p-2 relative flex items-center h-24 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                                        <span className="text-2xl font-bold text-indigo-400 ml-6">R$</span>
                                        <Input
                                            type="number"
                                            value={formData.price}
                                            onChange={e => handleChange('price', e.target.value)}
                                            className="bg-transparent border-none text-white h-full text-4xl font-bold px-4 focus-visible:ring-0 placeholder:text-slate-700"
                                            placeholder="120,00"
                                        />
                                        {formData.pricing_type === 'RECURRING' && (
                                            <span className="text-lg text-slate-500 mr-6 shrink-0">/mês</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#1a1a24] rounded-2xl p-8 space-y-6 border border-white/5">
                                    <div className="flex justify-between items-center text-slate-400 text-lg">
                                        <span>{formData.pricing_type === 'RECURRING' ? 'Preço Mensal' : 'Preço do Serviço'}</span>
                                        <span>R$ {price.toFixed(2)}{formData.pricing_type === 'RECURRING' ? '/mês' : ''}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-rose-400/80 text-lg">
                                        <span>Taxa da Plataforma (15%)</span>
                                        <span>- R$ {platformFee.toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-white/10 my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-xl">Seus Ganhos{formData.pricing_type === 'RECURRING' ? '/mês' : ''}</span>
                                        <span className="text-emerald-400 font-bold text-2xl">R$ {earnings.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-slate-300 text-base">Tempo Estimado de Entrega</Label>
                                    <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 flex flex-wrap gap-4 items-center justify-between">
                                        <div className="text-slate-400 text-sm md:text-base">
                                            {formData.pricing_type === 'RECURRING' ? 'Tempo para cada tiragem' : 'Entrega Padrão (em até 48 horas)'}
                                        </div>
                                        <div className="flex bg-black/40 rounded-lg p-1">
                                            {DELIVERY_TIMES.map(time => (
                                                <button
                                                    type="button"
                                                    key={time.value}
                                                    onClick={() => handleChange('delivery_time_hours', time.value)}
                                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.delivery_time_hours === time.value
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'text-slate-500 hover:text-white'
                                                        }`}
                                                >
                                                    {time.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                                        <Clock className="w-3 h-3" />
                                        <span>Entregas rápidas geralmente resultam em maior satisfação do cliente e melhores avaliações.</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Extras */}
                        {step === 3 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">Ofereça algo a mais</h2>
                                    <p className="text-slate-400 text-lg">Aumente seus ganhos oferecendo serviços adicionais opcionais.</p>
                                </div>

                                <div className="space-y-6">
                                    {formData.add_ons.map((addon, index) => (
                                        <div key={addon.id} className="bg-[#12121a] border border-white/10 rounded-2xl p-6 relative group">
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => removeAddOn(addon.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-4 pr-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-slate-300 mb-2 block">Título do Adicional</Label>
                                                        <Input
                                                            value={addon.title}
                                                            onChange={e => updateAddOn(addon.id, 'title', e.target.value)}
                                                            placeholder="Ex: Entrega em 24h"
                                                            className="bg-[#0a0a0f] border-white/10 text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-slate-300 mb-2 block">Preço Adicional (R$)</Label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                                                            <Input
                                                                type="number"
                                                                value={addon.price}
                                                                onChange={e => updateAddOn(addon.id, 'price', parseFloat(e.target.value))}
                                                                className="bg-[#0a0a0f] border-white/10 text-white pl-10"
                                                                placeholder="20.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-slate-300 mb-2 block">Descrição (Opcional)</Label>
                                                    <Input
                                                        value={addon.description}
                                                        onChange={e => updateAddOn(addon.id, 'description', e.target.value)}
                                                        placeholder="Explique o que o cliente ganha com isso..."
                                                        className="bg-[#0a0a0f] border-white/10 text-white"
                                                    />
                                                </div>

                                                <div>
                                                    <Label className="text-slate-300 mb-2 block">Tipo</Label>
                                                    <div className="flex gap-2">
                                                        {[
                                                            { id: 'SPEED', label: 'Entrega Rápida' },
                                                            { id: 'EXTRA', label: 'Serviço Extra' },
                                                            // { id: 'CUSTOM', label: 'Personalizado' }
                                                        ].map(type => (
                                                            <button
                                                                key={type.id}
                                                                type="button"
                                                                onClick={() => updateAddOn(addon.id, 'type', type.id)}
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${addon.type === type.id
                                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                                    : 'bg-[#0a0a0f] border-white/10 text-slate-400 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                {type.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        onClick={addAddOn}
                                        variant="outline"
                                        className="w-full h-12 border-dashed border-white/20 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Extra
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Visuals */}
                        {step === 4 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">Mostre sua magia</h2>
                                    <p className="text-slate-400 text-lg">A imagem de capa é a primeira coisa que os clientes veem. Escolha uma foto de alta qualidade que reflita sua energia.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center bg-[#12121a] hover:bg-[#1a1a24] hover:border-indigo-500/30 transition-all cursor-pointer group relative">
                                        <div className="w-20 h-20 rounded-full bg-[#0a0a0f] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform border border-white/5">
                                            {uploadingImage ? (
                                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-indigo-400" />
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">
                                            {uploadingImage ? 'Enviando Imagem...' : 'Enviar Imagem de Capa'}
                                        </h3>
                                        <p className="text-slate-500 mb-6">
                                            {uploadingImage ? 'Por favor aguarde enquanto processamos sua imagem.' : 'Arraste e solte ou clique para buscar'}
                                        </p>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={uploadingImage}
                                            onChange={async (e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    await handleImageUpload(e.target.files[0])
                                                }
                                            }}
                                        />

                                        <p className="text-xs text-slate-600 mt-4">Tamanho recomendado: 1280x720px (JPG, PNG)</p>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6">
                                    <div className="space-y-2">
                                        <Label className="text-white text-xl font-bold block">Selecione seu Baralho</Label>
                                        <p className="text-slate-400">Conte aos clientes quais ferramentas você usa para conectar os mundos.</p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {DECKS.map(deck => (
                                            <button
                                                type="button"
                                                key={deck.id}
                                                onClick={() => handleTagToggle(deck.id)}
                                                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${formData.tags.includes(deck.id)
                                                    ? 'bg-indigo-900/20 border-indigo-500 text-indigo-300'
                                                    : 'bg-[#12121a] border-white/5 text-slate-400 hover:border-indigo-500/30'
                                                    }`}
                                            >
                                                <div className="text-sm font-medium mb-1 opacity-50 uppercase tracking-wider">{deck.type}</div>
                                                <div className="font-bold text-lg text-white">{deck.label}</div>
                                                {formData.tags.includes(deck.id) && (
                                                    <div className="absolute top-0 right-0 p-3">
                                                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Requirements */}
                        {step === 5 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">O que você precisa saber?</h2>
                                    <p className="text-slate-400 text-lg">Defina as perguntas que o cliente deve responder após a compra para que você possa realizar a leitura.</p>
                                </div>

                                <div className="space-y-6">
                                    {formData.requirements.map((req, index) => (
                                        <div key={req.id} className="bg-[#12121a] border border-white/10 rounded-2xl p-6 relative group">
                                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => removeRequirement(req.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-4 pr-8">
                                                <div>
                                                    <Label className="text-slate-300 mb-2 block">Pergunta #{index + 1}</Label>
                                                    <Input
                                                        value={req.question}
                                                        onChange={e => updateRequirement(req.id, 'question', e.target.value)}
                                                        placeholder="Ex: Qual é a sua data de nascimento?"
                                                        className="bg-[#0a0a0f] border-white/10 text-white"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <Label className="text-slate-300 mb-2 block">Tipo de Resposta</Label>
                                                        <select
                                                            value={req.type}
                                                            onChange={e => updateRequirement(req.id, 'type', e.target.value)}
                                                            className="w-full bg-[#0a0a0f] border border-white/10 text-white rounded-md h-10 px-3 text-sm focus:outline-none focus:border-indigo-500"
                                                        >
                                                            <option value="text">Texto Livre</option>
                                                            {/* <option value="choice">Múltipla Escolha</option> */}
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-8">
                                                        <input
                                                            type="checkbox"
                                                            checked={req.required}
                                                            onChange={e => updateRequirement(req.id, 'required', e.target.checked)}
                                                            id={`required-${req.id}`}
                                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <Label htmlFor={`required-${req.id}`} className="text-slate-300 cursor-pointer">Obrigatório</Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        onClick={addRequirement}
                                        variant="outline"
                                        className="w-full h-12 border-dashed border-white/20 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar Pergunta
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 6: Method */}
                        {step === 6 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-3">Escolha seu estilo de leitura</h2>
                                    <p className="text-slate-400 text-lg">Selecione como seu cliente receberá sua orientação espiritual.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        type="button"
                                        onClick={() => handleChange('delivery_method', 'DIGITAL_SPREAD')}
                                        className={`p-8 rounded-3xl border-2 text-left transition-all relative group ${formData.delivery_method === 'DIGITAL_SPREAD'
                                            ? 'bg-[#1a1a24] border-indigo-500 shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)]'
                                            : 'bg-[#12121a] border-white/5 hover:border-indigo-500/30'
                                            }`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${formData.delivery_method === 'DIGITAL_SPREAD' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'
                                            }`}>
                                            <MousePointerClick className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">Tiragem Digital</h3>
                                        <div className="space-y-2 mb-6">
                                            <p className="text-slate-400 leading-relaxed">
                                                Uma experiência imersiva com cartas digitais de alta fidelidade e sua orientação gravada em áudio.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 text-sm text-slate-500">
                                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Layout de cartas interativo</div>
                                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Gravação de áudio de alta qualidade</div>
                                        </div>

                                        {/* Selection Ring */}
                                        <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.delivery_method === 'DIGITAL_SPREAD' ? 'border-indigo-500' : 'border-slate-700'
                                            }`}>
                                            {formData.delivery_method === 'DIGITAL_SPREAD' && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleChange('delivery_method', 'PHYSICAL_PHOTO')}
                                        className={`p-8 rounded-3xl border-2 text-left transition-all relative group ${formData.delivery_method === 'PHYSICAL_PHOTO'
                                            ? 'bg-[#1a1a24] border-indigo-500 shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)]'
                                            : 'bg-[#12121a] border-white/5 hover:border-indigo-500/30'
                                            }`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${formData.delivery_method === 'PHYSICAL_PHOTO' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'
                                            }`}>
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">Foto da Mesa</h3>
                                        <div className="space-y-2 mb-6">
                                            <p className="text-slate-400 leading-relaxed">
                                                Uma conexão física. Envie uma foto da sua tiragem real junto com sua orientação em áudio.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 text-sm text-slate-500">
                                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Foto da tiragem física</div>
                                            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Gravação de áudio de alta qualidade</div>
                                        </div>

                                        {/* Selection Ring */}
                                        <div className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.delivery_method === 'PHYSICAL_PHOTO' ? 'border-indigo-500' : 'border-slate-700'
                                            }`}>
                                            {formData.delivery_method === 'PHYSICAL_PHOTO' && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                                        </div>
                                    </button>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 md:w-2/3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Concordo com o Código de Conduta da Guilda usado neste site</h4>
                                        <p className="text-sm text-slate-400">
                                            e entendo que sou responsável por entregar orientação mística de alta qualidade dentro do prazo estabelecido.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 7: Success */}
                        {step === 7 && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
                                <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-4">
                                    {initialData?.id ? 'Serviço Atualizado!' : 'Serviço Criado com Sucesso!'}
                                </h2>
                                <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                                    {initialData?.id
                                        ? 'As alterações do seu serviço foram salvas e já estão disponíveis.'
                                        : 'Seu novo serviço místico foi criado e salvo com sucesso.'}
                                    <br /><br />
                                    Compartilhe o seu serviço com seus clientes através do link abaixo:
                                </p>

                                {(createdGigId || initialData?.id) && (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-[#12121a] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between w-full max-w-lg gap-4">
                                            <span className="text-slate-300 truncate w-full text-center sm:text-left">
                                                {`${typeof window !== 'undefined' ? window.location.origin : ''}/servico/${createdGigId || initialData?.id}`}
                                            </span>
                                            <CopyLinkButton url={`/servico/${createdGigId || initialData?.id}`} text="Copiar Link" className="w-full sm:w-auto shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white border-transparent" />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-12">
                                    <Button
                                        onClick={() => navigate('/dashboard/cartomante/gigs')}
                                        className="h-14 px-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-lg transition-all hover:scale-105"
                                    >
                                        Ir para Meus Gigs
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Navigation Actions */}
                        {step < 7 && (
                            <div className="flex items-center justify-between pt-12">
                                <Button
                                    variant="outline"
                                    onClick={step === 1 ? () => navigate(-1) : prevStep}
                                    className="h-12 md:h-14 px-6 md:px-8 rounded-full border-white/10 text-white hover:bg-white/5 bg-transparent hover:text-white text-sm md:text-base shrink-0"
                                >
                                    <ChevronLeft className="w-5 h-5 mr-2" />
                                    Voltar
                                </Button>

                                {step < 6 ? (
                                    <Button
                                        onClick={nextStep}
                                        className="h-12 md:h-14 px-4 md:px-10 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs md:text-lg shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all hover:scale-105 flex-1 md:flex-none justify-center"
                                    >
                                        Ir para {STEPS[step].label}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="h-12 md:h-14 px-6 md:px-10 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm md:text-lg shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] transition-all hover:scale-105 flex-1 md:flex-none"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                        {initialData?.id ? 'Salvar Alterações' : 'Publicar Serviço'}
                                    </Button>
                                )}
                            </div>
                        )}
                        {step < 7 && error && <p className="text-red-400 text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
                    </div>

                    {/* RIGHT COLUMN: PREVIEW */}
                    <div className="hidden lg:block w-[400px] shrink-0">
                        <div className="sticky top-32 space-y-6">
                            {/* Live Preview Card */}
                            <div className="bg-[#12121a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10">
                                <div className="relative aspect-[4/3] bg-black group">
                                    {formData.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={formData.image_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <div className="w-full h-full bg-[#1a1a24] flex flex-col items-center justify-center text-slate-700">
                                            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                            <span className="text-xs font-bold uppercase tracking-widest opacity-40">Preview ao Vivo</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 backdrop-blur-md bg-black/40 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-wider">
                                        {formData.delivery_method === 'DIGITAL_SPREAD' ? 'Digital' : 'Foto da Mesa'}
                                    </div>
                                    <div className="absolute top-4 left-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                        Preview do Serviço
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {formData.category ? CATEGORIES.find(c => c.id === formData.category)?.label : 'CATEGORIA'}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-2xl text-white leading-tight min-h-[4rem]">
                                        {formData.title || 'Título aparecerá aqui conforme você digita...'}
                                    </h3>

                                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Star className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                                                <span className="text-sm font-bold text-white">Novo</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">A partir de</p>
                                            <p className="text-2xl font-bold text-indigo-400">R$ {formData.price || '0,00'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tips Card */}
                            <div className="bg-[#1a1a24] border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-amber-500 mb-2">Sabedoria de Preço</h4>
                                        <p className="text-slate-400 leading-relaxed text-sm">
                                            {step === 1 && "Títulos claros e evocativos como 'Leitura de Alinhamento de Almas' convertem 3x melhor do que títulos genéricos como 'Tarot do Amor'."}
                                            {step === 2 && "Preços competitivos para novas cartomantes variam entre R$ 60 e R$ 150. À medida que você ganha avaliações, pode aumentar seu valor."}
                                            {step === 3 && "Oferecer extras como 'Entrega em 24h' pode aumentar seus ganhos em até 20% por pedido."}
                                            {step === 4 && "Clientes decidem em 0,5 segundos com base na sua foto. Use iluminação quente e mostre seu baralho real."}
                                            {step === 5 && "Perguntas claras evitam idas e vindas. Peça apenas o essencial para começar."}
                                            {step === 6 && "60% das cartomantes mais bem avaliadas oferecem Tiragens Digitais por serem fáceis de compartilhar."}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="link" className="mt-4 text-amber-500 p-0 h-auto hover:text-amber-400">
                                    Ler Estrutura de Taxas
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/5 py-8 mt-12 bg-[#0a0a0f]">
                <div className="container mx-auto px-6 text-center text-slate-600 text-sm">
                    &copy; 2026 Marketplace Isidis. Todos os direitos celestiais reservados.
                </div>
            </div>
        </div>
    )
}
