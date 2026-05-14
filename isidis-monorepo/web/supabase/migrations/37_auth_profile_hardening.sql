-- Ensure every auth user has a minimal profile.
-- Public signups must never be able to self-assign READER or ADMIN through user metadata.

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  profile_full_name text;
  profile_avatar_url text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_full_name := nullif(coalesce(metadata->>'full_name', metadata->>'name'), '');
  profile_avatar_url := nullif(coalesce(metadata->>'avatar_url', metadata->>'picture'), '');

  insert into public.profiles (
    id,
    role,
    full_name,
    avatar_url
  )
  values (
    new.id,
    'CLIENT',
    profile_full_name,
    profile_avatar_url
  )
  on conflict (id) do update
    set
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user_profile();

insert into public.profiles (id, role, full_name, avatar_url)
select
  users.id,
  'CLIENT',
  nullif(coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name'), ''),
  nullif(coalesce(users.raw_user_meta_data->>'avatar_url', users.raw_user_meta_data->>'picture'), '')
from auth.users
left join public.profiles on profiles.id = users.id
where profiles.id is null;
