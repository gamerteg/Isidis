import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Filter, ArrowLeft, X } from 'lucide-react'
import useSWR from 'swr'
import { api, type Profile, type Gig } from '@/lib/api'
import { formatCurrency, SPECIALTY_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { StarRating } from '@/components/shared/StarRating'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'

const SPECIALTIES = Object.entries(SPECIALTY_MAP)

export function ReadersListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [specialty, setSpecialty] = useState(params.get('specialty') ?? '')
  const [page, setPage] = useState(1)

  const queryString = [
    search && `search=${encodeURIComponent(search)}`,
    specialty && `specialty=${specialty}`,
    `page=${page}`,
    'limit=20',
  ].filter(Boolean).join('&')

  const { data, isLoading } = useSWR(
    `/readers?${queryString}`,
    () => api.get<{ data: Array<Profile & { gigs: Gig[] }>; pagination: any }>(`/readers?${queryString}`),
  )

  const readers = data?.data ?? []

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const clearSpecialty = () => setSpecialty('')

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-xl font-bold flex-1">Explorar Leitoras</h1>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nome ou especialidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </form>

        {/* Specialty filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {specialty && (
            <button
              onClick={clearSpecialty}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium shrink-0"
            >
              {SPECIALTY_MAP[specialty] ?? specialty}
              <X size={12} />
            </button>
          )}
          {SPECIALTIES.filter(([key]) => key !== specialty).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSpecialty(key)}
              className="px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium shrink-0 hover:border-primary/40 hover:text-primary transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-5 py-4">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : readers.length === 0 ? (
          <EmptyState
            title="Nenhuma leitora encontrada"
            description="Tente ajustar os filtros ou buscar por outra especialidade."
          />
        ) : (
          <div className="space-y-3">
            {readers.map(reader => (
              <button
                key={reader.id}
                onClick={() => navigate(`/leitora/${reader.id}`)}
                className="w-full flex items-start gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <Avatar src={reader.avatar_url} name={reader.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">{reader.full_name}</p>
                    {reader.gigs && reader.gigs.length > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">a partir de</p>
                        <p className="text-sm font-semibold text-gold">
                          {formatCurrency(Math.min(...reader.gigs.map(g => g.price)))}
                        </p>
                      </div>
                    )}
                  </div>
                  {reader.tagline && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{reader.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <StarRating rating={(reader as any).rating_average} count={(reader as any).reviews_count} />
                    <div className="flex gap-1 flex-wrap">
                      {(reader.specialties ?? []).slice(0, 2).map(s => (
                        <Badge key={s} variant="default" className="text-[10px] py-0">
                          {SPECIALTY_MAP[s] ?? s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex justify-center gap-3 mt-6">
            {page > 1 && (
              <button
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm hover:border-primary/40"
              >
                Anterior
              </button>
            )}
            {page < data.pagination.pages && (
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm hover:border-primary/40"
              >
                Próxima
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
