
import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
    Search, Star, ChevronLeft, ChevronRight, ArrowRight,
    Users, User, Heart, Sparkles, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { UserSidebar } from '@/components/user-sidebar'
import { DashboardBottomNav } from '@/components/layout/dashboard-bottom-nav'
import { usePresence } from '@/components/providers/presence-provider'
import type { MarketplaceReaderData } from '@/lib/readers'
import type { PaginationMeta } from '@/types'

const categories = [
    { key: 'all', label: 'Todos', count: 0 },
    { key: 'Love & Relationships', label: 'Amor e Relacionamentos', count: 0 },
    { key: 'Career & Finance', label: 'Carreira e Finanças', count: 0 },
    { key: 'Spiritual Growth', label: 'Crescimento Espiritual', count: 0 },
    { key: 'Health & Wellness', label: 'Saúde e Bem-estar', count: 0 },
]

const deckTypes = [
    'Tarot Rider Waite', 'Tarot de Marselha', 'Baralho Cigano',
    'Oráculos', 'Tarot de Thoth', 'Tarot Osho Zen'
]
const ratingOptions = [
    { min: 4.5, label: '4.5 & acima' },
    { min: 4.0, label: '4.0 & acima' },
    { min: 3.5, label: '3.5 & acima' },
]

interface CartomantesClientProps {
    readers: MarketplaceReaderData[]
    pagination: PaginationMeta
    initialFilters: {
        category?: string
        deck?: string
        priceMin?: number
        priceMax?: number
        rating?: number
        search?: string
        page: number
    },
    userId?: string
}

function getVisiblePages(currentPage: number, totalPages: number) {
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + 4)
    const adjustedStart = Math.max(1, end - 4)

    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
}

export function CartomantesClient({ readers, pagination, initialFilters, userId }: CartomantesClientProps) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const currentParams = searchParams.toString()

    // State initialized from server params
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
    const [activeCategory, setActiveCategory] = useState(initialFilters.category || 'all')
    const [selectedDeck, setSelectedDeck] = useState<string | null>(initialFilters.deck || null)
    const [minRating, setMinRating] = useState(initialFilters.rating || 0)
    const [priceRange, setPriceRange] = useState<[number, number]>([
        initialFilters.priceMin || 0,
        initialFilters.priceMax || 500
    ])
    const [currentPage, setCurrentPage] = useState(initialFilters.page || 1)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        setSearchQuery(initialFilters.search || '')
        setActiveCategory(initialFilters.category || 'all')
        setSelectedDeck(initialFilters.deck || null)
        setMinRating(initialFilters.rating || 0)
        setPriceRange([
            initialFilters.priceMin || 0,
            initialFilters.priceMax || 500,
        ])
        setCurrentPage(initialFilters.page || 1)
    }, [
        initialFilters.category,
        initialFilters.deck,
        initialFilters.page,
        initialFilters.priceMax,
        initialFilters.priceMin,
        initialFilters.rating,
        initialFilters.search,
    ])

    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams()
            if (searchQuery) params.set('q', searchQuery)
            if (activeCategory !== 'all') params.set('category', activeCategory)
            if (selectedDeck) params.set('deck', selectedDeck)
            if (minRating > 0) params.set('rating', minRating.toString())
            if (priceRange[0] > 0) params.set('min', priceRange[0].toString())
            if (priceRange[1] < 500) params.set('max', priceRange[1].toString())
            if (currentPage > 1) params.set('page', currentPage.toString())

            const nextParams = params.toString()
            if (nextParams === currentParams) return

            navigate(nextParams ? `/cartomantes?${nextParams}` : '/cartomantes', { replace: true })
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery, activeCategory, selectedDeck, minRating, priceRange, currentPage, currentParams, navigate])

    const paginatedReaders = readers
    const totalPages = Math.max(1, pagination.pages || 1)
    const totalReaders = pagination.total || readers.length

    const clearFilters = () => {
        setSearchQuery('')
        setActiveCategory('all')
        setSelectedDeck(null)
        setMinRating(0)
        setPriceRange([0, 500])
        setCurrentPage(1)
        navigate('/cartomantes', { replace: true })
    }

    const hasFilters = Boolean(
        searchQuery ||
        activeCategory !== 'all' ||
        selectedDeck ||
        minRating > 0 ||
        priceRange[0] > 0 ||
        priceRange[1] < 500
    )

    return (
        <div className="min-h-screen bg-[#0a0a14] text-slate-100 flex">
            {userId && <UserSidebar className="hidden md:flex h-[calc(100vh-4rem)] sticky top-16" />}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Hero editorial */}
                <section className="px-6 md:px-10 pt-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-3 text-muted-foreground text-sm">
                        <Link to="/" className="hover:text-foreground">Marketplace</Link>
                        <span>/</span>
                        <span style={{ color: 'var(--violet-bright)' }}>
                            {activeCategory !== 'all' ? categories.find(c => c.key === activeCategory)?.label || 'Buscar' : 'Cartomantes'}
                        </span>
                    </div>
                    <h1 className="font-display text-[44px] md:text-[56px] leading-[0.95] tracking-[-0.02em] font-light">
                        Encontre sua <em className="italic font-normal text-gradient-aurora">Cartomante</em>
                    </h1>
                    <p className="mt-3 text-muted-foreground">{totalReaders} profissional{totalReaders !== 1 ? 'is' : ''} disponível{totalReaders !== 1 ? 'is' : ''} para sua jornada.</p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-6">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                                placeholder="Buscar por nome..."
                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-border/20 bg-card/60 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm"
                            />
                        </div>

                        {/* Mobile Filter Toggle */}
                        <Button
                            variant="outline"
                            className="md:hidden border-border/20 text-primary hover:bg-primary/10 gap-2 h-[48px] rounded-xl"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            <Sparkles className="w-4 h-4" />
                            {isSidebarOpen ? 'Fechar Filtros' : 'Filtros'}
                        </Button>
                    </div>
                </section>

                <div className={cn("w-full flex flex-col md:flex-row", userId ? "max-w-screen-2xl" : "max-w-7xl mx-auto")}>
                    {/* ──── Sidebar Filters ──── */}
                    <aside className={`
                    ${isSidebarOpen ? 'block' : 'hidden'} md:block 
                    w-full md:w-64 md:shrink-0 border-b md:border-b-0 md:border-r border-indigo-500/10 bg-[#0b0b18] p-6 space-y-8 md:sticky md:top-16 md:h-fit
                `}>
                        {/* Category */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Categoria
                            </h3>
                            <div className="space-y-1">
                                {categories.map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => { setActiveCategory(cat.key); setCurrentPage(1) }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${activeCategory === cat.key
                                            ? 'bg-indigo-500/15 text-indigo-300 font-medium'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${activeCategory === cat.key ? 'bg-indigo-400' : 'border border-slate-600'
                                                }`} />
                                            {cat.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Range */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                                Faixa de Preço (R$)
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2 rounded-lg border border-indigo-500/20 bg-[#12122a] text-sm text-indigo-300 text-center">
                                    R$ {priceRange[0]}
                                </div>
                                <div className="flex-1 px-3 py-2 rounded-lg border border-indigo-500/20 bg-[#12122a] text-sm text-indigo-300 text-center">
                                    R$ {priceRange[1]}
                                </div>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={500}
                                value={priceRange[1]}
                                onChange={e => {
                                    setPriceRange([priceRange[0], parseInt(e.target.value)])
                                    setCurrentPage(1)
                                }}
                                className="w-full mt-3 accent-indigo-500"
                            />
                        </div>

                        {/* Deck Type */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                                Tipo de Baralho
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {deckTypes.map(deck => (
                                    <button
                                        key={deck}
                                        onClick={() => {
                                            setSelectedDeck(selectedDeck === deck ? null : deck)
                                            setCurrentPage(1)
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedDeck === deck
                                            ? 'bg-indigo-500 text-white border-indigo-500'
                                            : 'border-indigo-500/20 text-indigo-300 hover:border-indigo-500/50'
                                            }`}
                                    >
                                        {deck}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minimum Rating */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                                Avaliação Mínima
                            </h3>
                            <div className="space-y-1.5">
                                {ratingOptions.map(opt => (
                                    <button
                                        key={opt.min}
                                        onClick={() => {
                                            setMinRating(minRating === opt.min ? 0 : opt.min)
                                            setCurrentPage(1)
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${minRating === opt.min
                                            ? 'bg-indigo-500/15 text-indigo-300'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full border-2 ${minRating === opt.min ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'
                                            }`} />
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3 h-3 ${i < Math.floor(opt.min) ? 'text-purple-400 fill-purple-400' : 'text-slate-700'}`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasFilters && (
                            <Button
                                onClick={clearFilters}
                                variant="outline"
                                className="w-full border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 gap-2"
                            >
                                <X className="w-3.5 h-3.5" />
                                Limpar Filtros
                            </Button>
                        )}
                    </aside>

                    {/* ──── Main Content ──── */}
                    <main className="flex-1 p-6">
                        {paginatedReaders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <Users className="w-16 h-16 text-slate-700 mb-6" />
                                <h2 className="text-2xl font-bold text-white mb-2">Nenhuma profissional encontrada</h2>
                                <p className="text-slate-500 max-w-md mb-6">
                                    Ajuste seus filtros ou tente buscar por outro termo.
                                </p>
                                <Button onClick={clearFilters} className="bg-indigo-500 hover:bg-indigo-600 font-bold">
                                    Limpar Filtros
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {paginatedReaders.map(reader => (
                                        <ReaderCard key={reader.id} reader={reader} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="w-10 h-10 rounded-full border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        {getVisiblePages(currentPage, totalPages).map((pageNum) => {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${currentPage === pageNum
                                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                                                        : 'border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        })}
                                        {totalPages > 5 && currentPage < totalPages - 2 && (
                                            <>
                                                <span className="text-slate-600">…</span>
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    className={`w-10 h-10 rounded-full text-sm font-bold border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-all ${currentPage === totalPages ? 'bg-indigo-500 text-white border-indigo-500' : ''
                                                        }`}
                                                >
                                                    {totalPages}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="w-10 h-10 rounded-full border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>

                {/* ──── Footer ──── */}
                <footer className={cn("border-t border-indigo-500/15 bg-[#080812] mt-16 w-full", userId ? "pb-24 md:pb-0 max-w-screen-2xl" : "max-w-7xl mx-auto")}>
                    <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                <span className="text-lg font-bold text-purple-400">Isidis</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Conectando você com os mais talentosos profissionais esotéricos desde 2026.
                            </p>
                        </div>

                        {/* Explore */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Explorar</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><Link to="/cartomantes" className="hover:text-indigo-400 transition-colors">Profissionais Top</Link></li>
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">Suporte</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><Link to="#" className="hover:text-indigo-400 transition-colors">Central de Ajuda</Link></li>
                                <li><Link to="#" className="hover:text-indigo-400 transition-colors">Segurança & Confiança</Link></li>
                                <li><Link to="#" className="hover:text-indigo-400 transition-colors">Termos de Serviço</Link></li>
                                <li><Link to="#" className="hover:text-indigo-400 transition-colors">Privacidade</Link></li>
                            </ul>
                        </div>

                        {/* End of Grid */}
                    </div>

                    <div className="border-t border-indigo-500/10 py-4 text-center text-[10px] text-slate-700">
                        © 2026 Marketplace Isidis. Todos os direitos celestiais reservados.
                    </div>
                </footer>
            </div>

            {/* Bottom Navigation for Logged In Users */}
            {userId && <DashboardBottomNav />}
        </div>
    )
}

/* ──── Reader Card Component ──── */

function ReaderCard({ reader }: { reader: MarketplaceReaderData }) {
    const { onlineUsers } = usePresence()
    const isOnline = onlineUsers.has(reader.id) || reader.isOnline

    return (
        <div className="border-shine rounded-2xl bg-[#110d22] hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative">
            {reader.gigId && (
                <AnalyticsTracker
                    gigId={reader.gigId}
                    readerId={reader.id}
                    eventType="impression"
                />
            )}
            {/* Image */}
            <div className="relative h-56 overflow-hidden bg-[#0d0d1a]">
                {reader.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={reader.image}
                        alt={reader.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/30 to-[#0d0d1a]">
                        <User className="w-20 h-20 text-indigo-500/20" />
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12122a] via-transparent to-transparent opacity-80" />

                {/* Status badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    {isOnline && (
                        <Badge className="bg-green-500/90 text-white border-none text-[10px] font-bold px-2 py-0.5 gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            AO VIVO
                        </Badge>
                    )}
                </div>

                {/* Favorite button */}
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-black/60 transition-all z-10 opacity-0 group-hover:opacity-100">
                    <Heart className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-5 -mt-6 relative z-10">
                {/* Name + Rating */}
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                            {reader.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                        <span className="text-sm font-bold text-purple-300">{reader.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500">({reader.reviews})</span>
                    </div>
                </div>

                {/* Bio */}
                {reader.bio && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 mb-3 leading-relaxed">
                        {reader.bio}
                    </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {reader.tags.slice(0, 3).map(tag => (
                        <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-indigo-500/20 text-indigo-300"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between pt-3 border-t border-indigo-500/10">
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">A partir de</span>
                        <span className="text-xl font-mono text-gradient-violet">
                            R$ {reader.price}
                        </span>
                    </div>
                    <Button
                        asChild
                        size="sm"
                        className="aurora border-shine text-white font-semibold gap-1.5 rounded-full h-9 px-5 hover:opacity-90"
                    >
                        <Link to={`/cartomante/${reader.id}`}>
                            Agendar
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
