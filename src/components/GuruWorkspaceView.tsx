import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Upload,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import type { AppDatabasePayload, UserAccount } from '../types';
import { uploadBerkasGuruClient } from '../services/sadigClient';

interface GuruWorkspaceViewProps {
  mode: 'upload' | 'hasil';
  user: UserAccount;
  data: AppDatabasePayload;
  onActionSuccess: (updated: AppDatabasePayload | null, message: string) => Promise<void>;
  onError: (message: string) => void;
  onNavigate: (section: string, guruId?: string) => void;
}

export function GuruWorkspaceView({
  mode,
  user,
  data,
  onActionSuccess,
  onError,
  onNavigate,
}: GuruWorkspaceViewProps) {
  const guru =
    data.guru.find((g) => g.nip === user.nip || g.namaGuru === user.nama) || data.guru[0];
  const rekap = guru ? data.rekap.find((r) => r.guru.id === guru.id) : undefined;

  const [driveLink, setDriveLink] = useState(guru?.linkDriveBerkas || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDriveLink(guru?.linkDriveBerkas || '');
  }, [guru?.linkDriveBerkas]);

  if (!guru) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Akun Anda belum terhubung ke data guru di sistem. Hubungi Admin sekolah.
      </div>
    );
  }

  async function handleUploadDrive(e: React.FormEvent) {
    e.preventDefault();
    if (!driveLink.trim().startsWith('http')) {
      onError('Masukkan URL Google Drive yang valid (diawali https://).');
      return;
    }
    setSaving(true);
    try {
      const updated = await uploadBerkasGuruClient(guru.id, driveLink.trim());
      await onActionSuccess(
        updated,
        'Tautan Google Drive berhasil dikirim. Menunggu persetujuan Kepala Sekolah.'
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Gagal mengirim tautan Google Drive.');
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'upload') {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Tautan Berkas Kesiapan Supervisi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {guru.namaGuru} · {guru.mataPelajaran} · Supervisor: {guru.supervisor || '-'}
              </p>
            </div>
            <div>
              {guru.statusBerkas === 'Disetujui' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Disetujui Kepala Sekolah
                </span>
              )}
              {guru.statusBerkas === 'Belum Dicek' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <Clock className="w-4 h-4" /> Menunggu Verifikasi Kepala Sekolah
                </span>
              )}
              {guru.statusBerkas === 'Ditolak' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                  <XCircle className="w-4 h-4" /> Perlu Revisi (Ditolak)
                </span>
              )}
            </div>
          </div>

          {guru.catatanKepsek && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong>Catatan Kepala Sekolah:</strong> {guru.catatanKepsek}
            </div>
          )}

          <form onSubmit={handleUploadDrive} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Tautan Folder / Berkas Google Drive (Modul Ajar, ATP, LKPD, Asesmen)
              </label>
              <input
                type="url"
                required
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono-tabular focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Pastikan izin akses tautan diatur ke &ldquo;Siapa saja yang memiliki link dapat
                melihat&rdquo; agar Kepala Sekolah dan Pengawas dapat memeriksa dokumen.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {guru.linkDriveBerkas ? (
                <a
                  href={guru.linkDriveBerkas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pratinjau Tautan Saat Ini</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400">Belum ada tautan tersimpan</span>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Kirim Tautan Berkas'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Hasil Supervisi view
  const catatanList = data.catatanTahap.filter((c) => c.nipGuru === guru.nip);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Hasil Supervisi Akademik Anda
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono-tabular">
              {guru.namaGuru} · NIP. {guru.nip} · {guru.mataPelajaran}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Predikat Akhir</div>
            <div className="text-lg font-bold text-emerald-700">
              {rekap?.predikatAkhir || 'Belum Dinilai'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              {
                label: 'Tahap Persiapan',
                summary: rekap?.persiapan,
                target: 'nilaiPersiapan',
              },
              {
                label: 'Tahap Pelaksanaan',
                summary: rekap?.pelaksanaan,
                target: 'nilaiPelaksanaan',
              },
              {
                label: 'Tahap Evaluasi',
                summary: rekap?.evaluasi,
                target: 'nilaiEvaluasi',
              },
            ] as const
          ).map((card) => (
            <div
              key={card.label}
              className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between bg-slate-50/40"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>{card.label}</span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
                  {card.summary?.mode === 'teks'
                    ? card.summary.terisi > 0
                      ? 'Refleksi Tuntas'
                      : 'Belum Diisi'
                    : card.summary?.nilai !== null && card.summary?.nilai !== undefined
                    ? `${card.summary.nilai}%`
                    : '-'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {card.summary?.mode === 'teks' ? (
                    <>
                      Dialog Refleksi ·{' '}
                      <span className="font-mono-tabular">
                        {card.summary.terisi}/{card.summary.jumlahAspek} Aspek Terisi
                      </span>
                    </>
                  ) : (
                    <>
                      {card.summary?.predikat || 'Belum Dinilai'} · Skor{' '}
                      <span className="font-mono-tabular">
                        {card.summary?.totalSkor ?? 0}/{card.summary?.skorMaksimal ?? 0}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(card.target, guru.id)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <span>Buka Lembar SUPAK</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Catatan Pengawas Supervisi */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
          Catatan & Rencana Tindak Lanjut dari Pengawas Supervisi
        </h4>
        {catatanList.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada catatan evaluasi dari Pengawas Supervisi.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {catatanList.map((c) => (
              <div key={c.tahap} className="py-4 first:pt-0 last:pb-0 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Tahap {c.tahap}</span>
                  <span className="text-xs text-slate-500 font-mono-tabular">
                    Penilai: {c.penilai} · {c.updatedAt}
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>Masalah:</strong> {c.masalah || '-'}
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Pemecahan:</strong> {c.pemecahan || '-'}
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Rencana Tindak Lanjut:</strong> {c.rencanaTL || '-'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
