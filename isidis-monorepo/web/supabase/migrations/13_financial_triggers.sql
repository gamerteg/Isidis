-- 13_financial_triggers.sql
-- Automates financial flows: Wallet Creation & Earnings Credit

-- 1. Ensure Wallets exist for all profiles (Backfill)
insert into wallets (user_id)
select id from profiles
where id not in (select user_id from wallets);

-- 2. Trigger: Create Wallet on Profile Creation
create or replace function create_wallet_for_new_user() returns trigger as $$
begin
  insert into wallets (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid duplication
drop trigger if exists on_auth_user_created_wallet on profiles;
create trigger on_profile_created_wallet
  after insert on profiles
  for each row execute procedure create_wallet_for_new_user();


-- 3. Trigger: Order Status Change -> Credit Transaction
create or replace function handle_order_financials() returns trigger as $$
declare
  wallet_id uuid;
begin
  -- Only proceed if status changed
  if old.status = new.status then
    return new;
  end if;

  -- Get Reader's Wallet ID
  select id into wallet_id from wallets where user_id = new.reader_id;
  
  if wallet_id is null then
    -- Should have been created, but safety check
    insert into wallets (user_id) values (new.reader_id) returning id into wallet_id;
  end if;

  -- CASE 1: DELIVERED -> Create PENDING Credit
  if new.status = 'DELIVERED' and old.status <> 'DELIVERED' then
    -- Check if transaction already exists (idempotency)
    if not exists (select 1 from transactions where order_id = new.id and type = 'SALE_CREDIT') then
      insert into transactions (wallet_id, amount, type, status, order_id)
      values (
        wallet_id,
        new.amount_reader_net,
        'SALE_CREDIT',
        'PENDING',
        new.id
      );
    end if;
  end if;

  -- CASE 2: COMPLETED -> Release Funds (PENDING -> COMPLETED)
  if new.status = 'COMPLETED' and old.status <> 'COMPLETED' then
      -- Update existing transaction if exists
      update transactions
      set status = 'COMPLETED'
      where order_id = new.id and type = 'SALE_CREDIT';
      
      -- Safety: If it didn't exist (e.g. jumped straight to COMPLETED), create it
      if not found then
         insert into transactions (wallet_id, amount, type, status, order_id)
         values (
           wallet_id,
           new.amount_reader_net,
           'SALE_CREDIT',
           'COMPLETED',
           new.id
         );
      end if;
  end if;

  -- CASE 3: CANCELED -> Mark as FAILED (or delete?)
  if new.status = 'CANCELED' and old.status <> 'CANCELED' then
      update transactions
      set status = 'FAILED'
      where order_id = new.id and type = 'SALE_CREDIT';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_financials on orders;
create trigger on_order_financials
  after update on orders
  for each row execute procedure handle_order_financials();

-- 4. Backfill missing transactions for existing DELIVERED/COMPLETED orders
insert into transactions (wallet_id, amount, type, status, order_id, created_at)
select 
  w.id,
  o.amount_reader_net,
  'SALE_CREDIT',
  case when o.status = 'COMPLETED' then 'COMPLETED' else 'PENDING' end,
  o.id,
  o.created_at
from orders o
join wallets w on w.user_id = o.reader_id
where o.status in ('DELIVERED', 'COMPLETED')
and not exists (select 1 from transactions where order_id = o.id and type = 'SALE_CREDIT');
