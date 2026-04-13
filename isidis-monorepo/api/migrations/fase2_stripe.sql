-- Fase 2: Stripe + novos campos de negócio
-- Executar no Supabase Dashboard → SQL Editor

-- Stripe nos pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Rastrear quando o reader abriu o pedido (feedback de progresso para o cliente)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reader_viewed_at TIMESTAMPTZ;

-- Rastrear alerta de atraso (evitar spam de notificações)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS late_alert_sent_at TIMESTAMPTZ;

-- Stripe Connect para saques futuros
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Preferências de notificação por usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "order_paid": {"push": true, "email": true},
  "reading_delivered": {"push": true, "email": true},
  "new_message": {"push": true, "email": false},
  "review_request": {"push": true, "email": false},
  "wallet_released": {"push": true, "email": false}
}'::jsonb;

-- Índices para performance nas queries dos crons
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON orders(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_status_type ON transactions(status, type, created_at);
