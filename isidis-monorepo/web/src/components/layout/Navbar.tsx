import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, LogOut, Sparkles, User, Moon, Menu, Wand2, Eye } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useState } from 'react'

export function Navbar() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
            setLoading(false)
        }
        fetchUser()
    }, [])

    const role = user?.user_metadata?.role

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        navigate('/login')
    }

    return (
        <nav className="border-b border-white/5 sticky top-0 z-50 bg-[#0a0816]/80 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="relative">
                        <img src="/logo.png" alt="Isidis Logo" width={40} height={40} className="w-9 h-9 object-contain transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="text-xl font-display font-light text-gradient-violet tracking-tight">Isidis</span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-1">

                    {!loading && user ? (
                        <div className="flex items-center gap-2">
                            {/* Show relevant dashboard link based on role */}
                            {role === 'READER' ? (
                                <Button variant="ghost" size="sm" asChild className="hidden md:flex text-muted-foreground hover:text-foreground">
                                    <Link to="/dashboard/cartomante" className="nav-link">Meu Painel</Link>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="sm" asChild className="hidden md:flex text-muted-foreground hover:text-foreground">
                                    <Link to="/dashboard/minhas-tiragens" className="nav-link">Minhas Leituras</Link>
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="cursor-pointer h-9 w-9 border-2 border-transparent hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                                        <AvatarImage src={user.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                            {user.email?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 glass-strong border-border/50">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold">{user.user_metadata?.full_name || 'Minha Conta'}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                            {role && (
                                                <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary font-bold mt-1">
                                                    {role === 'READER'
                                                        ? <><Wand2 className="w-3 h-3" /> Cartomante</>
                                                        : <><Eye className="w-3 h-3" /> Consulente</>
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-border/50" />

                                    {role === 'READER' ? (
                                        <>
                                            <DropdownMenuItem asChild>
                                                <Link to="/dashboard/cartomante" className="cursor-pointer">
                                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                                    Painel Profissional
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/dashboard/cartomante/gigs" className="cursor-pointer">
                                                    <Moon className="mr-2 h-4 w-4" />
                                                    Meus Serviços
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/dashboard/cartomante/perfil" className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" />
                                                    Editar Perfil
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem asChild>
                                                <Link to="/dashboard/minhas-tiragens" className="cursor-pointer">
                                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                                    Minhas Leituras
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link to="/dashboard/perfil" className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" />
                                                    Meu Perfil
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator className="bg-border/50" />
                                    <DropdownMenuItem
                                        className="text-red-400 focus:text-red-400 cursor-pointer focus:bg-red-500/10"
                                        onClick={handleSignOut}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sair
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : !loading ? (
                        <div className="flex items-center gap-2 ml-2">
                            {/* Mobile hamburger menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="md:hidden p-2">
                                        <Menu className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 glass-strong border-border/50 md:hidden">
                                    <DropdownMenuItem asChild>
                                        <Link to="/cartomantes" className="cursor-pointer">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Explorar Cartomantes
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/#como-funciona" className="cursor-pointer">
                                            Como Funciona
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/50" />
                                    <DropdownMenuItem asChild>
                                        <Link to="/login" className="cursor-pointer">
                                            Entrar
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link to="/register" className="cursor-pointer font-bold text-primary">
                                            Criar Conta
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="ghost" size="sm" asChild className="hidden md:flex font-medium text-muted-foreground hover:text-foreground">
                                <Link to="/cartomantes" className="nav-link">Explorar</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="hidden md:flex font-medium text-muted-foreground hover:text-foreground">
                                <Link to="/login">Entrar</Link>
                            </Button>
                            <Button size="sm" asChild className="hidden md:flex font-bold rounded-xl px-5 aurora border-shine text-white hover:opacity-90">
                                <Link to="/register">Criar Conta</Link>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </nav>
    );
}
