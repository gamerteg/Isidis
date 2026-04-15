import { z } from 'zod'

// ─── Pagination ────────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// ─── Readers ───────────────────────────────────────────────────────────────────
export const listReadersSchema = z.object({
  specialty: z.string().optional(),
  deck: z.string().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  min_rating: z.coerce.number().min(1).max(5).optional(),
  search: z.string().optional(),
  ids: z.preprocess((value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (Array.isArray(value)) {
      return value
        .flatMap((item) => String(item).split(','))
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return undefined
  }, z.array(z.string()).optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ─── Orders ────────────────────────────────────────────────────────────────────
const validStatuses = ['PENDING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELED'] as const

export const listOrdersSchema = z.object({
  // Aceita valor único ('PAID') ou múltiplos separados por vírgula ('DELIVERED,COMPLETED')
  status: z.string().optional().refine(
    (v) => !v || v.split(',').every((s) => validStatuses.includes(s as any)),
    { message: 'Status inválido' }
  ),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// ─── Wallet ────────────────────────────────────────────────────────────────────
export const listTransactionsSchema = z.object({
  type: z.enum(['SALE_CREDIT', 'PLATFORM_FEE', 'WITHDRAWAL']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})
