import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient
  }
}

const supabasePlugin: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  fastify.decorate('supabase', supabase)
}

export default fp(supabasePlugin, { name: 'supabase' })
