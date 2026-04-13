-- Migration: Suporte a pagamento com cartão de crédito
-- Executar no Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'PIX',
  ADD COLUMN IF NOT EXISTS amount_card_fee INTEGER;

-- Índice para filtrar por método de pagamento (análise futura)
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
