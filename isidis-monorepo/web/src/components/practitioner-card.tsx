
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, ArrowRight, User } from 'lucide-react'
import { usePresence } from '@/components/providers/presence-provider'
import { AnalyticsTracker } from './analytics-tracker'
import { ClickTracker } from './click-tracker'

export interface PractitionerProps {
    id: string
    name: string
    title: string
    rating: number
    reviews: number
    price: number  // in BRL (not cents)
    image: string | null
    tags: string[]
    gigId?: string // The ID of the primary gig shown
}

export function PractitionerCard({ practitioner }: { practitioner: PractitionerProps }) {
    const { onlineUsers } = usePresence()
    const isOnline = onlineUsers.has(practitioner.id)

    return (
        <Card className="overflow-hidden border-border/50 hover-glow group h-full flex flex-col relative rounded-2xl bg-card/80">
            {practitioner.gigId && (
                <AnalyticsTracker
                    gigId={practitioner.gigId}
                    readerId={practitioner.id}
                    eventType="impression"
                />
            )}
            <Link to={`/cartomante/${practitioner.id}`} className="absolute inset-0 z-10">
                <span className="sr-only">Ver perfil de {practitioner.name}</span>
            </Link>

            {/* Image */}
            <div className="h-72 relative overflow-hidden bg-muted">
                {practitioner.image ? (
                    <img
                        src={practitioner.image}
                        alt={practitioner.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <User className="w-20 h-20 text-primary/30" />
                    </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />

                {/* Rating badge */}
                <div className="absolute top-4 right-4 glass px-3 py-1.5 rounded-full flex items-center gap-1.5 z-20">
                    {practitioner.reviews === 0 ? (
                        <Badge variant="default" className="text-[10px] font-bold px-2 py-0.5 h-5">Nova</Badge>
                    ) : (
                        <>
                            <Star className="text-accent w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold">{practitioner.rating} </span>
                            <span className="text-[10px] text-muted-foreground ml-0.5">({practitioner.reviews})</span>
                        </>
                    )}
                </div>

                {/* Online indicator */}
                {isOnline && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 drop-shadow-lg">Online</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <CardContent className="p-5 flex flex-col flex-grow relative z-20 pointer-events-none">
                <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">{practitioner.name}</h3>

                <div className="flex flex-wrap gap-1.5 mb-4">
                    {practitioner.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1">
                            {tag}
                        </Badge>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                    <div>
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">A partir de</span>
                        <span className="text-xl font-extrabold text-gradient-primary">R$ {practitioner.price}</span>
                    </div>
                    {practitioner.gigId ? (
                        <ClickTracker gigId={practitioner.gigId} readerId={practitioner.id} eventType="click_buy">
                            <Button
                                size="sm"
                                className="font-bold pointer-events-auto rounded-xl gap-1.5 group/btn hover:gap-2.5 transition-all"
                                asChild
                            >
                                <Link to={`/cartomante/${practitioner.id}`}>
                                    Agendar
                                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                                </Link>
                            </Button>
                        </ClickTracker>
                    ) : (
                        <Button
                            size="sm"
                            className="font-bold pointer-events-auto rounded-xl gap-1.5 group/btn hover:gap-2.5 transition-all"
                            asChild
                        >
                            <Link to={`/cartomante/${practitioner.id}`}>
                                Agendar
                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
