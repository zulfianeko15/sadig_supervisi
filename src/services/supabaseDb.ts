import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AppDatabasePayload,
  AspekItem,
  CatatanTahap,
  GuruRecord,
  KelengkapanBerkas,
  PengaturanSekolah,
  PenilaianItem,
  StatusBerkas,
  TahapSupervisi,
  TipePenilaianAspek,
  UserAccount,
  UserRole,
} from '../types';
import { buildRekap, createDefaultSeedData } from './firestoreDb';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

let client: SupabaseClient | null = null;
let seedPromise: Promise<void> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Konfigurasi Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) belum diatur.');
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanKey(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function ensureSupabaseSeed(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const sb = getClient();
    const { data: existingSettings, error: checkErr } = await sb
      .from('sadig_pengaturan')
      .select('id')
      .eq('id', 'sekolah')
      .maybeSingle();

    if (checkErr) {
      throw new Error(`Gagal memeriksa tabel Supabase: ${checkErr.message}`);
    }
    if (existingSettings) return;

    const seed = createDefaultSeedData();

    const { error: setErr } = await sb.from('sadig_pengaturan').upsert({
      id: 'sekolah',
      nama_sekolah: seed.pengaturan.namaSekolah,
      dinas_pendidikan: seed.pengaturan.dinasPendidikan,
      pemerintah_daerah: seed.pengaturan.pemerintahDaerah,
      alamat_sekolah: seed.pengaturan.alamatSekolah,
      tahun_pelajaran: seed.pengaturan.tahunPelajaran,
      semester: seed.pengaturan.semester,
      nama_kepala_sekolah: seed.pengaturan.namaKepalaSekolah,
      nip_kepala_sekolah: seed.pengaturan.nipKepalaSekolah,
      nama_pengawas_sekolah: seed.pengaturan.namaPengawasSekolah,
      nip_pengawas: seed.pengaturan.nipPengawas,
      tanggal_pelaksanaan_umum: seed.pengaturan.tanggalPelaksanaanUmum,
      tempat_tanggal_cetak: seed.pengaturan.tempatTanggalCetak,
      logo_kiri: seed.pengaturan.logoKiri || '',
      logo_kanan: seed.pengaturan.logoKanan || '',
    });
    if (setErr) throw new Error(`Seed pengaturan gagal: ${setErr.message}`);

    const userRows = seed.users.map((u, idx) => ({
      id: u.id || `U${String(idx + 1).padStart(3, '0')}`,
      username: u.username,
      password: u.password || '123',
      email: u.email || '',
      nama: u.nama,
      role: u.role,
      nip: u.nip || '',
    }));
    const { error: usrErr } = await sb.from('sadig_users').upsert(userRows, { onConflict: 'id' });
    if (usrErr) throw new Error(`Seed users gagal: ${usrErr.message}`);

    const aspekRows = [
      ...seed.aspekPersiapan.map((a, idx) => ({
        id: a.id,
        tahap: 'Persiapan',
        kelompok: a.kelompok,
        aspek: a.aspek,
        kategori_deskripsi: a.kategoriDeskripsi,
        tipe_penilaian: a.tipePenilaian || 'skor',
        order_index: a.orderIndex ?? idx + 1,
      })),
      ...seed.aspekPelaksanaan.map((a, idx) => ({
        id: a.id,
        tahap: 'Pelaksanaan',
        kelompok: a.kelompok,
        aspek: a.aspek,
        kategori_deskripsi: a.kategoriDeskripsi,
        tipe_penilaian: a.tipePenilaian || 'skor',
        order_index: a.orderIndex ?? idx + 1,
      })),
      ...seed.aspekEvaluasi.map((a, idx) => ({
        id: a.id,
        tahap: 'Evaluasi',
        kelompok: a.kelompok,
        aspek: a.aspek,
        kategori_deskripsi: a.kategoriDeskripsi,
        tipe_penilaian: a.tipePenilaian || 'teks',
        order_index: a.orderIndex ?? idx + 1,
      })),
    ];
    const { error: aspErr } = await sb.from('sadig_aspek').upsert(aspekRows, { onConflict: 'id' });
    if (aspErr) throw new Error(`Seed aspek gagal: ${aspErr.message}`);

    const guruRows = seed.guru.map((g) => ({
      id: g.id,
      nip: g.nip,
      nama_guru: g.namaGuru,
      mata_pelajaran: g.mataPelajaran,
      tanggal_pelaksanaan: g.tanggalPelaksanaan,
      supervisor: g.supervisor,
      nip_supervisor: g.nipSupervisor,
      status_berkas: g.statusBerkas,
      kelengkapan_berkas: g.kelengkapanBerkas,
      link_drive_berkas: g.linkDriveBerkas,
      catatan_kepsek: g.catatanKepsek,
      guru_email: g.guruEmail || '',
    }));
    const { error: guruErr } = await sb.from('sadig_guru').upsert(guruRows, { onConflict: 'id' });
    if (guruErr) throw new Error(`Seed guru gagal: ${guruErr.message}`);

    const nilaiRows = seed.penilaian.map((p) => ({
      id: `${cleanKey(p.guruId || p.nipGuru)}_${p.tahap}_${cleanKey(p.idAspek)}`,
      guru_id: p.guruId || '',
      nip_guru: p.nipGuru,
      id_aspek: p.idAspek,
      tahap: p.tahap,
      skor: p.skor,
      teks_refleksi: p.teksRefleksi || '',
      catatan: p.catatan || '',
      penilai: p.penilai || '',
    }));
    if (nilaiRows.length > 0) {
      const { error: nilErr } = await sb
        .from('sadig_penilaian')
        .upsert(nilaiRows, { onConflict: 'id' });
      if (nilErr) throw new Error(`Seed penilaian gagal: ${nilErr.message}`);
    }

    const catatanRows = seed.catatanTahap.map((c) => ({
      id: `${cleanKey(c.guruId || c.nipGuru)}_${c.tahap}`,
      guru_id: c.guruId || '',
      nip_guru: c.nipGuru,
      tahap: c.tahap,
      masalah: c.masalah,
      pemecahan: c.pemecahan,
      rencana_tl: c.rencanaTL,
      penilai: c.penilai,
      updated_at: c.updatedAt || todayIso(),
    }));
    if (catatanRows.length > 0) {
      const { error: catErr } = await sb
        .from('sadig_catatan_tahap')
        .upsert(catatanRows, { onConflict: 'id' });
      if (catErr) throw new Error(`Seed catatan gagal: ${catErr.message}`);
    }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

export async function fetchSupabaseState(): Promise<AppDatabasePayload> {
  await ensureSupabaseSeed();
  const sb = getClient();

  const [
    { data: usersData, error: usersErr },
    { data: guruData, error: guruErr },
    { data: aspekData, error: aspekErr },
    { data: penilaianData, error: penilaianErr },
    { data: catatanData, error: catatanErr },
    { data: pengaturanRow, error: pengErr },
  ] = await Promise.all([
    sb.from('sadig_users').select('*').order('id', { ascending: true }),
    sb.from('sadig_guru').select('*').order('id', { ascending: true }),
    sb.from('sadig_aspek').select('*').order('order_index', { ascending: true }),
    sb.from('sadig_penilaian').select('*'),
    sb.from('sadig_catatan_tahap').select('*'),
    sb.from('sadig_pengaturan').select('*').eq('id', 'sekolah').maybeSingle(),
  ]);

  if (usersErr) throw new Error(usersErr.message);
  if (guruErr) throw new Error(guruErr.message);
  if (aspekErr) throw new Error(aspekErr.message);
  if (penilaianErr) throw new Error(penilaianErr.message);
  if (catatanErr) throw new Error(catatanErr.message);
  if (pengErr) throw new Error(pengErr.message);

  const seed = createDefaultSeedData();

  const users: UserAccount[] = (usersData || []).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    password: String(r.password || '123'),
    email: String(r.email || ''),
    nama: String(r.nama),
    role: r.role as UserRole,
    nip: String(r.nip || ''),
  }));

  const guru: GuruRecord[] = (guruData || []).map((r) => ({
    id: String(r.id),
    nip: String(r.nip),
    namaGuru: String(r.nama_guru),
    mataPelajaran: String(r.mata_pelajaran),
    tanggalPelaksanaan: String(r.tanggal_pelaksanaan || ''),
    supervisor: String(r.supervisor || ''),
    nipSupervisor: String(r.nip_supervisor || ''),
    statusBerkas: (r.status_berkas || 'Belum Dicek') as StatusBerkas,
    kelengkapanBerkas: (r.kelengkapan_berkas || 'Belum Ada') as KelengkapanBerkas,
    linkDriveBerkas: String(r.link_drive_berkas || ''),
    catatanKepsek: String(r.catatan_kepsek || ''),
    guruEmail: String(r.guru_email || ''),
  }));

  const mapAspek = (rows: Array<Record<string, unknown>>, tahap: TahapSupervisi): AspekItem[] =>
    rows
      .filter((r) => r.tahap === tahap)
      .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
      .map((r) => ({
        id: String(r.id),
        kelompok: String(r.kelompok),
        aspek: String(r.aspek),
        kategoriDeskripsi: String(r.kategori_deskripsi || ''),
        tipePenilaian: (r.tipe_penilaian === 'teks' ? 'teks' : 'skor') as TipePenilaianAspek,
        orderIndex: Number(r.order_index || 0),
      }));

  const aspekRows = (aspekData || []) as Array<Record<string, unknown>>;
  const aspekPersiapan = mapAspek(aspekRows, 'Persiapan');
  const aspekPelaksanaan = mapAspek(aspekRows, 'Pelaksanaan');
  const aspekEvaluasi = mapAspek(aspekRows, 'Evaluasi');

  const penilaian: PenilaianItem[] = (penilaianData || []).map((r) => ({
    id: String(r.id),
    guruId: String(r.guru_id || ''),
    nipGuru: String(r.nip_guru),
    idAspek: String(r.id_aspek),
    tahap: r.tahap as TahapSupervisi,
    skor: r.skor === null || r.skor === undefined ? null : (Number(r.skor) as 1 | 2 | 3 | 4),
    teksRefleksi: r.teks_refleksi ? String(r.teks_refleksi) : undefined,
    catatan: String(r.catatan || ''),
    penilai: String(r.penilai || ''),
  }));

  const catatanTahap: CatatanTahap[] = (catatanData || []).map((r) => ({
    id: String(r.id),
    guruId: String(r.guru_id || ''),
    nipGuru: String(r.nip_guru),
    tahap: r.tahap as TahapSupervisi,
    masalah: String(r.masalah || ''),
    pemecahan: String(r.pemecahan || ''),
    rencanaTL: String(r.rencana_tl || ''),
    penilai: String(r.penilai || ''),
    updatedAt: String(r.updated_at || ''),
  }));

  const pengaturan: PengaturanSekolah = pengaturanRow
    ? {
        namaSekolah: String(pengaturanRow.nama_sekolah || seed.pengaturan.namaSekolah),
        dinasPendidikan: String(
          pengaturanRow.dinas_pendidikan || seed.pengaturan.dinasPendidikan
        ),
        pemerintahDaerah: String(
          pengaturanRow.pemerintah_daerah || seed.pengaturan.pemerintahDaerah
        ),
        alamatSekolah: String(pengaturanRow.alamat_sekolah || seed.pengaturan.alamatSekolah),
        tahunPelajaran: String(pengaturanRow.tahun_pelajaran || seed.pengaturan.tahunPelajaran),
        semester: String(pengaturanRow.semester || seed.pengaturan.semester),
        namaKepalaSekolah: String(
          pengaturanRow.nama_kepala_sekolah || seed.pengaturan.namaKepalaSekolah
        ),
        nipKepalaSekolah: String(
          pengaturanRow.nip_kepala_sekolah || seed.pengaturan.nipKepalaSekolah
        ),
        namaPengawasSekolah: String(
          pengaturanRow.nama_pengawas_sekolah || seed.pengaturan.namaPengawasSekolah
        ),
        nipPengawas: String(pengaturanRow.nip_pengawas || seed.pengaturan.nipPengawas),
        tanggalPelaksanaanUmum: String(
          pengaturanRow.tanggal_pelaksanaan_umum || seed.pengaturan.tanggalPelaksanaanUmum
        ),
        tempatTanggalCetak: String(
          pengaturanRow.tempat_tanggal_cetak || seed.pengaturan.tempatTanggalCetak
        ),
        logoKiri: String(pengaturanRow.logo_kiri || ''),
        logoKanan: String(pengaturanRow.logo_kanan || ''),
      }
    : seed.pengaturan;

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

export async function loginWithSupabase(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  await ensureSupabaseSeed();
  const sb = getClient();
  const { data, error } = await sb.from('sadig_users').select('*');
  if (error) {
    return { success: false, message: `Gagal terhubung ke Supabase: ${error.message}` };
  }
  const normalizedId = identifier.trim().toLowerCase().replace(/\s+/g, '');
  const matchedRow = (data || []).find((u) => {
    const uname = String(u.username || '').trim().toLowerCase();
    const nipNorm = String(u.nip || '').replace(/\s+/g, '').toLowerCase();
    const pwd = String(u.password || '');
    return (uname === identifier.trim().toLowerCase() || nipNorm === normalizedId) && pwd === password.trim();
  });

  if (!matchedRow) {
    return { success: false, message: 'Username/NIP atau kata sandi tidak cocok.' };
  }

  return {
    success: true,
    user: {
      id: String(matchedRow.id),
      username: String(matchedRow.username),
      password: String(matchedRow.password || '123'),
      email: String(matchedRow.email || ''),
      nama: String(matchedRow.nama),
      role: matchedRow.role as UserRole,
      nip: String(matchedRow.nip || ''),
    },
  };
}

export async function saveGuruSb(
  input: Partial<GuruRecord>,
  directoryUsers: UserAccount[]
): Promise<AppDatabasePayload> {
  const sb = getClient();
  const spv = directoryUsers.find((u) => u.nama === input.supervisor);

  if (input.id) {
    const { error } = await sb
      .from('sadig_guru')
      .update({
        nip: (input.nip || '').trim(),
        nama_guru: (input.namaGuru || '').trim(),
        mata_pelajaran: (input.mataPelajaran || '').trim(),
        tanggal_pelaksanaan: input.tanggalPelaksanaan || todayIso(),
        supervisor: input.supervisor || '',
        nip_supervisor: spv?.nip || '',
        guru_email: input.guruEmail || '',
      })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('sadig_guru').insert({
      id: `G${Date.now()}`,
      nip: (input.nip || '').trim(),
      nama_guru: (input.namaGuru || '').trim(),
      mata_pelajaran: (input.mataPelajaran || '').trim(),
      tanggal_pelaksanaan: input.tanggalPelaksanaan || todayIso(),
      supervisor: input.supervisor || '',
      nip_supervisor: spv?.nip || '',
      status_berkas: 'Belum Dicek',
      kelengkapan_berkas: 'Belum Ada',
      link_drive_berkas: '',
      catatan_kepsek: '',
      guru_email: input.guruEmail || '',
    });
    if (error) throw new Error(error.message);
  }

  return fetchSupabaseState();
}

export async function bulkImportGuruSb(
  items: Array<Partial<GuruRecord>>,
  directoryUsers: UserAccount[],
  defaultDate: string
): Promise<{ data: AppDatabasePayload; count: number }> {
  const sb = getClient();
  const rows: Array<Record<string, unknown>> = [];
  items.forEach((item, index) => {
    if (!item.namaGuru?.trim() || !item.mataPelajaran?.trim()) return;
    const nip = item.nip?.trim() || `19900101 202001 1 ${String(index + 10).padStart(3, '0')}`;
    const spvUser = directoryUsers.find((u) => u.nama === item.supervisor);
    rows.push({
      id: `G${Date.now()}_${index}`,
      nip,
      nama_guru: item.namaGuru.trim(),
      mata_pelajaran: item.mataPelajaran.trim(),
      tanggal_pelaksanaan: item.tanggalPelaksanaan?.trim() || defaultDate,
      supervisor: item.supervisor?.trim() || '',
      nip_supervisor: spvUser?.nip || '',
      status_berkas: 'Belum Dicek',
      kelengkapan_berkas: 'Belum Ada',
      link_drive_berkas: '',
      catatan_kepsek: '',
      guru_email: '',
    });
  });

  if (rows.length > 0) {
    const { error } = await sb.from('sadig_guru').insert(rows);
    if (error) throw new Error(error.message);
  }

  const data = await fetchSupabaseState();
  return { data, count: rows.length };
}

export async function deleteGuruSb(id: string): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { data: target } = await sb.from('sadig_guru').select('nip').eq('id', id).maybeSingle();
  const { error } = await sb.from('sadig_guru').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (target?.nip) {
    await sb.from('sadig_penilaian').delete().eq('nip_guru', target.nip);
    await sb.from('sadig_catatan_tahap').delete().eq('nip_guru', target.nip);
  }
  await sb.from('sadig_penilaian').delete().eq('guru_id', id);
  await sb.from('sadig_catatan_tahap').delete().eq('guru_id', id);

  return fetchSupabaseState();
}

export async function uploadBerkasGuruSb(
  idGuru: string,
  linkDriveBerkas: string
): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { error } = await sb
    .from('sadig_guru')
    .update({
      link_drive_berkas: linkDriveBerkas.trim(),
      status_berkas: 'Belum Dicek',
      kelengkapan_berkas: 'Belum Ada',
      catatan_kepsek: '',
    })
    .eq('id', idGuru);
  if (error) throw new Error(error.message);
  return fetchSupabaseState();
}

export async function verifikasiKepsekSb(
  idGuru: string,
  kelengkapanBerkas: KelengkapanBerkas,
  statusBerkas: StatusBerkas,
  catatanKepsek: string
): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { error } = await sb
    .from('sadig_guru')
    .update({
      kelengkapan_berkas: kelengkapanBerkas,
      status_berkas: statusBerkas,
      catatan_kepsek: catatanKepsek.trim(),
    })
    .eq('id', idGuru);
  if (error) throw new Error(error.message);
  return fetchSupabaseState();
}

export async function savePenilaianSb(params: {
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
}): Promise<AppDatabasePayload> {
  const sb = getClient();

  const { data: aspekList } = await sb
    .from('sadig_aspek')
    .select('id, tipe_penilaian')
    .eq('tahap', params.tahap);

  const { error: delErr } = await sb
    .from('sadig_penilaian')
    .delete()
    .eq('nip_guru', params.guru.nip)
    .eq('tahap', params.tahap);
  if (delErr) throw new Error(delErr.message);

  const rows = params.items.map((item) => {
    const def = (aspekList || []).find((a) => a.id === item.idAspek);
    const isText = def?.tipe_penilaian === 'teks';
    return {
      id: `${cleanKey(params.guru.id || params.guru.nip)}_${params.tahap}_${cleanKey(item.idAspek)}`,
      guru_id: params.guru.id,
      nip_guru: params.guru.nip,
      id_aspek: item.idAspek,
      tahap: params.tahap,
      skor: isText ? null : Number(item.skor),
      teks_refleksi: isText ? item.teksRefleksi?.trim() || '' : '',
      catatan: item.catatan?.trim() || '',
      penilai: params.penilai,
    };
  });

  if (rows.length > 0) {
    const { error: insErr } = await sb
      .from('sadig_penilaian')
      .upsert(rows, { onConflict: 'id' });
    if (insErr) throw new Error(insErr.message);
  }

  await sb
    .from('sadig_catatan_tahap')
    .delete()
    .eq('nip_guru', params.guru.nip)
    .eq('tahap', params.tahap);

  const { error: catErr } = await sb.from('sadig_catatan_tahap').upsert(
    {
      id: `${cleanKey(params.guru.id || params.guru.nip)}_${params.tahap}`,
      guru_id: params.guru.id,
      nip_guru: params.guru.nip,
      tahap: params.tahap,
      masalah: params.masalah.trim(),
      pemecahan: params.pemecahan.trim(),
      rencana_tl: params.rencanaTL.trim(),
      penilai: params.penilai,
      updated_at: todayIso(),
    },
    { onConflict: 'id' }
  );
  if (catErr) throw new Error(catErr.message);

  return fetchSupabaseState();
}

export async function saveAspekSb(
  tahap: TahapSupervisi,
  input: Partial<AspekItem>,
  existingList: AspekItem[]
): Promise<AppDatabasePayload> {
  const sb = getClient();
  const prefix = tahap === 'Persiapan' ? 'P' : tahap === 'Pelaksanaan' ? 'L' : 'E';
  const resolvedType: TipePenilaianAspek =
    input.tipePenilaian === 'teks' || input.tipePenilaian === 'skor'
      ? input.tipePenilaian
      : tahap === 'Evaluasi'
      ? 'teks'
      : 'skor';

  if (input.id) {
    const { error } = await sb
      .from('sadig_aspek')
      .update({
        kelompok: (input.kelompok || 'UMUM').trim(),
        aspek: (input.aspek || '').trim(),
        kategori_deskripsi: (input.kategoriDeskripsi || '').trim(),
        tipe_penilaian: resolvedType,
      })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
  } else {
    const maxOrder = existingList.reduce((m, item) => Math.max(m, item.orderIndex || 0), existingList.length);
    const { error } = await sb.from('sadig_aspek').insert({
      id: `${prefix}${Date.now().toString().slice(-5)}`,
      tahap,
      kelompok: (input.kelompok || 'UMUM').trim(),
      aspek: (input.aspek || '').trim(),
      kategori_deskripsi: (input.kategoriDeskripsi || '').trim(),
      tipe_penilaian: resolvedType,
      order_index: maxOrder + 1,
    });
    if (error) throw new Error(error.message);
  }

  return fetchSupabaseState();
}

export async function deleteAspekSb(
  tahap: TahapSupervisi,
  id: string
): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { error } = await sb.from('sadig_aspek').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await sb.from('sadig_penilaian').delete().eq('tahap', tahap).eq('id_aspek', id);
  return fetchSupabaseState();
}

export async function saveDirectoryUserSb(
  input: Partial<UserAccount> & { oldUsername?: string }
): Promise<AppDatabasePayload> {
  const sb = getClient();
  if (input.oldUsername) {
    const isAdmin = input.oldUsername === 'admin';
    const { error } = await sb
      .from('sadig_users')
      .update({
        username: isAdmin ? 'admin' : (input.username || '').trim(),
        password: (input.password || '123').trim(),
        email: (input.email || '').trim(),
        nama: (input.nama || '').trim(),
        role: isAdmin ? 'Admin' : input.role || 'Guru',
        nip: (input.nip || '').trim(),
      })
      .eq('username', input.oldUsername);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('sadig_users').insert({
      id: `U${Date.now()}`,
      username: (input.username || '').trim(),
      password: (input.password || '123').trim(),
      email: (input.email || '').trim(),
      nama: (input.nama || '').trim(),
      role: input.role || 'Guru',
      nip: (input.nip || '').trim(),
    });
    if (error) throw new Error(error.message);
  }
  return fetchSupabaseState();
}

export async function deleteDirectoryUserSb(user: UserAccount): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { error } = await sb.from('sadig_users').delete().eq('username', user.username);
  if (error) throw new Error(error.message);
  return fetchSupabaseState();
}

export async function savePengaturanSb(input: PengaturanSekolah): Promise<AppDatabasePayload> {
  const sb = getClient();
  const { error } = await sb.from('sadig_pengaturan').upsert(
    {
      id: 'sekolah',
      nama_sekolah: input.namaSekolah,
      dinas_pendidikan: input.dinasPendidikan,
      pemerintah_daerah: input.pemerintahDaerah,
      alamat_sekolah: input.alamatSekolah,
      tahun_pelajaran: input.tahunPelajaran,
      semester: input.semester,
      nama_kepala_sekolah: input.namaKepalaSekolah,
      nip_kepala_sekolah: input.nipKepalaSekolah,
      nama_pengawas_sekolah: input.namaPengawasSekolah,
      nip_pengawas: input.nipPengawas,
      tanggal_pelaksanaan_umum: input.tanggalPelaksanaanUmum,
      tempat_tanggal_cetak: input.tempatTanggalCetak,
      logo_kiri: input.logoKiri || '',
      logo_kanan: input.logoKanan || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return fetchSupabaseState();
}
