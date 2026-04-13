# 07 - Estado Atual e Lacunas (Gaps) do Projeto

## 1. O que já está em Produção (Março 2026)
- **Marketplace Two-Sided:** Tarólogas (Readers) e Clientes (Consulentes).
- **Fluxo de Pagamento PIX:** Integração via Stripe (e Abacate Pay) com webhook e retenção de 48h.
- **Wallet e Saques:** Gestão de saldo para tarólogas e pedidos de saque via PIX.
- **Realtime Chat:** Mensageria instantânea via Supabase Realtime.
- **Sistema de Avaliações:** Ratings de 1 a 5 estrelas.
- **Tarefas Agendadas (Crons):** Conclusão automática de pedidos, expiração, liberação de fundos e alertas de atraso.
- **Notificações:** Push notifications via Firebase FCM.
- **Multiplataforma:** Web (Next.js) e App Mobile (Flutter).

## 2. Lacunas Identificadas (A Implementar)

### 2.1 Marketplace e Ranking
- **Algoritmo de Ordenação:** O `GET /readers` ainda não possui uma ordenação inteligente baseada em performance e qualidade (atualmente é aleatória ou por ID).
- **Filtros Avançados:** Busca por especialidade, preço e disponibilidade em tempo real.

### 2.2 Funcionalidades de Produto
- **Sistema de Boost:** Implementação completa da compra de destaque (Tiers, Multiplicadores e Badge).
- **Assinaturas (Subscriptions):** A estrutura de pastas existe na API, mas a lógica de planos recorrentes ainda não foi implementada.
- **Programa de Fidelidade:** Cupons de desconto e retenção baseada em gamificação.

### 2.3 Operações e Segurança
- **Gestão de Disputas:** O campo `late_alert_sent_at` está sendo usado como um hack temporário para sinalizar disputas; precisa de um campo `has_dispute` dedicado.
- **Detecção de Fraude:** Implementação de playbooks de segurança e análise de velocidade de transações.
- **Handlers de Chargeback:** Tratamento automático de estornos contestados no Stripe/Abacate Pay.

### 2.4 Analytics
- **Dashboard para Tarólogas:** Faltam métricas de conversão, visualizações de perfil e ROI de boosts.
- **Painel Administrativo:** Visão consolidada de LTV, CAC e saúde financeira global.

## 3. Próximas Migrações de Banco (Fases 8, 9 e 10)
- `fase8_ranking_boost.sql`: Campos de score, conquistas e tabela de boosts.
- `fase9_retention.sql`: Campos de disputa, método de pagamento e metadados de compra.
- `fase10_subscriptions.sql`: Tabela completa de assinaturas e contadores em perfis.
