import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'

type Props = {
  pixCode: string
  amount: string
  summary: { label: string; value: string }[]
  qrImageSrc?: string
  expiresInSec?: number
  onBack?: () => void
  onConfirm: () => void
  onExpire?: () => void
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PixPaymentStep({
  pixCode,
  amount,
  summary,
  qrImageSrc,
  expiresInSec = 872,
  onBack,
  onConfirm,
  onExpire,
}: Props) {
  const [remaining, setRemaining] = useState(expiresInSec)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id)
          if (onExpire) onExpire()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [onExpire])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = pixCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: '#4ade80',
          top: -40,
          right: -40,
          opacity: 0.12,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            style={{
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 9,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
          </button>
        )}
        <div style={{ fontSize: 13, fontWeight: 700 }}>Pagamento via PIX</div>
      </div>

      <div style={{ padding: '20px 18px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-block',
              padding: 16,
              borderRadius: 20,
              background: 'white',
              marginBottom: 12,
            }}
          >
            {qrImageSrc ? (
              <img src={qrImageSrc} alt="QR Code PIX" width={160} height={160} />
            ) : (
              <PlaceholderQR />
            )}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
            Escaneie o QR code ou copie a chave
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 12,
              padding: '10px 14px',
              margin: '0 auto',
              maxWidth: 320,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,.6)',
                fontFamily: 'JetBrains Mono, monospace',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {pixCode}
            </div>
            <button
              type="button"
              onClick={copyCode}
              style={{
                background: copied ? 'rgba(74,222,128,.2)' : 'rgba(167,139,250,.2)',
                border: 'none',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 700,
                color: copied ? '#4ade80' : '#a78bfa',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,.35)',
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              marginBottom: 4,
            }}
          >
            Expira em
          </div>
          <div
            className="font-serif"
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: '#f5c451',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatCountdown(remaining)}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
          }}
        >
          {summary.map((line, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,.5)' }}>{line.label}</span>
              <span style={{ fontWeight: 700 }}>{line.value}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,.08)',
              marginTop: 10,
              paddingTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            <span>Total</span>
            <span style={{ color: '#f5c451' }}>{amount}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary-design"
          style={{ width: '100%', padding: '14px', fontSize: 14 }}
          onClick={onConfirm}
        >
          ✓ Confirmar pagamento
        </button>
        <div
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontSize: 10,
            color: 'rgba(255,255,255,.3)',
          }}
        >
          Após o pagamento, sua leitora é notificada automaticamente
        </div>
      </div>
    </div>
  )
}

function PlaceholderQR() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" fill="white" />
      {Array.from({ length: 7 }).map((_, r) =>
        Array.from({ length: 7 }).map((__, c) => {
          const fill =
            (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3) || (r + c) % 3 === 0
              ? '#07060d'
              : 'white'
          return <rect key={`${r}-${c}`} x={8 + c * 10} y={8 + r * 10} width={8} height={8} fill={fill} />
        }),
      )}
      <rect x="8" y="8" width="46" height="46" fill="none" stroke="#07060d" strokeWidth="6" />
      <rect x="18" y="18" width="26" height="26" fill="#07060d" />
      <rect x="106" y="8" width="46" height="46" fill="none" stroke="#07060d" strokeWidth="6" />
      <rect x="116" y="18" width="26" height="26" fill="#07060d" />
      <rect x="8" y="106" width="46" height="46" fill="none" stroke="#07060d" strokeWidth="6" />
      <rect x="18" y="116" width="26" height="26" fill="#07060d" />
      <g fill="#07060d">
        {Array.from({ length: 64 }, (_, i) => {
          const x = 60 + (i % 8) * 6
          const y = 60 + Math.floor(i / 8) * 6
          return (i * 7) % 3 === 0 ? <rect key={i} x={x} y={y} width={5} height={5} /> : null
        })}
      </g>
    </svg>
  )
}
