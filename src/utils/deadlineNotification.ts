import { User, Tugas, Quiz, NotifikasiItem } from '../types';
import { LMSDatabase, dataStorage } from '../services/dataStorage';

export interface DeadlineAlertItem {
  id: string; // e.g. "tugas-tug-1" or "quiz-qz-1"
  tipe: 'tugas' | 'quiz';
  targetId: string;
  judul: string;
  kategori?: string;
  materiJudul?: string;
  deadlineRaw: string;
  deadlineDate: Date;
  diffMs: number;
  diffHours: number;
  diffMinutes: number;
  isExpiringIn24Hours: boolean; // true if 0 < diffMs <= 24 * 60 * 60 * 1000
  isOverdue: boolean; // true if diffMs <= 0
  timeRemainingFormatted: string;
  formattedDeadline: string;
  urgencyLevel: 'CRITICAL' | 'WARNING' | 'OVERDUE';
}

/**
 * Safely parse deadline string into Date object.
 * Supports: "YYYY-MM-DD HH:mm", "YYYY-MM-DDTHH:mm", "YYYY-MM-DD", etc.
 */
export function parseDeadlineToDate(deadlineStr?: string | null): Date | null {
  if (!deadlineStr || typeof deadlineStr !== 'string') return null;
  const trimmed = deadlineStr.trim();
  if (!trimmed) return null;

  // If format is "YYYY-MM-DD HH:mm" or "YYYY-MM-DD HH:mm:ss"
  const normalized = trimmed.includes(' ') && !trimmed.includes('T')
    ? trimmed.replace(' ', 'T')
    : trimmed;

  const parsed = new Date(normalized);
  if (isNaN(parsed.getTime())) {
    // Try fallback for date only "YYYY-MM-DD"
    const parts = trimmed.split(/[-/ :T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 23;
      const min = parts[4] ? parseInt(parts[4], 10) : 59;
      return new Date(year, month, day, hour, min, 59);
    }
    return null;
  }
  return parsed;
}

/**
 * Format remaining milliseconds into Indonesian friendly string
 */
export function formatTimeRemaining(diffMs: number): string {
  if (diffMs <= 0) {
    const overdueMins = Math.floor(Math.abs(diffMs) / (60 * 1000));
    if (overdueMins < 60) return `Terlambat ${overdueMins} menit`;
    const overdueHours = Math.floor(overdueMins / 60);
    return `Terlambat ${overdueHours} jam`;
  }

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} menit lagi!`;
  }
  if (minutes === 0) {
    return `${hours} jam lagi`;
  }
  return `${hours} jam ${minutes} menit lagi`;
}

/**
 * Format full Indonesian date time
 */
export function formatDeadlineIndo(date: Date): string {
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WITA';
}

/**
 * Check if a task or quiz is assigned to the student's class
 */
export function isAssignedToStudent(
  itemKelasIds?: string[],
  itemKelasId?: string,
  studentKelasId?: string
): boolean {
  if (!studentKelasId) return true;
  if (Array.isArray(itemKelasIds) && itemKelasIds.length > 0) {
    return itemKelasIds.includes(studentKelasId) || itemKelasIds.includes('ALL');
  }
  if (itemKelasId) {
    return itemKelasId === studentKelasId || itemKelasId === 'ALL';
  }
  return true;
}

/**
 * Inspects all tasks and quizzes and returns those that have deadlines
 * ending within 24 hours and have NOT been submitted by the student.
 */
export function getStudentUrgentDeadlines(
  db: LMSDatabase,
  currentUser: User
): DeadlineAlertItem[] {
  if (currentUser.role !== 'MURID') return [];

  const now = new Date();
  const nowMs = now.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const studentKelasId = currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '';

  const alerts: DeadlineAlertItem[] = [];

  // 1. Check Tugas
  const mySubmissions = db.pengumpulanTugas || [];
  const submittedTugasIds = new Set(
    mySubmissions
      .filter((p) => p.muridId === currentUser.id && (
        p.status === 'Sudah Dikumpulkan' ||
        p.status === 'Dinilai' ||
        p.status === 'Dikumpulkan' ||
        Boolean(p.tanggalKumpul)
      ))
      .map((p) => p.tugasId)
  );

  (db.tugas || []).forEach((t: Tugas) => {
    // Check status
    const isPublished = t.status === 'Publish' || t.status === 'Aktif' || t.statusPublikasi === 'Publish';
    if (!isPublished) return;

    // Check class assignment
    if (!isAssignedToStudent(t.kelasIds, t.kelasId, studentKelasId)) return;

    // Check if already completed
    if (submittedTugasIds.has(t.id)) return;

    // Check deadline
    const deadlineDate = parseDeadlineToDate(t.deadline);
    if (!deadlineDate) return;

    const diffMs = deadlineDate.getTime() - nowMs;
    const isExpiringIn24Hours = diffMs > 0 && diffMs <= ONE_DAY_MS;
    const isOverdue = diffMs <= 0 && Math.abs(diffMs) <= 12 * 60 * 60 * 1000; // within 12 hours overdue

    if (isExpiringIn24Hours || isOverdue) {
      const diffMinutes = Math.floor(Math.abs(diffMs) / (60 * 1000));
      const diffHours = Math.floor(diffMinutes / 60);

      alerts.push({
        id: `tugas-${t.id}`,
        tipe: 'tugas',
        targetId: t.id,
        judul: t.judul,
        kategori: t.kategori || 'Tugas PJOK',
        materiJudul: t.materiJudul,
        deadlineRaw: t.deadline,
        deadlineDate,
        diffMs,
        diffHours,
        diffMinutes,
        isExpiringIn24Hours,
        isOverdue,
        timeRemainingFormatted: formatTimeRemaining(diffMs),
        formattedDeadline: formatDeadlineIndo(deadlineDate),
        urgencyLevel: isOverdue ? 'OVERDUE' : diffHours < 6 ? 'CRITICAL' : 'WARNING',
      });
    }
  });

  // 2. Check Quiz
  const myQuizAnswers = db.jawabanQuiz || [];
  const completedQuizIds = new Set(
    myQuizAnswers
      .filter((j) => j.muridId === currentUser.id)
      .map((j) => j.quizId)
  );

  (db.quiz || []).forEach((q: Quiz) => {
    // Check status
    if (q.status === 'Draft' || q.statusPublikasi === 'Draft' || q.status === 'Arsip') return;

    // Check class assignment
    if (!isAssignedToStudent(q.kelasIds, q.kelasId, studentKelasId)) return;

    // Check if already completed
    if (completedQuizIds.has(q.id)) return;

    // Check deadline (batasWaktu or selesai or deadline)
    const deadlineStr = q.batasWaktu || q.selesai || (q as any).deadline;
    const deadlineDate = parseDeadlineToDate(deadlineStr);
    if (!deadlineDate) return;

    const diffMs = deadlineDate.getTime() - nowMs;
    const isExpiringIn24Hours = diffMs > 0 && diffMs <= ONE_DAY_MS;
    const isOverdue = diffMs <= 0 && Math.abs(diffMs) <= 12 * 60 * 60 * 1000;

    if (isExpiringIn24Hours || isOverdue) {
      const diffMinutes = Math.floor(Math.abs(diffMs) / (60 * 1000));
      const diffHours = Math.floor(diffMinutes / 60);

      alerts.push({
        id: `quiz-${q.id}`,
        tipe: 'quiz',
        targetId: q.id,
        judul: q.judul,
        kategori: 'Kuis PJOK',
        materiJudul: q.materiJudul,
        deadlineRaw: deadlineStr,
        deadlineDate,
        diffMs,
        diffHours,
        diffMinutes,
        isExpiringIn24Hours,
        isOverdue,
        timeRemainingFormatted: formatTimeRemaining(diffMs),
        formattedDeadline: formatDeadlineIndo(deadlineDate),
        urgencyLevel: isOverdue ? 'OVERDUE' : diffHours < 6 ? 'CRITICAL' : 'WARNING',
      });
    }
  });

  // Sort: most urgent first (smallest diffMs)
  return alerts.sort((a, b) => a.diffMs - b.diffMs);
}

/**
 * Synchronize urgent deadline notifications into db.notifikasi
 * so that persistent notification logs and badges are stored.
 */
export function syncStudentDeadlineNotifications(currentUser: User): void {
  if (currentUser.role !== 'MURID') return;

  const currentDb = dataStorage.getDatabase();
  const urgentAlerts = getStudentUrgentDeadlines(currentDb, currentUser);
  if (urgentAlerts.length === 0) return;

  const existingNotifs = currentDb.notifikasi || [];
  const existingIds = new Set(existingNotifs.map((n) => n.id));

  const newNotifItems: NotifikasiItem[] = [];

  urgentAlerts.forEach((alert) => {
    const notifId = `notif-dl-${currentUser.id}-${alert.targetId}`;
    if (!existingIds.has(notifId)) {
      const labelTipe = alert.tipe === 'tugas' ? 'Tugas' : 'Kuis';
      newNotifItems.push({
        id: notifId,
        judul: `⚠️ Batas Waktu < 24 Jam: ${alert.judul}`,
        pesan: `Peringatan: ${labelTipe} "${alert.judul}" akan berakhir dalam ${alert.timeRemainingFormatted} (${alert.formattedDeadline}). Segera selesaikan sebelum tenggat ditutup!`,
        waktu: alert.timeRemainingFormatted,
        tipe: alert.tipe,
        dibaca: false,
        targetRole: 'MURID',
        targetMuridId: currentUser.id,
        targetId: alert.targetId,
        isUrgentDeadline: true,
      });
    }
  });

  if (newNotifItems.length > 0) {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      notifikasi: [...newNotifItems, ...(prev.notifikasi || [])],
    }));
  }
}

/**
 * Subtle in-app alert chime using Web Audio API (safe, no external sound file required)
 */
export function playDeadlineAlertChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);

    // Second tone slightly higher
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context may be restricted before user gesture, silent catch
  }
}
