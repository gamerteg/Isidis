

import { createClient } from '@/lib/supabase/client'



export async function submitOnboardingStep1(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    const birthDate = formData.get('birth_date') as string
    const cpf = formData.get('cpf') as string
    const companyName = formData.get('company_name') as string
    const cnpj = formData.get('cnpj') as string
    const cbo = formData.get('cbo') as string

    const addressStreet = formData.get('address_street') as string
    const addressNumber = formData.get('address_number') as string
    const addressComplement = formData.get('address_complement') as string
    const addressNeighborhood = formData.get('address_neighborhood') as string
    const addressCity = formData.get('address_city') as string
    const addressState = formData.get('address_state') as string
    const addressZipCode = formData.get('address_zip_code') as string

    const pixKeyType = formData.get('pix_key_type') as string
    const pixKey = formData.get('pix_key') as string

    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('tax_id')
        .eq('id', user.id)
        .single()

    const updateData: any = {
        birth_date: birthDate,
        company_name: companyName,
        cnpj: cnpj ? cnpj.replace(/\D/g, "") : null, // Store clean CNPJ
        cbo: cbo,
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        address_zip_code: addressZipCode ? addressZipCode.replace(/\D/g, "") : null,
        pix_key_type: pixKeyType || 'CPF/CNPJ',
        pix_key: pixKey,
    }

    // Only update tax_id if it's not already set
    if (!existingProfile?.tax_id && cpf) {
        updateData.tax_id = cpf.replace(/\D/g, "")
    }

    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

    if (error) {
        console.error('Error saving step 1:', error)
        return { error: 'Erro ao salvar dados. Tente novamente.' }
    }

    
    return { success: true, nextStep: 2 }
}

export async function submitOnboardingStep2(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    // File uploads are handled on the client side to get the URL, 
    // but here we receive the URLs or paths.
    // For better security, we should upload from client using RLS policies, 
    // then send the paths here to update the profile.

    const docFrontParam = formData.get('document_front_url')
    const docBackParam = formData.get('document_back_url')
    const selfieParam = formData.get('selfie_url')

    if (!docFrontParam || !docBackParam || !selfieParam) {
        return { error: 'Todos os documentos são obrigatórios.' }
    }

    // Check if they are files or strings
    // In this implementation plan, we'll assume the client uploads to storage and sends the path/url.

    const documentFrontUrl = docFrontParam as string
    const documentBackUrl = docBackParam as string
    const selfieUrl = selfieParam as string

    const { error } = await supabase
        .from('profiles')
        .update({
            document_front_url: documentFrontUrl,
            document_back_url: documentBackUrl,
            selfie_url: selfieUrl
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error saving step 2:', error)
        return { error: 'Erro ao salvar documentos. Tente novamente.' }
    }

    
    return { success: true, nextStep: 3 }
}

export async function submitOnboardingStep3(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    const ethicsAccepted = formData.get('ethics_accepted') === 'on'
    const resultsDisclaimerAccepted = formData.get('results_disclaimer_accepted') === 'on'

    if (!ethicsAccepted || !resultsDisclaimerAccepted) {
        return { error: 'Você precisa aceitar todos os termos para continuar.' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            ethics_accepted_at: new Date().toISOString(),
            results_disclaimer_accepted_at: new Date().toISOString(),
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error saving step 3:', error)
        return { error: 'Erro ao salvar termos. Tente novamente.' }
    }

    
    return { success: true, nextStep: 4 }
}

export async function submitOnboardingStep4(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    const bio = formData.get('bio') as string
    const specialties = formData.getAll('specialties') as string[] // Assuming multi-select sends multiple values with same name
    const videoUrl = formData.get('profile_video_url') as string
    const avatarUrl = formData.get('avatar_url') as string

    // Also handling profile picture if uploaded here, but it's usually separate.
    // Assuming avatar_url is already handled or uploaded via client.

    const { error } = await supabase
        .from('profiles')
        .update({
            bio: bio,
            specialties: specialties,
            profile_video_url: videoUrl,
            avatar_url: avatarUrl, // Update avatar
            verification_status: 'PENDING' // Mark as pending review
        })
        .eq('id', user.id)

    if (error) {
        console.error('Error saving step 4:', error)
        return { error: 'Erro ao salvar perfil. Tente novamente.' }
    }

    
    window.location.href = "/dashboard/cartomante/under-review"; return null;}
