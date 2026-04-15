


import { createClient } from '@/lib/supabase/client'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Não autenticado.' }
    }

    const fullName = formData.get('full_name') as string
    const cellphone = formData.get('cellphone') as string
    const taxId = formData.get('tax_id') as string
    const bio = formData.get('bio') as string
    const avatarUrl = formData.get('avatar_url') as string
    const coverUrl = formData.get('cover_url') as string

    if (!fullName?.trim()) {
        return { error: 'Nome é obrigatório.' }
    }

    if (!cellphone?.trim()) {
        return { error: 'Celular é obrigatório.' }
    }

    if (!taxId?.trim() || taxId.replace(/\D/g, '').length !== 11) {
        return { error: 'CPF inválido. Digite os 11 dígitos.' }
    }

    const updates: any = {
        full_name: fullName.trim(),
        cellphone: cellphone.replace(/\D/g, ''),
        tax_id: taxId.replace(/\D/g, ''),
        bio: bio?.trim(),
        updated_at: new Date().toISOString(),
    }

    if (avatarUrl) updates.avatar_url = avatarUrl
    if (coverUrl) updates.cover_url = coverUrl

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('[Profile] Update failed:', error.message)
        return { error: 'Erro ao salvar perfil. Tente novamente.' }
    }

    
    return { success: true }
}
