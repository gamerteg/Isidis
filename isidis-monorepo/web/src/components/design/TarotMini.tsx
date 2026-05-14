import React from 'react'

type Props = {
  arcano: string
  arcanoName?: string
  gradient?: string
  width?: number
  height?: number
  className?: string
}

export function TarotMini({
  arcano,
  arcanoName,
  gradient = '#a78bfa,#f472b6',
  width = 50,
  height = 64,
  className,
}: Props) {
  const numeralFontSize = Math.max(12, Math.round(width * 0.36))
  const labelFontSize = Math.max(6, Math.round(width * 0.14))

  return (
    <div
      className={`tarot-mini ${className ?? ''}`}
      style={{ width, height, flexShrink: 0 }}
    >
      {arcanoName && (
        <div
          style={{
            fontSize: labelFontSize,
            color: 'rgba(245,196,81,0.7)',
            fontFamily: 'Fraunces, serif',
            fontStyle: 'italic',
            fontWeight: 300,
            textAlign: 'center',
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {arcanoName}
        </div>
      )}
      <div
        style={{
          fontSize: numeralFontSize,
          fontWeight: 800,
          background: `linear-gradient(135deg,${gradient})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Fraunces, serif',
          lineHeight: 1,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {arcano}
      </div>
      {arcanoName && (
        <div
          style={{
            fontSize: labelFontSize,
            color: 'rgba(245,196,81,0.6)',
            fontFamily: 'Fraunces, serif',
            lineHeight: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {arcano}
        </div>
      )}
    </div>
  )
}

// Mapa de serviços comuns para arcanos (fallback quando a gig não tiver metadata)
export const GIG_ARCANOS: Record<string, { arcano: string; arcanoName: string; gradient: string }> = {
  amor: { arcano: 'VI', arcanoName: 'Os Amantes', gradient: '#f472b6,#831843' },
  trabalho: { arcano: 'X', arcanoName: 'Roda da Fortuna', gradient: '#f5c451,#d4a017' },
  familia: { arcano: 'III', arcanoName: 'A Imperatriz', gradient: '#8b5cf6,#5b21b6' },
  espiritual: { arcano: 'II', arcanoName: 'A Sacerdotisa', gradient: '#14b8a6,#0f766e' },
  financas: { arcano: 'XIX', arcanoName: 'O Sol', gradient: '#fb7185,#dc2626' },
  saude: { arcano: 'XIV', arcanoName: 'A Temperança', gradient: '#5eead4,#0891b2' },
  default: { arcano: 'XVII', arcanoName: 'A Estrela', gradient: '#a78bfa,#f472b6' },
}

export function getArcanoFor(category?: string | null) {
  if (!category) return GIG_ARCANOS.default
  const key = category.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return GIG_ARCANOS[key] ?? GIG_ARCANOS.default
}
