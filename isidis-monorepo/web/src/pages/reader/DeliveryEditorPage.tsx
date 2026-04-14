import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Send, Upload, X, Mic, Image } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type DeliveryMethod = 'DIGITAL_SPREAD' | 'PHYSICAL'

interface CardEntry {
  localId: string
  id: string
  name: string
  position: 'upright' | 'reversed'
  interpretation: string
  audioFile?: File
  audioUrl?: string
  audioFileName?: string
  uploadingAudio: boolean
  order: number
}

interface SectionEntry {
  localId: string
  type: 'text' | 'audio' | 'photo'
  content: string
  url?: string
  fileName?: string
  file?: File
  uploading: boolean
  order: number
}

const POPULAR_CARDS = [
  'O Louco', 'O Mago', 'A Sacerdotisa', 'A Imperatriz', 'O Imperador',
  'O Papa', 'Os Enamorados', 'O Carro', 'A Força', 'O Eremita',
  'A Roda da Fortuna', 'A Justiça', 'O Enforcado', 'A Morte', 'A Temperança',
  'O Diabo', 'A Torre', 'A Estrela', 'A Lua', 'O Sol', 'O Julgamento', 'O Mundo',
]

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function DeliveryEditorPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const [method, setMethod] = useState<DeliveryMethod>('DIGITAL_SPREAD')
  const [summary, setSummary] = useState('')
  const [cards, setCards] = useState<CardEntry[]>([])
  const [sections, setSections] = useState<SectionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [customCard, setCustomCard] = useState('')

  const audioInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cardAudioRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ─── Upload helper ─────────────────────────────────────────────────────────

  const uploadToApi = async (file: File, type: 'audio' | 'photo') => {
    const res = await api.upload<{ data: { url: string; file_name: string } }>(
      `/orders/${orderId}/delivery/upload`,
      file,
      type,
    )
    return res.data
  }

  // ─── Cards (DIGITAL_SPREAD) ────────────────────────────────────────────────

  const addCard = (name: string) => {
    setCards(prev => [
      ...prev,
      { localId: uid(), id: uid(), name, position: 'upright', interpretation: '', uploadingAudio: false, order: prev.length },
    ])
    setShowCardPicker(false)
    setCustomCard('')
  }

  const removeCard = (localId: string) =>
    setCards(prev => prev.filter(c => c.localId !== localId))

  const updateCard = (localId: string, patch: Partial<CardEntry>) =>
    setCards(prev => prev.map(c => c.localId === localId ? { ...c, ...patch } : c))

  const handleCardAudio = async (localId: string, file: File) => {
    updateCard(localId, { uploadingAudio: true, audioFile: file })
    try {
      const { url, file_name } = await uploadToApi(file, 'audio')
      updateCard(localId, { audioUrl: url, audioFileName: file_name, uploadingAudio: false })
      toast.success('Áudio enviado!')
    } catch {
      updateCard(localId, { uploadingAudio: false })
      toast.error('Erro ao enviar áudio da carta')
    }
  }

  // ─── Sections (PHYSICAL) ───────────────────────────────────────────────────

  const addTextSection = () =>
    setSections(prev => [
      ...prev,
      { localId: uid(), type: 'text', content: '', uploading: false, order: prev.length },
    ])

  const handlePhotoSection = async (file: File) => {
    const localId = uid()
    setSections(prev => [
      ...prev,
      { localId, type: 'photo', content: '', file, uploading: true, order: prev.length },
    ])
    try {
      const { url, file_name } = await uploadToApi(file, 'photo')
      setSections(prev => prev.map(s =>
        s.localId === localId ? { ...s, url, fileName: file_name, uploading: false } : s,
      ))
    } catch {
      setSections(prev => prev.filter(s => s.localId !== localId))
      toast.error('Erro ao enviar foto')
    }
  }

  const handleAudioSection = async (file: File) => {
    const localId = uid()
    setSections(prev => [
      ...prev,
      { localId, type: 'audio', content: '', file, uploading: true, order: prev.length },
    ])
    try {
      const { url, file_name } = await uploadToApi(file, 'audio')
      setSections(prev => prev.map(s =>
        s.localId === localId ? { ...s, url, fileName: file_name, uploading: false } : s,
      ))
      toast.success('Áudio enviado!')
    } catch {
      setSections(prev => prev.filter(s => s.localId !== localId))
      toast.error('Erro ao enviar áudio')
    }
  }

  const removeSection = (localId: string) =>
    setSections(prev => prev.filter(s => s.localId !== localId))

  const updateSection = (localId: string, content: string) =>
    setSections(prev => prev.map(s => s.localId === localId ? { ...s, content } : s))

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (method === 'DIGITAL_SPREAD' && cards.length === 0) {
      toast.error('Adicione pelo menos uma carta')
      return
    }
    if (method === 'PHYSICAL' && sections.length === 0 && !summary.trim()) {
      toast.error('Adicione pelo menos uma seção ou escreva uma mensagem')
      return
    }
    if (sections.some(s => s.uploading) || cards.some(c => c.uploadingAudio)) {
      toast.error('Aguarde os uploads terminarem')
      return
    }

    setLoading(true)
    try {
      const payload = {
        method,
        summary: summary.trim() || undefined,
        cards: method === 'DIGITAL_SPREAD'
          ? cards.map(({ id, name, position, interpretation, audioUrl, audioFileName, order }) => ({
              id,
              name,
              position,
              interpretation: interpretation.trim() || undefined,
              audio_url: audioUrl,
              audio_file_name: audioFileName,
              order,
            }))
          : [],
        sections: method === 'PHYSICAL'
          ? sections.map(({ type, content, url, fileName, order }) => ({
              type,
              content: content.trim() || undefined,
              url,
              file_name: fileName,
              order,
            }))
          : [],
      }

      await api.post(`/orders/${orderId}/delivery/submit`, payload)
      toast.success('Leitura entregue com sucesso! 🌟')
      navigate(`/leitora/pedidos/${orderId}`, { replace: true })
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar leitura')
    } finally {
      setLoading(false)
    }
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
        <h1 className="font-display text-xl font-bold">Entregar Leitura</h1>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Method selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">Tipo de entrega</label>
          <div className="grid grid-cols-2 gap-2">
            {(['DIGITAL_SPREAD', 'PHYSICAL'] as DeliveryMethod[]).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`p-3 rounded-2xl border text-sm font-medium transition-all ${
                  method === m
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {m === 'DIGITAL_SPREAD' ? '🔮 Tiragem Digital' : '📷 Tiragem Física'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary / general message */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground/80">Mensagem geral</label>
          <textarea
            className="flex min-h-28 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Escreva sua interpretação geral, mensagens espirituais, conselhos..."
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
        </div>

        {/* ── DIGITAL SPREAD ── */}
        {method === 'DIGITAL_SPREAD' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground/80">
                Cartas ({cards.length})
              </label>
              <button
                onClick={() => setShowCardPicker(p => !p)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus size={14} /> Adicionar carta
              </button>
            </div>

            {/* Card picker */}
            {showCardPicker && (
              <div className="p-3 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex gap-2">
                  <input
                    className="flex-1 h-9 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:border-primary"
                    placeholder="Nome da carta ou selecione abaixo..."
                    value={customCard}
                    onChange={e => setCustomCard(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && customCard.trim() && addCard(customCard.trim())}
                  />
                  <Button size="sm" onClick={() => customCard.trim() && addCard(customCard.trim())} disabled={!customCard.trim()}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {POPULAR_CARDS.map(card => (
                    <button
                      key={card}
                      onClick={() => addCard(card)}
                      className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 transition-colors"
                    >
                      {card}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card list */}
            {cards.map(card => (
              <Card key={card.localId}>
                <CardContent className="p-4 space-y-3">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{card.name}</p>
                    <button onClick={() => removeCard(card.localId)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Position */}
                  <div className="flex gap-2">
                    {(['upright', 'reversed'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => updateCard(card.localId, { position: pos })}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          card.position === pos
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {pos === 'upright' ? '⬆ Normal' : '⬇ Invertida'}
                      </button>
                    ))}
                  </div>

                  {/* Interpretation text */}
                  <textarea
                    className="w-full min-h-16 px-3 py-2 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                    placeholder="Interpretação desta carta (opcional)..."
                    value={card.interpretation}
                    onChange={e => updateCard(card.localId, { interpretation: e.target.value })}
                  />

                  {/* Audio for this card */}
                  <div>
                    {card.audioUrl ? (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20">
                        <Mic size={14} className="text-primary shrink-0" />
                        <audio src={card.audioUrl} controls className="flex-1 h-8" />
                        <button
                          onClick={() => updateCard(card.localId, { audioUrl: undefined, audioFileName: undefined, audioFile: undefined })}
                          className="text-muted-foreground hover:text-red-400 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : card.uploadingAudio ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                        <Spinner size="sm" /> Enviando áudio...
                      </div>
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        <Mic size={13} />
                        Adicionar áudio para esta carta
                        <input
                          ref={el => { cardAudioRefs.current[card.localId] = el }}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && handleCardAudio(card.localId, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── PHYSICAL ── */}
        {method === 'PHYSICAL' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground/80">Seções da leitura</label>

            {/* Add buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={addTextSection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus size={14} /> Texto
              </button>

              {/* Hidden audio input for sections */}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                <Mic size={14} /> Áudio
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleAudioSection(e.target.files[0])}
                />
              </label>

              {/* Hidden photo input for sections */}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                <Image size={14} /> Foto
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handlePhotoSection(e.target.files[0])}
                />
              </label>
            </div>

            {/* Section list */}
            {sections.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Adicione textos, áudios ou fotos para compor a leitura
              </p>
            )}

            {sections.map((sec, i) => (
              <div key={sec.localId} className="flex gap-2 items-start">
                <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden">
                  {/* Uploading state */}
                  {sec.uploading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Spinner size="sm" />
                      {sec.type === 'audio' ? 'Enviando áudio...' : 'Enviando foto...'}
                    </div>
                  )}

                  {/* Text section */}
                  {sec.type === 'text' && !sec.uploading && (
                    <textarea
                      className="w-full min-h-24 px-4 py-3 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none resize-none"
                      placeholder={`Seção ${i + 1} — escreva aqui...`}
                      value={sec.content}
                      onChange={e => updateSection(sec.localId, e.target.value)}
                    />
                  )}

                  {/* Audio section */}
                  {sec.type === 'audio' && !sec.uploading && sec.url && (
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Mic size={14} className="text-primary shrink-0" />
                        <audio src={sec.url} controls className="flex-1 h-8" />
                      </div>
                      <textarea
                        className="w-full min-h-10 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none resize-none border-t border-border pt-2"
                        placeholder="Legenda do áudio (opcional)..."
                        value={sec.content}
                        onChange={e => updateSection(sec.localId, e.target.value)}
                      />
                    </div>
                  )}

                  {/* Photo section */}
                  {sec.type === 'photo' && !sec.uploading && sec.url && (
                    <div>
                      <img src={sec.url} alt="" className="w-full max-h-56 object-cover" />
                      <textarea
                        className="w-full min-h-10 px-4 py-2 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none resize-none"
                        placeholder="Legenda da foto (opcional)..."
                        value={sec.content}
                        onChange={e => updateSection(sec.localId, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {!sec.uploading && (
                  <button
                    onClick={() => removeSection(sec.localId)}
                    className="mt-3 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          loading={loading}
          disabled={sections.some(s => s.uploading) || cards.some(c => c.uploadingAudio)}
          onClick={handleSubmit}
        >
          <Send size={16} />
          Enviar leitura ao cliente
        </Button>
      </div>
    </div>
  )
}
