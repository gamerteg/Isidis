import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
    Clock, CheckCircle2, MessageCircle, Youtube, Instagram
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ChatWindow } from '@/components/chat/chat-window'
import { getYouTubeEmbedUrl } from '@/lib/utils'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { ClickTracker } from '@/components/click-tracker'
import { useAuth } from '@/hooks/useAuth'
import { OrbBackground, TarotMini, StarRating, getArcanoFor } from '@/components/design'

export default function CartomantePage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background-deep"><p className="text-slate-400 text-sm">Carregando perfil...</p></div>
    if (!profile) return null

    if (gigs.length === 0 && user?.id !== id) return null

    const reviewsList = reviews
    const avgRating = reviewsList.length > 0
        ? (reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
        : '5.0'
    const totalReviews = reviewsList.length
    const avatarInitials = (profile.full_name || 'CA').slice(0, 2).toUpperCase()
    const primaryArcano = getArcanoFor(profile.specialties?.[0] || profile.tagline || '')
    const firstGigId = gigs[0]?.id

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans">
            {firstGigId && (
                <AnalyticsTracker gigId={firstGigId} readerId={profile.id} eventType="view" trigger="mount" />
            )}

            {/* HERO COVER */}
            <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                {/* Cover or gradient */}
                {profile.cover_url ? (
                    <img src={profile.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${primaryArcano.gradient})` }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,13,.9) 0%, rgba(7,6,13,.3) 100%)' }} />

                {/* Ghost arcano numeral */}
                <div
                    className="font-serif"
                    style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 8,
                        fontSize: 80,
                        fontWeight: 700,
                        opacity: 0.1,
                        color: 'white',
                        lineHeight: 1,
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    {primaryArcano.arcano}
                </div>

                {/* Social links top-right */}
                <div style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 6, zIndex: 2 }}>
                    {profile.instagram_handle && (
                        <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noopener"
                            style={{ background: 'rgba(0,0,0,.4)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)' }}>
                            <Instagram size={14} />
                        </a>
                    )}
                    {profile.youtube_url && (
                        <a href={profile.youtube_url} target="_blank" rel="noopener"
                            style={{ background: 'rgba(0,0,0,.4)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)' }}>
                            <Youtube size={14} />
                        </a>
                    )}
                </div>
            </div>

            {/* AVATAR + NAME overlaid */}
            <div className="mobile-canvas" style={{ padding: '0 18px' }}>
                <OrbBackground orbs={[{ color: '#8b5cf6', size: 220, top: -60, right: -40, opacity: 0.16 }]} />

                {/* Avatar overlapping hero */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -32, position: 'relative', zIndex: 2, marginBottom: 14 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        border: '3px solid rgba(167,139,250,.4)',
                        overflow: 'hidden', background: '#1a0e3d', flexShrink: 0,
                        boxShadow: '0 0 20px rgba(139,92,246,.3)',
                    }}>
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#a78bfa', background: 'linear-gradient(160deg,#2a1b5e,#1a0e3d)' }}>
                                {avatarInitials}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-serif" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.full_name}
                        </div>
                        {profile.tagline && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profile.tagline}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                    {[
                        { label: 'Avaliação', value: avgRating, suffix: `(${totalReviews})` },
                        { label: 'Experiência', value: profile.years_of_experience ? `${profile.years_of_experience} anos` : '—', suffix: '' },
                        { label: 'Tiragens', value: profile.total_readings || gigs.length, suffix: '' },
                    ].map((stat) => (
                        <div key={stat.label} style={{
                            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
                            borderRadius: 14, padding: '10px 8px', textAlign: 'center',
                        }}>
                            <div className="font-serif" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, marginBottom: 3, color: '#f5c451' }}>{stat.value}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)' }}>{stat.label}</div>
                            {stat.suffix && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', marginTop: 1 }}>{stat.suffix}</div>}
                        </div>
                    ))}
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div style={{
                        background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
                        borderRadius: 16, padding: '14px 16px', marginBottom: 16, position: 'relative', zIndex: 1,
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 6 }}>Sobre</div>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>
                    </div>
                )}

                {/* Specialties */}
                {profile.specialties?.length > 0 && (
                    <div style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>Especialidades</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {profile.specialties.map((spec: string) => (
                                <span key={spec} className="chip-filter" style={{ cursor: 'default' }}>{spec}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gigs section */}
                {gigs.length > 0 && (
                    <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Serviços disponíveis</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {gigs.map((gig) => {
                                const gigArcano = getArcanoFor(gig.category || gig.title)
                                return (
                                    <div key={gig.id} style={{ position: 'relative' }}>
                                        <AnalyticsTracker gigId={gig.id} readerId={profile.id} eventType="impression" />
                                        <div style={{
                                            background: 'rgba(17,13,34,.9)', border: '1px solid rgba(255,255,255,.07)',
                                            borderRadius: 18, overflow: 'hidden',
                                        }}>
                                            <div style={{ padding: 14 }}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                                                    <TarotMini arcano={gigArcano.arcano} arcanoName={gig.title} gradient={gigArcano.gradient} width={44} height={56} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gig.title}</div>
                                                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                                                            <span><Clock size={9} style={{ display: 'inline', marginRight: 2 }} />{gig.delivery_time_hours}h</span>
                                                            <span>{gig.category || 'Geral'}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div className="font-serif" style={{ fontSize: 16, fontWeight: 700, color: '#f5c451' }}>
                                                            R$ {(gig.price / 100).toFixed(0)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ClickTracker gigId={gig.id} readerId={profile.id} eventType="click_buy">
                                                    <Link
                                                        to={`/servico/${gig.id}`}
                                                        className="btn-gold-design"
                                                        style={{ display: 'block', textAlign: 'center', padding: '11px', fontSize: 13, textDecoration: 'none' }}
                                                    >
                                                        Contratar leitura
                                                    </Link>
                                                </ClickTracker>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Message CTA */}
                <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                    <button
                        type="button"
                        className="btn-ghost-design"
                        style={{
                            width: '100%', padding: '12px', fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                        onClick={() => navigate(`/dashboard/mensagens?reader=${profile.id}`)}
                    >
                        <MessageCircle size={14} />
                        Enviar mensagem
                    </button>
                </div>

                {/* YouTube video */}
                {profile.youtube_url && getYouTubeEmbedUrl(profile.youtube_url) && (
                    <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Apresentação</div>
                        <div style={{ aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden' }}>
                            <iframe
                                src={getYouTubeEmbedUrl(profile.youtube_url)!}
                                title="Vídeo"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* Reviews */}
                {reviewsList.length > 0 && (
                    <div style={{ marginBottom: 20, position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Avaliações</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {reviewsList.slice(0, 5).map((review: any) => (
                                <div key={review.id} style={{
                                    background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
                                    borderRadius: 16, padding: '14px 16px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700 }}>{review.profiles?.full_name || 'Consulente'}</div>
                                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{new Date(review.created_at).toLocaleDateString('pt-BR')}</div>
                                        </div>
                                        <StarRating value={review.rating} size={11} />
                                    </div>
                                    {review.comment && (
                                        <p className="font-serif" style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,.6)', margin: 0, lineHeight: 1.5 }}>
                                            "{review.comment}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trust badge */}
                <div style={{
                    background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)',
                    borderRadius: 14, padding: '12px 16px', marginBottom: 20, position: 'relative', zIndex: 1,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <CheckCircle2 size={14} style={{ color: '#4ade80', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Cartomante verificada pelo Isidis</span>
                </div>

                <div style={{ height: 40 }} />
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
