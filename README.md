# Ruang LT-1 Islamiyah

Pratinjau web untuk pengelolaan Lomba Tingkat 1 Pramuka Islamiyah. Aplikasi
menggunakan Next.js App Router, React, TypeScript, dan Lucide Icons.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Periksa aplikasi produksi dengan `npm run build`
dan jalankan hasilnya memakai `npm run start`.

## Menghubungkan Supabase

1. Salin `.env.example` menjadi `.env.local`, lalu isi Project URL dan anon/publishable
   key dari pengaturan API proyek Supabase:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

   Jangan masukkan password database atau service-role key ke variabel `NEXT_PUBLIC_*`.
   `.env.local` diabaikan Git.
2. Jalankan isi
   [`supabase/migrations/20261031000000_initial_schema.sql`](./supabase/migrations/20261031000000_initial_schema.sql)
   melalui Supabase SQL Editor. Migration membuat skema, trigger profil otomatis,
   kebijakan RLS, dan fungsi verifikasi sertifikat tanpa mengisi data demo.
3. Jalankan migration
   [`supabase/migrations/20261101011304_username_login_ids.sql`](./supabase/migrations/20261101011304_username_login_ids.sql)
   setelah skema awal. Migration menambahkan ID pengguna unik untuk login.
4. Pendaftaran mandiri di website dinonaktifkan. Login menggunakan ID pengguna
   dan kata sandi; alamat email internal Supabase tidak perlu diketahui pengguna.
   Untuk membuat empat akun yang diminta, tambahkan key admin Supabase privat ke
   `.env.local` (jangan gunakan prefix `NEXT_PUBLIC_`):

   ```env
   SUPABASE_SECRET_KEY=<secret-key>
   ```

   Key juga dapat diberikan lewat `SUPABASE_SERVICE_ROLE_KEY`. Jika Regu Pompom
   belum ada dan database memiliki beberapa pangkalan, isi `POMPOM_SCHOOL_ID`
   dengan ID pangkalan Adellia. Jika belum ada pangkalan, skrip tetap membuat
   akun tetapi menunda pembuatan regu sampai pangkalan yang benar tersedia.
   Jalankan:

   ```bash
   npm run provision:sample-accounts
   ```

   Skrip membuat/menyelaraskan akun berikut: `ahmad.nidhomulhaq` (operator),
   `mario.jajaja` (panitia), `julio.cesar` (juri), dan `adellia.putri` (peserta).
   Regu Pompom dibuat sebagai regu putri jika belum ada dan Adellia dimasukkan ke
   regu tersebut. Kata sandi acak hanya ditulis ke CSV lokal yang diabaikan Git;
   bagikan lewat kanal privat dan simpan dengan aman. Reset kata sandi akun
   dilakukan pengelola melalui Supabase Authentication jika diperlukan.
   Hapus key admin dari `.env.local` setelah provisioning selesai. Jangan pernah
   menambahkannya ke Vercel Environment Variables atau browser. Setelah membuat
   pangkalan Adellia di `/operator/schools`, isi `POMPOM_SCHOOL_ID` di `.env.local`
   dengan UUID pangkalan tersebut lalu jalankan skrip kembali untuk membuat/
   memetakan Regu Pompom.
5. Setelah data dan nilai siap, atur publikasi papan skor serta sertifikat di
   `/operator/publication`. Halaman `/verify/[userId]` hanya mengembalikan data
   sertifikat yang diterbitkan dan memiliki nilai disahkan untuk setiap mata lomba.

Supabase wajib dikonfigurasi untuk membuka aplikasi. Tanpa URL dan publishable
key, semua halaman kegiatan terkunci dan data demo tidak dimuat. Rute `/register`
selalu dialihkan ke halaman login; akun hanya dibuat oleh pengelola. Key lama
`NEXT_PUBLIC_SUPABASE_ANON_KEY` masih didukung untuk kompatibilitas, tetapi key
publishable disarankan. Jangan memakai connection string PostgreSQL atau
service-role/secret key pada variabel `NEXT_PUBLIC_*`. ID pengguna login dipetakan
ke identitas email internal `accounts.lt1.invalid` dan tidak memerlukan email pribadi.

## Deploy ke Vercel

### 1. Siapkan GitHub

Pastikan versi yang akan dirilis sudah ada di branch `main` pada GitHub. Jika ada
perubahan lokal, commit dan push terlebih dahulu:

```bash
git add .
git commit -m "Prepare LT-1 deployment"
git push origin main
```

### 2. Import project

1. Masuk ke [Vercel](https://vercel.com/) dan pilih **Add New → Project**.
2. Hubungkan GitHub jika diminta, lalu import repository
   `Nidhomulhaq/Platform-LT1-2026`.
3. Biarkan Vercel mendeteksi **Next.js**. Gunakan root directory `./`, install
   command `npm install`, dan build command `npm run build`.
4. Pilih branch `main`, lalu pilih **Deploy**. Tidak perlu menambahkan konfigurasi
   `vercel.json`.

### 3. Pilih mode aplikasi

- **Pratinjau saja:** deploy tanpa environment variable. Aplikasi menggunakan data
  contoh di browser (`localStorage`), bukan penyimpanan bersama. Jangan gunakan mode
  ini untuk akun atau data kegiatan sungguhan.
- **Terhubung ke Supabase:** jalankan migration dan siapkan akun operator seperti
  pada bagian Supabase di atas **sebelum** membuka akses produksi. Di project Vercel,
  buka **Settings → Environment Variables** dan tambahkan untuk **Production**:

  | Name | Value |
  | --- | --- |
  | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key dari Supabase (atau legacy anon key) |

  Jangan masukkan password database atau service-role key. Gunakan Supabase staging
  terpisah untuk deployment **Preview**; jangan arahkan preview publik ke database
  produksi kecuali memang diinginkan. Setelah mengubah environment variable, jalankan
  ulang deployment agar nilai baru digunakan.

### 4. Sambungkan URL aplikasi

Setelah deployment berhasil, buka **Settings → Domains** di Vercel untuk melihat
domain `*.vercel.app` atau menambahkan domain sendiri. Jika Supabase digunakan,
buka **Authentication → URL Configuration** pada proyek Supabase:

- Set **Site URL** ke URL production HTTPS Vercel atau domain sendiri.
- Tambahkan URL production ke **Redirect URLs**. Tambahkan URL preview hanya jika
  preview memang memakai proyek Supabase staging.

### 5. Periksa deployment

Buka URL production dan pastikan halaman login tampil. Jika Supabase belum
dikonfigurasi, halaman kegiatan akan terkunci. Setelah koneksi siap, uji login,
halaman operator, data kegiatan, dan `/verify/<user-id>`. Setiap push baru ke
`main` akan memicu deployment production; branch lain menghasilkan deployment
preview.

## Halaman aplikasi

- `/dashboard` — progres peserta, tugas, lencana, dan papan skor.
- `/dashboard/submit/[competitionId]` — pengumpulan tugas, termasuk CBT.
- `/leaderboard` — peringkat regu setelah dirilis operator.
- `/scan-task` — pemindai QR tugas dan masukan ID/tautan alternatif.
- `/score-recap` — rekap nilai per mata lomba dan regu.
- `/profile` — profil peserta dan tautan verifikasi sertifikat.
- `/juri` — simpan draf dan kirim nilai untuk ditinjau.
- `/panitia` — rilis tugas dan catat kehadiran regu.
- `/operator` — ringkasan kegiatan.
- `/operator/scores` — setujui nilai atau minta revisi.
- `/operator/teams`, `/operator/schools`, dan `/operator/competitions` — pengelolaan
  regu, pangkalan, dan mata lomba.
- `/operator/publication` — atur papan skor dan akses sertifikat.
- `/verify/[userId]` — pemeriksaan sertifikat terbit melalui Supabase atau pratinjau lokal.

Aplikasi memerlukan akun Supabase untuk membuka halaman kegiatan. Pembuatan akun
dan pemberian role dilakukan pengelola melalui Supabase; website tidak menyediakan
pendaftaran mandiri. Data operasional menggunakan kebijakan Row Level Security. Unggahan berkas
memerlukan konfigurasi storage terpisah. QR sertifikat menuju halaman verifikasi;
fingerprint tampilan bukan tanda tangan elektronik.
