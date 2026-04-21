# Vault: Migracao Isidis (Next.js -> Vite/React)

Bem-vindo ao Vault de planejamento estrategico para a consolidacao da arquitetura do projeto Isidis.

## Escopo Principal
O foco principal e corrigir a migracao incompleta do Frontend (`/web`), padronizando o projeto para **React + Vite**, eliminando resquicios do Next.js (App Router), estruturando o codigo e garantindo uma abordagem rigorosa **Mobile-First**.

## Navegacao
- [[01-Erros-Identificados]]: Analise profunda dos problemas da migracao atual.
- [[02-Plano-Definitivo-Frontend]]: Guia passo a passo para reestruturar o `/web`.
- [[03-Guia-Mobile-First]]: Diretrizes de responsividade e Tailwind.
- [[04-Melhorias-API]]: Observacoes e boas praticas para o backend (`/api`).
- [[05-Telas-Publicas]]: Analise detalhada das telas de entrada e marketplace.
- [[06-Telas-Auth-Onboarding]]: Fluxos de login, registro e primeiro acesso.
- [[07-Telas-Dashboards]]: Estrutura e UX dos paineis de controle.
- [[08-Func-Mensagens-Presenca]]: Chat, presenca online e notificacoes.
- [[09-Func-Pagamentos-Financeiro]]: Fluxo de PIX, carteira e saques.
- [[10-Func-Ciclo-Leitura]]: Gestao de pedidos, entregas e servicos (Gigs).
- [[11-Modelo-de-Dados]]: Mapeamento de tabelas e relacionamentos Supabase.
- [[12-Estrategia-de-Tipagem]]: Tipos compartilhados entre API e Frontend.
- [[13-Monitoramento-e-Erros]]: Sentry, Toasts e padroes de tratamento.
- [[14-Estrategia-de-Testes]]: Suite de testes Unitarios, Integracao e E2E.
- [[15-Deployment-e-Ambientes]]: Docker, CI/CD e gestao de .env.

## Patches (Historico de Mudancas)
- [[patches/PATCH-2026-04-20-migracao-nextjs-vite]]: Migracao completa Next.js -> React + Vite (estrutura, deps, auth, rotas).
- [[patches/PATCH-2026-04-20-admin-removal-mobile-first]]: Remocao do admin, limpeza final de src/app/, Mobile First aplicado.
- [[patches/PATCH-2026-04-20-scroll-reset-performance]]: Scroll reset na navegacao + otimizacoes de performance (WebSocket guard, code splitting, animacoes).
- [[patches/PATCH-2026-04-20-footers-filtros-gigs]]: Footers removidos, filtros de categoria corrigidos (divergencia API/UI/banco), gigs com dedup+shuffle.
- [[patches/PATCH-2026-04-21-performance-gigs-flickering]]: Singleton Supabase, useAuth estavel, DashboardHome deps corrigidas, PresenceProvider Set estavel, ErrorBoundary.
- [[patches/PATCH-2026-04-21-checkout-redesign-3-steps]]: Checkout reescrito em 3 passos sequenciais mobile-first (Resumo -> Perguntas -> Pagamento), sidebar removida, textos de marketing eliminados.
- [[patches/PATCH-2026-04-21-admin-orders-financial-hardening]]: Admin migrado para API Fastify com rotas protegidas, service role removida do browser, dashboard/orders/financials com polling, refresh manual e saude operacional.
- [[patches/PATCH-2026-04-21-admin-api-404-compat-fallback]]: Fallback de compatibilidade no admin quando a API de producao ainda retorna 404 em /admin/*, usando temporariamente o fluxo legado via Supabase.
