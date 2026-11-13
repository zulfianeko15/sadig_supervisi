import React, { useState } from 'react';
import { Printer, Filter } from 'lucide-react';
import type { AppDatabasePayload, UserAccount } from '../types';
import { KopSurat } from './SchoolCrest';
import { exportRekapPdf } from '../utils/pdfExport';

interface RekapHasilViewProps {
  data: AppDatabasePayload;
  user: UserAccount;
}

export function RekapHasilView({ data, user }: RekapHasilViewProps) {
  const [mapelFilter, setMapelFilter] = useState('Semua');
  const [downloading, setDownloading] = useState(false);

  const baseList =
    user.role === 'Pengawas Supervisi'
      ? data.rekap.filter((r) => r.guru.supervisor === user.nama)
      : data.rekap;

  const uniqueMapel = Array.from(new Set(baseList.map((r) => r.guru.mataPelajaran)));

  const filtered = baseList.filter(
    (r) => mapelFilter === 'Semua' || r.guru.mataPelajaran === mapelFilter
  );

  const p = data.pengaturan;

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      await exportRekapPdf({
        rekapList: filtered,
        pengaturan: p,
        mapelFilter,
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Rekapitulasi Hasil Supervisi</h3>
          <p className="text-xs text-slate-500">
            Akumulasi nilai tahap Persiapan, Pelaksanaan, dan Evaluasi Dialog Refleksi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <select
              aria-label="Filter Mata Pelajaran"
              value={mapelFilter}
              onChange={(e) => setMapelFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="Semua">Semua Mata Pelajaran</option>
              {uniqueMapel.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{downloading ? 'Membuat PDF...' : 'Cetak / Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Rekap Sheet */}
      <div className="supak-print-card bg-white border border-slate-200 rounded-xl p-6 sm:p-8 print-only-container">
        <KopSurat pengaturan={p} />

        <div className="text-center border-b-2 border-black pb-3 mb-5">
          <h4 className="font-extrabold text-base uppercase text-black">
            REKAPITULASI HASIL SUPERVISI AKADEMIK GURU
          </h4>
          <p className="text-xs font-medium text-slate-700 mt-0.5">
            Tahun Pelajaran {p.tahunPelajaran} · Semester {p.semester}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs text-black">
            <thead>
              <tr className="bg-[#1e3a8a] text-white text-center font-bold">
                <th rowSpan={2} className="border border-slate-900 py-2 px-2 w-10">
                  No
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-3 text-left">
                  Nama Guru / NIP
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-3 text-left">
                  Mata Pelajaran
                </th>
                <th colSpan={2} className="border border-slate-900 py-1.5 px-2">
                  Persiapan
                </th>
                <th colSpan={2} className="border border-slate-900 py-1.5 px-2">
                  Pelaksanaan
                </th>
                <th colSpan={2} className="border border-slate-900 py-1.5 px-2">
                  Evaluasi / Refleksi
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-2">
                  Rata-Rata
                </th>
                <th rowSpan={2} className="border border-slate-900 py-2 px-3">
                  Predikat
                </th>
              </tr>
              <tr className="bg-[#1e3a8a] text-white text-center font-bold">
                <th className="border border-slate-900 py-1 px-2">Skor</th>
                <th className="border border-slate-900 py-1 px-2">Nilai</th>
                <th className="border border-slate-900 py-1 px-2">Skor</th>
                <th className="border border-slate-900 py-1 px-2">Nilai</th>
                <th className="border border-slate-900 py-1 px-2">Aspek</th>
                <th className="border border-slate-900 py-1 px-2">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-black py-6 text-center text-slate-500">
                    Belum ada data rekapitulasi untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.guru.id}>
                    <td className="border border-black py-2 px-2 text-center font-mono-tabular">
                      {idx + 1}
                    </td>
                    <td className="border border-black py-2 px-3">
                      <div className="font-bold">{r.guru.namaGuru}</div>
                      <div className="text-[11px] text-slate-600 font-mono-tabular">
                        {r.guru.nip}
                      </div>
                    </td>
                    <td className="border border-black py-2 px-3">{r.guru.mataPelajaran}</td>
                    <td className="border border-black py-2 px-2 text-center font-mono-tabular">
                      {r.persiapan.terisi > 0 ? r.persiapan.totalSkor : '-'}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-bold font-mono-tabular">
                      {r.persiapan.nilai !== null ? `${r.persiapan.nilai}%` : '-'}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-mono-tabular">
                      {r.pelaksanaan.terisi > 0 ? r.pelaksanaan.totalSkor : '-'}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-bold font-mono-tabular">
                      {r.pelaksanaan.nilai !== null ? `${r.pelaksanaan.nilai}%` : '-'}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-mono-tabular">
                      {r.evaluasi.mode === 'teks'
                        ? r.evaluasi.terisi > 0
                          ? `${r.evaluasi.terisi}/${r.evaluasi.jumlahAspek}`
                          : '-'
                        : r.evaluasi.terisi > 0
                        ? r.evaluasi.totalSkor
                        : '-'}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-bold">
                      {r.evaluasi.mode === 'teks' ? (
                        r.evaluasi.terisi > 0 ? (
                          <span className="text-emerald-800">Refleksi Tuntas</span>
                        ) : (
                          '-'
                        )
                      ) : r.evaluasi.nilai !== null ? (
                        <span className="font-mono-tabular">{r.evaluasi.nilai}%</span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border border-black py-2 px-2 text-center font-extrabold font-mono-tabular text-emerald-800">
                      {r.nilaiRata !== null ? `${r.nilaiRata}%` : '-'}
                    </td>
                    <td className="border border-black py-2 px-3 text-center font-semibold">
                      {r.predikatAkhir}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border border-black p-2.5 mt-4 bg-slate-50 text-xs">
          <strong>Keterangan Rentang Nilai Kurikulum Merdeka:</strong>{' '}
          <span className="font-mono-tabular">
            86–100% = Amat Baik | 71–85% = Baik | 56–70% = Cukup | ≤ 55% = Kurang
          </span>
        </div>

        <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Pengawas Sekolah,</p>
            <div className="h-14" />
            <p className="font-bold underline">{p.namaPengawasSekolah}</p>
            <p className="font-mono-tabular">NIP. {p.nipPengawas}</p>
          </div>
          <div>
            <p>{p.tempatTanggalCetak}</p>
            <p className="font-semibold">Kepala Sekolah,</p>
            <div className="h-14" />
            <p className="font-bold underline">{p.namaKepalaSekolah}</p>
            <p className="font-mono-tabular">NIP. {p.nipKepalaSekolah}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
