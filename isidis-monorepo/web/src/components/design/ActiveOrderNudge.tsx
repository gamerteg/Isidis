import React from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'

type Props = {
  readerName: string
  deadline: string
  progress: number
  href: string
}

export function ActiveOrderNudge({ readerName, deadline, progress, href }: Props) {
  const clamped = Math.min(100, Math.max(0, progress))
  const radius = 14
  const circ = 2 * Math.PI * radius

  return (
    <Link
      to={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        marginBottom: 20,
        background: 'rgba(139,92,246,.12)',
        border: '1px solid rgba(139,92,246,.25)',
        borderRadius: 16,
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg,#8b5cf6,#5b21b6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Clock size={16} color="white" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 1 }}>
          Sua leitura está sendo preparada
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,.45)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {readerName} · Entrega {deadline}
        </div>
      </div>
      <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
        <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(167,139,250,.2)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="3"
            strokeDasharray={`${(circ * clamped) / 100} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 800,
            color: '#a78bfa',
          }}
        >
          {clamped}%
        </div>
      </div>
    </Link>
  )
}
