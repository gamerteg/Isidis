import React from 'react'

type Props = {
  phase?: string
  message?: string
  percentage?: number
}

function computePhase(): { label: string; pct: number } {
  const now = new Date()
  const known = new Date('2024-01-11T11:57:00Z').getTime()
  const synodic = 29.53058867
  const daysSince = (now.getTime() - known) / (1000 * 60 * 60 * 24)
  const age = ((daysSince % synodic) + synodic) % synodic
  const pct = Math.round((age / synodic) * 100)

  let label = 'Lua Nova'
  if (age < 1.84566) label = 'Lua Nova'
  else if (age < 5.53699) label = 'Lua Crescente'
  else if (age < 9.22831) label = 'Quarto Crescente'
  else if (age < 12.91963) label = 'Gibosa Crescente'
  else if (age < 16.61096) label = 'Lua Cheia'
  else if (age < 20.30228) label = 'Gibosa Minguante'
  else if (age < 23.99361) label = 'Quarto Minguante'
  else if (age < 27.68493) label = 'Lua Minguante'
  return { label, pct }
}

export function MoonPhaseCard({
  phase,
  message = 'Energia favorável para revelações e novos começos',
  percentage,
}: Props) {
  const computed = React.useMemo(() => computePhase(), [])
  const resolvedPhase = phase ?? `${computed.label} · Libra`
  const pct = percentage ?? computed.pct

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: 16,
        marginBottom: 20,
        background: 'linear-gradient(135deg,rgba(42,27,94,.9),rgba(26,14,61,.9))',
        border: '1px solid rgba(167,139,250,.2)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="animate-float"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%,#fff8dc,#f5c451 40%,#8b5cf6)',
            boxShadow: '0 0 20px rgba(245,196,81,.4), inset -4px -4px 8px rgba(91,33,182,.6)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              color: 'rgba(245,196,81,.7)',
              marginBottom: 2,
            }}
          >
            {resolvedPhase}
          </div>
          <div
            className="font-serif"
            style={{ fontSize: 16, fontWeight: 400, color: 'white', lineHeight: 1.2 }}
          >
            {message}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(245,196,81,.8)',
            background: 'rgba(245,196,81,.1)',
            border: '1px solid rgba(245,196,81,.2)',
            borderRadius: 8,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {pct}%
        </div>
      </div>
    </div>
  )
}
