import React from 'react'
import { Link } from 'react-router-dom'
import { StarRating } from './StarRating'
import { TarotMini } from './TarotMini'

export type ReaderCardData = {
  id: string | number
  slug?: string
  name: string
  specialty: string
  rating: number
  reviews: number
  price: number
  online?: boolean
  badge?: string
  avatar?: string
  gradient?: string
  arcano?: string
  arcanoName?: string
  href?: string
}

type Props = {
  reader: ReaderCardData
  variant?: 'row' | 'tarot'
}

export function ReaderCard({ reader, variant = 'row' }: Props) {
  const gradient = reader.gradient ?? '#8b5cf6,#f472b6'
  const initials = reader.avatar ?? reader.name.slice(0, 2).toUpperCase()
  const href = reader.href ?? (reader.slug ? `/cartomante/${reader.slug}` : `/cartomante/${reader.id}`)

  if (variant === 'tarot' && reader.arcano) {
    return (
      <Link
        to={href}
        className="reader-card"
        style={{ padding: 16, display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <TarotMini
            arcano={reader.arcano}
            arcanoName={reader.arcanoName}
            gradient={gradient}
            width={56}
            height={72}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 3,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {reader.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
                  {reader.specialty}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {reader.online ? (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(74,222,128,.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(74,222,128,.25)',
                    }}
                  >
                    Online
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,.06)',
                      color: 'rgba(255,255,255,.3)',
                    }}
                  >
                    Offline
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <StarRating value={reader.rating} size={9} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{reader.rating.toFixed(2)}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>
                · {reader.reviews} avaliações
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>a partir de </span>
                <span className="font-serif" style={{ fontSize: 18, fontWeight: 600 }}>
                  R$ {reader.price}
                </span>
              </div>
              <span
                className="btn-primary-design"
                style={{
                  fontSize: 11,
                  padding: '7px 16px',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                Ver serviços
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // row variant (featured on home)
  return (
    <Link
      to={href}
      className="reader-card"
      style={{
        padding: 14,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `linear-gradient(135deg,${gradient})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            color: 'white',
          }}
        >
          {initials}
        </div>
        {reader.online && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#4ade80',
              border: '2px solid #07060d',
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {reader.name}
          </div>
          {reader.badge && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(245,196,81,.2)',
                color: '#f5c451',
                border: '1px solid rgba(245,196,81,.3)',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                flexShrink: 0,
              }}
            >
              {reader.badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', marginBottom: 4 }}>
          {reader.specialty}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StarRating value={reader.rating} size={10} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>
            {reader.rating.toFixed(2)}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>({reader.reviews})</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 9,
            color: 'rgba(255,255,255,.35)',
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            marginBottom: 2,
          }}
        >
          a partir
        </div>
        <div className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: 'white', lineHeight: 1 }}>
          R${reader.price}
        </div>
      </div>
    </Link>
  )
}
