
import { useState } from 'react'
import {  useNavigate  } from 'react-router-dom'
import { GigRequirement } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { saveOrderRequirements } from '../actions'
import { Loader2, Send } from 'lucide-react'

interface RequirementsFormProps {
    orderId: string
    requirements: GigRequirement[]
}

export function RequirementsForm({ orderId, requirements }: RequirementsFormProps) {
    const navigate = useNavigate()
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (id: string, value: string) => {
        setAnswers(prev => ({ ...prev, [id]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validate required fields
        const missing = requirements.filter(r => r.required && !answers[r.id]?.trim())
        if (missing.length > 0) {
            setError(`Por favor, responda todas as perguntas obrigatórias: ${missing.map(m => m.question).join(', ')}`)
            setLoading(false)
            return
        }

        try {
            const result = await saveOrderRequirements(orderId, answers)
            if (result?.error) {
                setError(result.error)
            } else {
                navigate('/dashboard/minhas-tiragens')
            }
        } catch (err) {
            console.error(err)
            setError('Ocorreu um erro ao salvar suas respostas. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl border-indigo-500/20 bg-[#0a0a0f] text-slate-200">
            <CardHeader>
                <CardTitle className="text-2xl text-white">Informações Necessárias</CardTitle>
                <CardDescription className="text-slate-400">
                    A cartomante precisa destas informações para realizar sua leitura com precisão.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {requirements.map((req, index) => (
                        <div key={req.id} className="space-y-2">
                            <Label htmlFor={req.id} className="text-base text-slate-300">
                                {index + 1}. {req.question}
                                {req.required && <span className="text-red-400 ml-1">*</span>}
                            </Label>

                            {req.type === 'text' ? (
                                <Textarea
                                    id={req.id}
                                    value={answers[req.id] || ''}
                                    onChange={e => handleChange(req.id, e.target.value)}
                                    placeholder="Sua resposta..."
                                    className="bg-[#12121a] border-white/10 text-white min-h-[100px]"
                                    required={req.required}
                                />
                            ) : (
                                <Input
                                    id={req.id}
                                    value={answers[req.id] || ''}
                                    onChange={e => handleChange(req.id, e.target.value)}
                                    className="bg-[#12121a] border-white/10 text-white"
                                    required={req.required}
                                />
                            )}
                        </div>
                    ))}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-lg"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Send className="w-5 h-5 mr-2" />
                        )}
                        Enviar Informações
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
