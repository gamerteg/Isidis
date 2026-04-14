import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Star } from 'lucide-react'
import useSWR from 'swr'
import { api } from '@/lib/api'
import { formatCurrency, SPECIALTY_MAP, DELIVERY_METHOD_MAP } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { StarRating } from '@/components/shared/StarRating'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'

export function ReaderProfilePage() {
  const { readerId } = useParams<{ readerId: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useSWR(
    readerId ? `/readers/${readerId}` : null,
    () => api.get<{ data: any }>(`/readers/${readerId}`),
  )

  const reader = data?.data

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!reader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Leitora não encontrada</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Profile hero */}
      <div className="px-5 py-6">
        <div className="flex items-start gap-4">
          <Avatar src={reader.avatar_url} name={reader.full_name} size="xl" />
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">{reader.full_name}</h1>
            {reader.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5 italic">"{reader.tagline}"</p>
            )}
            <div className="mt-2">
              <StarRating rating={reader.rating_average} count={reader.reviews_count} size="md" />
            </div>
            {reader.specialties && reader.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reader.specialties.map((s: string) => (
                  <Badge key={s} variant="default">
                    {SPECIALTY_MAP[s] ?? s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {reader.bio && (
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border">
            <p className="text-sm text-foreground/80 leading-relaxed">{reader.bio}</p>
          </div>
        )}
      </div>

      {/* Gigs */}
      {reader.gigs && reader.gigs.length > 0 && (
        <div className="px-5 pb-8">
          <h2 className="font-display text-lg font-bold mb-4">Serviços disponíveis</h2>
          <div className="space-y-4">
            {reader.gigs
              .filter((g: any) => g.is_active && g.status === 'APPROVED')
              .map((gig: any) => (
                <button
                  key={gig.id}
                  onClick={() => navigate(`/gig/${gig.id}`)}
                  className="w-full text-left"
                >
                  <Card className="hover:border-primary/40 transition-colors active:scale-[0.98]">
                    <CardContent className="p-4">
                      {gig.image_url && (
                        <img
                          src={gig.image_url}
                          alt={gig.title}
                          className="w-full h-36 object-cover rounded-xl mb-3"
                        />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground">{gig.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {gig.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={12} />
                              {gig.delivery_time_hours}h
                            </span>
                            <Badge variant="muted" className="text-[10px]">
                              {DELIVERY_METHOD_MAP[gig.delivery_method] ?? gig.delivery_method}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gold">{formatCurrency(gig.price)}</p>
                        </div>
                      </div>
                      <Button className="w-full mt-3" size="sm" variant="outline">
                        Ver detalhes
                      </Button>
                    </CardContent>
                  </Card>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
