-- Create storage bucket for reading deliveries (photos & audio)
insert into storage.buckets (id, name, public) values ('readings', 'readings', true);

-- Policy: Authenticated users (readers) can upload files to their orders
create policy "Readers can upload reading files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'readings');

-- Policy: Anyone can view reading files (public bucket)
create policy "Public can view reading files"
  on storage.objects for select
  to public
  using (bucket_id = 'readings');

-- Policy: Readers can update their own files
create policy "Readers can update reading files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'readings');

-- Policy: Readers can delete their own files
create policy "Readers can delete reading files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'readings');
