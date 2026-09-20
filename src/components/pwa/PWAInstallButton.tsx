import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  X,
  Share2,
  PlusSquare,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { dataStorage } from '../../services/dataStorage';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const [guideTab, setGuideTab] = useState<'android' | 'ios' | 'laptop'>(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      if (/android/.test(ua)) return 'android';
      return 'laptop';
    }
    return 'android';
  });

  const db = dataStorage.getDatabase();
  const appLogo = db.settings?.logoSekolah;

  // If already running in standalone mode, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install-compact"
          title="Pasang Aplikasi NET PJOK di HP atau Laptop"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-400/40 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-800 dark:text-blue-300 text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center shrink-0">
            {appLogo ? (
              <img src={appLogo} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <Zap className="w-2.5 h-2.5 text-white fill-white" />
            )}
          </div>
          <span className="hidden md:inline">Install Aplikasi</span>
        </button>
      ) : variant === 'banner' ? (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {appLogo ? (
                <img src={appLogo} alt="NET PJOK" className="w-full h-full object-cover" />
              ) : (
                <Zap className="w-5 h-5 text-white fill-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <span>Install NET PJOK SMANSAKA</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-medium">PWA</span>
              </p>
              <p className="text-[11px] text-blue-100">
                Gunakan ikon logo NET PJOK resmi di layar HP dan Laptop Anda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Memasang...' : 'Pasang Sekarang'}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install"
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
        >
          <div className="w-4 h-4 rounded bg-blue-800 flex items-center justify-center shrink-0">
            {appLogo ? (
              <img src={appLogo} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <Zap className="w-2.5 h-2.5 text-white fill-white" />
            )}
          </div>
          <span>Pasang NET PJOK (PWA)</span>
        </button>
      )}

      {/* Manual Installation Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 overflow-hidden shadow-sm">
                  {appLogo ? (
                    <img src={appLogo} alt="NET PJOK" className="w-full h-full object-cover" />
                  ) : (
                    <Zap className="w-5 h-5 text-white fill-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pasang Aplikasi NET PJOK
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gunakan logo resmi di HP & Laptop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Device tabs */}
            <div className="mt-4 grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  guideTab === 'android'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  guideTab === 'ios'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>iPhone</span>
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('laptop')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  guideTab === 'laptop'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>Laptop/PC</span>
              </button>
            </div>

            {/* Tab instructions */}
            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {guideTab === 'android' ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Buka menu browser Chrome / Edge (ikon <strong>titik tiga ⋮</strong> di kanan atas).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Pilih <strong>"Install aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Tekan <strong>Install</strong>. Ikon logo resmi NET PJOK otomatis disematkan ke layar HP Anda.
                    </p>
                  </div>
                </div>
              ) : guideTab === 'ios' ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Ketuk tombol <strong>Bagikan / Share</strong> (<Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" />) pada bilah navigasi Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Ketuk <strong>Tambah</strong>. Logo NET PJOK langsung tampil di beranda iPhone/iPad.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p>
                      Perhatikan <strong>ujung kanan bilah alamat (URL)</strong> di browser Chrome / Edge, lalu klik ikon <strong>Instal NET PJOK</strong> (<ExternalLink className="w-3 h-3 inline text-blue-500" />).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p>
                      Atau buka menu browser (<strong>titik tiga ⋮</strong>) &gt; <strong>Simpan dan bagikan / Aplikasi</strong> &gt; <strong>Instal NET PJOK</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p>
                      Klik <strong>Instal</strong>. Pintasan dengan logo resmi NET PJOK langsung muncul di Desktop &amp; Taskbar laptop Anda.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
