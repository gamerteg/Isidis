-- Fase 10: preferencia de pagamentos por gig + base para analytics da leitora

ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['PIX', 'CARD'],
  ADD COLUMN IF NOT EXISTS card_fee_responsibility TEXT DEFAULT 'READER';

UPDATE public.gigs
SET payment_methods = ARRAY['PIX', 'CARD']
WHERE payment_methods IS NULL OR array_length(payment_methods, 1) IS NULL;

UPDATE public.gigs
SET card_fee_responsibility = 'READER'
WHERE card_fee_responsibility IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gigs_card_fee_responsibility_check'
  ) THEN
    ALTER TABLE public.gigs
      ADD CONSTRAINT gigs_card_fee_responsibility_check
      CHECK (card_fee_responsibility IN ('READER', 'CLIENT'));
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'PIX',
  ADD COLUMN IF NOT EXISTS amount_card_fee INTEGER,
  ADD COLUMN IF NOT EXISTS amount_service_total INTEGER,
  ADD COLUMN IF NOT EXISTS card_fee_responsibility TEXT;

UPDATE public.orders
SET amount_service_total = amount_total
WHERE amount_service_total IS NULL;

UPDATE public.orders
SET card_fee_responsibility = CASE
  WHEN payment_method = 'CARD' THEN 'READER'
  ELSE NULL
END
WHERE card_fee_responsibility IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN amount_service_total SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_card_fee_responsibility_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_card_fee_responsibility_check
      CHECK (
        card_fee_responsibility IS NULL
        OR card_fee_responsibility IN ('READER', 'CLIENT')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gigs_payment_methods ON public.gigs USING gin(payment_methods);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_amount_service_total ON public.orders(amount_service_total);
