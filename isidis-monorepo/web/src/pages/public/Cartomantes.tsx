import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CartomantesClient } from '@/components/cartomantes/CartomantesClient'
import { useAuth } from '@/hooks/useAuth'
import { listReaders, mapReaderToMarketplaceReader, type MarketplaceReaderData } from '@/lib/readers'
import type { PaginationMeta } from '@/types'

const READERS_PER_PAGE = 9

interface FilterParams {
    category?: string
    deck?: string
    priceMin?: number
    priceMax?: number
    rating?: number
    search?: string
    page: number
}

const getDefaultPagination = (page: number): PaginationMeta => ({
    total: 0,
    page,
    limit: READERS_PER_PAGE,
    pages: 1,
})

async function getAllReaders(filters: FilterParams): Promise<{ readers: MarketplaceReaderData[]; pagination: PaginationMeta }> {
    const response = await listReaders({
        category: filters.category,
        deck: filters.deck,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        rating: filters.rating,
        search: filters.search,
        page: filters.page,
        limit: READERS_PER_PAGE,
    })

    return {
        readers: response.data
            .map(mapReaderToMarketplaceReader)
            .filter((reader) => reader.gigId !== undefined),
        pagination: response.pagination ?? getDefaultPagination(filters.page),
    }
}

export default function CartomantesPage() {
    const [searchParams] = useSearchParams()
    const { user } = useAuth()
    const [readers, setReaders] = useState<MarketplaceReaderData[]>([])
    const [pagination, setPagination] = useState<PaginationMeta>(getDefaultPagination(1))

    const filters: FilterParams = {
        category: searchParams.get('category') || undefined,
        deck: searchParams.get('deck') || undefined,
        priceMin: searchParams.get('min') ? Number(searchParams.get('min')) : undefined,
        priceMax: searchParams.get('max') ? Number(searchParams.get('max')) : undefined,
        rating: searchParams.get('rating') ? Number(searchParams.get('rating')) : undefined,
        search: searchParams.get('q') || undefined,
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    }

    useEffect(() => {
        let cancelled = false

        getAllReaders(filters)
            .then((response) => {
                if (cancelled) return
                setReaders(response.readers)
                setPagination(response.pagination)
            })
            .catch(() => {
                if (cancelled) return
                setReaders([])
                setPagination(getDefaultPagination(filters.page))
            })

        return () => {
            cancelled = true
        }
    }, [searchParams.toString()])

    return <CartomantesClient readers={readers} pagination={pagination} initialFilters={filters} userId={user?.id} />
}
