import { supabaseAdmin as admin } from './admin'

/**
 * Busca o email de um usuário a partir do seu ID usando o
 * service role key (auth.users não é acessível via RLS comum).
 */
export async function getUserEmail(userId: string): Promise<string | null> {
    try {
        const { data: { user }, error } = await admin.auth.admin.getUserById(userId)
        if (error || !user) return null
        return user.email ?? null
    } catch {
        return null
    }
}

/**
 * Busca emails de múltiplos usuários de uma vez.
 * Retorna um Map de userId -> email.
 */
export async function getUserEmails(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    await Promise.all(
        userIds.map(async (id) => {
            const email = await getUserEmail(id)
            if (email) map.set(id, email)
        })
    )
    return map
}
