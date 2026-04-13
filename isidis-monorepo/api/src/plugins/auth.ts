import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

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

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // WeakMap para armazenar user por request (getter + setter mutável)
  const requestUserMap = new WeakMap<object, AuthUser>()

  fastify.decorateRequest('user', {
    getter(this: FastifyRequest) {
      return requestUserMap.get(this) as AuthUser
    },
    setter(this: FastifyRequest, val: AuthUser) {
      requestUserMap.set(this, val)
    },
  })

  // Hook to verify JWT on every request that needs auth
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Token de autenticação não fornecido' })
        }

        const token = authHeader.split(' ')[1]

        // Verificar token usando o client service role (já configurado)
        const { data: { user }, error } = await fastify.supabase.auth.getUser(token)

        if (error || !user) {
          request.log.warn({ error: error?.message }, 'Falha na validação do token')
          return reply.status(401).send({ error: 'Token inválido ou expirado' })
        }

        // Buscar perfil para obter role
        const { data: profile, error: profileError } = await fastify.supabase
          .from('profiles')
          .select('id, role, verification_status')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          request.log.warn({
            userId: user.id,
            profileError: profileError?.message,
            profileErrorCode: profileError?.code,
          }, 'Perfil não encontrado')
          return reply.status(401).send({
            error: 'Perfil não encontrado',
            detail: profileError?.message ?? 'Registro ausente na tabela profiles',
          })
        }

        request.user = {
          id: user.id,
          email: user.email!,
          role: profile.role,
          verification_status: profile.verification_status,
        }
      } catch (err) {
        request.log.error({ err }, 'Erro inesperado na autenticação')
        return reply.status(401).send({ error: 'Erro de autenticação' })
      }
    }
  )

  // Admin-only guard
  fastify.decorate(
    'requireAdmin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await (fastify as any).authenticate(request, reply)
      if (reply.sent) return // BUG-04: auth falhou e já enviou 401, não enviar segundo reply
      if (request.user?.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Acesso restrito a administradores' })
      }
    }
  )

  // Reader-only guard
  fastify.decorate(
    'requireReader',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await (fastify as any).authenticate(request, reply)
      if (reply.sent) return // BUG-04: auth falhou e já enviou 401, não enviar segundo reply
      if (request.user?.role !== 'READER') {
        return reply.status(403).send({ error: 'Acesso restrito a cartomantes' })
      }
    }
  )
}

export default fp(authPlugin, { name: 'auth' })
