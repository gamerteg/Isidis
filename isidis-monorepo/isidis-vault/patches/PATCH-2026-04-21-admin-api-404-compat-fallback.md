# PATCH - Admin API 404 Compat Fallback

**Data:** 2026-04-21  
**Status:** Concluido ✅

---

## Problema

O frontend novo do `admin` passou a consumir `/admin/*` na API Fastify, mas a producao em `api.isidis.com.br` ainda estava respondendo `404` para essas rotas.

Efeito visivel:

- dashboard vazio
- financeiro vazio
- pedidos/usuarios falhando
- console com `404` para `/admin/dashboard`, `/admin/users`, `/admin/orders`, `/admin/financials`, `/admin/withdrawals`

---

## Causa raiz

Havia descasamento de deploy:

- frontend do admin ja publicado com contrato novo
- backend de producao ainda sem as rotas administrativas novas expostas

---

## Hotfix aplicado

Criado fallback de compatibilidade no frontend admin:

- se a API responder `404` em `/admin/*`, os servicos caem temporariamente para o fluxo legado via Supabase
- quando a API nova estiver publicada, o painel volta automaticamente a usar a API sem precisar remover nada em runtime

Arquivos centrais:

- `admin/src/lib/apiClient.ts`
  - `ApiError`
  - `isApiNotFoundError()`
- `admin/src/lib/supabase.ts`
  - `supabaseLegacyAdmin` opcional com `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `admin/src/services/legacyAdmin.ts`
  - camada centralizada com queries legadas

Servicos com fallback:

- `admin/src/services/users.ts`
- `admin/src/services/orders.ts`
- `admin/src/services/financials.ts`
- `admin/src/services/approvals.ts`
- `admin/src/services/gigs.ts`
- `admin/src/services/tickets.ts`

---

## Comportamento resultante

- se `/admin/*` existir: usa API Fastify nova
- se `/admin/*` retornar `404`: usa fallback legado
- isso destrava imediatamente o painel no proximo deploy do frontend admin, mesmo sem redeploy simultaneo da API

---

## Validacao

- [x] `admin`: `cmd /c npx tsc --noEmit`
- [x] `api`: `cmd /c npm run typecheck`

---

## Observacao importante

Esse fallback e transitorio.

O estado correto continua sendo:

- API de producao com rotas `/admin/*` publicadas
- admin sem depender da `service role` no navegador

Assim que a API for redeployada com as rotas novas, esse fallback pode ser removido com seguranca.
