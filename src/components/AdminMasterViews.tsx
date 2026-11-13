import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Save,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import type {
  AppDatabasePayload,
  AspekItem,
  GuruRecord,
  PengaturanSekolah,
  TahapSupervisi,
  TipePenilaianAspek,
  UserAccount,
  UserRole,
} from '../types';
import { PemdaCrestSvg, TutWuriCrestSvg } from './SchoolCrest';
import {
  bulkImportGuruClient,
  deleteAspekClient,
  deleteDirectoryUserClient,
  deleteGuruClient,
  saveAspekClient,
  saveDirectoryUserClient,
  saveGuruClient,
  savePengaturanClient,
} from '../services/sadigClient';

interface AdminMasterProps {
  section: 'guru' | 'aspek' | 'users' | 'settings';
  data: AppDatabasePayload;
  ownerUid: string;
  onActionSuccess: (updated: AppDatabasePayload | null, message: string) => Promise<void>;
  onError: (message: string) => void;
}

export function AdminMasterViews({
  section,
  data,
  ownerUid,
  onActionSuccess,
  onError,
}: AdminMasterProps) {
  // === DATA GURU STATE ===
  const [guruModal, setGuruModal] = useState(false);
  const [guruForm, setGuruForm] = useState<Partial<GuruRecord>>({});
  const csvInputRef = useRef<HTMLInputElement>(null);

  // === DATA ASPEK STATE ===
  const [aspekTab, setAspekTab] = useState<TahapSupervisi>('Persiapan');
  const [aspekModal, setAspekModal] = useState(false);
  const [aspekForm, setAspekForm] = useState<Partial<AspekItem>>({});

  // === USERS STATE ===
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<UserAccount> & { oldUsername?: string }>({});

  // === PENGATURAN STATE ===
  const [settingsForm, setSettingsForm] = useState<PengaturanSekolah>(data.pengaturan);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSettingsForm(data.pengaturan);
  }, [data.pengaturan]);

  const supervisorOptions = data.users.filter(
    (u) => u.role === 'Pengawas Supervisi' || u.role === 'Admin'
  );

  // --- GURU HANDLERS ---
  function openGuruModal(g?: GuruRecord) {
    if (g) {
      setGuruForm({ ...g });
    } else {
      setGuruForm({
        namaGuru: '',
        nip: '',
        mataPelajaran: '',
        tanggalPelaksanaan: data.pengaturan.tanggalPelaksanaanUmum,
        supervisor: supervisorOptions[0]?.nama || '',
        guruEmail: '',
      });
    }
    setGuruModal(true);
  }

  async function submitGuru(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await saveGuruClient(guruForm, data.users, data.guru, ownerUid);
      setGuruModal(false);
      await onActionSuccess(
        updated,
        guruForm.id ? 'Data guru berhasil diperbarui.' : 'Data guru baru berhasil ditambahkan.'
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan data guru.');
    } finally {
      setBusy(false);
    }
  }

  async function removeGuru(id: string) {
    setBusy(true);
    try {
      const updated = await deleteGuruClient(id);
      await onActionSuccess(updated, 'Data guru berhasil dihapus.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menghapus data guru.');
    } finally {
      setBusy(false);
    }
  }

  function downloadCsvTemplate() {
    const csv =
      'Nama Guru,NIP,Mata Pelajaran,Tanggal Pelaksanaan,Supervisor\n' +
      'Budi Santoso,19860412 201101 1 005,Matematika,2026-11-20,Dra. Hj. Ratna Dewi\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Data_Guru_SADIG.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = String(ev.target?.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const items = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return {
          namaGuru: cols[0] || '',
          nip: cols[1] || '',
          mataPelajaran: cols[2] || '',
          tanggalPelaksanaan: cols[3] || '',
          supervisor: cols[4] || '',
        };
      });
      setBusy(true);
      try {
        const res = await bulkImportGuruClient(
          items,
          data.users,
          data.guru,
          data.pengaturan.tanggalPelaksanaanUmum,
          ownerUid
        );
        await onActionSuccess(res.data, 'Data guru CSV berhasil diimpor.');
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Gagal mengimpor data guru CSV.');
      } finally {
        setBusy(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  // --- ASPEK HANDLERS ---
  const activeAspekList =
    aspekTab === 'Persiapan'
      ? data.aspekPersiapan
      : aspekTab === 'Pelaksanaan'
      ? data.aspekPelaksanaan
      : data.aspekEvaluasi;

  function openAspekModal(item?: AspekItem) {
    if (item) {
      setAspekForm({
        ...item,
        tipePenilaian: item.tipePenilaian || (aspekTab === 'Evaluasi' ? 'teks' : 'skor'),
      });
    } else {
      setAspekForm({
        kelompok: activeAspekList[0]?.kelompok || 'I. IDENTITAS & PERENCANAAN',
        aspek: '',
        kategoriDeskripsi: '',
        tipePenilaian: aspekTab === 'Evaluasi' ? 'teks' : 'skor',
      });
    }
    setAspekModal(true);
  }

  async function submitAspek(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await saveAspekClient(aspekTab, aspekForm, activeAspekList, ownerUid);
      setAspekModal(false);
      await onActionSuccess(updated, `Aspek ${aspekTab} berhasil disimpan.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan aspek.');
    } finally {
      setBusy(false);
    }
  }

  async function removeAspek(id: string) {
    setBusy(true);
    try {
      const updated = await deleteAspekClient(aspekTab, id);
      await onActionSuccess(updated, 'Aspek penilaian berhasil dihapus.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menghapus aspek.');
    } finally {
      setBusy(false);
    }
  }

  // --- USERS HANDLERS ---
  function openUserModal(u?: UserAccount) {
    if (u) {
      setUserForm({ ...u, oldUsername: u.username });
    } else {
      setUserForm({
        username: '',
        password: '123',
        email: '',
        nama: '',
        role: 'Pengawas Supervisi',
        nip: '',
      });
    }
    setUserModal(true);
  }

  async function submitUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await saveDirectoryUserClient(userForm, data.users, ownerUid);
      setUserModal(false);
      await onActionSuccess(updated, 'Data pengguna dan hak akses berhasil disimpan.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan pengguna.');
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(u: UserAccount) {
    setBusy(true);
    try {
      const updated = await deleteDirectoryUserClient(u);
      await onActionSuccess(updated, 'Akun pengguna berhasil dihapus.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setBusy(false);
    }
  }

  // --- PENGATURAN HANDLER (Canvas resize <= 260px so logos stay compact) ---
  function handleLogoUpload(side: 'logoKiri' | 'logoKanan', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Pilih berkas gambar yang valid (PNG, JPG, WebP, atau SVG).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onError('Ukuran gambar logo maksimal 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 260;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL('image/png');
          setSettingsForm((prev) => ({
            ...prev,
            [side]: compressed.length <= 340000 ? compressed : canvas.toDataURL('image/webp', 0.85),
          }));
        } else {
          setSettingsForm((prev) => ({ ...prev, [side]: rawUrl.slice(0, 340000) }));
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function submitSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await savePengaturanClient(settingsForm, ownerUid);
      await onActionSuccess(
        updated,
        'Pengaturan identitas sekolah dan logo Kop berhasil disimpan.'
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setBusy(false);
    }
  }

  // ================= RENDER SECTIONS =================
  if (section === 'guru') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Kelola Data Guru</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambah, edit, hapus, atau impor data guru dan alokasi Pengawas Supervisi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template CSV</span>
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Impor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => openGuruModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Guru</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Guru</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4">Tanggal Pelaksanaan</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Status Berkas</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {data.guru.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">{g.namaGuru}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600">{g.nip}</td>
                    <td className="py-3 px-4 text-slate-700">{g.mataPelajaran}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700">
                      {g.tanggalPelaksanaan}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{g.supervisor || '-'}</td>
                    <td className="py-3 px-4">
                      {g.statusBerkas === 'Disetujui' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                        </span>
                      )}
                      {g.statusBerkas === 'Belum Dicek' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Clock className="w-3.5 h-3.5" /> Belum Dicek
                        </span>
                      )}
                      {g.statusBerkas === 'Ditolak' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                          <XCircle className="w-3.5 h-3.5" /> Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openGuruModal(g)}
                          aria-label={`Edit ${g.namaGuru}`}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeGuru(g.id)}
                          aria-label={`Hapus ${g.namaGuru}`}
                          className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guru Modal */}
        {guruModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h4 className="text-base font-bold text-slate-900">
                  {guruForm.id ? 'Edit Data Guru' : 'Tambah Data Guru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setGuruModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submitGuru} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Guru
                  </label>
                  <input
                    type="text"
                    required
                    value={guruForm.namaGuru || ''}
                    onChange={(e) => setGuruForm({ ...guruForm, namaGuru: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIP</label>
                  <input
                    type="text"
                    required
                    value={guruForm.nip || ''}
                    onChange={(e) => setGuruForm({ ...guruForm, nip: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={guruForm.mataPelajaran || ''}
                    onChange={(e) =>
                      setGuruForm({ ...guruForm, mataPelajaran: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    required
                    value={guruForm.tanggalPelaksanaan || ''}
                    onChange={(e) =>
                      setGuruForm({ ...guruForm, tanggalPelaksanaan: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pengawas Supervisi (Supervisor)
                  </label>
                  <select
                    value={guruForm.supervisor || ''}
                    onChange={(e) => setGuruForm({ ...guruForm, supervisor: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">-- Pilih Supervisor --</option>
                    {supervisorOptions.map((spv) => (
                      <option key={spv.username} value={spv.nama}>
                        {spv.nama} ({spv.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Google Guru (Opsional — untuk Login Google)
                  </label>
                  <input
                    type="email"
                    value={guruForm.guruEmail || ''}
                    onChange={(e) => setGuruForm({ ...guruForm, guruEmail: e.target.value })}
                    placeholder="nama@guru.smp.belajar.id"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setGuruModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {busy ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (section === 'aspek') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Data Aspek Instrumen Kurikulum Merdeka
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur indikator penilaian untuk Persiapan, Pelaksanaan (Skala 1–4), dan Evaluasi
              (Manual Teks Dialog Refleksi atau Skala 1–4)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Persiapan', 'Pelaksanaan', 'Evaluasi'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAspekTab(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    aspekTab === t
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aspek {t}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openAspekModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Aspek</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4 w-48">Kelompok Elemen</th>
                  <th className="py-3 px-4">Aspek Penilaian</th>
                  <th className="py-3 px-4">Kategori / Deskripsi</th>
                  <th className="py-3 px-4 w-44">Mode Penilaian</th>
                  <th className="py-3 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {activeAspekList.map((a) => {
                  const isText = a.tipePenilaian === 'teks';
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-700">
                        {a.id}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-emerald-700">
                        {a.kelompok}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{a.aspek}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{a.kategoriDeskripsi}</td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {isText ? (
                          <span className="text-sky-700">Manual Teks (Dialog Refleksi)</span>
                        ) : (
                          <span className="text-slate-700">Skala Skor (1–4)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAspekModal(a)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeAspek(a.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {aspekModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h4 className="text-base font-bold text-slate-900">
                  {aspekForm.id ? `Edit Aspek ${aspekTab}` : `Tambah Aspek ${aspekTab}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setAspekModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submitAspek} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelompok / Bagian
                  </label>
                  <input
                    type="text"
                    required
                    value={aspekForm.kelompok || ''}
                    onChange={(e) => setAspekForm({ ...aspekForm, kelompok: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Aspek Penilaian
                  </label>
                  <input
                    type="text"
                    required
                    value={aspekForm.aspek || ''}
                    onChange={(e) => setAspekForm({ ...aspekForm, aspek: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori / Deskripsi Indikator
                  </label>
                  <textarea
                    rows={3}
                    value={aspekForm.kategoriDeskripsi || ''}
                    onChange={(e) =>
                      setAspekForm({ ...aspekForm, kategoriDeskripsi: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode Penilaian oleh Pengawas Supervisi
                  </label>
                  <select
                    value={aspekForm.tipePenilaian || (aspekTab === 'Evaluasi' ? 'teks' : 'skor')}
                    onChange={(e) =>
                      setAspekForm({
                        ...aspekForm,
                        tipePenilaian: e.target.value as TipePenilaianAspek,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="skor">Skala Skor (1–4)</option>
                    <option value="teks">
                      Manual Teks (Hasil Dialog Refleksi Supervisor &amp; Guru)
                    </option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pilih &ldquo;Manual Teks&rdquo; untuk isian naratif hasil dialog refleksi pasca
                    pelaksanaan supervisi.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAspekModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Simpan Aspek
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (section === 'users') {
    const roles: UserRole[] = [
      'Admin',
      'Pengawas Sekolah',
      'Kepala Sekolah',
      'Pengawas Supervisi',
      'Guru',
    ];
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Kelola User Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur akun dan hak akses (Role-Based Access Control) untuk seluruh 5 peran sekolah
            </p>
          </div>
          <button
            type="button"
            onClick={() => openUserModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pengguna</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email Google</th>
                  <th className="py-3 px-4">NIP</th>
                  <th className="py-3 px-4">Role / Hak Akses</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {data.users.map((u) => (
                  <tr key={u.id || u.username} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                      {u.username}
                    </td>
                    <td className="py-3 px-4 text-slate-800">{u.nama}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{u.email || '-'}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600">
                      {u.nip || '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-700 text-xs">{u.role}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openUserModal(u)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removeUser(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {userModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h4 className="text-base font-bold text-slate-900">
                  {userForm.oldUsername ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setUserModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submitUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    disabled={userForm.oldUsername === 'admin'}
                    value={userForm.username || ''}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.password || ''}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Google (Untuk Login &amp; Sinkron Role Otomatis)
                  </label>
                  <input
                    type="email"
                    value={userForm.email || ''}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="contoh@guru.smp.belajar.id"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.nama || ''}
                    onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NIP</label>
                  <input
                    type="text"
                    value={userForm.nip || ''}
                    onChange={(e) => setUserForm({ ...userForm, nip: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hak Akses (Role)
                  </label>
                  <select
                    disabled={userForm.oldUsername === 'admin'}
                    value={userForm.role || 'Pengawas Supervisi'}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setUserModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Simpan Pengguna
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PENGATURAN SEKOLAH
  return (
    <div className="max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="border-b border-slate-200 pb-4 mb-5">
          <h3 className="text-base font-bold text-slate-900">Pengaturan Identitas Sekolah</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Perubahan data di bawah otomatis memperbarui Kop Surat dan blok tanda tangan pada
            lembar Nilai Persiapan, Pelaksanaan, Evaluasi, dan Rekapitulasi.
          </p>
        </div>

        <form onSubmit={submitSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pemerintah Daerah (Baris Kop 1)
              </label>
              <input
                type="text"
                required
                value={settingsForm.pemerintahDaerah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, pemerintahDaerah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dinas Pendidikan (Baris Kop 2)
              </label>
              <input
                type="text"
                required
                value={settingsForm.dinasPendidikan}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, dinasPendidikan: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah (Baris Kop 3)
              </label>
              <input
                type="text"
                required
                value={settingsForm.namaSekolah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, namaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Sekolah
              </label>
              <input
                type="text"
                required
                value={settingsForm.alamatSekolah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, alamatSekolah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Pelajaran
              </label>
              <input
                type="text"
                required
                value={settingsForm.tahunPelajaran}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, tahunPelajaran: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <input
                type="text"
                required
                value={settingsForm.semester}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, semester: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                required
                value={settingsForm.namaKepalaSekolah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, namaKepalaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                required
                value={settingsForm.nipKepalaSekolah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, nipKepalaSekolah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pengawas Sekolah
              </label>
              <input
                type="text"
                required
                value={settingsForm.namaPengawasSekolah}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, namaPengawasSekolah: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Pengawas Sekolah
              </label>
              <input
                type="text"
                required
                value={settingsForm.nipPengawas}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, nipPengawas: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pelaksanaan Umum
              </label>
              <input
                type="date"
                required
                value={settingsForm.tanggalPelaksanaanUmum}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, tanggalPelaksanaanUmum: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat & Tanggal Cetak
              </label>
              <input
                type="text"
                required
                value={settingsForm.tempatTanggalCetak}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, tempatTanggalCetak: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* UPLOAD LOGO KIRI & KANAN KOP */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Logo Kop Surat (Kiri &amp; Kanan)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Logo yang diunggah akan tampil pada Kop lembar Nilai Persiapan, Nilai Pelaksanaan,
                Nilai Evaluasi, Rekapitulasi Hasil, serta dokumen PDF yang diunduh.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logo Kiri */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Logo Kiri Kop Surat</span>
                  {settingsForm.logoKiri && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, logoKiri: '' })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-red-600"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Bawaan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0">
                    {settingsForm.logoKiri ? (
                      <img
                        src={settingsForm.logoKiri}
                        alt="Pratinjau Logo Kiri"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <PemdaCrestSvg className="w-12 h-12" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[11px] text-slate-500">
                      {settingsForm.logoKiri
                        ? 'Logo kustom aktif'
                        : 'Menggunakan logo daerah/instansi bawaan'}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pilih Logo Kiri</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('logoKiri', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Kanan */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Logo Kanan Kop Surat</span>
                  {settingsForm.logoKanan && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, logoKanan: '' })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-red-600"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Bawaan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1.5 shrink-0">
                    {settingsForm.logoKanan ? (
                      <img
                        src={settingsForm.logoKanan}
                        alt="Pratinjau Logo Kanan"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <TutWuriCrestSvg className="w-12 h-12" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[11px] text-slate-500">
                      {settingsForm.logoKanan
                        ? 'Logo kustom aktif'
                        : 'Menggunakan logo sekolah bawaan'}
                    </div>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pilih Logo Kanan</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('logoKanan', e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{busy ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
