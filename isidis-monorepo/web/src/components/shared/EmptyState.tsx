import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4 text-center px-6', className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon size={28} className="text-primary/60" />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-display font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
