# Product Requirement Document (PRD) & Technical Specification

## Platform Sistem Manajemen & Penilaian Lomba Tingkat 1 (LT-1) Pramuka Islamiyah

## 1. Ringkasan Proyek (Executive Summary)

Platform ini adalah sistem berbasis *web cloud* yang dirancang untuk mengelola, memantau, mendigitalisasi penilaian, serta menerbitkan sertifikat dan lencana secara otomatis pada kegiatan Lomba Tingkat 1 (LT-1) Pramuka Islamiyah.

### Target Operasional

* **Biaya Infrastruktur**: Rp 0 (100% Menggunakan Layanan *Free Tier*).

* **Arsitektur Utama**: Cloud-based Web Application (Serverless & Backend-as-a-Service).

* **Fokus Utama**: Transparansi nilai, akurasi rekapitulasi, penghematan waktu panitia, validasi sertifikat digital berbasis QR Code, dan apresiasi berbasis gamifikasi untuk peserta.

## 2. Pemetaan Peran & Hak Akses (User Roles & Permissions)

| Peran | ENUM Role | Deskripsi Hak Akses & Tanggung Jawab | 
| ----- | ----- | ----- | 
| **Operator Pusat** | `operator` | Mengelola akun (membuat, menghapus, menonaktifkan, menetapkan role, memetakan anggota ke regu, memfilter daftar menurut role, mengunduh daftar XLS per role, dan memulai reset kata sandi melalui alur aman), data pangkalan dan regu, mata lomba, isi instruksi, serta penugasan Panitia dan Juri. Meninjau nilai dengan menyetujui atau meminta revisi, menerbitkan leaderboard, dan mempublikasikan sertifikat. Pengelolaan akun harus menggunakan backend tepercaya; secret key Supabase tidak boleh dikirim ke peramban. |
| **Panitia** | `panitia` | Pada pos/mata lomba yang ditugaskan, membuka atau menyampaikan instruksi yang disiapkan Operator, mencatat kehadiran, dan memantau status pengumpulan tugas. |
| **Juri** | `juri` | Pada mata lomba yang ditugaskan, memberi nilai 0–100 pada setiap kriteria, menyimpan draf, memberi catatan, dan mengirim akumulasi nilainya kepada Operator untuk ditinjau. Juri hanya melihat penilaian miliknya dan dapat memperbaruinya sampai disetujui. |
| **Peserta** | `peserta` | Melihat tugas dan progres regu, mengoleksi lencana, melihat nilai regu setelah disetujui, serta mengakses sertifikat setelah diterbitkan. Leaderboard hanya terlihat setelah dirilis Operator. Dapat memperbarui profil sendiri dan memilih pangkalan dari daftar yang tersedia, tetapi tidak dapat mengubah role atau keanggotaan regu. Hanya Pinru yang dapat mengirim atau memperbarui tugas atas nama regu; anggota lain hanya melihat status. |
| **Pendamping Regu** | `pendamping_regu` | Dibuat dan ditugaskan Operator ke satu regu serta pangkalan. Hanya pada regu tersebut, mendaftarkan peserta dengan nama lengkap; sistem membuat ID login dan kata sandi sementara untuk tiap peserta. Pendamping membagikan kredensial secara privat dan tidak dapat mengakses regu lain atau mengubah data peserta setelah akun dibuat. |

### Aturan Otorisasi yang Berlaku

* Penugasan membatasi akses Panitia ke pos/mata lomba dan akses Juri ke mata lomba yang ditugaskan. Operator mengelola penugasan tersebut.
* Panitia tidak dapat mengubah isi instruksi, mengelola akun atau data master, menginput nilai, maupun mengesahkan nilai.
* Juri tidak dapat mengesahkan nilai atau menerbitkan leaderboard/sertifikat. Setelah Operator menyetujui nilai, nilai terkunci bagi Juri.
* Pendamping Regu hanya dapat melihat satu regu yang ditugaskan Operator dan mendaftarkan akun Peserta ke regu tersebut. Pangkalan peserta mengikuti pangkalan pada akun Pendamping. Pendamping tidak dapat membuat/menetapkan regu, membuat akun non-Peserta, atau mengakses regu lain.
* Nilai berstatus `approved` dapat dilihat anggota regu sebelum leaderboard dipublikasikan. Publikasi leaderboard dan sertifikat tetap merupakan kontrol terpisah milik Operator.
* Hak akses wajib ditegakkan pada backend dan kebijakan Row Level Security (RLS), bukan hanya dengan menyembunyikan navigasi atau tombol di UI.

## 3. Arsitektur & Spesifikasi Teknologi (Tech Stack Rp 0)

```
[ Frontend & UI Framework ]  : Next.js (App Router) + Tailwind CSS + Lucide Icons + Shadcn UI
[ Backend & Database ]       : Supabase (PostgreSQL Database, Auth, & Row Level Security)
[ Berkas Storage ]           : Supabase Storage + External Link Embed (YouTube Unlisted / Google Drive)
[ Image Rendering Engine ]   : Node.js Serverless Canvas (@napi-rs/canvas atau Satori)
[ Signature & Verification ] : Dynamic QR Code Electronic Signature & Public Verification Route
[ Hosting & Deployment ]     : Vercel Hobby Tier (SSL Gratis, Bandwidth 100GB/bulan)

```

### Strategi Penghematan Kuota Storage (Cloud Efficiency)

1. **Pengumpulan Tugas Berkas Besar (Video/Dokumen)**: Peserta menyetor tautan (*link*) YouTube (mode *Unlisted*) atau Google Drive.

2. **Pengumpulan Berkas Ringkas (Foto)**: Batas kompresi otomatis di sisi peramban pengguna hingga maksimal 2 MB per file.

3. **Generasi Sertifikat & Lencana**: Dibuat secara *on-the-fly* melalui *serverless function* saat tombol diunduh ditekan, tanpa disimpan permanen sebagai file di basis data.

## 4. Alur Kerja Utama Sistem (Core Workflows)

```
                  +-----------------------------------+
                  | Operator Buat Akun & Tetapkan Role |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Operator Pemetaan Akun -> Regu    |
                  |  & Penentuan Pangkalan (MI/MTs)   |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Operator Siapkan Instruksi Tugas  |
                  +-----------------+-----------------+
                                    |
                                    v
                  | Panitia Rilis pada Penugasan      |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Pinru Kirim Tugas (CBT/Upload)       |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Juri Penilaian -> Input Skor      |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Status: Pending Review Operator   |
                  +-----------------+-----------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
  [ Operator Approve ]                            [ Operator Revision ]
            |                                               |
            v                                               v
 Status: Approved (Locked)                       Status: Revision Needed
  (Nilai Regu Terlihat)                            (Juri Perbarui & Kirim Ulang)
            |
            v
 +------------------------------------------------------------+
 |  Dynamic Certificate Generation (School-Specific Signers) |
 |  & QR Code Digital Signature Verification Route Enabled    |
 +------------------------------------------------------------+

```

## 5. Persyaratan Skema & Otorisasi Basis Data

Migration dalam folder [`supabase/migrations`](./supabase/migrations) adalah sumber skema yang dapat dieksekusi dan lebih otoritatif daripada contoh DDL lama di bawah. **Jangan menyalin atau menjalankan DDL lama ini**; setiap perubahan skema harus dibuat sebagai migration baru.

Skema dan kebijakan akses wajib mendukung hal-hal berikut:

* Penugasan Panitia per pos/mata lomba yang dikelola Operator. Panitia hanya boleh merilis instruksi, mencatat kehadiran, dan melihat pengumpulan pada penugasan tersebut.
* Penugasan Juri per mata lomba yang dikelola Operator. Juri hanya boleh membaca, membuat, dan memperbarui nilai untuk mata lomba yang ditugaskan.
* Otorisasi pengiriman tugas per regu yang memastikan hanya anggota dengan `is_pinru = true` yang dapat membuat atau memperbarui kiriman. Anggota regu lain tetap dapat membaca statusnya.
* Juri dapat menyimpan/mengirim nilai sesuai status `draft`, `pending_review`, atau `revision_needed`; setelah `approved`, hanya Operator yang dapat mengubah nilai atau status.
* Anggota regu dapat membaca nilai `approved` regunya tanpa publikasi leaderboard. Akses publik dan sertifikat tetap mengikuti kontrol publikasi tersendiri.
* Pembuatan, penonaktifan, dan perubahan role akun hanya dilakukan Operator melalui backend tepercaya dengan secret Supabase privat. Secret/service-role key tidak boleh diekspos di kode klien atau variabel `NEXT_PUBLIC_*`.
* Pengujian RLS harus mencakup akses yang diizinkan dan ditolak untuk setiap role, termasuk akses lintas penugasan, lintas regu, perubahan role sendiri, submit non-Pinru, dan perubahan nilai setelah persetujuan.

### Status Penerapan Hak Akses

Implementasi aplikasi dan migration
[`20261102014824_enforce_role_permissions.sql`](./supabase/migrations/20261102014824_enforce_role_permissions.sql)
telah menambahkan penugasan Panitia, pemeriksaan akun aktif, pembatasan operasi Panitia/Juri,
pengiriman tugas khusus Pinru, alur perubahan nilai Juri sebelum persetujuan, serta visibilitas
nilai yang disetujui untuk regu. Manajemen akun Operator berjalan melalui endpoint server dan
membutuhkan secret Supabase privat pada environment server.

Role Pendamping Regu ditambahkan melalui migration
[`20261103015923_add_pendamping_regu_role.sql`](./supabase/migrations/20261103015923_add_pendamping_regu_role.sql)
dan
[`20261103015929_assign_pendamping_to_teams.sql`](./supabase/migrations/20261103015929_assign_pendamping_to_teams.sql).
Operator menetapkan satu regu dan pangkalan untuk tiap pendamping; pendamping membuat akun
peserta melalui endpoint server, dengan kredensial sementara yang ditampilkan satu kali.

Migration otorisasi dan role terbaru **belum diterapkan atau diuji pada database dalam sesi
implementasi** karena database Supabase lokal/staging tidak tersedia. Sebelum dipakai pada
kegiatan sungguhan, jalankan seluruh migration berurutan dan uji akses RLS positif/negatif untuk
setiap role, termasuk akses lintas penugasan, lintas regu, submit non-Pinru, pendaftaran peserta
oleh pendamping yang tidak ditugaskan, penonaktifan akun, serta perubahan nilai setelah persetujuan.
Sampai validasi tersebut selesai, jangan menganggap aturan database sudah aktif pada proyek
Supabase.

### DDL Versi Lama (Referensi Non-Eksekusi)

```
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE user_role AS ENUM ('operator', 'panitia', 'juri', 'peserta', 'pendamping_regu');
CREATE TYPE team_category AS ENUM ('putra', 'putri');
CREATE TYPE task_type AS ENUM ('cbt', 'upload', 'live');
CREATE TYPE score_status AS ENUM ('draft', 'pending_review', 'approved', 'revision_needed');

-- 3. SCHOOLS / PANGKALAN TABLE (Master Data Sekolah & Penandatangan)
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name VARCHAR(150) NOT NULL, -- Contoh: 'MI Ma'arif NU Islamiyah', 'MTs Ma'arif 28 Islamiyah'
    headmaster_name VARCHAR(150) NOT NULL, -- Nama Kepala Madrasah
    headmaster_title VARCHAR(100) DEFAULT 'Kepala Madrasah / Ka Mabigus',
    pembina_name VARCHAR(150) NOT NULL, -- Nama Pembina Pramuka
    pembina_title VARCHAR(100) DEFAULT 'Pembina Pramuka',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'peserta',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    phone_number VARCHAR(30),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TEAMS TABLE
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name VARCHAR(100) NOT NULL,
    category team_category NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TEAM MEMBERS TABLE (Mapping Users to Teams)
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_pinru BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- One user can only belong to one team
);

-- 7. COMPETITIONS TABLE
CREATE TABLE public.competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    task_type task_type NOT NULL,
    max_score NUMERIC(5,2) DEFAULT 100.00,
    badge_icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. SUBMISSIONS TABLE (For Upload/Link Tasks)
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    submission_url TEXT,
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competition_id, team_id)
);

-- 9. SCORES TABLE
CREATE TABLE public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    juri_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    score_value NUMERIC(5,2) DEFAULT 0.00,
    status score_status DEFAULT 'draft',
    feedback_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competition_id, team_id)
);

-- 10. USER BADGES TABLE (Gamification Output)
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    score_achieved NUMERIC(5,2) NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, competition_id)
);

-- 11. TRIGGER TO AUTO CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Peserta Baru'),
        'peserta'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Public Read Schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Public Read Active Competitions" ON public.competitions FOR SELECT USING (is_active = true);
CREATE POLICY "Users Can View Own Profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users Can Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

```

## 6. Arsitektur Antarmuka (UI/UX Flow & Wireframe Plan)

### A. Dashboard Peserta (`/dashboard`)

* **Header**: Identitas Peserta, Nama Regu, Pangkalan/Sekolah (MI/MTs), Kategori (PA/PI).

* **Section 1 - Lemari Lencana (Badge Showcase)**: Grid ikon lencana. Lencana yang sudah diraih berwarna terang dengan batas skor; yang belum diraih berwarna abu-abu (*grayscale*).

* **Section 2 - Daftar Mata Lomba & Status**: Tabel/Kartu status pengerjaan tugas (`Belum Dikerjakan`, `Menunggu Penilaian`, `Selesai`). Nilai regu ditampilkan setelah disetujui; leaderboard mengikuti publikasi Operator.

* **Hak kirim tugas**: Pinru dapat mengirim dan memperbarui tugas regu. Anggota regu lain hanya dapat melihat tugas dan statusnya.

* **Section 3 - Tombol Unduh Sertifikat**: Aktif jika seluruh mata lomba telah berstatus `approved` oleh Operator.

### B. Dashboard Juri (`/juri`)

* **Filter Pos/Mata Lomba**: Hanya menampilkan mata lomba yang ditugaskan kepada Juri.

* **Tabel Input Nilai**: List Regu Peserta + Form Input Nilai (0-100) + Catatan Evaluasi.

* **Aksi**: Tombol `Simpan Draft` dan `Kirim ke Operator`.

* **Perubahan nilai**: Juri dapat memperbarui nilai selama belum disetujui. Nilai yang dikirim ulang masuk kembali ke `Pending Review`; nilai `Approved` terkunci bagi Juri.

### C. Dashboard Panitia (`/panitia`)

* **Cakupan penugasan**: Hanya menampilkan pos/mata lomba yang ditugaskan kepada Panitia.

* **Instruksi**: Panitia dapat membuka atau menyampaikan instruksi yang disiapkan Operator, tetapi tidak dapat mengubah isinya.

* **Operasional**: Mencatat kehadiran regu pada penugasan dan memantau status pengumpulan tugas. Panitia tidak memiliki aksi pengelolaan akun, data master, atau nilai.

### D. Dashboard Operator Pusat (`/operator`)

* **Statistik Cepat**: Total Peserta, Total Regu, Total Lomba, Status Verifikasi Nilai.

* **Manajemen Akun**: Membuat/menghapus/menonaktifkan akun, menetapkan role, memetakan anggota ke regu, memfilter daftar menurut role, mengunduh XLS dengan sheet per role yang berisi nama lengkap, ID pengguna, password baru, regu, dan Pinru untuk peserta. Unduhan mereset password seluruh akun dan memerlukan konfirmasi eksplisit karena password lama tersimpan sebagai hash dan tidak dapat ditampilkan kembali; file harus dibagikan secara privat.

* **Manajemen Pangkalan/Sekolah (`/operator/schools`)**: Pengaturan data MI Ma'arif NU Islamiyah & MTs Ma'arif 28 Islamiyah beserta nama Kepala Madrasah dan Pembina untuk tanda tangan sertifikat.

* **Manajemen Regu & Peserta**: Menambahkan regu tanpa pangkalan, membuat akun peserta dengan pangkalan pada profil peserta, memetakan peserta ke regu, dan menetapkan Pinru untuk setiap regu.

* **Manajemen Penugasan**: Menetapkan Panitia pada pos/mata lomba dan Juri pada mata lomba. Perubahan penugasan segera membatasi data yang terlihat dan aksi yang dapat dilakukan.

* **Manajemen Lomba & Instruksi**: Operator mengelola mata lomba, kriteria penilaian, dan isi instruksi tugas; Panitia hanya merilis/menyampaikan instruksi yang telah disiapkan. Setiap kriteria dinilai 0–100.

* **Penilaian Juri**: Juri memberi nilai 0–100 pada setiap kriteria. Nilai tiap juri adalah akumulasi kriterianya; akumulasi nilai juri yang disetujui menjadi nilai mata lomba regu. Operator dapat meninjau rincian nilai setiap juri dan kriterianya.

* **Peninjauan Nilai (Review Pipeline)**:

  * Filter status (`Pending Review`, `Approved`, `Needs Revision`).

  * Modal konfirmasi: `Setujui Nilai` atau `Minta Revisi`.

* **Papan Skor & Sertifikat**: Switch ON/OFF untuk rilis *Leaderboard* publik & *Batch Certificate Access*.

### E. Halaman Publik Verifikasi Tanda Tangan Digital (`/verify/[userId]`)

* **Akses**: Terbuka umum ketika siapapun memindai (*scan*) QR Code tanda tangan digital pada sertifikat.

* **Tampilan**:

  * Status Sertifikat: `VALID & TERVERIFIKASI TERDAFTAR DI SISTEM LT-1`.

  * Detail Pemilik: Nama Peserta, Pangkalan (MI/MTs), Nama Regu, Total Skor.

  * Metadata Tanda Tangan Elektronik: Nama Kepala Madrasah & Pembina Pramuka bersangkutan, Tanggal Terbit, serta Hash Verifikasi.

## 7. Generator Sertifikat Digital & Tanda Tangan QR Code

API Route Serverless: `/api/certificate/download?userId=[USER_ID]`

### Layout Canvas Potret (1080 x 1920 px)

1. **Header (0 - 400px)**: Logo Pramuka, Logo LP Ma'arif NU, Judul "SERTIFIKAT PENGHARGAAN LT-1".

2. **Biodata (400 - 750px)**:

   * Nama Peserta (Bold, Font Size 48px).

   * Pangkalan / Sekolah (`profiles.schools.school_name`).

   * Nama Regu & Kategori.

3. **Tabel Nilai (750 - 1350px)**:

   * Loop data dari tabel `scores` & `competitions` untuk regu terkait.

   * Baris 1..N: Nama Mata Lomba | Nilai Regu.

   * Baris Akhir: Total Skor & Rata-rata.

4. **Area Tanda Tangan Digital Berbasis QR Code (1350 - 1850px)**:

   * **Kolom Kiri (Pembina Pramuka)**:

     * Label: *Pembina Pramuka \[Nama Sekolah\]*

     * Gambar QR Code 1 (Tanda Tangan Digital Elektronik Pembina).

     * Nama Terang Pembina (`schools.pembina_name`).

   * **Kolom Kanan (Kepala Madrasah)**:

     * Label: *Kepala Madrasah / Ka Mabigus \[Nama Sekolah\]*

     * Gambar QR Code 2 (Tanda Tangan Digital Elektronik Kamabigus).

     * Nama Terang Kepala Madrasah (`schools.headmaster_name`).

   * **Catatan Kaki QR Code**: Tautan QR Code mengarah ke URL Publik Verifikasi `/verify/[userId]` untuk memastikan keaslian dokumen secara *real-time*.

## 8. Rencana Eksekusi Langkah Demi Langkah untuk AI Agent

Instruksi untuk AI Coding Agent (Cursor / v0 / Claude Dev / Windsurf):

```
[Langkah 1: Setup Proyek & Database]
1. Inisialisasi Next.js 14+ (App Router) dengan Tailwind CSS dan Shadcn UI.
2. Hubungkan ke Supabase menggunakan @supabase/ssr package.
3. Terapkan migration dalam `supabase/migrations` sesuai urutan; jangan menjalankan DDL lama yang disertakan sebagai referensi di Bagian 5.

[Langkah 2: Autentikasi, Akun & Manajemen Master Data]
1. Buat halaman Login. Pendaftaran mandiri tidak tersedia; Operator membuat dan mengelola akun melalui backend tepercaya.
2. Terapkan proteksi rute dan otorisasi server/database berbasis role (operator, juri, panitia, peserta); middleware/UI bukan satu-satunya lapisan keamanan.
3. Buat manajemen akun Operator untuk membuat/menonaktifkan akun, menetapkan role, dan memulai reset kata sandi secara aman, tanpa mengekspos secret key Supabase.
4. Buat CRUD Master Sekolah/Pangkalan (/operator/schools) untuk mengisi data MI Ma'arif NU Islamiyah & MTs Ma'arif 28 Islamiyah (termasuk nama Kepala Madrasah & Pembina).
5. Buat modul Operator (/operator/teams) untuk memetakan user dan Pinru ke regu serta pangkalan sekolah.
6. Buat manajemen penugasan Panitia per pos/mata lomba dan Juri per mata lomba; tegakkan cakupan penugasan pada kebijakan RLS.

[Langkah 3: Modul Penugasan & Penilaian]
1. Batasi submit/update tugas regu (/dashboard/submit/[competitionId]) untuk Pinru; anggota lain hanya dapat membaca status.
2. Buat UI Panitia untuk membuka instruksi Operator, mencatat kehadiran, dan memantau pengumpulan hanya pada penugasan yang dimiliki.
3. Buat UI Input Nilai Juri (/juri/scoring) yang hanya menampilkan penugasan Juri tersebut.
4. Izinkan Juri memperbarui nilai sebelum disetujui; pengiriman ulang masuk `pending_review`; nilai `approved` terkunci untuk Juri.
5. Buat UI Verifikasi Operator (/operator/scores) dengan tombol Approve dan Request Revision. Nilai `approved` dapat dibaca anggota regu tanpa menunggu publikasi leaderboard.
6. Tambahkan pengujian RLS positif dan negatif untuk seluruh role, batas penugasan, Pinru, dan perubahan nilai pascapersetujuan.

[Langkah 4: Dynamic Certificate, Digital Signature QR & Verification Route]
1. Buat Halaman Publik Verifikasi Sertifikat (/verify/[userId]) untuk menampilkan keabsahan sertifikat saat QR Code di-scan.
2. Buat API Route (/api/certificate) menggunakan @napi-rs/canvas atau Satori untuk me-render gambar sertifikat potret secara dinamis:
   - Ambil data sekolah peserta (MI/MTs).
   - Generate QR Code tanda tangan digital yang mengarah ke URL /verify/[userId].
   - Tempelkan QR Code & Nama Terang Kepala Madrasah & Pembina di bagian bawah sertifikat.
3. Deploy proyek ke Vercel dan hubungkan domain/environment variables Supabase.

```

## 9. Status Dokumen

* \[x\] Pemetaan Alur & Peran Sistem

* \[x\] Pemilihan Tech Stack Gratis (Supabase + Vercel)

* \[x\] Konsep Gamifikasi Lencana & Sertifikat Potret

* \[x\] Tanda Tangan Digital Berbasis QR Code & Penandatangan Dinamis Per Sekolah (MI / MTs)

* \[x\] Halaman Publik Verifikasi Keaslian Dokumen Elektronik (`/verify/[userId]`)

* \[x\] Detail Rancangan Basis Data PostgreSQL (DDL / SQL Script dengan Tabel `schools`)

* \[x\] Perancangan Wireframe & Layout Antarmuka (UI/UX Flow)

* \[x\] Panduan Implementasi Kode (Step-by-Step Development Roadmap)