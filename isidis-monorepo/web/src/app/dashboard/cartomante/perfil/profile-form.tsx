
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout/PageContainer'
import { updateProfile } from '../actions'
import {
    Loader2, CheckCircle2, User, Camera, Instagram, Youtube,
    Sparkles, Lightbulb, MapPin, Star, Image as ImageIcon, Plus, X
} from 'lucide-react'
import {  useNavigate  } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'


interface ProfileFormProps {
    email: string
    profile: {
        full_name?: string
        bio?: string
        tagline?: string
        cover_url?: string
        years_of_experience?: number
        instagram_handle?: string
        tax_id?: string
        cnpj?: string
        youtube_url?: string
        specialties?: string[]
        decks_used?: string[]
        pix_key_type?: string
        pix_key?: string
        avatar_url?: string
        profile_color?: string
        max_orders_per_day?: number
        max_simultaneous_orders?: number
    }
}

const SPECIALTIES_LIST = [
    'Amor & Relacionamentos', 'Carreira & Finanças', 'Espiritualidade',
    'Família & Amigos', 'Vidas Passadas', 'Interpretação de Sonhos',
    'Saúde & Bem-estar'
]

const DECKS_LIST = [
    'Tarot Rider Waite', 'Tarot de Marselha', 'Baralho Cigano',
    'Oráculos', 'Tarot de Thoth', 'Tarot Osho Zen'
]

export function ProfileForm({ email, profile }: ProfileFormProps) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [formData, setFormData] = useState({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        tagline: profile.tagline || '',
        cover_url: profile.cover_url || '',
        years_of_experience: profile.years_of_experience || 0,
        instagram_handle: profile.instagram_handle || '',
        tax_id: profile.tax_id || '',
        cnpj: profile.cnpj || '',
        youtube_url: profile.youtube_url || '',
        specialties: profile.specialties || [],
        decks_used: profile.decks_used || [],
        pix_key_type: profile.pix_key_type || '',
        pix_key: profile.pix_key || '',
        avatar_url: profile.avatar_url || '', // Add avatar_url to state

        max_orders_per_day: profile.max_orders_per_day || 0,
        max_simultaneous_orders: profile.max_simultaneous_orders || 0
    })

    const [uploading, setUploading] = useState(false)

    const handleUpload = async (file: File, field: 'avatar_url' | 'cover_url') => {
        try {
            setUploading(true)
            const supabase = createClient()

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
            const filePath = `${field}/${fileName}`

            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            handleChange(field, publicUrl)
            setMessage('Imagem enviada com sucesso!')
        } catch (error: any) {
            console.error('Error uploading image:', error)
            setMessage('Erro ao enviar imagem. Verifique se o bucket "avatars" existe.')
        } finally {
            setUploading(false)
        }
    }

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleArrayItem = (field: 'specialties' | 'decks_used', item: string) => {
        setFormData(prev => {
            const list = prev[field]
            if (list.includes(item)) {
                return { ...prev, [field]: list.filter(i => i !== item) }
            } else {
                if (list.length >= 5) return prev // Limit to 5
                return { ...prev, [field]: [...list, item] }
            }
        })
    }

    const handleSubmit = async () => {
        setLoading(true)
        setMessage('')

        const data = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'specialties' || key === 'decks_used') {
                data.append(key, JSON.stringify(value))
            } else {
                data.append(key, String(value))
            }
        })

        const result = await updateProfile(data)

        if (result?.error) {
            // Handle error (could add error state)
            console.error(result.error)
        } else {
            setMessage('Alterações salvas com sucesso')
            console.log("Salvo")
        }
        setLoading(false)
    }

    return (
        <div className="text-slate-200 min-h-full bg-background-deep">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5">
                <PageContainer className="py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Editor de Perfil</h1>
                        <p className="text-slate-400 text-sm">Configure sua presença mística e ofertas profissionais.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-slate-500 text-xs uppercase tracking-wider hidden sm:block">Salvo agora mesmo</span>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-full px-6 transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </PageContainer>
            </div>

            <PageContainer className="py-12">
                <div className="flex flex-col xl:flex-row gap-16">

                    {/* LEFT COLUMN: FORM */}
                    <div className="flex-1 space-y-16">

                        {/* 1. Visual & Public Presence */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-3 text-amber-400 mb-6">
                                <Sparkles className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Presença Visual & Identidade</h2>
                            </div>

                            <div className="space-y-8">
                                {/* Banner de Capa - First thing editable */}
                                <div className="space-y-4">
                                    <Label className="text-slate-400">Banner de Capa</Label>
                                    <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] aspect-[3/1]">
                                        {formData.cover_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover transition-opacity group-hover:opacity-50" />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                                                <ImageIcon className="w-12 h-12 mb-2" />
                                                <span className="text-sm font-medium">Clique para Enviar Capa</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <label htmlFor="cover-upload" className="cursor-pointer bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm hover:bg-black font-bold flex items-center gap-2">
                                                <Camera className="w-4 h-4" />
                                                {uploading ? 'Enviando...' : 'Alterar Capa'}
                                            </label>
                                            <input
                                                id="cover-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleUpload(e.target.files[0], 'cover_url')
                                                    }
                                                }}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600">Recomendado 1200x400px. Exibido no topo do seu perfil.</p>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="shrink-0 relative group">
                                        <div className="w-32 h-32 rounded-full border-4 border-[#12121a] overflow-hidden bg-slate-800 shadow-xl relative">
                                            {/* Avatar Placeholder */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={formData.avatar_url || profile.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Overlay for upload */}
                                            <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium">
                                                <Camera className="w-6 h-6 mb-1" />
                                                {uploading ? 'Enviando...' : 'Alterar'}
                                            </label>
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleUpload(e.target.files[0], 'avatar_url')
                                                    }
                                                }}
                                                disabled={uploading}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-slate-400">Nome Profissional</Label>
                                                <Input
                                                    value={formData.full_name}
                                                    onChange={e => handleChange('full_name', e.target.value)}
                                                    className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500"
                                                    placeholder="ex: Seraphina Moon"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-400">Slogan</Label>
                                                <Input
                                                    value={formData.tagline}
                                                    onChange={e => handleChange('tagline', e.target.value)}
                                                    className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500"
                                                    placeholder="ex: Guiando almas através dos mistérios celestiais"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                                                <Input
                                                    value={formData.instagram_handle}
                                                    onChange={e => handleChange('instagram_handle', e.target.value)}
                                                    className="h-12 bg-[#12121a] border-white/10 rounded-xl pl-8 focus:border-indigo-500"
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#12121a]/50 border border-white/5 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4 text-slate-400">
                                        <User className="w-5 h-5" />
                                        <h3 className="font-bold">Dados Fiscais</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-500">CPF</Label>
                                            <Input
                                                value={formData.tax_id}
                                                readOnly
                                                className="h-12 bg-white/5 border-white/5 rounded-xl text-slate-400 cursor-not-allowed"
                                                placeholder="---"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-500">CNPJ</Label>
                                            <Input
                                                value={formData.cnpj}
                                                readOnly
                                                className="h-12 bg-white/5 border-white/5 rounded-xl text-slate-400 cursor-not-allowed"
                                                placeholder="---"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-500 capitalize">Chave Pix{formData.pix_key_type ? ` (${formData.pix_key_type})` : ''}</Label>
                                            <Input
                                                value={formData.pix_key}
                                                readOnly
                                                className="h-12 bg-white/5 border-white/5 rounded-xl text-slate-400 cursor-not-allowed"
                                                placeholder="---"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-4 italic">Dados sensíveis são puxados automaticamente do seu cadastro e não podem ser alterados aqui para sua segurança.</p>

                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-white/5" />

                        {/* 2. About & Experience */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-3 text-amber-400 mb-6">
                                <User className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Sobre & Experiência</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="w-full sm:w-1/3 space-y-2">
                                    <Label className="text-slate-400">Anos de Experiência</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={formData.years_of_experience}
                                            onChange={e => handleChange('years_of_experience', e.target.value)}
                                            className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500 text-center text-lg font-bold"
                                        />
                                        <span className="text-slate-500 text-sm">anos praticando profissionalmente</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-400">Biografia</Label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => handleChange('bio', e.target.value)}
                                        rows={6}
                                        className="w-full bg-[#12121a] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 resize-none leading-relaxed"
                                        placeholder="Comecei minha jornada nas artes esotéricas há quase duas décadas..."
                                    />
                                    <p className="text-xs text-slate-600 text-right">{formData.bio.length}/2000</p>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-white/5" />

                        {/* 3. Specialties & Decks */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-3 text-amber-400 mb-6">
                                <Star className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Especialidades & Ferramentas</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-slate-400">Especialidades (Selecione até 5)</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {SPECIALTIES_LIST.map(spec => (
                                            <button
                                                key={spec}
                                                onClick={() => toggleArrayItem('specialties', spec)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${formData.specialties.includes(spec)
                                                    ? 'bg-amber-400 border-amber-400 text-black'
                                                    : 'bg-[#12121a] border-white/10 text-slate-400 hover:border-white/30'
                                                    }`}
                                            >
                                                {spec} {formData.specialties.includes(spec) && '×'}
                                            </button>
                                        ))}
                                        {formData.specialties.filter(s => !SPECIALTIES_LIST.includes(s)).map(spec => (
                                            <button
                                                key={spec}
                                                onClick={() => toggleArrayItem('specialties', spec)}
                                                className="px-4 py-2 rounded-full text-sm font-medium border transition-all bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                                title="Este item não faz parte da lista padrão. Clique para remover."
                                            >
                                                {spec} (Antigo) ×
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-slate-400">Baralhos & Ferramentas</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {DECKS_LIST.map(deck => (
                                            <button
                                                key={deck}
                                                onClick={() => toggleArrayItem('decks_used', deck)}
                                                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${formData.decks_used.includes(deck)
                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                    : 'bg-[#12121a] border-white/10 text-slate-500 hover:border-white/30'
                                                    }`}
                                            >
                                                {deck} {formData.decks_used.includes(deck) && '×'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-white/5" />

                        {/* 4. Social Proof & Intro */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-3 text-amber-400 mb-6">
                                <Lightbulb className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Social & Introdução</h2>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-400 flex items-center gap-2"><Youtube className="w-4 h-4" /> URL do Vídeo de Introdução</Label>
                                <div className="relative">
                                    <Input
                                        value={formData.youtube_url}
                                        onChange={e => handleChange('youtube_url', e.target.value)}
                                        className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500"
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>
                                <p className="text-xs text-slate-600">Dê aos seus clientes uma amostra da sua energia mística.</p>
                            </div>
                        </section>

                        <div className="h-px bg-white/5" />

                        {/* 5. Service Configuration */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-3 text-amber-400 mb-6">
                                <MapPin className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-white">Configurações de Atendimento</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-400">Limite de Pedidos por Dia</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.max_orders_per_day}
                                        onChange={e => handleChange('max_orders_per_day', e.target.value)}
                                        className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500"
                                        placeholder="0 = Sem limite"
                                    />
                                    <p className="text-xs text-slate-500">Máximo de pedidos que você aceita receber em um dia.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-400">Atendimentos Simultâneos</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.max_simultaneous_orders}
                                        onChange={e => handleChange('max_simultaneous_orders', e.target.value)}
                                        className="h-12 bg-[#12121a] border-white/10 rounded-xl focus:border-indigo-500"
                                        placeholder="0 = Sem limite"
                                    />
                                    <p className="text-xs text-slate-500">Máximo de leituras que você consegue fazer ao mesmo tempo (pendentes).</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN: PREVIEW */}
                    <div className="hidden xl:block w-[400px] shrink-0 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Prévia na Busca</h3>
                                <div className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-[10px] font-bold uppercase">Status ao Vivo</div>
                            </div>

                            {/* Card Preview */}
                            <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group text-slate-200 bg-card-deep">
                                <div className="h-32 bg-indigo-900 relative overflow-hidden">
                                    {formData.cover_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover opacity-80" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-[#12121a]/60 to-transparent" />
                                </div>

                                <div className="px-6 pb-6 relative z-10 -mt-12">
                                    <div className="w-24 h-24 rounded-full border-4 border-[#12121a] overflow-hidden bg-slate-800 mb-4 shadow-lg">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formData.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-xl font-bold text-white">{formData.full_name || 'Seu Nome'}</h4>
                                            <p className="text-xs mt-1 line-clamp-2 max-w-[200px] text-slate-500">
                                                {formData.tagline || 'Seu slogan aparecerá aqui...'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">
                                            <Star className="w-3 h-3 fill-amber-400" />
                                            <span className="text-xs font-bold">4.9</span>
                                            <span className="text-[10px] opacity-70">(240)</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {formData.specialties.slice(0, 2).map(spec => (
                                            <span key={spec} className="text-[10px] px-2 py-1 rounded border text-slate-400 border-white/5 bg-white/5">
                                                {spec}
                                            </span>
                                        ))}
                                        {formData.specialties.length > 2 && (
                                            <span className="text-[10px] px-2 py-1 rounded border text-slate-400 border-white/5 bg-white/5">
                                                +{formData.specialties.length - 2} mais
                                            </span>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">A partir de</p>
                                            <p className="text-xl font-bold text-amber-400">$45<span className="text-sm font-normal text-slate-500">/sessão</span></p>
                                        </div>
                                        <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-full px-4 text-xs h-8">
                                            Ver Perfil Completo
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pro Tip Card */}
                        <div className="bg-[#1a1a24] border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
                                    <Lightbulb className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-amber-500 mb-1">Dica Profissional</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        Perfis com banner de capa e vídeo de introdução de alta qualidade recebem <span className="text-amber-400 font-bold">3.5x mais agendamentos</span> em média.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PageContainer>
            {
                message && (
                    <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold">{message}</span>
                    </div>
                )
            }
        </div >
    )
}
