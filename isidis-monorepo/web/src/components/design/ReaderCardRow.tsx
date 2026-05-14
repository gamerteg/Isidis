import React from 'react'
import { Link } from 'react-router-dom'
import type { ReaderCardData } from './ReaderCard'

type Props = {
  readers: ReaderCardData[]
}

export function ReaderCardRow({ readers }: Props) {
  return (
    <div
      className="scrollbar-hide"
      style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}
    >
      {readers.map((reader) => {
        const gradient = reader.gradient ?? '#8b5cf6,#f472b6'
        const initials = reader.avatar ?? reader.name.slice(0, 2).toUpperCase()
        const href = reader.href ?? (reader.slug ? `/cartomante/${reader.slug}` : `/cartomante/${reader.id}`)

        return (
          <Link
            key={reader.id}
            to={href}
            style={{
              flexShrink: 0,
              width: 100,
              textAlign: 'center',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 6px' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg,${gradient})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'white',
                  border: '2px solid rgba(167,139,250,.4)',
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
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#4ade80',
                    border: '2px solid #07060d',
                  }}
                />
              )}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.2,
                marginBottom: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {reader.name.split(' ')[0]}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,.4)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {reader.specialty.split(' ')[0]}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
