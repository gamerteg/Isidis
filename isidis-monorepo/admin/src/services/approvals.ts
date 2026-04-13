import { supabase, supabaseAdmin } from '@/lib/supabase'

export interface PendingReader {
  id: string
  full_name: string | null
  social_name: string | null
  avatar_url: string | null
  bio: string | null
  specialties: string[] | null
  verification_status: string
  created_at: string
  ethics_accepted_at: string | null
  tax_id: string | null
  cellphone: string | null
  birth_date: string | null
  pix_key_type: string | null
  pix_key: string | null
  email?: string
}

export interface ReaderDetail extends PendingReader {
  address_street: string | null
  address_number: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip_code: string | null
  document_front_url: string | null
  document_back_url: string | null
  selfie_url: string | null
  instagram_handle: string | null
  experience_years: number | null
}

export async function listPendingReaders(): Promise<PendingReader[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, social_name, avatar_url, bio, specialties, verification_status, created_at, ethics_accepted_at, tax_id, cellphone, birth_date, pix_key_type, pix_key')
    .eq('role', 'READER')
    .eq('verification_status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getReaderDetail(id: string): Promise<ReaderDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  let email = '—'
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
    email = authUser?.user?.email ?? '—'
  } catch { /* ok */ }

  return { ...data, email }
}

export async function getSignedDocUrl(path: string): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('http')) return path

  const { data } = await supabaseAdmin.storage
    .from('verification_documents')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export async function approveReader(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'APPROVED' })
    .eq('id', id)
  if (error) throw error

  // Notify reader
  await supabaseAdmin.from('notifications').insert({
    user_id: id,
    type: 'SYSTEM',
    title: 'Cadastro aprovado!',
    message: 'Seu cadastro foi aprovado. Agora você pode criar seus serviços e começar a atender.',
    link: '/dashboard/cartomante',
  })
}

export async function rejectReader(id: string, reason?: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'REJECTED' })
    .eq('id', id)
  if (error) throw error

  await supabaseAdmin.from('notifications').insert({
    user_id: id,
    type: 'SYSTEM',
    title: 'Cadastro não aprovado',
    message: reason ?? 'Seu cadastro não foi aprovado. Abra um ticket de suporte para mais informações.',
    link: '/dashboard',
  })
}

export async function suspendReader(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ verification_status: 'SUSPENDED' })
    .eq('id', id)
  if (error) throw error

  await supabaseAdmin.from('gigs').update({ is_active: false }).eq('owner_id', id)
}
