-- Migration for Order Limits
alter table profiles 
add column if not exists max_orders_per_day integer default 0,
add column if not exists max_simultaneous_orders integer default 0;

comment on column profiles.max_orders_per_day is 'Maximum number of orders a tarologa can receive in a single day (0 = unlimited)';
comment on column profiles.max_simultaneous_orders is 'Maximum number of active (PAID or DELIVERED) orders a tarologa can have at once (0 = unlimited)';
