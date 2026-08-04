-- ============================================================
-- Manajemen Kas Kelas — Schema & Seed
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- ---------- KONFIGURASI KELAS (single row, id = 1) ----------
create table if not exists public.class_info (
  id            bigint primary key default 1 check (id = 1),
  class_name    text not null default 'X RPL 1',
  academic_year text not null default '2026/2027',
  iuran_amount  bigint not null default 10000,
  created_at    timestamptz not null default now()
);

-- ---------- ANGGOTA (siswa) ----------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  nis        text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nis)
);

-- ---------- KATEGORI TRANSAKSI ----------
create table if not exists public.categories (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  type      text not null check (type in ('income', 'expense')),
  is_active boolean not null default true
);

-- ---------- TRANSAKSI ----------
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('income', 'expense')),
  category_id      uuid references public.categories(id) on delete restrict,
  amount           bigint not null check (amount >= 0),
  description      text not null default '',
  transaction_date date not null default current_date,
  proof_public_id  text,
  proof_url        text,
  iuran_id         uuid, -- referensi balik ke iurans (transaksi auto dari iuran)
  created_at       timestamptz not null default now()
);

create index if not exists idx_transactions_date     on public.transactions (transaction_date);
create index if not exists idx_transactions_category on public.transactions (category_id);
create index if not exists idx_transactions_type     on public.transactions (type);

-- ---------- IURAN (status per siswa per bulan) ----------
create table if not exists public.iurans (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.members(id) on delete restrict,
  period         date not null, -- selalu tanggal 1 pada bulan berjalan
  amount         bigint not null,
  status         text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  paid_at        timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (member_id, period)
);

create index if not exists idx_iurans_period on public.iurans (period);
create index if not exists idx_iurans_member on public.iurans (member_id);

-- Catatan: Saldo TIDAK disimpan sebagai kolom.
-- Selalu dihitung: SUM(income) - SUM(expense) agar konsisten.

-- ============================================================
-- AKUN PENGGUNA (username login + role)
-- Auth tetap Supabase (email/password); tabel ini memetakan
-- username -> email + role (bendahara = edit, walikelas = lihat).
-- ============================================================
create table if not exists public.app_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username = lower(username)),
  email      text not null unique,
  role       text not null default 'bendahara' check (role in ('bendahara','walikelas')),
  created_at timestamptz not null default now()
);

-- Trigger: username auto-fill dari email (prefix sebelum "@", huruf kecil)
-- Setiap akun yang dibuat di Supabase Auth otomatis terdaftar.
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

-- Backfill: user lama yang belum punya baris app_users (aman diulang)
insert into public.app_users (id, username, email, role)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  u.email,
  'bendahara'
from auth.users u
on conflict (id) do nothing;

alter table public.app_users enable row level security;

drop policy if exists "app_users read own" on public.app_users;
create policy "app_users read own" on public.app_users
  for select to authenticated using (auth.uid() = id);

-- Fungsi lookup email oleh username (aman, bypass RLS, tidak expose daftar email)
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

-- ============================================================
-- ROW LEVEL SECURITY
-- bendahara: akses penuh; walikelas: hanya baca (view-only).
-- ============================================================
alter table public.class_info   enable row level security;
alter table public.members      enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.iurans       enable row level security;

-- class_info
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
-- SEED DATA
-- ============================================================

-- Kategori default
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

-- Info kelas awal (ubah sesuai kebutuhan)
insert into public.class_info (class_name, academic_year, iuran_amount)
values ('X RPL 1', '2026/2027', 10000)
on conflict (id) do nothing;

-- ============================================================
-- SAMPLE DATA (opsional — hapus blok ini untuk mulai bersih)
-- ============================================================

-- 10 siswa contoh
-- insert into public.members (name, nis) values
--   ('Ahmad Fauzi',    '001'),
--   ('Budi Santoso',   '002'),
--   ('Citra Lestari',  '003'),
--   ('Dewi Anggraini', '004'),
--   ('Eko Prasetyo',   '005'),
--   ('Fitri Handayani','006'),
--   ('Galih Prakoso',  '007'),
--   ('Hana Safitri',   '008'),
--   ('Irfan Maulana',  '009'),
--   ('Joko Susilo',    '010');

-- ============================================================
-- CARA MEMBUAT AKUN (TIDAK PERLU INSERT MANUAL)
--
-- 1. Buka Supabase Auth -> Authentication -> Users -> Add user.
--    Masukkan email + password (kolom "nama" memang tidak ada di form ini).
-- 2. Username TERISI OTOMATIS oleh trigger on_auth_user_created:
--    username = bagian sebelum "@" pada email (huruf kecil).
--    Contoh: email "bendahara.kelas@gmail.com" -> username "bendahara.kelas".
-- 3. Role default = bendahara.
--    Untuk akun walikelas (hanya lihat), jalankan satu baris:
--    update public.app_users set role = 'walikelas'
--    where username = 'username-akun-walikelas';
-- 4. Login di aplikasi pakai username + password.
-- ============================================================
