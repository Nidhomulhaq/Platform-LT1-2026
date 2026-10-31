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
| **Operator Pusat** | `operator` | Super Admin. Mengelola data master (lomba, pos, akun, regu, data sekolah/pangkalan & penandatangan), memetakan akun individu ke regu, melakukan peninjauan & pengesahan nilai juri (*Approve/Revision*), merilis papan skor, serta mempublikasikan sertifikat. | 
| **Panitia** | `panitia` | Petugas Pos/Acara. Mengelola jalannya pos/kegiatan, memberikan instruksi tugas, memverifikasi kehadiran regu di pos, dan memantau status pengiriman tugas. | 
| **Juri** | `juri` | Penilai. Menginput nilai regu berdasarkan rubrik penugasan pos, menyimpan *draft* nilai, dan mengirimkan nilai ke Operator Pusat untuk diverifikasi. | 
| **Peserta** | `peserta` | Peserta Lomba (Anggota/Pinru). Mengerjakan tugas (CBT / Unggah Media), melihat status pengerjaan, mengoleksi lencana digital (*badge*) per mata lomba, serta mengunduh sertifikat berformat gambar. | 

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
                  |   Peserta Registrasi Akun Mandiri |
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
                  | Panitia Rilis Tugas / Pos Giat    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | Peserta Submit Tugas (CBT/Upload) |
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
 Status: Approved (Locked)                       Status: Draft / Revision
  (Masuk Rekap & Leaderboard)                      (Dikembalikan ke Juri)
            |
            v
 +------------------------------------------------------------+
 |  Dynamic Certificate Generation (School-Specific Signers) |
 |  & QR Code Digital Signature Verification Route Enabled    |
 +------------------------------------------------------------+

```

## 5. Skrip DDL Basis Data PostgreSQL (Supabase Migration Ready)

Salin skrip SQL berikut langsung ke **Supabase SQL Editor**:

```
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE user_role AS ENUM ('operator', 'panitia', 'juri', 'peserta');
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
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
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

* **Section 2 - Daftar Mata Lomba & Status**: Tabel/Kartu status pengerjaan tugas (`Belum Dikerjakan`, `Menunggu Penilaian`, `Selesai`).

* **Section 3 - Tombol Unduh Sertifikat**: Aktif jika seluruh mata lomba telah berstatus `approved` oleh Operator.

### B. Dashboard Juri (`/juri`)

* **Filter Pos/Mata Lomba**: Dropdown daftar mata lomba yang diampu.

* **Tabel Input Nilai**: List Regu Peserta + Form Input Nilai (0-100) + Catatan Evaluasi.

* **Aksi**: Tombol `Simpan Draft` dan `Kirim ke Operator`.

### C. Dashboard Operator Pusat (`/operator`)

* **Statistik Cepat**: Total Peserta, Total Regu, Total Lomba, Status Verifikasi Nilai.

* **Manajemen Pangkalan/Sekolah (`/operator/schools`)**: Pengaturan data MI Ma'arif NU Islamiyah & MTs Ma'arif 28 Islamiyah beserta nama Kepala Madrasah dan Pembina untuk tanda tangan sertifikat.

* **Manajemen Regu**: Fitur *Multi-Select Checkbox* untuk mengelompokkan akun individu ke dalam regu dan pangkalan.

* **Peninjauan Nilai (Review Pipeline)**:

  * Filter status (`Pending Review`, `Approved`, `Needs Revision`).

  * Modal konfirmasi: `Setujui Nilai` atau `Minta Revisi`.

* **Papan Skor & Sertifikat**: Switch ON/OFF untuk rilis *Leaderboard* publik & *Batch Certificate Access*.

### D. Halaman Publik Verifikasi Tanda Tangan Digital (`/verify/[userId]`)

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
3. Eksekusi skrip SQL dari Bagian 5 PRD ini pada Supabase SQL Editor (membuat tabel schools, profiles, teams, scores, dll).

[Langkah 2: Autentikasi & Manajemen Master Data]
1. Buat halaman Login & Register (/login, /register).
2. Terapkan Middleware Next.js untuk proteksi rute berbasis role (operator, juri, panitia, peserta).
3. Buat CRUD Master Sekolah/Pangkalan (/operator/schools) untuk mengisi data MI Ma'arif NU Islamiyah & MTs Ma'arif 28 Islamiyah (termasuk nama Kepala Madrasah & Pembina).
4. Buat modul Operator (/operator/teams) untuk memetakan user & regu ke pangkalan sekolah.

[Langkah 3: Modul Penugasan & Penilaian]
1. Buat UI Submit Tugas Peserta (/dashboard/submit/[competitionId]).
2. Buat UI Input Nilai Juri (/juri/scoring).
3. Buat UI Verifikasi Operator (/operator/scores) dengan tombol Approve dan Request Revision.

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