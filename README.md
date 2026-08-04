# Kas Kelas — Manajemen Keuangan Kelas

Aplikasi web untuk mengelola keuangan kelas: iuran bulanan, pencatatan pemasukan/pengeluaran, dan laporan.

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Storage gambar | Cloudinary (free plan) |
| Deployment | Vercel |

## Fitur Utama

- **Dashboard** — saldo kas, ringkasan bulan ini, grafik 6 bulan, iuran progress
- **Anggota** — CRUD siswa, toggle aktif/nonaktif
- **Transaksi** — catat pemasukan/pengeluaran, upload bukti pembayaran ke Cloudinary
- **Iuran** — tandai lunas/belum per siswa per bulan, batch tandai lunas
- **Laporan** — rekap per bulan, per kategori, per anggota, rekap tahunan, export CSV
- **Pengaturan** — ubah nama kelas, tahun ajaran, nominal iuran, kelola kategori

## Arsitektur Penyimpanan Gambar

Bukti pembayaran diunggah langsung dari browser ke Cloudinary (unsigned upload preset), bukan melalui server. Ini menghemat bandwidth Vercel dan kapasitas Supabase Storage.

- Kompresi gambar dilakukan di sisi browser sebelum upload (maks 300 KB, max 1000px).
- URL gambar disimpan di kolom `transactions.proof_url`.

## Konfigurasi

1. **Clone** repositori ini
2. Salin `.env.local.example` → `.env.local`, isi nilai-nilai berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

3. Buat proyek di [Supabase](https://supabase.com) dan [Cloudinary](https://cloudinary.com).
4. Di Supabase SQL Editor, jalankan file `supabase/schema.sql`.
5. Jalankan `npm run dev` dan buka `http://localhost:3000`.

## Cara Membuat Akun Admin

Buka Supabase Dashboard → Authentication → Users → Add user. Masukkan email dan password. Login dengan akun tersebut untuk mengakses aplikasi.

## Struktur Proyek

```
src/
├── app/
│   ├── login/page.tsx          # Halaman login
│   ├── (app)/                   # Grup route (terproteksi)
│   │   ├── layout.tsx          # Sidebar + topbar shell
│   │   ├── dashboard/page.tsx
│   │   ├── members/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── iuran/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── actions/                # Server actions
│   │   ├── auth.ts
│   │   ├── members.ts
│   │   ├── transactions.ts
│   │   ├── iurans.ts
│   │   ├── settings.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client (client components)
│   │   │   ├── server.ts       # Server client (server actions)
│   │   │   └── proxy.ts        # Logic untuk proxy.ts
│   │   ├── queries.ts          # Helper fetch data (client-side)
│   │   ├── cloudinary.ts       # Upload + kompresi gambar
│   │   ├── types.ts            # Tipe antarmuka tabel
│   │   └── utils.ts            # Format uang, tanggal, dll.
│   ├── components/ui/          # Komponen UI minimal
│   ├── proxy.ts                # Middleware (Next 16 → proxy)
├── supabase/
│   └── schema.sql              # Skema database + seed
```

## Deployment ke Vercel

1. Push repo ke GitHub.
2. Di [Vercel](https://vercel.com), buat proyek baru dan impor repo.
3. Tambahkan environment variables di dashboard Vercel (sama dengan `.env.local`).
4. Deploy.

## Lisensi

Proyek ini dibuat untuk keperluan pendidikan.