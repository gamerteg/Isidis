# PATCH — Scroll Reset + Performance

**Data:** 2026-04-20  
**Status:** Concluído ✅

---

## Problemas corrigidos

### 1. Scroll não resetava na navegação entre páginas

**Causa raiz:**
- Páginas de dashboard tinham `<main className="h-screen overflow-y-auto scrollbar-hide">` — criando scroll containers aninhados independentes da janela. O React Router trocava de rota mas o container era reutilizado com o scroll position anterior.
- Não havia nenhum `ScrollToTop` no projeto.

**Fix A — `ScrollToTop` global**
- **Criado:** `src/components/ScrollToTop.tsx`
  - `useLocation` + `useEffect` → `window.scrollTo({ top: 0, behavior: 'instant' })` em cada troca de `pathname`
- **Adicionado em** `src/App.tsx` dentro do `<BrowserRouter>` antes do conteúdo

**Fix B — Remoção de `h-screen overflow-y-auto scrollbar-hide` nos dashboards**

Substituído por `min-h-screen` em 8 arquivos:
- `src/pages/dashboard/client/DashboardHome.tsx`
- `src/pages/dashboard/client/MinhasAssinaturas.tsx`
- `src/pages/dashboard/reader/ReaderHome.tsx`
- `src/pages/dashboard/reader/Analytics.tsx`
- `src/pages/dashboard/reader/Assinaturas.tsx`
- `src/pages/dashboard/reader/Carteira.tsx`
- `src/pages/dashboard/reader/Gigs.tsx`
- `src/pages/dashboard/reader/Pedidos.tsx`

---

### 2. Lentidão geral

**Fix 1 — PresenceProvider não abre WebSocket para anônimos**
- **Arquivo:** `src/components/providers/presence-provider.tsx`
- Guard `if (!user) return` adicionado no início do segundo `useEffect` (presence logic)
- WebSocket do Supabase Realtime agora só conecta após autenticação

**Fix 2 — Code splitting com Vite `manualChunks`**
- **Arquivo:** `web/vite.config.ts`
- `manualChunks` como função para separar vendors no build:
  - `vendor-react` → react + react-dom + react-router-dom (270 kB)
  - `vendor-supabase` → @supabase/* (162 kB)
  - `vendor-ui` → @radix-ui/* (148 kB)
- Resultado: bundle principal muito menor; browsers em cache não re-baixam vendors a cada deploy

**Fix 3 — `scroll-behavior: smooth` removido do CSS global**
- **Arquivo:** `src/styles/globals.css`
- `scroll-behavior: smooth` no `html` adicionava ~300ms de delay percebido em toda navegação programática
- Alterado para `scroll-behavior: auto`

**Fix 4 — Redução de ShootingStars simultâneas na Home**
- **Arquivo:** `src/pages/public/Home.tsx`
- `withShootingStars` removido da seção CTA final (linha ~287)
- Mantido apenas no `MainHero` — evita 150 estrelas + 1 intervalo de animação extra renderizados simultaneamente

**Fix 5 — Suspense fallback com spinner**
- **Arquivo:** `src/routes/index.tsx`
- Substituído texto "Carregando..." por spinner animado (`animate-spin`, `border-primary`)

---

## Verificação

- [x] `npm run build` — ✅ 4.87s, zero erros
- [x] Chunks separados no output: `vendor-react`, `vendor-supabase`, `vendor-ui`
- [x] Scroll reseta ao navegar entre rotas
- [x] WebSocket Supabase não abre para usuários não autenticados
