import { FastifyPluginAsync } from 'fastify'
import path from 'path'
import { z } from 'zod'
import { sendOrderDelivered } from '../../services/email.js'

// BUG-12: MIME types permitidos por categoria
const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_AUDIO_MIMES = new Set(['audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac'])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg',
  'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
}

// BUG-23: schema de validação para o conteúdo de entrega
const deliveryContentSchema = z.object({
  audio_url: z.string().url().optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  text: z.string().max(5000).optional(),
  card_spread: z.array(z.string()).max(30).optional(),
}).strict()

const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /orders/:id/delivery/upload — upload de áudio ou foto para Supabase Storage
  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/delivery/upload',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: orderId } = request.params
      const { id: userId } = request.user

      // Verificar que o reader é dono do pedido
      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, reader_id, status')
        .eq('id', orderId)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido não encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissão' })
      if (!['PAID', 'DELIVERED'].includes(order.status)) {
        return reply.status(400).send({ error: 'Pedido não está em estado válido para upload' })
      }

      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

      const typeField = data.fields?.type
      const fileType = (typeField && !Array.isArray(typeField) && 'value' in typeField ? typeField.value : 'audio') as string

      // BUG-12: validar MIME type real do arquivo (não confiar apenas no campo 'type' do formulário)
      const actualMime = data.mimetype ?? ''
      const isPhoto = fileType === 'photo'
      const allowedMimes = isPhoto ? ALLOWED_PHOTO_MIMES : ALLOWED_AUDIO_MIMES

      if (!allowedMimes.has(actualMime)) {
        return reply.status(400).send({
          error: `Tipo de arquivo inválido: ${actualMime}. Aceito: ${[...allowedMimes].join(', ')}`,
        })
      }

      const ext = MIME_TO_EXT[actualMime] ?? (isPhoto ? 'jpg' : 'm4a')
      const fileName = `${orderId}/${fileType}_${Date.now()}.${ext}`
      const contentType = actualMime

      const buffer = await data.toBuffer()

      const { error: uploadError } = await fastify.supabase.storage
        .from('readings')
        .upload(fileName, buffer, {
          contentType,
          upsert: false,
        })

      if (uploadError) {
        request.log.error({ uploadError }, '[delivery/upload] Erro no Supabase Storage')
        return reply.status(500).send({ error: 'Erro ao fazer upload do arquivo' })
      }

      const { data: urlData } = fastify.supabase.storage
        .from('readings')
        .getPublicUrl(fileName)

      return reply.status(201).send({
        data: { url: urlData.publicUrl, file_name: fileName },
      })
    }
  )

  // POST /orders/:id/delivery/draft — salvar rascunho (não muda status)
  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/delivery/draft',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: orderId } = request.params
      const { id: userId } = request.user

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, reader_id, status')
        .eq('id', orderId)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido não encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissão' })

      // BUG-23: validar schema do conteúdo de entrega antes de salvar
      const parsed = deliveryContentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Conteúdo de entrega inválido', details: parsed.error.flatten() })
      }

      await fastify.supabase
        .from('orders')
        .update({ delivery_content: parsed.data })
        .eq('id', orderId)

      return reply.send({ data: { message: 'Rascunho salvo.' } })
    }
  )

  // POST /orders/:id/delivery/submit — enviar leitura final (muda status para DELIVERED)
  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/delivery/submit',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: orderId } = request.params
      const { id: userId } = request.user

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, reader_id, client_id, status, gigs(title)')
        .eq('id', orderId)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido não encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissão' })
      if (order.status !== 'PAID') {
        return reply.status(400).send({ error: 'Apenas pedidos pagos podem ser entregues' })
      }

      // Salvar conteúdo e mudar status para DELIVERED
      // BUG-10: setar delivered_at para uso na janela de disputa e no cron de auto-complete
      await fastify.supabase
        .from('orders')
        .update({
          delivery_content: request.body,
          status: 'DELIVERED',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      // Notificação para o cliente
      await fastify.supabase.from('notifications').insert({
        user_id: order.client_id,
        type: 'ORDER_STATUS',
        title: 'Sua leitura chegou! ✨',
        message: `${(order as any).gigs?.title ?? 'Sua leitura'} está pronta. Toque para ver.`,
        link: `/readings/${orderId}`,
      })

      // BUG-21: usar template centralizado de email em vez de HTML hardcoded
      try {
        const { data: clientAuth } = await fastify.supabase.auth.admin.getUserById(order.client_id)
        const { data: readerProfile } = await fastify.supabase
          .from('profiles').select('full_name').eq('id', userId).single()
        const { data: clientProfile } = await fastify.supabase
          .from('profiles').select('full_name').eq('id', order.client_id).single()

        if (clientAuth.user?.email) {
          await sendOrderDelivered({
            clientEmail: clientAuth.user.email,
            clientName: clientProfile?.full_name ?? 'Cliente',
            readerName: readerProfile?.full_name ?? 'Cartomante',
            gigTitle: (order as any).gigs?.title ?? 'Leitura',
            orderId,
          })
        }
      } catch (emailErr) {
        request.log.error({ emailErr }, '[delivery/submit] Erro ao enviar email')
      }

      return reply.send({ data: { message: 'Leitura entregue com sucesso!' } })
    }
  )
}

export default deliveryRoutes
