# PATCH — Performance + Gigs Flickering + ErrorBoundary

**Data:** 2026-04-21  
**Status:** Concluído ✅

---

## Causas raízes identificadas

| # | Causa | Efeito visível |
|---|-------|---------------|
| 1 | `createClient()` sem singleton — 44+ instâncias criadas | Múltiplos WebSockets, memory leaks, eventos duplicados |
| 2 | `useAuth` criava novo objeto `user` a cada token refresh | `DashboardHome` re-executava effect completo (incluindo busca de gigs) mesmo sem mudança real de usuário |
| 3 | `useEffect` com deps `[user, authLoading, navigate, refreshKey]` — gigs re-buscadas a cada `orders:changed` | Gigs piscando/sumindo toda vez que qualquer pedido mudava no banco |
| 4 | `setOnlineUsers(new Set(onlineIds))` criava novo Set a cada sync de presença | Todos consumidores de `usePresence()` re-renderizavam; `OnlineReaders` fazia chamada API em cada sync |
| 5 | Sem `ErrorBoundary` em rotas lazy-loaded | Falhas silenciosas em produção (rede instável, deploy) |

---

## Fix 1 — Singleton Supabase Client

**`web/src/lib/supabase/client.ts`**

```ts
let _instance: SupabaseClient | null = null
export function createClient(): SupabaseClient {
    if (!_instance) {
        _instance = _createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    }
    return _instance
}
```

Uma única instância/conexão WebSocket para toda a aplicação.

---

## Fix 2 — useAuth: referência estável do user

**`web/src/hooks/useAuth.ts`**

```ts
setUser(prev => {
    const next = session?.user ?? null
    if (prev?.id === next?.id) return prev  // sem re-render se mesmo usuário
    return next
})
```

Aplicado tanto em `getSession` quanto em `onAuthStateChange`.

---

## Fix 3 — DashboardHome: 2 effects com responsabilidades separadas

**`web/src/pages/dashboard/client/DashboardHome.tsx`**

- **Effect 1** (deps: `[user?.id, authLoading]`) — busca dados estáticos (categorias, gigs recomendados, quiz, role check). `user?.id` é string primitiva — estável, não muda com token refreshes
- **Effect 2** (deps: `[user, authLoading, navigate]`) — apenas redirect se não autenticado
- Adicionado `cancelled` flag para evitar setState em componente desmontado (race condition)
- `refreshKey` removido das deps do effect de dados — categorias e gigs não mudam com orders

---

## Fix 4 — PresenceProvider: Set estável

**`web/src/components/providers/presence-provider.tsx`**

```ts
setOnlineUsers(prev => {
    const prevSorted = Array.from(prev).sort().join(',')
    const nextSorted = Array.from(onlineIds).sort().join(',')
    if (prevSorted === nextSorted) return prev  // mesma referência = sem re-render
    return new Set(onlineIds)
})
```

`OnlineReaders` só re-busca leitores quando os IDs realmente mudam.

---

## Fix 5 — ErrorBoundary para rotas lazy

**Criado:** `web/src/components/RouteErrorBoundary.tsx` — class component com `getDerivedStateFromError`

**`web/src/routes/index.tsx`** — `<Suspense>` envolto em `<RouteErrorBoundary>`. Falhas de carregamento mostram mensagem com botão "Recarregar".

---

## Verificação

- [x] `npm run build` — ✅ 4.35s, zero erros
- [x] Singleton: uma única instância Supabase em toda a app
- [x] user?.id estável — DashboardHome não re-busca gigs em token refreshes
- [x] refreshKey removido das deps de gigs — gigs não piscam em mudanças de orders
- [x] PresenceProvider não re-renderiza quando mesmos usuários estão online
- [x] ErrorBoundary protege todas as 40+ rotas lazy-loaded
