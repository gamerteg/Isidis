-- Add missing columns for buyer profile (required by checkout)
alter table profiles add column if not exists cellphone text;
alter table profiles add column if not exists tax_id text;

-- Create reviews table (used by analytics, gigs, and dashboard pages)
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) not null,
  gig_id uuid references gigs(id) not null,
  reader_id uuid references profiles(id) not null,
  client_id uuid references profiles(id) not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table reviews enable row level security;

-- Everyone can view reviews (for public gig pages)
create policy "Reviews are viewable by everyone." on reviews
  for select using (true);

-- Clients can insert reviews for their own orders
create policy "Clients can insert reviews for their orders." on reviews
  for insert with check (auth.uid() = client_id);
