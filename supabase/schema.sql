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
-- ROW LEVEL SECURITY
-- Hanya pengguna yang sudah login (authenticated) yang punya akses.
-- ============================================================
alter table public.class_info   enable row level security;
alter table public.members      enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.iurans       enable row level security;

create policy "auth full access class_info"   on public.class_info   for all to authenticated using (true) with check (true);
create policy "auth full access members"      on public.members      for all to authenticated using (true) with check (true);
create policy "auth full access categories"   on public.categories   for all to authenticated using (true) with check (true);
create policy "auth full access transactions" on public.transactions for all to authenticated using (true) with check (true);
create policy "auth full access iurans"       on public.iurans       for all to authenticated using (true) with check (true);

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
