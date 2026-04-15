-- Add requirements column to gigs
ALTER TABLE gigs
ADD COLUMN requirements jsonb DEFAULT '[]'::jsonb;

-- Add requirements_answers column to orders
ALTER TABLE orders
ADD COLUMN requirements_answers jsonb DEFAULT '{}'::jsonb;
