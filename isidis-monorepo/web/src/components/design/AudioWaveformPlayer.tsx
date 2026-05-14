import React, { useState, useEffect, useRef } from 'react'

type Props = {
  src?: string
  durationSec?: number
  title?: string
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AudioWaveformPlayer({ src, durationSec = 872, title = 'Áudio da leitura' }: Props) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(durationSec)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fakeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio
    const onMeta = () => setDuration(audio.duration)
    const onTime = () => setProgress((audio.currentTime / audio.duration) * 100)
    const onEnd = () => setPlaying(false)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [src])

  useEffect(() => {
    if (src && audioRef.current) {
      if (playing) audioRef.current.play().catch(() => setPlaying(false))
      else audioRef.current.pause()
      return
    }
    if (playing) {
      fakeTimerRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            if (fakeTimerRef.current) clearInterval(fakeTimerRef.current)
            setPlaying(false)
            return 100
          }
          return p + 0.5
        })
      }, 50)
    } else if (fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current)
    }
    return () => {
      if (fakeTimerRef.current) clearInterval(fakeTimerRef.current)
    }
  }, [playing, src])

  const seekTo = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct))
    setProgress(clamped)
    if (audioRef.current) {
      audioRef.current.currentTime = (clamped / 100) * duration
    }
  }

  const currentSec = (progress / 100) * duration

  return (
    <div
      style={{
        background: 'rgba(17,13,34,.9)',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', fontFamily: 'JetBrains Mono, monospace' }}>
          {formatTime(duration)}
        </div>
      </div>

      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          marginBottom: 10,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
        }}
      >
        {Array.from({ length: 60 }, (_, i) => {
          const h = 6 + Math.abs(Math.sin(i * 0.4) * Math.cos(i * 0.2)) * 26
          const played = (i / 60) * 100 <= progress
          return (
            <div
              key={i}
              style={{
                width: 3,
                height: h,
                borderRadius: 99,
                flexShrink: 0,
                background: played
                  ? 'linear-gradient(180deg,#a78bfa,#f472b6)'
                  : 'rgba(255,255,255,.12)',
                transition: 'background .1s',
              }}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#8b5cf6,#5b21b6)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px -6px rgba(139,92,246,.5)',
            flexShrink: 0,
          }}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          )}
        </button>
        <div style={{ flex: 1 }}>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 3,
              borderRadius: 99,
              background: 'rgba(255,255,255,.1)',
              overflow: 'hidden',
              marginBottom: 4,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              seekTo(((e.clientX - rect.left) / rect.width) * 100)
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg,#a78bfa,#f5c451)',
                borderRadius: 99,
                transition: 'width .1s',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: 'rgba(255,255,255,.3)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <span>{formatTime(currentSec)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
