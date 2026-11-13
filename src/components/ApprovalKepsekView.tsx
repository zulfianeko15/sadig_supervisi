import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Search,
  Check,
  X,
} from 'lucide-react';
import type { AppDatabasePayload, GuruRecord, KelengkapanBerkas } from '../types';
import { verifikasiKepsekClient } from '../services/sadigClient';

interface ApprovalKepsekViewProps {
  mode: 'kepsek' | 'pengawas';
  data: AppDatabasePayload;
  onActionSuccess: (updated: AppDatabasePayload | null, message: string) => Promise<void>;
  onError: (message: string) => void;
}

export function ApprovalKepsekView({
  mode,
  data,
  onActionSuccess,
  onError,
}: ApprovalKepsekViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Belum Dicek' | 'Disetujui' | 'Ditolak'>(
    'Semua'
  );
  const [editingRow, setEditingRow] = useState<GuruRecord | null>(null);
  const [kelengkapan, setKelengkapan] = useState<KelengkapanBerkas>('Ada');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = data.guru.filter((g) => {
    const q = search.trim().toLowerCase();
    const matchText =
      !q ||
      g.namaGuru.toLowerCase().includes(q) ||
      g.nip.toLowerCase().includes(q) ||
      g.mataPelajaran.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'Semua' || g.statusBerkas === filterStatus;
    return matchText && matchStatus;
  });

  function openVerify(g: GuruRecord) {
    setEditingRow(g);
    setKelengkapan(g.linkDriveBerkas ? 'Ada' : g.kelengkapanBerkas);
    setCatatan(g.catatanKepsek || '');
  }

  async function submitDecision(statusBerkas: 'Disetujui' | 'Ditolak') {
    if (!editingRow) return;
    if (statusBerkas === 'Disetujui' && kelengkapan !== 'Ada') {
      onError('Tandai kelengkapan berkas "Ada" terlebih dahulu sebelum menyetujui.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await verifikasiKepsekClient(
        editingRow.id,
        kelengkapan,
        statusBerkas,
        catatan
      );
      const nama = editingRow.namaGuru;
      setEditingRow(null);
      await onActionSuccess(
        updated,
        `Status berkas ${nama} diperbarui menjadi "${statusBerkas}".`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan keputusan verifikasi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {mode === 'kepsek'
              ? 'Persetujuan Kesiapan Berkas Guru'
              : 'Monitoring Berkas Kesiapan Guru'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'kepsek'
              ? 'Periksa tautan Google Drive guru, tandai kelengkapan, dan berikan persetujuan agar Pengawas Supervisi dapat menilai.'
              : 'Pemantauan tautan perangkat ajar Google Drive guru beserta status validasi Kepala Sekolah.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, mapel..."
              className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Semua', 'Belum Dicek', 'Disetujui', 'Ditolak'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Guru & NIP</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Tautan Google Drive</th>
                <th className="py-3 px-4">Kelengkapan</th>
                <th className="py-3 px-4">Status Validasi</th>
                <th className="py-3 px-4">Catatan Kepala Sekolah</th>
                {mode === 'kepsek' && <th className="py-3 px-4 text-right">Verifikasi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={mode === 'kepsek' ? 7 : 6} className="py-8 px-4 text-center text-slate-500">
                    Tidak ada data berkas yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{g.namaGuru}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular">{g.nip}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{g.mataPelajaran}</td>
                    <td className="py-3 px-4">
                      {g.linkDriveBerkas ? (
                        <a
                          href={g.linkDriveBerkas}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>Buka Berkas Drive</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Belum diunggah</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">
                      {g.kelengkapanBerkas}
                    </td>
                    <td className="py-3 px-4">
                      {g.statusBerkas === 'Disetujui' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Disetujui
                        </span>
                      )}
                      {g.statusBerkas === 'Belum Dicek' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          Belum Dicek
                        </span>
                      )}
                      {g.statusBerkas === 'Ditolak' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                      {g.catatanKepsek || '-'}
                    </td>
                    {mode === 'kepsek' && (
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openVerify(g)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap"
                        >
                          Periksa & Putuskan
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {editingRow && mode === 'kepsek' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Verifikasi Kesiapan Berkas
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingRow.namaGuru} · {editingRow.mataPelajaran}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  Tautan Google Drive Guru
                </div>
                {editingRow.linkDriveBerkas ? (
                  <a
                    href={editingRow.linkDriveBerkas}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{editingRow.linkDriveBerkas}</span>
                  </a>
                ) : (
                  <p className="text-xs text-red-600">Guru belum mengunggah tautan Google Drive.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tandai Kelengkapan Berkas
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Ada', 'Belum Ada'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setKelengkapan(opt)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                        kelengkapan === opt
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan Kepala Sekolah (Opsional / Alasan Penolakan)
                </label>
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tuliskan catatan pemeriksaan berkas..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitDecision('Ditolak')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak Berkas</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitDecision('Disetujui')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Setujui Berkas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
