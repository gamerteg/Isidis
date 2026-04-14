import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Read-only display mode ───────────────────────────────────────────────────
interface StarRatingDisplayProps {
  rating: number | null | undefined
  count?: number | null
  size?: 'sm' | 'md'
  className?: string
  value?: undefined
  onChange?: undefined
}

// ── Interactive input mode ───────────────────────────────────────────────────
interface StarRatingInputProps {
  value: number
  onChange: (v: number) => void
  size?: 'sm' | 'md'
  className?: string
  rating?: undefined
  count?: undefined
}

type StarRatingProps = StarRatingDisplayProps | StarRatingInputProps

export function StarRating(props: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  // Interactive mode
  if (props.onChange !== undefined) {
    const { value, onChange, size = 'md', className } = props
    const starSize = size === 'sm' ? 18 : 24
    const display = hovered || value

    return (
      <div className={cn('flex items-center gap-1', className)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={starSize}
              className={cn(
                'transition-colors',
                n <= display ? 'fill-gold text-gold' : 'text-muted-foreground/30',
              )}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-sm text-muted-foreground ml-1">
            {value === 1 ? 'Ruim' : value === 2 ? 'Regular' : value === 3 ? 'Bom' : value === 4 ? 'Ótimo' : 'Excelente'}
          </span>
        )}
      </div>
    )
  }

  // Display mode
  const { rating, count, size = 'sm', className } = props
  if (!rating) return null
  const starSize = size === 'sm' ? 12 : 16

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Star size={starSize} className="fill-gold text-gold" />
      <span className={cn('font-medium text-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({count})
        </span>
      )}
    </div>
  )
}
