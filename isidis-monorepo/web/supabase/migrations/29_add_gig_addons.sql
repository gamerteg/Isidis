-- Add add_ons column to gigs
ALTER TABLE gigs
ADD COLUMN add_ons jsonb DEFAULT '[]'::jsonb;

-- Add selected_addons column to orders
ALTER TABLE orders
ADD COLUMN selected_addons jsonb DEFAULT '[]'::jsonb;
