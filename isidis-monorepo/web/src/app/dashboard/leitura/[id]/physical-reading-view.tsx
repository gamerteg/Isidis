
import { useState, useRef } from 'react'
import { Play, Pause, Download, ZoomIn, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintReadingButton } from '@/components/print-reading-button'

interface SectionData {
    id: string
    title: string
    photoUrl: string | null
    audioUrl: string | null
    interpretation: string
}

interface PhysicalReadingViewProps {
    readingTitle: string
    sections: SectionData[]
    readerName: string
    deliveredAt: string
}

export function PhysicalReadingView({
    readingTitle,
    sections,
    readerName,
    deliveredAt,
}: PhysicalReadingViewProps) {
    const [playingIdx, setPlayingIdx] = useState<number | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    const togglePlay = (idx: number, url: string) => {
        if (playingIdx === idx) {
            audioRef.current?.pause()
            setPlayingIdx(null)
            return
        }
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
        }
        const audio = new Audio(url)
        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
        audio.onended = () => { setPlayingIdx(null); setCurrentTime(0) }
        audio.play()
        audioRef.current = audio
        setPlayingIdx(idx)
    }

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
    }

    return (
        <>
            {/* Zoom Modal */}
            {zoomedPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
                    onClick={() => setZoomedPhoto(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={zoomedPhoto} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}

            <div className="min-h-screen bg-background text-foreground">
                {/* Hero */}
                <header className="relative px-4 sm:px-6 pt-12 pb-8 text-center max-w-4xl mx-auto">
                    <div className="absolute top-8 right-4 sm:right-8 no-print">
                        <PrintReadingButton />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        Leitura Física
                    </span>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 px-8">
                        {readingTitle || 'Sua Leitura'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Entregue em {new Date(deliveredAt).toLocaleDateString('pt-BR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })} por <strong className="text-foreground">{readerName}</strong>
                    </p>
                </header>

                {/* Content */}
                <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-12">
                    {sections.map((section, idx) => (
                        <div key={section.id} className="space-y-6">
                            {/* Section Photo */}
                            {section.photoUrl && (
                                <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={section.photoUrl}
                                        alt={section.title}
                                        className="w-full max-h-[500px] object-contain bg-black"
                                    />
                                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                                            onClick={() => setZoomedPhoto(section.photoUrl)}
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </Button>
                                        <a
                                            href={section.photoUrl}
                                            download
                                            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm flex items-center justify-center"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Section Audio */}
                            {section.audioUrl && (
                                <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border">
                                    <Button
                                        size="icon"
                                        onClick={() => togglePlay(idx, section.audioUrl!)}
                                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 shadow-lg"
                                    >
                                        {playingIdx === idx
                                            ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                                            : <Play className="w-5 h-5 sm:w-6 sm:h-6 pl-0.5" />
                                        }
                                    </Button>
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-foreground truncate">Interpretação em Áudio</p>
                                            {playingIdx === idx && (
                                                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                                    {formatTime(currentTime)} / {formatTime(duration)}
                                                </span>
                                            )}
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
                                            <div
                                                className="h-full bg-accent rounded-full transition-all"
                                                style={{
                                                    width: playingIdx === idx && duration > 0
                                                        ? `${(currentTime / duration) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section Title + Text */}
                            {(section.title || section.interpretation) && (
                                <div className="space-y-4">
                                    <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-3 border-b border-border pb-3">
                                        <span className="text-muted-foreground text-sm font-mono shrink-0">{String(idx + 1).padStart(2, '0')}.</span>
                                        {section.title.toUpperCase()}
                                    </h2>
                                    {section.interpretation && (
                                        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                            {section.interpretation}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section Divider */}
                            {idx < sections.length - 1 && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-16 h-px bg-border" />
                                    <Sparkles className="w-4 h-4 text-muted-foreground/40 mx-4" />
                                    <div className="w-16 h-px bg-border" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Reader Footer */}
                    <div className="pt-8 border-t border-border text-center">
                        <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-accent" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-foreground">{readerName}</p>
                                <p className="text-[10px] text-muted-foreground">Cartomante • Isidis</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    )
}
