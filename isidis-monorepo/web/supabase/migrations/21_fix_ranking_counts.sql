-- SQL to backfill rating_average and reviews_count
-- Run this in Supabase SQL Editor

UPDATE profiles p
SET
    rating_average = COALESCE((SELECT AVG(rating) FROM reviews WHERE reader_id = p.id), 0),
    reviews_count = COALESCE((SELECT COUNT(*) FROM reviews WHERE reader_id = p.id), 0);

-- Verify the update
SELECT id, full_name, rating_average, reviews_count FROM profiles WHERE role = 'READER';
