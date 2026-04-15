-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text check (role in ('CLIENT', 'READER', 'ADMIN')) default 'CLIENT',
  full_name text,
  avatar_url text,
  bio text,
  specialties text[],
  pix_key_type text,
  pix_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create gigs table
create table gigs (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  price integer not null, -- in cents
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table gigs enable row level security;

create policy "Gigs are viewable by everyone." on gigs
  for select using (true);

create policy "Readers can insert their own gigs." on gigs
  for insert with check (auth.uid() = owner_id);

create policy "Readers can update their own gigs." on gigs
  for update using (auth.uid() = owner_id);

-- Create orders table
create table orders (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references profiles(id) not null,
  gig_id uuid references gigs(id) not null,
  reader_id uuid references profiles(id) not null,
  status text check (status in ('PENDING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELED')) default 'PENDING_PAYMENT',
  asaas_payment_id text,
  amount_total integer not null,
  amount_platform_fee integer not null,
  amount_reader_net integer not null,
  delivery_content jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table orders enable row level security;

create policy "Users can view their own orders." on orders
  for select using (auth.uid() = client_id or auth.uid() = reader_id);

-- Create wallets table
create table wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table wallets enable row level security;

create policy "Users can view their own wallet." on wallets
  for select using (auth.uid() = user_id);

-- Create transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  wallet_id uuid references wallets(id) not null,
  amount integer not null,
  type text check (type in ('SALE_CREDIT', 'PLATFORM_FEE', 'WITHDRAWAL')) not null,
  status text check (status in ('PENDING', 'COMPLETED', 'FAILED')) default 'PENDING',
  order_id uuid references orders(id),
  external_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table transactions enable row level security;

create policy "Users can view their own transactions." on transactions
  for select using (
    exists ( select 1 from wallets w where w.id = transactions.wallet_id and w.user_id = auth.uid() )
  );

-- RPC for Withdrawal (atomic) -> To be added via Dashboard or SQL Editor manually if needed, but here is the structure
-- Note: Function creation usually requires admin privileges.
