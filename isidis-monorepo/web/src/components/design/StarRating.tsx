import React from 'react'

type Props = {
  value: number
  size?: number
  max?: number
  className?: string
}

export function StarRating({ value, size = 10, max = 5, className }: Props) {
  return (
    <div className={className} style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value)
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#f5c451' : 'rgba(255,255,255,.15)'}
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      })}
    </div>
  )
}
