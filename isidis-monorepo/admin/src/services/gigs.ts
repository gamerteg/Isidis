import { supabase, supabaseAdmin } from '@/lib/supabase'

export interface PendingGig {
  id: string
  title: string
  description: string | null
  price: number
  category: string | null
  modality: string | null
  status: string
  image_url: string | null
  delivery_method: string | null
  delivery_time_hours: number | null
  created_at: string
  owner_id: string
  owner_name: string
  owner_verification_status: string | null
}

export async function listPendingGigs(): Promise<PendingGig[]> {
  const { data, error } = await supabaseAdmin
    .from('gigs')
    .select('id, title, description, price, category, modality, status, image_url, delivery_method, delivery_time_hours, created_at, owner_id')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  const gigs = data ?? []

  const ownerIds = [...new Set(gigs.map(g => g.owner_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, verification_status')
    .in('id', ownerIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return gigs.map(g => ({
    ...g,
    owner_name: profileMap.get(g.owner_id)?.full_name ?? 'Desconhecido',
    owner_verification_status: profileMap.get(g.owner_id)?.verification_status ?? null,
  }))
}

export async function listAllGigs(status?: string): Promise<PendingGig[]> {
  let query = supabaseAdmin
    .from('gigs')
    .select('id, title, description, price, category, modality, status, image_url, delivery_method, delivery_time_hours, created_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  const gigs = data ?? []

  const ownerIds = [...new Set(gigs.map(g => g.owner_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, verification_status')
    .in('id', ownerIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return gigs.map(g => ({
    ...g,
    owner_name: profileMap.get(g.owner_id)?.full_name ?? 'Desconhecido',
    owner_verification_status: profileMap.get(g.owner_id)?.verification_status ?? null,
  }))
}

export async function approveGig(id: string): Promise<void> {
  const { data: gig, error: fetchError } = await supabaseAdmin
    .from('gigs')
    .select('owner_id, title')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabaseAdmin
    .from('gigs')
    .update({ status: 'APPROVED' })
    .eq('id', id)
  if (error) throw error

  if (gig) {
    await supabaseAdmin.from('notifications').insert({
      user_id: gig.owner_id,
      type: 'SYSTEM',
      title: 'Serviço aprovado!',
      message: `Seu serviço "${gig.title}" foi aprovado e já pode ser ativado.`,
      link: '/dashboard/cartomante/servicos',
    })
  }
}

export async function rejectGig(id: string, reason?: string): Promise<void> {
  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('owner_id, title')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin
    .from('gigs')
    .update({ status: 'REJECTED' })
    .eq('id', id)
  if (error) throw error

  if (gig) {
    await supabaseAdmin.from('notifications').insert({
      user_id: gig.owner_id,
      type: 'SYSTEM',
      title: 'Serviço não aprovado',
      message: reason ?? `Seu serviço "${gig.title}" não foi aprovado. Edite e reenvie para revisão.`,
      link: '/dashboard/cartomante/servicos',
    })
  }
}

export function formatDeliveryMethod(method: string): string {
  const map: Record<string, string> = {
    DIGITAL_SPREAD: 'Tiragem Digital',
    PHYSICAL_PHOTO: 'Foto Física',
    VIDEO: 'Vídeo',
    OTHER: 'Outro',
  }
  return map[method] ?? method
}

export function formatModality(mod: string): string {
  const map: Record<string, string> = {
    TAROT: 'Tarot',
    ORACULO: 'Oráculo',
    BARALHO_CIGANO: 'Baralho Cigano',
    ASTROLOGIA: 'Astrologia',
    OUTRO: 'Outro',
  }
  return map[mod] ?? mod
}
