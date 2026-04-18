import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Star } from 'lucide-react'

import { usePresence } from '@/components/providers/presence-provider'
import { listReaders } from '@/lib/readers'
import type { ReaderListItem } from '@/types'

export function OnlineReaders() {
    const { onlineUsers } = usePresence()
    const [onlineReaders, setOnlineReaders] = useState<ReaderListItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const ids = Array.from(onlineUsers)

        if (ids.length === 0) {
            setOnlineReaders([])
            setIsLoading(false)
            return
        }

        let cancelled = false
        setIsLoading(true)

        listReaders({ ids, limit: 4 })
            .then((response) => {
                if (cancelled) return
                setOnlineReaders(response.data)
            })
            .catch(() => {
                if (cancelled) return
                setOnlineReaders([])
            })
            .finally(() => {
                if (cancelled) return
                setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [onlineUsers])

    if (isLoading && onlineReaders.length === 0) {
        return (
            <div className="text-center py-8 border border-white/5 rounded-[1.5rem] bg-card-deep">
                <p className="text-sm text-slate-400">Carregando cartomantes online...</p>
            </div>
        )
    }

    if (onlineReaders.length === 0) {
        return (
            <div className="text-center py-8 border border-white/5 rounded-[1.5rem] bg-card-deep">
                <p className="text-sm text-slate-400">Nenhuma cartomante online no momento.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {onlineReaders.map((reader, i) => (
                <Link to={`/cartomante/${reader.id}`} key={reader.id} className="bg-card-item border border-white/5 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center text-center relative group hover:border-purple-500/30 transition-all">
                    <div className="relative mb-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-1 bg-gradient-to-tr from-purple-500 to-amber-500 relative">
                            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-card-item">
                                <img
                                    src={reader.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                                    alt={reader.full_name || 'Cartomante'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 md:w-5 md:h-5 bg-green-500 border-4 border-card-item rounded-full" />
                    </div>

                    <h3 className="text-base md:text-lg font-display text-white">{reader.full_name || 'Cartomante'}</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 mb-3">{reader.specialties?.[0] || 'Tarot & Videncia'}</p>

                    <div className="flex items-center gap-1 text-amber-400 text-[10px] md:text-xs font-bold mb-4">
                        <Star className="w-3 h-3 fill-current" /> {reader.rating_average || '5.0'} ({reader.reviews_count || 0})
                    </div>

                    <div className="text-[9px] md:text-[10px] font-bold text-green-400 bg-green-400/10 px-2 md:px-3 py-1 rounded-full mb-6 uppercase tracking-wider text-xs">
                        Atendimento Imediato
                    </div>

                    <div className="w-full rounded-full border border-white/10 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all font-bold text-xs h-9 md:h-11 flex items-center justify-center mt-auto">
                        Consultar
                    </div>
                </Link>
            ))}
        </div>
    )
}
