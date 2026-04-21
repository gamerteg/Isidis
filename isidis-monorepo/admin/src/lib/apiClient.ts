import { supabase } from '@/lib/supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
