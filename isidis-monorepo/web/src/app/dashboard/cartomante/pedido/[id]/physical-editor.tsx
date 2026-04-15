
import { useState, useRef, useCallback } from 'react'
import {  useNavigate  } from 'react-router-dom'
import {
    Camera, Mic, MicOff, Upload, Play, Pause, Trash2, Plus,
    Save, Send, Loader2, CheckCircle, ChevronLeft, GripVertical,
    Image as ImageIcon, FileAudio, Type, Sparkles, ClipboardList, X
} from 'lucide-react'
import { GigRequirement } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { savePhysicalDraft, sendPhysicalReading } from './actions'
import type { SpreadSection, PhysicalReadingContent } from './actions'
import { uploadReadingFile, uploadReadingBlob } from '@/lib/supabase/storage'

interface PhysicalEditorProps {
    order: {
        id: string
        status: string
        deliveryContent: any
        amountReaderNet: number
        createdAt: string
    }
    gigTitle: string
    clientName: string
    clientEmail: string
    readerName: string
    gigRequirements?: GigRequirement[]
    requirementsAnswers?: Record<string, string>
}

function generateId() {
    return Math.random().toString(36).substring(2, 10)
}

function createEmptySection(index: number): SpreadSection {
    return {
        id: generateId(),
        title: `Tiragem ${index + 1}`,
        photoUrl: null,
        audioUrl: null,
        interpretation: '',
    }
}

export function PhysicalEditor({
    order,
    gigTitle,
    clientName,
    clientEmail,
    readerName,
    gigRequirements = [],
    requirementsAnswers = {}
}: PhysicalEditorProps) {
    const navigate = useNavigate()
    const isDelivered = order.status === 'DELIVERED' || order.status === 'COMPLETED'

    const existingContent = order.deliveryContent?.mode === 'physical'
        ? order.deliveryContent as PhysicalReadingContent
        : null

    const [readingTitle, setReadingTitle] = useState(existingContent?.readingTitle || '')
    const [sections, setSections] = useState<SpreadSection[]>(
        existingContent?.sections || [createEmptySection(0)]
    )

    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
    const [uploadingAudio, setUploadingAudio] = useState<string | null>(null)
    const [recordingSection, setRecordingSection] = useState<string | null>(null)
    const [playingSection, setPlayingSection] = useState<string | null>(null)
    const [showConfirmSend, setShowConfirmSend] = useState(false)
    const [showRequirements, setShowRequirements] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

    // ─── Helpers ──────────────────────────────────────────────────

    const updateSection = useCallback((id: string, updates: Partial<SpreadSection>) => {
        setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }, [])

    const removeSection = useCallback((id: string) => {
        setSections(prev => prev.filter(s => s.id !== id))
    }, [])

    const addSection = useCallback(() => {
        setSections(prev => [...prev, createEmptySection(prev.length)])
    }, [])

    const buildContent = useCallback((): PhysicalReadingContent => ({
        mode: 'physical',
        readingTitle: readingTitle || gigTitle,
        sections,
    }), [readingTitle, sections, gigTitle])

    // ─── Photo Upload ─────────────────────────────────────────────

    const handlePhotoUpload = async (sectionId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            setFeedback({ type: 'error', msg: 'Apenas imagens são aceitas.' })
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setFeedback({ type: 'error', msg: 'Imagem muito grande (máx. 10MB).' })
            return
        }

        setUploadingPhoto(sectionId)
        const { url, error } = await uploadReadingFile(order.id, sectionId, file)
        setUploadingPhoto(null)

        if (error || !url) {
            setFeedback({ type: 'error', msg: 'Erro ao enviar foto.' })
            return
        }

        updateSection(sectionId, { photoUrl: url })
        setFeedback({ type: 'success', msg: 'Foto enviada!' })
        setTimeout(() => setFeedback(null), 2000)
    }

    const handlePhotoDrop = (sectionId: string, e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handlePhotoUpload(sectionId, file)
    }

    // ─── Audio Recording ──────────────────────────────────────────

    const startRecording = async (sectionId: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

                setUploadingAudio(sectionId)
                const { url, error } = await uploadReadingBlob(
                    order.id, sectionId, blob, `audio_${Date.now()}.webm`
                )
                setUploadingAudio(null)

                if (url) {
                    updateSection(sectionId, { audioUrl: url })
                    setFeedback({ type: 'success', msg: 'Áudio salvo!' })
                    setTimeout(() => setFeedback(null), 2000)
                } else {
                    setFeedback({ type: 'error', msg: 'Erro ao salvar áudio.' })
                }
            }

            mediaRecorder.start()
            mediaRecorderRef.current = mediaRecorder
            setRecordingSection(sectionId)
        } catch {
            setFeedback({ type: 'error', msg: 'Não foi possível acessar o microfone.' })
        }
    }

    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
        setRecordingSection(null)
    }

    const handleAudioFileUpload = async (sectionId: string, file: File) => {
        if (!file.type.startsWith('audio/')) {
            setFeedback({ type: 'error', msg: 'Apenas arquivos de áudio são aceitos.' })
            return
        }
        if (file.size > 50 * 1024 * 1024) {
            setFeedback({ type: 'error', msg: 'Áudio muito grande (máx. 50MB).' })
            return
        }

        setUploadingAudio(sectionId)
        const { url, error } = await uploadReadingFile(order.id, sectionId, file)
        setUploadingAudio(null)

        if (url) {
            updateSection(sectionId, { audioUrl: url })
            setFeedback({ type: 'success', msg: 'Áudio enviado!' })
            setTimeout(() => setFeedback(null), 2000)
        } else {
            setFeedback({ type: 'error', msg: 'Erro ao enviar áudio.' })
        }
    }

    // ─── Playback ─────────────────────────────────────────────────

    const togglePlay = (sectionId: string, audioUrl: string) => {
        if (playingSection === sectionId) {
            audioRef.current?.pause()
            setPlayingSection(null)
            return
        }
        if (audioRef.current) audioRef.current.pause()
        const audio = new Audio(audioUrl)
        audio.onended = () => setPlayingSection(null)
        audio.play()
        audioRef.current = audio
        setPlayingSection(sectionId)
    }

    // ─── Save / Send ──────────────────────────────────────────────

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        const result = await savePhysicalDraft(order.id, buildContent())
        setSaving(false)
        if (result.error) setFeedback({ type: 'error', msg: result.error })
        else {
            setFeedback({ type: 'success', msg: 'Rascunho salvo!' })
            setTimeout(() => setFeedback(null), 3000)
        }
    }

    const handleSend = async () => {
        setShowConfirmSend(true)
    }

    const confirmSend = async () => {
        setShowConfirmSend(false)
        setSending(true)
        setFeedback(null)
        const result = await sendPhysicalReading(order.id, buildContent())
        setSending(false)
        if (result.error) {
            setFeedback({ type: 'error', msg: result.error })
        } else {
            setFeedback({ type: 'success', msg: 'Leitura enviada com sucesso!' })
            setTimeout(() => navigate('/dashboard/cartomante'), 2000)
        }
    }

    // ─── Word Count ───────────────────────────────────────────────

    const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0

    // ─── Render ───────────────────────────────────────────────────

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 shrink-0">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <span className="font-bold text-accent hidden sm:inline">Isidis</span>
                    <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px]">
                        MESA FÍSICA
                    </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {gigRequirements.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowRequirements(true)}
                            className="text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <ClipboardList className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs">Ver Respostas</span>
                        </Button>
                    )}
                    {feedback && (
                        <div className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 ${feedback.type === 'success'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-destructive/10 text-destructive'
                            }`}>
                            <CheckCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">{feedback.msg}</span>
                        </div>
                    )}
                    {!isDelivered && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSave}
                                disabled={saving || sending}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                                <span className="hidden sm:inline">Salvar</span>
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={saving || sending || sections.length === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
                            >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                <span className="hidden sm:inline">Enviar</span>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Inline Confirmation Panel */}
            {showConfirmSend && (
                <div className="border-b border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 fade-in duration-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground">Confirmar Entrega</p>
                            <p className="text-xs text-muted-foreground">
                                A leitura será enviada para <strong className="text-foreground">{clientName}</strong> e o pedido será marcado como entregue.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmSend(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={confirmSend}
                            disabled={sending}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 rounded-lg"
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
                    <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-primary" />
                                Respostas do Cliente
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowRequirements(false)}
                                className="w-8 h-8 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            {gigRequirements.map((req, i) => (
                                <div key={req.id} className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">
                                        {i + 1}. {req.question}
                                    </p>
                                    <div className="p-3 bg-muted/30 rounded-lg border border-border text-foreground text-sm whitespace-pre-wrap">
                                        {requirementsAnswers[req.id] || <span className="text-muted-foreground italic">Não respondido</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                    {/* Order Info */}
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3" /> Pedidos
                        </button>
                        <h1 className="text-2xl font-bold text-foreground">
                            Entrega para {clientName}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">{gigTitle}</p>
                    </div>

                    {/* Reading Title */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                            Título da Leitura
                        </label>
                        <Input
                            value={readingTitle}
                            onChange={e => setReadingTitle(e.target.value)}
                            placeholder="Ex: Tiragem da Cruz Celta, Caminho do Autoconhecimento..."
                            className="h-12 text-lg"
                            disabled={isDelivered}
                        />
                    </div>

                    {/* ─── Sections ──────────────────────────────────── */}
                    {sections.map((section, idx) => (
                        <div
                            key={section.id}
                            className="rounded-2xl border border-border bg-card overflow-hidden"
                        >
                            {/* Section Header */}
                            <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                                <div className="flex items-center gap-3 min-w-0">
                                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                                    <span className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shrink-0">
                                        {idx + 1}
                                    </span>
                                    <Input
                                        value={section.title}
                                        onChange={e => updateSection(section.id, { title: e.target.value })}
                                        className="bg-transparent border-none text-base sm:text-lg font-bold p-0 h-auto focus-visible:ring-0 min-w-0"
                                        disabled={isDelivered}
                                    />
                                </div>
                                {!isDelivered && sections.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSection(section.id)}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="p-4 sm:p-6 space-y-6">
                                {/* ── Photo Upload ─────────────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-accent flex items-center gap-2 mb-3">
                                        <ImageIcon className="w-4 h-4" />
                                        Foto da Mesa
                                        <span className="text-[10px] font-normal text-muted-foreground ml-auto">JPG/PNG até 10MB</span>
                                    </h4>
                                    {section.photoUrl ? (
                                        <div className="relative group rounded-xl overflow-hidden border border-border">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={section.photoUrl}
                                                alt={section.title}
                                                className="w-full max-h-[400px] object-contain bg-black"
                                            />
                                            {!isDelivered && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => fileInputRefs.current[`photo-${section.id}`]?.click()}
                                                    >
                                                        Trocar Foto
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => updateSection(section.id, { photoUrl: null })}
                                                    >
                                                        Remover
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${uploadingPhoto === section.id
                                                ? 'border-accent bg-accent/5'
                                                : 'border-border hover:border-accent/60 hover:bg-accent/5'
                                                }`}
                                            onClick={() => !isDelivered && fileInputRefs.current[`photo-${section.id}`]?.click()}
                                            onDrop={e => !isDelivered && handlePhotoDrop(section.id, e)}
                                            onDragOver={e => e.preventDefault()}
                                        >
                                            {uploadingPhoto === section.id ? (
                                                <Loader2 className="w-10 h-10 mx-auto text-accent animate-spin mb-3" />
                                            ) : (
                                                <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                                            )}
                                            <p className="text-sm text-foreground font-bold">
                                                {uploadingPhoto === section.id ? 'Enviando...' : 'Arraste a foto ou clique para selecionar'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Foto real da sua mesa de trabalho
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        ref={el => { fileInputRefs.current[`photo-${section.id}`] = el }}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (file) handlePhotoUpload(section.id, file)
                                            e.target.value = ''
                                        }}
                                    />
                                </div>

                                {/* ── Audio ─────────────────────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-accent flex items-center gap-2 mb-3">
                                        <FileAudio className="w-4 h-4" />
                                        Interpretação em Áudio
                                    </h4>

                                    {section.audioUrl ? (
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                                            <Button
                                                size="icon"
                                                onClick={() => togglePlay(section.id, section.audioUrl!)}
                                                className="w-12 h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                                            >
                                                {playingSection === section.id
                                                    ? <Pause className="w-5 h-5" />
                                                    : <Play className="w-5 h-5 pl-0.5" />
                                                }
                                            </Button>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground">Áudio gravado</p>
                                                <p className="text-xs text-muted-foreground">Clique para ouvir</p>
                                            </div>
                                            {!isDelivered && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateSection(section.id, { audioUrl: null })}
                                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Upload button */}
                                            <div
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${uploadingAudio === section.id
                                                    ? 'border-accent bg-accent/10'
                                                    : 'border-border bg-muted/20 hover:border-accent/50 hover:bg-accent/5'
                                                    }`}
                                                onClick={() => !isDelivered && fileInputRefs.current[`audio-${section.id}`]?.click()}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                    {uploadingAudio === section.id
                                                        ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                                        : <Upload className="w-5 h-5 text-primary" />
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground">Enviar Gravação</p>
                                                    <p className="text-[10px] text-muted-foreground">MP3, WAV até 50MB</p>
                                                </div>
                                            </div>

                                            {/* Record button */}
                                            <div
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${recordingSection === section.id
                                                    ? 'border-destructive bg-destructive/10 animate-pulse'
                                                    : 'border-border bg-muted/20 hover:border-destructive/50 hover:bg-destructive/5'
                                                    }`}
                                                onClick={() => {
                                                    if (isDelivered) return
                                                    recordingSection === section.id
                                                        ? stopRecording()
                                                        : startRecording(section.id)
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${recordingSection === section.id ? 'bg-destructive' : 'bg-destructive/20'
                                                    }`}>
                                                    {recordingSection === section.id
                                                        ? <MicOff className="w-5 h-5 text-white" />
                                                        : <Mic className="w-5 h-5 text-destructive" />
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground">
                                                        {recordingSection === section.id ? 'Parar Gravação' : 'Gravar Agora'}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        {recordingSection === section.id
                                                            ? <><span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> Gravando...</>
                                                            : 'Captura ao vivo no navegador'
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <input
                                                ref={el => { fileInputRefs.current[`audio-${section.id}`] = el }}
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleAudioFileUpload(section.id, file)
                                                    e.target.value = ''
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ── Written Interpretation ────────── */}
                                <div>
                                    <h4 className="text-sm font-bold text-accent flex items-center gap-2 mb-3">
                                        <Type className="w-4 h-4" />
                                        Interpretação Escrita
                                    </h4>
                                    <div className="relative">
                                        <textarea
                                            value={section.interpretation}
                                            onChange={e => updateSection(section.id, { interpretation: e.target.value })}
                                            placeholder="Escreva sua interpretação intuitiva aqui. Mencione as cartas específicas da foto..."
                                            rows={8}
                                            disabled={isDelivered}
                                            className="w-full rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground p-4 text-sm leading-relaxed resize-y focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                            maxLength={14000}
                                        />
                                        <p className={`text-[10px] text-right mt-1 ${wordCount(section.interpretation) >= 1900 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            {wordCount(section.interpretation)} palavras / 2.000 máx
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Section Button */}
                    {!isDelivered && (
                        <button
                            onClick={addSection}
                            className="w-full py-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary flex items-center justify-center gap-2 transition-all hover:bg-primary/5"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm font-bold">Adicionar Tiragem</span>
                        </button>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-background/95 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                    {isDelivered ? (
                        <span className="flex items-center gap-1.5 text-green-500">
                            <CheckCircle className="w-3 h-3" /> Entregue
                        </span>
                    ) : (
                        <span>Cliente verá: Modo Mesa Física</span>
                    )}
                </div>
                <span>{sections.length} tiragem(ns)</span>
            </footer>
        </div>
    )
}
