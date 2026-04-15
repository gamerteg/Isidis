import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Star, Clock, Lock, CheckCircle2, ArrowRight, User,
    Mic, Camera, FileText, Shield, MessageCircle, Sparkles, Heart,
    Instagram, Youtube, MapPin, Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { ChatWindow } from '@/components/chat/chat-window'
import { getYouTubeEmbedUrl } from '@/lib/utils'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { ClickTracker } from '@/components/click-tracker'
import { getContrastColor, adjustColor, hexToRgba } from '@/lib/color-utils'
import { useAuth } from '@/hooks/useAuth'

export default function CartomantePage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const [profile, setProfile] = useState<any>(null)
    const [gigs, setGigs] = useState<any[]>([])
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        const supabase = createClient()

        Promise.all([
            supabase.from('profiles').select('*').eq('id', id).eq('role', 'READER').single(),
            supabase.from('gigs').select('id, title, description, price, image_url, is_active, category, delivery_time_hours, delivery_method').eq('owner_id', id).eq('is_active', true).eq('status', 'APPROVED').order('price', { ascending: true }),
            supabase.from('reviews').select('id, rating, comment, created_at, client_id, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)').eq('reader_id', id).order('created_at', { ascending: false }).limit(10),
        ]).then(([{ data: profileData }, { data: gigsData }, { data: reviewsData }]) => {
            setProfile(profileData)
            setGigs(gigsData || [])
            setReviews(reviewsData || [])
            setLoading(false)
        })
    }, [id])

    if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando perfil...</p></div>
    if (!profile) return null

    if (gigs.length === 0 && user?.id !== id) return null

    const reviewsList = reviews
    const avgRating = reviewsList.length > 0
        ? (reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
        : '5.0'
    const totalReviews = reviewsList.length

    const profileColor = profile.profile_color || '#0a0a0f'
    const contrastColor = getContrastColor(profileColor)
    const mutedTextColor = contrastColor === '#ffffff' ? 'text-slate-300' : 'text-slate-700'
    const labelColor = contrastColor === '#ffffff' ? 'text-slate-400' : 'text-slate-600'
    const sectionBg = contrastColor === '#ffffff' ? 'bg-white/5' : 'bg-black/5'
    const cardBg = contrastColor === '#ffffff' ? 'bg-[#12121a]' : 'bg-white'
    const borderSemi = contrastColor === '#ffffff' ? 'border-white/10' : 'border-black/10'
    const borderSoft = contrastColor === '#ffffff' ? 'border-white/5' : 'border-black/5'

    const adaptiveCardStyle = {
        backgroundColor: contrastColor === '#ffffff'
            ? adjustColor(profileColor, 15)
            : adjustColor(profileColor, -10),
        borderColor: contrastColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
    }

    const adaptiveInnerCardStyle = {
        backgroundColor: contrastColor === '#ffffff'
            ? adjustColor(profileColor, 5)
            : adjustColor(profileColor, -5),
    }

    return (
        <div className={`min-h-screen font-sans relative ${contrastColor === '#ffffff' ? 'text-slate-200' : 'text-slate-900'}`} style={{ backgroundColor: profileColor }}>
            {gigs && gigs.length > 0 && (
                <AnalyticsTracker
                    gigId={gigs[0].id}
                    readerId={profile.id}
                    eventType="view"
                    trigger="mount"
                />
            )}
            {/* HERO BANNER */}
            <div className="relative w-full" style={{ minHeight: '420px' }}>
                <div className="absolute inset-0 overflow-hidden">
                    {profile.cover_url ? (
                        <img
                            src={profile.cover_url}
                            alt="Banner"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-[#0a0a0f] to-purple-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
                </div>

                <div className="relative z-10 container mx-auto px-6 pt-32 pb-16">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8">
                        <Sparkles className="w-3 h-3" />
                        <span>Perfil Profissional</span>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 overflow-hidden bg-slate-800 shadow-2xl">
                                <img
                                    src={profile.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-[#0a0a0f]" />
                        </div>

                        <div>
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-2 leading-tight">
                                {profile.full_name}
                            </h1>
                            <p className="text-lg md:text-xl font-medium text-white/70 max-w-2xl mb-4 leading-relaxed">
                                {profile.tagline || (profile.bio ? profile.bio.slice(0, 100) + '...' : 'Especialista em oráculos e orientação espiritual.')}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-4 py-2 rounded-2xl border border-amber-400/20">
                                    <Star className="w-4 h-4 fill-amber-400" />
                                    <span>{avgRating}</span>
                                    <span className="opacity-50 font-medium">({totalReviews})</span>
                                </div>
                                {profile.years_of_experience > 0 && (
                                    <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20">
                                        <Zap className="w-4 h-4" />
                                        <span>{profile.years_of_experience} Anos de Exp.</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-2xl border border-green-400/20">
                                    <MapPin className="w-4 h-4" />
                                    <span>Online</span>
                                </div>
                                {profile.instagram_handle && (
                                    <Link to={`https://instagram.com/${profile.instagram_handle}`} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-pink-500/20 hover:text-pink-500 transition-colors border border-white/10 text-white">
                                        <Instagram className="w-4 h-4" />
                                    </Link>
                                )}
                                {profile.youtube_url && (
                                    <Link to={profile.youtube_url} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors border border-white/10 text-white">
                                        <Youtube className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-12">

                        <section>
                            <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>
                                <User className="w-6 h-6 text-indigo-500" />
                                Sobre Mim
                            </h3>
                            <div className={`prose prose-lg max-w-none leading-relaxed whitespace-pre-line ${contrastColor === '#ffffff' ? 'prose-invert text-slate-300' : 'text-slate-800'}`}>
                                {profile.bio}
                            </div>
                        </section>

                        {profile.youtube_url && getYouTubeEmbedUrl(profile.youtube_url) && (
                            <>
                                <div className={`h-px ${borderSoft}`} />
                                <section>
                                    <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>
                                        <Youtube className="w-6 h-6 text-red-500" />
                                        Apresentação em Vídeo
                                    </h3>
                                    <div className={`aspect-video w-full rounded-2xl overflow-hidden border shadow-2xl`} style={adaptiveCardStyle}>
                                        <iframe
                                            src={getYouTubeEmbedUrl(profile.youtube_url)!}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            className="w-full h-full"
                                        ></iframe>
                                    </div>
                                </section>
                            </>
                        )}

                        <div className={`h-px ${borderSoft}`} />

                        <section>
                            <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>
                                <Sparkles className="w-6 h-6 text-indigo-500" />
                                Especialidades & Ferramentas
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${labelColor}`}>Áreas de Foco</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {profile.specialties?.map((spec: string) => (
                                            <span key={spec} className={`px-4 py-2 border rounded-xl font-medium ${contrastColor === '#ffffff' ? 'text-indigo-300' : 'text-indigo-600'}`} style={adaptiveInnerCardStyle}>
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {profile.decks_used && profile.decks_used.length > 0 && (
                                    <div>
                                        <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${labelColor}`}>Baralhos Utilizados</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {profile.decks_used.map((deck: string) => (
                                                <span key={deck} className={`px-4 py-2 border rounded-xl text-sm ${contrastColor === '#ffffff' ? 'text-slate-300' : 'text-slate-700'}`} style={adaptiveInnerCardStyle}>
                                                    {deck}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className={`h-px ${borderSoft}`} />

                        <section>
                            <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>
                                <MessageCircle className="w-6 h-6 text-indigo-500" />
                                Depoimentos de Clientes
                            </h3>
                            {reviewsList.length > 0 ? (
                                <div className="space-y-6">
                                    {reviewsList.map((review: any) => (
                                        <div key={review.id} className={`p-6 rounded-2xl border shadow-sm`} style={adaptiveCardStyle}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                                                        <img
                                                            src={review.profiles.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
                                                            alt="User"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>{review.profiles.full_name}</p>
                                                        <p className={`text-xs ${labelColor}`}>{new Date(review.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex text-amber-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-700'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-slate-300 italic">"{review.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                            )}
                        </section>

                    </div>

                    {/* RIGHT COLUMN (Gigs Sidebar) */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="sticky top-24">
                            <div className={`rounded-3xl p-6 border shadow-xl mb-8`} style={adaptiveCardStyle}>
                                <h3 className={`text-xl font-bold mb-6 ${contrastColor === '#ffffff' ? 'text-white' : 'text-black'}`}>Serviços Disponíveis</h3>
                                {gigs && gigs.length > 0 ? (
                                    <div className="space-y-4">
                                        {gigs.map((gig) => (
                                            <div key={gig.id} className="relative">
                                                <AnalyticsTracker
                                                    gigId={gig.id}
                                                    readerId={profile.id}
                                                    eventType="impression"
                                                />
                                                <Link to={`/servico/${gig.id}`} className={`block group p-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg`} style={adaptiveInnerCardStyle}>
                                                    {gig.image_url && (
                                                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden relative">
                                                            <img
                                                                src={gig.image_url}
                                                                alt={gig.title}
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className={`font-bold transition-colors line-clamp-2 ${contrastColor === '#ffffff' ? 'text-white group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                                                            {gig.title}
                                                        </h4>
                                                        <span className="shrink-0 bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded">
                                                            {gig.category || 'Geral'}
                                                        </span>
                                                    </div>
                                                    <div className={`flex items-center gap-4 text-xs mb-4 ${labelColor}`}>
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {gig.delivery_time_hours}h</span>
                                                        <span className="flex items-center gap-1">{gig.delivery_method === 'PHYSICAL_PHOTO' ? <Camera className="w-3 h-3" /> : <Mic className="w-3 h-3" />} {gig.delivery_method === 'PHYSICAL_PHOTO' ? 'Foto' : 'Digital'}</span>
                                                    </div>
                                                    <div className={`flex items-center justify-between pt-3 border-t ${borderSoft}`}>
                                                        <span className={`text-xs ${labelColor}`}>A partir de</span>
                                                        <span className={`text-lg font-bold ${contrastColor === '#ffffff' ? 'text-white' : 'text-indigo-600'}`}>R$ {(gig.price / 100).toFixed(2)}</span>
                                                    </div>
                                                    <ClickTracker gigId={gig.id} readerId={profile.id} eventType="click_buy">
                                                        <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                                            Agendar Agora
                                                        </Button>
                                                    </ClickTracker>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">Nenhum serviço ativo disponível.</p>
                                )}
                            </div>

                            <div className={`rounded-3xl p-6 border text-center shadow-lg`} style={adaptiveCardStyle}>
                                <Shield className={`w-10 h-10 mx-auto mb-4 ${contrastColor === '#ffffff' ? 'text-indigo-300' : 'text-indigo-600'}`} />
                                <h4 className={`text-lg font-bold mb-2 ${contrastColor === '#ffffff' ? 'text-white' : 'text-indigo-900'}`}>Satisfação Garantida</h4>
                                <p className={`text-sm mb-4 ${mutedTextColor}`}>
                                    Seus fundos ficam retidos com segurança até que sua leitura seja entregue.
                                </p>
                                <div className={`text-xs flex items-center justify-center gap-2 ${contrastColor === '#ffffff' ? 'text-indigo-300' : 'text-indigo-600 font-bold'}`}>
                                    <CheckCircle2 className="w-3 h-3" /> Cartomante Verificada
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {user && (
                <div className="fixed bottom-6 right-6 z-50">
                    <ChatWindow
                        currentUser={{ id: user.id }}
                        otherUser={{ id: profile.id, name: profile.full_name || 'Cartomante', avatar: profile.avatar_url }}
                        title={`Chat com ${profile.full_name?.split(' ')[0]}`}
                        variant="floating"
                    />
                </div>
            )}
        </div>
    )
}
