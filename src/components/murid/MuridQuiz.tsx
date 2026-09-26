import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Quiz, Soal, User } from '../../types';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  Image as ImageIcon,
  Link2,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  ShieldAlert,
  Lock,
  LogOut,
  Send,
  AlertTriangle,
  Timer,
  Play,
  FileText,
  Code2,
  Globe,
  ExternalLink,
  RotateCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Key,
  KeyRound,
  Copy,
  X,
} from 'lucide-react';
import { parseDeadlineToDate, formatTimeRemaining } from '../../utils/deadlineNotification';
import {
  getCurrentWitaTime,
  evaluateQuizSchedule,
  QuizScheduleCheckResult,
} from '../../utils/quizTimeHelper';
import { formatQuizEmbedUrl } from '../shared/InAppQuizViewerModal';

interface MuridQuizProps {
  currentUser: User;
  db: LMSDatabase;
  initialQuizId?: string;
  onClearParam?: () => void;
}

export function MuridQuiz({ currentUser, db, initialQuizId, onClearParam }: MuridQuizProps) {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [tabSwitchAlert, setTabSwitchAlert] = useState<string | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Synchronized WITA clock and schedule gating
  const [currentWita, setCurrentWita] = useState(() => getCurrentWitaTime());
  const [activeExecutionMode, setActiveExecutionMode] = useState<'serentak' | 'simulasi'>('serentak');
  const [schedulePromptQuiz, setSchedulePromptQuiz] = useState<{
    quiz: Quiz;
    result: QuizScheduleCheckResult;
  } | null>(null);

  const openedInitialIdRef = useRef<string | null>(null);
  const dismissedInitialIdRef = useRef<string | null>(null);

  // Local state for interactive matching / tarik garis
  // Map of leftItem -> rightItem for the active question
  const [activeLeftSelection, setActiveLeftSelection] = useState<string | null>(null);

  // In-app embedded iframe states for external quiz links
  const [iframeFullscreenId, setIframeFullscreenId] = useState<string | null>(null);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);

  // Token / Kunci Akses Kuis State
  const [tokenPromptQuiz, setTokenPromptQuiz] = useState<{
    quiz: Quiz;
    forceMode?: 'serentak' | 'simulasi';
  } | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Token Keluar Ujian Otomatis (Exit Token) State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTokenKeluarModal, setShowTokenKeluarModal] = useState(false);
  const [inputTokenKeluar, setInputTokenKeluar] = useState('');
  const [tokenKeluarError, setTokenKeluarError] = useState<string | null>(null);
  const [showTokenKeluarToast, setShowTokenKeluarToast] = useState(false);

  const quizQuestions: Soal[] = activeQuiz
    ? (Array.isArray(activeQuiz.soal) && activeQuiz.soal.length > 0
        ? activeQuiz.soal
        : Array.isArray(activeQuiz.soalList)
        ? activeQuiz.soalList
        : [])
    : [];

  // Refs for access inside window event listeners
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const activeQuizRef = useRef(activeQuiz);
  activeQuizRef.current = activeQuiz;
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;
  const quizQuestionsRef = useRef(quizQuestions);
  quizQuestionsRef.current = quizQuestions;

  // Check correctness of answer
  const isQuestionAnswerCorrect = useCallback((s: Soal, ans: string | undefined): boolean => {
    if (!ans) return false;
    if (s.tipe === 'Tarik Garis') {
      try {
        const parsed = JSON.parse(ans);
        if (typeof parsed === 'object' && s.matchingPairs && s.matchingPairs.length > 0) {
          let matches = 0;
          s.matchingPairs.forEach((pair) => {
            if (parsed[pair.left] === pair.right) matches++;
          });
          return matches >= Math.ceil(s.matchingPairs.length * 0.7);
        }
      } catch {
        // fallback
      }
      return ans.toLowerCase().includes((s.kunciJawaban || '').toLowerCase().slice(0, 8));
    }
    if (
      s.tipe === 'Link Google Form' ||
      s.tipe === 'Link AppScript' ||
      s.tipe === 'Link Aplikasi Lainnya' ||
      s.linkEksternal
    ) {
      return !!ans && (ans === 'Selesai' || ans === 'Sudah Dikumpulkan' || ans === 'Tuntas' || ans.trim().length > 0);
    }
    return ans.trim().toLowerCase() === (s.kunciJawaban || '').trim().toLowerCase();
  }, []);

  // Main Submit function
  const handleSubmitQuiz = useCallback(() => {
    const currQuiz = activeQuizRef.current;
    if (!currQuiz || isFinishedRef.current) return;

    const currQuestions = quizQuestionsRef.current;
    const currentAnswers = answersRef.current;

    let totalScore = 0;
    let maxScore = 0;
    let correctCount = 0;

    currQuestions.forEach((s) => {
      maxScore += s.bobot || 20;
      if (isQuestionAnswerCorrect(s, currentAnswers[s.id])) {
        totalScore += s.bobot || 20;
        correctCount++;
      }
    });

    const calculated100 = Math.round((totalScore / (maxScore || 100)) * 100);
    const wrongCount = Math.max(0, currQuestions.length - correctCount);
    setFinalScore(calculated100);
    setIsFinished(true);
    setShowExitConfirmModal(false);

    // Save quiz score into student's grades and submission log
    dataStorage.updateDatabase((prev) => {
      const existingNilaiIndex = prev.nilai.findIndex(
        (n) =>
          n.muridId === currentUser.id ||
          (currentUser.nis && (n.muridId === currentUser.nis || n.nis === currentUser.nis)) ||
          (n.muridNama &&
            currentUser.name &&
            n.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );

      let updatedNilai = [...prev.nilai];
      if (existingNilaiIndex >= 0) {
        const n = prev.nilai[existingNilaiIndex];
        const newAkhir = Math.round((n.tugas + calculated100 + n.praktik + n.sikap) / 4);
        const pred = newAkhir >= 88 ? 'A' : newAkhir >= 78 ? 'B' : newAkhir >= 65 ? 'C' : 'D';
        updatedNilai[existingNilaiIndex] = {
          ...n,
          quiz: calculated100,
          nilaiAkhir: newAkhir,
          predikat: pred as any,
        };
      } else {
        const tugas = 85;
        const quiz = calculated100;
        const praktik = 88;
        const sikap = 90;
        const newAkhir = Math.round((tugas + quiz + praktik + sikap) / 4);
        const pred = newAkhir >= 88 ? 'A' : newAkhir >= 78 ? 'B' : newAkhir >= 65 ? 'C' : 'D';
        updatedNilai.push({
          id: `nil-${currentUser.id}`,
          muridId: currentUser.id,
          muridNama: currentUser.name,
          nis: currentUser.nis || '',
          kelasId: currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '',
          semester: '1 (Ganjil)',
          tugas,
          quiz,
          praktik,
          pengetahuan: Math.round((tugas + quiz) / 2),
          keterampilan: praktik,
          sikap,
          nilaiAkhir: newAkhir,
          predikat: pred as any,
        });
      }

      const newJawaban: any = {
        id: `ans-${currentUser.id}-${currQuiz.id}-${Date.now()}`,
        quizId: currQuiz.id,
        quizJudul: currQuiz.judul,
        muridId: currentUser.id,
        muridNama: currentUser.name,
        kelasId: currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '',
        nilai: calculated100,
        jumlahBenar: correctCount,
        jumlahSalah: wrongCount,
        tanggalMengerjakan: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        tanggalSelesai: new Date().toISOString().slice(0, 10),
        jawaban: currentAnswers,
        jawabanMurid: currentAnswers,
        status: 'Selesai',
      };

      return {
        ...prev,
        nilai: updatedNilai,
        jawabanQuiz: [
          newJawaban,
          ...prev.jawabanQuiz.filter(
            (j) => !(j.quizId === currQuiz.id && j.muridId === currentUser.id)
          ),
        ],
      };
    });
  }, [currentUser, isQuestionAnswerCorrect]);

  const handleSubmitQuizRef = useRef(handleSubmitQuiz);
  handleSubmitQuizRef.current = handleSubmitQuiz;

  // Countdown timer
  useEffect(() => {
    if (!activeQuiz || isFinished) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuizRef.current();
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz, isFinished]);

  // Quiz Lockdown: prevent accidental tab closing or leaving without sending data
  useEffect(() => {
    if (!activeQuiz || isFinished) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If user tries to close or refresh the tab while quiz is active:
      handleSubmitQuizRef.current();
      e.preventDefault();
      e.returnValue =
        'Ujian PJOK sedang berjalan. Jika Anda keluar, jawaban yang telah Anda pilih akan langsung terkirim!';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isFinishedRef.current) {
        setTabSwitchCount((c) => c + 1);
        setTabSwitchAlert(
          'Peringatan Integritas: Anda terdeteksi beralih jendela/layar aplikasi! Jangan meninggalkan layar asesmen PJOK.'
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeQuiz, isFinished]);

  // Live WITA Clock Updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWita(getCurrentWitaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Computed helpers for Token Keluar Otomatis
  const hasTokenKeluar = Boolean(activeQuiz?.tokenKeluar && activeQuiz.tokenKeluar.trim());
  const tokenKeluarWaktuMenit = activeQuiz?.waktuMunculTokenKeluarMenit ?? 10;
  const tokenKeluarUnlockSeconds = tokenKeluarWaktuMenit * 60;
  const isTokenKeluarUnlocked = !hasTokenKeluar || (elapsedSeconds >= tokenKeluarUnlockSeconds);
  const secondsUntilTokenKeluar = Math.max(0, tokenKeluarUnlockSeconds - elapsedSeconds);

  // Auto-toast trigger when Token Keluar is unlocked
  useEffect(() => {
    if (!activeQuiz || !hasTokenKeluar || isFinished) return;
    if (elapsedSeconds >= tokenKeluarUnlockSeconds && tokenKeluarUnlockSeconds > 0) {
      setShowTokenKeluarToast(true);
    }
  }, [elapsedSeconds, activeQuiz, hasTokenKeluar, isFinished, tokenKeluarUnlockSeconds]);

  const proceedStartQuiz = (quiz: Quiz, forceMode?: 'serentak' | 'simulasi') => {
    let initialSeconds = (quiz.durasiMenit || 20) * 60;
    const schedule = evaluateQuizSchedule(quiz);
    const mode = forceMode || (schedule.status === 'DURING' ? 'serentak' : 'simulasi');

    if (mode === 'serentak' && schedule.status === 'DURING') {
      // Waktu tersisa hingga tepat jam 07:20 WITA agar semua murid selesai bersamaan
      initialSeconds = Math.max(10, schedule.secondsRemainingInWindow);
    }

    setActiveExecutionMode(mode);
    setActiveQuiz(quiz);
    setCurrentSoalIndex(0);
    setAnswers({});
    setTimeLeft(initialSeconds);
    setElapsedSeconds(0);
    setIsFinished(false);
    setFinalScore(null);
    setActiveLeftSelection(null);
    setShowExitConfirmModal(false);
    setShowTokenKeluarModal(false);
    setInputTokenKeluar('');
    setTokenKeluarError(null);
    setShowTokenKeluarToast(false);
    setTabSwitchAlert(null);
    setTabSwitchCount(0);
    setSchedulePromptQuiz(null);
    setTokenPromptQuiz(null);
  };

  const handleRequestSubmit = () => {
    if (!activeQuiz) return;
    if (hasTokenKeluar) {
      if (isTokenKeluarUnlocked) {
        setInputTokenKeluar(activeQuiz.tokenKeluar || '');
      } else {
        setInputTokenKeluar('');
      }
      setTokenKeluarError(null);
      setShowTokenKeluarModal(true);
    } else {
      setShowExitConfirmModal(true);
    }
  };

  const handleConfirmExitToken = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeQuiz) return;

    if (isTokenKeluarUnlocked) {
      // Token is already automatically unlocked on screen, submit immediately!
      handleSubmitQuiz();
      setShowTokenKeluarModal(false);
      return;
    }

    const target = (activeQuiz.tokenKeluar || '').trim().toUpperCase();
    const entered = inputTokenKeluar.trim().toUpperCase();

    if (!entered) {
      setTokenKeluarError('Silakan masukkan token keluar dari Guru PJOK atau tunggu waktu otomatis.');
      return;
    }

    if (entered !== target) {
      setTokenKeluarError('Token keluar salah! Anda belum diizinkan mengumpulkan kuis.');
      return;
    }

    handleSubmitQuiz();
    setShowTokenKeluarModal(false);
  };

  const handleStartQuiz = (quiz: Quiz, forceMode?: 'serentak' | 'simulasi') => {
    const hasTaken = (db.jawabanQuiz || []).find(
      (j) => j.quizId === quiz.id && j.muridId === currentUser.id
    );
    if (hasTaken) {
      alert(
        `Kuis "${quiz.judul}" sudah Anda kerjakan (Nilai: ${hasTaken.nilai}) dan telah dikunci otomatis oleh sistem.\n\nPengerjaan kuis hanya diizinkan 1 kali tanpa pengulangan. Jika Anda memerlukan remedial atau izin mengulang, silakan hubungi Guru PJOK atau Admin untuk membuka kunci pengerjaan.`
      );
      return;
    }

    // 1. Jika kuis memiliki kunci akses / token, murid wajib memasukkan kunci terlebih dahulu
    if (quiz.kunciMasuk && quiz.kunciMasuk.trim()) {
      setTokenPromptQuiz({ quiz, forceMode });
      setInputToken('');
      setTokenError(null);
      return;
    }

    const schedule = evaluateQuizSchedule(quiz);

    // 2. Jika murid mengklik tanpa forceMode dan waktu saat ini bukan DURING (sebelum 07:00 atau setelah 07:20 WITA)
    if (!forceMode && schedule.status !== 'DURING') {
      setSchedulePromptQuiz({ quiz, result: schedule });
      return;
    }

    proceedStartQuiz(quiz, forceMode);
  };

  const handleVerifyTokenAndStart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenPromptQuiz) return;
    const targetKey = (tokenPromptQuiz.quiz.kunciMasuk || '').trim().toUpperCase();
    const entered = inputToken.trim().toUpperCase();

    if (!entered) {
      setTokenError('Kunci kuis belum diisi. Silakan masukkan kunci kuis.');
      return;
    }

    if (entered !== targetKey) {
      setTokenError('Kunci kuis salah! Pastikan kunci yang dimasukkan sesuai instruksi Guru PJOK.');
      return;
    }

    const { quiz, forceMode } = tokenPromptQuiz;
    setTokenPromptQuiz(null);
    setInputToken('');
    setTokenError(null);

    const schedule = evaluateQuizSchedule(quiz);
    if (!forceMode && schedule.status !== 'DURING') {
      setSchedulePromptQuiz({ quiz, result: schedule });
      return;
    }

    proceedStartQuiz(quiz, forceMode);
  };

  // Auto-launch quiz if initialQuizId is provided via notification
  useEffect(() => {
    if (initialQuizId && (db.quiz || []).length > 0 && !activeQuiz) {
      if (
        dismissedInitialIdRef.current === initialQuizId ||
        openedInitialIdRef.current === initialQuizId
      ) {
        return;
      }
      const found = (db.quiz || []).find((q) => q.id === initialQuizId);
      if (found) {
        openedInitialIdRef.current = initialQuizId;
        const hasTaken = (db.jawabanQuiz || []).some(
          (j) => j.quizId === found.id && j.muridId === currentUser.id
        );
        if (!hasTaken) {
          handleStartQuiz(found);
        }
      }
    }
  }, [initialQuizId, db.quiz, activeQuiz, currentUser.id]);

  const handleSelectAnswer = (soalId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [soalId]: answer }));
  };

  // Helper for Tarik Garis (menjodohkan)
  const getMatchingPairsForSoal = (soalId: string): Record<string, string> => {
    try {
      const raw = answers[soalId];
      if (raw && raw.startsWith('{')) {
        return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return {};
  };

  const handlePairSelection = (soalId: string, leftItem: string, rightItem: string) => {
    const currentPairs = getMatchingPairsForSoal(soalId);
    const updated = { ...currentPairs, [leftItem]: rightItem };
    setAnswers((prev) => ({ ...prev, [soalId]: JSON.stringify(updated) }));
    setActiveLeftSelection(null);
  };

  const handleRemovePair = (soalId: string, leftItem: string) => {
    const currentPairs = getMatchingPairsForSoal(soalId);
    const updated = { ...currentPairs };
    delete updated[leftItem];
    setAnswers((prev) => ({ ...prev, [soalId]: JSON.stringify(updated) }));
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* View 1: Active Quizzes List (when no quiz is active) */}
      {!activeQuiz && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Quiz & Asesmen PJOK</h2>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full text-[10px]">
                  AKM & HOTS Interaktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilihan ganda A - E, mencocokkan gambar, tarik garis, dan benar/salah untuk menguji kompetensi motorik & kognitif.
              </p>
            </div>
          </div>

          {/* Synchronized WITA Clock Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-purple-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                    Sinkronisasi Jam Ujian Serentak (WITA)
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded text-[9px] font-bold">
                    UTC+8 WITA (SMAN 1 Tejakula)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Durasi pengerjaan kuis dilaksanakan serentak pukul <strong className="text-amber-300 font-extrabold">07:00 s.d. 07:20 WITA</strong> agar seluruh murid mengerjakan pada rentang waktu yang sama.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/15 text-center font-mono shadow-inner">
                <div className="text-[10px] text-purple-200 uppercase font-bold tracking-wider">Jam WITA Saat Ini</div>
                <div className="text-lg font-black text-amber-300 tracking-widest">{currentWita.fullTimeStr}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(db.quiz || [])
              .filter((q) => {
                const status = (q.status as string) || '';
                const pub = (q.statusPublikasi as string) || '';
                if (status === 'Draft' || pub === 'Draft' || status === 'Arsip') return false;
                if (status && status !== 'Publish' && status !== 'Aktif' && pub !== 'Publish') return false;
                return true;
              })
              .map((q) => {
                const qCount = q.soal?.length || q.soalList?.length || 0;
                const hasTaken = (db.jawabanQuiz || []).find(
                  (j) => j.quizId === q.id && j.muridId === currentUser.id
                );
                const schedule = evaluateQuizSchedule(q);
                const deadlineDate = parseDeadlineToDate(q.batasWaktu);
                const isUrgent24H =
                  deadlineDate &&
                  !hasTaken &&
                  deadlineDate.getTime() - Date.now() > 0 &&
                  deadlineDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
                const timeRemainingText = isUrgent24H
                  ? formatTimeRemaining(Math.max(0, deadlineDate.getTime() - Date.now()))
                  : null;

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-3xl p-5 border transition-all space-y-4 flex flex-col justify-between ${
                      schedule.status === 'DURING'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
                        : isUrgent24H
                        ? 'border-rose-300 shadow-md ring-1 ring-rose-300/60'
                        : 'border-slate-200/80 shadow-xs hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-extrabold text-[10px] rounded-lg">
                            {q.materiJudul || 'PJOK Teori & Praktik'}
                          </span>

                          {/* WITA Schedule Status Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                              schedule.status === 'DURING'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse font-extrabold'
                                : schedule.status === 'BEFORE'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {schedule.status === 'DURING'
                              ? `Pukul ${schedule.jamMulai} - ${schedule.jamSelesai} WITA (Sedang Berlangsung)`
                              : schedule.status === 'BEFORE'
                              ? `Pukul ${schedule.jamMulai} - ${schedule.jamSelesai} WITA (Dibuka Nanti)`
                              : `Pukul ${schedule.jamMulai} - ${schedule.jamSelesai} WITA (Selesai)`}
                          </span>

                          {isUrgent24H && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-black flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Batas &lt; 24 Jam ({timeRemainingText})
                            </span>
                          )}

                          {((q.soal || q.soalList || []).some((s) => s.linkEksternal || s.tipe?.startsWith('Link')) || q.linkEksternal) && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-bold flex items-center gap-1">
                              <Globe className="w-3 h-3 text-blue-600" />
                              Tautan Interaktif (Di Aplikasi)
                            </span>
                          )}

                          {q.kunciMasuk ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              Perlu Kunci Kuis
                            </span>
                          ) : null}

                          {q.tokenKeluar ? (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-300 rounded text-[10px] font-extrabold flex items-center gap-1">
                              <LogOut className="w-3 h-3 text-teal-600" />
                              Token Keluar Otomatis (Menit ke-{q.waktuMunculTokenKeluarMenit || 10})
                            </span>
                          ) : null}
                        </div>
                        {hasTaken && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                            Nilai: {hasTaken.nilai}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm leading-snug">{q.judul}</h3>
                        {q.subJudul && (
                          <p className="text-xs text-purple-700 font-bold mt-0.5">{q.subJudul}</p>
                        )}
                      </div>

                      {/* Schedule info box */}
                      <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-purple-950 font-bold">
                          <span>⏰ Jadwal Serentak WITA:</span>
                          <span className="text-purple-700 font-extrabold">
                            {schedule.jamMulai} s.d. {schedule.jamSelesai} WITA ({q.durasiMenit || 20}m)
                          </span>
                        </div>
                        <p className="text-slate-600 text-[10.5px] leading-relaxed">
                          {schedule.status === 'DURING' ? (
                            <span className="text-emerald-700 font-bold">
                              🟢 Waktu serentak sedang berjalan! Sisa waktu dalam sesi: {Math.floor(schedule.secondsRemainingInWindow / 60)} menit tersisa.
                            </span>
                          ) : schedule.status === 'BEFORE' ? (
                            <span className="text-amber-700 font-semibold">
                              ⏳ Akses serentak dibuka tepat pukul {schedule.jamMulai} WITA ({schedule.humanMessage}).
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium">
                              ⚪ Sesi serentak pukul {schedule.jamMulai} - {schedule.jamSelesai} WITA telah berakhir.
                            </span>
                          )}
                        </p>
                      </div>

                      {hasTaken && (
                        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-[11px] flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800">Kuis Terkunci (Aturan 1x Pengerjaan)</p>
                            <p className="text-slate-600 text-[10.5px] leading-snug">
                              Anda sudah mengerjakan kuis ini (Nilai: <span className="font-bold text-emerald-700">{hasTaken.nilai}</span>). Pengulangan dikunci. Untuk mengulang, silakan hubungi Guru PJOK atau Admin untuk membuka kunci.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-purple-500" /> {q.durasiMenit || 20} Menit
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-500" /> {qCount} Butir
                        </span>
                      </div>

                      {hasTaken ? (
                        <button
                          type="button"
                          onClick={() => {
                            alert(
                              `Kuis "${q.judul}" telah Anda selesaikan dengan nilai ${hasTaken.nilai} dan sistem menguncinya.\n\nAturan kuis hanya mengizinkan 1 kali pengerjaan tanpa pengulangan langsung. Jika memerlukan izin mengulang atau remedial, silakan hubungi Guru PJOK atau Admin untuk membuka kunci kuis.`
                            );
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Kuis terkunci. Hubungi Guru atau Admin untuk membuka kunci."
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Terkunci</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartQuiz(q)}
                          className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                            q.kunciMasuk
                              ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 ring-2 ring-amber-400/30'
                              : schedule.status === 'DURING'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 ring-2 ring-emerald-400/40 animate-pulse'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                          }`}
                        >
                          {q.kunciMasuk && <Key className="w-3.5 h-3.5" />}
                          <span>
                            {q.kunciMasuk
                              ? 'Masukkan Kunci & Mulai'
                              : schedule.status === 'DURING'
                              ? 'Mulai Ujian Serentak'
                              : 'Mulai Quiz'}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Modal Prompt Konfirmasi Jadwal Ujian Serentak (WITA) */}
      {schedulePromptQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Jadwal Ujian Serentak PJOK
              </span>
              <h3 className="text-lg font-black text-slate-800">{schedulePromptQuiz.quiz.judul}</h3>
              <p className="text-xs text-slate-500">
                Pengerjaan kuis diatur serentak pukul{' '}
                <strong className="text-purple-700 font-bold">
                  {schedulePromptQuiz.result.jamMulai} s.d. {schedulePromptQuiz.result.jamSelesai} WITA
                </strong>{' '}
                agar seluruh murid mengerjakan pada jam yang sama.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>Waktu WITA Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {currentWita.fullTimeStr}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Jadwal Resmi Serentak:</span>
                <span className="font-bold text-purple-700">
                  {schedulePromptQuiz.result.jamMulai} - {schedulePromptQuiz.result.jamSelesai} WITA
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] font-medium leading-relaxed">
                {schedulePromptQuiz.result.status === 'BEFORE' ? (
                  <span className="text-amber-800 bg-amber-50 p-2.5 rounded-xl block border border-amber-200">
                    ⏳ <strong>Belum Masuk Jam Ujian</strong>: Sesi serentak dibuka tepat pukul {schedulePromptQuiz.result.jamMulai} WITA ({schedulePromptQuiz.result.humanMessage}).
                  </span>
                ) : (
                  <span className="text-slate-700 bg-slate-100 p-2.5 rounded-xl block border border-slate-200">
                    ⚪ <strong>Sesi Serentak Berakhir</strong>: Jam {schedulePromptQuiz.result.jamSelesai} WITA telah lewat ({schedulePromptQuiz.result.humanMessage}).
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleStartQuiz(schedulePromptQuiz.quiz, 'simulasi')}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Mulai Mode Simulasi / Mandiri ({schedulePromptQuiz.quiz.durasiMenit || 20} Menit)</span>
              </button>

              <button
                type="button"
                onClick={() => setSchedulePromptQuiz(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tunggu Jam Ujian ({schedulePromptQuiz.result.jamMulai} WITA)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Kunci / Token Akses Kuis Murid */}
      {tokenPromptQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
              <Key className="w-7 h-7 animate-bounce" />
            </div>

            <div className="text-center space-y-1.5">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                Proteksi Kunci Akses Kuis
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-snug">
                {tokenPromptQuiz.quiz.judul}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Kuis ini membutuhkan <strong>Kunci Akses / Token</strong>. Masukkan kunci yang telah diberikan oleh Guru PJOK di kelas untuk membuka dan memulai soal.
              </p>
            </div>

            <form onSubmit={handleVerifyTokenAndStart} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 text-center">
                  Ketik Kunci Kuis / Token:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    required
                    value={inputToken}
                    onChange={(e) => {
                      setInputToken(e.target.value.toUpperCase());
                      setTokenError(null);
                    }}
                    placeholder="CONTOH: PJOK88"
                    className="w-full px-4 py-3 bg-amber-50/50 border-2 border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-300/30 rounded-2xl font-mono text-center font-black text-lg tracking-widest text-amber-950 placeholder:text-slate-300 focus:outline-hidden uppercase transition-all shadow-inner"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>

                {tokenError && (
                  <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    ⚠️ {tokenError}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p className="flex items-center gap-1.5 font-bold text-slate-700">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Petunjuk Siswa:
                </p>
                <p>
                  • Kunci kuis tidak peka huruf besar/kecil (case-insensitive).
                  <br />
                  • Segera tanyakan kepada Guru PJOK jika belum menerima kunci kuis.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTokenPromptQuiz(null);
                    setInputToken('');
                    setTokenError(null);
                  }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Buka Kuis & Mulai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View 2 & 3: MODE UJIAN TERKUNCI (FULLSCREEN LOCKDOWN) */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex flex-col justify-between animate-in fade-in">
          <div className="max-w-4xl w-full mx-auto space-y-4 my-auto">
            {/* Strict Lockdown Header Warning Banner */}
            {!isFinished && (
              <div className="bg-gradient-to-r from-rose-900 via-red-950 to-slate-900 border border-rose-500/40 rounded-2xl p-4 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                        Mode Ujian Terkunci
                      </span>
                      <span className="px-2 py-0.2 bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded text-[9px] font-extrabold">
                        Sistem Pengawasan Aktif
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      Dilarang keluar dari aplikasi kuis. Jika Anda keluar atau menutup halaman,{' '}
                      <strong className="text-amber-300 font-bold">
                        jawaban Anda akan LANGSUNG TERKIRIM secara otomatis
                      </strong>{' '}
                      ke guru!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasTokenKeluar) {
                        handleRequestSubmit();
                      } else {
                        setShowExitConfirmModal(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Ujian</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab switch warning alert if triggered */}
            {tabSwitchAlert && !isFinished && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2 animate-bounce">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {tabSwitchAlert} (Terdeteksi {tabSwitchCount} kali)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTabSwitchAlert(null)}
                  className="text-[10px] bg-amber-500/30 hover:bg-amber-500/50 px-2 py-0.5 rounded font-bold text-white cursor-pointer"
                >
                  Saya Paham
                </button>
              </div>
            )}

            {/* Active Taking Quiz Screen */}
            {!isFinished && (
              <div className="space-y-4">
                {/* Header Bar with Countdown Timer & Synchronized WITA Clock */}
                <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-500/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                        Sedang Dikerjakan • {activeQuiz.materiJudul || 'PJOK'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border ${
                        activeExecutionMode === 'serentak'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      }`}>
                        {activeExecutionMode === 'serentak'
                          ? 'UJIAN SERENTAK (07:00 - 07:20 WITA)'
                          : 'MODE LATIHAN MANDIRI'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black">{activeQuiz.judul}</h2>
                    <p className="text-[11px] text-purple-200">
                      {activeExecutionMode === 'serentak' ? (
                        <>⏰ Seluruh murid mengerjakan serentak. Kuis tertutup otomatis pada pukul <strong>{activeQuiz.jamSelesai || '07:20'} WITA</strong>.</>
                      ) : (
                        <>⏱️ Mode latihan mandiri berdurasi {activeQuiz.durasiMenit || 20} menit.</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                    {/* Live WITA Clock */}
                    <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-center font-mono">
                      <div className="text-[9px] text-purple-200 uppercase font-bold tracking-wider">Jam WITA</div>
                      <div className="text-xs font-black text-amber-300 tracking-wider">{currentWita.fullTimeStr}</div>
                    </div>

                    {/* Sisa Waktu Countdown */}
                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/15 rounded-xl border border-white/25 backdrop-blur-xs">
                      <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                      <div>
                        <div className="text-[9px] text-purple-200 uppercase font-bold">Sisa Waktu</div>
                        <span className="font-mono font-black text-sm tracking-wider text-white">
                          {formatTimer(timeLeft)}
                        </span>
                      </div>
                    </div>

                    {/* Token Keluar Indicator in Header */}
                    {hasTokenKeluar && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xs ${
                        isTokenKeluarUnlocked
                          ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 animate-pulse'
                          : 'bg-amber-500/20 border-amber-400/30 text-amber-200'
                      }`}>
                        {isTokenKeluarUnlocked ? (
                          <Key className="w-4 h-4 text-amber-300" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-300" />
                        )}
                        <div>
                          <div className="text-[8px] uppercase font-bold text-slate-300">Token Keluar</div>
                          <span className={`font-mono font-black text-xs ${
                            isTokenKeluarUnlocked ? 'text-amber-300 tracking-wider' : 'text-amber-100'
                          }`}>
                            {isTokenKeluarUnlocked ? activeQuiz.tokenKeluar : formatTimer(secondsUntilTokenKeluar)}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRequestSubmit}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kumpulkan Jawaban</span>
                    </button>
                  </div>
                </div>

                {/* Banner Token Keluar Otomatis di Layar Murid */}
                {hasTokenKeluar && (
                  <>
                    {!isTokenKeluarUnlocked ? (
                      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 animate-spin-slow" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-amber-950">
                                Token Keluar Otomatis Terkunci
                              </span>
                              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black">
                                Muncul Menit ke-{tokenKeluarWaktuMenit}
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              Fokuslah meneliti jawaban Anda. Token untuk mengumpulkan kuis akan <strong>otomatis tampil di layar Anda</strong> dalam <span className="font-mono font-black text-amber-950 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">{formatTimer(secondsUntilTokenKeluar)}</span>.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setInputTokenKeluar('');
                            setTokenKeluarError(null);
                            setShowTokenKeluarModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                        >
                          Izin Keluar / Masukkan Token
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-inner">
                            <Key className="w-5 h-5 animate-pulse text-amber-300" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs tracking-wide uppercase text-emerald-100">
                                🎉 Token Keluar Otomatis Terbuka:
                              </span>
                              <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-lg font-mono font-black text-sm tracking-widest shadow-xs">
                                {activeQuiz.tokenKeluar}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(activeQuiz.tokenKeluar || '');
                                  alert(`Token Keluar "${activeQuiz.tokenKeluar}" disalin!`);
                                }}
                                className="p-1 hover:bg-white/20 rounded transition-colors text-emerald-100"
                                title="Salin Token Keluar"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-[11px] text-emerald-100 mt-0.5">
                              Waktu pengerjaan minimal ({tokenKeluarWaktuMenit} menit) telah tercapai. Anda sekarang dapat mengumpulkan hasil ujian.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setInputTokenKeluar(activeQuiz.tokenKeluar || '');
                            setTokenKeluarError(null);
                            setShowTokenKeluarModal(true);
                          }}
                          className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kumpulkan Jawaban</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Question Navigator Bar */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1">
                    <span className="font-bold text-slate-700">Navigasi Nomor Soal:</span>
                    <span className="text-[11px] text-slate-400">
                      Terjawab: {Object.keys(answers).length} dari {quizQuestions.length} butir
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {quizQuestions.map((s, idx) => {
                      const isCurrent = currentSoalIndex === idx;
                      const isAnswered = !!answers[s.id];

                      return (
                        <button
                          key={s.id || idx}
                          type="button"
                          onClick={() => {
                            setCurrentSoalIndex(idx);
                            setActiveLeftSelection(null);
                          }}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-xs scale-105'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Card Display based on Question Type */}
                {(() => {
                  const currentSoal = quizQuestions[currentSoalIndex];
                  if (!currentSoal) {
                    return (
                      <div className="p-8 bg-white rounded-3xl border text-center text-slate-500 text-sm">
                        Tidak ada butir soal dalam paket ini.
                      </div>
                    );
                  }

                  const currentType = currentSoal.tipe || 'Pilihan Ganda';
                  const matchedPairs = getMatchingPairsForSoal(currentSoal.id);

                  return (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                      {/* Question Info & Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-extrabold text-[11px] rounded-lg">
                            Nomor {currentSoalIndex + 1} ({currentSoal.bobot || 20} Poin)
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg">
                            Tipe: {currentType}
                          </span>
                        </div>
                        {currentSoal.kategoriSoal && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold text-[10px] rounded border border-amber-200">
                            {currentSoal.kategoriSoal}
                          </span>
                        )}
                      </div>

                      {/* Question Prompt */}
                      <div className="space-y-3">
                        <p className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed">
                          {currentSoal.pertanyaan}
                        </p>

                        {/* If question includes an image */}
                        {currentSoal.gambarUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-lg mx-auto shadow-xs">
                            <img
                              src={currentSoal.gambarUrl}
                              alt="Ilustrasi Gerak Soal"
                              className="w-full max-h-72 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Dynamic Options Rendering based on Tipe Soal */}

                      {/* 1. Benar / Salah */}
                      {currentType === 'Benar/Salah' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {['Benar', 'Salah'].map((choice) => {
                            const isSelected = answers[currentSoal.id] === choice;
                            const isBenar = choice === 'Benar';

                            return (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => handleSelectAnswer(currentSoal.id, choice)}
                                className={`p-5 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? isBenar
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-md ring-2 ring-emerald-200'
                                      : 'border-rose-500 bg-rose-50 text-rose-950 shadow-md ring-2 ring-rose-200'
                                    : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base ${
                                      isSelected
                                        ? isBenar
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-rose-600 text-white'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isBenar ? '✓' : '✗'}
                                  </span>
                                  <div>
                                    <span className="text-base font-extrabold block">{choice}</span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                      {isBenar
                                        ? 'Pernyataan di atas benar dan sesuai kaidah'
                                        : 'Pernyataan di atas keliru / tidak sesuai'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Tarik Garis (Menjodohkan) */}
                      {currentType === 'Tarik Garis' && (
                        <div className="space-y-4 pt-2">
                          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-900 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <Link2 className="w-4 h-4 text-purple-700" />
                              Cara Menjawab Tarik Garis:
                            </p>
                            <p className="text-[11px] text-purple-700 leading-relaxed">
                              1. Klik salah satu item di <strong>Kolom Kiri</strong> (akan menyala ungu).
                              <br />
                              2. Klik item pasangannya di <strong>Kolom Kanan</strong> untuk menghubungkannya.
                            </p>
                          </div>

                          {/* Columns */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Column */}
                            <div className="space-y-2">
                              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                                Kolom A (Item / Posisi / Istilah)
                              </span>
                              {(currentSoal.matchingPairs || []).map((pair, pIdx) => {
                                const isPaired = !!matchedPairs[pair.left];
                                const isLeftActive = activeLeftSelection === pair.left;

                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() =>
                                      setActiveLeftSelection(isLeftActive ? null : pair.left)
                                    }
                                    className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                      isLeftActive
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-300'
                                        : isPaired
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span
                                        className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center ${
                                          isLeftActive
                                            ? 'bg-white text-purple-800'
                                            : isPaired
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {pIdx + 1}
                                      </span>
                                      <span>{pair.left}</span>
                                    </div>

                                    {isPaired && (
                                      <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-800 font-bold">
                                        Terhubung
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                                Kolom B (Definisi / Tugas / Deskripsi)
                              </span>
                              {(currentSoal.matchingPairs || []).map((pair, pIdx) => {
                                const connectedLeft = Object.keys(matchedPairs).find(
                                  (k) => matchedPairs[k] === pair.right
                                );

                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => {
                                      if (activeLeftSelection) {
                                        handlePairSelection(
                                          currentSoal.id,
                                          activeLeftSelection,
                                          pair.right
                                        );
                                      }
                                    }}
                                    className={`w-full p-3.5 rounded-2xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                                      connectedLeft
                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                                        : activeLeftSelection
                                        ? 'bg-purple-50/40 border-purple-300 hover:bg-purple-50 text-slate-800 font-medium ring-1 ring-purple-200'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <span className="block leading-relaxed">{pair.right}</span>
                                      {connectedLeft && (
                                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                          ➜ Pasangan: {connectedLeft}
                                        </span>
                                      )}
                                    </div>

                                    {connectedLeft && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemovePair(currentSoal.id, connectedLeft);
                                        }}
                                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold ml-2 shrink-0 cursor-pointer"
                                      >
                                        Lepas
                                      </button>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Mencocokkan Gambar */}
                      {currentType === 'Mencocokkan Gambar' && (
                        <div className="space-y-4 pt-2">
                          {currentSoal.matchingPairs && currentSoal.matchingPairs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {currentSoal.matchingPairs.map((item, idx) => {
                                const isSelected = answers[currentSoal.id] === item.left;
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => handleSelectAnswer(currentSoal.id, item.left)}
                                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-300 shadow-md'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                  >
                                    {item.imageUrl && (
                                      <img
                                        src={item.imageUrl}
                                        alt={item.left}
                                        className="w-full h-32 object-cover rounded-xl border border-slate-100"
                                      />
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-slate-800">{item.left}</span>
                                      <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          isSelected
                                            ? 'bg-purple-600 text-white'
                                            : 'border border-slate-300 text-transparent'
                                        }`}
                                      >
                                        ✓
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-2">{item.right}</p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {(currentSoal.pilihan || []).map((opsi, optIdx) => {
                                const isSelected = answers[currentSoal.id] === opsi;
                                const optLetter = String.fromCharCode(65 + optIdx);

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => handleSelectAnswer(currentSoal.id, opsi)}
                                    className={`w-full text-left p-3.5 rounded-2xl border text-xs font-medium transition-all flex items-center gap-3 cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-50/80 border-purple-500 text-purple-950 ring-2 ring-purple-200'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                        isSelected
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {optLetter}
                                    </span>
                                    <span className="leading-snug">{opsi}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Pilihan Ganda (A sampai E) */}
                      {currentType === 'Pilihan Ganda' && (
                        <div className="space-y-2.5 pt-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pilihan Jawaban (A s.d E):
                          </span>
                          {(currentSoal.pilihan || []).map((opsi, optIdx) => {
                            const isSelected = answers[currentSoal.id] === opsi;
                            const optLabel = String.fromCharCode(65 + optIdx);

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectAnswer(currentSoal.id, opsi)}
                                className={`w-full text-left p-3.5 rounded-2xl border text-xs font-medium transition-all flex items-center gap-3 cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-50/80 border-purple-500 text-purple-950 ring-2 ring-purple-200 shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                    isSelected
                                      ? 'bg-purple-600 text-white shadow-xs scale-105'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {optLabel}
                                </span>
                                <span className="leading-relaxed font-semibold">{opsi}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. Isian Singkat */}
                      {currentType === 'Isian' && (
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold text-slate-700">Tuliskan Jawaban Singkat Anda:</label>
                          <input
                            type="text"
                            value={answers[currentSoal.id] || ''}
                            onChange={(e) => handleSelectAnswer(currentSoal.id, e.target.value)}
                            placeholder="Ketik jawaban Anda..."
                            className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                          />
                        </div>
                      )}

                      {/* 6. Link Google Form, Link AppScript, & Link Aplikasi Lainnya (Terbuka di dalam Aplikasi) */}
                      {(currentType === 'Link Google Form' ||
                        currentType === 'Link AppScript' ||
                        currentType === 'Link Aplikasi Lainnya' ||
                        Boolean(currentSoal.linkEksternal)) && (
                        <div className="space-y-3 pt-1">
                          {/* Platform Header & Toolbar */}
                          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
                                {currentType === 'Link Google Form' ? (
                                  <FileText className="w-5 h-5 text-purple-400" />
                                ) : currentType === 'Link AppScript' ? (
                                  <Code2 className="w-5 h-5 text-blue-400" />
                                ) : (
                                  <Globe className="w-5 h-5 text-emerald-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                                    {currentType === 'Link Google Form'
                                      ? 'Google Form'
                                      : currentType === 'Link AppScript'
                                      ? 'Google Apps Script'
                                      : 'Aplikasi Soal Interaktif'}
                                  </span>
                                  <span className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Terbuka di Dalam Aplikasi
                                  </span>
                                </div>
                                <h4 className="font-extrabold text-xs sm:text-sm text-white truncate mt-0.5">
                                  {currentSoal.judulLink || currentSoal.pertanyaan}
                                </h4>
                              </div>
                            </div>

                            {/* Toolbar Buttons */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => setIframeReloadKey((k) => k + 1)}
                                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Muat ulang lembar soal jika ada kendala jaringan"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Muat Ulang</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIframeFullscreenId(currentSoal.id)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Perbesar tampilan penuh di dalam aplikasi"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Layar Penuh</span>
                              </button>
                              {currentSoal.linkEksternal && (
                                <a
                                  href={currentSoal.linkEksternal}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                  title="Buka tab baru sebagai cadangan darurat jika peramban membatasi frame"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          {currentSoal.keteranganLink && (
                            <p className="text-xs text-slate-600 bg-purple-50 p-2.5 rounded-xl border border-purple-100 font-medium">
                              📌 {currentSoal.keteranganLink}
                            </p>
                          )}

                          {/* Embedded iFrame in App */}
                          {currentSoal.linkEksternal ? (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner bg-slate-100 min-h-[500px]">
                              <iframe
                                key={`${currentSoal.id}-${iframeReloadKey}`}
                                src={formatQuizEmbedUrl(currentSoal.linkEksternal)}
                                title={currentSoal.judulLink || 'Lembar Soal Interaktif'}
                                className="w-full h-[520px] border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                              />
                            </div>
                          ) : (
                            <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-xs text-slate-500">
                              Tautan belum ditentukan oleh guru untuk butir soal ini.
                            </div>
                          )}

                          {/* Completion Checkmark Action */}
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="font-extrabold text-xs text-slate-800 block">
                                Konfirmasi Penyelesaian Butir Soal:
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Setelah selesai mengerjakan pada lembar tersemat di atas, klik tombol konfirmasi di samping untuk merekam skor Anda.
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const isDone = answers[currentSoal.id] === 'Selesai';
                                handleSelectAnswer(currentSoal.id, isDone ? '' : 'Selesai');
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-xs ${
                                answers[currentSoal.id] === 'Selesai'
                                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {answers[currentSoal.id] === 'Selesai'
                                  ? '✓ Sudah Selesai Dikerjakan'
                                  : 'Tandai Sudah Selesai'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Navigation Buttons */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={currentSoalIndex === 0}
                          onClick={() => {
                            setCurrentSoalIndex((prev) => prev - 1);
                            setActiveLeftSelection(null);
                          }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-30 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
                        </button>

                        {currentSoalIndex < quizQuestions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentSoalIndex((prev) => prev + 1);
                              setActiveLeftSelection(null);
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            Soal Berikutnya <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleRequestSubmit}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                          >
                            Selesai & Kumpulkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* View 3: Result & Pembahasan View */}
            {isFinished && activeQuiz && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-6 p-6 animate-in zoom-in-95">
                {/* Result Card */}
                <div className="text-center p-6 bg-gradient-to-tr from-purple-50 via-pink-50 to-emerald-50 rounded-2xl border border-purple-100 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-purple-600 mx-auto">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800">
                    Quiz Telah Selesai & Jawaban Berhasil Terkirim!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seluruh lembar jawaban Anda telah tersimpan secara permanen dan otomatis masuk ke rapor nilai PJOK.
                  </p>

                  <div className="pt-2">
                    <span className="text-5xl font-black text-purple-700 font-mono">{finalScore}</span>
                    <span className="text-sm font-bold text-slate-400"> / 100</span>
                  </div>
                </div>

                {/* Pembahasan Soal */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pembahasan Kunci Jawaban Soal AKM & HOTS:
                  </h4>

                  {quizQuestions.map((s, idx) => {
                    const myAnswer = answers[s.id];
                    const isCorrect = isQuestionAnswerCorrect(s, myAnswer);

                    let displayMyAnswer = myAnswer || '(Tidak dijawab)';
                    if (s.tipe === 'Tarik Garis' && myAnswer) {
                      try {
                        const parsed = JSON.parse(myAnswer);
                        displayMyAnswer = Object.entries(parsed)
                          .map(([k, v]) => `${k} ➔ ${v}`)
                          .join(' | ');
                      } catch {
                        displayMyAnswer = myAnswer;
                      }
                    }

                    return (
                      <div
                        key={s.id || idx}
                        className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                          isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                                #{idx + 1}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                                {s.tipe || 'Pilihan Ganda'}
                              </span>
                              {s.kategoriSoal && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-extrabold">
                                  {s.kategoriSoal}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-900 leading-relaxed pt-0.5">
                              {s.pertanyaan}
                            </p>
                          </div>
                          {isCorrect ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg flex items-center gap-1 text-[11px] shrink-0 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Benar (+{s.bobot || 20})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold rounded-lg flex items-center gap-1 text-[11px] shrink-0 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Belum Tepat (0)
                            </span>
                          )}
                        </div>

                        {/* Answers Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className={`p-2.5 rounded-xl border ${isCorrect ? 'bg-emerald-100/50 border-emerald-200 text-emerald-950' : 'bg-rose-100/50 border-rose-200 text-rose-950'}`}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-75">
                              Jawaban Anda:
                            </span>
                            <span className="font-semibold leading-relaxed block mt-0.5">
                              {displayMyAnswer}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl border bg-white border-slate-200 text-slate-800">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-500">
                              Kunci Jawaban Resmi:
                            </span>
                            <span className="font-semibold leading-relaxed block mt-0.5 text-emerald-800">
                              {s.kunciJawaban}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuiz(null);
                      setIsFinished(false);
                    }}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
                  >
                    Selesai & Keluar dari Mode Ujian
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRICT EXIT CONFIRMATION MODAL: Auto-submits on leaving */}
      {showExitConfirmModal && activeQuiz && !isFinished && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Peringatan: Keluar dari Ujian?
              </h3>
              <p className="text-xs text-rose-600 font-bold">
                Jika keluar sekarang, seluruh data jawaban yang sudah diisi akan LANGSUNG TERKIRIM secara otomatis!
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Peraturan Asesmen PJOK melarang murid meninggalkan kuis yang sedang berlangsung. Apabila Anda memilih untuk keluar, sesi ujian Anda akan ditutup permanen dan nilai langsung dihitung.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Soal Terjawab:</span>
                <span className="text-purple-700">
                  {Object.keys(answers).length} dari {quizQuestions.length} Butir
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Sisa Waktu:</span>
                <span className="text-amber-600 font-mono">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Batalkan & Lanjut Kerjakan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  if (hasTokenKeluar) {
                    handleRequestSubmit();
                  } else {
                    handleSubmitQuiz();
                  }
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ya, Keluar & Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Token Keluar Ujian Otomatis */}
      {showTokenKeluarModal && activeQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-inner ${
                isTokenKeluarUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isTokenKeluarUnlocked ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                ) : (
                  <Lock className="w-7 h-7 text-amber-600" />
                )}
              </div>
              <h3 className="text-base font-black text-slate-800">
                {isTokenKeluarUnlocked ? 'Token Keluar Otomatis Terbuka!' : 'Token Keluar Ujian Diperlukan'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTokenKeluarUnlocked
                  ? `Waktu minimal ujian (${tokenKeluarWaktuMenit} menit) telah tercapai. Anda diizinkan untuk mengumpulkan jawaban sekarang.`
                  : `Kuis ini terproteksi Token Keluar. Token akan tampil otomatis di layar Anda setelah ${tokenKeluarWaktuMenit} menit.`}
              </p>
            </div>

            {/* Quiz Progress Summary */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between font-bold">
                <span>Kuis:</span>
                <span className="text-purple-700 font-extrabold truncate max-w-[200px]">{activeQuiz.judul}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Soal Terjawab:</span>
                <span className="text-slate-800">
                  {Object.keys(answers).length} dari {quizQuestions.length} Butir Soal
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Sisa Waktu Ujian:</span>
                <span className="text-amber-600 font-mono">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {isTokenKeluarUnlocked ? (
              /* Token is already unlocked automatically */
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl text-center space-y-2 shadow-xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Token Keluar Otomatis Anda
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-3xl font-black text-emerald-950 tracking-widest bg-white py-1.5 px-4 rounded-xl border border-emerald-300 shadow-2xs">
                      {activeQuiz.tokenKeluar}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(activeQuiz.tokenKeluar || '');
                        alert(`Token Keluar "${activeQuiz.tokenKeluar}" disalin!`);
                      }}
                      className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-colors cursor-pointer"
                      title="Salin Token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Token ini otomatis terbuka karena waktu pengerjaan telah mencapai batas minimal waktu guru ({tokenKeluarWaktuMenit} menit).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTokenKeluarModal(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Periksa Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExitToken}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Jawaban</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Token is still locked */
              <div className="space-y-3.5">
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl space-y-2 text-amber-900">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Token Muncul Otomatis Dalam:
                    </span>
                    <span className="font-mono text-base font-black text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md">
                      {formatTimer(secondsUntilTokenKeluar)}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-amber-800 leading-snug">
                    Guru PJOK menetapkan waktu pengerjaan minimal <strong>{tokenKeluarWaktuMenit} menit</strong>. Harap periksa kembali jawaban Anda hingga waktu token keluar muncul otomatis di layar.
                  </p>
                </div>

                <form onSubmit={handleConfirmExitToken} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Punya Izin Pengawas / Guru untuk Keluar Lebih Awal?
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan Token Keluar dari Guru..."
                      value={inputTokenKeluar}
                      onChange={(e) => {
                        setInputTokenKeluar(e.target.value.toUpperCase());
                        setTokenKeluarError(null);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-center text-sm tracking-widest uppercase focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                      autoFocus
                    />
                    {tokenKeluarError && (
                      <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1.5 animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{tokenKeluarError}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTokenKeluarModal(false)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      Batal & Lanjut Ujian
                    </button>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Validasi & Kirim</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Auto-Toast Notification when Token Keluar Unlocks */}
      {showTokenKeluarToast && isTokenKeluarUnlocked && hasTokenKeluar && !isFinished && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-2xl border-2 border-amber-300 animate-in slide-in-from-bottom-5 duration-300 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                  Notifikasi Ujian
                </span>
                <h4 className="font-extrabold text-sm text-white">
                  Token Keluar Otomatis Terbuka!
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTokenKeluarToast(false)}
              className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-emerald-100 leading-snug">
            Waktu minimal ({tokenKeluarWaktuMenit} menit) telah tercapai. Token Keluar: <strong className="font-mono text-amber-300 font-black tracking-wider text-sm px-1.5 py-0.5 bg-black/20 rounded">{activeQuiz.tokenKeluar}</strong>
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowTokenKeluarToast(false);
                handleRequestSubmit();
              }}
              className="flex-1 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-xs transition-colors shadow-xs text-center cursor-pointer"
            >
              Kumpulkan Ujian Sekarang
            </button>
            <button
              type="button"
              onClick={() => setShowTokenKeluarToast(false)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition-colors text-center cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen In-App Iframe Modal for Student */}
      {iframeFullscreenId && (() => {
        const fullSoal = quizQuestions.find((s) => s.id === iframeFullscreenId);
        if (!fullSoal || !fullSoal.linkEksternal) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-150">
            <div className="p-3 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-0.5 bg-purple-600 text-white font-black text-[10px] rounded uppercase">
                  {fullSoal.tipe || 'Soal Interaktif'}
                </span>
                <h3 className="font-bold text-xs sm:text-sm truncate text-white">
                  {fullSoal.judulLink || fullSoal.pertanyaan}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const isDone = answers[fullSoal.id] === 'Selesai';
                    handleSelectAnswer(fullSoal.id, isDone ? '' : 'Selesai');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    answers[fullSoal.id] === 'Selesai'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{answers[fullSoal.id] === 'Selesai' ? '✓ Selesai' : 'Tandai Selesai'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIframeFullscreenId(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Kembali ke Soal</span>
                </button>
              </div>
            </div>
            <div className="flex-1 w-full h-full bg-slate-900">
              <iframe
                src={formatQuizEmbedUrl(fullSoal.linkEksternal)}
                title={fullSoal.judulLink || 'Soal Layar Penuh'}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
