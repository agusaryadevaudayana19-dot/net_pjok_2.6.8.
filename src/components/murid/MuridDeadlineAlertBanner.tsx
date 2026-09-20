import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
  BookOpen,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  X,
  Sparkles,
} from 'lucide-react';
import { User } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import {
  getStudentUrgentDeadlines,
  DeadlineAlertItem,
  syncStudentDeadlineNotifications,
  playDeadlineAlertChime,
} from '../../utils/deadlineNotification';

interface MuridDeadlineAlertBannerProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigate: (menuId: string, param?: string) => void;
  variant?: 'banner' | 'dashboard-widget' | 'compact';
}

export const MuridDeadlineAlertBanner: React.FC<MuridDeadlineAlertBannerProps> = ({
  db,
  currentUser,
  onNavigate,
  variant = 'banner',
}) => {
  const [alerts, setAlerts] = useState<DeadlineAlertItem[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Recalculate urgent deadlines and tick every 15 seconds
  useEffect(() => {
    const updateAlerts = () => {
      const urgent = getStudentUrgentDeadlines(db, currentUser);
      setAlerts(urgent);
    };

    updateAlerts();
    // Sync to database notifications so badge appears in Navbar
    syncStudentDeadlineNotifications(currentUser);

    const interval = setInterval(updateAlerts, 15000);
    return () => clearInterval(interval);
  }, [db, currentUser]);

  // Initial chime if urgent alerts exist and haven't been sounded yet in session
  useEffect(() => {
    if (alerts.length > 0 && soundEnabled) {
      const sessionKey = `has_chimed_${currentUser.id}_${alerts.map((a) => a.id).join('_')}`;
      if (!sessionStorage.getItem(sessionKey)) {
        playDeadlineAlertChime();
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [alerts, soundEnabled, currentUser.id]);

  if (alerts.length === 0) {
    return null;
  }

  // Floating Minimized Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-40 animate-bounce">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-full shadow-2xl font-bold text-xs cursor-pointer border-2 border-white/50 transition-transform active:scale-95"
          title="Buka Peringatan Batas Waktu 24 Jam"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <Flame className="w-4 h-4 text-amber-200" />
          <span>⚠️ {alerts.length} Batas Waktu &lt; 24 Jam!</span>
          <ChevronUp className="w-4 h-4 text-white/80 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="student-deadline-alert-banner"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950 via-amber-950 to-slate-900 border-2 border-rose-500/50 p-4 sm:p-5 text-white shadow-xl transition-all"
    >
      {/* Background glowing aura */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        {/* Header with Title & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-2xl bg-rose-500/30 border border-rose-400/50 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-300">
                  Peringatan Batas Waktu Kritis (&lt; 24 Jam)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse shadow-xs">
                  {alerts.length} Perlu Dikerjakan
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tenggat pengumpulan tugas atau kuis PJOK berikut akan berakhir hari ini / kurang dari 24 jam. Segera selesaikan!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => {
                if (!soundEnabled) {
                  playDeadlineAlertChime();
                }
                setSoundEnabled(!soundEnabled);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title={soundEnabled ? 'Matikan Suara Pengingat' : 'Aktifkan Suara Pengingat'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Kecilkan Banner Peringatan"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">Kecilkan</span>
            </button>
          </div>
        </div>

        {/* List of Urgent Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((item) => {
            const isQuiz = item.tipe === 'quiz';
            return (
              <div
                key={item.id}
                className="group relative bg-white/10 hover:bg-white/15 border border-white/20 hover:border-amber-400/60 rounded-2xl p-3.5 transition-all flex flex-col justify-between gap-2.5 backdrop-blur-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isQuiz
                            ? 'bg-purple-500/40 text-purple-200 border border-purple-400/40'
                            : 'bg-sky-500/40 text-sky-200 border border-sky-400/40'
                        }`}
                      >
                        {isQuiz ? <HelpCircle className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {isQuiz ? 'Kuis PJOK' : 'Tugas PJOK'}
                      </span>
                      {item.kategori && (
                        <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-medium truncate max-w-[120px]">
                          {item.kategori}
                        </span>
                      )}
                    </div>

                    {/* Countdown Badge */}
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 shadow-xs animate-pulse">
                      <Clock className="w-3 h-3" />
                      {item.isOverdue ? 'Sudah Lewat Batas!' : item.timeRemainingFormatted}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs sm:text-sm text-white group-hover:text-amber-200 transition-colors line-clamp-1">
                    {item.judul}
                  </h4>
                  {item.materiJudul && (
                    <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                      Materi: {item.materiJudul}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                  <span className="text-slate-300 flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3 text-amber-300" />
                    Batas: <strong className="text-amber-200">{item.formattedDeadline}</strong>
                  </span>

                  <button
                    onClick={() => {
                      if (isQuiz) {
                        onNavigate('quiz-saya', item.targetId);
                      } else {
                        onNavigate('tugas-saya', item.targetId);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      isQuiz
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <span>{isQuiz ? 'Mulai Kuis' : 'Kumpulkan Tugas'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
