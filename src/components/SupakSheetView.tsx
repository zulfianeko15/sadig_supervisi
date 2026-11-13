import React, { useEffect, useState } from 'react';
import { Printer, Check } from 'lucide-react';
import type {
  AppDatabasePayload,
  AspekItem,
  PenilaianItem,
  TahapSummary,
  TahapSupervisi,
  UserAccount,
} from '../types';
import { hitungPredikat } from '../types';
import { KopSurat } from './SchoolCrest';
import { exportSupakPdf } from '../utils/pdfExport';

interface SupakSheetViewProps {
  tahap: TahapSupervisi;
  data: AppDatabasePayload;
  user: UserAccount;
  initialGuruId?: string;
}

export function SupakSheetView({
  tahap,
  data,
  user,
  initialGuruId,
}: SupakSheetViewProps) {
  const selectableGuru =
    user.role === 'Guru'
      ? data.guru.filter((g) => g.nip === user.nip || g.namaGuru === user.nama)
      : user.role === 'Pengawas Supervisi'
      ? data.guru.filter((g) => g.supervisor === user.nama)
      : data.guru;

  const [selectedGuruId, setSelectedGuruId] = useState<string>(
    initialGuruId || selectableGuru[0]?.id || ''
  );
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (initialGuruId && selectableGuru.some((g) => g.id === initialGuruId)) {
      setSelectedGuruId(initialGuruId);
    } else if (!selectableGuru.some((g) => g.id === selectedGuruId)) {
      setSelectedGuruId(selectableGuru[0]?.id || '');
    }
  }, [initialGuruId, selectableGuru, selectedGuruId]);

  const activeGuru = selectableGuru.find((g) => g.id === selectedGuruId) || null;

  const aspekList: AspekItem[] =
    tahap === 'Persiapan'
      ? data.aspekPersiapan
      : tahap === 'Pelaksanaan'
      ? data.aspekPelaksanaan
      : data.aspekEvaluasi;

  const penilaianMap = new Map<string, PenilaianItem>();
  if (activeGuru) {
    data.penilaian
      .filter((p) => p.nipGuru === activeGuru.nip && p.tahap === tahap)
      .forEach((p) => {
        penilaianMap.set(p.idAspek, p);
      });
  }

  const catatanTahap = activeGuru
    ? data.catatanTahap.find((c) => c.nipGuru === activeGuru.nip && c.tahap === tahap)
    : undefined;

  const textCount = aspekList.filter((a) => a.tipePenilaian === 'teks').length;
  const numericAspeks = aspekList.filter((a) => a.tipePenilaian !== 'teks');
  const mode: TahapSummary['mode'] =
    textCount === aspekList.length && aspekList.length > 0
      ? 'teks'
      : textCount === 0
      ? 'skor'
      : 'campuran';

  let totalSkor = 0;
  let terisi = 0;
  let numericFilled = 0;
  aspekList.forEach((a) => {
    const entry = penilaianMap.get(a.id);
    if (!entry) return;
    if (a.tipePenilaian === 'teks') {
      if (entry.teksRefleksi && entry.teksRefleksi.trim().length > 0) terisi++;
    } else if (entry.skor && [1, 2, 3, 4].includes(Number(entry.skor))) {
      totalSkor += Number(entry.skor);
      terisi++;
      numericFilled++;
    }
  });

  const skorMaksimal = numericAspeks.length * 4;
  const nilaiAkhir =
    skorMaksimal > 0 && numericFilled > 0
      ? Number(((totalSkor / skorMaksimal) * 100).toFixed(1))
      : null;

  const predikat =
    mode === 'teks'
      ? terisi > 0
        ? 'Tuntas (Dialog Refleksi)'
        : 'Belum Diisi'
      : numericFilled > 0
      ? hitungPredikat(nilaiAkhir)
      : 'Belum Ada Nilai';

  const summaryObj: TahapSummary = {
    jumlahAspek: aspekList.length,
    terisi,
    totalSkor,
    skorMaksimal,
    nilai: nilaiAkhir,
    predikat,
    mode,
  };

  const groupedAspek: Array<{ kelompok: string; items: Array<{ index: number; item: AspekItem }> }> =
    [];
  aspekList.forEach((item, idx) => {
    const existing = groupedAspek.find((g) => g.kelompok === item.kelompok);
    if (existing) {
      existing.items.push({ index: idx + 1, item });
    } else {
      groupedAspek.push({ kelompok: item.kelompok, items: [{ index: idx + 1, item }] });
    }
  });

  const stageTitle =
    tahap === 'Persiapan'
      ? '(PERSIAPAN PEMBELAJARAN)'
      : tahap === 'Pelaksanaan'
      ? '(PELAKSANAAN PEMBELAJARAN)'
      : '(EVALUASI & DIALOG REFLEKSI PEMBELAJARAN)';

  const columnTitle =
    tahap === 'Persiapan'
      ? 'ELEMEN DAN SUB-ELEMEN PERSIAPAN PEMBELAJARAN'
      : tahap === 'Pelaksanaan'
      ? 'ELEMEN DAN SUB-ELEMEN PELAKSANAAN PEMBELAJARAN'
      : 'ELEMEN DAN SUB-ELEMEN EVALUASI PEMBELAJARAN';

  async function handleDownloadPdf() {
    if (!activeGuru) return;
    setDownloading(true);
    try {
      await exportSupakPdf({
        tahap,
        guru: activeGuru,
        aspekList,
        penilaianMap,
        catatanTahap,
        pengaturan: data.pengaturan,
        summary: summaryObj,
      });
    } finally {
      setDownloading(false);
    }
  }

  const p = data.pengaturan;
  const isTextOnly = mode === 'teks';

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Nilai {tahap}</h3>
          <p className="text-xs text-slate-500">
            Lembar Instrumen Supervisi Akademis (SUPAK) resmi siap simpan ke PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user.role !== 'Guru' && (
            <select
              aria-label="Pilih Guru"
              value={selectedGuruId}
              onChange={(e) => setSelectedGuruId(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">-- Pilih Guru --</option>
              {selectableGuru.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.namaGuru} ({g.mataPelajaran})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={!activeGuru || downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{downloading ? 'Membuat PDF...' : 'Cetak / Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Official SUPAK Document */}
      {!activeGuru ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Pilih guru terlebih dahulu untuk menampilkan lembar Nilai {tahap}.
        </div>
      ) : (
        <div
          id="supak-print-area"
          className="supak-print-card bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-black print-only-container"
        >
          <KopSurat pengaturan={p} />

          <div className="border-t-2 border-black mb-3" />

          {/* BANNER SUPAK */}
          <div className="bg-[#1e3a8a] text-white rounded-xl py-2.5 px-4 text-center mb-4 border border-slate-900">
            <p className="font-extrabold text-sm sm:text-base uppercase tracking-wide">
              INSTRUMEN SUPERVISI AKADEMIS (SUPAK)
            </p>
            <p className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
              &ldquo;PENDEKATAN PEMBELAJARAN MENDALAM (PM)&rdquo;
            </p>
            <p className="font-bold text-xs sm:text-sm uppercase text-sky-300 mt-0.5">
              SEMESTER {p.semester} TAHUN PELAJARAN {p.tahunPelajaran}
            </p>
            <p className="font-bold text-xs sm:text-sm uppercase text-sky-200 underline mt-0.5">
              {stageTitle}
            </p>
          </div>

          {/* METADATA TABLE */}
          <table className="w-full text-xs sm:text-sm mb-3 border-collapse">
            <tbody>
              <tr>
                <td className="py-1 font-semibold w-36 whitespace-nowrap">Nama Sekolah</td>
                <td className="py-1 pr-4">: {p.namaSekolah}</td>
                <td className="py-1 font-semibold w-36 whitespace-nowrap">Mata Pelajaran</td>
                <td className="py-1">: {activeGuru.mataPelajaran}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold whitespace-nowrap">Nama Guru</td>
                <td className="py-1 pr-4">
                  : {activeGuru.namaGuru}{' '}
                  <span className="font-mono-tabular text-xs">(NIP. {activeGuru.nip})</span>
                </td>
                <td className="py-1 font-semibold whitespace-nowrap">Tanggal Pelaksanaan</td>
                <td className="py-1 font-mono-tabular">
                  : {activeGuru.tanggalPelaksanaan || p.tanggalPelaksanaanUmum}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold mb-2">
            {isTextOnly
              ? 'PETUNJUK: Evaluasi pasca pelaksanaan diisi dengan Hasil Dialog Refleksi antara Supervisor dan Guru.'
              : 'PETUNJUK: Kolom skor 1–4 diisi sesuai rubrik Kurikulum Merdeka (1 = Kurang, 2 = Cukup, 3 = Baik, 4 = Amat Baik).'}
          </p>

          {/* CHECKLIST / DIALOG REFLEKSI TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                {isTextOnly ? (
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black py-1.5 px-2 w-10">NO</th>
                    <th className="border border-black py-1.5 px-2 text-left w-72">
                      {columnTitle}
                    </th>
                    <th className="border border-black py-1.5 px-2 text-left">
                      HASIL DIALOG REFLEKSI (SUPERVISOR &amp; GURU)
                    </th>
                    <th className="border border-black py-1.5 px-2 w-44 text-left">
                      CATATAN ASPEK
                    </th>
                  </tr>
                ) : (
                  <>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th rowSpan={2} className="border border-black py-1.5 px-2 w-10">
                        NO
                      </th>
                      <th rowSpan={2} className="border border-black py-1.5 px-2 text-left">
                        {columnTitle}
                      </th>
                      <th colSpan={4} className="border border-black py-1 px-2">
                        SKOR
                      </th>
                      <th rowSpan={2} className="border border-black py-1.5 px-2 w-44 text-left">
                        CATATAN ASPEK
                      </th>
                    </tr>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black py-1 w-9">1</th>
                      <th className="border border-black py-1 w-9">2</th>
                      <th className="border border-black py-1 w-9">3</th>
                      <th className="border border-black py-1 w-9">4</th>
                    </tr>
                  </>
                )}
              </thead>
              <tbody>
                {groupedAspek.map((group) => (
                  <React.Fragment key={group.kelompok}>
                    <tr className="bg-slate-100 font-bold">
                      <td
                        colSpan={isTextOnly ? 4 : 7}
                        className="border border-black py-1.5 px-2.5 uppercase"
                      >
                        {group.kelompok}
                      </td>
                    </tr>
                    {group.items.map(({ index, item }) => {
                      const entry = penilaianMap.get(item.id);
                      const isTextRow = item.tipePenilaian === 'teks';
                      const val = entry?.skor || 0;
                      return (
                        <tr key={item.id}>
                          <td className="border border-black py-1.5 px-2 text-center font-mono-tabular">
                            {index}
                          </td>
                          <td className="border border-black py-1.5 px-2.5">
                            <div className="font-semibold">{item.aspek}</div>
                            {item.kategoriDeskripsi && (
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                {item.kategoriDeskripsi}
                              </div>
                            )}
                          </td>
                          {isTextOnly ? (
                            <td className="border border-black py-1.5 px-2.5 text-slate-900">
                              {entry?.teksRefleksi || '-'}
                            </td>
                          ) : isTextRow ? (
                            <td
                              colSpan={4}
                              className="border border-black py-1.5 px-2.5 text-slate-900"
                            >
                              <span className="font-semibold text-[11px] block">
                                Dialog Refleksi:
                              </span>
                              {entry?.teksRefleksi || '-'}
                            </td>
                          ) : (
                            [1, 2, 3, 4].map((s) => (
                              <td
                                key={s}
                                className="border border-black py-1.5 text-center font-bold"
                              >
                                {val === s ? (
                                  <Check className="w-4 h-4 mx-auto text-black stroke-[3]" />
                                ) : null}
                              </td>
                            ))
                          )}
                          <td className="border border-black py-1.5 px-2 text-[11px]">
                            {entry?.catatan || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUMMARY BAR */}
          <div className="border-[1.5px] border-black p-2.5 mt-3 bg-white">
            {isTextOnly ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs sm:text-sm font-bold font-mono-tabular">
                <div>
                  Aspek Terisi : {terisi} / {aspekList.length}
                </div>
                <div>Metode : Dialog Refleksi Manual</div>
                <div>Status : {predikat}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs sm:text-sm font-bold font-mono-tabular">
                <div>Jumlah Skor : {totalSkor}</div>
                <div>
                  Aspek Dinilai : {terisi} / {aspekList.length}
                </div>
                <div>Skor Maksimal : {skorMaksimal}</div>
                <div>Nilai : {nilaiAkhir !== null ? `${nilaiAkhir}%` : '0%'}</div>
              </div>
            )}
          </div>

          {/* CATATAN HASIL SUPERVISI */}
          <div className="border border-black p-3 mt-3 bg-slate-50 text-xs space-y-1">
            <p className="font-bold uppercase">CATATAN HASIL SUPERVISI ({tahap.toUpperCase()}):</p>
            <p>
              <strong>1. Masalah yang dihadapi:</strong> {catatanTahap?.masalah || '-'}
            </p>
            <p>
              <strong>2. Pemecahan masalah:</strong> {catatanTahap?.pemecahan || '-'}
            </p>
            <p>
              <strong>3. Rencana tindak lanjut:</strong> {catatanTahap?.rencanaTL || '-'}
            </p>
          </div>

          {/* 4-BLOCK SIGNATURES */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-center text-xs mt-6">
            <div>
              <p>&nbsp;</p>
              <p className="font-semibold">Supervisor</p>
              <div className="h-14" />
              <p className="font-bold underline">{activeGuru.supervisor || '-'}</p>
              <p className="font-mono-tabular">NIP. {activeGuru.nipSupervisor || '-'}</p>
            </div>
            <div>
              <p>{p.tempatTanggalCetak}</p>
              <p className="font-semibold">Supervisee (Guru)</p>
              <div className="h-14" />
              <p className="font-bold underline">{activeGuru.namaGuru}</p>
              <p className="font-mono-tabular">NIP. {activeGuru.nip || '-'}</p>
            </div>

            <div className="col-span-2 text-center font-semibold -mb-3">Mengetahui,</div>

            <div>
              <p className="font-semibold">Pengawas Sekolah / Pembina</p>
              <div className="h-14" />
              <p className="font-bold underline">{p.namaPengawasSekolah}</p>
              <p className="font-mono-tabular">NIP. {p.nipPengawas}</p>
            </div>
            <div>
              <p className="font-semibold">Kepala Sekolah</p>
              <div className="h-14" />
              <p className="font-bold underline">{p.namaKepalaSekolah}</p>
              <p className="font-mono-tabular">NIP. {p.nipKepalaSekolah}</p>
            </div>
          </div>

          {/* PREDIKAT LEGEND */}
          <div className="border-[1.5px] border-black p-2.5 mt-5 bg-slate-50 text-xs">
            <p className="font-bold">RENTANG SKOR &amp; PREDIKAT KURIKULUM MERDEKA:</p>
            <p className="mt-0.5 font-mono-tabular">
              86–100% = Amat Baik | 71–85% = Baik | 56–70% = Cukup | ≤ 55% = Kurang
            </p>
            <p className="font-bold mt-1 text-emerald-800">Kategori Saat Ini: {predikat}</p>
          </div>
        </div>
      )}
    </div>
  );
}
