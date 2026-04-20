
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/lib/actions/profile'
import {
    Loader2, CheckCircle2, User, Camera, Mail,
    Sparkles, Image as ImageIcon, FileText, Phone
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfileFormProps {
    initialData: {
        fullName: string
        cellphone: string
        taxId: string
        email: string
        bio: string
        avatarUrl: string
        coverUrl: string
    }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        full_name: initialData.fullName || '',
        cellphone: initialData.cellphone || '',
        tax_id: initialData.taxId || '',
        email: initialData.email || '',
        bio: initialData.bio || '',
        avatar_url: initialData.avatarUrl || '',
        cover_url: initialData.coverUrl || '',
    })

    const [uploading, setUploading] = useState(false)

    // CPF mask: 000.000.000-00
    const formatCpf = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }

    // Phone mask: (00) 00000-0000
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 2) return digits.length ? `(${digits}` : ''
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

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
            setMessage(`${field === 'avatar_url' ? 'Avatar' : 'Capa'} atualizada!`)
            setTimeout(() => setMessage(''), 3000)
        } catch (error: unknown) {
            console.error('Error uploading image:', error)
            setError('Erro ao enviar imagem. Tente novamente.')
        } finally {
            setUploading(false)
        }
    }

    const handleSubmit = () => {
        setError('')
        setMessage('')

        startTransition(async () => {
            const data = new FormData()
            data.append('full_name', formData.full_name)
            data.append('cellphone', formData.cellphone)
            data.append('tax_id', formData.tax_id)
            data.append('bio', formData.bio)
            data.append('avatar_url', formData.avatar_url)
            data.append('cover_url', formData.cover_url)
            // email is read-only, not sent

            // We pass null as prevState because we are calling it directly
            const result = await updateProfile(null, data)

            if (result?.error) {
                setError(result.error)
            } else {
                setMessage('Perfil atualizado com sucesso!')
            }
        })
    }

    return (
        <div className="w-full space-y-8 animate-fade-in-up">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* LEFT COLUMN: FORM */}
                <div className="flex-1 space-y-8">
                    {/* 1. Public Identity */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                            <Sparkles className="w-5 h-5" />
                            <h2 className="text-xl font-bold">Identidade Visual</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-muted-foreground text-sm font-medium">Imagem de Capa</Label>
                                <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-muted/30 aspect-[3/1] transition-all hover:border-primary/50">
                                    {formData.cover_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 transition-colors group-hover:text-primary">
                                            <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                                            <span className="text-sm">Clique para enviar capa</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <label htmlFor="cover-upload" className="cursor-pointer bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-bold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
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
                                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Tamanho Recomendado: 1200x400px</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                <div className="shrink-0 relative group self-center sm:self-start">
                                    <div className="w-28 h-28 rounded-full border-4 border-background overflow-hidden bg-muted shadow-xl relative ring-1 ring-border/50">
                                        {/* Avatar Placeholder */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={formData.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + formData.full_name}
                                            alt="Avatar"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {/* Overlay for upload */}
                                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold uppercase">
                                            <Camera className="w-5 h-5 mb-1" />
                                            {uploading ? '...' : 'Alterar'}
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

                                <div className="flex-1 w-full space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-sm font-medium">Nome de Exibição</Label>
                                        <Input
                                            value={formData.full_name}
                                            onChange={e => handleChange('full_name', e.target.value)}
                                            className="h-11 bg-muted/20 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Seu nome"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-sm font-medium">Bio</Label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={e => handleChange('bio', e.target.value)}
                                            rows={3}
                                            className="w-full bg-muted/20 border border-border/50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                                            placeholder="Conte um pouco sobre você..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-border/40" />

                    {/* 2. Personal Info */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                            <User className="w-5 h-5" />
                            <h2 className="text-xl font-bold">Dados Pessoais</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> CPF
                                </Label>
                                <Input
                                    value={formData.tax_id}
                                    readOnly
                                    className="h-11 bg-muted/10 border-border/30 rounded-xl text-muted-foreground/60 cursor-not-allowed italic"
                                    placeholder="000.000.000-00"
                                />
                                <p className="text-[10px] text-muted-foreground/50 italic px-1">O CPF não pode ser alterado após o cadastro.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5" /> Celular
                                </Label>
                                <Input
                                    value={formData.cellphone}
                                    onChange={e => handleChange('cellphone', formatPhone(e.target.value))}
                                    className="h-11 bg-muted/30 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" /> Email
                                </Label>
                                <Input
                                    value={formData.email}
                                    disabled
                                    className="h-11 bg-muted/10 border-border/30 rounded-xl text-muted-foreground/60 cursor-not-allowed italic"
                                />
                                <p className="text-[10px] text-muted-foreground/50 italic px-1">O email está vinculado à sua conta e não pode ser alterado por aqui.</p>
                            </div>
                        </div>
                    </section>

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={isPending || uploading}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-8 h-12 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </div>

                {/* RIGHT COLUMN: PREVIEW */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="sticky top-8 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Pré-visualização</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Preview Live</span>
                            </div>
                        </div>

                        {/* Card Preview */}
                        <div className="bg-card rounded-3xl overflow-hidden border border-border/40 shadow-xl relative group ring-1 ring-border/5">
                            <div className="h-28 bg-muted relative overflow-hidden">
                                {formData.cover_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={formData.cover_url} alt="Cover" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>

                            <div className="px-5 pb-5 relative z-10 -mt-10">
                                <div className="w-20 h-20 rounded-full border-4 border-card overflow-hidden bg-muted mb-3 shadow-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + formData.full_name}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold truncate">{formData.full_name || 'Seu Nome'}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                                        {formData.bio || 'Sua biografia aparecerá aqui...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                <span className="font-bold text-primary">Dica:</span> Use uma imagem de capa que represente seu trabalho para atrair mais clientes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {message && (
                <div className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-[100]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">{message}</span>
                </div>
            )}
            {error && (
                <div className="fixed bottom-8 right-8 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-[100]">
                    <span className="font-bold">{error}</span>
                </div>
            )}
        </div>
    )
}
