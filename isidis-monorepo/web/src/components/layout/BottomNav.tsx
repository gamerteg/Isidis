import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingBag, User, Wallet, Package, Star } from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { api, type ReaderDashboard } from '@/lib/api'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: number
}

const clientNavItems: NavItem[] = [
  { to: '/home', icon: Home, label: 'Início' },
  { to: '/explorar', icon: Search, label: 'Explorar' },
  { to: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

interface BottomNavProps {
  role?: 'CLIENT' | 'READER'
}

function ReaderBottomNav() {
  const location = useLocation()

  const { data } = useSWR(
    '/readers/me/dashboard',
    () => api.get<ReaderDashboard>('/readers/me/dashboard'),
    { refreshInterval: 30_000 },
  )

  const unread = data?.data?.metrics?.unread_paid_orders ?? 0

  const readerNavItems: NavItem[] = [
    { to: '/leitora/dashboard', icon: Home, label: 'Início' },
    { to: '/leitora/gigs', icon: Star, label: 'Serviços' },
    { to: '/leitora/pedidos', icon: Package, label: 'Pedidos', badge: unread },
    { to: '/leitora/wallet', icon: Wallet, label: 'Carteira' },
    { to: '/leitora/perfil', icon: User, label: 'Perfil' },
  ]

  return <NavList items={readerNavItems} location={location.pathname} />
}

function NavList({ items, location }: { items: NavItem[]; location: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 px-2"
            >
              <div
                className={cn(
                  'flex flex-col items-center gap-0.5 transition-all duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'relative rounded-2xl p-2 transition-all duration-200',
                    isActive && 'bg-primary/15',
                  )}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={cn(
                      'transition-all',
                      isActive && 'drop-shadow-[0_0_6px_rgba(139,107,168,0.6)]',
                    )}
                  />
                  {/* Badge dot for unread */}
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold px-0.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
            </NavLink>
          )
        })}
      </div>
      {/* Safe area spacer */}
      <div className="h-safe" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation()

  if (role === 'READER') {
    return <ReaderBottomNav />
  }

  return <NavList items={clientNavItems} location={location.pathname} />
}
