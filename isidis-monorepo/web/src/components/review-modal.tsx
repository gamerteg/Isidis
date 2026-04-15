import { useState } from 'react'
import { Loader2, Star } from 'lucide-react'

import { submitReview } from '@/app/actions/reviews'
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
import { Textarea } from '@/components/ui/textarea'

interface ReviewModalProps {
  orderId: string
  gigId: string
  readerId: string
  trigger?: (open: () => void) => React.ReactNode
  children?: React.ReactNode
}

export function ReviewModal({ orderId, gigId, readerId, children }: ReviewModalProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return

    setLoading(true)

    const formData = new FormData()
    formData.append('order_id', orderId)
    formData.append('gig_id', gigId)
    formData.append('reader_id', readerId)
    formData.append('rating', rating.toString())
    formData.append('comment', comment)

    const result = await submitReview(formData)
    setLoading(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    setOpen(false)
    alert('Avaliacao enviada com sucesso!')
    window.dispatchEvent(
      new CustomEvent('review:submitted', {
        detail: { orderId, rating },
      }),
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#12121a] text-white border-white/10">
        <DialogHeader>
          <DialogTitle>Avaliar Atendimento</DialogTitle>
          <DialogDescription className="text-slate-400">
            Como foi sua experiencia? Sua avaliacao ajuda outros clientes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`transition-all ${rating >= star ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-500'}`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
          </div>
          <div className="text-center text-sm font-medium text-amber-400 h-6">
            {rating === 1 && 'Ruim'}
            {rating === 2 && 'Razoavel'}
            {rating === 3 && 'Bom'}
            {rating === 4 && 'Muito Bom'}
            {rating === 5 && 'Excelente!'}
          </div>

          <Textarea
            placeholder="Deixe um comentario opcional..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="bg-[#0a0a0f] border-white/10 text-white min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="bg-amber-400 hover:bg-amber-500 text-black font-bold">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar Avaliacao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
