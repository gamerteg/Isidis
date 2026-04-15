
import React from 'react'
import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function BetaBanner() {
    const [isVisible, setIsVisible] = React.useState(true)

    if (!isVisible) return null

    return (
        <div className="relative z-50 overflow-hidden bg-primary/10 border-b border-primary/20 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 flex items-center min-w-0">
                        <span className="flex p-2 rounded-lg bg-primary/20 mr-3">
                            <AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                        </span>
                        <p className="font-medium text-sm sm:text-base text-foreground/90 leading-tight">
                            <Badge variant="secondary" className="mr-2 bg-primary/20 text-primary border-primary/30 animate-pulse text-[10px] sm:text-xs">BETA</Badge>
                            <span className="hidden sm:inline">O Isidis está em fase de Beta Test. </span>
                            <span className="sm:hidden">Beta Test: </span>
                            <span className="text-foreground/70 hidden sm:inline">
                                Estamos trabalhando para aprimorar sua experiência. Erros podem aparecer. Se encontrar algo inesperado, por favor nos reporte.
                            </span>
                            <span className="text-foreground/70 sm:hidden">
                                Erros podem ocorrer.
                            </span>
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsVisible(false)}
                            className="flex p-2 rounded-md hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <span className="sr-only">Fechar</span>
                            <X className="h-5 w-5 text-primary" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Decorative gradient line at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
    )
}
