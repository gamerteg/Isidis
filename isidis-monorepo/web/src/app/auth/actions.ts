




import { createClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateCPF } from '@/lib/utils'
import { getPostAuthDestination } from '@/lib/bootstrap'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }
    const next = formData.get('next') as string | null

    const { error, data: authData } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Login error:', error.message)
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'Email ou senha incorretos.' }
        }
        return { error: 'Ocorreu um erro ao entrar. Tente novamente.' }
    }

    const role = authData.user?.user_metadata?.role
    const destination = await getPostAuthDestination(role, authData.user!.id, next)
    window.location.href = destination; return null;}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string || 'CLIENT'

    // Basic fields
    // Basic fields
    const cpf = (formData.get('cpf') as string) || (formData.get('cpf_client') as string)
    const cellphone = (formData.get('cellphone') as string) || (formData.get('cellphone_client') as string)
    const socialName = formData.get('social_name') as string
    const sexo = formData.get('sexo') as string

    // Additional fields (Reader)
    const birthDate = formData.get('birth_date') as string
    const addressZip = formData.get('address_zip_code') as string
    const addressStreet = formData.get('address_street') as string
    const addressNumber = formData.get('address_number') as string
    const addressNeighborhood = formData.get('address_neighborhood') as string
    const addressCity = formData.get('address_city') as string
    const addressState = formData.get('address_state') as string

    const pixKeyType = formData.get('pix_key_type') as string
    const pixKey = formData.get('pix_key') as string

    const bio = formData.get('bio') as string
    const specialties = formData.get('specialties') ? JSON.parse(formData.get('specialties') as string) : []
    const ethicsAccepted = formData.get('ethics_accepted') === 'on'

    if (cpf && !validateCPF(cpf)) {
        return { error: 'O CPF informado é inválido.' }
    }


    const { error, data: authData } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
                social_name: socialName
            }
        }
    })

    if (error) {
        console.error('Signup error:', error.message)
        if (error.message.includes('User already registered')) {
            return { error: 'Este email já está cadastrado.' }
        }
        return { error: 'Erro ao criar conta. Tente novamente.' }
    }

    if (authData.user) {
        const userId = authData.user.id

        // Initialize update data
        let updateData: any = {
            id: userId,
            full_name: fullName,
            social_name: socialName,
            role: role,
            sexo: sexo || null,
            cellphone: cellphone ? cellphone.replace(/\D/g, "") : null,
            tax_id: cpf ? cpf.replace(/\D/g, "") : null, // Store clean CPF
        }

        // Handle File Uploads & Extended Data for READER
        if (role === 'READER') {
            const docFront = formData.get('doc_front') as File
            const docBack = formData.get('doc_back') as File
            const docSelfie = formData.get('doc_selfie') as File

            let frontUrl = null
            let backUrl = null
            let selfieUrl = null

            // Helper for admin upload
            const uploadAsAdmin = async (file: File, path: string) => {
                if (!file || file.size === 0) return null

                const arrayBuffer = await file.arrayBuffer()
                const buffer = new Uint8Array(arrayBuffer)
                const { data, error } = await supabaseAdmin.storage
                    .from('verification_documents')
                    .upload(`${userId}/${path}`, buffer, {
                        contentType: file.type,
                        upsert: true
                    })
                if (error) {
                    console.error(`Upload error ${path}:`, error)
                    throw new Error(`Erro no upload do documento: ${path}`)
                }
                return data?.path
            }

            try {
                if (docFront && docFront.size > 0) frontUrl = await uploadAsAdmin(docFront, `front-${Date.now()}`)
                if (docBack && docBack.size > 0) backUrl = await uploadAsAdmin(docBack, `back-${Date.now()}`)
                if (docSelfie && docSelfie.size > 0) selfieUrl = await uploadAsAdmin(docSelfie, `selfie-${Date.now()}`)
            } catch (vErr: any) {
                return { error: vErr.message }
            }

            updateData = {
                ...updateData,
                birth_date: birthDate || null,
                address_zip_code: addressZip || null,
                address_street: addressStreet || null,
                address_number: addressNumber || null,
                address_neighborhood: addressNeighborhood || null,
                address_city: addressCity || null,
                address_state: addressState || null,
                pix_key_type: pixKeyType || 'CPF/CNPJ',
                pix_key: pixKey || null,
                bio: bio || null,
                specialties: specialties || [],
                document_front_url: frontUrl,
                document_back_url: backUrl,
                selfie_url: selfieUrl,
                verification_status: 'PENDING',
                ethics_accepted_at: ethicsAccepted ? new Date().toISOString() : null
            }
        }

        // Update profile using Admin client to bypass RLS
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(updateData)

        if (profileError) {
            console.error('Profile update error:', profileError)
            return { error: 'Sua conta foi criada, mas houve um erro ao salvar os dados do perfil. Por favor, complete seu perfil no painel.' }
        }
    }

    
    window.location.href = "/register/confirm"; return null;}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    window.location.href = "/login"; return null;}

// Client-side implementation used in /recover page to handle PKCE cookies correctly
// export async function forgotPassword(prevState: any, formData: FormData) {
//     const supabase = await createClient()
//     const email = formData.get('email') as string
//     const callbackUrl = `${import.meta.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`
//
//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: callbackUrl,
//     })
//
//     if (error) {
//         console.error('Forgot password error:', error.message)
//         return { error: 'Não foi possível enviar o email de recuperação. Tente novamente.' }
//     }
//
//     return { success: 'Verifique seu email para o link de recuperação.' }
// }

export async function resetPassword(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
        return { error: 'As senhas não coincidem.' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        console.error('Reset password error:', error.message)
        return { error: 'Não foi possível redefinir a senha. Tente novamente.' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    const destination = user ? await getPostAuthDestination(user.user_metadata?.role, user.id) : '/dashboard'

    window.location.href = destination; return null;}
