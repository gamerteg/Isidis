import { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

function normalizePixKeyType(rawValue: unknown, pixKey?: unknown): string | null {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return null

  const normalized = rawValue.trim().toUpperCase()
  const digits = typeof pixKey === 'string' ? pixKey.replace(/\D/g, '') : ''

  switch (normalized) {
    case 'CPF':
      return 'CPF'
    case 'CNPJ':
      return 'CNPJ'
    case 'CPF/CNPJ':
      return digits.length > 11 ? 'CNPJ' : 'CPF'
    case 'EMAIL':
      return 'EMAIL'
    case 'PHONE':
    case 'CELULAR':
    case 'TELEFONE':
      return 'PHONE'
    case 'RANDOM':
    case 'EVP':
    case 'ALEATORIA':
    case 'CHAVE ALEATORIA':
      return 'RANDOM'
    default:
      return null
  }
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login — login com email e senha, retorna access_token
  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    const supabaseAuth = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: body.data.email,
      password: body.data.password,
    })

    if (error || !data.session) {
      return reply.status(401).send({ error: 'Email ou senha incorretos' })
    }

    return reply.send({
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    })
  })
  // GET /me — perfil do usuário autenticado
  fastify.get(
    '/me',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { data: profile, error } = await fastify.supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, role, bio, specialties,
          verification_status, experience_years, rating_average,
          reviews_count, tagline, profile_color, cover_url,
          instagram_handle, youtube_url, decks_used,
          max_orders_per_day, max_simultaneous_orders,
          pix_key_type, pix_key, cellphone, tax_id,
          sexo, birth_date, social_name, notification_preferences,
          created_at
        `)
        .eq('id', request.user.id)
        .single()

      if (error || !profile) {
        return reply.status(404).send({ error: 'Perfil não encontrado' })
      }

      return reply.send({
        data: {
          ...profile,
          pix_key_type: normalizePixKeyType(profile.pix_key_type, profile.pix_key) ?? profile.pix_key_type,
        },
      })
    }
  )

  // PATCH /me — atualizar perfil
  fastify.patch(
    '/me',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const allowedFields = [
        'full_name', 'avatar_url', 'bio', 'specialties', 'tagline',
        'profile_color', 'cover_url', 'instagram_handle', 'youtube_url',
        'decks_used', 'max_orders_per_day', 'max_simultaneous_orders',
        'cellphone', 'tax_id', 'sexo', 'birth_date', 'social_name',
        'notification_preferences', 'pix_key', 'pix_key_type',
      ]

      const body = request.body as Record<string, unknown>
      const updates: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field]
      }

      if (body.pix_key_type !== undefined) {
        const normalizedPixKeyType = normalizePixKeyType(body.pix_key_type, body.pix_key)
        if (!normalizedPixKeyType) {
          return reply.status(400).send({ error: 'Tipo de chave PIX invalido' })
        }
        updates.pix_key_type = normalizedPixKeyType
      }

      updates.updated_at = new Date().toISOString()

      const { data, error } = await fastify.supabase
        .from('profiles')
        .update(updates)
        .eq('id', request.user.id)
        .select()
        .single()

      if (error) {
        return reply.status(400).send({ error: error.message })
      }

      return reply.send({ data })
    }
  )
}

export default authRoutes
