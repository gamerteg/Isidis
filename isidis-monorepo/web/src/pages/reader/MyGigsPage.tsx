import { useNavigate } from 'react-router-dom'
import { Plus, Star, ToggleLeft, ToggleRight, Pencil, Clock } from 'lucide-react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, type Gig } from '@/lib/api'
import { formatCurrency, DELIVERY_METHOD_MAP } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SkeletonList } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent } from '@/components/ui/card'

const GIG_STATUS_BADGE: Record<string, any> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
}

const GIG_STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprovado',
  PENDING: 'Em revisão',
  REJECTED: 'Rejeitado',
}

export function MyGigsPage() {
  const navigate = useNavigate()

  const { data, isLoading, mutate } = useSWR(
    '/gigs',
    () => api.get<{ data: Gig[] }>('/gigs'),
  )

  const gigs = data?.data ?? []

  const handleToggle = async (gig: Gig) => {
    try {
      await api.patch(`/gigs/${gig.id}/toggle`, {})
      mutate()
      toast.success(gig.is_active ? 'Serviço desativado' : 'Serviço ativado')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao atualizar serviço')
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-[52px] z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Meus Serviços</h1>
          <Button size="sm" onClick={() => navigate('/leitora/gigs/novo')}>
            <Plus size={16} />
            Novo
          </Button>
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <SkeletonList count={3} />
        ) : gigs.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Nenhum serviço criado"
            description="Crie seu primeiro serviço para começar a receber consultas."
            action={
              <Button onClick={() => navigate('/leitora/gigs/novo')}>
                <Plus size={16} />
                Criar serviço
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {gigs.map(gig => (
              <Card key={gig.id} className={!gig.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {gig.image_url && (
                      <img
                        src={gig.image_url}
                        alt={gig.title}
                        className="w-14 h-14 object-cover rounded-xl shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{gig.title}</p>
                        <p className="text-sm font-bold text-gold shrink-0">{formatCurrency(gig.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={GIG_STATUS_BADGE[gig.status]}>
                          {GIG_STATUS_LABEL[gig.status]}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          {gig.delivery_time_hours}h
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {DELIVERY_METHOD_MAP[gig.delivery_method] ?? gig.delivery_method}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => handleToggle(gig)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {gig.is_active ? (
                        <ToggleRight size={18} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                      {gig.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/leitora/gigs/${gig.id}/editar`)}
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
