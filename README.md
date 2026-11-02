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
4. Jalankan migration
   [`supabase/migrations/20261102014824_enforce_role_permissions.sql`](./supabase/migrations/20261102014824_enforce_role_permissions.sql)
   setelah dua migration sebelumnya. Migration ini menambahkan penugasan Panitia,
   status akun aktif, penetapan Pinru, dan pembatasan akses berbasis role melalui RLS.
5. Jalankan migration
   [`supabase/migrations/20261102050000_participant_school_assignment.sql`](./supabase/migrations/20261102050000_participant_school_assignment.sql)
   untuk memindahkan relasi pangkalan dari regu ke profil peserta. Migration ini
   mempertahankan pangkalan peserta yang sudah ada dan mengubah verifikasi sertifikat.
6. Pendaftaran mandiri di website dinonaktifkan. Login menggunakan ID pengguna
   dan kata sandi; alamat email internal Supabase tidak perlu diketahui pengguna.
   Operator dapat membuat atau menghapus akun, mengubah role/regu, menonaktifkan
   akun, memulai reset kata sandi, memfilter akun berdasarkan role, dan mengunduh
   XLS dengan sheet terpisah per role dari `/operator/accounts`. Karena password
   lama tidak bisa dibaca, proses unduh membuat password baru untuk semua akun;
   file memuat nama lengkap, ID
   pengguna, password baru, regu, dan Pinru untuk peserta. Simpan file dengan aman
   dan bagikan password lewat kanal privat. Untuk mengaktifkan fitur
   tersebut, tambahkan key admin Supabase privat ke environment server (jangan
   gunakan prefix `NEXT_PUBLIC_`):

   ```env
   SUPABASE_SECRET_KEY=<secret-key>
   ```

   Key juga dapat diberikan lewat `SUPABASE_SERVICE_ROLE_KEY`. Atur key ini hanya
   pada server atau environment Production/Preview tepercaya di Vercel; jangan
   kirimkan ke browser atau commit ke Git. Pangkalan Adellia disimpan pada profil
   peserta, bukan regu. Jika database memiliki beberapa pangkalan dan profil
   Adellia belum memiliki pangkalan, isi `POMPOM_SCHOOL_ID` dengan ID pangkalan
   Adellia sebelum menjalankan skrip. Buat pangkalan terlebih dahulu jika belum ada.
   Jalankan:

   ```bash
   npm run provision:sample-accounts
   ```

   Skrip membuat/menyelaraskan akun berikut: `ahmad.nidhomulhaq` (operator),
   `mario.jajaja` (panitia), `julio.cesar` (juri), dan `adellia.putri` (peserta).
   Regu Pompom dibuat sebagai regu putri jika belum ada dan Adellia dimasukkan ke
   regu tersebut. Kata sandi acak hanya ditulis ke CSV lokal yang diabaikan Git;
   bagikan lewat kanal privat dan simpan dengan aman. Reset kata sandi juga dapat
   dimulai Operator melalui manajemen akun. Setelah membuat pangkalan Adellia di
   `/operator/schools`, isi `POMPOM_SCHOOL_ID` di `.env.local` dengan UUID
   pangkalan tersebut lalu jalankan skrip kembali untuk membuat/memetakan Regu
   Pompom dan menyimpan pangkalan pada profil Adellia.
7. Setelah data dan nilai siap, atur publikasi papan skor serta sertifikat di
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
  | `SUPABASE_SECRET_KEY` | Opsional; secret key server untuk fitur manajemen akun Operator |

  Jangan masukkan password database. Key admin hanya boleh menjadi environment
  server privat dan tidak boleh memakai prefix `NEXT_PUBLIC_`. Gunakan Supabase
  staging terpisah untuk deployment **Preview**; jangan arahkan preview publik ke
  database produksi kecuali memang diinginkan. Setelah mengubah environment
  variable, jalankan ulang deployment agar nilai baru digunakan.

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
- `/operator/accounts` — buat akun, atur role/regu dan Pinru, nonaktifkan akun,
  atau mulai reset kata sandi.
- `/operator/scores` — setujui nilai atau minta revisi.
- `/operator/teams`, `/operator/schools`, dan `/operator/competitions` — pengelolaan
  regu, pangkalan, dan mata lomba.
- `/operator/publication` — atur papan skor dan akses sertifikat.
- `/verify/[userId]` — pemeriksaan sertifikat terbit melalui Supabase atau pratinjau lokal.

Aplikasi memerlukan akun Supabase untuk membuka halaman kegiatan. Website tidak
menyediakan pendaftaran mandiri; Operator mengelola akun melalui dashboard.
Data operasional menggunakan kebijakan Row Level Security dan migration role
terbaru harus sudah diterapkan sebelum penggunaan. Unggahan berkas memerlukan
konfigurasi storage terpisah. QR sertifikat menuju halaman verifikasi; fingerprint
tampilan bukan tanda tangan elektronik.
