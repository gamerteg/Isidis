import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

export interface AuthUser {
  id: string
  email: string
  role: 'CLIENT' | 'READER' | 'ADMIN'
  verification_status?: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

type CachedProfile = Pick<AuthUser, 'id' | 'role' | 'verification_status'>

const profileCache = new Map<string, { profile: CachedProfile; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function getCachedProfile(userId: string): CachedProfile | null {
  const entry = profileCache.get(userId)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    profileCache.delete(userId)
    return null
  }

  return entry.profile
}

function setCachedProfile(userId: string, profile: CachedProfile) {
  profileCache.set(userId, {
    profile,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const requestUserMap = new WeakMap<object, AuthUser>()

  fastify.decorateRequest('user', {
    getter(this: FastifyRequest) {
      return requestUserMap.get(this) as AuthUser
    },
    setter(this: FastifyRequest, val: AuthUser) {
      requestUserMap.set(this, val)
    },
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Token de autenticacao nao fornecido' })
        }

        const token = authHeader.split(' ')[1]
        const { data: { user }, error } = await fastify.supabase.auth.getUser(token)

        if (error || !user) {
          request.log.warn({ error: error?.message }, 'Falha na validacao do token')
          return reply.status(401).send({ error: 'Token invalido ou expirado' })
        }

        let profile = getCachedProfile(user.id)

        if (!profile) {
          const { data, error: profileError } = await fastify.supabase
            .from('profiles')
            .select('id, role, verification_status')
            .eq('id', user.id)
            .single()

          if (profileError || !data) {
            const profileErrorCode = profileError?.code
            const profileErrorMessage = profileError?.message

            if (profileErrorCode === 'PGRST116' || !data) {
              const metaRole = user.user_metadata?.role === 'READER' ? 'READER' : 'CLIENT'
              const metaName =
                user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario Sem Nome'

              const { data: newProfile, error: insertError } = await fastify.supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  role: metaRole,
                  full_name: metaName,
                  verification_status: 'PENDING',
                })
                .select('id, role, verification_status')
                .single()

              if (insertError || !newProfile) {
                request.log.warn(
                  {
                    userId: user.id,
                    insertError: insertError?.message,
                  },
                  'Falha na recuperacao automatica de perfil',
                )
                return reply.status(401).send({
                  error: 'Perfil nao encontrado',
                  detail: 'O perfil estava ausente e a criacao automatica falhou.',
                })
              }

              profile = newProfile
            } else {
              request.log.warn(
                {
                  userId: user.id,
                  profileError: profileErrorMessage,
                  profileErrorCode,
                },
                'Erro de banco no perfil',
              )
              return reply.status(401).send({
                error: 'Erro de sessao',
                detail: profileErrorMessage ?? 'Falha ao processar perfil',
              })
            }
          } else {
            profile = data
          }

          setCachedProfile(user.id, profile)
        }

        request.user = {
          id: user.id,
          email: user.email!,
          role: profile.role,
          verification_status: profile.verification_status,
        }
      } catch (err) {
        request.log.error({ err }, 'Erro inesperado na autenticacao')
        return reply.status(401).send({ error: 'Erro de autenticacao' })
      }
    },
  )

  fastify.decorate(
    'requireAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await (fastify as any).authenticate(request, reply)
      if (reply.sent) return
      if (request.user?.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Acesso restrito a administradores' })
      }
    },
  )

  fastify.decorate(
    'requireReader',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await (fastify as any).authenticate(request, reply)
      if (reply.sent) return
      if (request.user?.role !== 'READER') {
        return reply.status(403).send({ error: 'Acesso restrito a cartomantes' })
      }
    },
  )
}

export default fp(authPlugin, { name: 'auth' })
