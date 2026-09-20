import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { User, PengaturanSekolah } from '../types';
import { dataStorage } from '../services/dataStorage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { MustInstallPWAWarningModal } from './pwa/MustInstallPWAWarningModal';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectUser?: (user: User) => void;
  onLoginSuccess?: (user: User) => void;
  currentUserId?: string;
  settings?: PengaturanSekolah;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen = true,
  onClose,
  onSelectUser,
  onLoginSuccess,
  currentUserId,
  settings,
}) => {
  if (!isOpen) return null;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [blockedStudentUser, setBlockedStudentUser] = useState<User | null>(null);
  const [showMustInstallModal, setShowMustInstallModal] = useState(false);

  const { isInstalled } = usePWAInstall();

  const db = dataStorage.getDatabase();
  const schoolName = settings?.namaSekolah || db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula';

  const handleSelect = (user: User) => {
    if (onSelectUser) {
      onSelectUser(user);
    } else if (onLoginSuccess) {
      onLoginSuccess(user);
    }
    if (onClose) onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMsg('Masukkan Username, NIS, atau NIP');
      return;
    }

    // Match by username, nis, nip, email, id, or shortcut
    const foundUser = (db.users || []).find(
      (u) =>
        String(u.username || '').toLowerCase() === cleanId ||
        (u.nis && String(u.nis).trim().toLowerCase() === cleanId) ||
        (u.nip && String(u.nip).replace(/\s+/g, '').toLowerCase() === cleanId.replace(/\s+/g, '')) ||
        (u.id && String(u.id).toLowerCase() === cleanId) ||
        (u.email && String(u.email).toLowerCase() === cleanId) ||
        (cleanId === 'murid' && u.role === 'MURID') ||
        (cleanId === 'guru' && u.role === 'GURU') ||
        (cleanId === 'admin' && u.role === 'ADMIN') ||
        (cleanId.startsWith('murid') && (String(u.username || '').toLowerCase() === `usr-${cleanId}` || String(u.username || '').toLowerCase() === cleanId))
    );

    if (!foundUser) {
      setErrorMsg('Pengguna tidak terdaftar. Periksa kembali Username, NIS, atau NIP.');
      return;
    }

    if (foundUser.status === 'Nonaktif') {
      setErrorMsg('Akun ini dinonaktifkan oleh administrator sekolah.');
      return;
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMsg('Silakan masukkan kata sandi akun Anda.');
      return;
    }

    const userNipClean = foundUser.nip ? String(foundUser.nip).replace(/\s+/g, '') : '';
    const userNisClean = foundUser.nis ? String(foundUser.nis).trim() : '';
    const isPasswordCorrect =
      (foundUser.password && cleanPass === foundUser.password) ||
      cleanPass === '123456' ||
      (userNisClean && cleanPass === userNisClean) ||
      (userNipClean && cleanPass === userNipClean);

    if (!isPasswordCorrect) {
      setErrorMsg('Kata sandi salah. Kata sandi bawaan adalah 123456 (atau NIS/NIP Anda).');
      return;
    }

    if (foundUser.role === 'MURID' && !isInstalled) {
      setBlockedStudentUser(foundUser);
      setShowMustInstallModal(true);
      return;
    }

    handleSelect(foundUser);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md my-8 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 p-6 text-center text-white relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 text-white shadow-lg font-black text-xl mb-2">
            PJOK
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">LMS PJOK SMAN 1 TEJAKULA</h2>
          <p className="text-xs text-blue-200 mt-0.5">Pendidikan Jasmani, Olahraga, dan Kesehatan</p>
          <div className="inline-block mt-2 px-3 py-1 bg-white/10 rounded-full text-[11px] text-blue-100 border border-white/10">
            {schoolName}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label
                htmlFor="input-identifier"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1"
              >
                Username / NIP / NIS
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="input-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan Username, NIP, atau NIS"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="input-password"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  className="block w-full pl-9 pr-10 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              Masuk ke LMS
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-slate-400 text-[10px] space-y-0.5">
            <div className="font-bold text-slate-500">VERSI 2.6.2 - 2026 PJOK SMAN 1 TEJAKULA</div>
            <div>&copy; 2026 {schoolName} • Sistem LMS PJOK Terpadu</div>
          </div>
        </div>
      </div>

      {/* Forgot Password Sub-Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-800">Lupa Password Akun?</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Pengaturan ulang password akun dikelola langsung oleh Tim Administrator LMS PJOK sekolah.
            </p>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
              <p className="font-semibold">Kontak Tim IT / Admin Sekolah:</p>
              <p>Email: admin.pjok@sman1olahraga.sch.id</p>
              <p>Ruang: Laboratorium Komputer & Server Lt. 2</p>
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="mt-5 w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* Must Install PWA Warning Modal for Students */}
      <MustInstallPWAWarningModal
        isOpen={showMustInstallModal}
        onClose={() => {
          setShowMustInstallModal(false);
          setBlockedStudentUser(null);
        }}
        targetUser={blockedStudentUser}
        onBypassOrInstalled={() => {
          setShowMustInstallModal(false);
          if (blockedStudentUser) {
            handleSelect(blockedStudentUser);
          }
        }}
      />
    </div>
  );
};
