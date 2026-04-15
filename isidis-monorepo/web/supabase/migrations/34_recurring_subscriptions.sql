-- =============================================================
-- Migration: Recurring Gig Subscriptions
-- Adds support for subscription-based gigs where clients pay
-- monthly for periodic tarot readings.
-- =============================================================

-- 1. Add pricing columns to gigs
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'ONE_TIME' CHECK (pricing_type IN ('ONE_TIME', 'RECURRING')),
ADD COLUMN IF NOT EXISTS readings_per_month integer DEFAULT NULL;

COMMENT ON COLUMN gigs.pricing_type IS 'ONE_TIME = avulso (default), RECURRING = assinatura mensal';
COMMENT ON COLUMN gigs.readings_per_month IS 'Number of readings per month for RECURRING gigs (e.g. 4=weekly, 2=biweekly, 1=monthly)';

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reader_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
  monthly_price integer NOT NULL, -- in cents
  readings_per_month integer NOT NULL DEFAULT 4,
  readings_done_this_period integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  next_reading_due timestamptz NOT NULL DEFAULT now(),
  last_payment_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Add subscription_id to orders (links individual readings to a subscription)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.subscription_id IS 'If set, this order is a reading delivered as part of a subscription';

-- 4. RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Readers can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = reader_id);

-- Allow admins to see all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Allow system to insert subscriptions (via server actions with service role)
CREATE POLICY "Authenticated users can create subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reader ON subscriptions(reader_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_reading ON subscriptions(next_reading_due) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_gigs_pricing_type ON gigs(pricing_type);
CREATE INDEX IF NOT EXISTS idx_orders_subscription ON orders(subscription_id) WHERE subscription_id IS NOT NULL;

-- 6. Function to advance reading and schedule next
CREATE OR REPLACE FUNCTION advance_subscription_reading(sub_id uuid)
RETURNS void AS $$
DECLARE
  sub subscriptions%ROWTYPE;
  interval_days integer;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE id = sub_id FOR UPDATE;
  
  IF sub IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
  
  IF sub.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Subscription is not active';
  END IF;
  
  -- Calculate interval between readings
  interval_days := 30 / sub.readings_per_month;
  
  -- Increment counter and advance next_reading_due
  UPDATE subscriptions 
  SET 
    readings_done_this_period = readings_done_this_period + 1,
    next_reading_due = next_reading_due + (interval_days || ' days')::interval,
    updated_at = now()
  WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to renew subscription period (called after monthly payment)
CREATE OR REPLACE FUNCTION renew_subscription_period(sub_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions 
  SET 
    readings_done_this_period = 0,
    period_start = now(),
    period_end = now() + interval '30 days',
    next_reading_due = now(),
    last_payment_at = now(),
    status = 'ACTIVE',
    updated_at = now()
  WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
