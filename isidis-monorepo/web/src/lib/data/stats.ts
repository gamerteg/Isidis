import { createClient } from '@/lib/supabase/client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { Gig, Profile } from '@/types'

const getPublicClient = () => createSupabaseClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export type LandingStats = {
    totalConsultations: number
    satisfactionRate: number
    activeReaders: number
    averageRating: number
}

export type CategoryCount = {
    category: string
    count: number
    slug: string
    image: string
}

const _getLandingStats = async (): Promise<LandingStats> => {
    const supabase = getPublicClient()

    // count completed orders
    const { count: totalConsultations } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['COMPLETED', 'DELIVERED'])

    // count active readers
    const { count: activeReaders } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'READER')
    //.eq('verification_status', 'APPROVED') // Update if this column exists, otherwise remove

    // calculate average rating from all reviews
    const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')

    const totalRating = reviews?.reduce((acc, curr) => acc + curr.rating, 0) || 0
    const averageRating = reviews && reviews.length > 0 ? totalRating / reviews.length : 5.0

    // Mock satisfaction rate for now as we don't have a direct metric, or derive from 4+ star reviews
    const positiveReviews = reviews?.filter(r => r.rating >= 4).length || 0
    const satisfactionRate = reviews && reviews.length > 0 ? Math.round((positiveReviews / reviews.length) * 100) : 98

    return {
        totalConsultations: totalConsultations || 0,
        satisfactionRate,
        activeReaders: activeReaders || 0,
        averageRating: Number(averageRating.toFixed(1))
    }
}

export const getLandingStats = _getLandingStats

const CATEGORY_META: Record<string, { label: string; image: string }> = {
    'Love & Relationships': { label: 'Amor e Relacionamentos', image: '/img/Relacionamento.png' },
    'Career & Finance':     { label: 'Carreira e Finanças',    image: '/img/Financeiro.png' },
    'Spiritual Growth':     { label: 'Crescimento Espiritual', image: '/img/Espiritualidade.png' },
    'Health & Wellness':    { label: 'Saúde e Bem-estar',      image: '/img/Bem-estar.png' },
}

const _getCategoryCounts = async (): Promise<CategoryCount[]> => {
    const supabase = getPublicClient()

    const { data: gigs } = await supabase
        .from('gigs')
        .select('category, owner_id')
        .eq('is_active', true)
        .eq('status', 'APPROVED')

    const readersByCategory: Record<string, Set<string>> = {}
    gigs?.forEach((gig: { category: string; owner_id: string }) => {
        if (!gig.category || !CATEGORY_META[gig.category]) return
        if (!readersByCategory[gig.category]) readersByCategory[gig.category] = new Set()
        readersByCategory[gig.category].add(gig.owner_id)
    })

    return Object.entries(CATEGORY_META).map(([slug, meta]) => ({
        category: meta.label,
        count: readersByCategory[slug]?.size ?? 0,
        slug,
        image: meta.image,
    }))
}

export const getCategoryCounts = _getCategoryCounts

export async function getBestSellingGigs(limit: number = 3): Promise<(Gig & { owner: Profile })[]> {
    const supabase = createClient()

    const { data: gigs } = await supabase
        .from('gigs')
        .select('*, owner:profiles(*)')
        .eq('is_active', true)
        .eq('status', 'APPROVED')
        .limit(20)

    if (!gigs?.length) return []

    // One gig per reader — owner can be object or array depending on Supabase response
    const seenOwners = new Set<string>()
    const diverse = gigs.filter((gig: any) => {
        const owner = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner
        const id = owner?.id
        if (!id || seenOwners.has(id)) return false
        seenOwners.add(id)
        return true
    })

    return diverse.slice(0, limit) as (Gig & { owner: Profile })[]
}
