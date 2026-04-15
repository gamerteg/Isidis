-- Add gig_id column to messages table
ALTER TABLE public.messages
ADD COLUMN gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_messages_gig_id ON public.messages(gig_id);
