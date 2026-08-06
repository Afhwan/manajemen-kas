# Kas Kelas — Manajemen Keuangan Kelas

Aplikasi web untuk mengelola keuangan kelas: iuran bulanan, pencatatan pemasukan dan pengeluaran, serta laporan. Dibangun ulang dari nol dengan tiga peran: **superadmin** (developer), **bendahara** (pengelola keuangan), dan **walikelas** (melihat dashboard dan laporan saja).

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) + login username |
| Penyimpanan gambar | Cloudinary (free plan) |
| Deployment | Vercel |

## Akun Awal

| Username | Password | Peran |
|---|---|---|
| `qeida` | `qeidudu` | Bendahara |
| `yasmin` | `yasminpecintacatboyfemboy` | Bendahara |
| `superadmin` | `rezky23310` | Superadmin |
| `harry` | `harry321` | Walikelas |

## Peran dan Hak Akses

- **Superadmin** — khusus developer: kelola pengguna (buat/hapus akun, ubah peran, reset password) dan melihat semua data (read-only).
- **Bendahara** — pengelola keuangan penuh: anggota, transaksi, iuran, laporan, pengaturan kelas.
- **Walikelas** — hanya melihat Dashboard dan Laporan. Akses ke halaman lain diarahkan kembali ke Dashboard, dan mutasi data ditolak di server serta di database (RLS).

## Setup Database

1. Reset schema di Supabase SQL Editor (hapus semua data lama):
   ```sql
   drop schema public cascade;
   create schema public;
   ```
2. Jalankan seluruh isi `supabase/schema.sql` di Supabase SQL Editor.
3. Matikan **Confirm email** di Authentication → Providers → Email (agar password langsung aktif).
4. Buat akun di **Authentication → Users → Add user** (email dibuat dari username, contoh `qeida@kas-kelas.test`):
   - `qeida@kas-kelas.test` / `qeidudu`
   - `yasmin@kas-kelas.test` / `yasminpecintacatboyfemboy`
   - `superadmin@kas-kelas.test` / `rezky23310`
   - `harry@kas-kelas.test` / `harry321`
5. Set peran di SQL Editor:
   ```sql
   update public.app_users set role = 'superadmin' where username = 'superadmin';
   update public.app_users set role = 'walikelas' where username = 'harry';
   ```
   (Akun `qeida` dan `yasmin` sudah berperan bendahara secara otomatis oleh trigger, tidak perlu di-update.)

## Konfigurasi Lingkungan

Salin `.env.local.example` menjadi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=upload-preset
```

- `SUPABASE_SERVICE_ROLE_KEY` diambil dari Supabase Dashboard → Settings → API → service_role. Hanya dipakai di server action untuk fitur Kelola Pengguna — jangan pernah diekspos ke client.
- Preset upload Cloudinary dibuat dengan **unsigned preset** (mode Unsigned) agar unggahan bisa langsung dari browser.

## Script

```bash
npm run dev      # mode pengembangan
npm run build    # build produksi
npm run start    # menjalankan build
npm run lint     # ESLint
```

## Struktur Proyek

```
src/
├── app/
│   ├── login/page.tsx
│   ├── (app)/layout.tsx            # shell: sidebar desktop + bottom nav mobile
│   │   ├── dashboard/page.tsx
│   │   ├── members/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── iuran/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   └── users/page.tsx          # Kelola Pengguna (superadmin)
│   └── actions/                    # server actions
├── components/
│   ├── AppShell.tsx
│   ├── ChartWrapper.tsx / TrendChart.tsx
│   ├── ExportCsvButton.tsx
│   └── ui/                         # kit UI
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── session.ts / session-server.ts
│   ├── queries.ts / cloudinary.ts / types.ts / utils.ts
└── proxy.ts                        # middleware auth + redirect role
```

## Keamanan (Tiga Lapis)

1. **Proxy** — memastikan pengguna login dan mengarahkan walikelas ke halaman yang diizinkan.
2. **Guard server action** — `requireBendahara()` dan `requireSuperadmin()` di setiap mutasi.
3. **RLS database** — semua pengecekan peran memakai fungsi `security definer` (`is_bendahara`, `is_walikelas`, `is_superadmin`) sehingga tidak bergantung pada policy `app_users` dan tidak menimbulkan error permission.

## Lisensi

Proyek ini dibuat untuk keperluan pendidikan.
