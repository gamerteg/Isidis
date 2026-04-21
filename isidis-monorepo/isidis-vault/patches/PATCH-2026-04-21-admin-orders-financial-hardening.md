# PATCH - Admin Orders + Financial Hardening

**Data:** 2026-04-21  
**Status:** Concluido ✅

---

## Causa raiz

O painel `admin` estava misturando duas estrategias de acesso:

1. `Supabase anon` no navegador para auth e algumas contagens
2. `service role` exposta no frontend para listar `orders`, `transactions`, `users`, `tickets` e aprovacoes

Isso gerava dois problemas criticos:

- risco grave de seguranca por chave privilegiada no browser
- inconsistencias operacionais no admin, porque partes do painel liam com permissao diferente e varias telas nao revalidavam automaticamente

No caso especifico de pedidos/financeiro, o efeito visivel era:

- pedidos nao aparecendo ou ficando divergentes do banco
- KPIs financeiros parados ate refresh manual
- ausencia de sinalizacao quando webhook/cron estavam deixando backlog operacional

---

## Mudancas aplicadas

### 1. Backend: rotas administrativas dedicadas

Criado `api/src/routes/admin/index.ts` e registrado em `api/src/app.ts`.

Rotas principais:

- `GET /admin/dashboard`
- `GET /admin/orders`
- `GET /admin/orders/:id`
- `POST /admin/orders/:id/cancel`
- `POST /admin/orders/:id/resolve-dispute`
- `GET /admin/financials`
- `GET /admin/withdrawals`
- `POST /admin/withdrawals/:id/status`

Rotas adicionais para manter o admin funcional sem `service role` no browser:

- `GET /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id`
- `GET /admin/users/:id/orders`
- `GET /admin/users/:id/wallet`
- `POST /admin/users/:id/suspend`
- `POST /admin/users/:id/activate`
- `POST /admin/users/:id/role`
- `GET /admin/approvals/readers`
- `GET /admin/approvals/readers/:id`
- `POST /admin/approvals/readers/:id/approve`
- `POST /admin/approvals/readers/:id/reject`
- `POST /admin/approvals/readers/:id/suspend`
- `GET /admin/verification-documents/signed-url`
- `GET /admin/gigs`
- `POST /admin/gigs/:id/approve`
- `POST /admin/gigs/:id/reject`
- `GET /admin/tickets`
- `GET /admin/tickets/:id`
- `POST /admin/tickets/:id/messages`
- `POST /admin/tickets/:id/status`

Todas protegidas por `requireAdmin`.

---

### 2. DTOs e contrato do admin

Criado `admin/src/types/admin-api.ts` com os DTOs principais:

- `AdminDashboardStats`
- `AdminOrderListItem`
- `AdminOrderDetail`
- `AdminFinancialStats`
- `PendingWithdrawalItem`
- `AdminOpsHealth`

O frontend admin agora consome respostas padronizadas da API e nao consulta mais tabelas sensiveis diretamente.

---

### 3. Frontend admin: API centralizada e remocao da service role

Criado `admin/src/lib/apiClient.ts` para chamadas autenticadas via Bearer token do Supabase Auth.

`admin/src/lib/supabase.ts` deixou de criar client com `VITE_SUPABASE_SERVICE_ROLE_KEY`; ficou apenas:

- auth/session com anon key
- alias legado `supabaseAdmin = supabase` para helpers nao privilegiados

Tambem removido o typing de `VITE_SUPABASE_SERVICE_ROLE_KEY` de `admin/src/vite-env.d.ts`.

---

### 4. Dashboard, Orders e Financials com sincronizacao confiavel

Criados:

- `admin/src/hooks/useAutoRefresh.ts`
- `admin/src/components/admin/SyncStatusBar.tsx`
- `admin/src/components/admin/OpsHealthCard.tsx`

Aplicado em:

- `admin/src/pages/DashboardPage.tsx`
- `admin/src/pages/OrdersPage.tsx`
- `admin/src/pages/FinancialsPage.tsx`

Comportamento novo:

- polling a cada 30s
- refresh ao focar a aba
- botao manual de atualizar
- exibicao de ultima atualizacao
- erro de sincronizacao visivel
- bloco de saude operacional quando ha backlog ou configuracao critica ausente

---

### 5. Sinais operacionais no backend

As respostas de dashboard/orders/financials passaram a incluir `AdminOpsHealth` com:

- `stuck_pending_payment_orders`
- `stuck_sale_credit_holds`
- `pending_withdrawals`
- `missing_env`
- `warnings`
- `has_issues`

Checks implementados:

- `orders` em `PENDING_PAYMENT` acima de 35 min
- `SALE_CREDIT` em `PENDING` acima de 48h
- saques `WITHDRAWAL` pendentes
- ausencia de `MERCADOPAGO_WEBHOOK_SECRET`
- ausencia de `CRON_SECRET`

---

### 6. Tickets ajustados para o novo fluxo

`admin/src/services/tickets.ts` passou a usar a API para leitura/mutacao.

`admin/src/pages/TicketDetailPage.tsx` foi ajustado para, ao receber evento realtime de nova mensagem, recarregar o ticket pela API em vez de depender de leitura privilegiada de `profiles` no browser.

---

## Impacto esperado

- o admin deixa de depender de `service role` no frontend
- pedidos e financeiro passam a usar a mesma fonte de verdade no backend
- o painel deixa claro quando o problema e de pipeline operacional e nao apenas de UI
- refresh automatico reduz backlog invisivel para operacao/fiscal

---

## Validacao

- [x] `api`: `cmd /c npm run typecheck`
- [x] `admin`: `cmd /c npx tsc --noEmit`
- [ ] `admin`: `cmd /c npm run build`
  Ambiente atual bloqueou o build com `esbuild spawn EPERM` ao carregar `vite.config.ts`; nao foi erro de TypeScript do projeto.

---

## Checklist de deploy / producao

- remover qualquer uso de `VITE_SUPABASE_SERVICE_ROLE_KEY` do deploy do `admin`
- manter `SUPABASE_SERVICE_ROLE_KEY` apenas na API
- garantir `MERCADOPAGO_WEBHOOK_SECRET` valido na API
- garantir `CRON_SECRET` valido na API
- confirmar scheduler chamando:
  - `/cron/expire-orders`
  - `/cron/complete-orders`
  - `/cron/release-hold`
- confirmar que a origem do painel admin esta incluida em `APP_URL` / `APP_URLS` da API para CORS

---

## Arquivos centrais alterados

- `api/src/routes/admin/index.ts`
- `api/src/app.ts`
- `admin/src/lib/apiClient.ts`
- `admin/src/lib/supabase.ts`
- `admin/src/hooks/useAutoRefresh.ts`
- `admin/src/components/admin/*`
- `admin/src/services/*`
- `admin/src/pages/DashboardPage.tsx`
- `admin/src/pages/OrdersPage.tsx`
- `admin/src/pages/FinancialsPage.tsx`
- `admin/src/pages/TicketDetailPage.tsx`
