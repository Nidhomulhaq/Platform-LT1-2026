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

## Halaman pratinjau

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
- `/operator/teams` dan `/operator/schools` — pemetaan peserta serta data pangkalan.
- `/operator/publication` — atur papan skor dan akses sertifikat.
- `/verify/[userId]` — halaman verifikasi pratinjau.

Data contoh dan perubahan interaksi disimpan di `localStorage` peramban.
Autentikasi, Supabase, unggahan berkas, dan kebijakan akses produksi belum
dihubungkan. Sertifikat dibuat saat diminta sebagai SVG dengan QR menuju halaman
verifikasi; fingerprint lokal bukan tanda tangan elektronik dan tidak membuktikan
keaslian dokumen.
