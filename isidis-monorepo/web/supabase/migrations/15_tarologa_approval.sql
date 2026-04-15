-- Add verification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf_cnpj text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_status text CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING';

-- Backfill existing TAROLOGA users to PENDING (or APPROVED if legacy)
-- For safety, let's mark existing readers as APPROVED to not disrupt them, 
-- or PENDING if we want them to fill the data. 
-- Let's set existing ones to APPROVED to avoid blocking current active users, 
-- but you can change this to PENDING if you want to force them to update.
UPDATE public.profiles 
SET verification_status = 'APPROVED' 
WHERE role = 'TAROLOGA' AND verification_status IS NULL;

-- Default for others (USER) can be null or PENDING, doesn't matter much until they become readers.
-- But for new signups that choose TAROLOGA, it should be PENDING.

-- Index for querying pending approvals
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- Update RLS to ensure only APPROVED tarólogas are visible in "Find a Taróloga" type queries if implemented
-- (Usually we query gigs, but sometimes we list profiles directly)
-- Policy: Public can view profiles. We might want to filter this in the application layer or via RLS.
-- For now, we'll keep the generic "Public can view profiles" policy but rely on App Logic to filter unapproved ones.
