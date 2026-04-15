import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintReadingButton() {
    return (
        <Button
            variant="ghost"
            onClick={() => window.print()}
            className="text-slate-400 hover:text-white no-print gap-2 border border-white/10"
        >
            <Printer className="w-4 h-4" />
            Salvar PDF
        </Button>
    )
}
