# 06 - Roadmap de Próximas Funcionalidades

## 1. Sistema de Boost (Destaque Pago)
Permite que as tarólogas paguem para aumentar sua visibilidade no marketplace.

### 1.1 Tiers de Boost
- **Starter (1.3x):** R$ 19,90 / 7 dias.
- **Growth (1.6x):** R$ 39,90 / 15 dias.
- **Premium (2.0x):** R$ 69,90 / 30 dias.

### 1.2 Regras de Implementação
- **Anti-Pay-to-Win:** Leitoras com score orgânico baixo (< 0.3) não podem ser impulsionadas para o topo.
- **Transparência:** Badge "Destaque" visível no card da taróloga.
- **Pagamento:** Via Wallet (saldo disponível) ou Stripe.

## 2. Sistema de Ranking e Qualidade
Aprimoramento do algoritmo que ordena as tarólogas no marketplace.

### 2.1 Critérios do Score Orgânico
- Média de avaliações (Reviews).
- Taxa de resposta e tempo médio de entrega.
- Volume de pedidos completados.
- Retenção de clientes (recompra).

## 3. Retenção e Engajamento
Funcionalidades para manter clientes e tarólogas ativos na plataforma.

### 3.1 Cupons de Desconto
- Cupons de primeira compra.
- Cupons sazonais ou específicos de tarólogas.

### 3.2 Notificações Inteligentes
- Lembretes de leitura pronta.
- Alertas de tarólogas favoritas online.
- Promoções personalizadas via Push (Firebase).

## 4. Melhorias em Pagamentos
- **Assinaturas Recorrentes:** Planos mensais para clientes frequentes (Leituras ilimitadas ou pacote de X leituras).
- **Split de Pagamento:** Automação total do repasse para evitar bitributação e agilizar saques.
- **Novos Gateways:** Expansão para outros meios além de PIX e Stripe se necessário.

## 5. Sistema de Tickets e Suporte
- Centralização de disputas e dúvidas técnicas.
- Interface para o Admin gerenciar e responder tickets.

## 6. Analytics e Dashboard Avançado
- **Para Tarólogas:** Gráficos de faturamento, visualizações de perfil e conversão.
- **Para Admin:** LTV (Lifetime Value), CAC (Custo de Aquisição), e volume total transacionado (GMV).
