ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS card_fee_responsibility TEXT DEFAULT 'READER';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'PIX',
  ADD COLUMN IF NOT EXISTS card_fee_responsibility TEXT;

UPDATE public.gigs
SET card_fee_responsibility = 'READER'
WHERE card_fee_responsibility IS DISTINCT FROM 'READER';

UPDATE public.orders
SET card_fee_responsibility = CASE
  WHEN payment_method = 'CARD' THEN 'READER'
  ELSE NULL
END
WHERE card_fee_responsibility IS DISTINCT FROM CASE
  WHEN payment_method = 'CARD' THEN 'READER'
  ELSE NULL
END;

ALTER TABLE public.gigs
  DROP CONSTRAINT IF EXISTS gigs_card_fee_responsibility_check;

ALTER TABLE public.gigs
  ADD CONSTRAINT gigs_card_fee_responsibility_check
  CHECK (card_fee_responsibility = 'READER');

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_card_fee_responsibility_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_card_fee_responsibility_check
  CHECK (
    card_fee_responsibility IS NULL
    OR card_fee_responsibility = 'READER'
  );
