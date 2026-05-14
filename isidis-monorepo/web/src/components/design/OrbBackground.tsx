import React from 'react'

export type Orb = {
  color: string
  size: number
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
  opacity?: number
}

type Props = {
  orbs: Orb[]
  className?: string
}

export function OrbBackground({ orbs, className }: Props) {
  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}
      aria-hidden="true"
    >
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: o.size,
            height: o.size,
            borderRadius: '50%',
            background: o.color,
            filter: 'blur(60px)',
            opacity: o.opacity ?? 0.2,
            top: o.top,
            bottom: o.bottom,
            left: o.left,
            right: o.right,
          }}
        />
      ))}
    </div>
  )
}
