# Plano de Execução Backend — Isidis (Codex)

**Agente:** Codex  
**Repositório:** `IsidisApp-API/`  
**Executa em paralelo com:** `plano_execucao_frontend.md` (Claude)

## Documentação de referência
- `documentacao/01-arquitetura-geral.md` — visão geral e stack
- `documentacao/03-regras-negocio.md` — taxas, hold 48h, saques
- `documentacao/05-integracoes.md` — integrações atuais e Asaas
- `skills/asaas.md` — guia completo de implementação Asaas (backend)
- `skills/seguranca-pagamentos.md` — fraud.ts, has_dispute, chargeback

## Estado atual — o que EXISTE e NÃO deve ser alterado
- `crons/rank-readers.ts` — já implementado com fórmula completa ✅
- `routes/readers/index.ts` — já ordena por `ranking_score DESC` ✅
- `migrations/fase8_ranking_boost.sql` — já cria coluna `ranking_score` ✅
- `migrations/fase9_quiz_onboarding.sql` — não alterar ✅
- `routes/wallet/index.ts` (GET balance + GET transactions) — não alterar ✅

## Contrato de API (IMUTÁVEL)

### POST /checkout/create — PIX response
```json
{
  "data": {
    "order_id": "uuid",
    "pix_qr_code_id": "string",
    "amount_total": 4900,
    "amount_service_total": 4900,
    "pix": { "qr_code_base64": "string", "copy_paste_code": "string", "expires_at": "ISO" }
  }
}
```

### POST /checkout/create — CARD response (NOVO, sem client_secret)
```json
{
  "data": {
    "order_id": "uuid",
    "payment_method": "CARD",
    "amount_total": 5070,
    "amount_service_total": 4900,
    "amount_card_fee": 170,
    "card_fee_responsibility": "READER",
    "asaas_payment_id": "string",
    "status": "CONFIRMED"
  }
}
```

### GET /checkout/config — NOVO
```json
{ "data": { "gateway": "asaas" } }
```

### GET /checkout/status/:paymentId — MANTIDO
```json
{ "data": { "status": "PAID" | "PENDING" | "OVERDUE", "order_id": "uuid" } }
```

---

## Variáveis de ambiente a adicionar no `.env`

```env
# Adicionar:
ASAAS_API_KEY=            # $aact_sandbox_... (dev) ou $aact_... (prod)
ASAAS_WEBHOOK_TOKEN=      # token configurado no painel Asaas
ASAAS_ENV=sandbox         # 'sandbox' em dev, remover em prod
ASAAS_CARD_FEE_PERCENT=0.0349
ASAAS_CARD_FEE_FIXED=39

# Remover (após implementação completa):
# STRIPE_SECRET_KEY
# STRIPE_PUBLISHABLE_KEY
# STRIPE_WEBHOOK_SECRET
# STRIPE_CARD_FEE_PERCENT
# STRIPE_CARD_FEE_FIXED
# ABACATE_PAY_API_KEY
# ABACATE_WEBHOOK_SECRET
```

---

## TAREFA 1 — Criar `src/plugins/asaas.ts`

**Arquivo:** `IsidisApp-API/src/plugins/asaas.ts` (CRIAR — não existe)  
**Dependência:** nenhuma — executar primeiro

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const ASAAS_BASE_URL = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

export async function asaasRequest(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'access_token': process.env.ASAAS_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data.errors?.[0]?.description ?? data.error ?? `Asaas HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

export async function getOrCreateAsaasCustomer(
  asaas: typeof asaasRequest,
  params: { name: string; email: string; cpfCnpj: string; mobilePhone?: string }
): Promise<string> {
  const cpfOnlyDigits = params.cpfCnpj.replace(/\D/g, '')
  const search = await asaas(`/customers?cpfCnpj=${cpfOnlyDigits}`)
  if (search.data?.length > 0) return search.data[0].id

  const customer = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      cpfCnpj: cpfOnlyDigits,
      mobilePhone: params.mobilePhone,
    }),
  })
  return customer.id
}

declare module 'fastify' {
  interface FastifyInstance {
    asaas: typeof asaasRequest
  }
}

const asaasPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('asaas', asaasRequest)
}

export default fp(asaasPlugin, { name: 'asaas' })
```

**Verificação:** `npx tsc --noEmit` sem erros de tipo.

---

## TAREFA 2 — Criar migration `has_dispute` e `metadata`

**Arquivo:** `IsidisApp-API/migrations/fase12_security.sql` (CRIAR)  
**Dependência:** nenhuma — pode rodar em paralelo com Tarefa 1

```sql
-- Coluna dedicada para disputa (substitui hack com late_alert_sent_at)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN NOT NULL DEFAULT FALSE;

-- Metadata de auditoria (IP, user-agent, fraud flags)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Índice para queries de admin e cron
CREATE INDEX IF NOT EXISTS idx_orders_dispute 
  ON orders(has_dispute) WHERE has_dispute = TRUE;

-- Nota: o campo disputed_at já existe e é usado pelo release-hold.ts
-- has_dispute é um boolean simples para filtragem rápida
-- Sincronizar: quando has_dispute = TRUE, disputed_at deve estar preenchido
```

**Executar no Supabase:** SQL Editor → colar e executar.

---

## TAREFA 3 — Criar `src/services/fraud.ts`

**Arquivo:** `IsidisApp-API/src/services/fraud.ts` (CRIAR)  
**Dependência:** Tarefa 2 (coluna `metadata` deve existir)

```typescript
import { SupabaseClient } from '@supabase/supabase-js'

interface FraudCheckParams {
  clientId: string
  gigId: string
  amount: number        // em centavos
  clientIp: string
  clientCreatedAt: string  // ISO string
}

export interface FraudCheckResult {
  allowed: boolean
  reason?: string
  flags: string[]
}

export async function checkFraud(
  supabase: SupabaseClient,
  params: FraudCheckParams
): Promise<FraudCheckResult> {
  const flags: string[] = []
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // Regra 1: > 3 orders/h do mesmo cliente → BLOCK
  const { count: ordersLastHour } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.clientId)
    .gte('created_at', oneHourAgo)
    .neq('status', 'CANCELED')

  if ((ordersLastHour ?? 0) >= 3) {
    return {
      allowed: false,
      reason: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos.',
      flags: ['velocity_hourly'],
    }
  }

  // Regra 2: > 10 orders/dia do mesmo cliente → BLOCK
  const { count: ordersLastDay } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.clientId)
    .gte('created_at', oneDayAgo)
    .neq('status', 'CANCELED')

  if ((ordersLastDay ?? 0) >= 10) {
    return {
      allowed: false,
      reason: 'Limite diário de pedidos atingido.',
      flags: ['velocity_daily'],
    }
  }

  // Regra 3: conta nova (< 24h) + valor > R$200 → FLAG (não bloqueia)
  const accountAge = now.getTime() - new Date(params.clientCreatedAt).getTime()
  if (accountAge < 24 * 60 * 60 * 1000 && params.amount > 20000) {
    flags.push('new_account_high_value')
  }

  // Regra 4: mesmo gig em < 24h → BLOCK
  const { count: sameGigCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', params.clientId)
    .eq('gig_id', params.gigId)
    .gte('created_at', oneDayAgo)
    .neq('status', 'CANCELED')

  if ((sameGigCount ?? 0) >= 1) {
    return {
      allowed: false,
      reason: 'Você já possui um pedido recente deste serviço.',
      flags: ['duplicate_gig'],
    }
  }

  // Regra 5: > 5 PIX expirados/h do mesmo IP → BLOCK
  const { count: expiredPix } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'CANCELED')
    .eq('payment_method', 'PIX')
    .gte('created_at', oneHourAgo)
    .contains('metadata', { client_ip: params.clientIp })

  if ((expiredPix ?? 0) >= 5) {
    return {
      allowed: false,
      reason: 'Muitas tentativas. Tente novamente mais tarde.',
      flags: ['pix_expired_velocity'],
    }
  }

  return { allowed: true, flags }
}
```

---

## TAREFA 4 — Reescrever `src/routes/checkout/index.ts`

**Arquivo:** `IsidisApp-API/src/routes/checkout/index.ts` (REESCREVER completamente)  
**Dependência:** Tarefas 1, 2 e 3

**O que remover:**
- Todas as importações e usos de `fastify.stripe`
- Todas as chamadas ao AbacatePay (`ABACATE_API_URL`, `fetch` para AbacatePay)
- Constantes `STRIPE_CARD_FEE_PERCENT`, `STRIPE_CARD_FEE_FIXED`
- Função `normalizeQrCodeBase64` (o Asaas retorna base64 limpo)

**O que manter:**
- Validações de gig (is_active, status, owner check)
- Verificações de capacidade do reader (max_simultaneous, max_orders_per_day)
- Validação do perfil do cliente (tax_id, cellphone)
- Cálculo de add-ons e platform fee (15%)
- Função `sanitizePixDescription`
- Lógica de card_fee_responsibility = 'READER'

**Novas constantes:**
```typescript
const ASAAS_CARD_FEE_PERCENT = parseFloat(process.env.ASAAS_CARD_FEE_PERCENT ?? '0.0349')
const ASAAS_CARD_FEE_FIXED = parseInt(process.env.ASAAS_CARD_FEE_FIXED ?? '39', 10)
```

**Helper de conversão:**
```typescript
const toAsaas = (centavos: number) => centavos / 100  // Asaas usa reais
```

**Novo schema de request (CARD tem campos extras):**
```typescript
const createCheckoutSchema = z.object({
  gig_id: z.string().uuid(),
  add_on_ids: z.array(z.string()).default([]),
  requirements_answers: z.record(z.string(), z.string()).default({}),
  payment_method: z.enum(['PIX', 'CARD']).default('PIX'),
  // Campos de cartão (obrigatórios quando payment_method = CARD):
  card_token: z.string().optional(),
  card_holder_name: z.string().optional(),
  card_holder_postal_code: z.string().optional(),
  card_holder_address_number: z.string().optional(),
})
```

**GET /checkout/config — novo:**
```typescript
fastify.get('/checkout/config', async (_request, reply) => {
  return reply.send({ data: { gateway: 'asaas' } })
})
```

**POST /checkout/create — fluxo PIX (após criar order):**
```typescript
import { getOrCreateAsaasCustomer } from '../../plugins/asaas.js'

// ... após criar order ...

const customerId = await getOrCreateAsaasCustomer(fastify.asaas, {
  name: clientProfile.full_name,
  email: clientEmail,
  cpfCnpj: clientProfile.tax_id,
  mobilePhone: clientProfile.cellphone,
})

const dueDate = new Date(Date.now() + 10 * 60 * 1000)
const pixDescription = sanitizePixDescription(order.id, gig.title)

const charge = await fastify.asaas('/payments', {
  method: 'POST',
  body: JSON.stringify({
    customer: customerId,
    billingType: 'PIX',
    value: toAsaas(totalAmount),
    dueDate: dueDate.toISOString().split('T')[0],
    description: pixDescription,
    externalReference: order.id,
  }),
})

const pixData = await fastify.asaas(`/payments/${charge.id}/pixQrCode`)

await fastify.supabase
  .from('orders')
  .update({ asaas_payment_id: charge.id, metadata: orderMetadata })
  .eq('id', order.id)

return reply.status(201).send({
  data: {
    order_id: order.id,
    pix_qr_code_id: charge.id,
    amount_total: totalAmount,
    amount_service_total: serviceAmount,
    pix: {
      qr_code_base64: pixData.encodedImage ?? null,
      copy_paste_code: pixData.payload ?? null,
      expires_at: charge.dueDate ?? null,
    },
  },
})
```

**POST /checkout/create — fluxo CARD (após criar order):**
```typescript
if (payment_method === 'CARD') {
  const { card_token, card_holder_name, card_holder_postal_code, card_holder_address_number } = body.data

  if (!card_token) {
    await fastify.supabase.from('orders').update({ status: 'CANCELED' }).eq('id', order.id)
    return reply.status(400).send({ error: 'Token de cartão é obrigatório para pagamento com cartão' })
  }

  const customerId = await getOrCreateAsaasCustomer(fastify.asaas, {
    name: clientProfile.full_name,
    email: clientEmail,
    cpfCnpj: clientProfile.tax_id,
    mobilePhone: clientProfile.cellphone,
  })

  let charge: any
  try {
    charge = await fastify.asaas('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: toAsaas(totalAmount),
        dueDate: new Date().toISOString().split('T')[0],
        description: gig.title.slice(0, 100),
        externalReference: order.id,
        creditCardToken: card_token,
        creditCardHolderInfo: {
          name: card_holder_name ?? clientProfile.full_name,
          email: clientEmail,
          cpfCnpj: clientProfile.tax_id.replace(/\D/g, ''),
          postalCode: card_holder_postal_code ?? '',
          addressNumber: card_holder_address_number ?? '',
          phone: clientProfile.cellphone ?? '',
        },
        installmentCount: 1,
        installmentValue: toAsaas(totalAmount),
      }),
    })
  } catch (asaasErr: any) {
    await fastify.supabase.from('orders').update({ status: 'CANCELED' }).eq('id', order.id)
    request.log.error({ err: asaasErr.message }, '[checkout] Erro no Asaas CARD')
    return reply.status(500).send({ error: 'Erro ao processar cartão. Tente novamente.' })
  }

  await fastify.supabase
    .from('orders')
    .update({ asaas_payment_id: charge.id, metadata: orderMetadata })
    .eq('id', order.id)

  return reply.status(201).send({
    data: {
      order_id: order.id,
      payment_method: 'CARD',
      amount_total: totalAmount,
      amount_service_total: serviceAmount,
      amount_card_fee: cardFee,
      card_fee_responsibility: 'READER',
      asaas_payment_id: charge.id,
      status: charge.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
    },
  })
}
```

**Integrar fraud check logo após validar perfil do cliente:**
```typescript
import { checkFraud } from '../../services/fraud.js'

const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip
const { data: clientAuthData } = await fastify.supabase.auth.admin.getUserById(clientId)

const fraudCheck = await checkFraud(fastify.supabase, {
  clientId,
  gigId: gig_id,
  amount: serviceAmount,
  clientIp,
  clientCreatedAt: clientAuthData.user?.created_at ?? new Date().toISOString(),
})

if (!fraudCheck.allowed) {
  return reply.status(429).send({ error: fraudCheck.reason })
}

const orderMetadata = {
  client_ip: clientIp,
  user_agent: request.headers['user-agent'] ?? '',
  fraud_flags: fraudCheck.flags,
}
```

**GET /checkout/status/:paymentId:**
```typescript
fastify.get<{ Params: { paymentId: string } }>(
  '/checkout/status/:paymentId',
  { preHandler: [(fastify as any).authenticate] },
  async (request, reply) => {
    const { paymentId } = request.params

    const { data: order } = await fastify.supabase
      .from('orders')
      .select('id, status, client_id')
      .eq('asaas_payment_id', paymentId)
      .single()

    if (!order || order.client_id !== request.user.id) {
      return reply.status(404).send({ error: 'Pedido não encontrado' })
    }

    if (order.status === 'PAID') {
      return reply.send({ data: { status: 'PAID', order_id: order.id } })
    }

    // Consultar Asaas apenas se ainda PENDING_PAYMENT
    try {
      const charge = await fastify.asaas(`/payments/${paymentId}`)
      const asaasStatus = charge.status  // 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE'
      const mappedStatus = ['CONFIRMED', 'RECEIVED'].includes(asaasStatus) ? 'PAID' : asaasStatus
      return reply.send({ data: { status: mappedStatus, order_id: order.id } })
    } catch {
      return reply.send({ data: { status: 'PENDING', order_id: order.id } })
    }
  }
)
```

---

## TAREFA 5 — Criar `src/routes/webhooks/asaas.ts`

**Arquivo:** `IsidisApp-API/src/routes/webhooks/asaas.ts` (CRIAR)  
**Dependência:** Tarefa 1 (`fastify.asaas` disponível)

Importar os mesmos helpers de email dos webhooks atuais:
```typescript
import { sendOrderPaidToReader, sendOrderPaidToClient } from '../../services/email.js'
```

**Eventos a tratar:**

| Evento | Ação |
|--------|------|
| `PAYMENT_RECEIVED` | PIX confirmado → order PAID |
| `PAYMENT_CONFIRMED` | Cartão confirmado → order PAID |
| `PAYMENT_OVERDUE` | PIX expirado → order CANCELED |
| `PAYMENT_REFUNDED` | Estorno → order CANCELED |
| `PAYMENT_CHARGEBACK_REQUESTED` | Disputa aberta → `has_dispute=true` + ticket |
| `PAYMENT_CHARGEBACK_DONE` | Disputa encerrada → liberar ou PLATFORM_RESERVE |
| `TRANSFER_DONE` | Saque concluído → transaction COMPLETED |
| `TRANSFER_FAILED` | Saque falhou → transaction FAILED |

**Validação de autenticidade:**
```typescript
const token = request.headers['asaas-access-token'] as string
if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
  return reply.status(401).send({ error: 'Unauthorized' })
}
```

**Fluxo pós-pagamento (PAYMENT_RECEIVED ou PAYMENT_CONFIRMED) — IDÊNTICO ao abacate.ts atual:**
1. Buscar order por `asaas_payment_id`
2. Guard atômico: update `status='PAID'` WHERE `status='PENDING_PAYMENT'` + `.select('id').single()`
3. Se `!updated` → idempotência, return `{ received: true }`
4. Criar/buscar wallet do reader
5. Inserir `SALE_CREDIT` com `status='PENDING'`
6. Inserir notificação `ORDER_NEW` para o reader
7. Enviar emails (sendOrderPaidToReader + sendOrderPaidToClient)

**Chargeback handlers:**
```typescript
if (event === 'PAYMENT_CHARGEBACK_REQUESTED') {
  // 1. has_dispute = true (não liberar no release-hold)
  const { data: order } = await fastify.supabase
    .from('orders')
    .update({ has_dispute: true })
    .eq('asaas_payment_id', paymentId)
    .select('id, reader_id, client_id, amount_total')
    .single()

  // 2. Criar ticket de suporte (tabela tickets se existir, senão logar)
  if (order) {
    await fastify.supabase.from('tickets').insert({
      order_id: order.id,
      type: 'CHARGEBACK',
      title: `Chargeback — Pedido ${order.id}`,
      status: 'OPEN',
    }).catch(() => {})  // não bloquear se tabela não existir
  }
}

if (event === 'PAYMENT_CHARGEBACK_DONE') {
  const chargebackStatus = payload.payment?.chargebackStatus
  if (chargebackStatus === 'DONE') {
    // Plataforma ganhou — liberar normalmente
    await fastify.supabase.from('orders').update({ has_dispute: false }).eq('asaas_payment_id', paymentId)
    await fastify.supabase.from('transactions')
      .update({ status: 'COMPLETED' })
      .eq('order_id', order?.id)
      .eq('type', 'SALE_CREDIT')
      .eq('status', 'PENDING')
  } else if (chargebackStatus === 'DISPUTE_LOST') {
    // Plataforma perdeu — PLATFORM_RESERVE (não debitar da leitora)
    // Cancelar SALE_CREDIT pendente
    await fastify.supabase.from('transactions')
      .update({ status: 'FAILED' })
      .eq('order_id', order?.id)
      .eq('type', 'SALE_CREDIT')
      .eq('status', 'PENDING')
    // Registrar reserva da plataforma para controle interno
    request.log.warn({ orderId: order?.id }, '[webhook:asaas] Chargeback perdido — absorvido pela plataforma')
  }
}
```

---

## TAREFA 6 — Atualizar `src/routes/wallet/index.ts` (saque via Asaas)

**Arquivo:** `IsidisApp-API/src/routes/wallet/index.ts` (MODIFICAR apenas o POST /wallet/withdraw)  
**Dependência:** Tarefa 1

**Manter intactos:** GET /wallet/balance e GET /wallet/transactions

**No POST /wallet/withdraw, após a RPC `process_withdrawal` retornar sucesso:**

Adicionar chamada ao Asaas `POST /transfers` para efetuar a transferência PIX:

```typescript
// Após o RPC process_withdrawal bem-sucedido:
const { data: readerProfile } = await fastify.supabase
  .from('profiles')
  .select('full_name, tax_id')
  .eq('id', userId)
  .single()

// Mapear pix_key_type (RANDOM → EVP no Asaas)
const asaasPixKeyType = pix_key_type === 'RANDOM' ? 'EVP' : pix_key_type

let transfer: any
try {
  transfer = await fastify.asaas('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      value: amount / 100,  // Asaas usa reais
      bankAccount: {
        ownerName: readerProfile?.full_name ?? '',
        cpfCnpj: (readerProfile?.tax_id ?? '').replace(/\D/g, ''),
        pixAddressKey: pix_key,
        pixAddressKeyType: asaasPixKeyType,
      },
      operationType: 'PIX',
      description: notes ?? `Saque Isidis — ${new Date().toLocaleDateString('pt-BR')}`,
    }),
  })
} catch (asaasErr: any) {
  request.log.error({ err: asaasErr.message }, '[withdraw] Erro no Asaas transfer')
  // Não falhar — o RPC já debitou; registrar para retry manual
  // A transaction já existe com status PENDING; será resolvida manualmente
}

// Atualizar external_id na transaction de WITHDRAWAL para rastrear via webhook
if (transfer?.id) {
  await fastify.supabase
    .from('transactions')
    .update({ external_id: transfer.id })
    .eq('wallet_id', wallet.id)
    .eq('type', 'WITHDRAWAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1)
}
```

---

## TAREFA 7 — Corrigir `src/crons/release-hold.ts`

**Arquivo:** `IsidisApp-API/src/crons/release-hold.ts` (MODIFICAR)  
**Dependência:** Tarefa 2 (coluna `has_dispute` deve existir)

Localizar o select que busca transações PENDING para liberar. Adicionar filtro `has_dispute`:

```typescript
// Adicionar na query de ordens/transações para não liberar disputas:
.eq('orders.has_dispute', false)

// Ou, se usando join:
// Verificar que o filtro por disputed_at TAMBÉM considera has_dispute = false
// Adicionar campo has_dispute ao select de orders e verificar em código:
if (order?.has_dispute) continue  // skip
```

**Atenção:** o campo `disputed_at` já existe e já é checado. Adicionar também `has_dispute`:
```typescript
// Antes: !order?.disputed_at
// Depois: !order?.disputed_at && !order?.has_dispute
```

---

## TAREFA 8 — Atualizar `src/server.ts`

**Arquivo:** `IsidisApp-API/src/server.ts` (MODIFICAR)  
**Dependência:** Tarefas 1, 4, 5

**Remover:**
```typescript
import stripePlugin from './plugins/stripe.js'
// fastify.register(stripePlugin)
// A validação de STRIPE_SECRET_KEY no início
// A validação de ABACATE_PAY_API_KEY
```

**Adicionar:**
```typescript
import asaasPlugin from './plugins/asaas.js'
// fastify.register(asaasPlugin)
```

**Rotas de webhook — trocar:**
```typescript
// Remover (se registrado):
// fastify.register(import('./routes/webhooks/abacate.js'))
// fastify.register(import('./routes/webhooks/stripe.js'))

// Adicionar:
fastify.register(import('./routes/webhooks/asaas.js'))
```

**Validação de env no início do server.ts — atualizar:**
```typescript
// Remover da lista de vars obrigatórias:
// 'STRIPE_SECRET_KEY', 'ABACATE_PAY_API_KEY'

// Adicionar:
'ASAAS_API_KEY'
```

---

## TAREFA 9 — Remover arquivos obsoletos

**Executar APÓS Tarefas 4, 5, 8 estarem prontos e testados.**

Arquivos a deletar:
- `IsidisApp-API/src/plugins/stripe.ts`
- `IsidisApp-API/src/routes/webhooks/abacate.ts`
- `IsidisApp-API/src/routes/webhooks/stripe.ts`

Verificar que nenhum outro arquivo importa esses módulos antes de deletar:
```bash
grep -r "abacate\|stripe" src/ --include="*.ts" -l
```

---

## Ordem de execução recomendada

```
Dia 1:
  [paralelo] Tarefa 1 (plugin asaas) + Tarefa 2 (migration SQL)
  Tarefa 3 (fraud.ts) — após Tarefa 2
  Tarefa 4 (checkout) — após Tarefas 1, 2, 3

Dia 2:
  Tarefa 5 (webhook asaas) — após Tarefa 1
  Tarefa 6 (wallet saque) — após Tarefa 1
  Tarefa 7 (release-hold fix) — após Tarefa 2

Dia 3:
  Tarefa 8 (server.ts) — após Tarefas 1, 4, 5
  Tarefa 9 (remover obsoletos) — último, após tudo testado
```

---

## Checklist de verificação final

- [ ] `npx tsc --noEmit` sem erros
- [ ] PIX: `POST /checkout/create` → retorna `pix_qr_code_id` + `qr_code_base64` + `copy_paste_code`
- [ ] PIX: `GET /checkout/status/:id` → retorna `{ status: 'PENDING' }` antes e `{ status: 'PAID' }` após
- [ ] CARD: `POST /checkout/create` com `card_token` → retorna `asaas_payment_id` + `status: CONFIRMED`
- [ ] Webhook: `PAYMENT_RECEIVED` → order PAID + SALE_CREDIT PENDING + notificação
- [ ] Webhook: `PAYMENT_OVERDUE` → order CANCELED
- [ ] Webhook: `TRANSFER_DONE` → transaction WITHDRAWAL COMPLETED
- [ ] Webhook: `PAYMENT_CHARGEBACK_REQUESTED` → `has_dispute = true`
- [ ] Fraud: 4 pedidos na mesma hora → HTTP 429
- [ ] release-hold: pedido com `has_dispute = true` NÃO é liberado
- [ ] Saque: `POST /wallet/withdraw` → RPC + Asaas `POST /transfers` + external_id salvo
- [ ] `GET /checkout/config` → `{ data: { gateway: 'asaas' } }`
- [ ] Sem imports de Stripe ou AbacatePay remanescentes
