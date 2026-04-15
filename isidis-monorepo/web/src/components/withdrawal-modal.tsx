
import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowDownToLine, AlertCircle, CheckCircle2 } from 'lucide-react'
import { requestWithdrawal } from '@/app/actions/finance'
import {  useNavigate  } from 'react-router-dom'

interface WithdrawalModalProps {
    availableBalance: number // in cents
    pixKey: string | null
    pixKeyType: string | null
    children: React.ReactNode
}

export function WithdrawalModal({ availableBalance, pixKey, pixKeyType, children }: WithdrawalModalProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        if (!pixKey) {
            setError('Você precisa cadastrar uma chave PIX no perfil antes de sacar.')
            setLoading(false)
            return
        }

        const numericAmount = parseFloat(amount.replace(',', '.'))
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Valor inválido.')
            setLoading(false)
            return
        }

        const amountCents = Math.round(numericAmount * 100)
        if (amountCents > availableBalance) {
            setError('Saldo insuficiente.')
            setLoading(false)
            return
        }

        if (amountCents < 5000) { // Minimum R$ 50,00
            setError('Valor mínimo para saque é R$ 50,00.')
            setLoading(false)
            return
        }

        const result = await requestWithdrawal(amountCents, pixKey, pixKeyType || 'CPF')

        if (result?.error) {
            setError(result.error)
        } else {
            setShowSuccess(true)
            setAmount('')
            window.dispatchEvent(new Event('wallet:refresh'))
        }
        setLoading(false)
    }

    const maxAmount = (availableBalance / 100).toFixed(2)

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                setTimeout(() => {
                    setShowSuccess(false)
                    setError(null)
                }, 300)
            }
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] border-indigo-500/20 text-slate-100 overflow-hidden">
                {showSuccess ? (
                    <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 relative">
                            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping duration-1000" />
                            <CheckCircle2 className="w-10 h-10 text-green-400 relative z-10" />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2">Solicitação Enviada!</h2>
                        <p className="text-sm text-slate-400 max-w-[280px] leading-relaxed">
                            Seu pedido de saque foi registrado com sucesso e cairá na sua conta em até <strong className="text-white">24h úteis</strong>.
                        </p>
                        <Button
                            className="mt-8 bg-slate-800 hover:bg-slate-700 text-white w-full max-w-[200px]"
                            onClick={() => setOpen(false)}
                        >
                            Entendi
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ArrowDownToLine className="w-5 h-5 text-indigo-400" />
                                Solicitar Saque
                            </DialogTitle>
                            <DialogDescription>
                                Transfira seus ganhos para sua conta bancária via PIX.
                            </DialogDescription>
                        </DialogHeader>

                        {!pixKey ? (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm text-amber-200 font-bold">Chave PIX não cadastrada</p>
                                    <p className="text-xs text-amber-500/80">
                                        Vá até "Meu Perfil" para cadastrar sua chave PIX antes de realizar saques.
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8"
                                        onClick={() => {
                                            setOpen(false)
                                            navigate('/dashboard/cartomante/perfil')
                                        }}
                                    >
                                        Configurar PIX
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pix-info" className="text-slate-400">Dados do PIX</Label>
                                    <div className="p-3 bg-[#12121a] rounded-lg border border-white/10 text-sm font-mono text-slate-300">
                                        <p><span className="text-indigo-400 font-bold">Tipo:</span> {pixKeyType || 'Não informado'}</p>
                                        <p><span className="text-indigo-400 font-bold">Chave:</span> {pixKey}</p>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="amount" className="text-slate-400">Valor do Saque</Label>
                                        <span className="text-xs text-indigo-300 cursor-pointer hover:underline" onClick={() => setAmount(maxAmount)}>
                                            Disponível: R$ {maxAmount.replace('.', ',')}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                                        <Input
                                            id="amount"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0,00"
                                            className="pl-9 bg-[#12121a] border-white/10 focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500">Mínimo R$ 50,00 • Taxa de Saque: R$ 0,00</p>
                                </div>

                                {error && (
                                    <p className="text-xs text-red-400 font-medium bg-red-500/10 p-2 rounded border border-red-500/20">
                                        {error}
                                    </p>
                                )}

                                <DialogFooter>
                                    <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
                                            </>
                                        ) : (
                                            'Confirmar Saque'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
