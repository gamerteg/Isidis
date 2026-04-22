import { supabase } from '@/lib/supabase'

let rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
if (rawBaseUrl && !rawBaseUrl.startsWith('http')) {
  rawBaseUrl = `https://${rawBaseUrl}`
}
const API_BASE_URL = rawBaseUrl

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type RequestOptions = {
  body?: unknown
  method?: 'GET' | 'POST' | 'PATCH'
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token ?? null
}

async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const token = await getAccessToken()
  const headers = new Headers({
    Accept: 'application/json',
  })

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    // If unauthorized, clear session to prevent loops with stale tokens
    if (response.status === 401 && token) {
      console.warn('[apiClient] 401 Unauthorized detected. Signing out...')
      supabase.auth.signOut()
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login'
      }
    }

    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Erro HTTP ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export function apiGet<T>(path: string) {
  return requestJson<T>(path)
}

export function apiPost<T>(path: string, body?: unknown) {
  return requestJson<T>(path, { method: 'POST', body })
}

export function apiPatch<T>(path: string, body?: unknown) {
  return requestJson<T>(path, { method: 'PATCH', body })
}

export function isApiNotFoundError(error: unknown) {
  return error instanceof ApiError && error.status === 404
}
