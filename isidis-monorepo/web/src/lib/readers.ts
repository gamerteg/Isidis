import type { PractitionerProps } from '@/components/practitioner-card'
import apiClient from '@/lib/apiClient'
import type { PaginationMeta, ReaderGigListItem, ReaderListItem, ReadersListResponse } from '@/types'

export interface ReaderDiscoveryFilters {
  category?: string
  deck?: string
  priceMin?: number
  priceMax?: number
  rating?: number
  search?: string
  page?: number
  limit?: number
  ids?: string[]
}

export interface MarketplaceReaderData {
  id: string
  name: string
  title: string
  bio: string
  rating: number
  reviews: number
  price: number
  image: string | null
  tags: string[]
  isOnline: boolean
  gigId?: string
}

const DEFAULT_LIMIT = 20

function toCents(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.round(value * 100)
}

function getDefaultPagination(limit = DEFAULT_LIMIT): PaginationMeta {
  return {
    total: 0,
    page: 1,
    limit,
    pages: 1,
  }
}

export function getReaderPrimaryGig(reader: ReaderListItem): ReaderGigListItem | undefined {
  const gigs = Array.isArray(reader.gigs) ? [...reader.gigs] : []

  return gigs
    .filter((gig): gig is ReaderGigListItem => Boolean(gig))
    .sort((left, right) => {
      const leftPrice = typeof left.price === 'number' ? left.price : Number.MAX_SAFE_INTEGER
      const rightPrice = typeof right.price === 'number' ? right.price : Number.MAX_SAFE_INTEGER
      return leftPrice - rightPrice
    })[0]
}

function getReaderStartingPrice(reader: ReaderListItem) {
  const primaryGig = getReaderPrimaryGig(reader)
  return reader.starting_price ?? primaryGig?.price ?? 0
}

export async function listReaders(filters: ReaderDiscoveryFilters = {}): Promise<ReadersListResponse> {
  const {
    category,
    deck,
    priceMin,
    priceMax,
    rating,
    search,
    page = 1,
    limit = DEFAULT_LIMIT,
    ids,
  } = filters

  if (ids && ids.length === 0) {
    return {
      data: [],
      pagination: getDefaultPagination(limit),
    }
  }

  const params = new URLSearchParams()

  if (search) params.set('search', search)
  if (category && category !== 'all') params.set('specialty', category)
  if (deck) params.set('deck', deck)

  const minPriceCents = toCents(priceMin)
  const maxPriceCents = toCents(priceMax)

  if (minPriceCents !== undefined) params.set('min_price', String(minPriceCents))
  if (maxPriceCents !== undefined) params.set('max_price', String(maxPriceCents))
  if (typeof rating === 'number' && !Number.isNaN(rating) && rating > 0) {
    params.set('min_rating', String(rating))
  }
  if (page > 1) params.set('page', String(page))
  if (limit !== DEFAULT_LIMIT) params.set('limit', String(limit))
  if (ids && ids.length > 0) params.set('ids', ids.join(','))

  const query = params.toString()
  const { data } = await apiClient.get<ReadersListResponse>(query ? `/readers?${query}` : '/readers')

  return {
    data: data.data ?? [],
    pagination: data.pagination ?? getDefaultPagination(limit),
  }
}

export function mapReaderToPractitioner(reader: ReaderListItem): PractitionerProps {
  const primaryGig = getReaderPrimaryGig(reader)

  return {
    id: reader.id,
    name: reader.full_name || 'Cartomante',
    title: primaryGig?.title || reader.tagline || 'Cartomante',
    rating: Number(reader.rating_average || 5),
    reviews: Number(reader.reviews_count || 0),
    price: getReaderStartingPrice(reader) / 100,
    image: reader.cover_url || reader.avatar_url || null,
    tags: reader.specialties || [],
    gigId: primaryGig?.id,
  }
}

export function mapReaderToMarketplaceReader(reader: ReaderListItem): MarketplaceReaderData {
  const primaryGig = getReaderPrimaryGig(reader)

  return {
    id: reader.id,
    name: reader.full_name || 'Cartomante',
    title: primaryGig?.title || reader.tagline || 'Tarot & VIdencia',
    bio: reader.bio || '',
    rating: Number(reader.rating_average || 5),
    reviews: Number(reader.reviews_count || 0),
    price: getReaderStartingPrice(reader) / 100,
    image: reader.cover_url || reader.avatar_url || null,
    tags: reader.specialties || [],
    isOnline: false,
    gigId: primaryGig?.id,
  }
}
