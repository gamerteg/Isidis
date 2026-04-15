
import { useState } from 'react'
import {  useNavigate  } from 'react-router-dom'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { updateTicketStatus, TicketStatus } from '@/app/actions/tickets'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const statusMap: Record<TicketStatus, { label: string, color: string }> = {
    'OPEN': { label: 'Aberto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    'CLOSED': { label: 'Fechado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

export function AdminStatusUpdate({
    ticketId,
    currentStatus
}: {
    ticketId: string,
    currentStatus: TicketStatus
}) {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleStatusChange(newStatus: TicketStatus) {
        setLoading(true)
        try {
            const result = await updateTicketStatus(ticketId, newStatus)
            if (result.success) {
                toast.success('Status atualizado com sucesso!')
                window.location.reload()
            } else {
                toast.error(result.error || 'Erro ao atualizar status')
            }
        } catch (error) {
            toast.error('Erro ao atualizar status')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Alterar Status
            </p>
            <Select
                defaultValue={currentStatus}
                onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                disabled={loading}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="OPEN">Aberto</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Atendimento</SelectItem>
                    <SelectItem value="RESOLVED">Resolvido</SelectItem>
                    <SelectItem value="CLOSED">Fechado</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
