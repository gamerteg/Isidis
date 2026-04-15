-- Add new columns to profiles for the enhanced editor
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS years_of_experience integer,
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS decks_used text[]; -- Array of strings for decks


