import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { sendOrderDelivered } from '../../services/email.js'
import { notifyUser } from '../../services/notify.js'
import { createSignedReadingsUrl } from '../../services/readings-storage.js'

const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
])

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
}

const deliveryCardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    position: z.enum(['upright', 'reversed']).default('upright'),
    interpretation: z.string().max(5000).optional(),
    audio_url: z.string().url().optional(),
    audio_file_name: z.string().optional(),
    order: z.number().int().nonnegative(),
  })
  .strict()

const deliverySectionSchema = z
  .object({
    type: z.enum(['text', 'audio', 'photo']),
    content: z.string().max(5000).optional(),
    url: z.string().url().optional(),
    file_name: z.string().optional(),
    order: z.number().int().nonnegative(),
  })
  .strict()

const deliveryContentBaseSchema = z
  .object({
    method: z.enum(['DIGITAL_SPREAD', 'PHYSICAL']),
    cards: z.array(deliveryCardSchema).max(30).default([]),
    sections: z.array(deliverySectionSchema).max(50).default([]),
    summary: z.string().max(5000).optional(),
  })
  .strict()

type DeliveryContentInput = z.infer<typeof deliveryContentBaseSchema>

function validateDeliveryContentShape(
  value: DeliveryContentInput,
  ctx: z.RefinementCtx,
  requireMinimumContent: boolean
) {
  if (value.method === 'DIGITAL_SPREAD') {
    if (value.sections.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sections'],
        message: 'Leitura digital nao aceita sections.',
      })
    }

    if (requireMinimumContent && value.cards.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cards'],
        message: 'Leitura digital precisa ter ao menos uma carta.',
      })
    }
  }

  if (value.method === 'PHYSICAL') {
    if (value.cards.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cards'],
        message: 'Leitura fisica nao aceita cards.',
      })
    }

    if (requireMinimumContent && value.sections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sections'],
        message: 'Leitura fisica precisa ter ao menos uma secao.',
      })
    }
  }
}

const draftDeliveryContentSchema = deliveryContentBaseSchema.superRefine(
  (value, ctx) => validateDeliveryContentShape(value, ctx, false)
)

const submitDeliveryContentSchema = deliveryContentBaseSchema.superRefine(
  (value, ctx) => validateDeliveryContentShape(value, ctx, true)
)

const deliveryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { id: string } }>(
    '/orders/:id/delivery/upload',
    { preHandler: [(fastify as any).authenticate] },
    async (request, reply) => {
      const { id: orderId } = request.params
      const { id: userId } = request.user

      const { data: order } = await fastify.supabase
        .from('orders')
        .select('id, reader_id, status')
        .eq('id', orderId)
        .single()

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissao' })
      if (!['PAID', 'DELIVERED'].includes(order.status)) {
        return reply.status(400).send({
          error: 'Pedido nao esta em estado valido para upload',
        })
      }

      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

      const typeField = data.fields?.type
      const fileType =
        typeField && !Array.isArray(typeField) && 'value' in typeField
          ? String(typeField.value)
          : 'audio'

      if (!['audio', 'photo'].includes(fileType)) {
        return reply.status(400).send({ error: 'Tipo de upload invalido' })
      }

      const actualMime = data.mimetype ?? ''
      const isPhoto = fileType === 'photo'
      const allowedMimes = isPhoto ? ALLOWED_PHOTO_MIMES : ALLOWED_AUDIO_MIMES

      if (!allowedMimes.has(actualMime)) {
        return reply.status(400).send({
          error: `Tipo de arquivo invalido: ${actualMime}. Aceito: ${[...allowedMimes].join(', ')}`,
        })
      }

      const ext = MIME_TO_EXT[actualMime] ?? (isPhoto ? 'jpg' : 'm4a')
      const fileName = `${orderId}/${fileType}_${Date.now()}.${ext}`
      const buffer = await data.toBuffer()

      const { error: uploadError } = await fastify.supabase.storage
        .from('readings')
        .upload(fileName, buffer, {
          contentType: actualMime,
          upsert: false,
        })

      if (uploadError) {
        request.log.error({ uploadError }, '[delivery/upload] Erro no Supabase Storage')
        return reply.status(500).send({ error: 'Erro ao fazer upload do arquivo' })
      }

      const signedUrl = await createSignedReadingsUrl(fastify, fileName)
      if (!signedUrl) {
        return reply.status(500).send({ error: 'Erro ao gerar URL do arquivo' })
      }

      return reply.status(201).send({
        data: { url: signedUrl, file_name: fileName },
      })
    }
  )

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

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissao' })

      const parsed = draftDeliveryContentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Conteudo de entrega invalido',
          details: parsed.error.flatten(),
        })
      }

      await fastify.supabase
        .from('orders')
        .update({ delivery_content: parsed.data })
        .eq('id', orderId)

      return reply.send({ data: { message: 'Rascunho salvo.' } })
    }
  )

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

      if (!order) return reply.status(404).send({ error: 'Pedido nao encontrado' })
      if (order.reader_id !== userId) return reply.status(403).send({ error: 'Sem permissao' })
      if (order.status !== 'PAID') {
        return reply.status(400).send({ error: 'Apenas pedidos pagos podem ser entregues' })
      }

      const parsed = submitDeliveryContentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Conteudo de entrega invalido',
          details: parsed.error.flatten(),
        })
      }

      await fastify.supabase
        .from('orders')
        .update({
          delivery_content: parsed.data,
          status: 'DELIVERED',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      await notifyUser(fastify, order.client_id, {
        type: 'ORDER_STATUS',
        title: 'Sua leitura chegou!',
        message: `${(order as any).gigs?.title ?? 'Sua leitura'} esta pronta. Toque para ver.`,
        link: `/readings/${orderId}`,
      })

      try {
        const { data: clientAuth } = await fastify.supabase.auth.admin.getUserById(order.client_id)
        const { data: readerProfile } = await fastify.supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()
        const { data: clientProfile } = await fastify.supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.client_id)
          .single()

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
