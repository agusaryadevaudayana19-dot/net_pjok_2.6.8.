import React, { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [dismissOffline, setDismissOffline] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Only register service worker in production or when supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (!reg) return;

          // Check if there's already a waiting worker
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setNeedRefresh(true);
          }

          // Listen for new service worker installation
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setNeedRefresh(true);
              }
            });
          });
        })
        .catch((err) => {
          // Non-blocking catch in development or restricted environments
          console.debug('ServiceWorker registration skipped/deferred:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    const handleOnline = () => {
      setIsOnline(true);
      setDismissOffline(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Offline Toast Banner */}
      {!isOnline && !dismissOffline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold">Mode Offline Aktif</p>
            <p className="text-[11px] text-slate-300">
              Anda sedang offline. Data tersimpan di perangkat dan akan sinkron saat online.
            </p>
          </div>
          <button
            onClick={() => setDismissOffline(true)}
            className="text-slate-400 hover:text-white p-1 rounded-md ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SW Update Ready Banner */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-emerald-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-600 backdrop-blur-md text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-emerald-300 animate-spin" />
          </div>
          <div>
            <p className="font-bold text-sm">Pembaruan Tersedia</p>
            <p className="text-[11px] text-emerald-200">
              Versi baru LMS PJOK telah tersedia. Perbarui sekarang untuk fitur terbaru.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-xs"
            >
              Perbarui
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="text-emerald-300 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
