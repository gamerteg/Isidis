import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL as string ?? 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const message = (json as any)?.error ?? `HTTP ${res.status}`
    throw new ApiError(res.status, message, json)
  }

  return json as T
}

async function uploadFile<T>(
  path: string,
  file: File,
  type: 'audio' | 'photo',
): Promise<T> {
  const authHeaders = await getAuthHeaders()
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders,
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = (json as any)?.error ?? `HTTP ${res.status}`
    throw new ApiError(res.status, message, json)
  }
  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, file: File, type: 'audio' | 'photo') =>
    uploadFile<T>(path, file, type),
}

export { ApiError }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  role: 'CLIENT' | 'READER' | 'ADMIN'
  avatar_url: string | null
  bio: string | null
  tagline: string | null
  specialties: string[] | null
  /** DB column: rating_average */
  rating_average: number | null
  /** DB column: reviews_count */
  reviews_count: number | null
  pix_key: string | null
  pix_key_type: string | null
  cellphone: string | null
  tax_id: string | null
  max_orders_per_day: number | null
  max_simultaneous_orders: number | null
  is_approved: boolean
  created_at: string
}

export interface Reader extends Profile {
  profile_color: string | null
  cover_url: string | null
  experience_years: number | null
  verification_status: string | null
  instagram_handle: string | null
  youtube_url: string | null
  decks_used: string[] | null
  ranking_score: number | null
  starting_price: number | null
  gigs: Gig[]
}

export interface Gig {
  id: string
  title: string
  description: string
  price: number
  image_url: string | null
  category: string | null
  tags: string[] | null
  delivery_method: string
  delivery_time_hours: number
  payment_methods: string[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  is_active: boolean
  owner_id: string
  requirements: Requirement[]
  add_ons: AddOn[]
  profiles?: Partial<Profile>
}

export interface Requirement {
  id: string
  label: string
  type: 'text' | 'choice'
  options?: string[]
  required: boolean
}

export interface AddOn {
  id: string
  label: string
  price: number
  type: 'SPEED' | 'EXTRA' | 'CUSTOM'
}

export interface Order {
  id: string
  status: 'PENDING_PAYMENT' | 'PAID' | 'DELIVERED' | 'CANCELED' | 'DISPUTED'
  amount_total: number
  amount_service_total: number
  amount_reader_net: number
  amount_platform_fee: number
  payment_method: 'PIX' | 'CARD'
  amount_card_fee: number | null
  card_fee_responsibility: 'READER' | 'CLIENT' | null
  asaas_payment_id: string | null
  created_at: string
  delivered_at: string | null
  requirements_answers: Record<string, string>
  selected_addons: string[]
  delivery_content: DeliveryContent | null
  reader_viewed_at: string | null
  gigs: Partial<Gig> | null
  client: Partial<Profile> | null
  reader: Partial<Profile> | null
}

export interface DeliveryCard {
  id: string
  name: string
  position: 'upright' | 'reversed'
  interpretation?: string
  audio_url?: string
  audio_file_name?: string
  order: number
}

export interface DeliverySection {
  type: 'text' | 'audio' | 'photo'
  content?: string
  url?: string
  file_name?: string
  order: number
}

export interface DeliveryContent {
  method: 'DIGITAL_SPREAD' | 'PHYSICAL'
  summary?: string
  cards: DeliveryCard[]
  sections: DeliverySection[]
}

export interface WalletBalance {
  available: number
  pending: number
  timeline: { order_id: string; amount: number; unlocks_at: string }[]
}

export interface Transaction {
  id: string
  type: 'CREDIT' | 'WITHDRAWAL'
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  description: string | null
  created_at: string
}

export interface PixPaymentResponse {
  data: {
    order_id: string
    pix_qr_code_id: string
    amount_total: number
    amount_service_total: number
    pix: {
      qr_code_base64: string
      copy_paste_code: string
      expires_at: string
    }
  }
}

export interface CardPaymentResponse {
  data: {
    order_id: string
    payment_method: 'CARD'
    amount_total: number
    amount_service_total: number
    amount_card_fee: number
    card_fee_responsibility: 'READER' | 'CLIENT'
    asaas_payment_id: string
    status: 'CONFIRMED' | 'PENDING'
  }
}

export interface PaymentStatusResponse {
  data: {
    status: 'PAID' | 'PENDING' | 'OVERDUE'
    order_id: string
  }
}

export interface ReadersListResponse {
  data: Reader[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export interface OrdersListResponse {
  data: Order[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export interface ReaderDashboard {
  data: {
    metrics: {
      total_gigs: number
      active_gigs: number
      gigs_in_review: number
      rejected_gigs: number
      pending_payment_orders: number
      paid_orders: number
      delivered_orders: number
      unread_paid_orders: number
      sales_last_30_days: number
      net_last_30_days: number
      average_ticket_last_30_days: number
      pix_orders_last_30_days: number
      card_orders_last_30_days: number
    }
    recent_orders: any[]
  }
}
