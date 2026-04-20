# 💰 Funcionalidades: Pagamentos e Financeiro

O Isidis utiliza o Mercado Pago como gateway principal, focado na agilidade do PIX para o mercado brasileiro.

## ⚡ Fluxo de Pagamento PIX

### 🔍 Como Funciona
1.  O cliente escolhe um serviço e clica em "Pagar".
2.  O frontend chama a API `/checkout`.
3.  A API cria uma `preference` no Mercado Pago e uma `order` com status `PENDING` no banco.
4.  O Mercado Pago retorna o `qr_code` e o `copy_paste`.
5.  O Webhook do Mercado Pago (`/api/routes/webhooks/mercadopago.ts`) escuta a confirmação e atualiza o pedido para `PAID`.

### 🚀 Melhorias de Segurança e UX
1.  **Idempotência:** Garantir que o webhook não processe o mesmo pagamento duas vezes (já tratado parcialmente no código, mas precisa de validação de concorrência).
2.  **Expiração Inteligente:** Pedidos PIX não pagos em 30 minutos devem ser marcados automaticamente como `EXPIRED` para liberar a agenda da cartomante (via Cron Job já existente em `/api/crons/expire-orders.ts`).
3.  **Botão "Copia e Cola" Mobile:** Garantir que ao clicar no código PIX no mobile, ele seja copiado automaticamente para o clipboard com um feedback visual claro ("Copiado!").

---

## 🏦 Carteira e Saques (Cartomante)

### 🔍 Regras de Negócio
- O valor da venda entra na carteira da cartomante como "Saldo Pendente".
- O saldo é liberado para saque após um período de garantia (ex: 7 dias) ou conclusão do pedido.
- **Taxas:** O sistema deve calcular automaticamente a comissão da plataforma e as taxas do gateway (Mercado Pago).

### 🚀 Melhorias no Dashboard Financeiro
1.  **Transparência Total:** Mostrar exatamente quanto foi a venda, quanto foi a taxa da plataforma e quanto caiu líquido.
2.  **Status de Saque:** Fluxo claro de `Solicitado` -> `Em Processamento` -> `Pago` -> `Rejeitado`.
3.  **Validação de PIX de Saque:** Impedir solicitações de saque se a chave PIX da cartomante não estiver configurada ou for inválida.