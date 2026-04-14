import { Outlet, useNavigate } from 'react-router-dom'
import { Sparkles, Bell } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { Avatar } from '@/components/shared/Avatar'
import { useAuth } from '@/hooks/useAuth'

export function ClientLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 max-w-lg mx-auto">
        <div className="flex items-center justify-between px-5 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-1.5"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/30 flex items-center justify-center">
              <Sparkles size={13} className="text-primary" />
            </div>
            <span className="font-display text-base font-bold text-gold-gradient">Isidis</span>
          </button>

          <button
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2"
          >
            <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
          </button>
        </div>
      </header>

      <main className="flex-1 pt-[52px] pb-24">
        <Outlet />
      </main>
      <BottomNav role="CLIENT" />
    </div>
  )
}
