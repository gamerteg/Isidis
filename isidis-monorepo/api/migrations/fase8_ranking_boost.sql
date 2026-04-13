-- Score de ranking orgânico
ALTER TABLE profiles ADD COLUMN ranking_score FLOAT DEFAULT 0.5;

-- Índice para ORDER BY eficiente no marketplace
CREATE INDEX idx_profiles_ranking ON profiles(ranking_score DESC)
  WHERE verification_status = 'APPROVED';

-- Índices para as queries do cron
CREATE INDEX idx_orders_reader_completion ON orders(reader_id, status, created_at);
CREATE INDEX idx_orders_response_time ON orders(reader_id, reader_viewed_at, created_at)
  WHERE status IN ('DELIVERED', 'COMPLETED');
