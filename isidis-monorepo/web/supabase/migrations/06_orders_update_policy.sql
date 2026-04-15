-- ──────────────────────────────────────────────────────────────
-- Migration 06: Missing RLS policies for orders, wallets, transactions
-- ──────────────────────────────────────────────────────────────

-- Orders: Clients need INSERT to create orders at checkout
create policy "Clients can create orders." on orders
  for insert with check (auth.uid() = client_id);

-- Orders: Readers need UPDATE to save delivery content and change status
create policy "Readers can update their orders." on orders
  for update using (auth.uid() = reader_id);

-- Wallets: Users can insert their own wallet (needed for first-time setup)
create policy "Users can insert their own wallet." on wallets
  for insert with check (auth.uid() = user_id);

-- Transactions: Allow insert for users through their wallet
create policy "Users can insert transactions via their wallet." on transactions
  for insert with check (
    exists ( select 1 from wallets w where w.id = transactions.wallet_id and w.user_id = auth.uid() )
  );