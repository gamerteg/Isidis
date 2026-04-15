-- Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  order_id uuid references public.orders(id) on delete set null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policies
create policy "Users can read own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert messages as sender"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can update read status of received messages"
  on public.messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Indexes for performance
create index if not exists idx_messages_participants on public.messages(sender_id, receiver_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_order on public.messages(order_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

-- Realtime
alter publication supabase_realtime add table public.messages;
