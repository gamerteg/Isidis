import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Clock, Camera, Mic, CheckCircle2, Star, Shield,
    ArrowLeft, MessageCircle, Share2, Heart, ArrowRight
} from 'lucide-react'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { ClickTracker } from '@/components/click-tracker'
import { GigCheckoutSection } from '@/components/gig-checkout-section'
import { useAuth } from '@/hooks/useAuth'

export default function TopicosPage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const [gig, setGig] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        const supabase = createClient()

        supabase.from('gigs').select('*').eq('id', id).eq('is_active', true).single()
            .then(({ data: gigData, error: gigError }) => {
                if (gigError || !gigData) { setLoading(false); return }
                setGig(gigData)
                return supabase.from('profiles').select('id, full_name, avatar_url, bio, rating_average, reviews_count').eq('id', gigData.owner_id).single()
            })
            .then((result) => {
                if (result) {
                    const { data: profileData } = result
                    setProfile(profileData)
                }
                setLoading(false)
            })
    }, [id])

    if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando serviço...</p></div>
    if (!gig || !profile) return null

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans pb-20">
            <AnalyticsTracker
                gigId={gig.id}
                readerId={gig.owner_id}
                eventType="view"
                trigger="mount"
            />

            <div className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to={`/cartomante/${profile.id}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Voltar para o perfil</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <Share2 className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-pink-500">
                            <Heart className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-8">
                        {gig.image_url && (
                            <div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                <img
                                    src={gig.image_url}
                                    alt={gig.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-60" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none mb-4">
                                        {gig.category || 'Geral'}
                                    </Badge>
                                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 shadow-sm">
                                        {gig.title}
                                    </h1>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#12121a] rounded-3xl p-8 border border-white/5 space-y-6">
                            <h2 className="text-2xl font-bold text-white">Sobre este serviço</h2>
                            <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line">
                                {gig.description}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3 text-slate-300">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Tempo de Entrega</p>
                                        <p className="font-medium text-white">{gig.delivery_time_hours} horas</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-300">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        {gig.delivery_method === 'PHYSICAL_PHOTO' ? <Camera className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Formato</p>
                                        <p className="font-medium text-white">
                                            {gig.delivery_method === 'PHYSICAL_PHOTO' ? 'Foto da Tiragem' : 'Áudio Gravado'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Link to={`/cartomante/${profile.id}`} className="block bg-[#12121a] rounded-3xl p-8 border border-white/5 hover:border-indigo-500/50 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 overflow-hidden relative shrink-0">
                                    <img
                                        src={profile.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                        alt={profile.full_name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                        {profile.full_name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                        <span className="text-white font-medium">{profile.rating_average || '5.0'}</span>
                                        <span>({profile.reviews_count || 0} avaliações)</span>
                                    </div>
                                    <p className="text-slate-400 line-clamp-2">{profile.bio}</p>
                                </div>
                                <div className="ml-auto hidden sm:block">
                                    <ArrowRight className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        </Link>
                    </div>

                    <div className="lg:col-span-1">
                        <GigCheckoutSection gig={gig} readerId={profile.id} />
                    </div>
                </div>
            </main>
        </div>
    )
}
