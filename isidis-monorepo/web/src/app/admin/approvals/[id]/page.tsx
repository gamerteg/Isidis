import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Shield, CreditCard, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { approveReader, rejectReader } from '../actions'
import { useAuth } from '@/hooks/useAuth'

export default function ApprovalDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [reader, setReader] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }
        if (!id) return

        const supabase = createClient()

        supabase.from('profiles').select('*').eq('id', id).single()
            .then(({ data }) => {
                if (!data) { navigate('/admin/approvals'); return }
                setReader(data)
                setLoading(false)
            })
    }, [id, user, authLoading])

    const handleApprove = async () => {
        if (!id) return
        setProcessing(true)
        await approveReader(id)
        navigate('/admin/approvals')
    }

    const handleReject = async () => {
        if (!id) return
        setProcessing(true)
        await rejectReader(id)
        navigate('/admin/approvals')
    }

    if (authLoading || loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
    if (!reader) return null

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/admin/approvals"><ArrowLeft className="w-5 h-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Análise de Cadastro</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>{reader.full_name}</span>
                        <span>•</span>
                        <span className="font-mono">{reader.id}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="destructive" className="gap-2" onClick={handleReject} disabled={processing}>
                        <XCircle className="w-4 h-4" />Rejeitar
                    </Button>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700 gap-2" onClick={handleApprove} disabled={processing}>
                        <CheckCircle2 className="w-4 h-4" />Aprovar Cadastro
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-muted mb-4 border-4 border-muted">
                                {reader.avatar_url ? (
                                    <img src={reader.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-muted-foreground mt-8 mx-auto" />
                                )}
                            </div>
                            <h2 className="text-lg font-bold">{reader.social_name || reader.full_name}</h2>
                            <Badge className="mt-2 bg-amber-500/10 text-amber-500 border-amber-500/20">{reader.verification_status || 'PENDING'}</Badge>
                        </div>
                        <div className="space-y-3 text-sm pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">CPF</span>
                                <span className="font-mono">{reader.tax_id || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Nascimento</span>
                                <span>{reader.birth_date ? new Date(reader.birth_date).toLocaleDateString('pt-BR') : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Celular</span>
                                <span>{reader.cellphone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Endereço</h3>
                        <div className="text-sm space-y-1 text-muted-foreground">
                            <p>{reader.address_street}, {reader.address_number}</p>
                            <p>{reader.address_neighborhood} - {reader.address_city}/{reader.address_state}</p>
                            <p>CEP: {reader.address_zip_code}</p>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Dados de Pagamento (Pix)</h3>
                        <div className="text-sm space-y-1 text-muted-foreground">
                            <p>Tipo de Chave: {reader.pix_key_type || 'Não informado'}</p>
                            <p>Chave Pix: {reader.pix_key || 'Não informada'}</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="border rounded-xl p-6 bg-card">
                        <h3 className="font-semibold flex items-center gap-2 mb-4"><Shield className="w-4 h-4" /> Documentos de Identificação</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Frente do Documento', url: reader.document_front_url },
                                { label: 'Verso do Documento', url: reader.document_back_url },
                            ].map(({ label, url }) => (
                                <div key={label} className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
                                    <div className="aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative group">
                                        {url ? (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                <img src={url} alt={label} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Clique para ampliar</div>
                                            </a>
                                        ) : (
                                            <div className="text-muted-foreground text-xs">Não enviado</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="space-y-2 sm:col-span-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Selfie com Documento</span>
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative group max-w-sm mx-auto">
                                    {reader.selfie_url ? (
                                        <a href={reader.selfie_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            <img src={reader.selfie_url} alt="Selfie" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Clique para ampliar</div>
                                        </a>
                                    ) : (
                                        <div className="text-muted-foreground text-xs">Não enviado</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card">
                        <h3 className="font-semibold flex items-center gap-2 mb-4"><FileText className="w-4 h-4" /> Compliance e Perfil</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <span className="text-sm">Aceite dos Termos de Uso e Ética</span>
                                {reader.ethics_accepted_at ? (
                                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Aceito em {new Date(reader.ethics_accepted_at).toLocaleDateString()}</Badge>
                                ) : (
                                    <Badge variant="destructive">Pendente</Badge>
                                )}
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Biografia</span>
                                <div className="p-3 bg-muted/30 rounded-lg text-sm text-foreground italic">"{reader.bio || 'Sem biografia'}"</div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Especialidades</span>
                                <div className="flex flex-wrap gap-2">
                                    {reader.specialties?.map((s: string) => (
                                        <Badge key={s} variant="secondary">{s}</Badge>
                                    )) || <span className="text-sm text-muted-foreground">Nenhuma selecionada</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
