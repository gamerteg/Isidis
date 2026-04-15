-- Migration to add fields for Taróloga registration layers (Legal, Security, Professional)

alter table profiles
  add column if not exists social_name text,
  add column if not exists birth_date date,
  -- Legal/Fiscal
  add column if not exists company_name text,
  add column if not exists cnpj text,
  add column if not exists cbo text,
  -- Address
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip_code text,
  -- Bank
  add column if not exists bank_code text,
  add column if not exists agency text,
  add column if not exists account_number text,
  add column if not exists account_type text check (account_type in ('CHECKING', 'SAVINGS')),
  -- Documents (Security)
  add column if not exists document_front_url text,
  add column if not exists document_back_url text,
  add column if not exists selfie_url text,
  add column if not exists verification_status text check (verification_status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  -- Compliance
  add column if not exists ethics_accepted_at timestamp with time zone,
  add column if not exists results_disclaimer_accepted_at timestamp with time zone,
  -- Profile (Professional)
  add column if not exists profile_video_url text;
