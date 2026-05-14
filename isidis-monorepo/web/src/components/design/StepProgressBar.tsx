import React from 'react'

type Props = {
  steps: string[]
  current: number
  className?: string
}

export function StepProgressBar({ steps, current, className }: Props) {
  return (
    <div className={className} style={{ display: 'flex', padding: '12px 18px 0', gap: 4 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ flex: 1 }}>
          <div
            style={{
              height: 2,
              borderRadius: 99,
              background:
                i <= current
                  ? 'linear-gradient(90deg,#a78bfa,#f5c451)'
                  : 'rgba(255,255,255,.1)',
              marginBottom: 3,
              transition: 'background .4s',
            }}
          />
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              color:
                i === current
                  ? '#a78bfa'
                  : i < current
                    ? 'rgba(255,255,255,.5)'
                    : 'rgba(255,255,255,.2)',
            }}
          >
            {s}
          </div>
        </div>
      ))}
    </div>
  )
}
