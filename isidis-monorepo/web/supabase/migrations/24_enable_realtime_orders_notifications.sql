-- Enable Realtime for orders and notifications
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
