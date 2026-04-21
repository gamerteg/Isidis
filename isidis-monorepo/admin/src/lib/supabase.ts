import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseServiceRoleKey = (import.meta.env as ImportMetaEnv & {
  VITE_SUPABASE_SERVICE_ROLE_KEY?: string
}).VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

// Client used for auth (anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'isidis-admin-auth',
  },
})

// Legacy alias kept for non-privileged client usage in a few realtime helpers.
// Sensitive admin data must go through the backend API.
export const supabaseAdmin = supabase

// Temporary compatibility client: only used when the deployed API still does not expose /admin/*
// and the admin needs to fall back to the previous direct Supabase reads.
export const supabaseLegacyAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase
