-- Create tickets table
create table tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  subject text not null,
  category text check (category in ('REEMBOLSO', 'SAQUE', 'MUDANCA_PIX', 'DUVIDA', 'OUTRO')) not null,
  status text check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')) default 'OPEN',
  priority text check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) default 'MEDIUM',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ticket_messages table
create table ticket_messages (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references tickets(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table tickets enable row level security;
alter table ticket_messages enable row level security;

-- Tickets Policies
create policy "Users can view their own tickets." on tickets
  for select using (auth.uid() = user_id);

create policy "Admins can view all tickets." on tickets
  for select using (exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  ));

create policy "Users can insert their own tickets." on tickets
  for insert with check (auth.uid() = user_id);

create policy "Admins can update tickets." on tickets
  for update using (exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  ));

-- Ticket Messages Policies
create policy "Users can view messages of their tickets." on ticket_messages
  for select using (
    exists (
      select 1 from tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Admins can view all ticket messages." on ticket_messages
  for select using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "Users can insert messages to their tickets." on ticket_messages
  for insert with check (
    exists (
      select 1 from tickets t where t.id = ticket_id and t.user_id = auth.uid()
    )
  );

create policy "Admins can insert messages to any ticket." on ticket_messages
  for insert with check (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'ADMIN'
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table ticket_messages;

-- Trigger to update updated_at on tickets
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_tickets_updated_at
before update on tickets
for each row
execute procedure update_updated_at_column();
