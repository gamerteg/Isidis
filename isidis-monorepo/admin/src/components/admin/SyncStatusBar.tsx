import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

interface SyncStatusBarProps {
  lastUpdated: string | null
  error: string | null
  refreshing?: boolean
  onRefresh: () => void
}

export function SyncStatusBar({
  lastUpdated,
  error,
  refreshing = false,
  onRefresh,
}: SyncStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Sincronizacao operacional</p>
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : lastUpdated ? (
          <p className="text-sm text-muted-foreground">
            Ultima atualizacao: {formatDateTime(lastUpdated)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aguardando primeira sincronizacao.</p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        Atualizar
      </Button>
    </div>
  )
}
