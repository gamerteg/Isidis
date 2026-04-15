
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, Sparkles, DollarSign, CheckCircle2, LifeBuoy, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet'

export function AdminMobileNav() {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-6 border-b border-border/50 text-left">
                    <SheetTitle>
                        <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2">
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                                Isidis Admin
                            </span>
                        </Link>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full justify-between pb-6">
                    <nav className="flex-1 p-4 space-y-2">
                        <Link onClick={() => setOpen(false)} to="/admin" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <LayoutDashboard className="w-5 h-5" /> Dashboard
                        </Link>
                        <Link onClick={() => setOpen(false)} to="/admin/users" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <Users className="w-5 h-5" /> Usuários
                        </Link>
                        <Link onClick={() => setOpen(false)} to="/admin/gigs" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <Sparkles className="w-5 h-5" /> Gigs & Aprovação
                        </Link>
                        <Link onClick={() => setOpen(false)} to="/admin/approvals" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <CheckCircle2 className="w-5 h-5" /> Solicitação de Onboarding
                        </Link>
                        <Link onClick={() => setOpen(false)} to="/admin/financials" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <DollarSign className="w-5 h-5" /> Financeiro
                        </Link>
                        <Link onClick={() => setOpen(false)} to="/admin/tickets" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                            <LifeBuoy className="w-5 h-5" /> Tickets Suporte
                        </Link>
                    </nav>
                </div>
            </SheetContent>
        </Sheet>
    )
}
