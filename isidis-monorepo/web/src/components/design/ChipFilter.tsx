import React from 'react'

type Props = {
  label: string
  active?: boolean
  emoji?: string
  onClick?: () => void
  className?: string
}

export function ChipFilter({ label, active, emoji, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip-filter${active ? ' active' : ''}${className ? ' ' + className : ''}`}
      style={{ flexShrink: 0 }}
    >
      {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
      {label}
    </button>
  )
}

export const DEFAULT_CATEGORIES = [
  { name: 'Amor', emoji: '♥' },
  { name: 'Trabalho', emoji: '✦' },
  { name: 'Família', emoji: '☽' },
  { name: 'Espiritual', emoji: '◈' },
  { name: 'Finanças', emoji: '⊕' },
  { name: 'Saúde', emoji: '✿' },
] as const
