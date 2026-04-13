-- Coluna dedicada para disputa (substitui hack com late_alert_sent_at)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN NOT NULL DEFAULT FALSE;

-- Metadata de auditoria (IP, user-agent, fraud flags)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Indice para queries de admin e cron
CREATE INDEX IF NOT EXISTS idx_orders_dispute
  ON orders(has_dispute) WHERE has_dispute = TRUE;

-- Nota: o campo disputed_at ja existe e e usado pelo release-hold.ts
-- has_dispute e um boolean simples para filtragem rapida
-- Sincronizar: quando has_dispute = TRUE, disputed_at deve estar preenchido
