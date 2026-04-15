-- Create storage bucket for gig images
insert into storage.buckets (id, name, public) values ('gigs', 'gigs', true);

-- Policy: Authenticated users (tarologas) can upload files to gigs bucket
create policy "Tarologas can upload gig files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gigs');

-- Policy: Anyone can view gig files (public bucket)
create policy "Public can view gig files"
  on storage.objects for select
  to public
  using (bucket_id = 'gigs');

-- Policy: Owners can update their own files
create policy "Tarologas can update gig files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gigs');

-- Policy: Owners can delete their own files
create policy "Tarologas can delete gig files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gigs');
