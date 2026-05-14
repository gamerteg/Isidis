import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { ProfileForm } from '@/components/profile/ClientProfileForm'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { useAuth } from '@/hooks/useAuth'
import { UserSidebar } from '@/components/user-sidebar'
import { OrbBackground, StarRating } from '@/components/design'

export default function PerfilPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login'); return }

        const supabase = createClient()
        supabase
            .from('profiles')
            .select('full_name, cellphone, tax_id, role, avatar_url, cover_url, bio, rating_average, reviews_count')
            .eq('id', user.id)
            .single()
            .then(({ data }) => { setProfile(data); setLoading(false) })
    }, [user, authLoading, navigate])

    if (authLoading || loading) return <PageSkeleton rows={3} />
    if (!user) return null

    const firstName = user.user_metadata?.full_name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'Você'
    const avatarInitials = (profile?.full_name || user.email || 'EU').slice(0, 2).toUpperCase()

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />

            <main className="relative z-10 flex-1 min-h-screen pb-24 md:pb-8 overflow-x-hidden">
                <div className="mobile-canvas relative" style={{ padding: '16px 18px 0' }}>
                    <OrbBackground
                        orbs={[
                            { color: '#8b5cf6', size: 200, top: -50, right: -40, opacity: 0.18 },
                        ]}
                    />

                    {/* Header */}
                    <div style={{ marginBottom: 24, position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 2 }}>
                            Sua conta
                        </div>
                        <div className="font-serif" style={{ fontSize: 24, fontWeight: 400, letterSpacing: '-.02em' }}>
                            Meu{' '}
                            <em className="text-gradient-aurora" style={{ fontStyle: 'italic' }}>Perfil</em>
                        </div>
                    </div>

                    {/* Avatar card */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(91,33,182,.25) 0%, rgba(30,20,60,.6) 100%)',
                            border: '1px solid rgba(167,139,250,.2)',
                            borderRadius: 20,
                            padding: '20px 18px',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(160deg,#2a1b5e,#1a0e3d)',
                            border: '2px solid rgba(167,139,250,.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, fontWeight: 700, color: '#a78bfa',
                            overflow: 'hidden',
                        }}>
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : avatarInitials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>
                                {profile?.full_name || firstName}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.email}
                            </div>
                            {profile?.rating_average && (
                                <div style={{ marginTop: 4 }}>
                                    <StarRating value={Number(profile.rating_average)} size={11} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Profile form */}
                    <div
                        style={{
                            background: 'rgba(17,13,34,.9)',
                            border: '1px solid rgba(255,255,255,.07)',
                            borderRadius: 20,
                            padding: '20px 18px',
                            position: 'relative',
                            zIndex: 1,
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 16 }}>
                            Informações pessoais
                        </div>
                        <ProfileForm
                            initialData={{
                                fullName: profile?.full_name || '',
                                cellphone: profile?.cellphone || '',
                                taxId: profile?.tax_id || '',
                                email: user.email || '',
                                bio: profile?.bio || '',
                                avatarUrl: profile?.avatar_url || '',
                                coverUrl: profile?.cover_url || '',
                            }}
                        />
                    </div>

                    {/* Quick actions */}
                    <div
                        style={{
                            background: 'rgba(17,13,34,.9)',
                            border: '1px solid rgba(255,255,255,.07)',
                            borderRadius: 20,
                            overflow: 'hidden',
                            marginBottom: 16,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {[
                            { label: 'Minhas tiragens', icon: '✦', href: '/dashboard/minhas-tiragens' },
                            { label: 'Mensagens', icon: '◎', href: '/dashboard/mensagens' },
                        ].map((item, i) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => navigate(item.href)}
                                style={{
                                    width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                                    borderBottom: i === 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
                                    padding: '14px 18px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 13, color: '#a78bfa' }}>{item.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{item.label}</span>
                                </div>
                                <span style={{ fontSize: 16, color: 'rgba(255,255,255,.2)' }}>›</span>
                            </button>
                        ))}
                    </div>

                    {/* Sign out */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <button
                            type="button"
                            className="btn-ghost-design"
                            style={{
                                width: '100%', padding: '12px', fontSize: 13,
                                color: '#f87171', borderColor: 'rgba(248,113,113,.2)',
                            }}
                            onClick={async () => {
                                const supabase = createClient()
                                await supabase.auth.signOut()
                                navigate('/')
                            }}
                        >
                            Sair da conta
                        </button>
                    </div>

                    <div style={{ height: 40 }} />
                </div>
            </main>
        </div>
    )
}
