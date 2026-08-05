-- ============================================================
-- Fix: RLS permission denied for app_users in policy subqueries
-- Security-definer role-check functions bypass app_users RLS.
-- Idempotent — aman dijalankan ulang.
-- ============================================================

-- ---------- 1. FUNGSI HELPER SECURITY DEFINER ----------

create or replace function public.is_bendahara()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'bendahara'
  )
$$;

create or replace function public.is_walikelas()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'walikelas'
  )
$$;

create or replace function public.get_app_user(p_uid uuid)
returns table (username text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select au.username, au.role
  from public.app_users au
  where au.id = p_uid
$$;

grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.is_walikelas() to authenticated;
grant execute on function public.get_app_user(uuid) to authenticated;

-- ---------- 2. TULIS ULANG POLICY TABEL BISNIS ----------

-- class_info
drop policy if exists "bendahara write class_info" on public.class_info;
drop policy if exists "walikelas read class_info" on public.class_info;
create policy "bendahara write class_info" on public.class_info
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "walikelas read class_info" on public.class_info
  for select to authenticated
  using (public.is_walikelas());

-- members
drop policy if exists "bendahara write members" on public.members;
drop policy if exists "walikelas read members" on public.members;
create policy "bendahara write members" on public.members
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "walikelas read members" on public.members
  for select to authenticated
  using (public.is_walikelas());

-- categories
drop policy if exists "bendahara write categories" on public.categories;
drop policy if exists "walikelas read categories" on public.categories;
create policy "bendahara write categories" on public.categories
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "walikelas read categories" on public.categories
  for select to authenticated
  using (public.is_walikelas());

-- transactions
drop policy if exists "bendahara write transactions" on public.transactions;
drop policy if exists "walikelas read transactions" on public.transactions;
create policy "bendahara write transactions" on public.transactions
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "walikelas read transactions" on public.transactions
  for select to authenticated
  using (public.is_walikelas());

-- iurans
drop policy if exists "bendahara write iurans" on public.iurans;
drop policy if exists "walikelas read iurans" on public.iurans;
create policy "bendahara write iurans" on public.iurans
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "walikelas read iurans" on public.iurans
  for select to authenticated
  using (public.is_walikelas());

-- ---------- 3. BACKFILL APP_USERS ----------

insert into public.app_users (id, username, email, role)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  u.email,
  'bendahara'
from auth.users u
on conflict (id) do nothing;

-- ---------- 4. ENSURE APP_USERS READ OWN POLICY ----------

alter table public.app_users enable row level security;

drop policy if exists "app_users read own" on public.app_users;
create policy "app_users read own" on public.app_users
  for select to authenticated using (auth.uid() = id);