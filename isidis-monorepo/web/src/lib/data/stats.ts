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

const _getCategoryCounts = async (): Promise<CategoryCount[]> => {
    const supabase = getPublicClient()

    // This is a bit complex in Supabase without a dedicated category table/column on profiles or gigs.
    // Assuming 'specialties' in profiles or some category field in gigs. 
    // Based on current schema, profiles has 'specialties' array.

    // We'll fetch all readers and aggregate their specialties
    const { data: readers } = await supabase
        .from('profiles')
        .select('specialties')
        .eq('role', 'READER')

    const counts: Record<string, number> = {
        'Amor & Relacionamentos': 0,
        'Carreira & Financas': 0,
        'Espiritualidade': 0,
        'Saude & Bem-estar': 0
    }

    readers?.forEach(reader => {
        reader.specialties?.forEach((specialty: string) => {
            const s = specialty.toLowerCase()
            if (s.includes('amor') || s.includes('relacionamento') || s.includes('casal')) counts['Amor & Relacionamentos']++
            else if (s.includes('carreira') || s.includes('trabalho') || s.includes('dinheiro') || s.includes('financa') || s.includes('finança')) counts['Carreira & Financas']++
            else if (s.includes('espiritual') || s.includes('alma') || s.includes('karma')) counts['Espiritualidade']++
            else if (s.includes('saude') || s.includes('saúde') || s.includes('bem-estar') || s.includes('cura')) counts['Saude & Bem-estar']++
        })
    })

    // Ensure minimums for visual appeal if data is empty
    if (Object.values(counts).every(c => c === 0)) {
        return [
            { category: 'Amor & Relacionamentos', count: 0, slug: 'Amor & Relacionamentos', image: 'https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&q=80&w=800' },
            { category: 'Carreira & Financas', count: 0, slug: 'Carreira & Financas', image: 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&q=80&w=800' },
            { category: 'Espiritualidade', count: 0, slug: 'Espiritualidade', image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&q=80&w=800' },
            { category: 'Saude & Bem-estar', count: 0, slug: 'Saude & Bem-estar', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800' }
        ]
    }

    return [
        { category: 'Amor & Relacionamentos', count: counts['Amor & Relacionamentos'], slug: 'Amor & Relacionamentos', image: 'https://images.unsplash.com/photo-1518136247453-74e7b5265980?auto=format&fit=crop&q=80&w=800' },
        { category: 'Carreira & Financas', count: counts['Carreira & Financas'], slug: 'Carreira & Financas', image: 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?auto=format&fit=crop&q=80&w=800' },
        { category: 'Espiritualidade', count: counts['Espiritualidade'], slug: 'Espiritualidade', image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&q=80&w=800' },
        { category: 'Saude & Bem-estar', count: counts['Saude & Bem-estar'], slug: 'Saude & Bem-estar', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800' }
    ]
}

export const getCategoryCounts = _getCategoryCounts

export async function getBestSellingGigs(limit: number = 3): Promise<(Gig & { owner: Profile })[]> {
    const supabase = await createClient()

    // To get best selling, we'd ideally aggregate orders by gig_id.
    // Standard SQL would be `SELECT gig_id, COUNT(*) as count FROM orders GROUP BY gig_id ORDER BY count DESC`
    // Supabase JS doesn't support easy aggregation in one query unless we use a view or RPC.
    // For now, we can simple logic: fetch all valid gigs and maybe order by a 'sales_count' if we added it, 
    // or just return 'featured'/random ones if sales_count isn't available yet. 

    // TODO: Add 'sales_count' to gigs table and update via trigger on order completion for performance.
    // For now, let's just fetch active gigs.

    const { data: gigs } = await supabase
        .from('gigs')
        .select('*, owner:profiles(*)')
        .eq('is_active', true)
        .eq('status', 'APPROVED')
        .limit(limit)

    // If we had sales data we could sort here, but for now returned gigs is better than mock data
    return (gigs as (Gig & { owner: Profile })[]) || []
}
