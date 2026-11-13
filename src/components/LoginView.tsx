import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Lock, User, ArrowRight, AlertCircle, Cloud } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { loginWithCredentials, type PublicBranding } from '../services/sadigClient';
import type { UserAccount } from '../types';
import { SchoolLogoBadge } from './SchoolCrest';

interface LoginViewProps {
  branding?: PublicBranding | null;
  onLoginSuccess: (user: UserAccount) => void;
  onNotify?: (type: 'success' | 'error', title: string, message: string) => void;
}

export function LoginView({ branding, onLoginSuccess, onNotify }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginWithCredentials(identifier, password);
      if (!data.success || !data.user) {
        const msg = data.message || 'Username/NIP atau kata sandi tidak sesuai.';
        setError(msg);
        onNotify?.('error', 'Login Gagal', msg);
      } else {
        onLoginSuccess(data.user);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Terjadi gangguan koneksi saat masuk.';
      setError(msg);
      onNotify?.('error', 'Login Gagal', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCloudLogin() {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      let msg = 'Gagal menghubungkan akun Google Firebase.';
      if (code === 'auth/popup-closed-by-user') {
        msg = 'Jendela login Google ditutup sebelum selesai.';
      } else if (code === 'auth/unauthorized-domain') {
        msg =
          'Domain belum terdaftar di Firebase Authentication (Authorized Domains). Gunakan login Username/NIP atau daftarkan domain di Firebase Console.';
      }
      setError(msg);
      onNotify?.('error', 'Login Google Gagal', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center shrink-0">
            <SchoolLogoBadge pengaturan={branding} className="w-9 h-9" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SADIG</h1>
            <p className="text-xs text-slate-500 truncate">
              Supervisi Akademik Digital Guru
            </p>
            {branding?.namaSekolah && (
              <p className="text-[11px] font-semibold text-emerald-700 truncate mt-0.5">
                {branding.namaSekolah}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-identifier"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Username atau NIP
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan Username atau NIP"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk Aplikasi'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-200">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleCloudLogin}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sinkron Cloud Firebase (Login Google)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
