export type UserRole = 'CLIENT' | 'READER' | 'ADMIN' | 'USER'
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'DELIVERED' | 'COMPLETED' | 'CANCELED'
export type PaymentMethod = 'PIX' | 'CARD'

export interface Profile {
  id: string
  full_name: string
  avatar_url?: string | null
  email?: string | null
  role: UserRole
  sexo?: string | null
  bio?: string | null
  specialties?: string[]
  verification_status?: VerificationStatus | null
  experience_years?: number | null
  instagram_handle?: string | null
  cpf_cnpj?: string | null
  rating_average?: number | null
  reviews_count?: number | null
  pix_key?: string | null
  pix_key_type?: string | null
  cellphone?: string | null
}

export interface ReaderGigListItem {
  id: string
  title: string
  price: number
  category?: string | null
  is_active?: boolean
  status?: string
  delivery_time_hours?: number | null
  image_url?: string | null
}

export interface ReaderListItem {
  id: string
  full_name: string | null
  avatar_url?: string | null
  bio?: string | null
  specialties?: string[] | null
  tagline?: string | null
  profile_color?: string | null
  cover_url?: string | null
  rating_average?: number | null
  reviews_count?: number | null
  experience_years?: number | null
  verification_status?: VerificationStatus | null
  instagram_handle?: string | null
  decks_used?: string[] | null
  max_orders_per_day?: number | null
  max_simultaneous_orders?: number | null
  starting_price?: number | null
  gigs: ReaderGigListItem[]
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  pages: number
}

export interface ReadersListResponse {
  data: ReaderListItem[]
  pagination: PaginationMeta
}

export interface GigRequirement {
  id: string
  question: string
  type: 'text' | 'choice'
  options?: string[]
  required: boolean
}

export interface GigAddOn {
  id: string
  title: string
  description?: string
  price: number
  type: 'SPEED' | 'EXTRA' | 'CUSTOM'
}

export interface Gig {
  id: string
  title: string
  description: string
  price: number
  image_url?: string | null
  slug?: string
  owner_id?: string
  created_at?: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  owner?: Profile
  requirements?: GigRequirement[]
  add_ons?: GigAddOn[]
  category?: string | null
  delivery_time_hours?: number | null
  delivery_method?: string | null
  tags?: string[]
  pricing_type?: 'ONE_TIME' | 'RECURRING'
  readings_per_month?: number | null
}

export interface CheckoutConfigResponse {
  gateway: 'mercadopago'
  public_key: string
  locale: 'pt-BR'
  payer?: {
    email?: string
    identification?: {
      type: 'CPF'
      number: string
    }
  }
}

export interface CheckoutCreatePayload {
  order_id?: string
  gig_id: string
  add_on_ids?: string[]
  requirements_answers?: Record<string, string>
  payment_method: PaymentMethod
  transaction_amount?: number
  card_token?: string
  payment_method_id?: string
  installments?: number
  issuer_id?: string
  device_id?: string
  payer?: {
    email?: string
    first_name?: string
    last_name?: string
    firstName?: string
    lastName?: string
    identification?: {
      type?: string
      number?: string
    }
    address?: {
      zip_code?: string
      street_number?: string | number
      federal_unit?: string
      city?: string
      neighborhood?: string
      street_name?: string
    }
  }
  brick_payment_type?: string
  brick_selected_payment_method?: string
  brick_additional_data?: {
    bin?: string
    lastFourDigits?: string
    cardholderName?: string
    paymentTypeId?: string
  }
  card_holder_name?: string
  card_holder_postal_code?: string
  card_holder_address_number?: string
  card_number?: string
  card_expiry_month?: string
  card_expiry_year?: string
  card_cvv?: string
}

export interface CheckoutPixResponse {
  order_id: string
  pix_qr_code_id: string
  amount_total: number
  amount_service_total: number
  pix: {
    qr_code_base64: string | null
    copy_paste_code: string | null
    expires_at: string | null
  }
}

export interface CheckoutCardResponse {
  order_id: string
  payment_method: 'CARD'
  amount_total: number
  amount_service_total: number
  amount_card_fee: number | null
  card_fee_responsibility: 'READER' | null
  mercadopago_payment_id?: string
  payment_id?: string
  preference_id?: string
  checkout_url?: string
  status: 'CONFIRMED' | 'PENDING'
}

export interface CheckoutPaymentResponse {
  order_id: string
  payment_method?: PaymentMethod
  amount_total: number
  amount_service_total: number
  amount_card_fee?: number | null
  card_fee_responsibility?: 'READER' | null
  mercadopago_payment_id?: string
  payment_id?: string
  status?: 'CONFIRMED' | 'PENDING'
  pix_qr_code_id?: string
  pix?: {
    qr_code_base64: string | null
    copy_paste_code: string | null
    expires_at: string | null
  }
}

export interface PaymentStatusResponse {
  status: string
  order_id: string
}

export interface OrderSummary {
  id: string
  status: OrderStatus
  amount_total: number
  amount_service_total?: number | null
  amount_reader_net?: number | null
  amount_platform_fee?: number | null
  payment_method?: PaymentMethod | null
  amount_card_fee?: number | null
  card_fee_responsibility?: 'READER' | null
  created_at: string
  reader_viewed_at?: string | null
  requirements_answers?: Record<string, string>
  selected_addons?: string[]
  gigs?: Pick<Gig, 'id' | 'title' | 'price' | 'image_url' | 'delivery_time_hours' | 'delivery_method'>
  client?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  reader?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface OrderDetail extends OrderSummary {
  delivered_at?: string | null
  mercadopago_payment_id?: string | null
  delivery_content?: any
  gigs?: Gig
  client?: Profile
  reader?: Profile
  subscriptions?: {
    id: string
    status: string
    readings_per_month?: number | null
    readings_done_this_period?: number | null
  } | null
}

export interface WalletBalance {
  available: number
  pending: number
  total: number
  reservedWithdrawals: number
  pendingItems: Array<{
    amount: number
    releasesAt: string
    orderId?: string | null
    transactionId: string
  }>
}

export interface WalletTransaction {
  id: string
  amount: number
  type: 'SALE_CREDIT' | 'WITHDRAWAL' | string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string
  created_at: string
  external_id?: string | null
  orders?: {
    id: string
    payment_method?: PaymentMethod | null
    amount_card_fee?: number | null
    card_fee_responsibility?: 'READER' | null
    gigs?: {
      title?: string | null
    } | null
  } | null
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read: boolean
  order_id?: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string | null
  created_at: string
  read_at?: string | null
}

export interface Subscription {
  id: string
  gig_id: string
  client_id: string
  reader_id: string
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
  monthly_price: number
  readings_per_month: number
  readings_done_this_period: number
  period_start: string
  period_end: string
  next_reading_due: string
  last_payment_at?: string
  created_at: string
  updated_at: string
  gig?: Gig
  client?: Profile
  reader?: Profile
}
