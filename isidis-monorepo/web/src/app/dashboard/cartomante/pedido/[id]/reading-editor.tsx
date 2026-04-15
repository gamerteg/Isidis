
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search, Save, Sparkles, Trash2, Mic, Square, Play, Pause,
    Loader2, CheckCircle, ChevronDown, Plus, GripVertical, Smartphone
} from 'lucide-react'
import { MAJOR_ARCANA, SPREAD_POSITIONS, type TarotCard } from './card-data'
import { saveDraft, sendReading, type ReadingCard, type ReadingContent } from './actions'
import { uploadReadingBlob } from '@/lib/supabase/storage'
import {  useNavigate  } from 'react-router-dom'
import { GigRequirement } from '@/types'
import { ClipboardList, X } from 'lucide-react'

interface ReadingEditorProps {
    order: {
        id: string
        status: string
        deliveryContent: ReadingContent | null
        amountReaderNet: number
        createdAt: string
    }
    gigTitle: string
    gigRequirements?: GigRequirement[]
    clientName: string
    clientEmail: string
    readerName: string
    requirementsAnswers?: Record<string, string>
}

export function ReadingEditor({ order, gigTitle, gigRequirements = [], clientName, clientEmail, readerName, requirementsAnswers = {} }: ReadingEditorProps) {
    const navigate = useNavigate()
    const [cards, setCards] = useState<ReadingCard[]>(
        order.deliveryContent?.cards || []
    )
    const [spreadName, setSpreadName] = useState(
        order.deliveryContent?.spreadName || 'Leitura Personalizada'
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [showConfirmSend, setShowConfirmSend] = useState(false)
    const [showRequirements, setShowRequirements] = useState(false)
    const [recordingIdx, setRecordingIdx] = useState<number | null>(null)
    const [playingIdx, setPlayingIdx] = useState<number | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED'

    // Filter cards by search
    const filteredCards = MAJOR_ARCANA.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.numeral.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.keywords.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Add card to reading
    const addCard = useCallback((card: TarotCard) => {
        if (isDelivered) return
        const nextPosition = SPREAD_POSITIONS[cards.length] || `Posição ${cards.length + 1}`
        setCards(prev => [...prev, {
            cardId: card.id,
            name: `${card.numeral} - ${card.name}`,
            numeral: card.numeral,
            position: nextPosition,
            interpretation: '',
            audioBase64: null,
            image: card.image,
        }])
    }, [cards.length, isDelivered])

    // Remove card
    const removeCard = (idx: number) => {
        if (isDelivered) return
        setCards(prev => prev.filter((_, i) => i !== idx))
    }

    // Update card field
    const updateCard = (idx: number, field: keyof ReadingCard, value: string | null) => {
        setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
    }

    // Audio recording
    const startRecording = async (idx: number) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                const { url, error } = await uploadReadingBlob(
                    order.id,
                    `card-${idx + 1}`,
                    blob,
                    `card-audio-${Date.now()}.webm`
                )

                if (url) {
                    updateCard(idx, 'audioBase64', url)
                } else {
                    setFeedback({ type: 'error', msg: error || 'Nao foi possivel salvar o audio.' })
                }
                stream.getTracks().forEach(t => t.stop())
                setRecordingIdx(null)
            }

            mediaRecorder.start()
            mediaRecorderRef.current = mediaRecorder
            setRecordingIdx(idx)
        } catch {
            setFeedback({ type: 'error', msg: 'Não foi possível acessar o microfone.' })
        }
    }

    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
    }

    // Audio playback
    const togglePlay = (idx: number, audioSrc: string) => {
        if (playingIdx === idx) {
            audioRef.current?.pause()
            setPlayingIdx(null)
            return
        }
        if (audioRef.current) audioRef.current.pause()
        const audio = new Audio(audioSrc)
        audio.onended = () => setPlayingIdx(null)
        audio.play()
        audioRef.current = audio
        setPlayingIdx(idx)
    }

    // Save draft
    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        const result = await saveDraft(order.id, { spreadName, cards })
        setSaving(false)
        if (result.error) setFeedback({ type: 'error', msg: result.error })
        else setFeedback({ type: 'success', msg: 'Rascunho salvo!' })
        setTimeout(() => setFeedback(null), 3000)
    }

    // Send reading
    const handleSend = async () => {
        setShowConfirmSend(true)
    }

    const confirmSend = async () => {
        setShowConfirmSend(false)
        setSending(true)
        setFeedback(null)
        const result = await sendReading(order.id, { spreadName, cards })
        setSending(false)
        if (result.error) {
            setFeedback({ type: 'error', msg: result.error })
        } else {
            setFeedback({ type: 'success', msg: 'Leitura enviada com sucesso!' })
            setTimeout(() => navigate('/dashboard/cartomante'), 2000)
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full bg-background/95 backdrop-blur-3xl">
            {/* Top Bar */}
            <header className="h-14 border-b border-border/50 bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ChevronDown className="w-4 h-4 rotate-90" />
                    </Button>
                    <div>
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            {gigTitle}
                            <Badge variant="outline" className="text-[10px] font-normal">
                                {order.status === 'DELIVERED' ? 'Entregue' : 'Em andamento'}
                            </Badge>
                        </h2>
                        <p className="text-[10px] text-muted-foreground">Cliente: {clientName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {gigRequirements.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRequirements(true)}
                            className="bg-card/50 border-border/50 hover:bg-card hover:border-border gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ver Respostas</span>
                        </Button>
                    )}

                    {feedback && (
                        <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {feedback.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                            {feedback.msg}
                        </div>
                    )}

                    {!isDelivered && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || sending} className="gap-2">
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Salvar Rascunho
                            </Button>
                            <Button size="sm" onClick={handleSend} disabled={saving || sending || cards.length === 0} className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0">
                                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Enviar Leitura
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Inline Confirmation Panel */}
            {showConfirmSend && (
                <div className="border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 backdrop-blur-sm px-6 py-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in duration-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Confirmar Entrega</p>
                            <p className="text-xs text-purple-300/70">
                                A leitura será enviada para <strong className="text-purple-300">{clientName}</strong> e o pedido será marcado como entregue.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmSend(false)}
                            className="text-purple-300 hover:text-white hover:bg-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={confirmSend}
                            disabled={sending}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold gap-2 rounded-lg"
                        >
                            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Confirmar e Enviar
                        </Button>
                    </div>
                </div>
            )}

            {/* Requirements Modal */}
            {showRequirements && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-[#0a0a0f] border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-indigo-400" />
                                Respostas do Cliente
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowRequirements(false)}
                                className="w-8 h-8 rounded-full hover:bg-white/10"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            {gigRequirements.map((req, i) => (
                                <div key={req.id} className="space-y-2">
                                    <p className="text-sm font-medium text-slate-400">
                                        {i + 1}. {req.question}
                                    </p>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-slate-200 text-sm whitespace-pre-wrap">
                                        {requirementsAnswers[req.id] || <span className="text-slate-500 italic">Não respondido</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar — Card Library */}
                <div className="w-56 border-r border-border/50 bg-card/30 flex flex-col shrink-0">
                    <div className="p-3 border-b border-border/30">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar carta..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-xs bg-background/50"
                            />
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-3 mb-1">
                            Arcanos Maiores
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-2 gap-1.5">
                            {filteredCards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => addCard(card)}
                                    disabled={isDelivered}
                                    className="group relative aspect-[2/3] rounded-lg border border-border/40 bg-gradient-to-b from-purple-900/20 to-background hover:border-primary/50 hover:from-purple-800/30 transition-all flex flex-col items-center justify-center p-0 overflow-hidden disabled:opacity-50"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={card.image}
                                        alt={card.name}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.parentElement!.classList.add('p-1.5'); // restore padding for fallback
                                        }}
                                    />
                                    {/* Fallback content (hidden if image loads) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5 pointer-events-none" style={{ display: 'none' }}>
                                        <div className="w-full flex-1 rounded bg-gradient-to-b from-purple-500/10 to-purple-900/20 flex items-center justify-center mb-1">
                                            <span className="text-lg font-bold text-primary/60 group-hover:text-primary transition-colors">
                                                {card.numeral}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-muted-foreground group-hover:text-foreground text-center leading-tight transition-colors line-clamp-2">
                                            {card.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center — Spread Editor */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto">
                        {/* Spread Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <input
                                    value={spreadName}
                                    onChange={e => setSpreadName(e.target.value)}
                                    disabled={isDelivered}
                                    className="text-xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
                                    placeholder="Nome da Tiragem"
                                />
                                <p className="text-xs text-muted-foreground">{gigTitle} • Rider Waite Smith</p>
                            </div>
                        </div>

                        {/* Cards in spread */}
                        <div className="space-y-4">
                            {cards.map((card, idx) => (
                                <div key={idx} className="rounded-xl border-2 border-primary/20 bg-card/50 backdrop-blur-sm p-5 hover:border-primary/40 transition-colors group">
                                    <div className="flex gap-4">
                                        {/* Card visual */}
                                        <div className="w-28 shrink-0">
                                            <div className="aspect-[2/3] rounded-lg bg-gradient-to-b from-purple-500/20 to-purple-900/30 border border-primary/20 flex flex-col items-center justify-center relative overflow-hidden">
                                                {card.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={card.image}
                                                        alt={card.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="text-3xl font-bold text-primary/40">{card.numeral}</span>
                                                        <span className="text-[10px] text-muted-foreground mt-1 text-center px-1 leading-tight">
                                                            {card.name.split(' - ')[1] || card.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mt-2">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {idx + 1}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* ... (rest of card content unchanged) ... */}


                                        {/* Card content */}
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-lg">{card.name}</h3>
                                                    <input
                                                        value={card.position}
                                                        onChange={e => updateCard(idx, 'position', e.target.value)}
                                                        disabled={isDelivered}
                                                        className="text-xs font-bold uppercase tracking-widest text-primary bg-transparent border-none outline-none"
                                                        placeholder="POSIÇÃO"
                                                    />
                                                </div>
                                                {!isDelivered && (
                                                    <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                                                        onClick={() => removeCard(idx)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Audio section */}
                                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border border-border/30">
                                                {recordingIdx === idx ? (
                                                    <>
                                                        <Button size="icon" variant="destructive" className="w-8 h-8 rounded-full" onClick={stopRecording}>
                                                            <Square className="w-3 h-3" />
                                                        </Button>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="text-xs text-red-400 font-bold animate-pulse">GRAVANDO...</span>
                                                            <div className="flex-1 flex items-center gap-0.5">
                                                                {Array.from({ length: 20 }).map((_, i) => (
                                                                    <div key={i} className="w-1 bg-red-400/60 rounded-full animate-pulse"
                                                                        style={{ height: `${((i * 7 + 3) % 16) + 4}px`, animationDelay: `${i * 50}ms` }} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : card.audioBase64 ? (
                                                    <>
                                                        <Button size="icon" variant="outline" className="w-8 h-8 rounded-full border-primary/30"
                                                            onClick={() => togglePlay(idx, card.audioBase64!)}>
                                                            {playingIdx === idx ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                                        </Button>
                                                        <div className="flex-1 flex items-center gap-0.5">
                                                            {Array.from({ length: 30 }).map((_, i) => (
                                                                <div key={i} className="w-1 bg-primary/40 rounded-full"
                                                                    style={{ height: `${((i * 5 + 2) % 12) + 3}px` }} />
                                                            ))}
                                                        </div>
                                                        {!isDelivered && (
                                                            <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-red-400"
                                                                onClick={() => updateCard(idx, 'audioBase64', null)}>
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button size="icon" variant="outline" className="w-8 h-8 rounded-full border-primary/30"
                                                            onClick={() => startRecording(idx)} disabled={isDelivered}>
                                                            <Mic className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <span className="text-xs text-muted-foreground">Clique para gravar interpretação</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Text interpretation */}
                                            <textarea
                                                value={card.interpretation}
                                                onChange={e => updateCard(idx, 'interpretation', e.target.value)}
                                                disabled={isDelivered}
                                                placeholder="Escreva sua interpretação para esta carta..."
                                                className="w-full min-h-[80px] p-3 rounded-lg bg-background/60 border border-border/30 text-sm resize-y outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50 disabled:opacity-60"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add card drop zone */}
                        {!isDelivered && (
                            <div className="mt-6 border-2 border-dashed border-border/40 rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/30 transition-colors">
                                <Plus className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">Selecione uma carta na barra lateral para adicionar</p>
                            </div>
                        )}

                        {cards.length === 0 && (
                            <div className="text-center py-16">
                                <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                <h3 className="text-lg font-bold mb-1">Comece sua leitura</h3>
                                <p className="text-sm text-muted-foreground">Selecione cartas do baralho à esquerda para montar a tiragem.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar — Client Preview */}
                <div className="w-72 border-l border-border/50 bg-card/30 flex flex-col shrink-0">
                    <div className="p-3 border-b border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wider">Preview do Cliente</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-green-400">Ao vivo</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Mobile preview frame */}
                        <div className="bg-background rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
                            {/* Phone status bar */}
                            <div className="h-6 bg-card flex items-center justify-between px-4">
                                <span className="text-[9px] text-muted-foreground">9:41</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/30" />
                                    <div className="w-3 h-1.5 rounded-sm bg-muted-foreground/30" />
                                </div>
                            </div>

                            {/* Reading header */}
                            <div className="p-4 text-center border-b border-border/30">
                                <h4 className="text-sm font-bold">Sua Leitura</h4>
                                <p className="text-[10px] text-primary">por {readerName}</p>
                            </div>

                            {/* Cards preview */}
                            <div className="p-3 space-y-3">
                                {cards.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-[11px] text-muted-foreground">As cartas aparecerão aqui...</p>
                                    </div>
                                )}
                                {cards.map((card, idx) => (
                                    <div key={idx} className="rounded-lg border border-border/30 overflow-hidden">
                                        {/* Card image placeholder */}
                                        <div className="h-40 bg-gradient-to-b from-purple-500/10 to-purple-900/20 flex items-center justify-center relative overflow-hidden">
                                            {card.image ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={card.image}
                                                    alt={card.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <span className="text-xl font-bold text-primary/50">{card.numeral}</span>
                                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                                        {card.name.split(' - ')[1] || card.name}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                                                {card.position}
                                            </p>

                                            {/* Audio indicator */}
                                            {card.audioBase64 && (
                                                <div className="flex items-center gap-1.5 mb-1.5 p-1.5 rounded bg-primary/5">
                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <Play className="w-2 h-2 text-primary" />
                                                    </div>
                                                    <div className="flex-1 flex items-center gap-px">
                                                        {Array.from({ length: 15 }).map((_, i) => (
                                                            <div key={i} className="w-0.5 bg-primary/30 rounded-full"
                                                                style={{ height: `${Math.random() * 8 + 2}px` }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {card.interpretation ? (
                                                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                                                    {card.interpretation}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-muted-foreground/40 italic">
                                                    Aguardando interpretação...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Status Bar */}
            <div className="h-8 border-t border-border/50 bg-card/80 flex items-center justify-between px-4 text-[10px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Online</span>
                    </div>
                    <span>Microfone: Padrão do sistema</span>
                    <span>Deck: Rider Waite Smith (1909)</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Cartas: <span className="text-foreground font-bold">{cards.length}</span></span>
                    <span>Força da Leitura: <span className={`font-bold ${cards.length >= 3 ? 'text-green-400' : cards.length >= 1 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                        {cards.length >= 3 ? 'Alta' : cards.length >= 1 ? 'Média' : 'Nenhuma'}
                    </span></span>
                </div>
            </div>
        </div>
    )
}
