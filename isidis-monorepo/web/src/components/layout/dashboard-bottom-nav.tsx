
import { Link } from 'react-router-dom'
import {  useLocation  } from 'react-router-dom'
import { Home, Search, BookOpen, User, LayoutGrid, Package, MessageCircle, Wallet, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardBottomNav() {
    const location = useLocation();
  const pathname = location.pathname;

    const clientNavItems = [
        {
            label: 'Início',
            href: '/dashboard',
            icon: Home,
            active: pathname === '/dashboard'
        },
        {
            label: 'Buscar',
            href: '/cartomantes',
            icon: Search,
            active: pathname === '/cartomantes'
        },
        {
            label: 'Minhas Tiragens',
            href: '/dashboard/minhas-tiragens',
            icon: BookOpen,
            active: pathname === '/dashboard/minhas-tiragens'
        },
        {
            label: 'Mensagens',
            href: '/dashboard/mensagens',
            icon: MessageCircle,
            active: pathname === '/dashboard/mensagens'
        },
        {
            label: 'Perfil',
            href: '/dashboard/perfil',
            icon: User,
            active: pathname === '/dashboard/perfil'
        }
    ]

    const cartomanteNavItems = [
        {
            label: 'Início',
            href: '/dashboard/cartomante',
            icon: LayoutGrid,
            active: pathname === '/dashboard/cartomante'
        },
        {
            label: 'Pedidos',
            href: '/dashboard/cartomante/pedidos',
            icon: Package,
            active: pathname.startsWith('/dashboard/cartomante/pedidos')
        },
        {
            label: 'Mensagens',
            href: '/dashboard/cartomante/mensagens',
            icon: MessageCircle,
            active: pathname.startsWith('/dashboard/cartomante/mensagens')
        },
        {
            label: 'Gigs',
            href: '/dashboard/cartomante/gigs',
            icon: Tag,
            active: pathname.startsWith('/dashboard/cartomante/gigs')
        },
        {
            label: 'Carteira',
            href: '/dashboard/cartomante/carteira',
            icon: Wallet,
            active: pathname.startsWith('/dashboard/cartomante/carteira')
        },
        {
            label: 'Perfil',
            href: '/dashboard/cartomante/perfil',
            icon: User,
            active: pathname.startsWith('/dashboard/cartomante/perfil')
        }
    ]

    // Determine which nav items to use
    let currentNavItems = clientNavItems
    if (pathname.startsWith('/dashboard/cartomante')) {
        currentNavItems = cartomanteNavItems
    } else if (pathname.startsWith('/admin')) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-nav-deep/95 backdrop-blur-md border-t border-white/10 pb-safe md:hidden">
            <div className="flex items-center justify-around h-16">
                {currentNavItems.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                            item.active ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", item.active && "fill-current/20")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
