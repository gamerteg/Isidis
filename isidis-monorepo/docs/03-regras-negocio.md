# 03 - Regras de Negócio e Fluxos Financeiros

## 1. Comissões e Taxas
- **Taxa da Plataforma:** 15% sobre o valor bruto de cada venda (Gig ou Assinatura).
- **Repasse Taróloga:** 85% do valor bruto.
- **Exemplo:** Venda de R$ 100,00 -> Plataforma retém R$ 15,00 -> Taróloga recebe R$ 85,00.

## 2. Fluxo de Pagamento e Liberação de Saldo
1. **Pagamento (Checkout):** O cliente paga via PIX (Abacate Pay) ou Cartão (Stripe). O status do pedido muda para `PAID`.
2. **Saldo Bloqueado:** Ao ser pago, o crédito é inserido nas `transactions` com status `PENDING`. O saldo aparece como "Bloqueado" para a taróloga.
3. **Entrega (`DELIVERED`):** A taróloga realiza a leitura rica. O status do pedido muda para `DELIVERED`.
4. **Liberação (`COMPLETED`):**
    - Se o cliente confirmar o recebimento ou passarem 48 horas sem contestação, o pedido muda para `COMPLETED`.
    - O trigger financeiro altera o status da transação de `PENDING` para `COMPLETED`.
    - O saldo passa a ser "Disponível" para saque.

## 3. Sistema de Saques (Withdrawals)
- **Valor Mínimo:** R$ 20,00.
- **Processamento:**
    1. Taróloga solicita saque via interface.
    2. Sistema verifica saldo disponível via RPC `request_withdrawal` (com lock no banco para evitar double spending).
    3. Registro de débito inserido com status `PENDING`.
    4. Admin revisa ou script automático processa via Abacate Pay/Stripe.
    5. Transação atualizada para `COMPLETED` após confirmação do gateway.

## 4. Hierarquia de Usuários e Permissões
- **CLIENT (Querente):**
    - Pode navegar no marketplace.
    - Pode contratar Gigs e Assinaturas.
    - Pode visualizar suas próprias leituras.
    - Pode avaliar tarólogas.
- **READER (Taróloga):**
    - Deve ser aprovada pelo Admin (verificação de perfil).
    - Pode criar e editar suas Gigs.
    - Pode realizar entregas ricas (áudio + cartas).
    - Pode gerenciar seu saldo e solicitar saques.
- **ADMIN:**
    - Gerencia aprovação de perfis e Gigs.
    - Monitora transações e resolve disputas.
    - Acesso total via Backoffice.

## 5. Regras de Cancelamento e Estorno
- **Pedido Pendente:** Pode ser cancelado a qualquer momento.
- **Pedido Pago (Não entregue):** Cliente pode solicitar cancelamento. Estorno integral via gateway.
- **Pedido Entregue (`DELIVERED`):** Disputas devem ser mediadas pelo suporte Admin.
