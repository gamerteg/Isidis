import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Star, Sparkles, Moon, Sun, Hash } from 'lucide-react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'
import { api, type Profile, type Gig } from '@/lib/api'
import { formatCurrency, SPECIALTY_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { StarRating } from '@/components/shared/StarRating'
import { Spinner } from '@/components/ui/spinner'

const CATEGORIES = [
  { key: 'TAROT', label: 'Tarô', icon: Moon },
  { key: 'ASTROLOGY', label: 'Astrologia', icon: Sun },
  { key: 'NUMEROLOGY', label: 'Numerologia', icon: Hash },
  { key: 'CRYSTALS', label: 'Cristais', icon: Sparkles },
]

export function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')

  const { data: readersData, isLoading } = useSWR(
    '/readers?limit=6',
    () => api.get<{ data: Array<Profile & { gigs: Gig[] }> }>('/readers?limit=6'),
  )

  const readers = readersData?.data ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/explorar?q=${encodeURIComponent(search)}`)
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'você'

  return (
    <div className="pb-safe animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Olá, {firstName} 🔮</p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Sua jornada espiritual
            </h1>
          </div>
          <button
            onClick={() => navigate('/notificacoes')}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={18} />
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch}>
          <button
            type="button"
            onClick={() => navigate('/explorar')}
            className="w-full flex items-center gap-3 h-12 px-4 rounded-2xl border border-border bg-card text-muted-foreground text-sm text-left hover:border-primary/40 transition-colors"
          >
            <Search size={16} />
            Buscar leitoras, especialidades...
          </button>
        </form>
      </div>

      {/* Hero banner */}
      <div className="mx-5 mb-6">
        <div
          className="relative rounded-3xl overflow-hidden p-5 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #2D1B3D 0%, #4A2060 50%, #2D1B3D 100%)' }}
          onClick={() => navigate('/explorar')}
        >
          <div className="absolute inset-0 bg-purple-glow opacity-50" />
          <div className="relative z-10">
            <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-1">✨ Descubra</p>
            <h2 className="font-display text-xl font-bold leading-tight mb-2">
              Encontre sua leitora<br />espiritual ideal
            </h2>
            <p className="text-sm text-foreground/70 mb-4">
              Consultas personalizadas de Tarô, Astrologia e muito mais
            </p>
            <span className="inline-flex items-center gap-1 bg-primary/20 border border-primary/30 rounded-full px-3 py-1 text-xs text-primary font-medium">
              Ver todas →
            </span>
          </div>
          <div className="absolute right-4 bottom-4 opacity-20 pointer-events-none">
            <Moon size={80} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mb-6">
        <h2 className="font-display font-semibold text-base mb-3">Categorias</h2>
        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => navigate(`/explorar?specialty=${key}`)}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured readers */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-base">Leitoras em destaque</h2>
          <button
            onClick={() => navigate('/explorar')}
            className="text-xs text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3">
            {readers.map(reader => (
              <button
                key={reader.id}
                onClick={() => navigate(`/leitora/${reader.id}`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <Avatar src={reader.avatar_url} name={reader.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{reader.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {(reader.specialties ?? []).map(s => SPECIALTY_MAP[s] ?? s).join(' · ')}
                  </p>
                  <StarRating rating={(reader as any).rating_average} count={(reader as any).reviews_count} />
                </div>
                {reader.gigs && reader.gigs.length > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">A partir de</p>
                    <p className="text-sm font-semibold text-gold">
                      {formatCurrency(Math.min(...reader.gigs.map(g => g.price)))}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
