-- Migration to fix reviews table schema (rename reviewer_id to client_id)
-- and ensure consistent RLS policies.

DO $$ 
BEGIN 
    -- Check if reviewer_id exists and client_id does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reviewer_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'client_id') THEN
        
        ALTER TABLE reviews RENAME COLUMN reviewer_id TO client_id;
        
    END IF;
END $$;

-- Drop potentially conflicting or outdated policies
DROP POLICY IF EXISTS "Clients can insert reviews for their orders." ON reviews;
DROP POLICY IF EXISTS "Clients can update their own reviews." ON reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON reviews;

-- Re-enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Reviews are viewable by everyone." ON reviews
  FOR SELECT USING (true);

-- Secure insert policy (Clients can only review their own completed orders)
CREATE POLICY "Clients can insert reviews for their orders." ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = reviews.order_id
      AND o.client_id = auth.uid()
      AND o.status IN ('DELIVERED', 'COMPLETED')
    )
  );

-- Update usage is generally not needed for reviews, but if enabled:
-- CREATE POLICY "Clients can update their own reviews." ON reviews
--   FOR UPDATE USING (auth.uid() = client_id);
