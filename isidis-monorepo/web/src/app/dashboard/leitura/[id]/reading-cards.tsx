
import { useState, useRef } from 'react'
import { Play, Pause, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CardData {
    position_name: string
    card_image: string
    meaning: string
    audio_url?: string | null
    card_name?: string
}

export function ReadingCards({ cards }: { cards: CardData[] }) {
    const [revealed, setRevealed] = useState<boolean[]>(cards.map(() => false))
    const [playingIdx, setPlayingIdx] = useState<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const toggleCard = (index: number) => {
        const newRevealed = [...revealed]
        newRevealed[index] = true
        setRevealed(newRevealed)
    }

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

    // Imagem genérica para o verso das cartas
    const cardBackImage = "https://sacred-texts.com/tarot/pkt/img/pents01.jpg" // Using an external back image or pattern

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center mb-12">
            {cards.map((card, idx) => (
                <div key={idx} className="flex flex-col items-center group w-full max-w-sm" style={{ perspective: '1000px' }}>
                    <p className="text-sm uppercase tracking-widest text-slate-400 mb-4 font-bold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-400 border border-indigo-500/30">{idx + 1}</span>
                        {card.position_name}
                    </p>
                    <div
                        className="w-64 h-96 relative cursor-pointer"
                        onClick={() => toggleCard(idx)}
                        style={{
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Smooth pop effect
                            transform: revealed[idx] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                    >
                        {/* Front (Back of Card) */}
                        <div
                            className="absolute w-full h-full rounded-xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl bg-indigo-950"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-50 absolute inset-0 mix-blend-overlay"></div>
                            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 flex items-center justify-center">
                                <Sparkles className="w-12 h-12 text-indigo-400/50 animate-pulse" />
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white/80 text-sm font-bold uppercase tracking-widest border border-white/20 px-4 py-2 rounded-full backdrop-blur-sm">Revelar</span>
                            </div>
                        </div>

                        {/* Back (Face of Card) */}
                        <div
                            className="absolute w-full h-full rounded-xl overflow-hidden border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] bg-black"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={card.card_image} className="w-full h-full object-cover" alt={card.position_name} />
                        </div>
                    </div>

                    <div className={`mt-6 text-center transition-all duration-700 w-full space-y-4 ${revealed[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                        {card.card_name && (
                            <h3 className="text-lg font-bold text-white mb-2">{card.card_name}</h3>
                        )}

                        <div className="bg-slate-900/50 border border-indigo-500/20 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
                            {/* Audio Player */}
                            {card.audio_url ? (
                                <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shrink-0 transition-all hover:scale-105"
                                        onClick={() => toggleCard(idx)} // Just to prevent double click issues if needed, actually calling audio logic
                                    >
                                        <div onClick={(e) => {
                                            e.stopPropagation()
                                            togglePlay(idx, card.audio_url!)
                                        }}>
                                            {playingIdx === idx ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                                        </div>
                                    </Button>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">Ouvir Interpretação</p>
                                        <div className="h-1 bg-indigo-900/50 rounded-full overflow-hidden w-full">
                                            {playingIdx === idx && (
                                                <div className="h-full bg-indigo-500 animate-progress origin-left w-full"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-3 text-xs text-slate-500 italic">Sem áudio disponível</div>
                            )}

                            <p className="text-sm text-slate-300 leading-relaxed text-justify relative z-10">
                                {card.meaning}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
