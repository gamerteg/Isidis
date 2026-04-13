# 05 - Integrações Externas e APIs de Terceiros

## 1. Asaas (Gateway de Pagamentos — PIX, Cartão e Saques)
O **Asaas** é o gateway unificado para o mercado brasileiro, cobrindo PIX, cartão de crédito e transferências bancárias (saques). Substitui o AbacatePay (PIX) e o Stripe (cartão).

> **Migração em andamento:** ver `skills/asaas.md` para o plano de implementação completo.

### 1.1 Funcionalidades Utilizadas
- **PIX (Cobrança):** `POST /payments` com `billingType: PIX` + `GET /payments/{id}/pixQrCode`.
- **Cartão de Crédito:** `POST /payments` com `billingType: CREDIT_CARD` + token gerado pelo frontend.
- **Saques:** `POST /transfers` com `operationType: PIX` para transferir saldo às tarólogas.
- **Customers:** Toda cobrança exige um Customer Asaas — criado/buscado por CPF antes do checkout.
- **Webhooks:** Confirmação de pagamento (`PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`), expiração (`PAYMENT_OVERDUE`), estorno (`PAYMENT_REFUNDED`), saque (`TRANSFER_DONE`, `TRANSFER_FAILED`).

### 1.2 Endpoints principais
| Ação | Endpoint |
|------|----------|
| Criar cobrança PIX ou Cartão | `POST /payments` |
| Buscar QR Code PIX | `GET /payments/{id}/pixQrCode` |
| Consultar status de pagamento | `GET /payments/{id}` |
| Criar/buscar customer | `POST /customers` / `GET /customers?cpfCnpj=...` |
| Solicitar saque PIX | `POST /transfers` |

### 1.3 Arquivos de integração (API Fastify)
- Plugin: `src/plugins/asaas.ts`
- Checkout: `src/routes/checkout/index.ts`
- Webhook: `src/routes/webhooks/asaas.ts`
- Saque: `src/routes/wallet/index.ts`

### 1.4 Unidade monetária
O Asaas usa **reais com decimais** (ex: `49.90`). O banco e a lógica interna usam **centavos inteiros** (ex: `4990`). Converter sempre com `toAsaas(centavos) = centavos / 100`.

---

## 2. Supabase (Backend as a Service)
Infraestrutura central que provê:
- **Auth:** Login social (Google) e E-mail/Senha.
- **Database:** PostgreSQL com RLS.
- **Storage:** Buckets para `avatars`, `gigs`, `readings` (áudio/imagem) e `verifications`.
- **Realtime:** Inscrição em canais para chat e notificações de status de pedido.

## 3. Firebase (Notificações Push)
Integrado via `firebase-admin` na Fastify API e `firebase_messaging` no Flutter.
- Utilizado para alertar tarólogas sobre novos pedidos e clientes sobre a entrega da leitura.

## 4. Resend (E-mail Transacional)
Utilizado para envio de:
- Confirmação de cadastro.
- Alertas de novos pedidos.
- Recuperação de senha.
- Notificações de sistema.

## 5. Configurações de Ambiente (Variáveis Críticas)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Apenas backend)
- `ASAAS_API_KEY` — credencial Asaas (`$aact_...` produção / `$aact_sandbox_...` sandbox)
- `ASAAS_WEBHOOK_TOKEN` — token configurado no painel Asaas para validar webhooks
- `ASAAS_CARD_FEE_PERCENT` / `ASAAS_CARD_FEE_FIXED` — taxas de cartão deduzidas do net da leitora
- `RESEND_API_KEY`

### Variáveis removidas (AbacatePay + Stripe)
```
ABACATE_PAY_API_KEY        # removido
ABACATE_WEBHOOK_SECRET     # removido
STRIPE_SECRET_KEY          # removido
STRIPE_PUBLISHABLE_KEY     # removido
STRIPE_WEBHOOK_SECRET      # removido
STRIPE_CARD_FEE_PERCENT    # substituído por ASAAS_CARD_FEE_PERCENT
STRIPE_CARD_FEE_FIXED      # substituído por ASAAS_CARD_FEE_FIXED
```
