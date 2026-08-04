# Kas Kelas — Manajemen Keuangan Kelas

Aplikasi web untuk mengelola keuangan kelas: iuran bulanan, pencatatan pemasukan/pengeluaran, dan laporan. Desain **mobile-first** dengan akses dua peran: **bendahara** (edit) dan **walikelas** (hanya melihat).

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) + login username |
| Storage gambar | Cloudinary (free plan) |
| Deployment | Vercel |

## Fitur Utama

- **Login username + password** — mapping username → email disimpan di tabel `app_users`
- **Dashboard** — saldo kas, ringkasan bulan ini, grafik 6 bulan, iuran progress
- **Anggota** — CRUD siswa, toggle aktif/nonaktif
- **Transaksi** — catat pemasukan/pengeluaran, upload bukti pembayaran ke Cloudinary
- **Iuran** — tandai lunas/belum per siswa per bulan, batch tandai lunas
- **Laporan** — rekap per bulan, per kategori, per anggota, rekap tahunan, export CSV
- **Pengaturan** — ubah nama kelas, tahun ajaran, nominal iuran, kelola kategori
- **Peran walikelas** — akun view-only, hanya melihat Dashboard + Laporan (tanpa tombol edit; aksi di-server juga ditolak)
- **Mobile-first** — bottom nav di ponsel, tabel jadi kartu di layar kecil, modal jadi bottom sheet

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
5. Jika proyek Supabase **sudah pernah** memakai schema versi lama, jalankan juga `supabase/migration-username-role.sql` (mengganti policy RLS dan menambah tabel `app_users`).
6. Jalankan `npm run dev` dan buka `http://localhost:3000`.

## Cara Membuat Akun (Bendahara & Walikelas)

Login memakai **username + password**. Username **terisi otomatis dari email** (bagian sebelum `@`, huruf kecil) oleh trigger database — jadi tidak perlu insert manual. Auth di belakangnya tetap Supabase (email/password). Langkahnya:

1. Buka Supabase Dashboard → **Authentication** → **Users** → **Add user**. Buat akun (email + password) untuk **bendahara** dan **walikelas**. Form ini memang hanya menerima email — username otomatis terisi: misal email `bendahara.kelas@gmail.com` → username `bendahara.kelas`.
2. Role default semua akun = **bendahara**. Untuk akun walikelas (hanya lihat), jalankan satu baris di SQL Editor:
   ```sql
   update public.app_users set role = 'walikelas'
   where username = 'username-akun-walikelas';
   ```
3. Login pakai username + password.
   - **Bendahara**: akses penuh (semua menu + edit).
   - **Walikelas**: hanya Dashboard + Laporan, semua read-only. Akses langsung ke halaman edit akan diarahkan kembali ke Dashboard, dan RLS database menolak perubahan.

Catatan: username harus huruf kecil (dipaksa oleh constraint `check (username = lower(username))`).

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
│   │   ├── guard.ts            # Cek role bendahara (keamanan mutation)
│   │   ├── members.ts
│   │   ├── transactions.ts
│   │   ├── iurans.ts
│   │   ├── settings.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client (client components)
│   │   │   ├── server.ts       # Server client (server actions)
│   │   │   └── proxy.ts        # Auth guard + redirect role walikelas
│   │   ├── session.ts          # Ambil username + role pemakai
│   │   ├── queries.ts          # Helper fetch data (client-side)
│   │   ├── cloudinary.ts       # Upload + kompresi gambar
│   │   ├── types.ts            # Tipe antarmuka tabel
│   │   └── utils.ts            # Format uang, tanggal, dll.
│   ├── components/ui/          # Komponen UI (termasuk BottomNav)
│   ├── proxy.ts                # Middleware (Next 16 → proxy)
├── supabase/
│   ├── schema.sql              # Skema database + seed (versi terbaru)
│   └── migration-username-role.sql  # Migrasi username login + role
```

## Deployment ke Vercel

1. Push repo ke GitHub.
2. Di [Vercel](https://vercel.com), buat proyek baru dan impor repo.
3. Tambahkan environment variables di dashboard Vercel (sama dengan `.env.local`).
4. Deploy.

## Lisensi

Proyek ini dibuat untuk keperluan pendidikan.