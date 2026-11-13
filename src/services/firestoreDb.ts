import type { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ADMIN_BOOTSTRAP_EMAIL, db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AppDatabasePayload,
  AspekItem,
  CatatanTahap,
  GuruRecord,
  KelengkapanBerkas,
  PengaturanSekolah,
  PenilaianItem,
  RekapGuru,
  StatusBerkas,
  TahapSummary,
  TahapSupervisi,
  TipePenilaianAspek,
  UserAccount,
  UserRole,
} from '../types';
import { hitungPredikat } from '../types';

function sanitizeId(raw: string, maxLen = 120): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safe = cleaned || `ID_${Date.now()}`;
  return safe.slice(0, maxLen);
}

function trunc(raw: string | undefined | null, maxLen: number): string {
  return (raw ?? '').toString().slice(0, maxLen);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createDefaultSeedData() {
  const users: UserAccount[] = [
    {
      id: 'U001',
      username: 'admin',
      password: '123',
      email: ADMIN_BOOTSTRAP_EMAIL,
      nama: 'Rizky Pratama, S.Kom',
      role: 'Admin',
      nip: '19880312 201402 1 002',
    },
    {
      id: 'U002',
      username: 'pengawas',
      password: '123',
      email: '',
      nama: 'Dr. H. Zulkipli, M.Pd',
      role: 'Pengawas Sekolah',
      nip: '19731231 200112 1 022',
    },
    {
      id: 'U003',
      username: 'kepsek',
      password: '123',
      email: '',
      nama: 'Emilia Purnawadi, S.E., M.Pd',
      role: 'Kepala Sekolah',
      nip: '19780514 200312 2 005',
    },
    {
      id: 'U004',
      username: 'supervisor1',
      password: '123',
      email: '',
      nama: 'Dra. Hj. Ratna Dewi, M.Pd',
      role: 'Pengawas Supervisi',
      nip: '19750820 200212 2 003',
    },
    {
      id: 'U005',
      username: 'supervisor2',
      password: '123',
      email: '',
      nama: 'Bambang Sutrisno, S.Pd., M.Si',
      role: 'Pengawas Supervisi',
      nip: '19810410 200604 1 011',
    },
    {
      id: 'U006',
      username: 'guru1',
      password: '123',
      email: '',
      nama: 'Ahmad Hidayat, S.Pd',
      role: 'Guru',
      nip: '19850115 201001 1 004',
    },
    {
      id: 'U007',
      username: 'guru2',
      password: '123',
      email: '',
      nama: 'Siti Aminah, S.Pd., Gr',
      role: 'Guru',
      nip: '19900222 201502 2 003',
    },
    {
      id: 'U008',
      username: 'guru3',
      password: '123',
      email: '',
      nama: 'Dedi Kurniawan, M.Pd',
      role: 'Guru',
      nip: '19871109 201403 1 001',
    },
    {
      id: 'U009',
      username: 'guru4',
      password: '123',
      email: '',
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
      catatanKepsek:
        'Modul Ajar, ATP, LKPD, dan instrumen asesmen lengkap sesuai Kurikulum Merdeka.',
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
      catatanKepsek:
        'Berkas kesiapan disetujui untuk pelaksanaan observasi kelas dan evaluasi.',
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
      catatanKepsek:
        'Mohon lengkapi lampiran rubrik asesmen formatif dan LKPD terdiferensiasi pada tautan Drive.',
    },
  ];

  const aspekPersiapan: AspekItem[] = [
    { id: 'P1', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Identitas Modul Ajar / Perangkat Pembelajaran', kategoriDeskripsi: 'Mencantumkan satuan pendidikan, mata pelajaran, fase/kelas, semester, dan alokasi waktu.', tipePenilaian: 'skor', orderIndex: 1 },
    { id: 'P2', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Identifikasi Kesiapan Peserta Didik', kategoriDeskripsi: 'Memetakan kesiapan belajar, minat, dan profil belajar murid berbasis asesmen diagnostik.', tipePenilaian: 'skor', orderIndex: 2 },
    { id: 'P3', kelompok: 'I. IDENTITAS & CAPAIAN', aspek: 'Dimensi Profil Lulusan / Profil Pelajar Pancasila', kategoriDeskripsi: 'Menentukan dimensi karakter yang relevan dan terintegrasi pada tujuan pembelajaran.', tipePenilaian: 'skor', orderIndex: 3 },
    { id: 'P4', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Perumusan CP, TP, dan Alur Tujuan Pembelajaran (ATP)', kategoriDeskripsi: 'Tujuan pembelajaran terukur, selaras dengan Capaian Pembelajaran fase terkini.', tipePenilaian: 'skor', orderIndex: 4 },
    { id: 'P5', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Pemilihan Model & Pedagogi Pembelajaran Mendalam', kategoriDeskripsi: 'Merancang pengalaman belajar memahami, mengaplikasikan, dan merefleksikan materi.', tipePenilaian: 'skor', orderIndex: 5 },
    { id: 'P6', kelompok: 'II. DESAIN PEMBELAJARAN', aspek: 'Langkah Pembelajaran Berdiferensiasi', kategoriDeskripsi: 'Kegiatan pendahuluan, inti, dan penutup mengakomodasi kebutuhan belajar beragam.', tipePenilaian: 'skor', orderIndex: 6 },
    { id: 'P7', kelompok: 'III. ASESMEN & SUMBER BELAJAR', aspek: 'Rancangan Asesmen Awal, Formatif, dan Sumatif', kategoriDeskripsi: 'Tersedia instrumen dan rubrik penilaian autentik yang terukur dan objektif.', tipePenilaian: 'skor', orderIndex: 7 },
    { id: 'P8', kelompok: 'III. ASESMEN & SUMBER BELAJAR', aspek: 'Media Digital, LKPD, dan Bahan Ajar Kontekstual', kategoriDeskripsi: 'Melampirkan LKPD, bahan bacaan relevan, dan pemanfaatan media pembelajaran digital.', tipePenilaian: 'skor', orderIndex: 8 },
  ];

  const aspekPelaksanaan: AspekItem[] = [
    { id: 'L1', kelompok: 'I. KEGIATAN PENDAHULUAN', aspek: 'Pengondisian Kelas & Kesepakatan Belajar', kategoriDeskripsi: 'Menciptakan suasana aman, nyaman, berdoa, dan menegakkan kesepakatan kelas positif.', tipePenilaian: 'skor', orderIndex: 1 },
    { id: 'L2', kelompok: 'I. KEGIATAN PENDAHULUAN', aspek: 'Apersepsi, Motivasi & Penyampaian Tujuan', kategoriDeskripsi: 'Mengaitkan materi dengan pengalaman nyata murid dan menyampaikan tujuan pembelajaran.', tipePenilaian: 'skor', orderIndex: 2 },
    { id: 'L3', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Penguasaan Materi & Pertanyaan Pemantik Kritis', kategoriDeskripsi: 'Menyajikan materi terstruktur dengan pertanyaan pemantik yang merangsang nalar kritis.', tipePenilaian: 'skor', orderIndex: 3 },
    { id: 'L4', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Fasilitasi Kolaborasi & Diferensiasi Proses', kategoriDeskripsi: 'Mendampingi kelompok belajar secara adil dan adaptif sesuai kebutuhan murid.', tipePenilaian: 'skor', orderIndex: 4 },
    { id: 'L5', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Pemanfaatan Teknologi & Media Interaktif', kategoriDeskripsi: 'Menggunakan perangkat digital/alat peraga secara efektif untuk memperjelas konsep.', tipePenilaian: 'skor', orderIndex: 5 },
    { id: 'L6', kelompok: 'II. KEGIATAN INTI (PEMBELAJARAN MENDALAM)', aspek: 'Asesmen Formatif & Umpan Balik Konstruktif', kategoriDeskripsi: 'Memantau proses belajar murid dan memberi umpan balik langsung yang membangun.', tipePenilaian: 'skor', orderIndex: 6 },
    { id: 'L7', kelompok: 'III. KEGIATAN PENUTUP', aspek: 'Penyimpulan Bersama & Refleksi Pembelajaran', kategoriDeskripsi: 'Melibatkan murid menyimpulkan inti materi dan merefleksikan pengalaman belajar.', tipePenilaian: 'skor', orderIndex: 7 },
    { id: 'L8', kelompok: 'III. KEGIATAN PENUTUP', aspek: 'Asesmen Akhir & Tindak Lanjut Pertemuan', kategoriDeskripsi: 'Melakukan pengecekan ketercapaian tujuan dan menginformasikan rencana pertemuan berikutnya.', tipePenilaian: 'skor', orderIndex: 8 },
  ];

  const aspekEvaluasi: AspekItem[] = [
    { id: 'E1', kelompok: 'I. ANALISIS HASIL ASESMEN', aspek: 'Rekapitulasi & Analisis Ketuntasan Hasil Belajar', kategoriDeskripsi: 'Dialog refleksi bersama guru mengenai capaian asesmen formatif/sumatif murid.', tipePenilaian: 'teks', orderIndex: 1 },
    { id: 'E2', kelompok: 'I. ANALISIS HASIL ASESMEN', aspek: 'Identifikasi Butir Soal / Indikator Belum Tuntas', kategoriDeskripsi: 'Dialog mengenai materi esensial yang masih mengalami miskonsepsi atau di bawah KKTP.', tipePenilaian: 'teks', orderIndex: 2 },
    { id: 'E3', kelompok: 'II. PROGRAM TINDAK LANJUT', aspek: 'Pelaksanaan Program Remedial Terstruktur', kategoriDeskripsi: 'Kesepakatan strategi pendampingan ulang bagi murid yang belum mencapai tujuan.', tipePenilaian: 'teks', orderIndex: 3 },
    { id: 'E4', kelompok: 'II. PROGRAM TINDAK LANJUT', aspek: 'Pelaksanaan Program Pengayaan & Tantangan Lanjut', kategoriDeskripsi: 'Umpan balik atas tugas pengayaan kontekstual bagi murid yang melampaui capaian.', tipePenilaian: 'teks', orderIndex: 4 },
    { id: 'E5', kelompok: 'III. REFLEKSI & PELAPORAN', aspek: 'Refleksi Profesional Guru atas Efektivitas Mengajar', kategoriDeskripsi: 'Hasil dialog kekuatan mengajar, kendala kelas, dan perbaikan strategi pedagogis.', tipePenilaian: 'teks', orderIndex: 5 },
    { id: 'E6', kelompok: 'III. REFLEKSI & PELAPORAN', aspek: 'Dokumentasi Portofolio & Pelaporan Berkala', kategoriDeskripsi: 'Catatan kelengkapan portofolio murid dan penyampaian progres ke orang tua/sekolah.', tipePenilaian: 'teks', orderIndex: 6 },
  ];

  const penilaian: PenilaianItem[] = [
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P1', tahap: 'Persiapan', skor: 4, catatan: 'Identitas modul ajar sangat lengkap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P2', tahap: 'Persiapan', skor: 4, catatan: 'Pemetaan asesmen diagnostik awal tersedia.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P3', tahap: 'Persiapan', skor: 3, catatan: 'Dimensi bernalar kritis terintegrasi baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P4', tahap: 'Persiapan', skor: 4, catatan: 'ATP runtut sesuai fase D.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P5', tahap: 'Persiapan', skor: 4, catatan: 'Model problem-based learning tergambar jelas.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P6', tahap: 'Persiapan', skor: 3, catatan: 'Diferensiasi konten sudah disiapkan.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P7', tahap: 'Persiapan', skor: 4, catatan: 'Rubrik penilaian sangat terukur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'P8', tahap: 'Persiapan', skor: 4, catatan: 'LKPD interaktif GeoGebra terlampir.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L1', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kelas kondusif dan interaktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L2', tahap: 'Pelaksanaan', skor: 4, catatan: 'Apersepsi kontekstual menarik perhatian siswa.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L3', tahap: 'Pelaksanaan', skor: 4, catatan: 'Pertanyaan pemantik memicu diskusi aktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L4', tahap: 'Pelaksanaan', skor: 3, catatan: 'Pendampingan kelompok merata.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L5', tahap: 'Pelaksanaan', skor: 4, catatan: 'Visualisasi grafik digital sangat membantu.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L6', tahap: 'Pelaksanaan', skor: 3, catatan: 'Umpan balik lisan diberikan tepat waktu.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L7', tahap: 'Pelaksanaan', skor: 4, catatan: 'Siswa menyimpulkan materi dengan percaya diri.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G001', nipGuru: '19850115 201001 1 004', idAspek: 'L8', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kuis formatif akhir berjalan tertib.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E1',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru memaparkan 87% murid telah mencapai KKTP pada materi persamaan linear; 4 murid masih perlu pendampingan pemodelan soal cerita.',
      catatan: 'Analisis per TP sudah terdokumentasi rapi.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E2',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Disepakati bersama bahwa miskonsepsi terbesar terjadi saat menerjemahkan kalimat perbandingan ke bentuk aljabar.',
      catatan: 'Perlu variasi latihan kontekstual.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E3',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru menjadwalkan klinik belajar kelompok kecil 30 menit pasca jam pelajaran menggunakan alat peraga kartu aljabar.',
      catatan: 'Jadwal remedial sudah dikomunikasikan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E4',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Murid yang melampaui capaian diberi tantangan proyek eksplorasi tarif transportasi lokal dengan GeoGebra.',
      catatan: 'Sangat kontekstual.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E5',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Guru merefleksikan perlunya pembagian peran moderator dan pencatat pada diskusi kelompok agar 2 siswa pasif lebih terlibat.',
      catatan: 'Komitmen perbaikan jelas.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      idAspek: 'E6',
      tahap: 'Evaluasi',
      skor: null,
      teksRefleksi: 'Portofolio hasil LKPD digital sudah tersimpan di folder kelas dan rekap nilai formatif siap dilaporkan ke wali kelas.',
      catatan: 'Tertib administrasi.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
    },

    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P1', tahap: 'Persiapan', skor: 4, catatan: 'Lengkap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P2', tahap: 'Persiapan', skor: 3, catatan: 'Sudah ada pemetaan gaya belajar.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P3', tahap: 'Persiapan', skor: 3, catatan: 'Baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P4', tahap: 'Persiapan', skor: 3, catatan: 'Tujuan terukur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P5', tahap: 'Persiapan', skor: 4, catatan: 'Menggunakan pendekatan teks autentik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P6', tahap: 'Persiapan', skor: 3, catatan: 'Cukup terstruktur.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P7', tahap: 'Persiapan', skor: 3, catatan: 'Rubrik teks persuasi tersedia.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'P8', tahap: 'Persiapan', skor: 3, catatan: 'LKPD cetak dan digital siap.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },

    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L1', tahap: 'Pelaksanaan', skor: 4, catatan: 'Kesepakatan kelas berjalan baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L2', tahap: 'Pelaksanaan', skor: 3, catatan: 'Apersepsi baik.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L3', tahap: 'Pelaksanaan', skor: 3, catatan: 'Diskusi teks hidup.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L4', tahap: 'Pelaksanaan', skor: 3, catatan: 'Perlu manajemen waktu kelompok.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L5', tahap: 'Pelaksanaan', skor: 4, catatan: 'Slide presentasi interaktif.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L6', tahap: 'Pelaksanaan', skor: 3, catatan: 'Umpan balik cukup jelas.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L7', tahap: 'Pelaksanaan', skor: 3, catatan: 'Refleksi tertulis dilakukan.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
    { guruId: 'G002', nipGuru: '19900222 201502 2 003', idAspek: 'L8', tahap: 'Pelaksanaan', skor: 3, catatan: 'Penutup tertib.', penilai: 'Dra. Hj. Ratna Dewi, M.Pd' },
  ];

  const catatanTahap: CatatanTahap[] = [
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      tahap: 'Persiapan',
      masalah: 'Alokasi waktu untuk diferensiasi produk pada modul ajar masih terlalu padat dalam 2 JP.',
      pemecahan: 'Memecah aktivitas eksplorasi proyek mini ke dalam LKPD terstruktur berbasis kelompok.',
      rencanaTL: 'Guru menyempurnakan pembagian alokasi waktu pada pertemuan siklus berikutnya.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-10',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      tahap: 'Pelaksanaan',
      masalah: 'Dua siswa di barisan belakang masih pasif saat sesi presentasi kelompok.',
      pemecahan: 'Menerapkan pembagian peran spesifik (moderator, penyaji, penanya) di tiap kelompok.',
      rencanaTL: 'Pendampingan variasi teknik bertanya terbuka pada observasi lanjutan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-10',
    },
    {
      guruId: 'G001',
      nipGuru: '19850115 201001 1 004',
      tahap: 'Evaluasi',
      masalah: '4 siswa masih mengalami kesulitan pada soal pemecahan masalah berbasis cerita kontekstual.',
      pemecahan: 'Menyusun modul remedial bertahap dengan visualisasi model konkret.',
      rencanaTL: 'Melaksanakan klinik belajar 30 menit pasca jam pelajaran dan melaporkan perkembangan.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-11',
    },
    {
      guruId: 'G002',
      nipGuru: '19900222 201502 2 003',
      tahap: 'Persiapan',
      masalah: 'Rubrik penilaian keterampilan menulis belum mencantumkan indikator kelengkapan argumen.',
      pemecahan: 'Menambahkan deskriptor skor 1–4 khusus aspek kohesi dan bukti argumen.',
      rencanaTL: 'Revisi rubrik diunggah ulang ke folder perangkat Drive.',
      penilai: 'Dra. Hj. Ratna Dewi, M.Pd',
      updatedAt: '2026-11-12',
    },
    {
      guruId: 'G002',
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

export function computeTahapSummary(
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

export function buildRekap(
  guru: GuruRecord[],
  aspekPersiapan: AspekItem[],
  aspekPelaksanaan: AspekItem[],
  aspekEvaluasi: AspekItem[],
  penilaian: PenilaianItem[]
): RekapGuru[] {
  return guru.map((g) => {
    const persiapan = computeTahapSummary(g.nip, 'Persiapan', aspekPersiapan, penilaian);
    const pelaksanaan = computeTahapSummary(g.nip, 'Pelaksanaan', aspekPelaksanaan, penilaian);
    const evaluasi = computeTahapSummary(g.nip, 'Evaluasi', aspekEvaluasi, penilaian);

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
      predikatAkhir: availableScores.length > 0 ? hitungPredikat(nilaiRata) : 'Belum Lengkap',
      sudahLengkap,
    };
  });
}

function resolveRoleEmails(
  directoryUsers: UserAccount[],
  guruNip: string,
  guruNama: string,
  supervisorNama: string
) {
  const guruMatch = directoryUsers.find(
    (u) => (guruNip && u.nip === guruNip) || (guruNama && u.nama === guruNama)
  );
  const spvMatch = directoryUsers.find((u) => supervisorNama && u.nama === supervisorNama);
  const kepsekMatch = directoryUsers.find((u) => u.role === 'Kepala Sekolah');
  const pengawasMatch = directoryUsers.find((u) => u.role === 'Pengawas Sekolah');

  return {
    guruEmail: trunc(guruMatch?.email || '', 200),
    supervisorEmail: trunc(spvMatch?.email || '', 200),
    kepsekEmail: trunc(kepsekMatch?.email || '', 200),
    pengawasEmail: trunc(pengawasMatch?.email || '', 200),
  };
}

export async function ensureUserProfile(firebaseUser: FirebaseUser): Promise<UserAccount> {
  const uid = sanitizeId(firebaseUser.uid, 128);
  const email = trunc(firebaseUser.email || '', 200);
  const isBootstrapAdmin = email === ADMIN_BOOTSTRAP_EMAIL;
  const userRef = doc(db, 'users', uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  if (snap.exists()) {
    const d = snap.data();
    const role = (isBootstrapAdmin ? 'Admin' : d.role || 'Guru') as UserRole;
    if (isBootstrapAdmin && d.role !== 'Admin') {
      try {
        await updateDoc(userRef, { role: 'Admin', updatedAt: serverTimestamp() });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
    return {
      id: uid,
      uid,
      email: d.email || email,
      username: d.username || uid,
      password: '•••',
      nama: d.nama || firebaseUser.displayName || email,
      role,
      nip: d.nip || '',
    };
  }

  const rawUsername = (email.split('@')[0] || 'pengguna').replace(/[^a-zA-Z0-9_.-]/g, '');
  const username = (rawUsername.length >= 2 ? rawUsername : `user_${uid.slice(0, 6)}`).slice(0, 64);
  const rawName = (firebaseUser.displayName || username).trim();
  const nama = (rawName.length >= 2 ? rawName : 'Pengguna SADIG').slice(0, 150);
  const role: UserRole = isBootstrapAdmin ? 'Admin' : 'Guru';

  try {
    await setDoc(userRef, {
      uid,
      email,
      username,
      nama,
      role,
      nip: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
  }

  return {
    id: uid,
    uid,
    email,
    username,
    password: '•••',
    nama,
    role,
    nip: '',
  };
}

export async function ensureInitialSeed(
  firebaseUser: FirebaseUser,
  userProfile: UserAccount
): Promise<boolean> {
  const settingsRef = doc(db, 'pengaturan', 'sekolah');
  let settingsSnap;
  try {
    settingsSnap = await getDoc(settingsRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'pengaturan/sekolah');
  }

  if (settingsSnap.exists()) {
    return true;
  }

  if (userProfile.role !== 'Admin') {
    return false;
  }

  const uid = sanitizeId(firebaseUser.uid, 128);
  const seed = createDefaultSeedData();

  // Batch 1: settings, directoryUsers, aspek, guru (must commit before penilaian/catatanTahap due to Master Gate exists() rule)
  const batch1 = writeBatch(db);
  batch1.set(settingsRef, {
    ...seed.pengaturan,
    logoKiri: seed.pengaturan.logoKiri || '',
    logoKanan: seed.pengaturan.logoKanan || '',
    ownerUid: uid,
    updatedAt: serverTimestamp(),
  });

  seed.users.forEach((u) => {
    const id = sanitizeId(u.id || u.username, 64);
    batch1.set(doc(db, 'directoryUsers', id), {
      id,
      username: trunc(u.username, 64),
      password: trunc(u.password || '123', 64),
      email: trunc(u.email || '', 200),
      nama: trunc(u.nama, 150),
      role: u.role,
      nip: trunc(u.nip, 40),
      ownerUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const allAspek: Array<{ tahap: TahapSupervisi; list: AspekItem[] }> = [
    { tahap: 'Persiapan', list: seed.aspekPersiapan },
    { tahap: 'Pelaksanaan', list: seed.aspekPelaksanaan },
    { tahap: 'Evaluasi', list: seed.aspekEvaluasi },
  ];
  allAspek.forEach(({ tahap, list }) => {
    list.forEach((a, idx) => {
      const id = sanitizeId(a.id, 64);
      batch1.set(doc(db, 'aspek', id), {
        id,
        tahap,
        kelompok: trunc(a.kelompok, 150),
        aspek: trunc(a.aspek, 300),
        kategoriDeskripsi: trunc(a.kategoriDeskripsi, 1000),
        tipePenilaian: a.tipePenilaian || 'skor',
        orderIndex: a.orderIndex ?? idx + 1,
        publicCatalog: true,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  seed.guru.forEach((g) => {
    const id = sanitizeId(g.id, 64);
    batch1.set(doc(db, 'guru', id), {
      id,
      nip: trunc(g.nip, 40),
      namaGuru: trunc(g.namaGuru, 150),
      mataPelajaran: trunc(g.mataPelajaran, 100),
      tanggalPelaksanaan: trunc(g.tanggalPelaksanaan, 20),
      supervisor: trunc(g.supervisor, 150),
      nipSupervisor: trunc(g.nipSupervisor, 40),
      statusBerkas: g.statusBerkas,
      kelengkapanBerkas: g.kelengkapanBerkas,
      linkDriveBerkas: trunc(g.linkDriveBerkas, 500),
      catatanKepsek: trunc(g.catatanKepsek, 1000),
      ownerUid: uid,
      guruEmail: '',
      supervisorEmail: '',
      kepsekEmail: '',
      pengawasEmail: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_batch_1');
  }

  // Batch 2: penilaian & catatanTahap for approved teachers
  const batch2 = writeBatch(db);
  seed.penilaian.forEach((p) => {
    const guruId = sanitizeId(p.guruId || 'G001', 64);
    const pid = sanitizeId(`${guruId}_${p.idAspek}`, 128);
    batch2.set(doc(db, 'penilaian', pid), {
      id: pid,
      guruId,
      nipGuru: trunc(p.nipGuru, 40),
      idAspek: sanitizeId(p.idAspek, 64),
      tahap: p.tahap,
      skor: p.skor,
      teksRefleksi: trunc(p.teksRefleksi || '', 3000),
      catatan: trunc(p.catatan, 1000),
      penilai: trunc(p.penilai, 150),
      ownerUid: uid,
      guruEmail: '',
      supervisorEmail: '',
      kepsekEmail: '',
      pengawasEmail: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  seed.catatanTahap.forEach((c) => {
    const guruId = sanitizeId(c.guruId || 'G001', 64);
    const cid = sanitizeId(`${guruId}_${c.tahap}`, 128);
    batch2.set(doc(db, 'catatanTahap', cid), {
      id: cid,
      guruId,
      nipGuru: trunc(c.nipGuru, 40),
      tahap: c.tahap,
      masalah: trunc(c.masalah, 2000),
      pemecahan: trunc(c.pemecahan, 2000),
      rencanaTL: trunc(c.rencanaTL, 2000),
      penilai: trunc(c.penilai, 150),
      updatedAtDate: trunc(c.updatedAt || todayIso(), 20),
      ownerUid: uid,
      guruEmail: '',
      supervisorEmail: '',
      kepsekEmail: '',
      pengawasEmail: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_batch_2');
  }

  return true;
}

async function queryRoleScopedCollection(
  collectionName: 'guru' | 'penilaian' | 'catatanTahap',
  email: string,
  uid: string
): Promise<Array<Record<string, unknown>>> {
  const isBootstrapped = email === ADMIN_BOOTSTRAP_EMAIL;
  if (isBootstrapped) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  }

  const fields = ['ownerUid', 'guruEmail', 'supervisorEmail', 'kepsekEmail', 'pengawasEmail'] as const;
  const merged = new Map<string, Record<string, unknown>>();
  try {
    const results = await Promise.all(
      fields.map((field) => {
        const val = field === 'ownerUid' ? uid : email;
        if (!val) return Promise.resolve(null);
        return getDocs(query(collection(db, collectionName), where(field, '==', val)));
      })
    );
    results.forEach((snap) => {
      if (!snap) return;
      snap.docs.forEach((d) => {
        merged.set(d.id, { id: d.id, ...d.data() });
      });
    });
    return Array.from(merged.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

export async function fetchSadigData(
  authEmail: string,
  authUid: string,
  isTrueAdmin: boolean
): Promise<AppDatabasePayload> {
  const seed = createDefaultSeedData();

  let pengaturanSnap;
  try {
    pengaturanSnap = await getDoc(doc(db, 'pengaturan', 'sekolah'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'pengaturan/sekolah');
  }

  if (!pengaturanSnap.exists()) {
    return {
      ...seed,
      rekap: buildRekap(
        seed.guru,
        seed.aspekPersiapan,
        seed.aspekPelaksanaan,
        seed.aspekEvaluasi,
        seed.penilaian
      ),
    };
  }

  const rawPengaturan = pengaturanSnap.data();
  const pengaturan: PengaturanSekolah = {
    namaSekolah: rawPengaturan.namaSekolah || seed.pengaturan.namaSekolah,
    dinasPendidikan: rawPengaturan.dinasPendidikan || seed.pengaturan.dinasPendidikan,
    pemerintahDaerah: rawPengaturan.pemerintahDaerah || seed.pengaturan.pemerintahDaerah,
    alamatSekolah: rawPengaturan.alamatSekolah || seed.pengaturan.alamatSekolah,
    tahunPelajaran: rawPengaturan.tahunPelajaran || seed.pengaturan.tahunPelajaran,
    semester: rawPengaturan.semester || seed.pengaturan.semester,
    namaKepalaSekolah: rawPengaturan.namaKepalaSekolah || seed.pengaturan.namaKepalaSekolah,
    nipKepalaSekolah: rawPengaturan.nipKepalaSekolah || seed.pengaturan.nipKepalaSekolah,
    namaPengawasSekolah: rawPengaturan.namaPengawasSekolah || seed.pengaturan.namaPengawasSekolah,
    nipPengawas: rawPengaturan.nipPengawas || seed.pengaturan.nipPengawas,
    tanggalPelaksanaanUmum:
      rawPengaturan.tanggalPelaksanaanUmum || seed.pengaturan.tanggalPelaksanaanUmum,
    tempatTanggalCetak: rawPengaturan.tempatTanggalCetak || seed.pengaturan.tempatTanggalCetak,
    logoKiri: rawPengaturan.logoKiri || '',
    logoKanan: rawPengaturan.logoKanan || '',
  };

  try {
    localStorage.setItem(
      'sadig_public_branding_v1',
      JSON.stringify({
        namaSekolah: pengaturan.namaSekolah,
        logoKiri: pengaturan.logoKiri || '',
        logoKanan: pengaturan.logoKanan || '',
      })
    );
  } catch {
    // ignore storage errors
  }

  let aspekSnap;
  try {
    aspekSnap = await getDocs(
      query(collection(db, 'aspek'), where('publicCatalog', '==', true))
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'aspek');
  }

  const allAspekDocs = aspekSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>))
    .sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0));

  const mapAspek = (tahap: TahapSupervisi): AspekItem[] =>
    allAspekDocs
      .filter((a) => a.tahap === tahap)
      .map((a) => ({
        id: String(a.id),
        kelompok: String(a.kelompok || ''),
        aspek: String(a.aspek || ''),
        kategoriDeskripsi: String(a.kategoriDeskripsi || ''),
        tipePenilaian: (a.tipePenilaian === 'teks' ? 'teks' : 'skor') as TipePenilaianAspek,
        orderIndex: Number(a.orderIndex ?? 0),
      }));

  const aspekPersiapan = mapAspek('Persiapan');
  const aspekPelaksanaan = mapAspek('Pelaksanaan');
  const aspekEvaluasi = mapAspek('Evaluasi');

  let users: UserAccount[] = [];
  if (isTrueAdmin && authEmail === ADMIN_BOOTSTRAP_EMAIL) {
    try {
      const usersSnap = await getDocs(collection(db, 'directoryUsers'));
      users = usersSnap.docs
        .map((d) => {
          const u = d.data();
          return {
            id: d.id,
            username: String(u.username || ''),
            password: String(u.password || '•••'),
            email: String(u.email || ''),
            nama: String(u.nama || ''),
            role: (u.role || 'Guru') as UserRole,
            nip: String(u.nip || ''),
          };
        })
        .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'directoryUsers');
    }
  }

  const [rawGuru, rawPenilaian, rawCatatan] = await Promise.all([
    queryRoleScopedCollection('guru', authEmail, authUid),
    queryRoleScopedCollection('penilaian', authEmail, authUid),
    queryRoleScopedCollection('catatanTahap', authEmail, authUid),
  ]);

  const guru: GuruRecord[] = rawGuru
    .map((g) => ({
      id: String(g.id),
      nip: String(g.nip || ''),
      namaGuru: String(g.namaGuru || ''),
      mataPelajaran: String(g.mataPelajaran || ''),
      tanggalPelaksanaan: String(g.tanggalPelaksanaan || ''),
      supervisor: String(g.supervisor || ''),
      nipSupervisor: String(g.nipSupervisor || ''),
      statusBerkas: (g.statusBerkas || 'Belum Dicek') as StatusBerkas,
      kelengkapanBerkas: (g.kelengkapanBerkas || 'Belum Ada') as KelengkapanBerkas,
      linkDriveBerkas: String(g.linkDriveBerkas || ''),
      catatanKepsek: String(g.catatanKepsek || ''),
      guruEmail: String(g.guruEmail || ''),
      supervisorEmail: String(g.supervisorEmail || ''),
      kepsekEmail: String(g.kepsekEmail || ''),
      pengawasEmail: String(g.pengawasEmail || ''),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const penilaian: PenilaianItem[] = rawPenilaian.map((p) => ({
    id: String(p.id),
    guruId: String(p.guruId || ''),
    nipGuru: String(p.nipGuru || ''),
    idAspek: String(p.idAspek || ''),
    tahap: p.tahap as TahapSupervisi,
    skor: p.skor === null || p.skor === undefined ? null : (Number(p.skor) as 1 | 2 | 3 | 4),
    teksRefleksi: String(p.teksRefleksi || ''),
    catatan: String(p.catatan || ''),
    penilai: String(p.penilai || ''),
  }));

  const catatanTahap: CatatanTahap[] = rawCatatan.map((c) => ({
    id: String(c.id),
    guruId: String(c.guruId || ''),
    nipGuru: String(c.nipGuru || ''),
    tahap: c.tahap as TahapSupervisi,
    masalah: String(c.masalah || ''),
    pemecahan: String(c.pemecahan || ''),
    rencanaTL: String(c.rencanaTL || ''),
    penilai: String(c.penilai || ''),
    updatedAt: String(c.updatedAtDate || todayIso()),
  }));

  return {
    users,
    guru,
    aspekPersiapan,
    aspekPelaksanaan,
    aspekEvaluasi,
    penilaian,
    catatanTahap,
    pengaturan,
    rekap: buildRekap(guru, aspekPersiapan, aspekPelaksanaan, aspekEvaluasi, penilaian),
  };
}

// === MUTATIONS ===

export async function saveGuruFs(
  input: Partial<GuruRecord>,
  directoryUsers: UserAccount[],
  existingGuru: GuruRecord[],
  ownerUid: string
): Promise<void> {
  const spv = directoryUsers.find((u) => u.nama === input.supervisor);
  const emails = resolveRoleEmails(
    directoryUsers,
    input.nip || '',
    input.namaGuru || '',
    input.supervisor || ''
  );

  if (input.id) {
    const id = sanitizeId(input.id, 64);
    const ref = doc(db, 'guru', id);
    try {
      await updateDoc(ref, {
        nip: trunc(input.nip, 40),
        namaGuru: trunc(input.namaGuru, 150),
        mataPelajaran: trunc(input.mataPelajaran, 100),
        tanggalPelaksanaan: trunc(input.tanggalPelaksanaan, 20),
        supervisor: trunc(input.supervisor, 150),
        nipSupervisor: trunc(spv?.nip || input.nipSupervisor || '', 40),
        guruEmail: trunc(input.guruEmail ?? emails.guruEmail, 200),
        supervisorEmail: trunc(input.supervisorEmail ?? emails.supervisorEmail, 200),
        kepsekEmail: emails.kepsekEmail,
        pengawasEmail: emails.pengawasEmail,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guru/${id}`);
    }
    return;
  }

  const maxNum = existingGuru.reduce((max, g) => {
    const n = parseInt(g.id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const newId = `G${String(maxNum + 1).padStart(3, '0')}`;
  try {
    await setDoc(doc(db, 'guru', newId), {
      id: newId,
      nip: trunc(input.nip, 40),
      namaGuru: trunc(input.namaGuru, 150),
      mataPelajaran: trunc(input.mataPelajaran, 100),
      tanggalPelaksanaan: trunc(input.tanggalPelaksanaan, 20),
      supervisor: trunc(input.supervisor, 150),
      nipSupervisor: trunc(spv?.nip || input.nipSupervisor || '', 40),
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: '',
      catatanKepsek: '',
      ownerUid: sanitizeId(ownerUid, 128),
      guruEmail: trunc(input.guruEmail || emails.guruEmail, 200),
      supervisorEmail: trunc(input.supervisorEmail || emails.supervisorEmail, 200),
      kepsekEmail: emails.kepsekEmail,
      pengawasEmail: emails.pengawasEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `guru/${newId}`);
  }
}

export async function bulkImportGuruFs(
  items: Array<Partial<GuruRecord>>,
  directoryUsers: UserAccount[],
  existingGuru: GuruRecord[],
  defaultDate: string,
  ownerUid: string
): Promise<number> {
  const validItems = items.filter((it) => it.namaGuru?.trim() && it.nip?.trim());
  if (validItems.length === 0) return 0;

  let maxNum = existingGuru.reduce((max, g) => {
    const n = parseInt(g.id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const batch = writeBatch(db);
  validItems.forEach((it) => {
    maxNum += 1;
    const newId = `G${String(maxNum).padStart(3, '0')}`;
    const spv = directoryUsers.find((u) => u.nama === it.supervisor);
    const emails = resolveRoleEmails(
      directoryUsers,
      it.nip || '',
      it.namaGuru || '',
      it.supervisor || ''
    );
    batch.set(doc(db, 'guru', newId), {
      id: newId,
      nip: trunc(it.nip?.trim(), 40),
      namaGuru: trunc(it.namaGuru?.trim(), 150),
      mataPelajaran: trunc(it.mataPelajaran?.trim() || 'Umum', 100),
      tanggalPelaksanaan: trunc(it.tanggalPelaksanaan?.trim() || defaultDate, 20),
      supervisor: trunc(it.supervisor?.trim() || '', 150),
      nipSupervisor: trunc(spv?.nip || '', 40),
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: '',
      catatanKepsek: '',
      ownerUid: sanitizeId(ownerUid, 128),
      guruEmail: emails.guruEmail,
      supervisorEmail: emails.supervisorEmail,
      kepsekEmail: emails.kepsekEmail,
      pengawasEmail: emails.pengawasEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'guru/bulk');
  }
  return validItems.length;
}

export async function deleteGuruFs(id: string): Promise<void> {
  const safeId = sanitizeId(id, 64);
  try {
    await deleteDoc(doc(db, 'guru', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `guru/${safeId}`);
  }
}

export async function uploadBerkasGuruFs(idGuru: string, linkDriveBerkas: string): Promise<void> {
  const safeId = sanitizeId(idGuru, 64);
  try {
    await updateDoc(doc(db, 'guru', safeId), {
      linkDriveBerkas: trunc(linkDriveBerkas.trim(), 500),
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `guru/${safeId}`);
  }
}

export async function verifikasiKepsekFs(
  idGuru: string,
  kelengkapanBerkas: KelengkapanBerkas,
  statusBerkas: StatusBerkas,
  catatanKepsek: string
): Promise<void> {
  const safeId = sanitizeId(idGuru, 64);
  try {
    await updateDoc(doc(db, 'guru', safeId), {
      kelengkapanBerkas,
      statusBerkas,
      catatanKepsek: trunc(catatanKepsek, 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `guru/${safeId}`);
  }
}

export async function savePenilaianFs(params: {
  guru: GuruRecord;
  tahap: TahapSupervisi;
  items: Array<{
    idAspek: string;
    skor: 1 | 2 | 3 | 4 | null;
    teksRefleksi?: string;
    catatan: string;
  }>;
  masalah: string;
  pemecahan: string;
  rencanaTL: string;
  penilai: string;
  ownerUid: string;
  directoryUsers: UserAccount[];
}): Promise<void> {
  const { guru, tahap, items, masalah, pemecahan, rencanaTL, penilai, ownerUid, directoryUsers } =
    params;
  const safeGuruId = sanitizeId(guru.id, 64);
  const emails = resolveRoleEmails(directoryUsers, guru.nip, guru.namaGuru, guru.supervisor);

  // Check existing documents first so updateDoc vs setDoc matches Firestore Rules precisely
  const itemDocs = await Promise.all(
    items.map(async (item) => {
      const pid = sanitizeId(`${safeGuruId}_${item.idAspek}`, 128);
      const ref = doc(db, 'penilaian', pid);
      try {
        const snap = await getDoc(ref);
        return { item, pid, ref, exists: snap.exists() };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `penilaian/${pid}`);
      }
    })
  );

  const cid = sanitizeId(`${safeGuruId}_${tahap}`, 128);
  const catatanRef = doc(db, 'catatanTahap', cid);
  let catatanExists = false;
  try {
    const catSnap = await getDoc(catatanRef);
    catatanExists = catSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `catatanTahap/${cid}`);
  }

  const batch = writeBatch(db);
  itemDocs.forEach(({ item, pid, ref, exists }) => {
    if (exists) {
      batch.update(ref, {
        skor: item.skor,
        teksRefleksi: trunc(item.teksRefleksi || '', 3000),
        catatan: trunc(item.catatan, 1000),
        penilai: trunc(penilai || 'Pengawas Supervisi', 150),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(ref, {
        id: pid,
        guruId: safeGuruId,
        nipGuru: trunc(guru.nip, 40),
        idAspek: sanitizeId(item.idAspek, 64),
        tahap,
        skor: item.skor,
        teksRefleksi: trunc(item.teksRefleksi || '', 3000),
        catatan: trunc(item.catatan, 1000),
        penilai: trunc(penilai || 'Pengawas Supervisi', 150),
        ownerUid: sanitizeId(ownerUid, 128),
        guruEmail: guru.guruEmail || emails.guruEmail,
        supervisorEmail: guru.supervisorEmail || emails.supervisorEmail,
        kepsekEmail: guru.kepsekEmail || emails.kepsekEmail,
        pengawasEmail: guru.pengawasEmail || emails.pengawasEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });

  if (catatanExists) {
    batch.update(catatanRef, {
      masalah: trunc(masalah, 2000),
      pemecahan: trunc(pemecahan, 2000),
      rencanaTL: trunc(rencanaTL, 2000),
      penilai: trunc(penilai || 'Pengawas Supervisi', 150),
      updatedAtDate: todayIso(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(catatanRef, {
      id: cid,
      guruId: safeGuruId,
      nipGuru: trunc(guru.nip, 40),
      tahap,
      masalah: trunc(masalah, 2000),
      pemecahan: trunc(pemecahan, 2000),
      rencanaTL: trunc(rencanaTL, 2000),
      penilai: trunc(penilai || 'Pengawas Supervisi', 150),
      updatedAtDate: todayIso(),
      ownerUid: sanitizeId(ownerUid, 128),
      guruEmail: guru.guruEmail || emails.guruEmail,
      supervisorEmail: guru.supervisorEmail || emails.supervisorEmail,
      kepsekEmail: guru.kepsekEmail || emails.kepsekEmail,
      pengawasEmail: guru.pengawasEmail || emails.pengawasEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `penilaian/${safeGuruId}_${tahap}`);
  }
}

export async function saveAspekFs(
  tahap: TahapSupervisi,
  input: Partial<AspekItem>,
  existingList: AspekItem[],
  ownerUid: string
): Promise<void> {
  const tipe: TipePenilaianAspek =
    input.tipePenilaian === 'teks' || input.tipePenilaian === 'skor'
      ? input.tipePenilaian
      : tahap === 'Evaluasi'
      ? 'teks'
      : 'skor';

  if (input.id) {
    const id = sanitizeId(input.id, 64);
    try {
      await updateDoc(doc(db, 'aspek', id), {
        kelompok: trunc(input.kelompok, 150),
        aspek: trunc(input.aspek, 300),
        kategoriDeskripsi: trunc(input.kategoriDeskripsi, 1000),
        tipePenilaian: tipe,
        orderIndex: input.orderIndex ?? 1,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `aspek/${id}`);
    }
    return;
  }

  const prefix = tahap === 'Persiapan' ? 'P' : tahap === 'Pelaksanaan' ? 'L' : 'E';
  const maxNum = existingList.reduce((max, a) => {
    const n = parseInt(a.id.replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const newId = `${prefix}${maxNum + 1}`;
  try {
    await setDoc(doc(db, 'aspek', newId), {
      id: newId,
      tahap,
      kelompok: trunc(input.kelompok, 150),
      aspek: trunc(input.aspek, 300),
      kategoriDeskripsi: trunc(input.kategoriDeskripsi, 1000),
      tipePenilaian: tipe,
      orderIndex: existingList.length + 1,
      publicCatalog: true,
      ownerUid: sanitizeId(ownerUid, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `aspek/${newId}`);
  }
}

export async function deleteAspekFs(id: string): Promise<void> {
  const safeId = sanitizeId(id, 64);
  try {
    await deleteDoc(doc(db, 'aspek', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `aspek/${safeId}`);
  }
}

export async function saveDirectoryUserFs(
  input: Partial<UserAccount> & { oldUsername?: string },
  existingUsers: UserAccount[],
  ownerUid: string
): Promise<void> {
  const username = trunc((input.username || '').trim(), 64);
  const email = trunc((input.email || '').trim().toLowerCase(), 200);

  if (input.id) {
    const id = sanitizeId(input.id, 64);
    try {
      await updateDoc(doc(db, 'directoryUsers', id), {
        username,
        password: trunc(input.password || '123', 64),
        email,
        nama: trunc(input.nama, 150),
        role: input.role || 'Guru',
        nip: trunc(input.nip, 40),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `directoryUsers/${id}`);
    }
  } else {
    const maxNum = existingUsers.reduce((max, u) => {
      const n = parseInt((u.id || '').replace(/\D/g, ''), 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newId = `U${String(maxNum + 1).padStart(3, '0')}`;
    try {
      await setDoc(doc(db, 'directoryUsers', newId), {
        id: newId,
        username,
        password: trunc(input.password || '123', 64),
        email,
        nama: trunc(input.nama, 150),
        role: input.role || 'Guru',
        nip: trunc(input.nip, 40),
        ownerUid: sanitizeId(ownerUid, 128),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `directoryUsers/${newId}`);
    }
  }

  // Also sync role to any registered Firebase /users/{uid} account matching that email
  if (email) {
    try {
      const matchedUsers = await getDocs(
        query(collection(db, 'users'), where('email', '==', email))
      );
      await Promise.all(
        matchedUsers.docs.map((uDoc) =>
          updateDoc(uDoc.ref, {
            role: input.role || 'Guru',
            nama: trunc(input.nama, 150),
            nip: trunc(input.nip, 40),
            updatedAt: serverTimestamp(),
          })
        )
      );
    } catch {
      // Optional sync; skip silently if user hasn't logged in yet
    }
  }
}

export async function deleteDirectoryUserFs(id: string): Promise<void> {
  const safeId = sanitizeId(id, 64);
  try {
    await deleteDoc(doc(db, 'directoryUsers', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `directoryUsers/${safeId}`);
  }
}

export async function savePengaturanFs(
  input: PengaturanSekolah,
  ownerUid: string
): Promise<void> {
  const ref = doc(db, 'pengaturan', 'sekolah');
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'pengaturan/sekolah');
  }

  const fields = {
    namaSekolah: trunc(input.namaSekolah, 200),
    dinasPendidikan: trunc(input.dinasPendidikan, 200),
    pemerintahDaerah: trunc(input.pemerintahDaerah, 200),
    alamatSekolah: trunc(input.alamatSekolah, 300),
    tahunPelajaran: trunc(input.tahunPelajaran, 30),
    semester: trunc(input.semester, 30),
    namaKepalaSekolah: trunc(input.namaKepalaSekolah, 150),
    nipKepalaSekolah: trunc(input.nipKepalaSekolah, 40),
    namaPengawasSekolah: trunc(input.namaPengawasSekolah, 150),
    nipPengawas: trunc(input.nipPengawas, 40),
    tanggalPelaksanaanUmum: trunc(input.tanggalPelaksanaanUmum, 20),
    tempatTanggalCetak: trunc(input.tempatTanggalCetak, 120),
    logoKiri: trunc(input.logoKiri || '', 350000),
    logoKanan: trunc(input.logoKanan || '', 350000),
    updatedAt: serverTimestamp(),
  };

  try {
    if (snap.exists()) {
      await updateDoc(ref, fields);
    } else {
      await setDoc(ref, {
        ...fields,
        ownerUid: sanitizeId(ownerUid, 128),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
      'pengaturan/sekolah'
    );
  }
}
