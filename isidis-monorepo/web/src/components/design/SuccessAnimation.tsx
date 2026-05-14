import React, { useState, useEffect } from 'react'

type Props = {
  onDone?: () => void
}

export function SuccessAnimation({ onDone }: Props) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200)
    const t2 = setTimeout(() => setPhase(2), 800)
    const t3 = setTimeout(() => setPhase(3), 1400)
    const tDone = onDone ? setTimeout(onDone, 1800) : null
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (tDone) clearTimeout(tDone)
    }
  }, [onDone])

  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * 360,
    color: ['#a78bfa', '#f5c451', '#f472b6', '#5eead4'][i % 4],
    delay: i * 0.06,
  }))

  return (
    <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 4 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(167,139,250,.3)',
          transform: `scale(${phase >= 1 ? 1.4 : 0.5})`,
          opacity: phase >= 1 ? 0 : 1,
          transition: 'all .8s cubic-bezier(.16,1,.3,1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          border: '2px solid rgba(245,196,81,.2)',
          transform: `scale(${phase >= 2 ? 1.6 : 0.5})`,
          opacity: phase >= 2 ? 0 : 1,
          transition: 'all .8s .2s cubic-bezier(.16,1,.3,1)',
        }}
      />

      {phase >= 2 &&
        particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: p.color,
              transform: `rotate(${p.angle}deg) translateX(${phase >= 3 ? 60 : 0}px) translateY(-3px)`,
              opacity: phase >= 3 ? 0 : 1,
              transition: `all .6s ${p.delay}s cubic-bezier(.16,1,.3,1)`,
            }}
          />
        ))}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#8b5cf6,#f472b6)',
          transform: `scale(${phase >= 1 ? 1 : 0})`,
          transition: 'transform .5s cubic-bezier(.34,1.56,.64,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(139,92,246,.5)',
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity .3s .3s' }}
        >
          <path
            d="M10 24l10 10 18-20"
            strokeDasharray="50"
            strokeDashoffset={phase >= 2 ? 0 : 50}
            style={{ transition: 'stroke-dashoffset .4s .4s ease' }}
          />
        </svg>
      </div>
    </div>
  )
}
