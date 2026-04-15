
import { useState } from 'react'
import { ReadingEditor } from './reading-editor'
import { PhysicalEditor } from './physical-editor'
import { Sparkles, Camera } from 'lucide-react'
import { GigRequirement } from '@/types'

interface EditorWrapperProps {
    order: {
        id: string
        status: string
        deliveryContent: any
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

export function EditorWrapper(props: EditorWrapperProps) {
    // Detect existing mode from saved content
    const deliveryContent = props.order.deliveryContent
    const existingMode =
        deliveryContent?.mode === 'physical'
            ? 'physical'
            : deliveryContent?.method === 'PHYSICAL'
                ? 'physical'
                : Array.isArray(deliveryContent?.cards)
                    ? 'digital'
                    : null

    const [mode, setMode] = useState<'digital' | 'physical' | null>(existingMode)

    // If already delivered, go straight to the right editor
    if (props.order.status === 'DELIVERED' && existingMode) {
        if (existingMode === 'physical') return <PhysicalEditor {...props} />
        return <ReadingEditor {...props} />
    }

    // If mode already selected, render the editor
    if (mode === 'digital') return <ReadingEditor {...props} />
    if (mode === 'physical') return <PhysicalEditor {...props} />

    // Mode selection screen
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1506] to-[#0f0f1a] flex items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-8 text-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Como deseja entregar?</h1>
                    <p className="text-amber-600">
                        Entrega para <strong className="text-amber-400">{props.clientName}</strong> — {props.gigTitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Digital */}
                    <button
                        onClick={() => setMode('digital')}
                        className="group p-8 rounded-2xl border-2 border-indigo-500/20 bg-indigo-950/20 hover:border-indigo-500/60 hover:bg-indigo-950/40 transition-all text-left space-y-4"
                    >
                        <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-7 h-7 text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Tiragem Digital</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Selecione cartas do baralho digital, posicione na mesa virtual e adicione interpretações por texto ou áudio.
                        </p>
                        <span className="inline-block text-xs text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full">
                            Cartas Rider-Waite
                        </span>
                    </button>

                    {/* Physical */}
                    <button
                        onClick={() => setMode('physical')}
                        className="group p-8 rounded-2xl border-2 border-amber-500/20 bg-amber-950/20 hover:border-amber-500/60 hover:bg-amber-950/40 transition-all text-left space-y-4"
                    >
                        <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera className="w-7 h-7 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Mesa Física</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Fotografe sua mesa real com as cartas, grave áudios da interpretação e escreva insights detalhados.
                        </p>
                        <span className="inline-block text-xs text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                            Múltiplas tiragens
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}
