import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

export function getYouTubeEmbedUrl(url: string | null | undefined) {
  if (!url) return null

  // Support various YouTube URL formats
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/shorts/dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ

  let videoId = ''

  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1)
    } else if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname.includes('/shorts/')) {
        videoId = urlObj.pathname.split('/shorts/')[1]
      } else if (urlObj.pathname.includes('/embed/')) {
        videoId = urlObj.pathname.split('/embed/')[1]
      } else {
        videoId = urlObj.searchParams.get('v') || ''
      }
    }
  } catch (e) {
    // If URL is invalid, try manual regex fallback
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/|.*shorts\/))([^?&"'>]+)/)
    if (match) videoId = match[1]
  }

  if (!videoId) return null

  return `https://www.youtube.com/embed/${videoId}`
}

export function validateCPF(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, "")

  if (cleanCpf.length !== 11) return false

  // Check for common invalid CPFs (all digits same)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false

  // Validate first digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cleanCpf.charAt(9))) return false

  // Validate second digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cleanCpf.charAt(10))) return false

  return true
}

export function stripEmojis(str: string): string {
  if (!str) return ""
  // Regex to match emojis and other non-standard characters
  return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()
}
