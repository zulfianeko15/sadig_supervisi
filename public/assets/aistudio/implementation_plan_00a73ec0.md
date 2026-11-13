# SADIG — Supervisi Akademik Digital Guru

Aplikasi web terpadu untuk manajemen supervisi akademik guru berbasis 5 peran pengguna (`Admin`, `Pengawas Sekolah`, `Kepala Sekolah`, `Pengawas Supervisi`, dan `Guru`) yang berjalan interaktif langsung di browser sekaligus menyediakan paket lengkap `Code.gs` dan `Index.html` siap salin-tempel ke Google Apps Script Editor.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh keputusan utama berikut telah dikonfirmasi pada tahap klarifikasi awal dan menjadi acuan tetap implementasi:

- **Mode Pengiriman Aplikasi**: Aplikasi web interaktif penuh di preview browser (dengan persistensi data nyata di server lokal agar seluruh alur CRUD, validasi, dan grafik langsung dapat diuji) **ditambah** pusat ekspor kode lengkap `Code.gs` dan `Index.html` yang siap disalin atau diunduh ke Google Apps Script.
- **Identitas Visual**: Tema **Bersih Akademik Emerald & Slate (Profesional)** — latar terang netral, permukaan kartu tipis dengan garis batas halus (*hairline*), dan aksen hijau Emerald institusional.
- **Standar Regulasi & Skala Penilaian**: **Skala 1–4 sesuai Kurikulum Merdeka & Permendikbud** (`1 = Kurang`, `2 = Cukup`, `3 = Baik`, `4 = Amat Baik`) dengan perhitungan otomatis persentase ketercapaian dan predikat akhir.
- **Data Awal & Akses Pengujian**: Basis data otomatis terisi contoh sekolah (guru, pengawas, instrumen Kurikulum Merdeka untuk Persiapan, Pelaksanaan, dan Evaluasi, serta riwayat penilaian) ditambah fitur **Uji Cepat 5 Role** di halaman masuk selain formulir login NIP/Username & kata sandi.

---

## 1. Overview & Core Concept

- **Apa yang Dilakukan**: SADIG mendigitalkan seluruh siklus supervisi akademik sekolah: unggah tautan berkas kesiapan oleh Guru ke Google Drive, pemeriksaan kelengkapan serta persetujuan (*Approve/Reject*) oleh Kepala Sekolah, penilaian tiga tahap (`Persiapan`, `Pelaksanaan`, `Evaluasi`) oleh Pengawas Supervisi yang terkunci hingga mendapat izin Kepala Sekolah, pemantauan oleh Pengawas Sekolah, serta tata kelola master data oleh Admin.
- **Target Pengguna**: Admin Sekolah/Operator, Pengawas Sekolah, Kepala Sekolah, Pengawas Supervisi (Supervisor), dan Guru Mata Pelajaran.
- **Nilai Utama**: Mencegah supervisi berjalan tanpa verifikasi administratif Kepala Sekolah melalui aturan *approval gate* yang ditegakkan baik di sisi server maupun antarmuka, sekaligus menghilangkan instalasi manual Google Sheets karena `Code.gs` menginisialisasi 7 sheet standar secara otomatis.

---

## 2. User Experience & Visual Design

- **Alur Pengguna Utama**:
  1. **Masuk & Pemilihan Peran**: Pengguna masuk menggunakan Username/NIP dan Password yang divalidasi terhadap tabel `Users`, atau memilih salah satu dari 5 tombol uji cepat peran (`Admin`, `Pengawas Sekolah`, `Kepala Sekolah`, `Pengawas Supervisi`, `Guru`) untuk simulasi instan.
  2. **Workspace Berbasis Peran**: Setelah masuk, navigasi sidebar hanya menampilkan menu yang diizinkan untuk peran aktif beserta breadcrumb di bilah atas.
  3. **Alur Berkas -> Persetujuan -> Supervisi -> Rekap**:
     - *Guru* menginput tautan Google Drive (tervalidasi format URL Drive/Docs) untuk berkas RPP/Modul Ajar & ATP.
     - *Kepala Sekolah* membuka tautan berkas, menandai kelengkapan (`Ada` / `Belum Ada`), lalu menekan tombol `Setujui` atau `Tolak`.
     - *Pengawas Supervisi* hanya dapat membuka formulir penilaian 3 tahap bagi guru bimbingannya yang berstatus `Disetujui`; guru yang masih `Belum Dicek` atau `Ditolak` menampilkan penanda kunci alur yang jelas.
     - *Pengawas Sekolah* & *Kepala Sekolah* memantau grafik progres serta rekapitulasi nilai per mata pelajaran.
  4. **Ekspor Google Apps Script**: Tombol `Ekspor Skrip GAS` pada bilah atas membuka ruang peninjauan dan unduhan kode utuh `Code.gs` dan `Index.html` beserta panduan deployment 3 langkah ke Google Sheets & Apps Script Web App.

- **Identitas Visual & Tema**:
  - *Arah Estetika*: Bersih Akademik & Institusional — struktur panel admin modern berdensitas rapi, tanpa hiasan dekoratif berlebihan.
  - *Palet Warna (60-30-10)*:
    - 60% Kanvas netral bersih (`#F8FAFC` latar kerja, `#FFFFFF` permukaan panel).
    - 30% Permukaan struktural & tipografi Slate (`#0F172A` teks utama, `#475569` teks sekunder, `#E2E8F0` garis batas 1px).
    - 10% Aksen Emerald (`#059669` tombol aksi utama, indikator tab aktif, dan penanda progres) dengan warna semantik tegas yang selalu berpasangan dengan label teks & ikon (`#16A34A` Disetujui, `#D97706` Belum Dicek, `#DC2626` Ditolak).
  - *Tipografi & Hierarki*: `Plus Jakarta Sans` untuk judul halaman dan navigasi, `DM Sans` untuk teks badan dan tabel padat (`13px–14px`), serta `JetBrains Mono` dengan `tabular-nums` untuk seluruh NIP, skor `1–4`, persentase, dan tanggal.
  - *Tata Letak & Kedalaman*: Sidebar kiri tetap `256px` pada desktop (drawer responsif di mobile), bilah atas tunggal berisi breadcrumb konteks dan tombol aksi utama, elevasi datar maksimal 1 tingkat (`border border-slate-200`), tanpa kartu bertumpuk di dalam kartu, tanpa garis aksen kiri tebal, dan tanpa kapsul/pill statis untuk metadata tabel.

- **Umpan Balik Interaktif**:
  - Validasi formulir sisi klien seketika (NIP numerik, URL Google Drive sah, skor wajib 1–4) sebelum permintaan dikirim.
  - Transisi antar menu dan modal ringan ($\le 200\text{ms}$), status *empty state* yang informatif bila data belum tersedia, serta notifikasi *toast* konfirmasi setelah simpan/hapus/persetujuan.

---

## 3. Key Product Decisions & Trade-Offs

- **Aplikasi Preview Nyata + Paket Kode GAS Asli**
  - *Pendekatan*: Membangun backend Express + penyimpanan JSON persisten di server untuk menggerakkan antarmuka React interaktif di browser secara nyata, sekaligus menyusun generator/bundel string lengkap `Code.gs` dan `Index.html` yang konsisten 100% dengan skema 7 sheet dan logika RBAC.
  - *Alasan*: Google Apps Script tidak dapat dieksekusi langsung di luar lingkungan Google (`ScriptApp` / `SpreadsheetApp`), sehingga arsitektur ganda ini memastikan pengguna dapat langsung menguji seluruh skenario 5 peran di preview AI Studio dan langsung menyalin kode GAS valid ke Google Sheets mereka.
  - *Alternatif yang Dipertimbangkan*: Menampilkan teks kode statis saja (ditolak karena tidak dapat diuji secara interaktif).

- **Penegakan Gerbang Persetujuan (*Approval Gate*) di Dua Sisi**
  - *Pendekatan*: Status `Disetujui` oleh Kepala Sekolah dicek di antarmuka (menonaktifkan formulir penilaian dengan keterangan penyebab) **dan** divalidasi ulang di endpoint backend (dan di fungsi `savePenilaian()` dalam `Code.gs`).
  - *Alasan*: Menjamin integritas regulasi alur supervisi sehingga tidak bisa dilewati melalui manipulasi klien.

- **Skor Instrumen Skala 1–4 Berbasis Aspek Dinamis**
  - *Pendekatan*: Setiap item `AspekPersiapan`, `AspekPelaksanaan`, dan `AspekEvaluasi` dapat dikelola oleh Admin (CRUD) dan langsung memengaruhi form penilaian Pengawas Supervisi serta kalkulasi rata-rata skor dan predikat (`Amat Baik`, `Baik`, `Cukup`, `Kurang`).
  - *Alasan*: Memudahkan penyesuaian indikator instrumen apabila sekolah memperbarui rubrik Kurikulum Merdeka di masa depan.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagram Arsitektur Sistem**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       KLIEN WEB INTERAKTIF (SPA)                        │
│  ┌──────────────┐   ┌────────────────────────────────────────────────┐  │
│  │ Auth & Role  │──▶│  Navigasi Dinamis 5 Role (Sidebar + Topbar)    │  │
│  │ Switcher     │   └────────────────────────────────────────────────┘  │
│  └──────────────┘            │                │               │         │
│         ┌────────────────────┼────────────────┼───────────────┼──────┐  │
│         ▼                    ▼                ▼               ▼      ▼  │
│  ┌─────────────┐      ┌─────────────┐  ┌─────────────┐ ┌──────────┐ ┌─┐│
│  │  Dashboard  │      │ Persetujuan │  │  Penilaian  │ │   CRUD   │ │E││
│  │  & Grafik   │      │ Kepsek Gate │  │  1-4 (3 Thp)│ │ Master & │ │x││
│  │  (Dist/Bar) │      │ (Ada/Tdk)   │  │ (Terkunci   │ │  Berkas  │ │p││
│  │             │      │             │  │  sblm Acc)  │ │  Drive   │ │o││
│  └─────────────┘      └─────────────┘  └─────────────┘ └──────────┘ │r││
│         │                    │                │               │     │t││
└─────────┼────────────────────┼────────────────┼───────────────┼─────┴─┘│
          └────────────────────┴────────────────┴───────────────┘        │
                                       │ REST JSON (/api/*)              │
                                       ▼                                 ▼
┌──────────────────────────────────────────────────────────┐   ┌──────────┐
│           BACKEND SERVER (Express + Persistensi)         │   │ Paket    │
│  - Validasi RBAC & Approval Gate Kepala Sekolah          │   │ GAS Siap │
│  - Kalkulasi Skor & Predikat Kurikulum Merdeka (1-4)     │   │ Deploy:  │
│  - Penyimpanan 7 Entitas Setara Google Sheets            │   │ Code.gs  │
│    (Users, Guru, 3 Aspek, Penilaian, Pengaturan)         │   │ Index.   │
└──────────────────────────────────────────────────────────┘   │ html     │
                                                               └──────────┘
```

- **Model Data (7 Tabel / Sheet Standar)**:
  1. `Users`: `username`, `password`, `nama`, `role`, `nip`
  2. `Guru`: `nip`, `namaGuru`, `mataPelajaran`, `tanggalPelaksanaan`, `supervisor`, `statusBerkas` (`Belum Dicek` | `Disetujui` | `Ditolak`), `kelengkapanBerkas` (`Ada` | `Belum Ada`), `linkDriveBerkas`, `catatanKepsek`
  3. `AspekPersiapan`: `id`, `aspek`, `kategoriDeskripsi`
  4. `AspekPelaksanaan`: `id`, `aspek`, `kategoriDeskripsi`
  5. `AspekEvaluasi`: `id`, `aspek`, `kategoriDeskripsi`
  6. `Penilaian`: `nipGuru`, `idAspek`, `tahap` (`Persiapan` | `Pelaksanaan` | `Evaluasi`), `skor` (`1–4`), `catatan`, `penilai`
  7. `Pengaturan`: `namaSekolah`, `namaKepalaSekolah`, `nipKepalaSekolah`, `namaPengawasSekolah`, `nipPengawas`, `tanggalPelaksanaanUmum`

- **Pemetaan Interaksi & Mutasi State**:
  - *Login / Uji Cepat*: Mengisi kredensial atau klik peran cepat -> memvalidasi akun di server -> menetapkan sesi aktif -> merender menu dan data yang difilter sesuai hak akses.
  - *Guru Unggah Tautan Drive*: Validasi regex URL Drive/HTTPS -> simpan `linkDriveBerkas` -> reset/set status pemeriksaan menjadi `Belum Dicek` bila baru diunggah agar Kepala Sekolah dapat memverifikasi.
  - *Kepala Sekolah Verifikasi*: Pilih status kelengkapan (`Ada` / `Belum Ada`) dan aksi `Setujui` atau `Tolak` beserta catatan -> memperbarui `Guru.statusBerkas` -> langsung membuka atau mengunci akses penilaian untuk Pengawas Supervisi.
  - *Pengawas Supervisi Menilai*: Memilih guru bimbingan -> sistem memeriksa `statusBerkas === 'Disetujui'` -> menampilkan tab 3 tahap (`Persiapan`, `Pelaksanaan`, `Evaluasi`) berisi daftar aspek dinamis dengan pemilih skor `1–4` dan kolom catatan -> menyimpan `Penilaian` dan memperbarui rekap nilai rata-rata serta predikat.
  - *Admin Kelola Master & Pengaturan*: Formulir tambah/ubah/hapus dengan konfirmasi untuk `Guru`, 3 tabel `Aspek`, `Users`, dan `Pengaturan` sekolah yang seketika diperbarui di seluruh tampilan termasuk dokumen cetak/rekap.
  - *Ekspor `Code.gs` & `Index.html`*: Menyediakan peninjauan kode terstruktur, tombol salin ke clipboard, dan tombol unduh file terpisah (`Code.gs` dan `Index.html`) yang berisi implementasi `SpreadsheetApp`, `doGet(e)`, `doPost(e)`, Tailwind CSS CDN, dan Chart.js CDN.
