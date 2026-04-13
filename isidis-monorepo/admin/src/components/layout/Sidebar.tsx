import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  DollarSign,
  LifeBuoy,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/approvals', icon: CheckCircle2, label: 'Aprovações' },
  { to: '/gigs', icon: Sparkles, label: 'Gigs & Serviços' },
  { to: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/financials', icon: DollarSign, label: 'Financeiro' },
  { to: '/tickets', icon: LifeBuoy, label: 'Suporte' },
]

export function Sidebar() {
  const { signOut, profile } = useAuth()

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">IA</span>
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            Isidis Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-border/50 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? 'AD'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name ?? 'Admin'}</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
