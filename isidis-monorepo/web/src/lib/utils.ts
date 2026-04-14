import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function pixKeyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CPF: 'CPF',
    CNPJ: 'CNPJ',
    EMAIL: 'E-mail',
    PHONE: 'Telefone',
    RANDOM: 'Chave Aleatória',
  }
  return map[type] ?? type
}

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Aguardando pagamento', color: 'text-yellow-400' },
  PAID: { label: 'Pago — em andamento', color: 'text-blue-400' },
  DELIVERED: { label: 'Entregue', color: 'text-green-400' },
  CANCELED: { label: 'Cancelado', color: 'text-red-400' },
  DISPUTED: { label: 'Em disputa', color: 'text-orange-400' },
}

export const DELIVERY_METHOD_MAP: Record<string, string> = {
  DIGITAL_SPREAD: 'Tiragem Digital',
  PHYSICAL_PHOTO: 'Tiragem Física (Foto)',
  VIDEO: 'Vídeo',
  OTHER: 'Outro',
}

export const SPECIALTY_MAP: Record<string, string> = {
  TAROT: 'Tarô',
  ASTROLOGY: 'Astrologia',
  NUMEROLOGY: 'Numerologia',
  CRYSTALS: 'Cristais',
  ORACLE: 'Oráculo',
  RUNES: 'Runas',
  MEDIUMSHIP: 'Mediunidade',
  OTHER: 'Outro',
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
