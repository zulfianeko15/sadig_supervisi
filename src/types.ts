export type UserRole =
  | 'Admin'
  | 'Pengawas Sekolah'
  | 'Kepala Sekolah'
  | 'Pengawas Supervisi'
  | 'Guru';

export type StatusBerkas = 'Belum Dicek' | 'Disetujui' | 'Ditolak';
export type KelengkapanBerkas = 'Ada' | 'Belum Ada';
export type TahapSupervisi = 'Persiapan' | 'Pelaksanaan' | 'Evaluasi';
export type TipePenilaianAspek = 'skor' | 'teks';

export interface UserAccount {
  id?: string;
  uid?: string;
  email?: string;
  username: string;
  password: string;
  nama: string;
  role: UserRole;
  nip: string;
}

export interface GuruRecord {
  id: string;
  nip: string;
  namaGuru: string;
  mataPelajaran: string;
  tanggalPelaksanaan: string;
  supervisor: string;
  nipSupervisor: string;
  statusBerkas: StatusBerkas;
  kelengkapanBerkas: KelengkapanBerkas;
  linkDriveBerkas: string;
  catatanKepsek: string;
  guruEmail?: string;
  supervisorEmail?: string;
  kepsekEmail?: string;
  pengawasEmail?: string;
}

export interface AspekItem {
  id: string;
  kelompok: string;
  aspek: string;
  kategoriDeskripsi: string;
  tipePenilaian?: TipePenilaianAspek;
  orderIndex?: number;
}

export interface PenilaianItem {
  id?: string;
  guruId?: string;
  nipGuru: string;
  idAspek: string;
  tahap: TahapSupervisi;
  skor: 1 | 2 | 3 | 4 | null;
  teksRefleksi?: string;
  catatan: string;
  penilai: string;
}

export interface CatatanTahap {
  id?: string;
  guruId?: string;
  nipGuru: string;
  tahap: TahapSupervisi;
  masalah: string;
  pemecahan: string;
  rencanaTL: string;
  penilai: string;
  updatedAt: string;
}

export interface PengaturanSekolah {
  namaSekolah: string;
  dinasPendidikan: string;
  pemerintahDaerah: string;
  alamatSekolah: string;
  tahunPelajaran: string;
  semester: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  namaPengawasSekolah: string;
  nipPengawas: string;
  tanggalPelaksanaanUmum: string;
  tempatTanggalCetak: string;
  logoKiri?: string;
  logoKanan?: string;
}

export interface TahapSummary {
  jumlahAspek: number;
  terisi: number;
  totalSkor: number;
  skorMaksimal: number;
  nilai: number | null;
  predikat: string;
  mode: 'skor' | 'teks' | 'campuran';
}

export interface RekapGuru {
  guru: GuruRecord;
  persiapan: TahapSummary;
  pelaksanaan: TahapSummary;
  evaluasi: TahapSummary;
  nilaiRata: number | null;
  predikatAkhir: string;
  sudahLengkap: boolean;
}

export interface AppDatabasePayload {
  users: UserAccount[];
  guru: GuruRecord[];
  aspekPersiapan: AspekItem[];
  aspekPelaksanaan: AspekItem[];
  aspekEvaluasi: AspekItem[];
  penilaian: PenilaianItem[];
  catatanTahap: CatatanTahap[];
  pengaturan: PengaturanSekolah;
  rekap: RekapGuru[];
}

export const SKALA_RUBRIK: Array<{ skor: 1 | 2 | 3 | 4; label: string; ringkas: string }> = [
  { skor: 1, label: 'Kurang', ringkas: 'Belum memenuhi standar atau tidak tersedia' },
  { skor: 2, label: 'Cukup', ringkas: 'Sebagian terpenuhi, perlu pendampingan' },
  { skor: 3, label: 'Baik', ringkas: 'Memenuhi standar Kurikulum Merdeka' },
  { skor: 4, label: 'Amat Baik', ringkas: 'Sangat lengkap, kontekstual, dan inovatif' },
];

export function hitungPredikat(nilai: number | null): string {
  if (nilai === null || Number.isNaN(nilai)) return 'Belum Dinilai';
  if (nilai >= 86) return 'Amat Baik';
  if (nilai >= 71) return 'Baik';
  if (nilai >= 56) return 'Cukup';
  return 'Kurang';
}
