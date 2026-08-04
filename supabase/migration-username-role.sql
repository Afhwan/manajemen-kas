-- ============================================================
-- Migration: Login username + role bendahara/walikelas
-- Idempotent — aman dijalankan ulang di proyek yang sudah ada.
-- Jalankan seluruh file ini di Supabase SQL Editor.
-- ============================================================

-- ---------- 1. TABEL app_users ----------
-- Menyimpan mapping username -> email + role. Auth tetap Supabase (email/password).
create table if not exists public.app_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username = lower(username)),
  email      text not null unique,
  role       text not null default 'bendahara' check (role in ('bendahara','walikelas')),
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

drop policy if exists "app_users read own" on public.app_users;
create policy "app_users read own" on public.app_users
  for select to authenticated using (auth.uid() = id);

-- ---------- 2. FUNGSI LOOKUP EMAIL OLEH USERNAME ----------
-- security definer: berjalan sebagai pemilik tabel, tidak terblokir RLS.
-- Hanya mengembalikan email untuk username yang cocok (exact, case-insensitive).
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
security definer
stable
as $$
  select email from public.app_users where username = lower(p_username)
$$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- ---------- 3. RLS TABEL BISNIS: bendahara full, walikelas read-only ----------
-- Helper: cek role pemakai lewat app_users (policy "read own" mengizinkan baris sendiri).

-- class_info
drop policy if exists "auth full access class_info" on public.class_info;
drop policy if exists "bendahara write class_info" on public.class_info;
drop policy if exists "walikelas read class_info" on public.class_info;
create policy "bendahara write class_info" on public.class_info
  for all to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'))
  with check (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'));
create policy "walikelas read class_info" on public.class_info
  for select to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'walikelas'));

-- members
drop policy if exists "auth full access members" on public.members;
drop policy if exists "bendahara write members" on public.members;
drop policy if exists "walikelas read members" on public.members;
create policy "bendahara write members" on public.members
  for all to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'))
  with check (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'));
create policy "walikelas read members" on public.members
  for select to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'walikelas'));

-- categories
drop policy if exists "auth full access categories" on public.categories;
drop policy if exists "bendahara write categories" on public.categories;
drop policy if exists "walikelas read categories" on public.categories;
create policy "bendahara write categories" on public.categories
  for all to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'))
  with check (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'));
create policy "walikelas read categories" on public.categories
  for select to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'walikelas'));

-- transactions
drop policy if exists "auth full access transactions" on public.transactions;
drop policy if exists "bendahara write transactions" on public.transactions;
drop policy if exists "walikelas read transactions" on public.transactions;
create policy "bendahara write transactions" on public.transactions
  for all to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'))
  with check (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'));
create policy "walikelas read transactions" on public.transactions
  for select to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'walikelas'));

-- iurans
drop policy if exists "auth full access iurans" on public.iurans;
drop policy if exists "bendahara write iurans" on public.iurans;
drop policy if exists "walikelas read iurans" on public.iurans;
create policy "bendahara write iurans" on public.iurans
  for all to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'))
  with check (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'bendahara'));
create policy "walikelas read iurans" on public.iurans
  for select to authenticated
  using (exists (select 1 from public.app_users au where au.id = auth.uid() and au.role = 'walikelas'));

-- ============================================================
-- SKRIP DAFTARKAN AKUN (jalankan MANUAL setelah membuat user
-- di Supabase Auth -> Authentication -> Users -> Add user)
--
-- insert into public.app_users (id, username, email, role)
-- select id, 'bendahara', email, 'bendahara' from auth.users where email = 'email-bendahara@contoh.com';
--
-- insert into public.app_users (id, username, email, role)
-- select id, 'walikelas', email, 'walikelas' from auth.users where email = 'email-walikelas@contoh.com';
--
-- Catatan: username wajib huruf kecil (dipaksa oleh constraint check).
-- ============================================================
