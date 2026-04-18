
import {
    BookOpen, Heart, Settings, HelpCircle, LogOut,
    Search, Bell, Ticket, Home, MessageCircle, Repeat
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'

interface UserSidebarProps {
    className?: string
    activeFilter?: string
    onFilterChange?: (filter: string) => void
}

import { cn } from '@/lib/utils'

export function UserSidebar({ className, activeFilter, onFilterChange }: UserSidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const pathname = location.pathname

    const sidebarLinks = [
        { icon: Home, label: 'Início', href: '/dashboard' },
        { icon: Search, label: 'Explorar', href: '/cartomantes' },
        { icon: BookOpen, label: 'Minhas Leituras', href: '/dashboard/minhas-tiragens' },
        { icon: Repeat, label: 'Minhas Assinaturas', href: '/dashboard/minhas-assinaturas' },
        { icon: MessageCircle, label: 'Mensagens', href: '/dashboard/mensagens' },
        { icon: Bell, label: 'Notificações', href: '/dashboard/notifications' },
        { icon: Heart, label: 'Favoritas', href: '#', onClick: () => onFilterChange?.('favorites') },
        { icon: Ticket, label: 'Suporte', href: '/dashboard/tickets' },
        { icon: Settings, label: 'Configurações', href: '/dashboard/perfil' },
    ]

    return (
        <aside className={cn("w-64 flex flex-col shrink-0 sticky top-0 h-screen hidden md:flex", className)} style={{ background: 'rgba(10,8,22,0.92)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="p-4 flex-1">
                <nav className="space-y-1">
                    {sidebarLinks.map(link => {
                        const isActive = link.href === pathname || (link.label === 'Favoritas' && activeFilter === 'favorites')

                        return (
                            <Link
                                key={link.label}
                                to={link.href}
                                onClick={(e) => {
                                    if (link.onClick) {
                                        e.preventDefault()
                                        link.onClick()
                                    }
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'border-shine bg-[#1a1433] shadow-lg'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
                                    }`}
                                style={isActive ? { color: 'var(--violet-bright)' } : {}}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
            <div className="p-4" style={{ borderTop: '1px solid rgba(167,139,250,0.08)' }}>
                <button
                    type="button"
                    onClick={async () => {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        navigate('/login')
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Sair
                </button>
            </div>
        </aside>
    )
}
