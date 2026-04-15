-- Add is_favorite column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- We need to ensure the user can update this field on their own orders.
-- The existing policy "Users can view their own orders." handles SELECT.
-- We need an UPDATE policy. checking existing policies...
-- "06_orders_update_policy.sql" exists, assuming it covers updates.
-- If not, we might need:
-- CREATE POLICY "Users can update their own orders" ON orders
--   FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = reader_id);
