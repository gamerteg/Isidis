-- Create a private bucket for verification documents
-- Use ON CONFLICT to avoid errors if bucket already exists
insert into storage.buckets (id, name, public)
values ('verification_documents', 'verification_documents', false)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload their own verification documents
-- We drop existing policies first to ensure idempotent updates if re-running
drop policy if exists "Users can upload their own verification documents" on storage.objects;
create policy "Users can upload their own verification documents"
on storage.objects for insert
with check ( (bucket_id = 'verification_documents') and (auth.uid() = owner) );

-- Policy to allow users to view their own documents (if needed for UI preview, though signed URLs are better for private buckets)
drop policy if exists "Users can view their own verification documents" on storage.objects;
create policy "Users can view their own verification documents"
on storage.objects for select
using ( (bucket_id = 'verification_documents') and (auth.uid() = owner) );

-- Policy for admins to view all (implicitly covered if they have service role, but good to have)
drop policy if exists "Admins can view all verification documents" on storage.objects;
create policy "Admins can view all verification documents"
on storage.objects for select
using ( (bucket_id = 'verification_documents') and ( exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN') ) );
