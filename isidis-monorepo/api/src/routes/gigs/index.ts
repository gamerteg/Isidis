import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const createGigSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  category: z.string(),
  price: z.number().int().min(100), // mínimo R$1,00 em centavos
  image_url: z.string().url().optional(),
  delivery_time_hours: z.number().int().min(1),
  delivery_method: z.enum(['DIGITAL_SPREAD', 'PHYSICAL_PHOTO', 'VIDEO', 'OTHER']),
  tags: z.array(z.string()).optional(),
  requirements: z.array(z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(['text', 'choice']),
    options: z.array(z.string()).optional(),
    required: z.boolean(),
  })).optional(),
  add_ons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    price: z.number().int().min(0),
    type: z.enum(['SPEED', 'EXTRA', 'CUSTOM']),
  })).optional(),
  pricing_type: z.enum(['ONE_TIME', 'RECURRING']).default('ONE_TIME'),
  readings_per_month: z.number().int().optional(),
  payment_methods: z
    .array(z.enum(['PIX', 'CARD']))
    .min(1)
    .refine((value) => new Set(value).size === value.length, {
      message: 'payment_methods nao pode repetir valores',
    })
    .default(['PIX', 'CARD']),
  card_fee_responsibility: z.string().optional(),
})

const gigsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /gigs/:id — detalhe público do gig
  fastify.get<{ Params: { id: string } }>('/gigs/:id', async (request, reply) => {
    const { id } = request.params

    const { data: gig, error } = await fastify.supabase
      .from('gigs')
      .select(`
        id, owner_id, title, description, price, category, image_url,
        delivery_time_hours, delivery_method, tags, requirements,
        add_ons, pricing_type, readings_per_month, payment_methods,
        card_fee_responsibility, is_active, status,
        created_at,
        profiles!owner_id(
          id, full_name, avatar_url, bio, rating_average, reviews_count,
          experience_years, verification_status, profile_color
        )
      `)
      .eq('id', id)
      .eq('status', 'APPROVED')
      .eq('is_active', true)
      .single()

    if (error || !gig) {
      return reply.status(404).send({ error: 'Serviço não encontrado' })
    }

    return reply.send({ data: gig })
  })

  // GET /gigs — listar gigs do reader autenticado
  fastify.get(
    '/gigs',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { data, error } = await fastify.supabase
        .from('gigs')
        .select(`
          id, title, description, price, category, image_url,
          is_active, status, delivery_time_hours, delivery_method,
          requirements, add_ons, payment_methods, card_fee_responsibility,
          created_at
        `)
        .eq('owner_id', request.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({ data })
    }
  )

  // POST /gigs — criar novo gig
  fastify.post(
    '/gigs',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const body = createGigSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { data, error } = await fastify.supabase
        .from('gigs')
        .insert({
          ...body.data,
          card_fee_responsibility: 'READER',
          owner_id: request.user.id,
          status: 'PENDING',
          is_active: false,
        })
        .select()
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      return reply.status(201).send({ data })
    }
  )

  // PATCH /gigs/:id — editar gig
  fastify.patch<{ Params: { id: string } }>(
    '/gigs/:id',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const { id } = request.params

      // Garantir que o gig pertence ao reader
      const { data: existing } = await fastify.supabase
        .from('gigs')
        .select('id, owner_id')
        .eq('id', id)
        .eq('owner_id', request.user.id)
        .single()

      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      const body = createGigSchema.partial().safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      // Edições enviam de volta para PENDING se mudar campos sensíveis
      const sensitiveFields = ['price', 'title', 'description', 'category']
      const hasSensitiveChange = Object.keys(body.data).some(k => sensitiveFields.includes(k))

      const updates: Record<string, unknown> = { ...body.data }
      updates.card_fee_responsibility = 'READER'
      if (hasSensitiveChange) {
        updates.status = 'PENDING'
        updates.is_active = false
      }

      const { data, error } = await fastify.supabase
        .from('gigs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      return reply.send({ data })
    }
  )

  // PATCH /gigs/:id/toggle — ativar/desativar gig
  fastify.patch<{ Params: { id: string } }>(
    '/gigs/:id/toggle',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const { id } = request.params

      const { data: existing } = await fastify.supabase
        .from('gigs')
        .select('id, owner_id, is_active, status')
        .eq('id', id)
        .eq('owner_id', request.user.id)
        .single()

      if (!existing) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      if (existing.status !== 'APPROVED') {
        return reply.status(400).send({ error: 'Apenas serviços aprovados podem ser ativados' })
      }

      const { data, error } = await fastify.supabase
        .from('gigs')
        .update({ is_active: !existing.is_active })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      return reply.send({ data })
    }
  )
}

export default gigsRoutes
