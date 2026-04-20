
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitOnboardingStep1, submitOnboardingStep2, submitOnboardingStep3, submitOnboardingStep4 } from '@/lib/actions/reader-onboarding'
import { Upload, CheckCircle, Shield, User, FileText, Banknote, MapPin, Camera, Video, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface OnboardingPageProps {
    initialProfile?: {
        tax_id?: string
        cnpj?: string
        pix_key?: string
        pix_key_type?: string
    }
}

export default function OnboardingPage({ initialProfile }: OnboardingPageProps) {
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingCep, setIsLoadingCep] = useState(false)

    // Masks
    const formatCpf = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }
    const formatPhone = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 11)
        if (d.length <= 2) return d.length ? `(${d}` : ''
        if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    }

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '')
        if (cep.length !== 8) return

        setIsLoadingCep(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            const data = await response.json()

            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address_street: data.logradouro,
                    address_neighborhood: data.bairro,
                    address_city: data.localidade,
                    address_state: data.uf
                }))
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error)
        } finally {
            setIsLoadingCep(false)
        }
    }

    // Form State (simplified for MVP)
    const [formData, setFormData] = useState({
        // Step 1: Legal & Financial
        cpf: initialProfile?.tax_id || '',
        birth_date: '',
        company_name: '',
        cnpj: '',
        cbo: '',
        address_zip_code: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        pix_key_type: 'CPF/CNPJ',
        pix_key: '',

        // Step 2: Security (URLs after upload)
        document_front_url: '',
        document_back_url: '',
        selfie_url: '',

        // Step 3: Compliance
        ethics_accepted: false,
        results_disclaimer_accepted: false,

        // Step 4: Profile
        bio: '',
        specialties: [] as string[],
        profile_video_url: '',
        avatar_url: ''
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCheckboxChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not found')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${fieldName}_${Date.now()}.${fileExt}`

            const { error: uploadError, data } = await supabase.storage
                .from('verification_documents')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            setFormData(prev => ({ ...prev, [fieldName]: data.path }))
            toast.success('Documento enviado com sucesso!')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error('Erro ao enviar documento: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const onSubmitStep1 = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const form = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            if (typeof value === 'string') form.append(key, value)
        })

        const result = await submitOnboardingStep1(null, form)
        setIsLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            setStep(2)
            window.scrollTo(0, 0)
        }
    }

    const onSubmitStep2 = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.document_front_url || !formData.document_back_url || !formData.selfie_url) {
            toast.error('Por favor, envie todos os documentos obrigatórios.')
            return
        }

        setIsLoading(true)
        const form = new FormData()
        form.append('document_front_url', formData.document_front_url)
        form.append('document_back_url', formData.document_back_url)
        form.append('selfie_url', formData.selfie_url)

        const result = await submitOnboardingStep2(null, form)
        setIsLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            setStep(3)
            window.scrollTo(0, 0)
        }
    }

    const onSubmitStep3 = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.ethics_accepted || !formData.results_disclaimer_accepted) {
            toast.error('Você deve aceitar todos os termos.')
            return
        }

        setIsLoading(true)
        const form = new FormData()
        if (formData.ethics_accepted) form.append('ethics_accepted', 'on')
        if (formData.results_disclaimer_accepted) form.append('results_disclaimer_accepted', 'on')

        const result = await submitOnboardingStep3(null, form)
        setIsLoading(false)
        if (result?.error) {
            toast.error(result.error)
        } else {
            setStep(4)
            window.scrollTo(0, 0)
        }
    }

    const onSubmitStep4 = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        const form = new FormData()
        form.append('bio', formData.bio)
        form.append('profile_video_url', formData.profile_video_url)
        if (formData.avatar_url) form.append('avatar_url', formData.avatar_url)

        formData.specialties.forEach(s => form.append('specialties', s))

        try {
            const result = await submitOnboardingStep4(null, form)
            if (result?.error) {
                toast.error(result.error)
            }
        } catch (err) {
            // Server actions that redirect throw an error on the client
            // We can ignore it as Next.js will handle the redirect
        } finally {
            setIsLoading(false)
        }
    }

    const toggleSpecialty = (s: string) => {
        setFormData(prev => {
            if (prev.specialties.includes(s)) {

                return { ...prev, specialties: prev.specialties.filter(item => item !== s) }
            }
            if (prev.specialties.length >= 4) return prev // Limit to 4
            return { ...prev, specialties: [...prev.specialties, s] }
        })
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2">Configure seu Perfil Profissional</h1>
                    <p className="text-muted-foreground">Complete as etapas para liberar sua conta e começar a atender.</p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between relative mb-12">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10" />
                    {[
                        { step: 1, label: 'Jurídico', icon: FileText },
                        { step: 2, label: 'Segurança', icon: Shield },
                        { step: 3, label: 'Compliance', icon: AlertTriangle },
                        { step: 4, label: 'Perfil', icon: User },
                    ].map((item) => (
                        <div key={item.step} className="flex flex-col items-center bg-background px-2">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= item.step ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted text-muted-foreground'
                                }`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-medium mt-2 ${step >= item.step ? 'text-primary' : 'text-muted-foreground'}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Steps Content */}
                <div className="bg-card border border-border rounded-xl p-6 md:p-10 shadow-lg">
                    {step === 1 && (
                        <form onSubmit={onSubmitStep1} className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Dados Jurídicos e Financeiros
                            </h2>
                            <p className="text-sm text-muted-foreground">Necessários para emissão de nota fiscal e repasses.</p>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>CPF *</Label>
                                    <Input
                                        name="cpf"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                                        required
                                        readOnly={!!initialProfile?.tax_id}
                                        className={initialProfile?.tax_id ? "bg-muted cursor-not-allowed" : ""}
                                        placeholder="000.000.000-00"
                                    />
                                    {initialProfile?.tax_id && <p className="text-[10px] text-muted-foreground italic">O CPF informado no cadastro não pode ser alterado.</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Data de Nascimento *</Label>
                                    <Input name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ (Opcional)</Label>
                                    <Input name="cnpj" value={formData.cnpj} onChange={handleInputChange} placeholder="00.000.000/0001-00" />
                                    <p className="text-xs text-muted-foreground">Preencha se for emitir nota como empresa/MEI.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Razão Social (Se PJ)</Label>
                                    <Input name="company_name" value={formData.company_name} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>CBO (Se MEI)</Label>
                                    <Input name="cbo" value={formData.cbo} onChange={handleInputChange} placeholder="Ex: 5168-05 (Esotérico)" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Endereço
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <Label>CEP *</Label>
                                        <Input
                                            name="address_zip_code"
                                            value={formData.address_zip_code}
                                            onChange={handleInputChange}
                                            onBlur={handleCepBlur}
                                            required
                                            disabled={isLoadingCep}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <Label>Cidade *</Label>
                                        <Input name="address_city" value={formData.address_city} onChange={handleInputChange} required />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Rua *</Label>
                                        <Input name="address_street" value={formData.address_street} onChange={handleInputChange} required />
                                    </div>
                                    <div>
                                        <Label>Número *</Label>
                                        <Input name="address_number" value={formData.address_number} onChange={handleInputChange} required />
                                    </div>
                                    <div>
                                        <Label>Estado *</Label>
                                        <Input name="address_state" value={formData.address_state} onChange={handleInputChange} required maxLength={2} placeholder="UF" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Bairro *</Label>
                                        <Input name="address_neighborhood" value={formData.address_neighborhood} onChange={handleInputChange} required />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Banknote className="w-4 h-4" /> Chave Pix para Repasses
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Tipo de Chave *</Label>
                                        <select
                                            name="pix_key_type"
                                            value={formData.pix_key_type}
                                            onChange={handleInputChange}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                            required
                                        >
                                            <option value="CPF/CNPJ">CPF/CNPJ</option>
                                            <option value="CELULAR">Celular</option>
                                            <option value="EMAIL">E-mail</option>
                                            <option value="ALEATORIA">Chave Aleatória</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Chave Pix *</Label>
                                        <Input name="pix_key" value={formData.pix_key} onChange={handleInputChange} required placeholder="Sua chave Pix" />
                                    </div>
                                </div>
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                    ⚠️ A chave Pix deve ter a mesma titularidade do CPF/CNPJ informado (trava de segurança).
                                </p>
                            </div>

                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Salvando...' : 'Continuar para Segurança'}
                            </Button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={onSubmitStep2} className="space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Validação de Identidade
                                </h2>
                                <p className="text-sm text-muted-foreground">Envie fotos recentes e legíveis. Seus dados estão seguros.</p>
                            </div>

                            <div className="grid gap-8 md:grid-cols-3">
                                {/* Doc Front */}
                                <div className="space-y-4">
                                    <Label className="block text-center">Frente do Documento (RG/CNH)</Label>
                                    <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative">
                                        {formData.document_front_url ? (
                                            <div className="text-center">
                                                <CheckCircle className="w-10 h-10 text-green-500 mb-2 mx-auto" />
                                                <span className="text-xs text-green-600 font-medium">Enviado</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                                <span className="text-xs text-muted-foreground">Clique para enviar</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'document_front_url')}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required={!formData.document_front_url}
                                        />
                                    </div>
                                </div>

                                {/* Doc Back */}
                                <div className="space-y-4">
                                    <Label className="block text-center">Verso do Documento</Label>
                                    <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative">
                                        {formData.document_back_url ? (
                                            <div className="text-center">
                                                <CheckCircle className="w-10 h-10 text-green-500 mb-2 mx-auto" />
                                                <span className="text-xs text-green-600 font-medium">Enviado</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                                <span className="text-xs text-muted-foreground">Clique para enviar</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'document_back_url')}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required={!formData.document_back_url}
                                        />
                                    </div>
                                </div>

                                {/* Selfie */}
                                <div className="space-y-4">
                                    <Label className="block text-center">Selfie com Documento</Label>
                                    <div className="border-2 border-dashed border-muted rounded-xl p-6 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative">
                                        {formData.selfie_url ? (
                                            <div className="text-center">
                                                <CheckCircle className="w-10 h-10 text-green-500 mb-2 mx-auto" />
                                                <span className="text-xs text-green-600 font-medium">Enviado</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                                                <span className="text-xs text-muted-foreground">Segure o doc ao lado do rosto</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, 'selfie_url')}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required={!formData.selfie_url}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Verificando...' : 'Continuar para Compliance'}
                            </Button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={onSubmitStep3} className="space-y-8 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-primary" />
                                    Termos e Ética
                                </h2>
                                <p className="text-sm text-muted-foreground">Proteção para você e para a plataforma.</p>
                            </div>

                            <div className="space-y-4 bg-muted/20 p-6 rounded-lg border border-border">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="ethics"
                                        className="mt-1 w-4 h-4"
                                        checked={formData.ethics_accepted}
                                        onChange={(e) => handleCheckboxChange('ethics_accepted', e.target.checked)}
                                    />
                                    <Label htmlFor="ethics" className="text-sm leading-relaxed">
                                        Declaro que não realizarei trabalhos que prometam curas de saúde milagrosas ou &quot;trabalhos espirituais&quot; ilícitos (como amarrações que envolvam assédio ou práticas criminosas). Entendo que a violação deste termo acarretará banimento imediato. (Compliance Art. 283 CP).
                                    </Label>
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="disclaimer"
                                        className="mt-1 w-4 h-4"
                                        checked={formData.results_disclaimer_accepted}
                                        onChange={(e) => handleCheckboxChange('results_disclaimer_accepted', e.target.checked)}
                                    />
                                    <Label htmlFor="disclaimer" className="text-sm leading-relaxed">
                                        Estou ciente que meus serviços são de entretenimento, aconselhamento e orientação espiritual, não havendo garantia científica de previsão do futuro ou resultados materiais infalíveis. Comprometo-me a deixar isso claro aos consulentes.
                                    </Label>
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading || !formData.ethics_accepted || !formData.results_disclaimer_accepted} className="w-full">
                                {isLoading ? 'Processando...' : 'Concordar e Continuar'}
                            </Button>
                        </form>
                    )}

                    {step === 4 && (
                        <form onSubmit={onSubmitStep4} className="space-y-6 animate-fade-in">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" />
                                    Perfil Profissional
                                </h2>
                                <p className="text-sm text-muted-foreground">Como você aparecerá na vitrine.</p>
                            </div>

                            <div className="space-y-4 flex flex-col items-center">
                                <Label className="text-center w-full">Foto de Perfil (Rosto visível, sem objetos mágicos)</Label>
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-muted hover:border-primary transition-colors group">
                                    {formData.avatar_url ? (
                                        <div className="w-full h-full relative">
                                            {/* Since we only have the path, we might need to construct the URL or just show a placeholder if we don't have the public URL logic here. 
                                                But usually Supabase returns the full path or we know the bucket base URL. 
                                                For now, let's just show a success state or try to display if it's a blob url (but we only get path).
                                                Actually, for UX, we should probably show the unexpected file preview using URL.createObjectURL(file) before upload, but here we upload immediately.
                                                Let's just show a checkmark or the image if we can construct the url.
                                                Supabase public URL: import.meta.env.VITE_SUPABASE_URL + '/storage/v1/object/public/avatars/' + formData.avatar_url
                                             */}
                                            <img
                                                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${formData.avatar_url}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white w-6 h-6" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                            <Camera className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            // Handle upload to 'avatars' bucket
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            // We need to call a different upload function or modify handleFileUpload to verify bucket
                                            // Let's create a specific one or reuse?
                                            // The existing handleFileUpload uses 'verification_documents' bucket hardcoded.
                                            // I will create a localized handler here for simplicity or update the main one.
                                            // Let's update the main one to accept bucket?
                                            // Step 2 uses 'verification_documents'.
                                            // I'll create a quick inline handler or copy logic.

                                            setIsLoading(true)
                                            createClient().auth.getUser().then(async ({ data: { user } }) => {
                                                if (!user) return
                                                const fileExt = file.name.split('.').pop()
                                                const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`
                                                const { data, error } = await createClient().storage.from('avatars').upload(fileName, file)
                                                setIsLoading(false)
                                                if (error) {
                                                    toast.error('Erro ao enviar foto.')
                                                } else {
                                                    setFormData(prev => ({ ...prev, avatar_url: data.path }))
                                                    toast.success('Foto enviada!')
                                                }
                                            })
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Biografia Curta (140 caracteres) *</Label>
                                <Textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    maxLength={140}
                                    placeholder="Especialista em amor e reconexão..."
                                    required
                                    className="resize-none h-24"
                                />
                                <p className="text-right text-xs text-muted-foreground">{formData.bio.length}/140</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Especialidades (Selecione até 4) *</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Tarot de Marselha', 'Baralho Cigano', 'Runas', 'Pêndulo', 'Astrologia', 'Numerologia', 'Reiki', 'Búzios'].map((spec) => (
                                        <button
                                            key={spec}
                                            type="button"
                                            onClick={() => toggleSpecialty(spec)}
                                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${formData.specialties.includes(spec)
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background border-border hover:border-primary/50'
                                                }`}
                                        >
                                            {spec}
                                        </button>
                                    ))}
                                </div>
                                {formData.specialties.length === 0 && <p className="text-xs text-destructive">Selecione pelo menos uma.</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Vídeo de Apresentação (Link YouTube/Insta) - Opcional</Label>
                                <div className="relative">
                                    <Video className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        name="profile_video_url"
                                        value={formData.profile_video_url}
                                        onChange={handleInputChange}
                                        placeholder="https://youtube.com/..."
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <Button type="submit" disabled={isLoading || formData.specialties.length === 0} className="w-full">
                                {isLoading ? 'Finalizando...' : 'Concluir Cadastro'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
