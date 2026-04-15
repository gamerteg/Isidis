
import React from 'react'

import { Link } from 'react-router-dom'
import { ArrowRight, Play, Star, Zap, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

interface MainHeroProps {
    badge?: React.ReactNode
    badgeIcon?: React.ReactNode
    title: React.ReactNode
    description: React.ReactNode
    withMockup?: boolean
    primaryButton?: {
        text: string
        href: string
    }
    secondaryButton?: {
        text: string
        href: string
    }
    stats?: {
        activeReaders: number
    }
    children?: React.ReactNode
    className?: string
    padding?: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "full"
}

export function MainHero({
    badge,
    badgeIcon,
    title,
    description,
    withMockup = true,
    primaryButton,
    secondaryButton,
    stats,
    children,
    className,
    padding = "xl",
    maxWidth = "7xl"
}: MainHeroProps) {
    return (
        <PageSection padding={padding} withOrbs withShootingStars className={cn("pt-28 pb-32 text-center md:text-left", className)}>
            <PageContainer maxWidth={maxWidth}>
                <div className={cn("grid grid-cols-1 gap-12 items-center", withMockup ? "lg:grid-cols-2" : "")}>
                    <div>
                        <PageHeader
                            align="left"
                            badge={badge}
                            badgeIcon={badgeIcon}
                            title={title}
                            description={description}
                            className="mb-8"
                            titleClassName="text-4xl md:text-6xl"
                        />

                        {(primaryButton || secondaryButton || children) && (
                            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                                {primaryButton && (
                                    <Button size="lg" className="h-14 px-8 text-base font-bold rounded-2xl animate-glow-pulse" asChild>
                                        <Link to={primaryButton.href}>{primaryButton.text}</Link>
                                    </Button>
                                )}
                                {secondaryButton && (
                                    <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-2xl glass hover:bg-white/5" asChild>
                                        <Link to={secondaryButton.href}>{secondaryButton.text}</Link>
                                    </Button>
                                )}
                                {children}
                            </div>
                        )}

                        {withMockup && (
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { icon: Shield, text: 'Privacidade Total', color: 'text-green-500' },
                                    { icon: Zap, text: 'Início Imediato', color: 'text-accent' },
                                    { icon: Star, text: 'Elite do Tarot', color: 'text-yellow-500' },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center md:items-start gap-2">
                                        <div className={cn("p-2 rounded-lg bg-white/5", item.color)}>
                                            <item.icon className="w-5 h-5 shadow-sm" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-tighter opacity-70">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {withMockup && (
                        <div className="relative group perspective-1000 hidden lg:block">
                            {/* Decorative background for the mockup */}
                            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                            <div className="relative animate-float rounded-3xl overflow-hidden glass-strong border-white/20 shadow-2xl shadow-primary/20">
                                <div className="bg-muted/30 p-4 border-b border-white/10 flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                    </div>
                                    <div className="text-[10px] font-mono opacity-40 uppercase tracking-widest text-white">Acesso Exclusivo: Sua Tiragem</div>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Status</div>
                                            <div className="text-sm font-bold text-white">Leitura Concluída</div>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 flex items-center gap-1.5">
                                            <Zap className="w-3 h-3" /> Disponível
                                        </div>
                                    </div>

                                    {/* Audio Simulation */}
                                    <div className="glass p-3 rounded-xl border-white/10 flex items-center gap-4 bg-white/5">
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                            <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                        </div>
                                        <div className="flex-grow space-y-1.5">
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full w-2/3 bg-primary" />
                                            </div>
                                            <div className="flex justify-between text-[8px] opacity-40 font-mono text-white">
                                                <span>01:42</span>
                                                <span>03:00</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Mockups */}
                                    <div className="flex gap-3 overflow-hidden">
                                        {[
                                            'https://sacred-texts.com/tarot/pkt/img/ar01.jpg',
                                            'https://sacred-texts.com/tarot/pkt/img/ar02.jpg',
                                            'https://sacred-texts.com/tarot/pkt/img/ar09.jpg'
                                        ].map((url, i) => (
                                            <div key={i} className="flex-shrink-0 w-20 aspect-[2/3] rounded-lg bg-muted/50 border border-white/10 flex items-center justify-center relative overflow-hidden group/card">
                                                <img src={url} alt="Tarot Card" className="w-full h-full object-cover opacity-60 group-hover/card:opacity-100 transition-opacity" />
                                                <Star className="w-4 h-4 text-white/40 relative z-10" />
                                            </div>
                                        ))}
                                        <div className="flex-shrink-0 w-20 aspect-[2/3] rounded-lg bg-muted/20 border border-dashed border-white/10 flex items-center justify-center">
                                            <div className="w-6 h-6 rounded-full border border-white/5 flex items-center justify-center">
                                                <ArrowRight className="w-3 h-3 opacity-20" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Float cards */}
                            <div className="absolute -top-6 -right-6 glass rounded-2xl p-4 shadow-xl border-white/20 animate-float-slow delay-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase opacity-60">Segurança</div>
                                        <div className="text-xs font-bold">Checkout PIX Seguro</div>
                                    </div>
                                </div>
                            </div>

                            {stats && (
                                <div className="absolute -bottom-10 -left-6 glass-strong rounded-2xl p-4 shadow-xl border-primary/20 animate-float delay-1000 overflow-hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border border-background bg-muted overflow-hidden">
                                                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" width={24} height={24} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-xs font-bold">+{stats.activeReaders} Especialistas</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PageContainer>
        </PageSection>
    )
}
