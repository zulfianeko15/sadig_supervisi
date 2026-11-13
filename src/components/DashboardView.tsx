import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import type { AppDatabasePayload, RekapGuru, UserAccount } from '../types';

interface DashboardViewProps {
  user: UserAccount;
  data: AppDatabasePayload;
  onNavigate: (section: string, guruId?: string) => void;
}

export function DashboardView({ user, data, onNavigate }: DashboardViewProps) {
  const relevantRekap: RekapGuru[] =
    user.role === 'Pengawas Supervisi'
      ? data.rekap.filter((r) => r.guru.supervisor === user.nama)
      : user.role === 'Guru'
      ? data.rekap.filter((r) => r.guru.nip === user.nip || r.guru.namaGuru === user.nama)
      : data.rekap;

  const totalGuru = relevantRekap.length;
  const sudahLengkap = relevantRekap.filter((r) => r.sudahLengkap).length;
  const disetujuiKepsek = relevantRekap.filter((r) => r.guru.statusBerkas === 'Disetujui').length;
  const menungguVerifikasi = relevantRekap.filter((r) => r.guru.statusBerkas === 'Belum Dicek').length;
  const ditolak = relevantRekap.filter((r) => r.guru.statusBerkas === 'Ditolak').length;
  const belumSupervisi = totalGuru - sudahLengkap;

  // Donut chart segments
  const totalSafe = Math.max(totalGuru, 1);
  const segComplete = (sudahLengkap / totalSafe) * 100;
  const segInProgress = (Math.max(disetujuiKepsek - sudahLengkap, 0) / totalSafe) * 100;
  const segPending = ((menungguVerifikasi + ditolak) / totalSafe) * 100;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  // Subject averages for Bar Chart
  const mapelBuckets = new Map<string, number[]>();
  relevantRekap.forEach((r) => {
    if (r.nilaiRata !== null) {
      const list = mapelBuckets.get(r.guru.mataPelajaran) || [];
      list.push(r.nilaiRata);
      mapelBuckets.set(r.guru.mataPelajaran, list);
    }
  });
  const mapelStats = Array.from(mapelBuckets.entries()).map(([mapel, vals]) => ({
    mapel,
    avg: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Guru Terdaftar</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-tabular">{totalGuru}</div>
          <p className="text-xs text-slate-500 mt-1.5">
            {user.role === 'Pengawas Supervisi' ? 'Guru bimbingan Anda' : 'Terjadwal supervisi aktif'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Sudah Disupervisi Lengkap</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700 font-mono-tabular">{sudahLengkap}</div>
          <p className="text-xs text-slate-500 mt-1.5">Persiapan, Pelaksanaan & Evaluasi tuntas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Belum Selesai Supervisi</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-tabular">{belumSupervisi}</div>
          <p className="text-xs text-slate-500 mt-1.5">
            {disetujuiKepsek - sudahLengkap > 0
              ? `${disetujuiKepsek - sudahLengkap} siap dinilai supervisor`
              : 'Menunggu penyelesaian tahap'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Menunggu / Revisi Berkas</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-tabular">
            {menungguVerifikasi + ditolak}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-mono-tabular">
            {menungguVerifikasi} Belum Dicek · {ditolak} Ditolak
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart: Distribusi Status Supervisi */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Progres Siklus Supervisi</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribusi kelengkapan 3 tahap dan verifikasi berkas
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="relative w-36 h-36 shrink-0">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {/* Lengkap */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="16"
                  strokeDasharray={`${(segComplete / 100) * circumference} ${circumference}`}
                  strokeDashoffset="0"
                />
                {/* Disetujui tapi belum lengkap */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="16"
                  strokeDasharray={`${(segInProgress / 100) * circumference} ${circumference}`}
                  strokeDashoffset={-((segComplete / 100) * circumference)}
                />
                {/* Belum Dicek / Ditolak */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="16"
                  strokeDasharray={`${(segPending / 100) * circumference} ${circumference}`}
                  strokeDashoffset={-(((segComplete + segInProgress) / 100) * circumference)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 font-mono-tabular">
                  {totalGuru > 0 ? Math.round((sudahLengkap / totalGuru) * 100) : 0}%
                </span>
                <span className="text-[11px] text-slate-500">Tuntas</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />
                  <span>Tuntas 3 Tahap</span>
                </div>
                <span className="font-semibold text-slate-900 font-mono-tabular">{sudahLengkap}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 shrink-0" />
                  <span>Proses Penilaian</span>
                </div>
                <span className="font-semibold text-slate-900 font-mono-tabular">
                  {Math.max(disetujuiKepsek - sudahLengkap, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 shrink-0" />
                  <span>Menunggu / Ditolak</span>
                </div>
                <span className="font-semibold text-slate-900 font-mono-tabular">
                  {menungguVerifikasi + ditolak}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart: Rata-Rata Nilai Per Mata Pelajaran */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Capaian Rata-Rata Nilai per Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi persentase skor skala 1–4 pada tahap yang telah dinilai
              </p>
            </div>
          </div>

          {mapelStats.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Belum ada nilai supervisi yang terekam untuk ditampilkan pada grafik.
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {mapelStats.map((item) => (
                <div key={item.mapel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{item.mapel}</span>
                    <span className="font-mono-tabular font-semibold text-slate-900">
                      {item.avg}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${Math.min(item.avg, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monitoring Status Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {user.role === 'Pengawas Supervisi'
                ? 'Daftar Guru Bimbingan & Status Persetujuan'
                : 'Ringkasan Status Supervisi Guru'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Penilaian 3 tahap hanya terbuka setelah berkas berstatus Disetujui oleh Kepala Sekolah
            </p>
          </div>
          {user.role === 'Kepala Sekolah' && (
            <button
              type="button"
              onClick={() => onNavigate('persetujuan')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span>Kelola Persetujuan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Guru & NIP</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4">Status Berkas</th>
                <th className="py-3 px-4 text-right font-mono-tabular">Persiapan</th>
                <th className="py-3 px-4 text-right font-mono-tabular">Pelaksanaan</th>
                <th className="py-3 px-4 text-right font-mono-tabular">Evaluasi</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {relevantRekap.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-500">
                    Belum ada data guru yang sesuai dengan peran Anda.
                  </td>
                </tr>
              ) : (
                relevantRekap.map((row) => {
                  const isApproved = row.guru.statusBerkas === 'Disetujui';
                  return (
                    <tr key={row.guru.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{row.guru.namaGuru}</div>
                        <div className="text-xs text-slate-500 font-mono-tabular">{row.guru.nip}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{row.guru.mataPelajaran}</td>
                      <td className="py-3 px-4 text-slate-700">{row.guru.supervisor || '-'}</td>
                      <td className="py-3 px-4">
                        {row.guru.statusBerkas === 'Disetujui' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Disetujui ({row.guru.kelengkapanBerkas})
                          </span>
                        )}
                        {row.guru.statusBerkas === 'Belum Dicek' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Belum Dicek
                          </span>
                        )}
                        {row.guru.statusBerkas === 'Ditolak' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-medium text-slate-800">
                        {row.persiapan.nilai !== null ? `${row.persiapan.nilai}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-medium text-slate-800">
                        {row.pelaksanaan.nilai !== null ? `${row.pelaksanaan.nilai}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-medium text-slate-800">
                        {row.evaluasi.mode === 'teks'
                          ? row.evaluasi.terisi > 0
                            ? 'Refleksi Tuntas'
                            : '-'
                          : row.evaluasi.nilai !== null
                          ? `${row.evaluasi.nilai}%`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.role === 'Pengawas Supervisi' ? (
                          isApproved ? (
                            <button
                              type="button"
                              onClick={() => onNavigate('penilaianPersiapan', row.guru.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
                            >
                              <span>Nilai Sekarang</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
                              <Lock className="w-3.5 h-3.5" />
                              Terkunci
                            </span>
                          )
                        ) : user.role === 'Pengawas Sekolah' || user.role === 'Kepala Sekolah' ? (
                          <button
                            type="button"
                            onClick={() => onNavigate('rekapHasil')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 whitespace-nowrap"
                          >
                            <span>Lihat Rekap</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onNavigate('nilaiPersiapan', row.guru.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 whitespace-nowrap"
                          >
                            <span>Lihat Lembar</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
