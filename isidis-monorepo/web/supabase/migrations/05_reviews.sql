-- Create reviews table
create table reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null unique,
  gig_id uuid references gigs(id) on delete cascade not null,
  reviewer_id uuid references profiles(id) on delete cascade not null,
  reader_id uuid references profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table reviews enable row level security;

-- Everyone can read reviews
create policy "Reviews are viewable by everyone." on reviews
  for select using (true);

-- Clients can insert reviews for their own completed orders
create policy "Clients can insert reviews for their orders." on reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from orders o
      where o.id = reviews.order_id
      and o.client_id = auth.uid()
      and o.status in ('DELIVERED', 'COMPLETED')
    )
  );

-- Clients can update their own reviews
create policy "Clients can update their own reviews." on reviews
  for update using (auth.uid() = reviewer_id);

-- Index for fast lookups
create index reviews_gig_id_idx on reviews(gig_id);
create index reviews_reader_id_idx on reviews(reader_id);
