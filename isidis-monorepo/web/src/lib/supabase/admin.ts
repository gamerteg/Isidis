import { createClient as createClientClient } from './client'

export function createAdminClient() {
  return createClientClient()
}

export function createServiceRoleClient() {
  return createClientClient()
}

// Alias for pages that import supabaseAdmin directly.
// In Vite (CSR) there is no server-side context, so this uses the regular
// browser client. Admin operations that require the service_role key must
// go through the Fastify API backend.
export const supabaseAdmin = createClientClient()
