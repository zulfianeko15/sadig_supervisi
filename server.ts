import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  AppDatabasePayload,
  AspekItem,
  CatatanTahap,
  GuruRecord,
  PengaturanSekolah,
  PenilaianItem,
  RekapGuru,
  TahapSummary,
  TahapSupervisi,
  TipePenilaianAspek,
  UserAccount,
  UserRole,
} from './src/types.ts';
import { hitungPredikat } from './src/types.ts';

interface SadigDb {
  users: UserAccount[];
  guru: GuruRecord[];
  aspekPersiapan: AspekItem[];
  aspekPelaksanaan: AspekItem[];
  aspekEvaluasi: AspekItem[];
  penilaian: PenilaianItem[];
  catatanTahap: CatatanTahap[];
  pengaturan: PengaturanSekolah;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sadig-db.json');

function createSeedDatabase(): SadigDb {
  const users: UserAccount[] = [
    {
      username: 'admin',
      password: '123',
      nama: 'Rizky Pratama, S.Kom',
      role: 'Admin',
      nip: '19880312 201402 1 002',
    },
    {
      username: 'pengawas',
      password: '123',
      nama: 'Dr. H. Zulkipli, M.Pd',
      role: 'Pengawas Sekolah',
      nip: '19731231 200112 1 022',
    },
    {
      username: 'kepsek',
      password: '123',
      nama: 'Emilia Purnawadi, S.E., M.Pd',
      role: 'Kepala Sekolah',
      nip: '19780514 200312 2 005',
    },
    {
      username: 'supervisor1',
      password: '123',
      nama: 'Dra. Hj. Ratna Dewi, M.Pd',
      role: 'Pengawas Supervisi',
      nip: '19750820 200212 2 003',
    },
    {
      username: 'supervisor2',
      password: '123',
      nama: 'Bambang Sutrisno, S.Pd., M.Si',
      role: 'Pengawas Supervisi',
      nip: '19810410 200604 1 011',
    },
    {
      username: 'guru1',
      password: '123',
      nama: 'Ahmad Hidayat, S.Pd',
      role: 'Guru',
      nip: '19850115 201001 1 004',
    },
    {
      username: 'guru2',
      password: '123',
      nama: 'Siti Aminah, S.Pd., Gr',
      role: 'Guru',
      nip: '19900222 201502 2 003',
    },
    {
      username: 'guru3',
      password: '123',
      nama: 'Dedi Kurniawan, M.Pd',
      role: 'Guru',
      nip: '19871109 201403 1 001',
    },
    {
      username: 'guru4',
      password: '123',
      nama: 'Nurul Hidayah, S.Pd',
      role: 'Guru',
      nip: '19920618 201903 2 007',
    },
  ];

  const guru: GuruRecord[] = [
    {
      id: 'G001',
      nip: '19850115 201001 1 004',
      namaGuru: 'Ahmad Hidayat, S.Pd',
      mataPelajaran: 'Matematika',
      tanggalPelaksanaan: '2026-11-10',
      supervisor: 'Dra. Hj. Ratna Dewi, M.Pd',
      nipSupervisor: '19750820 200212 2 003',
      statusBerkas: 'Disetujui',
      kelengkapanBerkas: 'Ada',
      linkDriveBerkas: 'https://drive.google.com/drive/folders/1A2b3C4d5E6fModulMatematika',
      catatanKepsek: 'Modul Ajar, ATP, LKPD, dan instrumen asesmen lengkap sesuai Kurikulum Merdeka.',
    },
    {
      id: 'G002',
      nip: '19900222 201502 2 003',
      namaGuru: 'Siti Aminah, S.Pd., Gr',
      mataPelajaran: 'Bahasa Indonesia',
      tanggalPelaksanaan: '2026-11-12',
      supervisor: 'Dra. Hj. Ratna Dewi, M.Pd',
      nipSupervisor: '19750820 200212 2 003',
      statusBerkas: 'Disetujui',
      kelengkapanBerkas: 'Ada',
      linkDriveBerkas: 'https://drive.google.com/drive/folders/2B3c4D5e6F7gModulBIndo',
      catatanKepsek: 'Berkas kesiapan disetujui untuk pelaksanaan observasi kelas dan evaluasi.',
    },
    {
      id: 'G003',
      nip: '19871109 201403 1 001',
      namaGuru: 'Dedi Kurniawan, M.Pd',
      mataPelajaran: 'IPA Terpadu',
      tanggalPelaksanaan: '2026-11-14',
      supervisor: 'Dra. Hj. Ratna Dewi, M.Pd',
      nipSupervisor: '19750820 200212 2 003',
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: 'https://drive.google.com/file/d/3C4d5E6f7G8hPerangkatIPA/view',
      catatanKepsek: '',
    },
    {
      id: 'G004',
      nip: '19920618 201903 2 007',
      namaGuru: 'Nurul Hidayah, S.Pd',
      mataPelajaran: 'Bahasa Inggris',
      tanggalPelaksanaan: '2026-11-16',
      supervisor: 'Bambang Sutrisno, S.Pd., M.Si',
      nipSupervisor: '19810410 200604 1 011',
      statusBerkas: 'Ditolak',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: 'https://drive.google.com/file/d/4D5e6F7g8H9iDraftInggris/view',
      catatanKepsek: 'Mohon lengkapi lampiran rubrik asesmen formatif dan LKPD terdiferensiasi pada tautan Drive.',
    },
  ];

  const aspekPersiapan: AspekItem[] = [
    { id: 'P1', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Identitas Modul Ajar / Perangkat Pembelajaran', kategoriDeskripsi: 'Mencantumkan satuan pendidikan, mata pelajaran, fase/kelas, semester, dan alokasi waktu.', tipePenilaian: 'skor' },
    { id: 'P2', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Identifikasi Kesiapan Peserta Didik', kategoriDeskripsi: 'Memetakan kesiapan belajar, minat, dan profil belajar murid berbasis asesmen diagnostik.', tipePenilaian: 'skor' },
    { id: 'P3', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Dimensi Profil Lulusan / Profil Pelajar Pancasila', kategoriDeskripsi: 'Menentukan dimensi karakter yang relevan dan terintegrasi pada tujuan pembelajaran.', tipePenilaian: 'skor' },
    { id: 'P4', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Perumusan CP, TP, dan Alur Tujuan Pembelajaran (ATP)', kategoriDeskripsi: 'Tujuan pembelajaran terukur, selaras dengan Capaian Pembelajaran fase terkini.', tipePenilaian: 'skor' },
    { id: 'P5', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Pemilihan Model & Pedagogi Pembelajaran Mendalam', kategoriDeskripsi: 'Merancang pengalaman belajar memahami, mengaplikasikan, dan merefleksikan materi.', tipePenilaian: 'skor' },
    { id: 'P6', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Langkah Pembelajaran Berdiferensiasi', kategoriDeskripsi: 'Kegiatan pendahuluan, inti, dan penutup mengakomodasi kebutuhan belajar beragam.', tipePenilaian: 'skor' },
    { id: 'P7', kelompok: 'III. ASESMEN & SUMBER BELAJAR', aspek: 'Rancangan Asesmen Awal, Formatif, dan Sumatif', kategoriDeskripsi: 'Tersedia instrumen dan rubrik penilaian autentik yang terukur dan objektif.', tipePenilaian: 'skor' },
    { id: 'P8', kelompok: 'III. ASESMEN & SUMBER BELAJAR', aspek: 'Media Digital, LKPD, dan Bahan Ajar Kontekstual', kategoriDeskripsi: 'Melampirkan LKPD, bahan bacaan relevan, dan pemanfaatan media pembelajaran digital.', tipePenilaian: 'skor' },
  ];

  const aspekPelaksanaan: AspekItem[] = [
    { id: 'L1', kelompok: 'I. KEGIATAN PENDAHULUAN', aspek: 'Pengondisian Kelas & Kesepakatan Belajar', kategoriDeskripsi: 'Menciptakan suasana aman, nyaman, berdoa, dan menegakkan kesepakatan kelas positif.', tipePenilaian: 'skor' },
    { id: 'L2', kelompok: 'I. KEGIATAN PENDAHULUAN', aspek: 'Apersepsi, Motivasi & Penyampaian Tujuan', kategoriDeskripsi: 'Mengaitkan materi dengan pengalaman nyata murid dan menyampaikan tujuan pembelajaran.', tipePenilaian: 'skor' },
    { id: 'L3', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Penguasaan Materi & Pertanyaan Pemantik Kritis', kategoriDeskripsi: 'Menyajikan materi terstruktur dengan pertanyaan pemantik yang merangsang nalar kritis.', tipePenilaian: 'skor' },
    { id: 'L4', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Fasilitasi Kolaborasi & Diferensiasi Proses', kategoriDeskripsi: 'Mendampingi kelompok belajar secara adil dan adaptif sesuai kebutuhan murid.', tipePenilaian: 'skor' },
    { id: 'L5', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Pemanfaatan Teknologi & Media Interaktif', kategoriDeskripsi: 'Menggunakan perangkat digital/alat peraga secara efektif untuk memperjelas konsep.', tipePenilaian: 'skor' },
    { id: 'L6', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Asesmen Formatif & Umpan Balik Konstruktif', kategoriDeskripsi: 'Memantau proses belajar murid dan memberi umpan balik langsung yang membangun.', tipePenilaian: 'skor' },
    { id: 'L7', kelompok: 'III. KEGIATAN PENUTUP', aspek: 'Penyimpulan Bersama & Refleksi Pembelajaran', kategoriDeskripsi: 'Melibatkan murid menyimpulkan inti materi dan merefleksikan pengalaman belajar.', tipePenilaian: 'skor' },
    { id: 'L8', kelompok: 'III. KEGIATAN PENUTUP', aspek: 'Asesmen Akhir & Tindak Lanjut Pertemuan', kategoriDeskripsi: 'Melakukan pengecekan ketercapaian tujuan dan menginformasikan rencana pertemuan berikutnya.', tipePenilaian: 'skor' },
  ];

  const aspekEvaluasi: AspekItem[] = [
    { id: 'E1', kelompok: 'I. ANALISIS HASIL ASESMEN', aspek: 'Rekapitulasi & Analisis Ketuntasan Hasil Belajar', kategoriDeskripsi: 'Dialog refleksi bersama guru mengenai capaian asesmen formatif/sumatif murid.', tipePenilaian: 'teks' },
    { id: 'E2', kelompok: 'I. ANALISIS HASIL ASESMEN', aspek: 'Identifikasi Butir Soal / Indikator Belum Tuntas', kategoriDeskripsi: 'Dialog mengenai materi esensial yang masih mengalami miskonsepsi atau di bawah KKTP.', tipePenilaian: 'teks' },
    { id: 'E3', kelompok: 'II. PROGRAM TINDAK LANJUT', aspek: 'Pelaksanaan Program Remedial Terstruktur', kategoriDeskripsi: 'Kesepakatan strategi pendampingan ulang bagi murid yang belum mencapai tujuan.', tipePenilaian: 'teks' },
    { id: 'E4', kelompok: 'II. PROGRAM TINDAK LANJUT', aspek: 'Pelaksanaan Program Pengayaan & Tantangan Lanjut', kategoriDeskripsi: 'Umpan balik atas tugas pengayaan kontekstual bagi murid yang melampaui capaian.', tipePenilaian: 'teks' },
    { id: 'E5', kelompok: 'III. REFLEKSI & PELAPORAN', aspek: 'Refleksi Profesional Guru atas Efektivitas Mengajar', kategoriDeskripsi: 'Hasil dialog kekuatan mengajar, kendala kelas, dan perbaikan strategi pedagogis.', tipePenilaian: 'teks' },
    { id: 'E6', kelompok: 'III. REFLEKSI & PELAPORAN', aspek: 'Dokumentasi Portofolio & Pelaporan Berkala', kategoriDeskripsi: 'Catatan kelengkapan portofolio murid dan penyampaian progres ke orang tua/sekolah.', tipePenilaian: 'teks' },
  ];

  const penilaian: PenilaianItem[] = [
    { nipGuru: '19850115 201001 1 004', idAspek: 'P1', tahap: 'Persiapan', skor: 4, catatan: 'Identitas modul ajar sangat lengkap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P2', tahap: 'Persiapan', skor: 4, catatan: 'Pemetaan asesmen diagnostik awal tersedia.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P3', tahap: 'Persiapan', skor: 3, catatan: 'Dimensi bernalar kritis terintegrasi baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P4', tahap: 'Persiapan', skor: 4, catatan: 'ATP runtut sesuai fase D.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P5', tahap: 'Persiapan', skor: 4, catatan: 'Model problem-based learning tergambar jelas.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P6', tahap: 'Persiapan', skor: 3, catatan: 'Diferensiasi konten sudah disiapkan.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P7', tahap: 'Persiapan', skor: 4, catatan: 'Rubrik penilaian sangat terukur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'P8', tahap: 'Persiapan', skor: 4, catatan: 'LKPD interaktif GeoGebra terlampir.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    { nipGuru: '19850115 201001 1 004', idAspek: 'L1', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kelas kondusif dan interaktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L2', tahap: 'Pelaksanaan', skor: 4, catatan: 'Apersepsi kontekstual menarik perhatian siswa.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L3', tahap: 'Pelaksanaan', skor: 4, catatan: 'Pertanyaan pemantik memicu diskusi aktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L4', tahap: 'Pelaksanaan', skor: 3, catatan: 'Pendampingan kelompok merata.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L5', tahap: 'Pelaksanaan', skor: 4, catatan: 'Visualisasi grafik digital sangat membantu.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L6', tahap: 'Pelaksanaan', skor: 3, catatan: 'Umpan balik lisan diberikan tepat waktu.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L7', tahap: 'Pelaksanaan', skor: 4, catatan: 'Siswa menyimpulkan materi dengan percaya diri.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19850115 201001 1 004', idAspek: 'L8', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kuis formatif akhir berjalan tertib.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    // Evaluasi Dialog Refleksi for Ahmad Hidayat
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E1',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru memaparkan 87% murid telah mencapai KKTP pada materi persamaan linear; 4 murid masih perlu pendampingan pemodelan soal cerita.',
      catatan: 'Analisis per TP sudah terdokumentasi rapi.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E2',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Disepakati bersama bahwa miskonsepsi terbesar terjadi saat menerjemahkan kalimat perbandingan ke bentuk aljabar.',
      catatan: 'Perlu variasi latihan kontekstual.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E3',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru menjadwalkan klinik belajar kelompok kecil 30 menit pasca jam pelajaran menggunakan alat peraga kartu aljabar.',
      catatan: 'Jadwal remedial sudah dikomunikasikan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E4',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Murid yang melampaui capaian diberi tantangan proyek eksplorasi tarif transportasi lokal dengan GeoGebra.',
      catatan: 'Sangat kontekstual.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E5',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru merefleksikan perlunya pembagian peran moderator dan pencatat pada diskusi kelompok agar 2 siswa pasif lebih terlibat.',
      catatan: 'Komitmen perbaikan jelas.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E6',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Portofolio hasil LKPD digital sudah tersimpan di folder kelas dan rekap nilai formatif siap dilaporkan ke wali kelas.',
      catatan: 'Tertib administrasi.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },

    // Siti Aminah (Persiapan + Pelaksanaan, Evaluasi belum)
    { nipGuru: '19900222 201502 2 003', idAspek: 'P1', tahap: 'Persiapan', skor: 4, catatan: 'Lengkap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P2', tahap: 'Persiapan', skor: 3, catatan: 'Sudah ada pemetaan gaya belajar.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P3', tahap: 'Persiapan', skor: 3, catatan: 'Baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P4', tahap: 'Persiapan', skor: 3, catatan: 'Tujuan terukur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P5', tahap: 'Persiapan', skor: 4, catatan: 'Menggunakan pendekatan teks autentik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P6', tahap: 'Persiapan', skor: 3, catatan: 'Cukup terstruktur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P7', tahap: 'Persiapan', skor: 3, catatan: 'Rubrik teks persuasi tersedia.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'P8', tahap: 'Persiapan', skor: 3, catatan: 'LKPD cetak dan digital siap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    { nipGuru: '19900222 201502 2 003', idAspek: 'L1', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kesepakatan kelas berjalan baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L2', tahap: 'Pelaksanaan', skor: 3, catatan: 'Apersepsi baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L3', tahap: 'Pelaksanaan', skor: 3, catatan: 'Diskusi teks hidup.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L4', tahap: 'Pelaksanaan', skor: 3, catatan: 'Perlu manajemen waktu kelompok.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L5', tahap: 'Pelaksanaan', skor: 4, catatan: 'Slide presentasi interaktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L6', tahap: 'Pelaksanaan', skor: 3, catatan: 'Umpan balik cukup jelas.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L7', tahap: 'Pelaksanaan', skor: 3, catatan: 'Refleksi tertulis dilakukan.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { nipGuru: '19900222 201502 2 003', idAspek: 'L8', tahap: 'Pelaksanaan', skor: 3, catatan: 'Penutup tertib.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
  ];

  const catatanTahap: CatatanTahap[] = [
    {
      nipGuru: '19850115 201001 1 004',
      tahap: 'Persiapan',
      masalah: 'Alokasi waktu untuk diferensiasi produk pada modul ajar masih terlalu padat dalam 2 JP.',
      pemecahan: 'Memecah aktivitas eksplorasi proyek mini ke dalam LKPD terstruktur berbasis kelompok.',
      rencanaTL: 'Guru menyempurnakan pembagian alokasi waktu pada pertemuan siklus berikutnya.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-10',
    },
    {
      nipGuru: '19850115 201001 1 004',
      tahap: 'Pelaksanaan',
      masalah: 'Dua siswa di barisan belakang masih pasif saat sesi presentasi kelompok.',
      pemecahan: 'Menerapkan pembagian peran spesifik (moderator, penyaji, penanya) di tiap kelompok.',
      rencanaTL: 'Pendampingan variasi teknik bertanya terbuka pada observasi lanjutan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-10',
    },
    {
      nipGuru: '19850115 201001 1 004',
      tahap: 'Evaluasi',
      masalah: '4 siswa masih mengalami kesulitan pada soal pemecahan masalah berbasis cerita kontekstual.',
      pemecahan: 'Menyusun modul remedial bertahap dengan visualisasi model konkret.',
      rencanaTL: 'Melaksanakan klinik belajar 30 menit pasca jam pelajaran dan melaporkan perkembangan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-11',
    },
    {
      nipGuru: '19900222 201502 2 003',
      tahap: 'Persiapan',
      masalah: 'Rubrik penilaian keterampilan menulis belum mencantumkan indikator kelengkapan argumen.',
      pemecahan: 'Menambahkan deskriptor skor 1–4 khusus aspek kohesi dan bukti argumen.',
      rencanaTL: 'Revisi rubrik diunggah ulang ke folder perangkat Drive.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-12',
    },
    {
      nipGuru: '19900222 201502 2 003',
      tahap: 'Pelaksanaan',
      masalah: 'Waktu diskusi kelompok melebihi alokasi 10 menit sehingga sesi refleksi terburu-buru.',
      pemecahan: 'Menggunakan pengatur waktu proyektor agar transisi antar fase lebih disiplin.',
      rencanaTL: 'Menerapkan timer kelas dan lembar refleksi singkat digital.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-12',
    },
  ];

  const pengaturan: PengaturanSekolah = {
    namaSekolah: 'SMP NEGERI 4 KOTA JAMBI',
    dinasPendidikan: 'DINAS PENDIDIKAN DAN KEBUDAYAAN KOTA JAMBI',
    pemerintahDaerah: 'PEMERINTAH KOTA JAMBI',
    alamatSekolah: 'Jalan Kopral Toekini RT.16 No.28 Kel. Lingkar Selatan Kec. Paal Merah',
    tahunPelajaran: '2026/2027',
    semester: 'GANJIL',
    namaKepalaSekolah: 'Emilia Purnawadi, S.E., M.Pd',
    nipKepalaSekolah: '19780514 200312 2 005',
    namaPengawasSekolah: 'Dr. H. Zulkipli, M.Pd',
    nipPengawas: '19731231 200112 1 022',
    tanggalPelaksanaanUmum: '2026-11-10',
    tempatTanggalCetak: 'Kota Jambi, 13 November 2026',
    logoKiri: '',
    logoKanan: '',
  };

  return {
    users,
    guru,
    aspekPersiapan,
    aspekPelaksanaan,
    aspekEvaluasi,
    penilaian,
    catatanTahap,
    pengaturan,
  };
}

function loadDb(): SadigDb {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as SadigDb;
    // Ensure newer fields exist cleanly if loading existing DB
    parsed.aspekEvaluasi = parsed.aspekEvaluasi.map((a) => ({
      ...a,
      tipePenilaian: a.tipePenilaian || 'teks',
    }));
    parsed.pengaturan = {
      logoKiri: '',
      logoKanan: '',
      ...parsed.pengaturan,
    };
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

function saveDb(db: SadigDb): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function computeTahapSummary(
  nipGuru: string,
  tahap: TahapSupervisi,
  aspekList: AspekItem[],
  penilaianList: PenilaianItem[]
): TahapSummary {
  const jumlahAspek = aspekList.length;
  const numericAspeks = aspekList.filter((a) => a.tipePenilaian !== 'teks');
  const textAspeks = aspekList.filter((a) => a.tipePenilaian === 'teks');

  const mode: TahapSummary['mode'] =
    textAspeks.length === jumlahAspek && jumlahAspek > 0
      ? 'teks'
      : numericAspeks.length === jumlahAspek
      ? 'skor'
      : 'campuran';

  const matched = penilaianList.filter(
    (p) => p.nipGuru === nipGuru && p.tahap === tahap && aspekList.some((a) => a.id === p.idAspek)
  );

  let terisi = 0;
  let totalSkor = 0;
  let numericFilled = 0;

  aspekList.forEach((a) => {
    const entry = matched.find((m) => m.idAspek === a.id);
    if (!entry) return;
    if (a.tipePenilaian === 'teks') {
      if (entry.teksRefleksi && entry.teksRefleksi.trim().length > 0) {
        terisi++;
      }
    } else if (entry.skor && [1, 2, 3, 4].includes(Number(entry.skor))) {
      terisi++;
      numericFilled++;
      totalSkor += Number(entry.skor);
    }
  });

  const skorMaksimal = numericAspeks.length * 4;
  const nilai =
    skorMaksimal > 0 && numericFilled > 0
      ? Number(((totalSkor / skorMaksimal) * 100).toFixed(1))
      : null;

  const predikat =
    mode === 'teks'
      ? terisi > 0
        ? 'Tuntas (Dialog Refleksi)'
        : 'Belum Diisi'
      : hitungPredikat(nilai);

  return { jumlahAspek, terisi, totalSkor, skorMaksimal, nilai, predikat, mode };
}

function buildRekap(db: SadigDb): RekapGuru[] {
  return db.guru.map((g) => {
    const persiapan = computeTahapSummary(g.nip, 'Persiapan', db.aspekPersiapan, db.penilaian);
    const pelaksanaan = computeTahapSummary(g.nip, 'Pelaksanaan', db.aspekPelaksanaan, db.penilaian);
    const evaluasi = computeTahapSummary(g.nip, 'Evaluasi', db.aspekEvaluasi, db.penilaian);

    const availableScores = [persiapan.nilai, pelaksanaan.nilai, evaluasi.nilai].filter(
      (n): n is number => n !== null
    );
    const nilaiRata =
      availableScores.length > 0
        ? Number((availableScores.reduce((a, b) => a + b, 0) / availableScores.length).toFixed(1))
        : null;

    const sudahLengkap =
      persiapan.terisi > 0 && pelaksanaan.terisi > 0 && evaluasi.terisi > 0;

    return {
      guru: g,
      persiapan,
      pelaksanaan,
      evaluasi,
      nilaiRata,
      predikatAkhir:
        availableScores.length > 0 ? hitungPredikat(nilaiRata) : 'Belum Lengkap',
      sudahLengkap,
    };
  });
}

function buildPayload(db: SadigDb): AppDatabasePayload {
  return {
    ...db,
    rekap: buildRekap(db),
  };
}

function isValidDriveUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Username/NIP dan password wajib diisi.' });
      return;
    }
    const db = loadDb();
    const normalizedId = identifier.trim().toLowerCase().replace(/\s+/g, '');
    const user = db.users.find(
      (u) =>
        (u.username.toLowerCase() === identifier.trim().toLowerCase() ||
          u.nip.replace(/\s+/g, '').toLowerCase() === normalizedId) &&
        u.password === password.trim()
    );
    if (!user) {
      res.status(401).json({ success: false, message: 'Username/NIP atau password tidak cocok.' });
      return;
    }
    res.json({ success: true, user });
  });

  app.post('/api/quick-login', (req, res) => {
    const { role } = req.body as { role?: UserRole };
    const db = loadDb();
    const user = db.users.find((u) => u.role === role);
    if (!user) {
      res.status(404).json({ success: false, message: `Akun dengan role ${role} tidak ditemukan.` });
      return;
    }
    res.json({ success: true, user });
  });

  app.get('/api/state', (_req, res) => {
    const db = loadDb();
    res.json(buildPayload(db));
  });

  app.post('/api/guru', (req, res) => {
    const body = req.body as Partial<GuruRecord>;
    if (!body.namaGuru?.trim() || !body.nip?.trim() || !body.mataPelajaran?.trim()) {
      res.status(400).json({ success: false, message: 'Nama Guru, NIP, dan Mata Pelajaran wajib diisi.' });
      return;
    }
    const db = loadDb();
    const supervisorUser = db.users.find((u) => u.nama === body.supervisor);
    const nipSupervisor = body.nipSupervisor ?? supervisorUser?.nip ?? '';

    if (body.id) {
      const idx = db.guru.findIndex((g) => g.id === body.id);
      if (idx === -1) {
        res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
        return;
      }
      const oldNip = db.guru[idx].nip;
      const newNip = body.nip.trim();
      db.guru[idx] = {
        ...db.guru[idx],
        nip: newNip,
        namaGuru: body.namaGuru.trim(),
        mataPelajaran: body.mataPelajaran.trim(),
        tanggalPelaksanaan: body.tanggalPelaksanaan || db.guru[idx].tanggalPelaksanaan,
        supervisor: body.supervisor ?? db.guru[idx].supervisor,
        nipSupervisor,
      };
      if (oldNip !== newNip) {
        db.penilaian.forEach((p) => {
          if (p.nipGuru === oldNip) p.nipGuru = newNip;
        });
        db.catatanTahap.forEach((c) => {
          if (c.nipGuru === oldNip) c.nipGuru = newNip;
        });
      }
    } else {
      const duplicate = db.guru.some((g) => g.nip.replace(/\s+/g, '') === body.nip!.replace(/\s+/g, ''));
      if (duplicate) {
        res.status(400).json({ success: false, message: 'NIP guru sudah terdaftar.' });
        return;
      }
      db.guru.push({
        id: 'G' + Date.now(),
        nip: body.nip.trim(),
        namaGuru: body.namaGuru.trim(),
        mataPelajaran: body.mataPelajaran.trim(),
        tanggalPelaksanaan: body.tanggalPelaksanaan || db.pengaturan.tanggalPelaksanaanUmum,
        supervisor: body.supervisor || '',
        nipSupervisor,
        statusBerkas: 'Belum Dicek',
        kelengkapanBerkas: 'Belum Ada',
        linkDriveBerkas: '',
        catatanKepsek: '',
      });
    }
    saveDb(db);
    res.json({ success: true, message: 'Data guru berhasil disimpan.', data: buildPayload(db) });
  });

  app.post('/api/guru/bulk', (req, res) => {
    const { items } = req.body as {
      items?: Array<{ namaGuru: string; nip: string; mataPelajaran: string; tanggalPelaksanaan?: string; supervisor?: string }>;
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Data CSV kosong atau format tidak valid.' });
      return;
    }
    const db = loadDb();
    let added = 0;
    items.forEach((item, index) => {
      if (!item.namaGuru?.trim() || !item.mataPelajaran?.trim()) return;
      const nip = item.nip?.trim() || `19900101 202001 1 ${String(index + 10).padStart(3, '0')}`;
      if (db.guru.some((g) => g.nip.replace(/\s+/g, '') === nip.replace(/\s+/g, ''))) return;
      const spvUser = db.users.find((u) => u.nama === item.supervisor);
      db.guru.push({
        id: `G${Date.now()}_${index}`,
        nip,
        namaGuru: item.namaGuru.trim(),
        mataPelajaran: item.mataPelajaran.trim(),
        tanggalPelaksanaan: item.tanggalPelaksanaan?.trim() || db.pengaturan.tanggalPelaksanaanUmum,
        supervisor: item.supervisor?.trim() || '',
        nipSupervisor: spvUser?.nip || '',
        statusBerkas: 'Belum Dicek',
        kelengkapanBerkas: 'Belum Ada',
        linkDriveBerkas: '',
        catatanKepsek: '',
      });
      added++;
    });
    saveDb(db);
    res.json({ success: true, message: `${added} data guru berhasil diimpor.`, data: buildPayload(db) });
  });

  app.delete('/api/guru/:id', (req, res) => {
    const db = loadDb();
    const target = db.guru.find((g) => g.id === req.params.id);
    if (!target) {
      res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
      return;
    }
    db.guru = db.guru.filter((g) => g.id !== req.params.id);
    db.penilaian = db.penilaian.filter((p) => p.nipGuru !== target.nip);
    db.catatanTahap = db.catatanTahap.filter((c) => c.nipGuru !== target.nip);
    saveDb(db);
    res.json({ success: true, message: 'Data guru dan riwayat nilai berhasil dihapus.', data: buildPayload(db) });
  });

  app.post('/api/guru/berkas', (req, res) => {
    const { idGuru, linkDriveBerkas } = req.body as { idGuru?: string; linkDriveBerkas?: string };
    if (!idGuru || !linkDriveBerkas || !isValidDriveUrl(linkDriveBerkas)) {
      res.status(400).json({ success: false, message: 'Tautan Google Drive tidak valid. Pastikan diawali https://.' });
      return;
    }
    const db = loadDb();
    const idx = db.guru.findIndex((g) => g.id === idGuru);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
      return;
    }
    db.guru[idx].linkDriveBerkas = linkDriveBerkas.trim();
    db.guru[idx].statusBerkas = 'Belum Dicek';
    db.guru[idx].catatanKepsek = '';
    saveDb(db);
    res.json({
      success: true,
      message: 'Tautan berkas kesiapan berhasil dikirim untuk verifikasi Kepala Sekolah.',
      data: buildPayload(db),
    });
  });

  app.post('/api/kepsek/verifikasi', (req, res) => {
    const { idGuru, kelengkapanBerkas, statusBerkas, catatanKepsek } = req.body as {
      idGuru?: string;
      kelengkapanBerkas?: 'Ada' | 'Belum Ada';
      statusBerkas?: 'Disetujui' | 'Ditolak' | 'Belum Dicek';
      catatanKepsek?: string;
    };
    const db = loadDb();
    const idx = db.guru.findIndex((g) => g.id === idGuru);
    if (idx === -1) {
      res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
      return;
    }
    if (statusBerkas === 'Disetujui' && kelengkapanBerkas !== 'Ada') {
      res.status(400).json({
        success: false,
        message: 'Berkas harus ditandai "Ada" sebelum memberikan persetujuan (Disetujui).',
      });
      return;
    }
    db.guru[idx].kelengkapanBerkas = kelengkapanBerkas || db.guru[idx].kelengkapanBerkas;
    db.guru[idx].statusBerkas = statusBerkas || db.guru[idx].statusBerkas;
    db.guru[idx].catatanKepsek = catatanKepsek?.trim() || '';
    saveDb(db);
    res.json({
      success: true,
      message: `Status berkas ${db.guru[idx].namaGuru} diperbarui menjadi "${db.guru[idx].statusBerkas}".`,
      data: buildPayload(db),
    });
  });

  app.post('/api/penilaian', (req, res) => {
    const { nipGuru, tahap, items, masalah, pemecahan, rencanaTL, penilai } = req.body as {
      nipGuru?: string;
      tahap?: TahapSupervisi;
      items?: Array<{
        idAspek: string;
        skor: 1 | 2 | 3 | 4 | null;
        teksRefleksi?: string;
        catatan: string;
      }>;
      masalah?: string;
      pemecahan?: string;
      rencanaTL?: string;
      penilai?: string;
    };
    if (!nipGuru || !tahap || !Array.isArray(items)) {
      res.status(400).json({ success: false, message: 'Payload penilaian tidak lengkap.' });
      return;
    }
    const db = loadDb();
    const guru = db.guru.find((g) => g.nip === nipGuru);
    if (!guru) {
      res.status(404).json({ success: false, message: 'Data guru tidak ditemukan.' });
      return;
    }
    if (guru.statusBerkas !== 'Disetujui') {
      res.status(403).json({
        success: false,
        message: `Penilaian terkunci: Berkas ${guru.namaGuru} belum disetujui Kepala Sekolah (status saat ini: ${guru.statusBerkas}).`,
      });
      return;
    }

    const aspekList =
      tahap === 'Persiapan'
        ? db.aspekPersiapan
        : tahap === 'Pelaksanaan'
        ? db.aspekPelaksanaan
        : db.aspekEvaluasi;

    for (const item of items) {
      const def = aspekList.find((a) => a.id === item.idAspek);
      if (def?.tipePenilaian === 'teks') {
        if (!item.teksRefleksi?.trim()) {
          res.status(400).json({
            success: false,
            message: `Hasil Dialog Refleksi untuk aspek "${def.aspek}" wajib diisi.`,
          });
          return;
        }
      } else {
        if (![1, 2, 3, 4].includes(Number(item.skor))) {
          res.status(400).json({
            success: false,
            message: 'Setiap aspek berbasis skor wajib memiliki nilai 1 sampai 4.',
          });
          return;
        }
      }
    }

    db.penilaian = db.penilaian.filter((p) => !(p.nipGuru === nipGuru && p.tahap === tahap));
    items.forEach((item) => {
      const def = aspekList.find((a) => a.id === item.idAspek);
      const isText = def?.tipePenilaian === 'teks';
      db.penilaian.push({
        nipGuru,
        idAspek: item.idAspek,
        tahap,
        skor: isText ? null : (Number(item.skor) as 1 | 2 | 3 | 4),
        teksRefleksi: isText ? item.teksRefleksi?.trim() || '' : undefined,
        catatan: item.catatan?.trim() || '',
        penilai: penilai || guru.supervisor || 'Pengawas Supervisi',
      });
    });

    db.catatanTahap = db.catatanTahap.filter((c) => !(c.nipGuru === nipGuru && c.tahap === tahap));
    db.catatanTahap.push({
      nipGuru,
      tahap,
      masalah: masalah?.trim() || '',
      pemecahan: pemecahan?.trim() || '',
      rencanaTL: rencanaTL?.trim() || '',
      penilai: penilai || guru.supervisor || 'Pengawas Supervisi',
      updatedAt: new Date().toISOString().slice(0, 10),
    });

    saveDb(db);
    res.json({
      success: true,
      message: `Penilaian tahap ${tahap} untuk ${guru.namaGuru} berhasil disimpan.`,
      data: buildPayload(db),
    });
  });

  app.post('/api/aspek/:tahap', (req, res) => {
    const tahap = req.params.tahap as TahapSupervisi;
    const { id, kelompok, aspek, kategoriDeskripsi, tipePenilaian } = req.body as Partial<AspekItem>;
    if (!aspek?.trim()) {
      res.status(400).json({ success: false, message: 'Nama aspek penilaian wajib diisi.' });
      return;
    }
    const db = loadDb();
    const key =
      tahap === 'Persiapan'
        ? 'aspekPersiapan'
        : tahap === 'Pelaksanaan'
        ? 'aspekPelaksanaan'
        : 'aspekEvaluasi';
    const prefix = tahap === 'Persiapan' ? 'P' : tahap === 'Pelaksanaan' ? 'L' : 'E';
    const resolvedType: TipePenilaianAspek =
      tipePenilaian === 'teks' || tipePenilaian === 'skor'
        ? tipePenilaian
        : tahap === 'Evaluasi'
        ? 'teks'
        : 'skor';

    if (id) {
      const idx = db[key].findIndex((a) => a.id === id);
      if (idx === -1) {
        res.status(404).json({ success: false, message: 'Aspek tidak ditemukan.' });
        return;
      }
      db[key][idx] = {
        id,
        kelompok: kelompok?.trim() || db[key][idx].kelompok,
        aspek: aspek.trim(),
        kategoriDeskripsi: kategoriDeskripsi?.trim() || '',
        tipePenilaian: resolvedType,
      };
    } else {
      const newId = `${prefix}${Date.now().toString().slice(-4)}`;
      db[key].push({
        id: newId,
        kelompok: kelompok?.trim() || 'UMUM',
        aspek: aspek.trim(),
        kategoriDeskripsi: kategoriDeskripsi?.trim() || '',
        tipePenilaian: resolvedType,
      });
    }
    saveDb(db);
    res.json({ success: true, message: `Aspek ${tahap} berhasil disimpan.`, data: buildPayload(db) });
  });

  app.delete('/api/aspek/:tahap/:id', (req, res) => {
    const tahap = req.params.tahap as TahapSupervisi;
    const id = req.params.id;
    const db = loadDb();
    const key =
      tahap === 'Persiapan'
        ? 'aspekPersiapan'
        : tahap === 'Pelaksanaan'
        ? 'aspekPelaksanaan'
        : 'aspekEvaluasi';
    db[key] = db[key].filter((a) => a.id !== id);
    db.penilaian = db.penilaian.filter((p) => !(p.tahap === tahap && p.idAspek === id));
    saveDb(db);
    res.json({ success: true, message: `Aspek ${tahap} berhasil dihapus.`, data: buildPayload(db) });
  });

  app.post('/api/users', (req, res) => {
    const { username, password, nama, role, nip, oldUsername } = req.body as Partial<UserAccount> & {
      oldUsername?: string;
    };
    if (!username?.trim() || !password?.trim() || !nama?.trim() || !role) {
      res.status(400).json({ success: false, message: 'Username, password, nama, dan role wajib diisi.' });
      return;
    }
    const db = loadDb();
    if (oldUsername) {
      const idx = db.users.findIndex((u) => u.username === oldUsername);
      if (idx === -1) {
        res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        return;
      }
      db.users[idx] = {
        username: oldUsername === 'admin' ? 'admin' : username.trim(),
        password: password.trim(),
        nama: nama.trim(),
        role: oldUsername === 'admin' ? 'Admin' : role,
        nip: nip?.trim() || '',
      };
    } else {
      if (db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
        res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
        return;
      }
      db.users.push({
        username: username.trim(),
        password: password.trim(),
        nama: nama.trim(),
        role,
        nip: nip?.trim() || '',
      });
    }
    saveDb(db);
    res.json({ success: true, message: 'Data pengguna berhasil disimpan.', data: buildPayload(db) });
  });

  app.delete('/api/users/:username', (req, res) => {
    if (req.params.username === 'admin') {
      res.status(400).json({ success: false, message: 'Akun Administrator utama tidak dapat dihapus.' });
      return;
    }
    const db = loadDb();
    db.users = db.users.filter((u) => u.username !== req.params.username);
    saveDb(db);
    res.json({ success: true, message: 'Pengguna berhasil dihapus.', data: buildPayload(db) });
  });

  app.post('/api/pengaturan', (req, res) => {
    const body = req.body as Partial<PengaturanSekolah>;
    const db = loadDb();
    db.pengaturan = { ...db.pengaturan, ...body };
    saveDb(db);
    res.json({ success: true, message: 'Pengaturan sekolah & logo kop berhasil disimpan.', data: buildPayload(db) });
  });

  app.post('/api/reset-demo', (_req, res) => {
    const seed = createSeedDatabase();
    saveDb(seed);
    res.json({ success: true, message: 'Database contoh berhasil dipulihkan.', data: buildPayload(seed) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SADIG server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
