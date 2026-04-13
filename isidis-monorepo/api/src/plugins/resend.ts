import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { Resend } from 'resend'

declare module 'fastify' {
  interface FastifyInstance {
    resend: Resend
  }
}

const resendPlugin: FastifyPluginAsync = async (fastify) => {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  fastify.decorate('resend', resend)
}

export default fp(resendPlugin, { name: 'resend' })
