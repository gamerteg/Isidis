import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { listTransactionsSchema } from '../../schemas/index.js'

const withdrawSchema = z.object({
  amount: z.number().int().min(100),
  pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
  pix_key: z.string().min(1),
  notes: z.string().optional(),
})



const walletRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /wallet/balance â€” saldo do reader com timeline de desbloqueio
  fastify.get(
    '/wallet/balance',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const { id } = request.user

      // Buscar ou criar wallet
      let { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', id)
        .single()

      if (!wallet) {
        const { data: newWallet, error: createError } = await fastify.supabase
          .from('wallets')
          .insert({ user_id: id })
          .select('id')
          .single()

        if (createError) {
          return reply.status(500).send({ error: 'Erro ao criar carteira' })
        }
        wallet = newWallet
      }

      // Buscar todas as transactions COMPLETED (saldo disponÃ­vel)
      const { data: completedTx } = await fastify.supabase
        .from('transactions')
        .select('amount')
        .eq('wallet_id', wallet.id)
        .eq('status', 'COMPLETED')

      // Saques pendentes ja reservam saldo e nao devem aparecer como disponiveis
      const { data: pendingWithdrawals } = await fastify.supabase
        .from('transactions')
        .select('amount')
        .eq('wallet_id', wallet.id)
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'PENDING')

      // Buscar transactions PENDING com created_at (para calcular quando libera)
      const { data: pendingTx } = await fastify.supabase
        .from('transactions')
        .select('id, amount, created_at, order_id')
        .eq('wallet_id', wallet.id)
        .eq('status', 'PENDING')
        .eq('type', 'SALE_CREDIT')
        .order('created_at', { ascending: true })

      const completedBalance = (completedTx ?? []).reduce((sum, tx) => sum + tx.amount, 0)
      const reservedWithdrawals = Math.abs(
        (pendingWithdrawals ?? []).reduce((sum, tx) => sum + tx.amount, 0)
      )
      const available = completedBalance - reservedWithdrawals
      const pending = (pendingTx ?? []).reduce((sum, tx) => sum + tx.amount, 0)

      // Timeline: cada pending com data exata de liberaÃ§Ã£o (created_at + 48h)
      const pendingItems = (pendingTx ?? []).map((tx) => {
        const releasesAt = new Date(tx.created_at)
        releasesAt.setHours(releasesAt.getHours() + 48)
        return {
          amount: tx.amount,
          releasesAt: releasesAt.toISOString(),
          orderId: tx.order_id,
          transactionId: tx.id,
        }
      })

      return reply.send({
        data: {
          available,
          pending,
          pendingItems,
          reservedWithdrawals,
          total: available + pending,
        },
      })
    }
  )

  // GET /wallet/transactions â€” histÃ³rico de transaÃ§Ãµes
  fastify.get(
    '/wallet/transactions',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const query = listTransactionsSchema.safeParse(request.query)
      if (!query.success) {
        return reply.status(400).send({ error: query.error.flatten() })
      }

      const { type, page, limit } = query.data
      const offset = (page - 1) * limit

      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', request.user.id)
        .single()

      if (!wallet) {
        return reply.send({ data: [], pagination: { total: 0, page, limit, pages: 0 } })
      }

      let dbQuery = fastify.supabase
        .from('transactions')
        .select(`
          id, amount, type, status, created_at, external_id,
          orders(id, payment_method, amount_card_fee, card_fee_responsibility, gigs(title))
        `, { count: 'exact' })
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (type) {
        dbQuery = dbQuery.eq('type', type)
      }

      const { data, error, count } = await dbQuery

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      return reply.send({
        data,
        pagination: {
          total: count ?? 0,
          page,
          limit,
          pages: Math.ceil((count ?? 0) / limit),
        },
      })
    }
  )

  fastify.get(
    '/wallet/statement',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const query = request.query as { month?: string }
      const month = query.month ?? new Date().toISOString().slice(0, 7)

      if (!/^\d{4}-\d{2}$/.test(month)) {
        return reply.status(400).send({ error: 'Mes invalido. Use o formato YYYY-MM.' })
      }

      const start = new Date(`${month}-01T00:00:00.000Z`)
      if (Number.isNaN(start.getTime())) {
        return reply.status(400).send({ error: 'Mes invalido. Use o formato YYYY-MM.' })
      }

      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))

      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', request.user.id)
        .single()

      if (!wallet) {
        return reply.status(404).send({ error: 'Carteira nao encontrada' })
      }

      const { data: transactions, error } = await fastify.supabase
        .from('transactions')
        .select('id, amount, type, status, created_at, orders(id, gigs(title))')
        .eq('wallet_id', wallet.id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        return reply.status(500).send({ error: error.message })
      }

      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

      const rows = [
        'Data,Tipo,Servico,Valor (R$),Status',
        ...(transactions ?? []).map((tx: any) => {
          const date = new Date(tx.created_at).toLocaleDateString('pt-BR')
          const type =
            tx.type === 'SALE_CREDIT'
              ? 'Venda'
              : tx.type === 'WITHDRAWAL'
                ? 'Saque'
                : tx.type
          const title = tx.orders?.gigs?.title ?? '-'
          const amount = (tx.amount / 100).toFixed(2).replace('.', ',')
          const status =
            tx.status === 'COMPLETED'
              ? 'Concluido'
              : tx.status === 'PENDING'
                ? 'Pendente'
                : tx.status

          return [
            escapeCsv(date),
            escapeCsv(type),
            escapeCsv(title),
            escapeCsv(amount),
            escapeCsv(status),
          ].join(',')
        }),
      ].join('\n')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="extrato-isidis-${month}.csv"`)
      return reply.send('\uFEFF' + rows)
    }
  )

  // POST /wallet/withdraw â€” solicitar saque manual via PIX
  fastify.post(
    '/wallet/withdraw',
    { preHandler: [(fastify as any).requireReader] },
    async (request, reply) => {
      const body = withdrawSchema.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({ error: body.error.flatten() })
      }

      const { id: userId } = request.user
      const { amount, pix_key_type, pix_key, notes } = body.data

      const { data: wallet } = await fastify.supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!wallet) {
        return reply.status(400).send({ error: 'Carteira nao encontrada' })
      }

      // BUG-03: usar RPC atÃ´mica com FOR UPDATE para evitar double-spend concorrente
      const { data: result, error: rpcError } = await fastify.supabase
        .rpc('process_withdrawal', {
          p_wallet_id: wallet.id,
          p_amount: amount,
          p_pix_key_type: pix_key_type,
          p_pix_key: pix_key,
          p_notes: notes ?? null,
        })

      if (rpcError) {
        request.log.error({ rpcError }, '[withdraw] Erro no RPC process_withdrawal')
        const rpcMessage = typeof rpcError.message === 'string' ? rpcError.message : ''
        if (rpcMessage.includes('FOR UPDATE is not allowed with aggregate functions')) {
          return reply.status(500).send({
            error: 'A funcao de saque no banco esta desatualizada. Rode a migration de correcao do process_withdrawal.',
          })
        }
        return reply.status(500).send({ error: 'Erro ao processar saque' })
      }

      if (result?.error) {
        request.log.warn({ result }, '[withdraw] RPC retornou erro de negocio')
        return reply.status(400).send({ error: result.error })
      }

      const { data: pendingWithdrawal } = await fastify.supabase
        .from('transactions')
        .select('id')
        .eq('wallet_id', wallet.id)
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()



      // NotificaÃ§Ã£o interna para admin processar
      await fastify.supabase.from('notifications').insert({
        user_id: userId,
        type: 'SYSTEM',
        title: 'Saque solicitado',
        message: `Saque de R$ ${(amount / 100).toFixed(2)} via PIX (${pix_key_type}) solicitado. Sera processado em ate 1 dia util.`,
        link: '/wallet',
      })

      return reply.send({ data: { message: 'Saque solicitado com sucesso!' } })
    }
  )
}

export default walletRoutes
