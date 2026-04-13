import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Shield, MapPin, CreditCard, FileText, User } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getReaderDetail, getSignedDocUrl, approveReader, rejectReader, type ReaderDetail } from '@/services/approvals'
import { formatDate, pixKeyTypeLabel } from '@/lib/utils'

export function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reader, setReader] = useState<ReaderDetail | null>(null)
  const [docs, setDocs] = useState<{ front: string | null; back: string | null; selfie: string | null }>({ front: null, back: null, selfie: null })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!id) return
    getReaderDetail(id).then(async r => {
      setReader(r)
      if (r) {
        const [front, back, selfie] = await Promise.all([
          r.document_front_url ? getSignedDocUrl(r.document_front_url) : null,
          r.document_back_url ? getSignedDocUrl(r.document_back_url) : null,
          r.selfie_url ? getSignedDocUrl(r.selfie_url) : null,
        ])
        setDocs({ front, back, selfie })
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleApprove = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await approveReader(id)
      toast.success('Cartomante aprovada com sucesso!')
      navigate('/approvals')
    } catch {
      toast.error('Erro ao aprovar.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!id) return
    setProcessing(true)
    try {
      await rejectReader(id)
      toast.success('Cadastro rejeitado.')
      navigate('/approvals')
    } catch {
      toast.error('Erro ao rejeitar.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Carregando…</div>
  if (!reader) return <div className="p-8 text-muted-foreground">Cadastro não encontrado.</div>

  const DocImage = ({ url, label }: { url: string | null; label: string }) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="aspect-video rounded-xl bg-muted/50 border border-border overflow-hidden flex items-center justify-center relative group">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <img src={url} alt={label} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
              Clique para ampliar
            </div>
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">Não enviado</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/approvals"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Análise de Cadastro</h1>
            <p className="text-sm text-muted-foreground">{reader.full_name} • {reader.id.slice(0, 8)}…</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={handleReject} disabled={processing}>
            <XCircle className="w-4 h-4" />
            Rejeitar
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={processing}>
            <CheckCircle2 className="w-4 h-4" />
            Aprovar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: profile overview */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-4 border-border mb-3">
                  {reader.avatar_url ? (
                    <img src={reader.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <h2 className="font-bold text-lg">{reader.social_name || reader.full_name}</h2>
                <p className="text-sm text-muted-foreground">{reader.email}</p>
                <Badge variant="warning" className="mt-2">PENDING</Badge>
              </div>
              <div className="border-t border-border/50 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF</span>
                  <span className="font-mono">{reader.tax_id ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nascimento</span>
                  <span>{reader.birth_date ? formatDate(reader.birth_date) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Celular</span>
                  <span>{reader.cellphone ?? '—'}</span>
                </div>
                {reader.experience_years && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experiência</span>
                    <span>{reader.experience_years} anos</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" />Endereço</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>{reader.address_street ?? '—'}, {reader.address_number ?? ''}</p>
              <p>{reader.address_neighborhood ?? ''} — {reader.address_city ?? ''}/{reader.address_state ?? ''}</p>
              <p>CEP: {reader.address_zip_code ?? '—'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Chave PIX</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-muted-foreground">Tipo: <span className="text-foreground">{reader.pix_key_type ? pixKeyTypeLabel(reader.pix_key_type) : '—'}</span></p>
              <p className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-lg">{reader.pix_key ?? '—'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: docs + compliance */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Documentos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <DocImage url={docs.front} label="Frente do Documento" />
              <DocImage url={docs.back} label="Verso do Documento" />
              <div className="col-span-2 max-w-sm mx-auto w-full">
                <DocImage url={docs.selfie} label="Selfie com Documento" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Compliance & Perfil</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm">Aceite dos Termos de Uso e Ética</span>
                {reader.ethics_accepted_at ? (
                  <Badge variant="success">Aceito em {formatDate(reader.ethics_accepted_at)}</Badge>
                ) : (
                  <Badge variant="destructive">Pendente</Badge>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Biografia</p>
                <div className="p-3 bg-muted/30 rounded-xl text-sm italic">
                  "{reader.bio ?? 'Sem biografia'}"
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {reader.specialties?.length ? (
                    reader.specialties.map(s => <Badge key={s} variant="secondary">{s}</Badge>)
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhuma</span>
                  )}
                </div>
              </div>
              {reader.instagram_handle && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Instagram:</span>
                  <a
                    href={`https://instagram.com/${reader.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:underline"
                  >
                    @{reader.instagram_handle.replace('@', '')}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
