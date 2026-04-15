
import { useState } from 'react'
import {  useNavigate  } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle } from 'lucide-react'
import { createTicket, TicketCategory, TicketPriority } from '@/app/actions/tickets'
import { toast } from 'sonner'

const formSchema = z.object({
    subject: z.string().min(5, {
        message: 'O assunto deve ter pelo menos 5 caracteres.',
    }),
    category: z.enum(['REEMBOLSO', 'SAQUE', 'MUDANCA_PIX', 'DUVIDA', 'OUTRO']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    content: z.string().min(10, {
        message: 'A mensagem deve ter pelo menos 10 caracteres.',
    }),
})

type FormValues = {
    subject: string;
    category: 'REEMBOLSO' | 'SAQUE' | 'MUDANCA_PIX' | 'DUVIDA' | 'OUTRO';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    content: string;
}

export function CreateTicketDialog({ isAdmin = false }: { isAdmin?: boolean }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subject: '',
            category: 'DUVIDA',
            priority: 'MEDIUM',
            content: '',
        },
    })

    async function onSubmit(values: FormValues) {
        setLoading(true)
        try {
            const result = await createTicket(values)
            if (result.success) {
                toast.success('Ticket criado com sucesso!')
                setOpen(false)
                form.reset()
                window.location.reload()
                if (result.ticketId) {
                    navigate(isAdmin ? `/admin/tickets/${result.ticketId}` : `/dashboard/tickets/${result.ticketId}`)
                }
            } else {
                toast.error(result.error || 'Erro ao criar ticket')
            }
        } catch (error) {
            toast.error('Erro ao criar ticket')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Novo Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Abrir Novo Ticket de Suporte</DialogTitle>
                    <DialogDescription>
                        Descreva seu problema ou dúvida e nossa equipe entrará em contato.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assunto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Resumo do problema" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="REEMBOLSO">Reembolso</SelectItem>
                                                <SelectItem value="SAQUE">Saque</SelectItem>
                                                <SelectItem value="MUDANCA_PIX">Mudança de Pix</SelectItem>
                                                <SelectItem value="DUVIDA">Dúvida</SelectItem>
                                                <SelectItem value="OUTRO">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prioridade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="LOW">Baixa</SelectItem>
                                                <SelectItem value="MEDIUM">Média</SelectItem>
                                                <SelectItem value="HIGH">Alta</SelectItem>
                                                <SelectItem value="URGENT">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mensagem</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva detalhadamente sua solicitação..."
                                            className="min-h-[120px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Enviando...' : 'Abrir Ticket'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
