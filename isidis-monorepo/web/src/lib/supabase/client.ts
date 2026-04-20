import { createClient as _createClient } from '@supabase/supabase-js'

export function createClient() {
    return _createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
    )
}
