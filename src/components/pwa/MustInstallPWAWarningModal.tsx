import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { User } from '../../types';
import { dataStorage } from '../../services/dataStorage';

interface MustInstallPWAWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  onBypassOrInstalled: () => void;
}

export const MustInstallPWAWarningModal: React.FC<MustInstallPWAWarningModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onBypassOrInstalled,
}) => {
  const { isInstallable, isIOS, install, confirmInstalled } = usePWAInstall();
  
  // Default active tab based on user agent detection
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'laptop'>(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      if (/android/.test(ua)) return 'android';
      return 'laptop';
    }
    return 'android';
  });

  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const db = dataStorage.getDatabase();
  const appLogo = db.settings?.logoSekolah;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        confirmInstalled();
        onBypassOrInstalled();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleConfirmInstalled = () => {
    confirmInstalled();
    onBypassOrInstalled();
  };

  return (
    <div id="modal-must-install-pwa" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 my-8">
        {/* Close / Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
            <Download className="w-6 h-6 animate-pulse text-blue-400" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-1">
              Petunjuk Instalasi Aplikasi
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              Instal NET PJOK di HP & Laptop
            </h3>
          </div>
        </div>

        {/* Official App Logo Preview Banner */}
        <div className="mt-4 flex items-center gap-3.5 bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg border border-white/10 shrink-0 overflow-hidden">
            {appLogo ? (
              <img src={appLogo} alt="Logo NET PJOK" className="w-full h-full object-cover" />
            ) : (
              <Zap className="w-6 h-6 text-white fill-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white tracking-tight">NET PJOK</span>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded">
                SMANSAKA
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Logo resmi ini yang akan digunakan sebagai ikon aplikasi di layar HP (Android & iOS) dan layar Desktop / Taskbar Laptop Anda.
            </p>
          </div>
        </div>

        {/* Student Notice */}
        <div className="mt-3.5 p-3 rounded-xl bg-blue-950/40 border border-blue-500/20 text-blue-200 text-xs leading-relaxed space-y-1">
          <p className="font-bold text-blue-300">
            {targetUser?.name ? `Halo, ${targetUser.name}!` : 'Ketentuan Pembelajaran PJOK'}
          </p>
          <p>
            Pastikan aplikasi terinstal ke layar utama HP atau Laptop agar dapat diakses cepat dan stabil tanpa bilah browser.
          </p>
        </div>

        {/* Device Selection Tabs (Android, iOS, Laptop/PC) */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>iPhone/iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('laptop')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'laptop'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Laptop/PC</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-3.5">
          {activeTab === 'android' ? (
            <div className="space-y-3">
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Memproses Pemasangan...' : 'Klik Di Sini Untuk Instal Otomatis di HP'}</span>
                </button>
              )}

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-2">
                <p className="font-bold text-slate-200">Cara Pasang di Google Chrome / Edge Android:</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-300">
                    Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome / Edge.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-300">
                    Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-300">
                    Tekan <strong>"Instal"</strong>. Logo resmi NET PJOK akan langsung terpasang di layar utama HP Anda.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'ios' ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-2">
              <p className="font-bold text-slate-200">Cara Pasang di iPhone / iPad (Safari):</p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-slate-300">
                  Buka tautan ini di browser <strong>Safari</strong>, lalu ketuk tombol <strong>Bagikan / Share</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" />) di bilah bawah layar.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-slate-300">
                  Geser ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" />).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-slate-300">
                  Ketuk <strong>"Tambah" (Add)</strong> di kanan atas. Ikon logo NET PJOK akan langsung muncul di beranda iOS Anda.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>{isInstalling ? 'Memproses Pemasangan...' : 'Klik Di Sini Untuk Pasang di Laptop / PC'}</span>
                </button>
              )}

              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-2">
                <p className="font-bold text-slate-200">Cara Pasang di Laptop / Komputer (Chrome & Edge):</p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="text-slate-300">
                    Pada browser Chrome atau Microsoft Edge di laptop, perhatikan <strong>ujung kanan bilah alamat (URL)</strong>, klik ikon <strong>Pasang / Install NET PJOK</strong> (<ExternalLink className="w-3 h-3 inline mx-0.5 text-blue-400" /> berbentuk monitor dengan panah kecil).
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="text-slate-300">
                    Atau klik menu <strong>titik tiga (⋮)</strong> di kanan atas browser &gt; pilih <strong>"Simpan dan bagikan" / "Aplikasi"</strong> &gt; klik <strong>"Instal NET PJOK"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p className="text-slate-300">
                    Klik tombol <strong>"Instal"</strong>. Logo resmi NET PJOK otomatis disematkan ke Desktop dan Taskbar laptop Anda!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info note about icon cache / logo update */}
        <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold text-sm shrink-0">💡</span>
            <div>
              <p className="font-bold text-amber-300">
                Mengapa ikon di HP masih berbeda atau belum berubah?
              </p>
              <p className="mt-0.5 text-slate-300 text-[11px]">
                Jika aplikasi sudah terlanjur diinstal sebelumnya, sistem operasi HP mengunci ikon lama di memori launcher. 
                Cukup <strong>hapus / uninstall ikon NET PJOK yang lama</strong> dari layar utama HP Anda, lalu pasang kembali dari halaman ini agar logo resmi sekolah langsung muncul dengan benar.
              </p>
            </div>
          </div>
        </div>

        {/* Verification and Action Buttons */}
        <div className="mt-4 space-y-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleConfirmInstalled}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Saya Sudah Menginstal Aplikasi (Lanjutkan Masuk)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Kembali ke Halaman Login
          </button>
        </div>

        {/* Desktop / Testing Bypass Option */}
        <div className="mt-2.5 text-center">
          <button
            type="button"
            onClick={handleConfirmInstalled}
            className="text-[10px] text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
          >
            Mode Komputer / Pengujian Browser (Bypass Langsung)
          </button>
        </div>
      </div>
    </div>
  );
};
