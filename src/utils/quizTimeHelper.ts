/**
 * Helper utilitas zona waktu WITA (UTC+8) dan sinkronisasi jadwal pengerjaan kuis serentak
 * SMA Negeri 1 Tejakula (SMANSAKA) - Bali
 */

import { Quiz } from '../types';

export interface WitaTimeInfo {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  timeStr: string; // "07:15"
  fullTimeStr: string; // "07:15:30 WITA"
}

/**
 * Mendapatkan waktu terkini dalam zona waktu WITA (Asia/Makassar / UTC+8)
 */
export function getCurrentWitaTime(): WitaTimeInfo {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const s = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(h)}:${pad(m)}`;
  const fullTimeStr = `${pad(h)}:${pad(m)}:${pad(s)} WITA`;

  return {
    hours: h,
    minutes: m,
    seconds: s,
    totalMinutes: h * 60 + m,
    timeStr,
    fullTimeStr,
  };
}

/**
 * Konversi string jam "HH:mm" ke total menit dari tengah malam
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

export type QuizScheduleStatus = 'BEFORE' | 'DURING' | 'AFTER';

export interface QuizScheduleCheckResult {
  status: QuizScheduleStatus;
  jamMulai: string;
  jamSelesai: string;
  zonaWaktu: string;
  durasiMenit: number;
  isInsideWindow: boolean;
  secondsRemainingInWindow: number;
  secondsUntilStart: number;
  label: string;
  badgeClass: string;
  humanMessage: string;
  currentWitaStr: string;
}

/**
 * Evaluasi status jadwal kuis serentak berdasarkan waktu WITA saat ini
 * Default: 07:00 sampai 07:20 WITA (20 menit)
 */
export function evaluateQuizSchedule(quiz: Partial<Quiz>): QuizScheduleCheckResult {
  const jamMulai = quiz.jamMulai || '07:00';
  const jamSelesai = quiz.jamSelesai || '07:20';
  const zonaWaktu = quiz.zonaWaktu || 'WITA';
  const durasiMenit = quiz.durasiMenit || 20;

  const startMinutes = parseTimeToMinutes(jamMulai);
  const endMinutes = parseTimeToMinutes(jamSelesai);

  const currentWita = getCurrentWitaTime();
  const currentTotalSeconds = currentWita.hours * 3600 + currentWita.minutes * 60 + currentWita.seconds;
  const startTotalSeconds = startMinutes * 60;
  const endTotalSeconds = endMinutes * 60;

  if (currentTotalSeconds < startTotalSeconds) {
    const diffSec = startTotalSeconds - currentTotalSeconds;
    const diffMin = Math.ceil(diffSec / 60);
    return {
      status: 'BEFORE',
      jamMulai,
      jamSelesai,
      zonaWaktu,
      durasiMenit,
      isInsideWindow: false,
      secondsRemainingInWindow: 0,
      secondsUntilStart: diffSec,
      label: `Belum Dibuka (Mulai pukul ${jamMulai} ${zonaWaktu})`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      humanMessage: `Sesi dimulai sekitar ${diffMin} menit lagi`,
      currentWitaStr: currentWita.fullTimeStr,
    };
  }

  if (currentTotalSeconds >= startTotalSeconds && currentTotalSeconds < endTotalSeconds) {
    const remainingSec = endTotalSeconds - currentTotalSeconds;
    const remMin = Math.floor(remainingSec / 60);
    return {
      status: 'DURING',
      jamMulai,
      jamSelesai,
      zonaWaktu,
      durasiMenit,
      isInsideWindow: true,
      secondsRemainingInWindow: remainingSec,
      secondsUntilStart: 0,
      label: `Sedang Berlangsung (${jamMulai} - ${jamSelesai} ${zonaWaktu})`,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse',
      humanMessage: `Sisa waktu serentak: ${remMin} menit`,
      currentWitaStr: currentWita.fullTimeStr,
    };
  }

  const passedSec = currentTotalSeconds - endTotalSeconds;
  const passedMin = Math.floor(passedSec / 60);
  return {
    status: 'AFTER',
    jamMulai,
    jamSelesai,
    zonaWaktu,
    durasiMenit,
    isInsideWindow: false,
    secondsRemainingInWindow: 0,
    secondsUntilStart: 0,
    label: `Sesi Serentak Telah Selesai (${jamSelesai} ${zonaWaktu})`,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    humanMessage: `Sesi selesai ${passedMin > 0 ? `${passedMin} menit yang lalu` : 'baru saja'}`,
    currentWitaStr: currentWita.fullTimeStr,
  };
}
