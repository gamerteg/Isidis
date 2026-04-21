import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'

let _instance: SupabaseClient | null = null

export function createClient(): SupabaseClient {
    if (!_instance) {
        _instance = _createClient(
            import.meta.env.VITE_SUPABASE_URL!,
            import.meta.env.VITE_SUPABASE_ANON_KEY!
        )
    }
    return _instance
}
