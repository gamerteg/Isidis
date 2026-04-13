-- Corrige a RPC process_withdrawal:
-- 1. evita o erro "FOR UPDATE is not allowed with aggregate functions"
-- 2. serializa saques por carteira usando lock na linha de wallets
-- 3. reserva saldo considerando WITHDRAWAL pendente como debito ja comprometido

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE transactions ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

UPDATE transactions
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

CREATE OR REPLACE FUNCTION process_withdrawal(
  p_wallet_id uuid,
  p_amount integer,
  p_pix_key_type text,
  p_pix_key text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_available integer := 0;
  v_ext_id text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('error', 'Valor invalido');
  END IF;

  SELECT id
  INTO v_wallet_id
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Carteira nao encontrada');
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_available
  FROM transactions
  WHERE wallet_id = p_wallet_id
    AND (
      status = 'COMPLETED'
      OR (type = 'WITHDRAWAL' AND status = 'PENDING')
    );

  IF p_amount > v_available THEN
    RETURN jsonb_build_object(
      'error', 'Saldo insuficiente',
      'available', v_available
    );
  END IF;

  v_ext_id := 'withdrawal_' || floor(extract(epoch from clock_timestamp()) * 1000)::text;

  INSERT INTO transactions (wallet_id, type, amount, status, external_id, metadata)
  VALUES (
    p_wallet_id,
    'WITHDRAWAL',
    -p_amount,
    'PENDING',
    v_ext_id,
    jsonb_build_object(
      'pix_key_type', p_pix_key_type,
      'pix_key', p_pix_key,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'external_id', v_ext_id,
    'available', v_available - p_amount
  );
END;
$$;
