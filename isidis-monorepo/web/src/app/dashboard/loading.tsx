import { Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'

export default function LoadingDashboardFallback() {
    return (
        <div className="flex-1 min-h-screen bg-background-deep text-slate-200 font-sans flex items-center justify-center w-full relative z-20">
            <PageSection padding="xl" className="w-full h-full flex flex-col items-center justify-center">
                <PageContainer className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                    <h2 className="text-xl font-serif text-white/80 animate-pulse">
                        Carregando...
                    </h2>
                </PageContainer>
            </PageSection>
        </div>
    )
}
