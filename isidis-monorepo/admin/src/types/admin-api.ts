export interface AdminOpsHealth {
  generated_at: string
  stuck_pending_payment_orders: number
  stuck_sale_credit_holds: number
  pending_withdrawals: number
  missing_env: string[]
  warnings: string[]
  has_issues: boolean
}

export interface AdminOrderListItem {
  id: string
  created_at: string
  status: string
  amount_total: number
  amount_platform_fee: number
  amount_reader_net: number
  amount_card_fee: number
  payment_method: string
  has_dispute: boolean
  disputed_at: string | null
  delivered_at: string | null
  client_id: string
  reader_id: string
  gig_id: string
  client_name: string
  reader_name: string
  gig_title: string
  mercadopago_payment_id: string | null
}

export type AdminOrderDetail = AdminOrderListItem & Record<string, unknown>

export interface AdminFinancialStats {
  total_revenue: number
  platform_fee: number
  total_repasse: number
  total_withdrawn: number
  pending_repasse: number
}

export interface PendingWithdrawalItem {
  id: string
  created_at: string
  amount: number
  status: string
  pix_key: string
  pix_key_type: string
  notes: string | null
  user_id: string
  user_name: string
}

export interface OrderFinancialRow {
  id: string
  created_at: string
  status: string
  amount_total: number
  amount_platform_fee: number
  amount_reader_net: number
  payment_method: string
  client_name: string
  reader_name: string
  gig_title: string
}

export interface AdminDashboardStats {
  totalUsers: number
  totalReaders: number
  approvedReaders: number
  pendingReaders: number
  pendingGigs: number
  openDisputes: number
  openTickets: number
  totalOrders: number
}

export interface AdminDashboardOverview {
  stats: AdminDashboardStats
  revenue: number
  recent_orders: OrderFinancialRow[]
  health: AdminOpsHealth
  generated_at: string
}

export interface AdminFinancialOverview {
  stats: AdminFinancialStats
  recent_orders: OrderFinancialRow[]
  health: AdminOpsHealth
  generated_at: string
}
