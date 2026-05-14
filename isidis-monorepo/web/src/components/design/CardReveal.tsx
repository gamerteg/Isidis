import React, { useState, useCallback } from 'react'

export type RevealCardData = {
  pos: string
  arcano: string
  arcanoName: string
  gradient: string
  message: string
}

type Props = {
  card: RevealCardData
  revealed: boolean
  onReveal: () => void
  index: number
}

function playChime(index: number) {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880 + index * 110, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660 + index * 80, ctx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    /* silent */
  }
}

export function CardReveal({ card, revealed, onReveal, index }: Props) {
  const handleClick = useCallback(() => {
    if (revealed) return
    playChime(index)
    onReveal()
  }, [revealed, onReveal, index])

  return (
    <div
      onClick={handleClick}
      role={revealed ? 'img' : 'button'}
      aria-label={revealed ? `${card.pos}: ${card.arcanoName}` : `Revelar carta ${card.pos}`}
      tabIndex={revealed ? -1 : 0}
      onKeyDown={(e) => {
        if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
      style={{
        cursor: revealed ? 'default' : 'pointer',
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${revealed ? 'rgba(255,255,255,.08)' : 'rgba(167,139,250,.2)'}`,
        transition: 'all .4s cubic-bezier(.16,1,.3,1)',
      }}
    >
      {!revealed ? (
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg,#1a0e3d,#2a1b5e)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle,rgba(245,196,81,.1) 1px,transparent 1.5px)',
              backgroundSize: '12px 12px',
            }}
          />
          <div
            style={{
              width: 50,
              height: 64,
              borderRadius: 10,
              background: 'linear-gradient(160deg,#2a1b5e,#1a0e3d)',
              border: '1px solid rgba(245,196,81,.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 24, fontFamily: 'Fraunces, serif', color: 'rgba(245,196,81,.4)' }}>
              ✦
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.15em',
                color: 'rgba(167,139,250,.7)',
                marginBottom: 2,
              }}
            >
              {card.pos}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Toque para revelar</div>
          </div>
          <div style={{ fontSize: 20, color: 'rgba(167,139,250,.5)' }}>?</div>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <div
            style={{
              padding: 16,
              background: `linear-gradient(135deg,${card.gradient})`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 60% 20%,rgba(255,255,255,.15),transparent 60%)',
              }}
            />
            <div
              style={{
                width: 50,
                height: 64,
                borderRadius: 10,
                background: 'rgba(0,0,0,.3)',
                border: '1px solid rgba(255,255,255,.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontSize: 7,
                  fontFamily: 'Fraunces, serif',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,.6)',
                  textAlign: 'center',
                  lineHeight: 1,
                }}
              >
                {card.arcanoName}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {card.arcano}
              </div>
              <div
                style={{
                  fontSize: 7,
                  fontFamily: 'Fraunces, serif',
                  color: 'rgba(255,255,255,.5)',
                  lineHeight: 1,
                }}
              >
                {card.arcano}
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.15em',
                  color: 'rgba(255,255,255,.7)',
                  marginBottom: 3,
                }}
              >
                {card.pos}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                {card.arcanoName}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(17,13,34,.95)' }}>
            <div
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,.75)',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{card.message}&rdquo;
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type GridProps = {
  cards: RevealCardData[]
  onAllRevealed?: () => void
}

export function CardRevealGrid({ cards, onAllRevealed }: GridProps) {
  const [revealed, setRevealed] = useState<boolean[]>(() => cards.map(() => false))
  const allRevealed = revealed.every(Boolean)

  React.useEffect(() => {
    if (allRevealed && onAllRevealed) {
      const t = setTimeout(onAllRevealed, 400)
      return () => clearTimeout(t)
    }
  }, [allRevealed, onAllRevealed])

  const revealOne = (i: number) => {
    setRevealed((prev) => {
      if (prev[i]) return prev
      const next = [...prev]
      next[i] = true
      return next
    })
  }

  const revealAll = () => {
    cards.forEach((_, i) => {
      setTimeout(() => {
        setRevealed((prev) => {
          if (prev[i]) return prev
          playChime(i)
          const next = [...prev]
          next[i] = true
          return next
        })
      }, i * 300)
    })
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Suas cartas</div>
        {!allRevealed && (
          <button
            type="button"
            onClick={revealAll}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#a78bfa',
              background: 'rgba(167,139,250,.1)',
              border: '1px solid rgba(167,139,250,.25)',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Revelar todas ✦
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cards.map((card, i) => (
          <CardReveal
            key={i}
            card={card}
            revealed={revealed[i]}
            onReveal={() => revealOne(i)}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
