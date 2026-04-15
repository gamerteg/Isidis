-- Add status column to gigs table
ALTER TABLE public.gigs 
ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING';

-- Backfill existing gigs to APPROVED (since they were already live)
UPDATE public.gigs SET status = 'APPROVED' WHERE status IS NULL OR status = 'PENDING';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_gigs_status ON public.gigs(status);

-- RLS Policies Update
-- 1. Public can ONLY view APPROVED gigs
DROP POLICY IF EXISTS "Gigs are viewable by everyone." ON public.gigs;

CREATE POLICY "Public can view approved gigs" ON public.gigs
FOR SELECT USING (
  status = 'APPROVED' 
  OR 
  (auth.uid() = owner_id) -- Owner can see their own gigs regardless of status
);

-- 2. Admin can view ALL gigs (We need a way to identify admins in RLS if we want strict DB security, 
-- but for now, the App Logic + Middleware will handle the "Admin View" by fetching as a user who *should* be able to see it.
-- However, RLS is strict. If the admin user tries to select * from gigs, this policy ABOVE limits them.
-- So we need an Admin Policy.

CREATE POLICY "Admins can view all gigs" ON public.gigs
FOR SELECT USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'ADMIN'
  )
);

-- 3. Admins can update gigs (to approve/reject)
CREATE POLICY "Admins can update gigs" ON public.gigs
FOR UPDATE USING (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'ADMIN'
  )
);
