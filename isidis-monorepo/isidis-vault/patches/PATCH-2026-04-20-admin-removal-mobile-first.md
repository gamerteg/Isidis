# PATCH — Remoção do Admin + Limpeza Next.js + Mobile First

**Data:** 2026-04-20  
**Status:** Concluído ✅

---

## O que mudou

### 1. Admin removido do `/web`
O painel admin foi movido para repositório separado. Todo código admin foi deletado.

**Deletados:**
- `src/app/admin/` (pasta inteira — rotas, pages, layout, actions)
- `src/app/actions/admin-financials.ts`
- `src/app/actions/admin-users.ts`
- `src/components/admin-mobile-nav.tsx`
- `src/components/tickets/admin-status-update.tsx`

---

### 2. Limpeza final de resquícios Next.js — `src/app/` deletado

**Actions movidas para `src/lib/actions/`:**
| De | Para |
|----|------|
| `src/app/actions/chat.ts` | `src/lib/actions/chat.ts` |
| `src/app/actions/finance.ts` | `src/lib/actions/finance.ts` |
| `src/app/actions/notifications.ts` | `src/lib/actions/notifications.ts` |
| `src/app/actions/orders.ts` | `src/lib/actions/orders.ts` |
| `src/app/actions/reviews.ts` | `src/lib/actions/reviews.ts` |
| `src/app/actions/tickets.ts` | `src/lib/actions/tickets.ts` |
| `src/app/actions/analytics.ts` | `src/lib/actions/analytics.ts` |
| `src/app/(website)/checkout/actions.ts` | `src/lib/actions/checkout.ts` |
| `src/app/dashboard/cartomante/actions.ts` | `src/lib/actions/reader.ts` |
| `src/app/dashboard/cartomante/onboarding/actions.ts` | `src/lib/actions/reader-onboarding.ts` |
| `src/app/dashboard/cartomante/pedido/[id]/actions.ts` | `src/lib/actions/reader-order.ts` |
| `src/app/dashboard/perfil/actions.ts` | `src/lib/actions/profile.ts` |
| `src/app/auth/actions.ts` | Deletado (duplicado de `src/lib/auth/actions.ts`) |

**Sub-componentes movidos para `src/components/`:**
| De | Para |
|----|------|
| `cartomantes/cartomantes-client` | `src/components/cartomantes/CartomantesClient.tsx` |
| `dashboard/dashboard-client` | `src/components/dashboard/DashboardClient.tsx` |
| `dashboard/cartomante/pedido/editor-wrapper` | `src/components/orders/EditorWrapper.tsx` |
| `dashboard/mensagens/messages-client` | `src/components/messages/ClientMessagesClient.tsx` |
| `dashboard/cartomante/mensagens/messages-client` | `src/components/messages/ReaderMessagesClient.tsx` |
| `dashboard/leitura/physical-reading-view` | `src/components/readings/PhysicalReadingView.tsx` |
| `dashboard/perfil/profile-form` | `src/components/profile/ClientProfileForm.tsx` |
| `dashboard/cartomante/perfil/profile-form` | `src/components/profile/ReaderProfileForm.tsx` |
| `dashboard/leitura/reading-cards` | `src/components/readings/ReadingCards.tsx` |
| `dashboard/cartomante/onboarding/onboarding-client` | `src/components/onboarding/ReaderOnboardingClient.tsx` |
| `dashboard/cartomante/gigs/novo/gig-form` | `src/components/gigs/GigForm.tsx` |
| `(website)/checkout/checkout-form` | `src/components/checkout/CheckoutForm.tsx` |

**`src/app/` deletado completamente.**

---

### 3. Mobile First aplicado

Todos os itens já estavam implementados ou foram corrigidos:

| Item | Status | Detalhe |
|------|--------|---------|
| Safe-area utilities Tailwind | ✅ Já existia | `pb-safe-b`, `pt-safe-t` em `tailwind.config.ts` |
| Safe-area em Login/Register | ✅ Já existia | `pb-safe overflow-y-auto` nas PageSections |
| Navbar hamburger autenticado | ✅ Já existia | DropdownMenu `md:hidden` para READER e CLIENT |
| Avatar 44px mínimo | ✅ Já existia | `h-11 w-11` (44px) |
| Hover states mobile-safe | ✅ Já existia | `@media (hover: none)` em `globals.css` |
| `max-w-[1600px]` corrigido | ✅ Corrigido | → `max-w-7xl` em DashboardHome e ReaderHome |

---

## Estrutura final de `src/`

```
src/
├── components/       ← UI + sub-componentes (cartomantes/, orders/, readings/, etc.)
├── hooks/
├── layouts/          ← WebsiteLayout, DashboardLayout
├── lib/
│   ├── actions/      ← Todas as funções Supabase (chat, finance, orders, etc.)
│   ├── auth/         ← Login, signup, signout, resetPassword
│   ├── data/         ← Stats, fetchers
│   └── supabase/     ← Client only (sem server.ts)
├── pages/            ← public/, auth/, dashboard/client/, dashboard/reader/, onboarding/
├── routes/           ← index.tsx centralizado com React.lazy
├── services/
├── styles/           ← globals.css
├── test/
└── types/
```

---

## Verificação

- [x] `npm run build` — ✅ 4.13s, zero erros
- [x] Nenhum arquivo em `src/app/` (deletado)
- [x] Nenhuma referência a `@supabase/ssr`
- [x] Nenhum código admin no `/web`
- [x] Mobile First: safe-area, hamburger, hover states, max-w
