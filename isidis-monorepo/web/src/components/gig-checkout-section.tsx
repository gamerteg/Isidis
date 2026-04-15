
import { useState } from 'react'
import {  useNavigate  } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Shield, Plus, Check, Repeat, CalendarDays } from 'lucide-react'
import { Gig, GigAddOn } from '@/types'
import { ClickTracker } from '@/components/click-tracker'

interface GigCheckoutSectionProps {
    gig: Gig
    readerId: string
}

export function GigCheckoutSection({ gig, readerId }: GigCheckoutSectionProps) {
    const navigate = useNavigate()
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

    const toggleAddOn = (addonId: string) => {
        setSelectedAddOns(prev =>
            prev.includes(addonId)
                ? prev.filter(id => id !== addonId)
                : [...prev, addonId]
        )
    }

    const basePrice = gig.price / 100
    const addOnsPrice = (gig.add_ons || [])
        .filter(addon => selectedAddOns.includes(addon.id))
        .reduce((acc, addon) => acc + addon.price, 0)

    const totalPrice = basePrice + addOnsPrice
    const isRecurring = gig.pricing_type === 'RECURRING'

    const frequencyLabel = gig.readings_per_month === 4 ? 'Semanal'
        : gig.readings_per_month === 2 ? 'Quinzenal'
            : 'Mensal'

    const handleCheckout = () => {
        const params = new URLSearchParams()
        if (selectedAddOns.length > 0) {
            params.set('addons', selectedAddOns.join(','))
        }
        navigate(`/checkout/${gig.id}?${params.toString()}`)
    }

    return (
        <div className="sticky top-24 space-y-6">
            <div className="bg-[#12121a] rounded-3xl p-6 border border-white/10 shadow-xl">
                {/* Recurring badge */}
                {isRecurring && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Repeat className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-bold text-purple-300">Assinatura {frequencyLabel}</span>
                        <span className="ml-auto text-xs text-purple-400/70">{gig.readings_per_month} tiragem{(gig.readings_per_month || 1) > 1 ? 's' : ''}/mês</span>
                    </div>
                )}

                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-sm text-slate-400 mb-1">
                            {isRecurring ? 'Investimento mensal' : 'Valor do investimento'}
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">R$ {totalPrice.toFixed(2)}</span>
                            {isRecurring && (
                                <span className="text-lg text-slate-500">/mês</span>
                            )}
                            {addOnsPrice > 0 && (
                                <span className="text-sm text-indigo-400 ml-2 font-medium">
                                    (+ R$ {addOnsPrice.toFixed(2)})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Add-ons Section */}
                {gig.add_ons && gig.add_ons.length > 0 && (
                    <div className="mb-8 space-y-3">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Extras Disponíveis</h4>
                        {gig.add_ons.map((addon: GigAddOn) => (
                            <button
                                key={addon.id}
                                onClick={() => toggleAddOn(addon.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 group relative overflow-hidden ${selectedAddOns.includes(addon.id)
                                    ? 'bg-indigo-900/20 border-indigo-500/50'
                                    : 'bg-[#0a0a0f] border-white/5 hover:border-white/10'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${selectedAddOns.includes(addon.id)
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'border-slate-600 group-hover:border-slate-400'
                                    }`}>
                                    {selectedAddOns.includes(addon.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-medium text-sm ${selectedAddOns.includes(addon.id) ? 'text-white' : 'text-slate-300'}`}>
                                            {addon.title}
                                        </span>
                                        <span className="text-emerald-400 font-bold text-sm">
                                            + R$ {addon.price.toFixed(2)}
                                        </span>
                                    </div>
                                    {addon.description && (
                                        <p className="text-xs text-slate-500 leading-relaxed">{addon.description}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Garantia de satisfação</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Pagamento seguro via PIX</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <span>Atendimento confidencial</span>
                    </div>
                    {isRecurring && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CalendarDays className="w-5 h-5 text-purple-400 shrink-0" />
                            <span>Tiragens periódicas automatizadas</span>
                        </div>
                    )}
                </div>

                <ClickTracker gigId={gig.id} readerId={readerId} eventType="click_buy">
                    <Button
                        onClick={handleCheckout}
                        className={`w-full text-white text-lg font-bold h-14 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isRecurring
                            ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                            }`}
                    >
                        {isRecurring ? 'Assinar Agora' : 'Agendar Agora'}
                    </Button>
                </ClickTracker>

                <p className="text-xs text-center text-slate-500 mt-4">
                    {isRecurring
                        ? 'Ao assinar, você concorda com o pagamento mensal via PIX.'
                        : 'Ao continuar, você concorda com nossos termos de serviço.'
                    }
                </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-3xl p-6 border border-white/5 text-center backdrop-blur-sm">
                <Shield className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h4 className="text-md font-bold text-white mb-2">Compra Segura</h4>
                <p className="text-xs text-slate-400">
                    Isidis garante a segurança da sua transação e a qualidade do atendimento.
                </p>
            </div>
        </div>
    )
}

