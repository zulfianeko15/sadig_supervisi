import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  FileCheck2,
  ClipboardCheck,
  FileSpreadsheet,
  FileSignature,
  ClipboardList,
  BarChart3,
  UserCog,
  Settings,
  Upload,
  Award,
  LogOut,
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ADMIN_BOOTSTRAP_EMAIL, auth, testConnection } from './firebase';
import {
  ensureInitialSeed,
  ensureUserProfile,
  fetchSadigData,
} from './services/firestoreDb';
import {
  fetchLocalOrServerState,
  getCachedBranding,
  saveBrandingCache,
  type PublicBranding,
} from './services/sadigClient';
import type { AppDatabasePayload, UserAccount, UserRole } from './types';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { SupakSheetView } from './components/SupakSheetView';
import { PenilaianFormView } from './components/PenilaianFormView';
import { ApprovalKepsekView } from './components/ApprovalKepsekView';
import { GuruWorkspaceView } from './components/GuruWorkspaceView';
import { AdminMasterViews } from './components/AdminMasterViews';
import { RekapHasilView } from './components/RekapHasilView';
import { SchoolLogoBadge } from './components/SchoolCrest';

interface NavMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface PopupNotice {
  id: number;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const ALL_ROLES: UserRole[] = [
  'Admin',
  'Pengawas Sekolah',
  'Kepala Sekolah',
  'Pengawas Supervisi',
  'Guru',
];

function getMenusForRole(role: UserRole): NavMenuItem[] {
  switch (role) {
    case 'Admin':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'guru', label: 'Data Guru', icon: Users },
        { id: 'aspek', label: 'Data Aspek', icon: ListChecks },
        { id: 'nilaiPersiapan', label: 'Nilai Persiapan', icon: FileSpreadsheet },
        { id: 'nilaiPelaksanaan', label: 'Nilai Pelaksanaan', icon: FileSignature },
        { id: 'nilaiEvaluasi', label: 'Nilai Evaluasi', icon: ClipboardList },
        { id: 'rekapHasil', label: 'Rekapitulasi Hasil', icon: BarChart3 },
        { id: 'users', label: 'User Pengguna', icon: UserCog },
        { id: 'settings', label: 'Pengaturan', icon: Settings },
      ];
    case 'Pengawas Sekolah':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'monitoring', label: 'Monitoring Berkas', icon: FileCheck2 },
        { id: 'rekapHasil', label: 'Rekapitulasi Hasil', icon: BarChart3 },
      ];
    case 'Kepala Sekolah':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'persetujuan', label: 'Persetujuan Berkas', icon: FileCheck2 },
        { id: 'rekapHasil', label: 'Rekapitulasi Hasil', icon: BarChart3 },
      ];
    case 'Pengawas Supervisi':
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'penilaianPersiapan', label: 'Penilaian Persiapan', icon: ClipboardCheck },
        { id: 'penilaianPelaksanaan', label: 'Penilaian Pelaksanaan', icon: ClipboardCheck },
        { id: 'penilaianEvaluasi', label: 'Penilaian Evaluasi', icon: ClipboardCheck },
        { id: 'rekapHasil', label: 'Rekapitulasi Hasil', icon: BarChart3 },
      ];
    case 'Guru':
      return [
        { id: 'uploadBerkas', label: 'Upload Berkas Drive', icon: Upload },
        { id: 'hasilGuru', label: 'Hasil Supervisi', icon: Award },
        { id: 'nilaiPersiapan', label: 'Nilai Persiapan', icon: FileSpreadsheet },
        { id: 'nilaiPelaksanaan', label: 'Nilai Pelaksanaan', icon: FileSignature },
        { id: 'nilaiEvaluasi', label: 'Nilai Evaluasi', icon: ClipboardList },
      ];
  }
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseProfile, setFirebaseProfile] = useState<UserAccount | null>(null);
  const [localUser, setLocalUser] = useState<UserAccount | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [data, setData] = useState<AppDatabasePayload | null>(null);
  const [branding, setBranding] = useState<PublicBranding | null>(() => getCachedBranding());
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [focusedGuruId, setFocusedGuruId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const showNotice = useCallback(
    (type: 'success' | 'error', title: string, message: string) => {
      const id = Date.now();
      setNotice({ id, type, title, message });
      setTimeout(() => {
        setNotice((prev) => (prev?.id === id ? null : prev));
      }, 4500);
    },
    []
  );

  // Sync branding cache whenever school settings load/update
  useEffect(() => {
    if (data?.pengaturan) {
      saveBrandingCache(data.pengaturan);
      setBranding({
        namaSekolah: data.pengaturan.namaSekolah,
        logoKiri: data.pengaturan.logoKiri || '',
        logoKanan: data.pengaturan.logoKanan || '',
      });
    }
  }, [data?.pengaturan]);

  // Fetch initial school logo/branding for LoginView even before user signs in
  useEffect(() => {
    fetchLocalOrServerState()
      .then((payload) => {
        setBranding({
          namaSekolah: payload.pengaturan.namaSekolah,
          logoKiri: payload.pengaturan.logoKiri || '',
          logoKanan: payload.pengaturan.logoKanan || '',
        });
      })
      .catch(() => {
        // fallback to cached branding
      });
  }, []);

  const isFirebaseActive = Boolean(firebaseProfile && auth.currentUser);
  const isTrueAdmin =
    firebaseProfile?.role === 'Admin' || firebaseProfile?.email === ADMIN_BOOTSTRAP_EMAIL;

  const refreshState = useCallback(async (): Promise<AppDatabasePayload | null> => {
    setLoading(true);
    try {
      const current = auth.currentUser;
      if (current && firebaseProfile) {
        const payload = await fetchSadigData(current.email || '', current.uid, isTrueAdmin);
        setData(payload);
        return payload;
      }
      const payload = await fetchLocalOrServerState();
      setData(payload);
      return payload;
    } catch (err) {
      console.error(err);
      showNotice('error', 'Gagal Memuat Data', 'Gagal memuat data terbaru dari basis data.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [firebaseProfile, isTrueAdmin, showNotice]);

  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseProfile(null);
        setAuthReady(true);
        return;
      }
      setLoading(true);
      try {
        const profile = await ensureUserProfile(fbUser);
        await ensureInitialSeed(fbUser, profile);
        const adminFlag =
          profile.role === 'Admin' || fbUser.email === ADMIN_BOOTSTRAP_EMAIL;
        const payload = await fetchSadigData(fbUser.email || '', fbUser.uid, adminFlag);
        setFirebaseProfile(profile);
        setLocalUser(null);
        setPreviewRole(null);
        setData(payload);
        const defaultMenus = getMenusForRole(profile.role);
        setActiveSection(defaultMenus[0].id);
        setFocusedGuruId(undefined);
        showNotice(
          'success',
          'Login Google Berhasil',
          `Selamat datang, ${profile.nama} (${profile.role}).`
        );
      } catch (err) {
        console.error(err);
        showNotice('error', 'Login Gagal', 'Gagal menginisialisasi sesi Firebase Firestore.');
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [showNotice]);

  useEffect(() => {
    if (localUser && !isFirebaseActive) {
      refreshState();
    }
  }, [localUser, isFirebaseActive, refreshState]);

  const effectiveUser = useMemo<UserAccount | null>(() => {
    if (firebaseProfile) {
      if (!isTrueAdmin || !previewRole || previewRole === firebaseProfile.role) {
        return firebaseProfile;
      }
      const sample = data?.users.find((u) => u.role === previewRole);
      return {
        ...firebaseProfile,
        role: previewRole,
        nama: sample?.nama || firebaseProfile.nama,
        nip: sample?.nip || firebaseProfile.nip,
      };
    }
    return localUser;
  }, [firebaseProfile, localUser, isTrueAdmin, previewRole, data?.users]);

  function handleLocalLoginSuccess(loggedInUser: UserAccount) {
    setLocalUser(loggedInUser);
    const defaultMenus = getMenusForRole(loggedInUser.role);
    setActiveSection(defaultMenus[0].id);
    setFocusedGuruId(undefined);
    showNotice(
      'success',
      'Login Berhasil',
      `Selamat datang, ${loggedInUser.nama} (${loggedInUser.role}).`
    );
  }

  async function handleLogout() {
    setMobileMenuOpen(false);
    if (auth.currentUser) {
      await signOut(auth);
    }
    setFirebaseProfile(null);
    setLocalUser(null);
    setPreviewRole(null);
    setData(null);
    showNotice('success', 'Berhasil Keluar', 'Anda telah keluar dari sesi ruang kerja SADIG.');
  }

  function handleSwitchPreviewRole(nextRole: UserRole) {
    setPreviewRole(nextRole);
    const defaultMenus = getMenusForRole(nextRole);
    setActiveSection(defaultMenus[0].id);
    setFocusedGuruId(undefined);
    setMobileMenuOpen(false);
  }

  function handleNavigate(section: string, guruId?: string) {
    setActiveSection(section);
    setFocusedGuruId(guruId);
    setMobileMenuOpen(false);
  }

  async function handleActionSuccess(updatedOrNull: AppDatabasePayload | null, message: string) {
    if (updatedOrNull) {
      setData(updatedOrNull);
      showNotice('success', 'Berhasil Disimpan', message);
      return;
    }
    const refreshed = await refreshState();
    if (refreshed) {
      showNotice('success', 'Berhasil Disimpan', message);
    }
  }

  function handleMutationError(message: string) {
    showNotice('error', 'Gagal Menyimpan Data', message);
  }

  const activeBranding = data?.pengaturan || branding;

  const popupElement = notice ? (
    <div
      role="alert"
      aria-live="assertive"
      className="no-print fixed top-5 right-5 z-[100] max-w-sm w-[calc(100vw-2.5rem)]"
    >
      <div
        className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-xl bg-white ${
          notice.type === 'success'
            ? 'border-emerald-300 ring-1 ring-emerald-500/20'
            : 'border-red-300 ring-1 ring-red-500/20'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-bold ${
              notice.type === 'success' ? 'text-emerald-900' : 'text-red-900'
            }`}
          >
            {notice.title}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notice.message}</div>
        </div>
        <button
          type="button"
          onClick={() => setNotice(null)}
          aria-label="Tutup notifikasi"
          className="text-slate-400 hover:text-slate-700 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-sm text-slate-600">
          Menyiapkan aplikasi SADIG...
        </div>
      </div>
    );
  }

  if (!effectiveUser) {
    return (
      <>
        {popupElement}
        <LoginView
          branding={branding}
          onLoginSuccess={handleLocalLoginSuccess}
          onNotify={showNotice}
        />
      </>
    );
  }

  const menus = getMenusForRole(effectiveUser.role);
  const resolvedSection = menus.some((m) => m.id === activeSection) ? activeSection : menus[0].id;
  const currentMenuObj = menus.find((m) => m.id === resolvedSection) || menus[0];
  const ownerUid = firebaseProfile?.uid || auth.currentUser?.uid || effectiveUser.username || 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {popupElement}

      {/* Desktop Fixed Sidebar (256px) */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-slate-200 border-r border-slate-800">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
            <SchoolLogoBadge pengaturan={activeBranding} className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-white tracking-tight">SADIG</div>
            <div className="text-[11px] text-slate-400 truncate">
              Supervisi Akademik Digital Guru
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-b border-slate-800">
          <div className="text-xs font-semibold text-white truncate">{effectiveUser.nama}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5 truncate">{effectiveUser.role}</div>
          {effectiveUser.nip && (
            <div className="text-[11px] text-slate-400 font-mono-tabular mt-0.5 truncate">
              NIP. {effectiveUser.nip}
            </div>
          )}
        </div>

        {isFirebaseActive && isTrueAdmin && (
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulasi Peran (Admin)</span>
            </label>
            <select
              aria-label="Simulasi Peran"
              value={effectiveUser.role}
              onChange={(e) => handleSwitchPreviewRole(e.target.value as UserRole)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menus.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ganti Peran / Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-slate-900 text-slate-200 flex flex-col justify-between p-4">
            <div className="overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded bg-white p-0.5 flex items-center justify-center shrink-0">
                    <SchoolLogoBadge pengaturan={activeBranding} className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-white truncate">SADIG</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-3 px-2">
                <div className="text-xs font-semibold text-white">{effectiveUser.nama}</div>
                <div className="text-[11px] text-emerald-400">{effectiveUser.role}</div>
              </div>
              {isFirebaseActive && isTrueAdmin && (
                <div className="mb-3 px-2">
                  <select
                    aria-label="Simulasi Peran Mobile"
                    value={effectiveUser.role}
                    onChange={(e) => handleSwitchPreviewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        Mode: {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <nav className="space-y-1">
                {menus.map((item) => {
                  const Icon = item.icon;
                  const isActive = resolvedSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                        isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 mt-3"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb | Actions */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 truncate">
              <span className="font-bold text-slate-900 whitespace-nowrap">SADIG</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 truncate">{effectiveUser.role}</span>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {currentMenuObj?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={refreshState}
              disabled={loading}
              title="Muat ulang data"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Section Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
          {!data ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              Memuat basis data supervisi...
            </div>
          ) : (
            <>
              {resolvedSection === 'dashboard' && (
                <DashboardView user={effectiveUser} data={data} onNavigate={handleNavigate} />
              )}

              {(resolvedSection === 'guru' ||
                resolvedSection === 'aspek' ||
                resolvedSection === 'users' ||
                resolvedSection === 'settings') && (
                <AdminMasterViews
                  section={resolvedSection}
                  data={data}
                  ownerUid={ownerUid}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                />
              )}

              {resolvedSection === 'persetujuan' && (
                <ApprovalKepsekView
                  mode="kepsek"
                  data={data}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                />
              )}

              {resolvedSection === 'monitoring' && (
                <ApprovalKepsekView
                  mode="pengawas"
                  data={data}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                />
              )}

              {resolvedSection === 'penilaianPersiapan' && (
                <PenilaianFormView
                  tahap="Persiapan"
                  data={data}
                  user={effectiveUser}
                  ownerUid={ownerUid}
                  initialGuruId={focusedGuruId}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                  onNotify={showNotice}
                />
              )}

              {resolvedSection === 'penilaianPelaksanaan' && (
                <PenilaianFormView
                  tahap="Pelaksanaan"
                  data={data}
                  user={effectiveUser}
                  ownerUid={ownerUid}
                  initialGuruId={focusedGuruId}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                  onNotify={showNotice}
                />
              )}

              {resolvedSection === 'penilaianEvaluasi' && (
                <PenilaianFormView
                  tahap="Evaluasi"
                  data={data}
                  user={effectiveUser}
                  ownerUid={ownerUid}
                  initialGuruId={focusedGuruId}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                  onNotify={showNotice}
                />
              )}

              {resolvedSection === 'nilaiPersiapan' && (
                <SupakSheetView
                  tahap="Persiapan"
                  data={data}
                  user={effectiveUser}
                  initialGuruId={focusedGuruId}
                />
              )}

              {resolvedSection === 'nilaiPelaksanaan' && (
                <SupakSheetView
                  tahap="Pelaksanaan"
                  data={data}
                  user={effectiveUser}
                  initialGuruId={focusedGuruId}
                />
              )}

              {resolvedSection === 'nilaiEvaluasi' && (
                <SupakSheetView
                  tahap="Evaluasi"
                  data={data}
                  user={effectiveUser}
                  initialGuruId={focusedGuruId}
                />
              )}

              {resolvedSection === 'rekapHasil' && (
                <RekapHasilView data={data} user={effectiveUser} />
              )}

              {resolvedSection === 'uploadBerkas' && (
                <GuruWorkspaceView
                  mode="upload"
                  user={effectiveUser}
                  data={data}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                  onNavigate={handleNavigate}
                />
              )}

              {resolvedSection === 'hasilGuru' && (
                <GuruWorkspaceView
                  mode="hasil"
                  user={effectiveUser}
                  data={data}
                  onActionSuccess={handleActionSuccess}
                  onError={handleMutationError}
                  onNavigate={handleNavigate}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
