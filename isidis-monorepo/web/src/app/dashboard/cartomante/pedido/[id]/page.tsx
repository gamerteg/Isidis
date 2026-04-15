import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ChatWindow } from '@/components/chat/chat-window'
import { useAuth } from '@/hooks/useAuth'

import { EditorWrapper } from './editor-wrapper'
import { getOrder } from './actions'

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<Awaited<ReturnType<typeof getOrder>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(`/login?next=/dashboard/cartomante/pedido/${id}`)
      return
    }
    if (!id) return

    getOrder(id)
      .then((order) => {
        if (!order) {
          navigate('/dashboard/cartomante')
          return
        }
        setData(order)
      })
      .finally(() => setLoading(false))
  }, [authLoading, id, navigate, user])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Carregando pedido...</p>
      </div>
    )
  }

  if (!data || !user) return null

  return (
    <>
      <EditorWrapper
        order={{
          id: data.id,
          status: data.status,
          deliveryContent: data.deliveryContent,
          amountReaderNet: data.amountReaderNet,
          createdAt: data.createdAt,
        }}
        gigTitle={data.gigTitle}
        gigRequirements={data.gigRequirements}
        requirementsAnswers={data.requirementsAnswers}
        clientName={data.clientName}
        clientEmail={data.clientEmail}
        readerName={data.readerName}
      />
      <div className="fixed bottom-6 right-6 z-50">
        <ChatWindow
          currentUser={{ id: user.id }}
          otherUser={{ id: data.clientId, name: data.clientName, avatar: undefined }}
          orderId={id}
          title={`Chat com ${data.clientName.split(' ')[0]}`}
          variant="floating"
          isCartomante={true}
        />
      </div>
    </>
  )
}
