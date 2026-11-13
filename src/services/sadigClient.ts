import { auth } from '../firebase';
import type {
  AppDatabasePayload,
  AspekItem,
  GuruRecord,
  KelengkapanBerkas,
  PengaturanSekolah,
  StatusBerkas,
  TahapSupervisi,
  TipePenilaianAspek,
  UserAccount,
  UserRole,
} from '../types';
import {
  buildRekap,
  bulkImportGuruFs,
  createDefaultSeedData,
  deleteAspekFs,
  deleteDirectoryUserFs,
  deleteGuruFs,
  saveAspekFs,
  saveDirectoryUserFs,
  saveGuruFs,
  savePengaturanFs,
  savePenilaianFs,
  uploadBerkasGuruFs,
  verifikasiKepsekFs,
} from './firestoreDb';
import {
  bulkImportGuruSb,
  deleteAspekSb,
  deleteDirectoryUserSb,
  deleteGuruSb,
  fetchSupabaseState,
  isSupabaseConfigured,
  loginWithSupabase,
  saveAspekSb,
  saveDirectoryUserSb,
  saveGuruSb,
  savePengaturanSb,
  savePenilaianSb,
  uploadBerkasGuruSb,
  verifikasiKepsekSb,
} from './supabaseDb';

const LOCAL_STORAGE_KEY = 'sadig_local_db_v1';
const BRANDING_CACHE_KEY = 'sadig_public_branding_v1';

export interface PublicBranding {
  namaSekolah: string;
  logoKiri: string;
  logoKanan: string;
}

export function saveBrandingCache(pengaturan?: Partial<PengaturanSekolah> | null): void {
  if (!pengaturan) return;
  try {
    const payload: PublicBranding = {
      namaSekolah: pengaturan.namaSekolah || '',
      logoKiri: pengaturan.logoKiri || '',
      logoKanan: pengaturan.logoKanan || '',
    };
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function getCachedBranding(): PublicBranding | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as PublicBranding;
    }
  } catch {
    // ignore
  }
  const db = loadLocalDb();
  return {
    namaSekolah: db.pengaturan.namaSekolah,
    logoKiri: db.pengaturan.logoKiri || '',
    logoKanan: db.pengaturan.logoKanan || '',
  };
}

type LocalDb = ReturnType<typeof createDefaultSeedData>;

function loadLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDb;
      return parsed;
    }
  } catch {
    // ignore corrupted local storage
  }
  const seed = createDefaultSeedData();
  saveLocalDb(seed);
  return seed;
}

function saveLocalDb(db: LocalDb): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

function toPayload(db: LocalDb): AppDatabasePayload {
  return {
    ...db,
    rekap: buildRekap(
      db.guru,
      db.aspekPersiapan,
      db.aspekPelaksanaan,
      db.aspekEvaluasi,
      db.penilaian
    ),
  };
}

async function tryFetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; json?: T; networkUnavailable?: boolean }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: res.status, networkUnavailable: true };
    }
    const json = (await res.json()) as T;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, networkUnavailable: true };
  }
}

export async function loginWithCredentials(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  if (isSupabaseConfigured()) {
    return loginWithSupabase(identifier, password);
  }
  const remote = await tryFetchJson<{ success: boolean; user?: UserAccount; message?: string }>(
    '/api/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    return remote.json;
  }

  // Fallback to local database (for static Vercel deployment)
  const db = loadLocalDb();
  const normalizedId = identifier.trim().toLowerCase().replace(/\s+/g, '');
  const matched = db.users.find(
    (u) =>
      (u.username.toLowerCase() === identifier.trim().toLowerCase() ||
        u.nip.replace(/\s+/g, '').toLowerCase() === normalizedId) &&
      u.password === password.trim()
  );
  if (!matched) {
    return { success: false, message: 'Username/NIP atau kata sandi tidak cocok.' };
  }
  return { success: true, user: matched };
}

export async function quickLoginByRole(
  role: UserRole
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const remote = await tryFetchJson<{ success: boolean; user?: UserAccount; message?: string }>(
    '/api/quick-login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    return remote.json;
  }

  const db = loadLocalDb();
  const matched = db.users.find((u) => u.role === role);
  if (!matched) {
    return { success: false, message: `Akun dengan role ${role} tidak ditemukan.` };
  }
  return { success: true, user: matched };
}

export async function fetchLocalOrServerState(): Promise<AppDatabasePayload> {
  if (isSupabaseConfigured()) {
    const payload = await fetchSupabaseState();
    saveBrandingCache(payload.pengaturan);
    return payload;
  }
  const remote = await tryFetchJson<AppDatabasePayload>('/api/state');
  if (!remote.networkUnavailable && remote.ok && remote.json) {
    saveBrandingCache(remote.json.pengaturan);
    return remote.json;
  }
  const payload = toPayload(loadLocalDb());
  saveBrandingCache(payload.pengaturan);
  return payload;
}

export async function saveGuruClient(
  input: Partial<GuruRecord>,
  directoryUsers: UserAccount[],
  existingGuru: GuruRecord[],
  ownerUid: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await saveGuruFs(input, directoryUsers, existingGuru, ownerUid);
    return null;
  }
  if (isSupabaseConfigured()) {
    return saveGuruSb(input, directoryUsers);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/guru',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menyimpan data guru.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const spv = db.users.find((u) => u.nama === input.supervisor);
  if (input.id) {
    const idx = db.guru.findIndex((g) => g.id === input.id);
    if (idx !== -1) {
      db.guru[idx] = {
        ...db.guru[idx],
        nip: (input.nip || '').trim(),
        namaGuru: (input.namaGuru || '').trim(),
        mataPelajaran: (input.mataPelajaran || '').trim(),
        tanggalPelaksanaan: input.tanggalPelaksanaan || db.guru[idx].tanggalPelaksanaan,
        supervisor: input.supervisor || '',
        nipSupervisor: spv?.nip || '',
        guruEmail: input.guruEmail || db.guru[idx].guruEmail || '',
      };
    }
  } else {
    db.guru.push({
      id: `G${Date.now()}`,
      nip: (input.nip || '').trim(),
      namaGuru: (input.namaGuru || '').trim(),
      mataPelajaran: (input.mataPelajaran || '').trim(),
      tanggalPelaksanaan: input.tanggalPelaksanaan || db.pengaturan.tanggalPelaksanaanUmum,
      supervisor: input.supervisor || '',
      nipSupervisor: spv?.nip || '',
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: '',
      catatanKepsek: '',
      guruEmail: input.guruEmail || '',
    });
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function bulkImportGuruClient(
  items: Array<Partial<GuruRecord>>,
  directoryUsers: UserAccount[],
  existingGuru: GuruRecord[],
  defaultDate: string,
  ownerUid: string
): Promise<{ data: AppDatabasePayload | null; count?: number }> {
  if (auth.currentUser) {
    const count = await bulkImportGuruFs(items, directoryUsers, existingGuru, defaultDate, ownerUid);
    return { data: null, count };
  }
  if (isSupabaseConfigured()) {
    return bulkImportGuruSb(items, directoryUsers, defaultDate);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/guru/bulk',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal mengimpor CSV.');
    }
    return { data: remote.json.data || null };
  }

  const db = loadLocalDb();
  let added = 0;
  items.forEach((item, index) => {
    if (!item.namaGuru?.trim() || !item.mataPelajaran?.trim()) return;
    const nip = item.nip?.trim() || `19900101 202001 1 ${String(index + 10).padStart(3, '0')}`;
    const spvUser = db.users.find((u) => u.nama === item.supervisor);
    db.guru.push({
      id: `G${Date.now()}_${index}`,
      nip,
      namaGuru: item.namaGuru.trim(),
      mataPelajaran: item.mataPelajaran.trim(),
      tanggalPelaksanaan: item.tanggalPelaksanaan?.trim() || defaultDate,
      supervisor: item.supervisor?.trim() || '',
      nipSupervisor: spvUser?.nip || '',
      statusBerkas: 'Belum Dicek',
      kelengkapanBerkas: 'Belum Ada',
      linkDriveBerkas: '',
      catatanKepsek: '',
    });
    added++;
  });
  saveLocalDb(db);
  return { data: toPayload(db), count: added };
}

export async function deleteGuruClient(id: string): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await deleteGuruFs(id);
    return null;
  }
  if (isSupabaseConfigured()) {
    return deleteGuruSb(id);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    `/api/guru/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menghapus data guru.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const target = db.guru.find((g) => g.id === id);
  db.guru = db.guru.filter((g) => g.id !== id);
  if (target) {
    db.penilaian = db.penilaian.filter((p) => p.nipGuru !== target.nip);
    db.catatanTahap = db.catatanTahap.filter((c) => c.nipGuru !== target.nip);
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function uploadBerkasGuruClient(
  idGuru: string,
  linkDriveBerkas: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await uploadBerkasGuruFs(idGuru, linkDriveBerkas);
    return null;
  }
  if (isSupabaseConfigured()) {
    return uploadBerkasGuruSb(idGuru, linkDriveBerkas);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/guru/berkas',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idGuru, linkDriveBerkas }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal mengunggah tautan berkas.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const idx = db.guru.findIndex((g) => g.id === idGuru);
  if (idx !== -1) {
    db.guru[idx].linkDriveBerkas = linkDriveBerkas.trim();
    db.guru[idx].statusBerkas = 'Belum Dicek';
    db.guru[idx].kelengkapanBerkas = 'Belum Ada';
    db.guru[idx].catatanKepsek = '';
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function verifikasiKepsekClient(
  idGuru: string,
  kelengkapanBerkas: KelengkapanBerkas,
  statusBerkas: StatusBerkas,
  catatanKepsek: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await verifikasiKepsekFs(idGuru, kelengkapanBerkas, statusBerkas, catatanKepsek);
    return null;
  }
  if (isSupabaseConfigured()) {
    return verifikasiKepsekSb(idGuru, kelengkapanBerkas, statusBerkas, catatanKepsek);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/kepsek/verifikasi',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idGuru, kelengkapanBerkas, statusBerkas, catatanKepsek }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal memperbarui status berkas.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const idx = db.guru.findIndex((g) => g.id === idGuru);
  if (idx !== -1) {
    db.guru[idx].kelengkapanBerkas = kelengkapanBerkas;
    db.guru[idx].statusBerkas = statusBerkas;
    db.guru[idx].catatanKepsek = catatanKepsek.trim();
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function savePenilaianClient(params: {
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
}): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await savePenilaianFs(params);
    return null;
  }
  if (isSupabaseConfigured()) {
    return savePenilaianSb(params);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/penilaian',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nipGuru: params.guru.nip,
        tahap: params.tahap,
        items: params.items,
        masalah: params.masalah,
        pemecahan: params.pemecahan,
        rencanaTL: params.rencanaTL,
        penilai: params.penilai,
      }),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menyimpan penilaian.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const aspekList =
    params.tahap === 'Persiapan'
      ? db.aspekPersiapan
      : params.tahap === 'Pelaksanaan'
      ? db.aspekPelaksanaan
      : db.aspekEvaluasi;
  db.penilaian = db.penilaian.filter(
    (p) => !(p.nipGuru === params.guru.nip && p.tahap === params.tahap)
  );
  params.items.forEach((item) => {
    const def = aspekList.find((a) => a.id === item.idAspek);
    const isText = def?.tipePenilaian === 'teks';
    db.penilaian.push({
      guruId: params.guru.id,
      nipGuru: params.guru.nip,
      idAspek: item.idAspek,
      tahap: params.tahap,
      skor: isText ? null : (Number(item.skor) as 1 | 2 | 3 | 4),
      teksRefleksi: isText ? item.teksRefleksi?.trim() || '' : undefined,
      catatan: item.catatan?.trim() || '',
      penilai: params.penilai,
    });
  });
  db.catatanTahap = db.catatanTahap.filter(
    (c) => !(c.nipGuru === params.guru.nip && c.tahap === params.tahap)
  );
  db.catatanTahap.push({
    guruId: params.guru.id,
    nipGuru: params.guru.nip,
    tahap: params.tahap,
    masalah: params.masalah.trim(),
    pemecahan: params.pemecahan.trim(),
    rencanaTL: params.rencanaTL.trim(),
    penilai: params.penilai,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  saveLocalDb(db);
  return toPayload(db);
}

export async function saveAspekClient(
  tahap: TahapSupervisi,
  input: Partial<AspekItem>,
  existingList: AspekItem[],
  ownerUid: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await saveAspekFs(tahap, input, existingList, ownerUid);
    return null;
  }
  if (isSupabaseConfigured()) {
    return saveAspekSb(tahap, input, existingList);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    `/api/aspek/${encodeURIComponent(tahap)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menyimpan aspek.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const key =
    tahap === 'Persiapan'
      ? 'aspekPersiapan'
      : tahap === 'Pelaksanaan'
      ? 'aspekPelaksanaan'
      : 'aspekEvaluasi';
  const prefix = tahap === 'Persiapan' ? 'P' : tahap === 'Pelaksanaan' ? 'L' : 'E';
  const resolvedType: TipePenilaianAspek =
    input.tipePenilaian === 'teks' || input.tipePenilaian === 'skor'
      ? input.tipePenilaian
      : tahap === 'Evaluasi'
      ? 'teks'
      : 'skor';
  if (input.id) {
    const idx = db[key].findIndex((a) => a.id === input.id);
    if (idx !== -1) {
      db[key][idx] = {
        id: input.id,
        kelompok: (input.kelompok || db[key][idx].kelompok).trim(),
        aspek: (input.aspek || '').trim(),
        kategoriDeskripsi: (input.kategoriDeskripsi || '').trim(),
        tipePenilaian: resolvedType,
      };
    }
  } else {
    db[key].push({
      id: `${prefix}${Date.now().toString().slice(-4)}`,
      kelompok: (input.kelompok || 'UMUM').trim(),
      aspek: (input.aspek || '').trim(),
      kategoriDeskripsi: (input.kategoriDeskripsi || '').trim(),
      tipePenilaian: resolvedType,
    });
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function deleteAspekClient(
  tahap: TahapSupervisi,
  id: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await deleteAspekFs(id);
    return null;
  }
  if (isSupabaseConfigured()) {
    return deleteAspekSb(tahap, id);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    `/api/aspek/${encodeURIComponent(tahap)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menghapus aspek.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  const key =
    tahap === 'Persiapan'
      ? 'aspekPersiapan'
      : tahap === 'Pelaksanaan'
      ? 'aspekPelaksanaan'
      : 'aspekEvaluasi';
  db[key] = db[key].filter((a) => a.id !== id);
  db.penilaian = db.penilaian.filter((p) => !(p.tahap === tahap && p.idAspek === id));
  saveLocalDb(db);
  return toPayload(db);
}

export async function saveDirectoryUserClient(
  input: Partial<UserAccount> & { oldUsername?: string },
  existingUsers: UserAccount[],
  ownerUid: string
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await saveDirectoryUserFs(input, existingUsers, ownerUid);
    return null;
  }
  if (isSupabaseConfigured()) {
    return saveDirectoryUserSb(input);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/users',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menyimpan pengguna.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  if (input.oldUsername) {
    const idx = db.users.findIndex((u) => u.username === input.oldUsername);
    if (idx !== -1) {
      db.users[idx] = {
        ...db.users[idx],
        username: input.oldUsername === 'admin' ? 'admin' : (input.username || '').trim(),
        password: (input.password || '123').trim(),
        email: (input.email || '').trim(),
        nama: (input.nama || '').trim(),
        role: input.oldUsername === 'admin' ? 'Admin' : (input.role || 'Guru'),
        nip: (input.nip || '').trim(),
      };
    }
  } else {
    db.users.push({
      id: `U${Date.now()}`,
      username: (input.username || '').trim(),
      password: (input.password || '123').trim(),
      email: (input.email || '').trim(),
      nama: (input.nama || '').trim(),
      role: input.role || 'Guru',
      nip: (input.nip || '').trim(),
    });
  }
  saveLocalDb(db);
  return toPayload(db);
}

export async function deleteDirectoryUserClient(
  user: UserAccount
): Promise<AppDatabasePayload | null> {
  if (auth.currentUser) {
    await deleteDirectoryUserFs(user.id || user.username);
    return null;
  }
  if (isSupabaseConfigured()) {
    return deleteDirectoryUserSb(user);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    `/api/users/${encodeURIComponent(user.username)}`,
    { method: 'DELETE' }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal menghapus pengguna.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  db.users = db.users.filter((u) => u.username !== user.username);
  saveLocalDb(db);
  return toPayload(db);
}

export async function savePengaturanClient(
  input: PengaturanSekolah,
  ownerUid: string
): Promise<AppDatabasePayload | null> {
  saveBrandingCache(input);
  if (auth.currentUser) {
    await savePengaturanFs(input, ownerUid);
    return null;
  }
  if (isSupabaseConfigured()) {
    return savePengaturanSb(input);
  }
  const remote = await tryFetchJson<{ success: boolean; message?: string; data?: AppDatabasePayload }>(
    '/api/pengaturan',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!remote.networkUnavailable && remote.json) {
    if (!remote.ok || !remote.json.success) {
      throw new Error(remote.json.message || 'Gagal memperbarui pengaturan.');
    }
    return remote.json.data || null;
  }

  const db = loadLocalDb();
  db.pengaturan = { ...db.pengaturan, ...input };
  saveLocalDb(db);
  return toPayload(db);
}
