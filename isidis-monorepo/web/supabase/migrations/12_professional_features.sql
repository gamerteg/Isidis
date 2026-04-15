-- Migration for Professional Features: Notifications & Financial Triggers

-- 1. Notifications Table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('ORDER_NEW', 'ORDER_STATUS', 'REVIEW_NEW', 'WITHDRAWAL_UPDATE', 'SYSTEM')),
  title text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table notifications enable row level security;

create policy "Users can view own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- 2. Function to create notification
create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text default null
) returns void as $$
begin
  insert into notifications (user_id, type, title, message, link)
  values (p_user_id, p_type, p_title, p_message, p_link);
end;
$$ language plpgsql security definer;

-- 3. Triggers

-- Trigger: New Order -> Notify Reader
create or replace function notify_new_order() returns trigger as $$
begin
  perform create_notification(
    NEW.reader_id,
    'ORDER_NEW',
    'Novo Pedido Recebido! 🔮',
    'Você recebeu um novo pedido. Clique para ver os detalhes.',
    '/dashboard/tarologa/pedido/' || NEW.id
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_order_created
  after insert on orders
  for each row execute procedure notify_new_order();

-- Trigger: Order Status Change (Delivered/Completed) -> Notify Client
create or replace function notify_order_status() returns trigger as $$
begin
  if OLD.status <> NEW.status then
    if NEW.status = 'DELIVERED' then
      perform create_notification(
        NEW.client_id,
        'ORDER_STATUS',
        'Sua leitura chegou! ✨',
        'Sua leitura de tarot foi entregue. Acesse para ver o resultado.',
        '/dashboard/pedido/' || NEW.id || '/leitura'
      );
    elsif NEW.status = 'CANCELED' then
      perform create_notification(
        NEW.client_id,
        'ORDER_STATUS',
        'Pedido Cancelado',
        'Seu pedido de leitura foi cancelado e o valor será estornado.',
        '/dashboard'
      );
       perform create_notification(
        NEW.reader_id,
        'ORDER_STATUS',
        'Pedido Cancelado',
        'Um pedido foi cancelado.',
        '/dashboard/tarologa'
      );
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_order_status_change
  after update on orders
  for each row execute procedure notify_order_status();

-- Trigger: New Review -> Notify Reader
create or replace function notify_new_review() returns trigger as $$
begin
  perform create_notification(
    NEW.reader_id,
    'REVIEW_NEW',
    'Nova Avaliação Recebida ⭐',
    'Um cliente avaliou seu atendimento com ' || NEW.rating || ' estrelas.',
    '/dashboard/tarologa/perfil'
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_review_created
  after insert on reviews
  for each row execute procedure notify_new_review();

-- Trigger: Withdrawal Status Update -> Notify User
create or replace function notify_withdrawal_update() returns trigger as $$
begin
  if OLD.status <> NEW.status and NEW.type = 'WITHDRAWAL' then
    perform create_notification(
      (select user_id from wallets where id = NEW.wallet_id),
      'WITHDRAWAL_UPDATE',
      'Atualização de Saque 💰',
      'Seu saque agora está: ' || NEW.status,
      '/dashboard/tarologa/carteira'
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_withdrawal_update
  after update on transactions
  for each row execute procedure notify_withdrawal_update();

-- 4. Create Index on Notifications for speed
create index notifications_user_id_idx on notifications(user_id);
create index notifications_read_idx on notifications(read);
