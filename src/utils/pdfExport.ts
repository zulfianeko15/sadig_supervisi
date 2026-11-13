import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  AspekItem,
  CatatanTahap,
  GuruRecord,
  PengaturanSekolah,
  PenilaianItem,
  RekapGuru,
  TahapSummary,
  TahapSupervisi,
} from '../types';

const DEFAULT_LEFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 88">
  <path d="M40 4L72 16V44C72 64.5 56.5 78.5 40 84C23.5 78.5 8 64.5 8 44V16L40 4Z" fill="#0F172A" stroke="#B45309" stroke-width="3"/>
  <path d="M40 10L66 20V43.5C66 60.5 53 72.5 40 77.5C27 72.5 14 60.5 14 43.5V20L40 10Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.5"/>
  <path d="M40 16L44 26H54L46 32L49 42L40 36L31 42L34 32L26 26H36L40 16Z" fill="#D97706"/>
  <path d="M22 48H58V54C58 62 49 69 40 72C31 69 22 62 22 54V48Z" fill="#059669"/>
  <circle cx="40" cy="58" r="5" fill="#FFFFFF"/>
</svg>`;

const DEFAULT_RIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <polygon points="40,4 74,24 74,56 40,76 6,56 6,24" fill="#1E3A8A" stroke="#0F172A" stroke-width="2.5"/>
  <polygon points="40,10 68,26.5 68,53.5 40,70 12,53.5 12,26.5" fill="#EFF6FF" stroke="#1E3A8A" stroke-width="1.5"/>
  <path d="M22 44C22 33 30 25 40 25C50 25 58 33 58 44" stroke="#1E3A8A" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M40 20V56" stroke="#D97706" stroke-width="3" stroke-linecap="round"/>
  <path d="M28 50L40 58L52 50" stroke="#1E3A8A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="40" cy="37" r="6" fill="#D97706"/>
</svg>`;

async function imageToPngDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, 160, 160);
        const ratio = Math.min(160 / img.width, 160 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, (160 - w) / 2, (160 - h) / 2, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function resolveLogoPng(customDataUrl: string | undefined, fallbackSvg: string): Promise<string | null> {
  if (customDataUrl && customDataUrl.trim()) {
    const converted = await imageToPngDataUrl(customDataUrl);
    if (converted) return converted;
  }
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
  return imageToPngDataUrl(svgUrl);
}

async function drawKopSurat(
  doc: jsPDF,
  p: PengaturanSekolah,
  pageWidth: number,
  marginX: number
): Promise<number> {
  const [leftPng, rightPng] = await Promise.all([
    resolveLogoPng(p.logoKiri, DEFAULT_LEFT_SVG),
    resolveLogoPng(p.logoKanan, DEFAULT_RIGHT_SVG),
  ]);

  const topY = 10;
  const logoSize = 18;
  if (leftPng) {
    doc.addImage(leftPng, 'PNG', marginX + 2, topY, logoSize, logoSize);
  }
  if (rightPng) {
    doc.addImage(rightPng, 'PNG', pageWidth - marginX - logoSize - 2, topY, logoSize, logoSize);
  }

  const centerX = pageWidth / 2;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text((p.pemerintahDaerah || '').toUpperCase(), centerX, topY + 4, { align: 'center' });
  doc.text((p.dinasPendidikan || '').toUpperCase(), centerX, topY + 9, { align: 'center' });
  doc.setFontSize(11.5);
  doc.text((p.namaSekolah || '').toUpperCase(), centerX, topY + 14.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(p.alamatSekolah || '', centerX, topY + 19, { align: 'center' });

  const lineY = topY + 22;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  doc.setLineWidth(0.3);
  doc.line(marginX, lineY + 1.2, pageWidth - marginX, lineY + 1.2);

  return lineY + 4.5;
}

export async function exportSupakPdf(params: {
  tahap: TahapSupervisi;
  guru: GuruRecord;
  aspekList: AspekItem[];
  penilaianMap: Map<string, PenilaianItem>;
  catatanTahap?: CatatanTahap;
  pengaturan: PengaturanSekolah;
  summary: TahapSummary;
}): Promise<void> {
  const { tahap, guru, aspekList, penilaianMap, catatanTahap, pengaturan, summary } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  let y = await drawKopSurat(doc, pengaturan, pageWidth, marginX);

  // Banner SUPAK
  const bannerHeight = 20;
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, bannerHeight, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INSTRUMEN SUPERVISI AKADEMIS (SUPAK)', pageWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text('"PENDEKATAN PEMBELAJARAN MENDALAM (PM)"', pageWidth / 2, y + 10, { align: 'center' });
  doc.setTextColor(125, 211, 252);
  doc.setFontSize(8.5);
  doc.text(
    `SEMESTER ${pengaturan.semester} TAHUN PELAJARAN ${pengaturan.tahunPelajaran}`,
    pageWidth / 2,
    y + 14.3,
    { align: 'center' }
  );
  const stageSubtitle =
    tahap === 'Persiapan'
      ? '(PERSIAPAN PEMBELAJARAN)'
      : tahap === 'Pelaksanaan'
      ? '(PELAKSANAAN PEMBELAJARAN)'
      : '(EVALUASI & DIALOG REFLEKSI PEMBELAJARAN)';
  doc.text(stageSubtitle, pageWidth / 2, y + 18.2, { align: 'center' });

  y += bannerHeight + 4;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  // Metadata 2-column
  const colMid = pageWidth / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Sekolah', marginX, y);
  doc.text('Mata Pelajaran', colMid, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${pengaturan.namaSekolah}`, marginX + 26, y);
  doc.text(`: ${guru.mataPelajaran}`, colMid + 32, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Guru', marginX, y);
  doc.text('Tanggal Pelaksanaan', colMid, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${guru.namaGuru} (NIP. ${guru.nip})`, marginX + 26, y);
  doc.text(`: ${guru.tanggalPelaksanaan || pengaturan.tanggalPelaksanaanUmum}`, colMid + 32, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const isTextOnly = summary.mode === 'teks';
  doc.text(
    isTextOnly
      ? 'PETUNJUK: Kolom evaluasi diisi berdasarkan Hasil Dialog Refleksi antara Supervisor dan Guru pasca observasi kelas.'
      : 'PETUNJUK: Skor diisi sesuai skala Kurikulum Merdeka (1 = Kurang, 2 = Cukup, 3 = Baik, 4 = Amat Baik).',
    marginX,
    y
  );
  y += 3;

  // Build table rows
  const grouped: Array<{ kelompok: string; items: Array<{ index: number; item: AspekItem }> }> = [];
  aspekList.forEach((item, idx) => {
    const found = grouped.find((g) => g.kelompok === item.kelompok);
    if (found) found.items.push({ index: idx + 1, item });
    else grouped.push({ kelompok: item.kelompok, items: [{ index: idx + 1, item }] });
  });

  if (isTextOnly) {
    const bodyRows: Array<Array<string | { content: string; colSpan?: number; styles?: Record<string, unknown> }>> = [];
    grouped.forEach((g) => {
      bodyRows.push([
        {
          content: g.kelompok.toUpperCase(),
          colSpan: 4,
          styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [0, 0, 0] },
        },
      ]);
      g.items.forEach(({ index, item }) => {
        const entry = penilaianMap.get(item.id);
        bodyRows.push([
          String(index),
          `${item.aspek}\n${item.kategoriDeskripsi || ''}`.trim(),
          entry?.teksRefleksi || '-',
          entry?.catatan || '-',
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'NO',
          'ELEMEN DAN SUB-ELEMEN EVALUASI',
          'HASIL DIALOG REFLEKSI (SUPERVISOR & GURU)',
          'CATATAN ASPEK',
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 56 },
        2: { cellWidth: 78 },
        3: { cellWidth: 42 },
      },
    });
  } else {
    const checkedCellCoords: Array<{ rowIndex: number; colIndex: number }> = [];
    const bodyRows: Array<Array<string | { content: string; colSpan?: number; styles?: Record<string, unknown> }>> = [];

    let rowCursor = 0;
    grouped.forEach((g) => {
      bodyRows.push([
        {
          content: g.kelompok.toUpperCase(),
          colSpan: 7,
          styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [0, 0, 0] },
        },
      ]);
      rowCursor++;
      g.items.forEach(({ index, item }) => {
        const entry = penilaianMap.get(item.id);
        const skor = entry?.skor || 0;
        if (item.tipePenilaian === 'teks') {
          bodyRows.push([
            String(index),
            `${item.aspek}\n${item.kategoriDeskripsi || ''}`.trim(),
            { content: entry?.teksRefleksi || '-', colSpan: 4 },
            entry?.catatan || '-',
          ]);
        } else {
          if (skor >= 1 && skor <= 4) {
            checkedCellCoords.push({ rowIndex: rowCursor, colIndex: 1 + skor });
          }
          bodyRows.push([
            String(index),
            `${item.aspek}\n${item.kategoriDeskripsi || ''}`.trim(),
            '',
            '',
            '',
            '',
            entry?.catatan || '-',
          ]);
        }
        rowCursor++;
      });
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'NO', rowSpan: 2, styles: { valign: 'middle' } },
          {
            content: `ELEMEN DAN SUB-ELEMEN ${tahap.toUpperCase()} PEMBELAJARAN`,
            rowSpan: 2,
            styles: { valign: 'middle', halign: 'left' },
          },
          { content: 'SKOR', colSpan: 4 },
          { content: 'CATATAN ASPEK', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        ],
        ['1', '2', '3', '4'],
      ],
      body: bodyRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 96 },
        2: { cellWidth: 9, halign: 'center' },
        3: { cellWidth: 9, halign: 'center' },
        4: { cellWidth: 9, halign: 'center' },
        5: { cellWidth: 9, halign: 'center' },
        6: { cellWidth: 44 },
      },
      didDrawCell: (hookData) => {
        if (hookData.section === 'body') {
          const isMatch = checkedCellCoords.some(
            (c) => c.rowIndex === hookData.row.index && c.colIndex === hookData.column.index
          );
          if (isMatch) {
            const cx = hookData.cell.x + hookData.cell.width / 2;
            const cy = hookData.cell.y + hookData.cell.height / 2;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.55);
            doc.line(cx - 1.6, cy + 0.1, cx - 0.3, cy + 1.5);
            doc.line(cx - 0.3, cy + 1.5, cx + 2.0, cy - 1.5);
          }
        }
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 4;

  // Ensure remaining summary + notes + signatures fit nicely
  if (y + 82 > pageHeight - 10) {
    doc.addPage();
    y = 14;
  }

  // Summary box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(marginX, y, pageWidth - marginX * 2, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const boxW = (pageWidth - marginX * 2) / 4;
  if (isTextOnly) {
    doc.text(`Aspek Terisi : ${summary.terisi} / ${summary.jumlahAspek}`, marginX + boxW * 0.5, y + 5.8, { align: 'center' });
    doc.text('Mode : Dialog Refleksi', marginX + boxW * 1.5, y + 5.8, { align: 'center' });
    doc.text(`Status : ${summary.predikat}`, marginX + boxW * 3, y + 5.8, { align: 'center' });
  } else {
    doc.text(`Jumlah Skor : ${summary.totalSkor}`, marginX + boxW * 0.5, y + 5.8, { align: 'center' });
    doc.text(`Aspek Dinilai : ${summary.terisi} / ${summary.jumlahAspek}`, marginX + boxW * 1.5, y + 5.8, { align: 'center' });
    doc.text(`Skor Maksimal : ${summary.skorMaksimal}`, marginX + boxW * 2.5, y + 5.8, { align: 'center' });
    doc.text(`Nilai : ${summary.nilai !== null ? `${summary.nilai}%` : '0%'}`, marginX + boxW * 3.5, y + 5.8, { align: 'center' });
  }

  y += 12;

  // Catatan Hasil Supervisi Box
  const noteLines = [
    `1. Masalah yang dihadapi: ${catatanTahap?.masalah || '-'}`,
    `2. Pemecahan masalah: ${catatanTahap?.pemecahan || '-'}`,
    `3. Rencana tindak lanjut: ${catatanTahap?.rencanaTL || '-'}`,
  ];
  const wrappedNotes = noteLines.flatMap((line) =>
    doc.splitTextToSize(line, pageWidth - marginX * 2 - 6)
  );
  const noteBoxH = 8 + wrappedNotes.length * 4;
  if (y + noteBoxH + 58 > pageHeight - 10) {
    doc.addPage();
    y = 14;
  }
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, y, pageWidth - marginX * 2, noteBoxH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`CATATAN HASIL SUPERVISI (${tahap.toUpperCase()}):`, marginX + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  wrappedNotes.forEach((line: string, i: number) => {
    doc.text(line, marginX + 3, y + 9.5 + i * 4);
  });

  y += noteBoxH + 6;

  // 4-Block Signatures
  const leftColX = marginX + (pageWidth - marginX * 2) * 0.25;
  const rightColX = marginX + (pageWidth - marginX * 2) * 0.75;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Supervisor', leftColX, y + 4, { align: 'center' });
  doc.text(pengaturan.tempatTanggalCetak, rightColX, y, { align: 'center' });
  doc.text('Supervisee (Guru)', rightColX, y + 4, { align: 'center' });

  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text(guru.supervisor || '-', leftColX, y, { align: 'center' });
  doc.text(guru.namaGuru, rightColX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${guru.nipSupervisor || '-'}`, leftColX, y + 4, { align: 'center' });
  doc.text(`NIP. ${guru.nip || '-'}`, rightColX, y + 4, { align: 'center' });

  y += 10;
  doc.text('Mengetahui,', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Pengawas Sekolah / Pembina', leftColX, y, { align: 'center' });
  doc.text('Kepala Sekolah', rightColX, y, { align: 'center' });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(pengaturan.namaPengawasSekolah, leftColX, y, { align: 'center' });
  doc.text(pengaturan.namaKepalaSekolah, rightColX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${pengaturan.nipPengawas}`, leftColX, y + 4, { align: 'center' });
  doc.text(`NIP. ${pengaturan.nipKepalaSekolah}`, rightColX, y + 4, { align: 'center' });

  y += 9;
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, y, pageWidth - marginX * 2, 13, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('RENTANG SKOR & PREDIKAT KURIKULUM MERDEKA:', marginX + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.text('86-100% = Amat Baik | 71-85% = Baik | 56-70% = Cukup | <= 55% = Kurang', marginX + 3, y + 8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kategori Saat Ini: ${summary.predikat}`, marginX + 3, y + 12);

  const suffix =
    tahap === 'Persiapan'
      ? 'nilai persiapan'
      : tahap === 'Pelaksanaan'
      ? 'nilai pelaksanaan'
      : 'nilai evaluasi';
  doc.save(`${guru.namaGuru}_${suffix}.pdf`);
}

export async function exportRekapPdf(params: {
  rekapList: RekapGuru[];
  pengaturan: PengaturanSekolah;
  mapelFilter: string;
}): Promise<void> {
  const { rekapList, pengaturan, mapelFilter } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  let y = await drawKopSurat(doc, pengaturan, pageWidth, marginX);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REKAPITULASI HASIL SUPERVISI AKADEMIK GURU', pageWidth / 2, y + 2, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Tahun Pelajaran ${pengaturan.tahunPelajaran} · Semester ${pengaturan.semester}${
      mapelFilter !== 'Semua' ? ` · Mata Pelajaran: ${mapelFilter}` : ''
    }`,
    pageWidth / 2,
    y + 7,
    { align: 'center' }
  );

  y += 11;

  const bodyRows = rekapList.map((r, idx) => [
    String(idx + 1),
    `${r.guru.namaGuru}\nNIP. ${r.guru.nip}`,
    r.guru.mataPelajaran,
    r.persiapan.terisi > 0 ? String(r.persiapan.totalSkor) : '-',
    r.persiapan.nilai !== null ? `${r.persiapan.nilai}%` : '-',
    r.pelaksanaan.terisi > 0 ? String(r.pelaksanaan.totalSkor) : '-',
    r.pelaksanaan.nilai !== null ? `${r.pelaksanaan.nilai}%` : '-',
    r.evaluasi.mode === 'teks'
      ? r.evaluasi.terisi > 0
        ? `${r.evaluasi.terisi}/${r.evaluasi.jumlahAspek}`
        : '-'
      : r.evaluasi.terisi > 0
      ? String(r.evaluasi.totalSkor)
      : '-',
    r.evaluasi.mode === 'teks'
      ? r.evaluasi.terisi > 0
        ? 'Refleksi Tuntas'
        : 'Belum'
      : r.evaluasi.nilai !== null
      ? `${r.evaluasi.nilai}%`
      : '-',
    r.nilaiRata !== null ? `${r.nilaiRata}%` : '-',
    r.predikatAkhir,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [
      [
        { content: 'No', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Nama Guru / NIP', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        { content: 'Mata Pelajaran', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        { content: 'Persiapan', colSpan: 2 },
        { content: 'Pelaksanaan', colSpan: 2 },
        { content: 'Evaluasi / Refleksi', colSpan: 2 },
        { content: 'Rata-Rata', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Predikat', rowSpan: 2, styles: { valign: 'middle' } },
      ],
      ['Skor', 'Nilai', 'Skor', 'Nilai', 'Aspek', 'Hasil'],
    ],
    body: bodyRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 2.2,
      halign: 'center',
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 58, halign: 'left' },
      2: { cellWidth: 36, halign: 'left' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY ?? y + 40) + 5;

  if (y + 42 > pageHeight - 10) {
    doc.addPage();
    y = 14;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, y, pageWidth - marginX * 2, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'Keterangan Rentang Nilai Kurikulum Merdeka: 86-100% = Amat Baik | 71-85% = Baik | 56-70% = Cukup | <= 55% = Kurang',
    marginX + 3,
    y + 5.8
  );

  y += 14;
  const leftColX = marginX + (pageWidth - marginX * 2) * 0.25;
  const rightColX = marginX + (pageWidth - marginX * 2) * 0.75;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', leftColX, y, { align: 'center' });
  doc.text(pengaturan.tempatTanggalCetak, rightColX, y, { align: 'center' });
  doc.text('Pengawas Sekolah,', leftColX, y + 4.5, { align: 'center' });
  doc.text('Kepala Sekolah,', rightColX, y + 4.5, { align: 'center' });

  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.text(pengaturan.namaPengawasSekolah, leftColX, y, { align: 'center' });
  doc.text(pengaturan.namaKepalaSekolah, rightColX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${pengaturan.nipPengawas}`, leftColX, y + 4.5, { align: 'center' });
  doc.text(`NIP. ${pengaturan.nipKepalaSekolah}`, rightColX, y + 4.5, { align: 'center' });

  doc.save('Rekapitulasi_Hasil_Supervisi_SADIG.pdf');
}
