-- Add ranking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS rating_average numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0;

-- Function to calculate and update profile ranking
CREATE OR REPLACE FUNCTION update_profile_ranking()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        rating_average = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE reader_id = NEW.reader_id
        ),
        reviews_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reader_id = NEW.reader_id
        )
    WHERE id = NEW.reader_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run on review insert/update/delete
DROP TRIGGER IF EXISTS on_review_change ON reviews;
CREATE TRIGGER on_review_change
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_profile_ranking();
