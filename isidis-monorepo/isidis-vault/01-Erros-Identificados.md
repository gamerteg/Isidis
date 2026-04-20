# ⚠️ Erros Identificados na Migração

A análise do diretório `/web` revelou que a migração de Next.js para Vite/React foi apenas superficial (troca de bundler e roteador), mas a arquitetura e convenções do Next.js permaneceram no código.

## ❌ Problemas Arquiteturais (Frontend)

1. **Estrutura de Pastas App Router (Next.js):**
   - O diretório `src/app` e seus subdiretórios `(website)`, `(auth)`, `[id]` ainda existem. 
   - Arquivos nomeados como `page.tsx` e `layout.tsx` (padrão Next.js) estão sendo importados como componentes React comuns em `App.tsx`.
   - **Impacto:** Causa confusão extrema para novos desenvolvedores e não segue o padrão de aplicações Single Page Application (SPA) em Vite (ex: `src/pages`, `src/features`, `src/routes`).

2. **Roteamento Híbrido Confuso:**
   - O `react-router-dom` está instalado e configurado em `src/App.tsx`, mas ele importa componentes aninhados dentro da estrutura velha do Next.js.
   - O `layout.tsx` original do Next.js foi adaptado para envolver o `<Outlet />`, mas a nomenclatura e separação de pastas não fazem sentido no ecossistema Vite.

3. **Pacotes Residuais e Desnecessários:**
   - Presença do pacote `@supabase/ssr` no `package.json`. Como o projeto agora é um SPA puro no Vite, o `@supabase/supabase-js` normal (Client) já seria suficiente. O uso de SSR no Vite exigiria um framework adicional (Remix, Vike).

4. **Componentização e Async Props:**
   - No Next.js (App Router), os Server Components permitem chamadas assíncronas no topo (`async function Page()`). O Vite não suporta isso nativamente da mesma forma. O código atual usa `useEffect` e `useState` em `src/app/(website)/page.tsx` (que foi refatorado), mas ainda há muita lógica acoplada nos "pages" do Next.js.

## ⚠️ Problemas Secundários (Backend/Geral)
- A API (Fastify) em `/api` parece funcional, mas requer validação rigorosa de variáveis de ambiente (`dotenv`) e tipagem compartilhada (schemas) para garantir que as rotas refatoradas do frontend não quebrem a comunicação.