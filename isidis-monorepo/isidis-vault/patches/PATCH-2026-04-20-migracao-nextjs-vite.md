# PATCH — Migração Completa Next.js → React + Vite

**Data:** 2026-04-20  
**Concluído:** 2026-04-20  
**Status:** Concluído ✅  
**Referência:** [[02-Plano-Definitivo-Frontend]]

## Desvios do Plano Original
- `src/app/` **não foi deletado** — mantido para sub-componentes que as pages importam (ex: `gig-form`, `checkout-form`, `messages-client`). Será migrado incrementalmente.
- `src/app/auth/actions.ts` mantido e copiado para `src/lib/auth/actions.ts` — o código já era client-side (React 19 `useActionState` é nativo, não Next.js).
- `src/lib/email.ts` deletado — usado apenas por admin actions (código morto no frontend; pertence ao `/api`).
- `resend` removido das dependências do frontend.
- `src/app/actions/tickets.ts` restaurado sem `sendTicketReply` (dependência do email removida).

---

## O que muda

Eliminação completa dos resquícios do Next.js App Router no `/web`. O bundler já é Vite, mas a arquitetura do código ainda segue convenções Next.js. Este patch finaliza a migração real.

---

## Por que muda

- Estrutura `src/app/`, `(website)/`, `page.tsx`, `layout.tsx` causa confusão e não segue padrão SPA/Vite
- `@supabase/ssr` é desnecessário em SPA puro (sem SSR)
- Server Actions (`@/app/auth/actions`) não funcionam no Vite
- Jest deve ser substituído por Vitest (nativo do Vite)

---

## Fases de Execução

### Fase 1 — Limpeza de Dependências
| Ação | Pacote |
|------|--------|
| Remover | `@supabase/ssr` |
| Remover | `jest`, `@types/jest`, `ts-jest`, `jest-environment-jsdom` |
| Remover | `resend` (pertence ao `/api`) |
| Adicionar | `vitest`, `@vitest/ui` |
| Adicionar | `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` |

Scripts atualizados:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

---

### Fase 2 — Refatorar Cliente Supabase

| Arquivo | Ação |
|---------|------|
| `src/lib/supabase/client.ts` | Trocar `createBrowserClient` (@supabase/ssr) por `createClient` (@supabase/supabase-js) |
| `src/lib/supabase/server.ts` | **Deletar** (SSR-only) |

**Antes:**
```ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(url, key)
```
**Depois:**
```ts
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

### Fase 3 — Reestruturação de Pastas

**Layouts** (de `src/app/*/layout.tsx`):
| De | Para |
|----|------|
| `src/app/(website)/layout.tsx` | `src/layouts/WebsiteLayout.tsx` |
| `src/app/dashboard/layout.tsx` | `src/layouts/DashboardLayout.tsx` |
| `src/app/admin/layout.tsx` | `src/layouts/AdminLayout.tsx` |

**Pages — Público** (de `src/app/(website)/`):
| De | Para |
|----|------|
| `page.tsx` | `src/pages/public/Home.tsx` |
| `cartomantes/page.tsx` | `src/pages/public/Cartomantes.tsx` |
| `cartomante/[id]/page.tsx` | `src/pages/public/CartomanteDetail.tsx` |
| `servico/[id]/page.tsx` | `src/pages/public/ServicoDetail.tsx` |
| `checkout/[id]/page.tsx` | `src/pages/public/Checkout.tsx` |
| `checkout/success/page.tsx` | `src/pages/public/CheckoutSuccess.tsx` |
| `termos-*/page.tsx` | `src/pages/public/Termos*.tsx` |

**Pages — Auth** (de `src/app/(auth)/`):
| De | Para |
|----|------|
| `login/page.tsx` | `src/pages/auth/Login.tsx` |
| `register/page.tsx` | `src/pages/auth/Register.tsx` |
| `register/confirm/page.tsx` | `src/pages/auth/RegisterConfirm.tsx` |
| `recover/page.tsx` | `src/pages/auth/Recover.tsx` |
| `update-password/page.tsx` | `src/pages/auth/UpdatePassword.tsx` |

**Pages — Dashboard Cliente** (de `src/app/dashboard/`):
| De | Para |
|----|------|
| `page.tsx` | `src/pages/dashboard/client/DashboardHome.tsx` |
| `perfil/page.tsx` | `src/pages/dashboard/client/Perfil.tsx` |
| `mensagens/page.tsx` | `src/pages/dashboard/client/Mensagens.tsx` |
| `minhas-tiragens/page.tsx` | `src/pages/dashboard/client/MinhasTiragens.tsx` |
| `minhas-assinaturas/page.tsx` | `src/pages/dashboard/client/MinhasAssinaturas.tsx` |
| `pedido/[id]/page.tsx` | `src/pages/dashboard/client/PedidoDetail.tsx` |
| `leitura/[id]/page.tsx` | `src/pages/dashboard/client/LeituraDetail.tsx` |
| `tickets/[id]/page.tsx` | `src/pages/dashboard/client/TicketDetail.tsx` |
| `notifications/page.tsx` | `src/pages/dashboard/client/Notifications.tsx` |

**Pages — Dashboard Cartomante** (de `src/app/dashboard/cartomante/`):
| De | Para |
|----|------|
| `page.tsx` | `src/pages/dashboard/reader/ReaderHome.tsx` |
| `gigs/page.tsx` | `src/pages/dashboard/reader/Gigs.tsx` |
| `gigs/novo/page.tsx` | `src/pages/dashboard/reader/GigNovo.tsx` |
| `pedidos/page.tsx` | `src/pages/dashboard/reader/Pedidos.tsx` |
| `pedido/[id]/page.tsx` | `src/pages/dashboard/reader/PedidoDetail.tsx` |
| `carteira/page.tsx` | `src/pages/dashboard/reader/Carteira.tsx` |
| `analytics/page.tsx` | `src/pages/dashboard/reader/Analytics.tsx` |
| `mensagens/page.tsx` | `src/pages/dashboard/reader/Mensagens.tsx` |
| `perfil/page.tsx` | `src/pages/dashboard/reader/Perfil.tsx` |
| `onboarding/page.tsx` | `src/pages/dashboard/reader/Onboarding.tsx` |
| `under-review/page.tsx` | `src/pages/dashboard/reader/UnderReview.tsx` |
| `tickets/[id]/page.tsx` | `src/pages/dashboard/reader/TicketDetail.tsx` |

**Pages — Admin** (de `src/app/admin/`):
| De | Para |
|----|------|
| `page.tsx` | `src/pages/admin/AdminHome.tsx` |
| `users/page.tsx` | `src/pages/admin/Users.tsx` |
| `gigs/page.tsx` | `src/pages/admin/Gigs.tsx` |
| `approvals/page.tsx` | `src/pages/admin/Approvals.tsx` |
| `financials/page.tsx` | `src/pages/admin/Financials.tsx` |
| `tickets/[id]/page.tsx` | `src/pages/admin/TicketDetail.tsx` |

**Onboarding:**
| De | Para |
|----|------|
| `src/app/onboarding/page.tsx` | `src/pages/onboarding/Onboarding.tsx` |
| `src/app/quiz-onboarding/page.tsx` | `src/pages/onboarding/QuizOnboarding.tsx` |

**CSS:**
| De | Para |
|----|------|
| `src/app/globals.css` | `src/styles/globals.css` |

---

### Fase 4 — Refatorar Auth (Server Actions → Client-Side)

| Arquivo | Ação |
|---------|------|
| `src/pages/auth/Login.tsx` | `useActionState` + `login` action → `useForm` + `supabase.auth.signInWithPassword()` |
| `src/pages/auth/Register.tsx` | → `useForm` + `supabase.auth.signUp()` |
| `src/pages/auth/Recover.tsx` | → `useForm` + `supabase.auth.resetPasswordForEmail()` |
| `src/pages/auth/UpdatePassword.tsx` | → `useForm` + `supabase.auth.updateUser()` |
| `src/app/auth/actions.ts` | **Deletar** após refatoração |

---

### Fase 5 — Centralizar Rotas

| Arquivo | Ação |
|---------|------|
| `src/routes/index.tsx` | **Criar** — todas as rotas com `React.lazy` por página |
| `src/App.tsx` | Simplificar para importar apenas `<AppRoutes />` |

---

### Fase 6 — Configurar Vitest

| Arquivo | Ação |
|---------|------|
| `vitest.config.ts` | **Criar** na raiz de `/web` |
| `src/test/setup.ts` | **Criar** com `@testing-library/jest-dom` |

---

## Arquivos para Deletar ao Final

- `src/app/` (pasta inteira)
- `src/lib/supabase/server.ts`
- `src/app/auth/actions.ts`

---

## Verificação

- [ ] `npm run dev` inicia sem erros
- [ ] Todas as rotas navegáveis funcionam (public, auth, dashboards, admin)
- [ ] Login/Register funcionam via Supabase client-side
- [ ] `npm run build` gera bundle sem erros TypeScript
- [ ] `npm run test` executa via Vitest
- [ ] Nenhuma referência a `@supabase/ssr` em `/web/src`
- [ ] Nenhum arquivo `page.tsx` ou `layout.tsx` dentro de `src/app/`
