-- Fase 7: Chat + Notificações
-- Executar no Supabase Dashboard → SQL Editor

-- ── 1. Tabela conversations (nova) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) NOT NULL,
  reader_id UUID REFERENCES auth.users(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, reader_id, order_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Client can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Participants can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_reader ON public.conversations(reader_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ── 2. Atualizar tabela messages (não destrutivo) ───────────────────────────
-- Adiciona colunas novas mantendo as existentes (receiver_id, is_read continuam)

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Retrocompatibilidade: preencher read_at para mensagens já lidas
UPDATE public.messages
  SET read_at = created_at
  WHERE is_read = true AND read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);

-- Atualizar política RLS para incluir conversation_id
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.client_id = auth.uid() OR c.reader_id = auth.uid())
    )
  );

-- ── 3. Tabela device_tokens (nova) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own device tokens"
  ON public.device_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
