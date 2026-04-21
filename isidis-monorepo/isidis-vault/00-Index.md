# 📚 Vault: Migração Isidis (Next.js ➡️ Vite/React)

Bem-vindo ao Vault de planejamento estratégico para a consolidação da arquitetura do projeto Isidis.

## 📌 Escopo Principal
O foco principal é corrigir a migração incompleta do Frontend (`/web`), padronizando o projeto para **React + Vite**, eliminando resquícios do Next.js (App Router), estruturando o código e garantindo uma abordagem rigorosa **Mobile-First**.

## 📂 Navegação
- [[01-Erros-Identificados]]: Análise profunda dos problemas da migração atual.
- [[02-Plano-Definitivo-Frontend]]: Guia passo a passo para reestruturar o `/web`.
- [[03-Guia-Mobile-First]]: Diretrizes de responsividade e Tailwind.
- [[04-Melhorias-API]]: Observações e boas práticas para o backend (`/api`).
- [[05-Telas-Publicas]]: Análise detalhada das telas de entrada e marketplace.
- [[06-Telas-Auth-Onboarding]]: Fluxos de login, registro e primeiro acesso.
- [[07-Telas-Dashboards]]: Estrutura e UX dos painéis de controle.
- [[08-Func-Mensagens-Presenca]]: Chat, presença online e notificações.
- [[09-Func-Pagamentos-Financeiro]]: Fluxo de PIX, carteira e saques.
- [[10-Func-Ciclo-Leitura]]: Gestão de pedidos, entregas e serviços (Gigs).
- [[11-Modelo-de-Dados]]: Mapeamento de tabelas e relacionamentos Supabase.
- [[12-Estrategia-de-Tipagem]]: Tipos compartilhados entre API e Frontend.
- [[13-Monitoramento-e-Erros]]: Sentry, Toasts e padrões de tratamento.
- [[14-Estrategia-de-Testes]]: Suíte de testes Unitários, Integração e E2E.
- [[15-Deployment-e-Ambientes]]: Docker, CI/CD e gestão de .env.

## 🩹 Patches (Histórico de Mudanças)
- [[patches/PATCH-2026-04-20-migracao-nextjs-vite]]: Migração completa Next.js → React + Vite (estrutura, deps, auth, rotas).
- [[patches/PATCH-2026-04-20-admin-removal-mobile-first]]: Remoção do admin, limpeza final de src/app/, Mobile First aplicado.
- [[patches/PATCH-2026-04-20-scroll-reset-performance]]: Scroll reset na navegação + otimizações de performance (WebSocket guard, code splitting, animações).
- [[patches/PATCH-2026-04-20-footers-filtros-gigs]]: Footers removidos, filtros de categoria corrigidos (divergência API/UI/banco), gigs com dedup+shuffle.