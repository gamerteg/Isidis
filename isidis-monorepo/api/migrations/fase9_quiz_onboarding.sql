-- ── Fase 9: Quiz de onboarding + colunas de matching em gigs ──────────────────

-- 1. Modalidade da gig (tipo de leitura que a leitora oferece)
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS modality TEXT
    CHECK (modality IN ('TAROT','ORACULO','BARALHO_CIGANO','ASTROLOGIA','OUTRO'));

-- 2. Intenções atendidas pela gig (array de temas)
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS intentions TEXT[] DEFAULT '{}';

-- 3. Índices parciais para matching eficiente (só gigs ativas e aprovadas)
CREATE INDEX IF NOT EXISTS idx_gigs_modality
  ON public.gigs(modality)
  WHERE is_active = true AND status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_gigs_intentions
  ON public.gigs USING gin(intentions)
  WHERE is_active = true AND status = 'APPROVED';

-- 4. Tabela de respostas do quiz por cliente (uma por usuário)
CREATE TABLE IF NOT EXISTS public.client_onboarding (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  intention       TEXT        NOT NULL
    CHECK (intention IN ('AMOR','CARREIRA','FINANCAS','SAUDE','ESPIRITUALIDADE','FAMILIA','DECISAO')),
  modality        TEXT        NOT NULL
    CHECK (modality IN ('TAROT','ORACULO','BARALHO_CIGANO','ASTROLOGIA','OUTRO')),
  urgency         TEXT        NOT NULL
    CHECK (urgency IN ('AGORA','PROXIMOS_DIAS','COM_CALMA')),
  matched_gig_ids UUID[]      DEFAULT '{}',
  completed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. RLS: cliente só lê o próprio registro (service role bypassa para o cron)
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client can read own quiz" ON public.client_onboarding;
CREATE POLICY "client can read own quiz"
  ON public.client_onboarding FOR SELECT
  USING (auth.uid() = user_id);
