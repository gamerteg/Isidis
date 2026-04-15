-- Create analytics_events table for tracking impressions and clicks
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'view', 'click_buy')),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_gig_id ON public.analytics_events(gig_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_reader_id ON public.analytics_events(reader_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow insert from anyone (to track guest events too)
CREATE POLICY "Allow anonymous insert for analytics_events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

-- Allow readers to view their own analytics
CREATE POLICY "Allow readers to view their own events" ON public.analytics_events
    FOR SELECT USING (auth.uid() = reader_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'ADMIN'));
