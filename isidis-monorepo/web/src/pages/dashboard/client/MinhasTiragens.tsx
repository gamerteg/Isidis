import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/apiClient'
import type { OrderSummary } from '@/types'

const statusConfig: Record<string, { label: string; color: string; filterLabel: string }> = {
    PENDING_PAYMENT: {
        label: 'Aguardando Pagamento',
        color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        filterLabel: 'Pendente'
    },
    PAID: {
        label: 'Em Preparo',
        color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        filterLabel: 'Em Andamento'
    },
    DELIVERED: {
        label: 'Pronto para Ver',
        color: 'bg-green-500/15 text-green-400 border-green-500/30',
        filterLabel: 'Pronto'
    },
    COMPLETED: {
        label: 'Concluído',
        color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        filterLabel: 'Concluído'
    },
    CANCELED: {
        label: 'Cancelado',
        color: 'bg-red-500/15 text-red-400 border-red-500/30',
        filterLabel: 'Cancelado'
    },
}

export default function MinhasTiragensPage() {
    const { user, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (authLoading) return
        if (!user) { navigate('/login?next=/dashboard/minhas-tiragens'); return }

        apiClient.get<{ data: OrderSummary[] }>('/orders', { params: { limit: 50 } })
            .then(({ data }) => {
                const formatted = (data.data || []).map((order) => ({
                    id: order.id,
                    status: order.status,
                    amount_total: order.amount_total,
                    created_at: order.created_at,
                    isFavorite: false,
                    gigTitle: order.gigs?.title || 'Leitura de Tarot',
                    deliveryTimeHours: order.gigs?.delivery_time_hours || 48,
                    readerName: order.reader?.full_name || 'Cartomante',
                    readerAvatar: order.reader?.avatar_url || null,
                    gigId: order.gigs?.id || '',
                    readerId: order.reader?.id || '',
                    reviewRating: null,
                }))
                setOrders(formatted)
            })
            .finally(() => setLoading(false))
    }, [user, authLoading])

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Carregando tiragens...</p></div>
    if (!user) return null

    return (
        <DashboardClient
            orders={orders}
            userId={user.id}
            userName={user.user_metadata?.full_name?.split(' ')[0] || 'Visitante'}
            userInitials={user.email?.substring(0, 2).toUpperCase() || 'VA'}
            totalReadings={orders.length}
            statusConfig={statusConfig}
        />
    )
}
