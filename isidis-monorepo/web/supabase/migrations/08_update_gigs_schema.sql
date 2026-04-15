-- Add new columns for the 4-step gig creation wizard
ALTER TABLE gigs
ADD COLUMN category text,
ADD COLUMN delivery_time_hours integer DEFAULT 48,
ADD COLUMN delivery_method text CHECK (delivery_method IN ('DIGITAL_SPREAD', 'PHYSICAL_PHOTO', 'VIDEO', 'OTHER')),
ADD COLUMN tags text[];

-- Create an index on category for faster filtering
CREATE INDEX idx_gigs_category ON gigs(category);
