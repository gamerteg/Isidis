

import { createClient } from "@/lib/supabase/client"



export async function toggleGigStatus(gigId: string, currentStatus: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Não autorizado')

    // Update
    const { error } = await supabase
        .from('gigs')
        .update({ is_active: !currentStatus })
        .eq('id', gigId)
        .eq('owner_id', user.id) // Ensure ownership

    if (error) {
        console.error('Erro ao alternar status do gig:', error)
        throw new Error('Falha ao atualizar status')
    }

    
    
}

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    console.log('Server Action: updateProfile called')
    console.log('Received avatar_url:', formData.get('avatar_url'))

    const updates = {
        full_name: formData.get('full_name') as string,
        bio: formData.get('bio') as string,
        tagline: formData.get('tagline') as string,
        cover_url: formData.get('cover_url') as string,
        years_of_experience: Number(formData.get('years_of_experience')),
        instagram_handle: formData.get('instagram_handle') as string,
        youtube_url: formData.get('youtube_url') as string,
        specialties: JSON.parse(formData.get('specialties') as string || '[]'),
        decks_used: JSON.parse(formData.get('decks_used') as string || '[]'),
        avatar_url: formData.get('avatar_url') as string,
        verification_status: 'APPROVED', // Auto-approve on update for now
        updated_at: new Date().toISOString(),
        profile_color: formData.get('profile_color') as string,
        max_orders_per_day: Number(formData.get('max_orders_per_day')) || 0,
        max_simultaneous_orders: Number(formData.get('max_simultaneous_orders')) || 0,
    }

    console.log('Updates object:', JSON.stringify(updates, null, 2))

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('Erro ao atualizar perfil:', error)
        return { error: 'Falha ao atualizar perfil: ' + error.message }
    }

    console.log('Profile updated successfully')

    
    
    return { success: true }
}

export async function createGig(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const pricingType = (formData.get('pricing_type') as string) || 'ONE_TIME'
    const readingsPerMonth = pricingType === 'RECURRING' ? Number(formData.get('readings_per_month')) || 4 : null

    const gigData = {
        owner_id: user.id,
        title: formData.get('title') as string,
        category: formData.get('category') as string,
        description: formData.get('description') as string,
        price: Number(formData.get('price')) * 100, // Convert to cents
        delivery_time_hours: Number(formData.get('delivery_time_hours')),
        delivery_method: formData.get('delivery_method') as string,
        image_url: formData.get('image_url') as string,
        tags: JSON.parse(formData.get('tags') as string || '[]'),
        requirements: JSON.parse(formData.get('requirements') as string || '[]'),
        add_ons: JSON.parse(formData.get('add_ons') as string || '[]'),
        pricing_type: pricingType,
        readings_per_month: readingsPerMonth,
        is_active: true,
        status: 'PENDING'
    }

    const { data, error } = await supabase
        .from('gigs')
        .insert(gigData)
        .select('id')
        .single()

    if (error) {
        console.error('Erro ao criar gig:', error)
        return { error: 'Falha ao criar gig' }
    }

    
    
    return { success: true, id: data.id }
}

export async function updateGig(gigId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    const pricingType = (formData.get('pricing_type') as string) || 'ONE_TIME'
    const readingsPerMonth = pricingType === 'RECURRING' ? Number(formData.get('readings_per_month')) || 4 : null

    const gigData = {
        title: formData.get('title') as string,
        category: formData.get('category') as string,
        description: formData.get('description') as string,
        price: Number(formData.get('price')) * 100, // Convert to cents
        delivery_time_hours: Number(formData.get('delivery_time_hours')),
        delivery_method: formData.get('delivery_method') as string,
        image_url: formData.get('image_url') as string,
        tags: JSON.parse(formData.get('tags') as string || '[]'),
        requirements: JSON.parse(formData.get('requirements') as string || '[]'),
        add_ons: JSON.parse(formData.get('add_ons') as string || '[]'),
        pricing_type: pricingType,
        readings_per_month: readingsPerMonth,
        status: 'PENDING', // Reset status to pending for review after edit
    }

    const { data, error } = await supabase
        .from('gigs')
        .update(gigData)
        .eq('id', gigId)
        .eq('owner_id', user.id)
        .select('id')
        .single()

    if (error) {
        console.error('Erro ao atualizar gig:', error)
        return { error: 'Falha ao atualizar gig' }
    }

    
    
    return { success: true, id: data?.id || gigId }
}
