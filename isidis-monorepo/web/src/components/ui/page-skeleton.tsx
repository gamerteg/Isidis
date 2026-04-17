/**
 * PageSkeleton — loading state genérico para páginas do dashboard
 * Usa a utility .skeleton do globals.css (shimmer animado)
 */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="min-h-screen p-6 space-y-6 max-w-5xl mx-auto w-full">
            <div className="skeleton h-8 w-52 rounded-xl" />
            <div className="skeleton h-4 w-72 rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-24 rounded-2xl" />
                ))}
            </div>
            <div className="space-y-3 pt-2">
                {[...Array(rows)].map((_, i) => (
                    <div key={i} className="skeleton rounded-2xl" style={{ height: `${80 + i * 12}px` }} />
                ))}
            </div>
        </div>
    )
}
