import React, { useCallback, useEffect, useState } from 'react';
import { Lock, CheckCircle2, ExternalLink, Save, AlertCircle, Pencil, RotateCcw } from 'lucide-react';
import type {
  AppDatabasePayload,
  AspekItem,
  TahapSupervisi,
  UserAccount,
} from '../types';
import { SKALA_RUBRIK, hitungPredikat } from '../types';
import { savePenilaianClient } from '../services/sadigClient';

interface PenilaianFormViewProps {
  tahap: TahapSupervisi;
  data: AppDatabasePayload;
  user: UserAccount;
  ownerUid: string;
  initialGuruId?: string;
  onActionSuccess: (updated: AppDatabasePayload | null, message: string) => Promise<void>;
  onError: (message: string) => void;
  onNotify?: (type: 'success' | 'error', title: string, message: string) => void;
}

export function PenilaianFormView({
  tahap,
  data,
  user,
  ownerUid,
  initialGuruId,
  onActionSuccess,
  onError,
  onNotify,
}: PenilaianFormViewProps) {
  const assignedGuru =
    user.role === 'Pengawas Supervisi'
      ? data.guru.filter((g) => g.supervisor === user.nama)
      : data.guru;

  const [selectedGuruId, setSelectedGuruId] = useState<string>(
    initialGuruId || assignedGuru[0]?.id || ''
  );
  const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4>>({});
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [masalah, setMasalah] = useState('');
  const [pemecahan, setPemecahan] = useState('');
  const [rencanaTL, setRencanaTL] = useState('');
  const [saving, setSaving] = useState(false);
  const [isRevising, setIsRevising] = useState(false);

  const aspekList: AspekItem[] =
    tahap === 'Persiapan'
      ? data.aspekPersiapan
      : tahap === 'Pelaksanaan'
      ? data.aspekPelaksanaan
      : data.aspekEvaluasi;

  useEffect(() => {
    if (initialGuruId && assignedGuru.some((g) => g.id === initialGuruId)) {
      setSelectedGuruId(initialGuruId);
    } else if (!assignedGuru.some((g) => g.id === selectedGuruId)) {
      setSelectedGuruId(assignedGuru[0]?.id || '');
    }
  }, [initialGuruId, assignedGuru, selectedGuruId]);

  const activeGuru = assignedGuru.find((g) => g.id === selectedGuruId) || null;

  const syncFromSavedData = useCallback(() => {
    if (!activeGuru) return;
    const nextScores: Record<string, 1 | 2 | 3 | 4> = {};
    const nextReflections: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};
    aspekList.forEach((a) => {
      const existing = data.penilaian.find(
        (p) => p.nipGuru === activeGuru.nip && p.tahap === tahap && p.idAspek === a.id
      );
      nextScores[a.id] = existing?.skor || 3;
      nextReflections[a.id] = existing?.teksRefleksi || '';
      nextNotes[a.id] = existing?.catatan || '';
    });
    setScores(nextScores);
    setReflections(nextReflections);
    setNotes(nextNotes);

    const cat = data.catatanTahap.find(
      (c) => c.nipGuru === activeGuru.nip && c.tahap === tahap
    );
    setMasalah(cat?.masalah || '');
    setPemecahan(cat?.pemecahan || '');
    setRencanaTL(cat?.rencanaTL || '');
  }, [activeGuru, tahap, data.penilaian, data.catatanTahap, aspekList]);

  useEffect(() => {
    syncFromSavedData();
  }, [syncFromSavedData]);

  // Reset revision state whenever teacher or stage switches
  useEffect(() => {
    setIsRevising(false);
  }, [selectedGuruId, tahap]);

  const isApproved = activeGuru?.statusBerkas === 'Disetujui';
  const isAlreadyCompleted = Boolean(
    activeGuru &&
      (data.penilaian.some((p) => p.nipGuru === activeGuru.nip && p.tahap === tahap) ||
        data.catatanTahap.some((c) => c.nipGuru === activeGuru.nip && c.tahap === tahap))
  );
  const isLockedAfterSave = isAlreadyCompleted && !isRevising;

  const numericAspeks = aspekList.filter((a) => a.tipePenilaian !== 'teks');
  const textAspeks = aspekList.filter((a) => a.tipePenilaian === 'teks');
  const isTextOnly = textAspeks.length === aspekList.length && aspekList.length > 0;
  const hasAnyText = textAspeks.length > 0;

  const totalSkor = numericAspeks.reduce((acc, a) => acc + (scores[a.id] || 0), 0);
  const maxSkor = numericAspeks.length * 4;
  const nilaiPct = maxSkor > 0 ? Number(((totalSkor / maxSkor) * 100).toFixed(1)) : 0;
  const predikat = hitungPredikat(nilaiPct);
  const filledReflections = textAspeks.filter((a) => (reflections[a.id] || '').trim().length > 0).length;

  function handleStartRevision() {
    setIsRevising(true);
    onNotify?.(
      'success',
      'Mode Revisi Diaktifkan',
      `Formulir penilaian tahap ${tahap} dibuka kembali. Silakan lakukan perbaikan lalu klik Simpan Revisi Nilai.`
    );
  }

  function handleCancelRevision() {
    syncFromSavedData();
    setIsRevising(false);
    onNotify?.(
      'success',
      'Revisi Dibatalkan',
      `Penilaian tahap ${tahap} dikembalikan ke data tersimpan dan dikunci kembali.`
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGuru || !isApproved || isLockedAfterSave) return;

    for (const a of textAspeks) {
      if (!(reflections[a.id] || '').trim()) {
        onError(`Hasil Dialog Refleksi untuk aspek "${a.aspek}" wajib diisi.`);
        return;
      }
    }

    setSaving(true);
    try {
      const items = aspekList.map((a) => ({
        idAspek: a.id,
        skor: a.tipePenilaian === 'teks' ? null : scores[a.id] || 3,
        teksRefleksi: a.tipePenilaian === 'teks' ? reflections[a.id] || '' : undefined,
        catatan: notes[a.id] || '',
      }));
      const updated = await savePenilaianClient({
        guru: activeGuru,
        tahap,
        items,
        masalah,
        pemecahan,
        rencanaTL,
        penilai: user.nama,
        ownerUid,
        directoryUsers: data.users,
      });
      const wasRevision = isAlreadyCompleted;
      setIsRevising(false);
      await onActionSuccess(
        updated,
        wasRevision
          ? `Revisi penilaian tahap ${tahap} untuk ${activeGuru.namaGuru} berhasil disimpan dan dikunci kembali.`
          : `Penilaian tahap ${tahap} untuk ${activeGuru.namaGuru} berhasil disimpan, selesai, dan dikunci.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal menyimpan penilaian.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Guru Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Input Penilaian Tahap {tahap}
          </h3>
          <p className="text-xs text-slate-500">
            {isTextOnly
              ? 'Penilaian pasca pelaksanaan diisi dengan Hasil Dialog Refleksi antara Supervisor dan Guru dalam bentuk teks.'
              : 'Skala Kurikulum Merdeka: 1 (Kurang), 2 (Cukup), 3 (Baik), 4 (Amat Baik)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Pilih Guru Bimbingan"
            value={selectedGuruId}
            onChange={(e) => setSelectedGuruId(e.target.value)}
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {assignedGuru.length === 0 && <option value="">Belum ada guru bimbingan</option>}
            {assignedGuru.map((g) => (
              <option key={g.id} value={g.id}>
                {g.namaGuru} — {g.mataPelajaran} [{g.statusBerkas}]
              </option>
            ))}
          </select>

          {activeGuru && activeGuru.linkDriveBerkas && (
            <a
              href={activeGuru.linkDriveBerkas}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Berkas Drive</span>
            </a>
          )}
        </div>
      </div>

      {!activeGuru ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Tidak ada guru bimbingan yang ditugaskan kepada Anda saat ini.
        </div>
      ) : !isApproved ? (
        <div className="bg-white border border-amber-300 rounded-xl p-8 text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">
            Penilaian Tahap {tahap} Terkunci
          </h4>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Berkas kesiapan atas nama <strong>{activeGuru.namaGuru}</strong> (
            {activeGuru.mataPelajaran}) saat ini berstatus{' '}
            <strong className="text-amber-700">{activeGuru.statusBerkas}</strong> dengan
            kelengkapan <strong>{activeGuru.kelengkapanBerkas}</strong>.
          </p>
          {activeGuru.catatanKepsek && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left">
              <strong>Catatan Kepala Sekolah:</strong> {activeGuru.catatanKepsek}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4">
            Sesuai alur regulasi SADIG, pengisian instrumen supervisi hanya dapat dilakukan setelah
            Kepala Sekolah menandai kelengkapan &ldquo;Ada&rdquo; dan memberikan persetujuan
            (Disetujui).
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lock / Revision Status Banner */}
          {isLockedAfterSave ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-950">
                    Penilaian Tahap {tahap} Selesai &amp; Terkunci
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Nilai untuk <strong>{activeGuru.namaGuru}</strong> sudah tersimpan permanen.
                    Klik tombol <strong>Revisi Penilaian</strong> jika Anda perlu memperbaiki input
                    yang keliru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartRevision}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Revisi Penilaian</span>
              </button>
            </div>
          ) : isRevising ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-950">
                    Mode Revisi Penilaian Tahap {tahap} Aktif
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Perbaiki skor/refleksi atau catatan di bawah, lalu klik{' '}
                    <strong>Simpan Revisi Nilai {tahap}</strong> untuk mengunci kembali.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelRevision}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Revisi</span>
              </button>
            </div>
          ) : null}

          {/* Live Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isLockedAfterSave
                  ? 'Status: Penilaian Terkunci (Mode Baca)'
                  : 'Berkas Disetujui Kepala Sekolah — Formulir Terbuka'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs font-mono-tabular">
              {hasAnyText && (
                <div>
                  <span className="text-slate-500">Dialog Refleksi Terisi: </span>
                  <strong className="text-emerald-700 text-sm">
                    {filledReflections} / {textAspeks.length}
                  </strong>
                </div>
              )}
              {numericAspeks.length > 0 && (
                <>
                  <div>
                    <span className="text-slate-500">Total Skor: </span>
                    <strong className="text-slate-900 text-sm">
                      {totalSkor} / {maxSkor}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Nilai: </span>
                    <strong className="text-emerald-700 text-sm">{nilaiPct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Predikat: </span>
                    <strong className="text-slate-900 text-sm">{predikat}</strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rubric Guide */}
          {numericAspeks.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {SKALA_RUBRIK.map((r) => (
                <div key={r.skor} className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <div className="text-xs font-bold text-slate-900 font-mono-tabular">
                    Skor {r.skor} — {r.label}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.ringkas}</div>
                </div>
              ))}
            </div>
          )}

          {/* Aspects Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Aspek &amp; Deskripsi Indikator ({tahap})</th>
                    <th className="py-3 px-4 min-w-[260px]">
                      {isTextOnly
                        ? 'Hasil Dialog Refleksi (Supervisor & Guru)'
                        : hasAnyText
                        ? 'Skor (1–4) / Hasil Dialog Refleksi'
                        : 'Skor (1–4)'}
                    </th>
                    <th className="py-3 px-4 w-56">Catatan Penilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {aspekList.map((aspek, idx) => {
                    const isTextRow = aspek.tipePenilaian === 'teks';
                    const currentSkor = scores[aspek.id] || 3;
                    return (
                      <tr key={aspek.id} className="hover:bg-slate-50/60 align-top">
                        <td className="py-3.5 px-4 text-center font-mono-tabular text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] font-semibold text-emerald-700 mb-0.5">
                            {aspek.kelompok}
                          </div>
                          <div className="font-semibold text-slate-900">{aspek.aspek}</div>
                          {aspek.kategoriDeskripsi && (
                            <p className="text-xs text-slate-500 mt-1">{aspek.kategoriDeskripsi}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isTextRow ? (
                            <textarea
                              rows={3}
                              required
                              disabled={isLockedAfterSave}
                              value={reflections[aspek.id] || ''}
                              onChange={(e) =>
                                setReflections((prev) => ({
                                  ...prev,
                                  [aspek.id]: e.target.value,
                                }))
                              }
                              placeholder="Tuliskan hasil dialog refleksi antara Supervisor dan Guru..."
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                            />
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              {([1, 2, 3, 4] as const).map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={isLockedAfterSave}
                                  onClick={() =>
                                    setScores((prev) => ({ ...prev, [aspek.id]: val }))
                                  }
                                  className={`w-9 h-9 rounded-lg text-xs font-bold font-mono-tabular transition-colors border ${
                                    currentSkor === val
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  } ${isLockedAfterSave ? 'opacity-80 cursor-not-allowed' : ''}`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            disabled={isLockedAfterSave}
                            value={notes[aspek.id] || ''}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [aspek.id]: e.target.value }))
                            }
                            placeholder="Catatan singkat aspek..."
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Masalah, Pemecahan, Rencana Tindak Lanjut */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">
              Catatan Hasil Supervisi ({tahap})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  1. Masalah yang dihadapi
                </label>
                <textarea
                  rows={3}
                  disabled={isLockedAfterSave}
                  value={masalah}
                  onChange={(e) => setMasalah(e.target.value)}
                  placeholder="Temuan kendala atau area peningkatan..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Pemecahan masalah
                </label>
                <textarea
                  rows={3}
                  disabled={isLockedAfterSave}
                  value={pemecahan}
                  onChange={(e) => setPemecahan(e.target.value)}
                  placeholder="Solusi atau pendampingan yang disepakati..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. Rencana tindak lanjut
                </label>
                <textarea
                  rows={3}
                  disabled={isLockedAfterSave}
                  value={rencanaTL}
                  onChange={(e) => setRencanaTL(e.target.value)}
                  placeholder="Langkah perbaikan pada siklus berikutnya..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {isLockedAfterSave
                    ? 'Penilaian tahap ini sudah selesai dan dikunci. Gunakan tombol Revisi Penilaian untuk mengubah.'
                    : 'Hasil penilaian otomatis tersinkron ke Rekapitulasi Hasil dan lembar cetak Guru.'}
                </span>
              </div>

              {isLockedAfterSave ? (
                <button
                  type="button"
                  onClick={handleStartRevision}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold whitespace-nowrap shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Revisi Penilaian</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  {isRevising && (
                    <button
                      type="button"
                      onClick={handleCancelRevision}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Batal</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {saving
                        ? 'Menyimpan...'
                        : isRevising
                        ? `Simpan Revisi Nilai ${tahap}`
                        : `Simpan Nilai ${tahap}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
