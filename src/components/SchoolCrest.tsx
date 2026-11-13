import React from 'react';
import type { PengaturanSekolah } from '../types';

export function PemdaCrestSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lambang Pemerintah Daerah"
    >
      <path
        d="M40 4L72 16V44C72 64.5 56.5 78.5 40 84C23.5 78.5 8 64.5 8 44V16L40 4Z"
        fill="#0F172A"
        stroke="#B45309"
        strokeWidth="3"
      />
      <path
        d="M40 10L66 20V43.5C66 60.5 53 72.5 40 77.5C27 72.5 14 60.5 14 43.5V20L40 10Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.5"
      />
      <path d="M40 16L44 26H54L46 32L49 42L40 36L31 42L34 32L26 26H36L40 16Z" fill="#D97706" />
      <path d="M22 48H58V54C58 62 49 69 40 72C31 69 22 62 22 54V48Z" fill="#059669" />
      <path d="M24 44H56" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="58" r="5" fill="#FFFFFF" />
    </svg>
  );
}

export function TutWuriCrestSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Lambang Pendidikan Tut Wuri Handayani"
    >
      <polygon
        points="40,4 74,24 74,56 40,76 6,56 6,24"
        fill="#1E3A8A"
        stroke="#0F172A"
        strokeWidth="2.5"
      />
      <polygon
        points="40,10 68,26.5 68,53.5 40,70 12,53.5 12,26.5"
        fill="#EFF6FF"
        stroke="#1E3A8A"
        strokeWidth="1.5"
      />
      <path
        d="M22 44C22 33 30 25 40 25C50 25 58 33 58 44"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M40 20V56" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M28 50L40 58L52 50"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="37" r="6" fill="#D97706" />
    </svg>
  );
}

export function KopSurat({ pengaturan }: { pengaturan: PengaturanSekolah }) {
  return (
    <div className="border-b-4 border-double border-black pb-3 mb-3">
      <div className="grid grid-cols-[72px_1fr_72px] sm:grid-cols-[88px_1fr_88px] items-center text-center gap-3">
        <div className="flex justify-center">
          {pengaturan.logoKiri ? (
            <img
              src={pengaturan.logoKiri}
              alt="Logo Kiri Kop Sekolah"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          ) : (
            <PemdaCrestSvg className="w-16 h-16 sm:w-20 sm:h-20" />
          )}
        </div>
        <div>
          <p className="font-extrabold text-sm sm:text-base uppercase tracking-wide leading-tight text-black">
            {pengaturan.pemerintahDaerah}
          </p>
          <p className="font-extrabold text-sm sm:text-base uppercase tracking-wide leading-tight text-black">
            {pengaturan.dinasPendidikan}
          </p>
          <p className="font-extrabold text-sm sm:text-base uppercase tracking-wide leading-tight text-black">
            {pengaturan.namaSekolah}
          </p>
          <p className="text-xs font-semibold mt-1 text-black">{pengaturan.alamatSekolah}</p>
        </div>
        <div className="flex justify-center">
          {pengaturan.logoKanan ? (
            <img
              src={pengaturan.logoKanan}
              alt="Logo Kanan Kop Sekolah"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          ) : (
            <TutWuriCrestSvg className="w-16 h-16 sm:w-20 sm:h-20" />
          )}
        </div>
      </div>
    </div>
  );
}

export function SchoolLogoBadge({
  pengaturan,
  className = 'w-8 h-8',
}: {
  pengaturan?: Partial<PengaturanSekolah> | null;
  className?: string;
}) {
  const customLogo = pengaturan?.logoKanan || pengaturan?.logoKiri;
  if (customLogo) {
    return (
      <img
        src={customLogo}
        alt={pengaturan?.namaSekolah ? `Logo ${pengaturan.namaSekolah}` : 'Logo Sekolah'}
        referrerPolicy="no-referrer"
        className={`${className} object-contain`}
      />
    );
  }
  return <TutWuriCrestSvg className={className} />;
}

