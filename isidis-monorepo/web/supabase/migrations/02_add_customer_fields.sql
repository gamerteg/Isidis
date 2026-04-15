-- Add customer fields required by Abacate Pay
alter table profiles add column if not exists cellphone text;
alter table profiles add column if not exists tax_id text; -- CPF
