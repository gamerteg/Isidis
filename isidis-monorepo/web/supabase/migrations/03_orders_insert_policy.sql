-- Allow authenticated clients to create orders (as the buyer)
create policy "Clients can create orders." on orders
  for insert with check (auth.uid() = client_id);

-- Allow users to update their own orders (for payment status updates)
create policy "Users can update their own orders." on orders
  for update using (auth.uid() = client_id or auth.uid() = reader_id);
