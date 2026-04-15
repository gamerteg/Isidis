import { Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Instagram } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Footer() {
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        fetchUser()
    }, [])

    return (
        <footer className="border-t border-border/50 bg-card/30 mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <img src="/logo.png" alt="Isidis Logo" width={32} height={32} className="w-8 h-8 object-contain" />
                            <span className="text-lg font-bold text-gradient-primary">Isidis</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Conectando você ao universo através de leituras espirituais personalizadas.
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                            <a href="https://instagram.com/isidis" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10">
                                <Instagram className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Plataforma</h4>
                        <ul className="space-y-2.5">
                            {user ? (
                                <>
                                    <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Meu Dashboard</Link></li>
                                    <li><Link to="/dashboard/mensagens" className="text-sm text-muted-foreground hover:text-primary transition-colors">Mensagens</Link></li>
                                </>
                            ) : (
                                <>
                                    <li><Link to="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Criar Conta</Link></li>
                                    <li><Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Entrar</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Para Cartomantes</h4>
                        <ul className="space-y-2.5">
                            <li><Link to="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Cadastrar-se</Link></li>
                            <li><Link to="/dashboard/cartomante" className="text-sm text-muted-foreground hover:text-primary transition-colors">Painel Profissional</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Legal</h4>
                        <ul className="space-y-2.5">
                            <li><Link to="/termos-de-uso" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos de Uso</Link></li>
                            <li><Link to="/termos-da-tarologa" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos da Taróloga</Link></li>
                            <li><Link to="/termos-do-consulente" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos do Consulente</Link></li>
                            <li><Link to="/como-funciona-o-saque" className="text-sm text-muted-foreground hover:text-primary transition-colors">Como Funciona o Saque</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border/50 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Isidis. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground/60">Feito com ✨ no Brasil</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
