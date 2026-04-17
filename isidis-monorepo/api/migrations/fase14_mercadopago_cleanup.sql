-- Fase 14: consolidacao do checkout Mercado Pago
-- Renomeia o identificador legado de pagamento para refletir o gateway atual.

ALTER TABLE public.orders
  RENAME COLUMN asaas_payment_id TO mercadopago_payment_id;

ALTER INDEX IF EXISTS idx_orders_asaas_payment_id
  RENAME TO idx_orders_mercadopago_payment_id;
