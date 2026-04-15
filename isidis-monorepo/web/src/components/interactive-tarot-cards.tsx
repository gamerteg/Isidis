
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

const cards = [
    {
        id: 1,
        front: 'https://sacred-texts.com/tarot/pkt/img/ar01.jpg',
        title: 'O Mago',
    },
    {
        id: 2,
        front: 'https://sacred-texts.com/tarot/pkt/img/ar02.jpg',
        title: 'A Sacerdotisa',
    },
    {
        id: 3,
        front: 'https://sacred-texts.com/tarot/pkt/img/ar09.jpg',
        title: 'O Eremita',
    },
    {
        id: 4,
        front: 'https://sacred-texts.com/tarot/pkt/img/ar17.jpg',
        title: 'A Estrela',
    }
]

export function InteractiveTarotCards() {
    const [revealed, setRevealed] = useState<number[]>([])

    const toggleCard = (id: number) => {
        setRevealed(prev =>
            prev.includes(id) ? prev.filter(cardId => cardId !== id) : [...prev, id]
        )
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-12">
                {cards.slice(0, 2).map((card, i) => (
                    <div
                        key={card.id}
                        onClick={() => toggleCard(card.id)}
                        className={cn(
                            "aspect-[3/4] rounded-2xl cursor-pointer perspective-1000 group",
                            i === 0 ? "animate-float" : "animate-float-slow delay-700"
                        )}
                    >
                        <div className={cn(
                            "relative w-full h-full transition-transform duration-700 preserve-3d",
                            revealed.includes(card.id) ? "rotate-y-180" : ""
                        )}>
                            {/* Back */}
                            <div className="absolute inset-0 backface-hidden rounded-2xl glass-strong border-white/20 p-1 shadow-2xl bg-gradient-to-br from-primary/10 to-purple-900/40 flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                                    <Star className="w-6 h-6 text-primary/40" />
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Clique para Revelar</div>
                            </div>
                            {/* Front */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl glass-strong border-white/20 p-1 shadow-2xl overflow-hidden">
                                <img src={card.front} alt={card.title} className="w-full h-full object-cover rounded-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="space-y-4">
                {cards.slice(2, 4).map((card, i) => (
                    <div
                        key={card.id}
                        onClick={() => toggleCard(card.id)}
                        className={cn(
                            "aspect-[3/4] rounded-2xl cursor-pointer perspective-1000 group",
                            i === 0 ? "animate-float delay-300" : "animate-float-slow delay-1000"
                        )}
                    >
                        <div className={cn(
                            "relative w-full h-full transition-transform duration-700 preserve-3d",
                            revealed.includes(card.id) ? "rotate-y-180" : ""
                        )}>
                            {/* Back */}
                            <div className="absolute inset-0 backface-hidden rounded-2xl glass-strong border-white/20 p-1 shadow-2xl bg-gradient-to-br from-primary/10 to-purple-900/40 flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                                    <Star className="w-6 h-6 text-primary/40" />
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Clique para Revelar</div>
                            </div>
                            {/* Front */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl glass-strong border-white/20 p-1 shadow-2xl overflow-hidden">
                                <img src={card.front} alt={card.title} className="w-full h-full object-cover rounded-xl" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
