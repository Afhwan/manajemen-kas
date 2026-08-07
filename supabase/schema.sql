-- ============================================================
-- Manajemen Kas XI Sija — Skema Database (tunggal, idempotent)
-- Jalankan seluruh file ini di Supabase SQL Editor.
--
-- Reset dulu bila perlu (menghapus semua data lama):
--   drop schema public cascade;
--   create schema public;
--
-- PENTING: setelah `drop schema public cascade`, schema public
-- yang baru dibuat TIDAK lagi memiliki hak akses untuk role
-- anon/authenticated/service_role. Blok grant di bawah
-- memulihkannya, lalu seluruh objek dibuat ulang setelahnya.
-- ============================================================

-- ---------- HAK AKSES SCHEMA (wajib setelah reset) ----------

grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ---------- TABEL ----------

create table if not exists public.class_info (
  id            bigint primary key default 1 check (id = 1),
  class_name    text not null default 'X RPL 1',
  academic_year text not null default '2026/2027',
  iuran_amount  bigint not null default 10000,
  created_at    timestamptz not null default now()
);

create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  nis        text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nis)
);

create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  type      text not null check (type in ('income', 'expense')),
  is_active boolean not null default true
);

create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('income', 'expense')),
  category_id      uuid references public.categories(id) on delete restrict,
  amount           bigint not null check (amount >= 0),
  description      text not null default '',
  transaction_date date not null default current_date,
  proof_public_id  text,
  proof_url        text,
  iuran_id         uuid,
  created_at       timestamptz not null default now()
);

create index if not exists idx_transactions_date     on public.transactions (transaction_date);
create index if not exists idx_transactions_category on public.transactions (category_id);
create index if not exists idx_transactions_type     on public.transactions (type);

create table if not exists public.iurans (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.members(id) on delete restrict,
  period         date not null,
  amount         bigint not null,
  status         text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  paid_at        timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (member_id, period)
);

create index if not exists idx_iurans_period on public.iurans (period);
create index if not exists idx_iurans_member on public.iurans (member_id);

create table if not exists public.app_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username = lower(username)),
  email      text not null unique,
  role       text not null default 'bendahara',
  created_at timestamptz not null default now()
);

-- Ubah/muat ulang constraint role agar hanya menerima bendahara & superadmin (idempotent).
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role in ('bendahara', 'superadmin'));

-- ---------- TRIGGER: USERNAME OTOMATIS DARI EMAIL ----------

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, username, email, role)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)),
    new.email,
    'bendahara'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_app_user();

-- ---------- BACKFILL ----------

insert into public.app_users (id, username, email, role)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  u.email,
  'bendahara'
from auth.users u
on conflict (id) do nothing;

-- ---------- FUNGSI SECURITY DEFINER (bypass RLS) ----------

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

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where id = auth.uid() and role = 'superadmin'
  )
$$;

create or replace function public.get_app_user(p_uid uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select to_jsonb(x) from (
    select au.username, au.role
    from public.app_users au
    where au.id = p_uid
  ) x
$$;

create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from public.app_users where username = lower(p_username)
$$;

-- Ringkasan kas untuk halaman publik /kas (tanpa membuka tabel bisnis ke role anon).
create or replace function public.get_kas_summary()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'class_name',   (select class_name   from public.class_info limit 1),
    'academic_year',(select academic_year from public.class_info limit 1),
    'balance', (select coalesce(sum(case when type='income' then amount else -amount end), 0)
                from public.transactions),
    'month_income', (select coalesce(sum(amount), 0) from public.transactions
                     where type='income' and transaction_date >= date_trunc('month', current_date)),
    'month_expense', (select coalesce(sum(amount), 0) from public.transactions
                      where type='expense' and transaction_date >= date_trunc('month', current_date)),
    'iuran_total', (select count(*) from public.iurans
                    where period = date_trunc('month', current_date)::date),
    'iuran_paid', (select count(*) from public.iurans
                   where period = date_trunc('month', current_date)::date and status='paid'),
    'recent', (select jsonb_agg(jsonb_build_object(
                  'date', t.transaction_date, 'type', t.type, 'amount', t.amount,
                  'description', t.description, 'category', c.name))
                from (select transaction_date, type, amount, description, category_id
                      from public.transactions
                      order by transaction_date desc, created_at desc
                      limit 8) t
                left join public.categories c on c.id = t.category_id)
  )
$$;

grant execute on function public.is_bendahara() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.get_app_user(uuid) to authenticated;
grant execute on function public.get_email_by_username(text) to anon, authenticated;
grant execute on function public.get_kas_summary() to anon, authenticated;

-- Hak akses tabel/sekuens yang mungkin sudah ada (aman dijalankan ulang).
-- RLS tetap membatasi baris: role anon tidak punya policy select apa pun,
-- dan role authenticated hanya melihat lewat policy yang didefinisikan.
grant all on all tables in schema public    to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- ---------- ROW LEVEL SECURITY ----------

alter table public.class_info   enable row level security;
alter table public.members      enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.iurans       enable row level security;
alter table public.app_users    enable row level security;

-- class_info
drop policy if exists "bendahara write class_info" on public.class_info;
drop policy if exists "superadmin read class_info" on public.class_info;
create policy "bendahara write class_info" on public.class_info
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "superadmin read class_info" on public.class_info
  for select to authenticated
  using (public.is_superadmin());

-- members
drop policy if exists "bendahara write members" on public.members;
drop policy if exists "superadmin read members" on public.members;
create policy "bendahara write members" on public.members
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "superadmin read members" on public.members
  for select to authenticated
  using (public.is_superadmin());

-- categories
drop policy if exists "bendahara write categories" on public.categories;
drop policy if exists "superadmin read categories" on public.categories;
create policy "bendahara write categories" on public.categories
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "superadmin read categories" on public.categories
  for select to authenticated
  using (public.is_superadmin());

-- transactions
drop policy if exists "bendahara write transactions" on public.transactions;
drop policy if exists "superadmin read transactions" on public.transactions;
create policy "bendahara write transactions" on public.transactions
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "superadmin read transactions" on public.transactions
  for select to authenticated
  using (public.is_superadmin());

-- iurans
drop policy if exists "bendahara write iurans" on public.iurans;
drop policy if exists "superadmin read iurans" on public.iurans;
create policy "bendahara write iurans" on public.iurans
  for all to authenticated
  using (public.is_bendahara())
  with check (public.is_bendahara());
create policy "superadmin read iurans" on public.iurans
  for select to authenticated
  using (public.is_superadmin());

-- app_users
drop policy if exists "app_users read own" on public.app_users;
drop policy if exists "app_users superadmin manage" on public.app_users;
create policy "app_users read own" on public.app_users
  for select to authenticated using (auth.uid() = id);
create policy "app_users superadmin manage" on public.app_users
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ---------- SEED ----------

insert into public.categories (name, type) values
  ('Iuran',       'income'),
  ('Kas Awal',    'income'),
  ('Sumbangan',   'income'),
  ('Lain-lain',   'income'),
  ('ATK',         'expense'),
  ('Acara',       'expense'),
  ('Kebersihan',  'expense'),
  ('Sosial',      'expense'),
  ('Lain-lain',   'expense')
on conflict do nothing;

insert into public.class_info (class_name, academic_year, iuran_amount)
values ('X RPL 1', '2026/2027', 10000)
on conflict (id) do nothing;

-- ============================================================
-- SETELAH INI (manual di dashboard Supabase):
-- 1. Authentication -> Users -> Add user (matikan confirm email):
--    - qeida@kas-kelas.test       / qeidudu
--    - yasmin@kas-kelas.test      / yasminpecintacatboyfemboy
--    - superadmin@kas-kelas.test  / rezky23310
-- 2. Jalankan di SQL Editor:
--    update public.app_users set role = 'superadmin' where username = 'superadmin';
--    (qeida dan yasmin otomatis berperan bendahara oleh trigger.)
-- ============================================================