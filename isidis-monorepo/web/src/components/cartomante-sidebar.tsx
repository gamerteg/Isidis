

import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutGrid, Tag, Package, Wallet, BarChart3,
    Settings, MessageCircle, LogOut, LifeBuoy, Repeat
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

import { SidebarMessageBadge } from './sidebar-message-badge'

interface CartomanteSidebarProps {
    profile: {
        id?: string
        full_name: string | null
        avatar_url: string | null
        specialties: string[] | null
    } | null
    userId?: string
}

const navItems = [
    { label: 'Dashboard', href: '/dashboard/cartomante', icon: LayoutGrid },
    { label: 'Pedidos', href: '/dashboard/cartomante/pedidos', icon: Package },
    { label: 'Mensagens', href: '/dashboard/cartomante/mensagens', icon: MessageCircle },
    { label: 'Meus Gigs', href: '/dashboard/cartomante/gigs', icon: Tag },
    { label: 'Assinaturas', href: '/dashboard/cartomante/assinaturas', icon: Repeat },
    { label: 'Carteira', href: '/dashboard/cartomante/carteira', icon: Wallet },
    { label: 'Analytics', href: '/dashboard/cartomante/analytics', icon: BarChart3 },
    { label: 'Suporte', href: '/dashboard/cartomante/tickets', icon: LifeBuoy },
    { label: 'Perfil', href: '/dashboard/cartomante/perfil', icon: Settings },
]

export function CartomanteSidebar({ profile, userId }: CartomanteSidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const pathname = location.pathname
    const firstName = profile?.full_name?.split(' ')[0] || 'Cartomante'
    // Use passed userId or try to get from profile if available (though profile usually just has display info)
    const currentUserId = userId || profile?.id

    return (
        <aside className="hidden md:flex w-56 shrink-0 flex-col h-screen sticky top-0" style={{ background: 'rgba(10,8,22,0.92)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Logo */}
            <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Link to="/" className="flex items-center gap-2.5 group">
                    <img src="/logo.png" alt="Isidis Logo" width={32} height={32} className="w-8 h-8 object-contain transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-display font-light text-lg text-gradient-violet">Isidis</span>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1">
                {navItems.map(item => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.label}
                            to={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'border-shine bg-[#1a1433] shadow-lg'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                                }`}
                            style={isActive ? { color: 'var(--violet-bright)' } : {}}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                            {item.label}
                            {item.label === 'Mensagens' && currentUserId && (
                                <SidebarMessageBadge userId={currentUserId} />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-white/5">
                <div className="flex items-center gap-3 px-3 py-2.5">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" style={{ border: '1px solid var(--violet-bright)', boxShadow: '0 0 12px rgba(167,139,250,0.25)' }} />
                    ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #a78bfa, #5b21b6)', border: '1px solid rgba(167,139,250,0.4)', boxShadow: '0 0 12px rgba(167,139,250,0.25)' }}>
                            {firstName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate" title={profile?.full_name || 'Cartomante'}>{profile?.full_name || 'Cartomante'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile?.specialties?.[0] || 'Tarot Reader'}</p>
                    </div>
                    <Link to="/dashboard/cartomante/perfil" className="text-muted-foreground hover:text-primary transition-colors">
                        <Settings className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-white/5">
                <button
                    type="button"
                    onClick={async () => {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        navigate('/login')
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 w-full transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Sair
                </button>
            </div>
        </aside>
    )
}
