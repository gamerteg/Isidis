-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing of avatars
CREATE POLICY "Public Avatars Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Policy to allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy to allow users to update their own avatars (optional but good)
-- We assume the filename includes their user ID or is otherwise manageable,
-- but for simplicity, we allow update if they are authenticated for now.
-- A better policy would be checking if the file path starts with their user ID folder,
-- but the implementation uses random filenames.
-- Let's just stick to Insert/Select for the basic requirement.
