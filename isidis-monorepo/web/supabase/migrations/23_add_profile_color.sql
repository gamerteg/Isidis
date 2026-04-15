-- Add profile_color to profiles table
alter table profiles
  add column if not exists profile_color text default null;
