-- 27_auto_complete_orders.sql
-- Automate order completion 48 hours after delivery

-- 1. Add delivered_at to orders to track exact delivery time
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- 2. Update existing DELIVERED orders to have a delivered_at (fallback to created_at for safety)
UPDATE orders 
SET delivered_at = created_at 
WHERE status = 'DELIVERED' AND delivered_at IS NULL;

-- 3. Trigger to set delivered_at when status changes to DELIVERED
CREATE OR REPLACE FUNCTION set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DELIVERED' AND (OLD.status IS NULL OR OLD.status <> 'DELIVERED') THEN
    NEW.delivered_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_delivered ON orders;
CREATE TRIGGER on_order_delivered
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE set_delivered_at();

-- 4. Function to automatically complete orders delivered > 48 hours ago
-- This can be called by a cron job or manually via RPC
CREATE OR REPLACE FUNCTION release_delivered_funds()
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET status = 'COMPLETED'
  WHERE status = 'DELIVERED'
    AND delivered_at < (now() - interval '48 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RUN ONCE: Complete any orders that are already past the 48h mark
SELECT release_delivered_funds();
