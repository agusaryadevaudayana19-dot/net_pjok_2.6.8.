import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  ShieldAlert,
  ArrowLeft,
  FileCheck,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Tugas, SoalTugas } from '../../types';

interface ModalKonfirmasiKumpulTugasProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tugas: Tugas;
  submissionData: {
    isiJawaban?: string;
    jawabanPerSoal?: Record<string, string>;
    uploadedFile?: { name: string; url: string; type: 'image' | 'document' } | null;
    linkVideo?: string;
    catatan?: string;
  };
  isNearDeadline: boolean;
  isUrgent24H: boolean;
  isOverdue: boolean;
  timeRemainingFormatted: string | null;
  formattedDeadline: string;
  isSubmitting?: boolean;
}

export const ModalKonfirmasiKumpulTugas: React.FC<ModalKonfirmasiKumpulTugasProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tugas,
  submissionData,
  isNearDeadline,
  isUrgent24H,
  isOverdue,
  timeRemainingFormatted,
  formattedDeadline,
  isSubmitting = false,
}) => {
  const [isConfirmedChecked, setIsConfirmedChecked] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);

  if (!isOpen) return null;

  // Calculate filled questions if any
  const totalQuestions = tugas.daftarSoal?.length || 0;
  let answeredQuestionsCount = 0;
  if (totalQuestions > 0 && submissionData.jawabanPerSoal) {
    tugas.daftarSoal?.forEach((soal, idx) => {
      const ans =
        submissionData.jawabanPerSoal?.[soal.id] ||
        submissionData.jawabanPerSoal?.[String(idx + 1)] ||
        '';
      if (ans.trim().length > 0) {
        answeredQuestionsCount++;
      }
    });
  }

  const hasDirectTextAnswer =
    Boolean(submissionData.isiJawaban && submissionData.isiJawaban.trim().length > 0) ||
    answeredQuestionsCount > 0;

  const hasFile = Boolean(submissionData.uploadedFile);
  const hasVideo = Boolean(submissionData.linkVideo && submissionData.linkVideo.trim().length > 0);
  const hasNotes = Boolean(submissionData.catatan && submissionData.catatan.trim().length > 0);

  return (
    <div
      id="modal-konfirmasi-kumpul-tugas"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Urgency Palette */}
        <div
          className={`p-5 sm:p-6 border-b flex items-start justify-between gap-3 text-white ${
            isOverdue
              ? 'bg-gradient-to-r from-rose-700 to-rose-900 border-rose-800'
              : isUrgent24H
              ? 'bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 border-rose-700'
              : isNearDeadline
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-700'
              : 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-800'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                isOverdue || isUrgent24H
                  ? 'bg-white/20 text-white animate-pulse'
                  : 'bg-white/20 text-white'
              }`}
            >
              {isOverdue ? (
                <AlertCircle className="w-6 h-6" />
              ) : isNearDeadline ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-black/25 text-white border border-white/20">
                  {isOverdue
                    ? 'Tenggat Waktu Lewat'
                    : isUrgent24H
                    ? 'Tenggat Kritis (< 24 Jam)'
                    : isNearDeadline
                    ? 'Mendekati Batas Akhir'
                    : 'Konfirmasi Pengumpulan'}
                </span>
                <span className="text-[11px] font-semibold text-white/90">
                  Pencegahan Salah Kirim
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                Konfirmasi Sebelum Pengumpulan Tugas
              </h3>
              <p className="text-xs text-white/85 mt-1 leading-relaxed">
                {isNearDeadline || isOverdue
                  ? 'Tugas ini mendekati batas akhir. Saat terburu-buru rentan salah memilih file atau jawaban tertukar. Mohon periksa kembali rincian di bawah ini.'
                  : 'Pastikan file lampiran dan jawaban yang Anda kumpulkan sudah benar sebelum dikirimkan ke guru.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer shrink-0"
            title="Tutup konfirmasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-xs">
          {/* Deadline Countdown Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isOverdue
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : isUrgent24H
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : isNearDeadline
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock
                className={`w-5 h-5 shrink-0 ${
                  isOverdue ? 'text-rose-600' : isNearDeadline ? 'text-amber-600' : 'text-slate-500'
                }`}
              />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Batas Waktu Pengumpulan (Deadline)
                </div>
                <div className="text-xs font-black">
                  {formattedDeadline}{' '}
                  {timeRemainingFormatted && (
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        isOverdue
                          ? 'bg-rose-600 text-white'
                          : isUrgent24H
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {timeRemainingFormatted}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tugas Info */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Tugas Yang Dikumpulkan
            </span>
            <div className="font-black text-sm text-slate-900">{tugas.judul}</div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                Kategori: {tugas.kategori || 'PJOK'}
              </span>
              {tugas.guruNama && (
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  Guru: {tugas.guruNama}
                </span>
              )}
            </div>
          </div>

          {/* Pre-Flight Checklist: Items that will be submitted */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Pemeriksaan Berkas & Jawaban Yang Dikirim
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">Verifikasi Mandiri</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {/* 1. Berkas / File Lampiran */}
              <div className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      hasFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {submissionData.uploadedFile?.type === 'image' ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Berkas / Dokumen Lampiran
                    </div>
                    {hasFile ? (
                      <div>
                        <p className="font-black text-slate-900 text-xs truncate max-w-xs sm:max-w-sm">
                          {submissionData.uploadedFile?.name}
                        </p>
                        <span className="inline-block text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                          ✓ Berkas terlampir dan siap terkirim
                        </span>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">
                        Tidak ada berkas file foto/PDF yang dilampirkan
                      </p>
                    )}
                  </div>
                </div>

                {hasFile && submissionData.uploadedFile?.url && (
                  <button
                    type="button"
                    onClick={() => setShowFilePreview(!showFilePreview)}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {showFilePreview ? 'Tutup Pratinjau' : 'Lihat Pratinjau'}
                  </button>
                )}
              </div>

              {/* Quick Image Preview if toggled */}
              {showFilePreview && hasFile && submissionData.uploadedFile?.type === 'image' && (
                <div className="p-3 bg-slate-100/70 text-center border-t border-slate-200">
                  <img
                    src={submissionData.uploadedFile.url}
                    alt="Pratinjau Berkas"
                    referrerPolicy="no-referrer"
                    className="max-h-48 mx-auto rounded-xl border border-slate-300 object-contain shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Pratinjau Foto Tugas yang akan dikirim
                  </span>
                </div>
              )}

              {/* 2. Jawaban Soal Uraian Mandiri */}
              <div className="p-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    hasDirectTextAnswer
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    Jawaban Tertulis / Analisis Gerak
                  </div>
                  {totalQuestions > 0 ? (
                    <div>
                      <span
                        className={`inline-block text-[11px] font-black px-2 py-0.5 rounded-md ${
                          answeredQuestionsCount === totalQuestions
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {answeredQuestionsCount} dari {totalQuestions} Butir Soal Terisi
                      </span>
                      {answeredQuestionsCount < totalQuestions && (
                        <p className="text-[11px] text-amber-700 font-bold mt-1">
                          Perhatian: Ada {totalQuestions - answeredQuestionsCount} butir soal yang
                          belum dijawab!
                        </p>
                      )}
                    </div>
                  ) : submissionData.isiJawaban && submissionData.isiJawaban.trim().length > 0 ? (
                    <div>
                      <p className="text-slate-800 font-medium line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
                        "{submissionData.isiJawaban.slice(0, 120)}
                        {submissionData.isiJawaban.length > 120 ? '...' : ''}"
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        {submissionData.isiJawaban.length} Karakter •{' '}
                        {submissionData.isiJawaban.trim().split(/\s+/).length} Kata
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">
                      Tidak ada jawaban teks langsung
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Link Video (Jika ada) */}
              {hasVideo && (
                <div className="p-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Tautan Video Olahraga
                    </div>
                    <p className="font-semibold text-rose-700 text-xs truncate max-w-xs sm:max-w-md">
                      {submissionData.linkVideo}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Catatan untuk Guru (Jika ada) */}
              {hasNotes && (
                <div className="p-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Catatan Tambahan untuk Guru
                    </div>
                    <p className="text-slate-700 italic text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                      "{submissionData.catatan}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verification Statement Checkbox */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              isConfirmedChecked
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20'
                : 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
            }`}
            onClick={() => setIsConfirmedChecked(!isConfirmedChecked)}
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmedChecked}
                onChange={(e) => setIsConfirmedChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="space-y-1">
                <span className="font-black text-xs text-slate-900 block leading-tight">
                  Saya menyatakan berkas dan jawaban di atas sudah diperiksa dan benar
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Saya sudah memverifikasi bahwa berkas foto/PDF yang diunggah tidak tertukar dengan
                  tugas lain dan seluruh butir jawaban sudah lengkap sebelum tenggat waktu berakhir.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Periksa Kembali (Batal)</span>
          </button>

          <button
            type="button"
            disabled={!isConfirmedChecked || isSubmitting}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-6 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs ${
              isConfirmedChecked && !isSubmitting
                ? isNearDeadline || isOverdue
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan Pengumpulan...</span>
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Kumpulkan Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
