import { Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'

export default function LoadingDashboard() {
    return (
        <div className="flex-1 min-h-screen bg-background-deep text-slate-200 font-sans flex items-center justify-center">
            <PageSection padding="xl" className="w-full flex flex-col items-center justify-center">
                <PageContainer className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                    <h2 className="text-xl font-display text-white/80 animate-pulse">
                        Carregando seu painel...
                    </h2>
                </PageContainer>
            </PageSection>
        </div>
    )
}
