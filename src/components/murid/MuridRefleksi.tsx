import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
  ArrowLeft,
  Calendar,
  UserCheck,
  Star,
} from 'lucide-react';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import {
  JawabanRefleksiMurid,
  RefleksiPembelajaran,
  SoalRefleksi,
  User,
} from '../../types';

interface MuridRefleksiProps {
  db: LMSDatabase;
  currentUser: User;
}

export const MuridRefleksi: React.FC<MuridRefleksiProps> = ({ db, currentUser }) => {
  const [selectedRefleksiId, setSelectedRefleksiId] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<'senang' | 'netral' | 'kesulitan' | 'sangat_senang'>('senang');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // List of reflections targeted for this student's class
  const classRefleksiList = useMemo(() => {
    const studentKelas = (currentUser.kelasId || '').toLowerCase().trim();
    const studentKelasObj = (db.kelas || []).find((k) => k.id === currentUser.kelasId);
    const studentKelasNama = (studentKelasObj?.nama || '').toLowerCase().trim();

    return (db.refleksi || []).filter((r) => {
      // Must not be draft
      if (r.status === 'Draft' || r.statusPublikasi === 'Draft') return false;
      if (!r.kelasId || r.kelasId === 'ALL') return true;
      const rKelas = r.kelasId.toLowerCase().trim();
      return rKelas === studentKelas || (studentKelasNama && rKelas === studentKelasNama);
    });
  }, [db.refleksi, currentUser.kelasId, db.kelas]);

  // Lookup of student's submitted answers
  const mySubmissions = useMemo(() => {
    const map: Record<string, JawabanRefleksiMurid> = {};
    (db.jawabanRefleksi || []).forEach((j) => {
      if (j.muridId === currentUser.id) {
        map[j.refleksiId] = j;
      }
    });
    return map;
  }, [db.jawabanRefleksi, currentUser.id]);

  const activeRefleksi = useMemo(() => {
    return classRefleksiList.find((r) => r.id === selectedRefleksiId);
  }, [classRefleksiList, selectedRefleksiId]);

  const activeSubmission = useMemo(() => {
    if (!selectedRefleksiId) return null;
    return mySubmissions[selectedRefleksiId] || null;
  }, [mySubmissions, selectedRefleksiId]);

  const handleOpenRefleksi = (refleksi: RefleksiPembelajaran) => {
    setSelectedRefleksiId(refleksi.id);
    const existing = mySubmissions[refleksi.id];
    if (existing) {
      setActiveMood(existing.mood);
      const answerMap: Record<string, string | number> = {};
      existing.jawaban.forEach((item) => {
        answerMap[item.soalId] = item.jawaban;
      });
      setAnswers(answerMap);
    } else {
      setActiveMood('senang');
      // Initialize default values for rating scale questions
      const initAnswers: Record<string, string | number> = {};
      refleksi.soalList.forEach((s) => {
        if (s.tipe === 'skala') {
          initAnswers[s.id] = 4;
        } else {
          initAnswers[s.id] = '';
        }
      });
      setAnswers(initAnswers);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRefleksi) return;

    // Validate required questions
    for (const soal of activeRefleksi.soalList) {
      if (soal.wajib) {
        const val = answers[soal.id];
        if (val === undefined || val === null || val === '') {
          alert(`Mohon lengkapi pertanyaan: "${soal.pertanyaan}"`);
          return;
        }
      }
    }

    const payload: JawabanRefleksiMurid = {
      id: activeSubmission?.id || `jawaban-${activeRefleksi.id}-${currentUser.id}`,
      refleksiId: activeRefleksi.id,
      muridId: currentUser.id,
      muridNama: currentUser.name,
      kelasId: currentUser.kelasId || '',
      tanggalDiisi: new Date().toISOString().slice(0, 10),
      mood: activeMood,
      jawaban: activeRefleksi.soalList.map((s) => ({
        soalId: s.id,
        pertanyaan: s.pertanyaan,
        jawaban: answers[s.id] !== undefined ? answers[s.id] : '',
      })),
      catatanGuru: activeSubmission?.catatanGuru,
      tanggalTanggapanGuru: activeSubmission?.tanggalTanggapanGuru,
    };

    dataStorage.submitJawabanRefleksi(payload);
    setToastMessage('Refleksi belajarmu berhasil dikirim ke guru pengampu!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-5 pb-20 sm:pb-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-3">
          <div className="p-3.5 rounded-2xl shadow-xl bg-emerald-600 text-white flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-teal-950 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Refleksi Mandiri Pembelajaran PJOK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Refleksi Belajar Murid
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
              Ungkapkan pemahaman teknik gerak, kebugaran, dan pengalaman belajar kamu. Jawabanmu langsung terbaca oleh guru pengampu untuk bahan evaluasi dan perbaikan.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center sm:text-right shrink-0">
            <span className="text-[10px] text-teal-200 uppercase tracking-wider font-bold block">
              Status Pengisian
            </span>
            <div className="text-lg font-black text-white mt-0.5">
              {Object.keys(mySubmissions).length} / {classRefleksiList.length} Selesai
            </div>
          </div>
        </div>
      </div>

      {/* Active View: List or Form */}
      {!selectedRefleksiId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Daftar Soal Refleksi dari Guru Pengampu
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {classRefleksiList.length} Topik Tersedia
            </span>
          </div>

          {classRefleksiList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-800">
                Belum Ada Soal Refleksi Baru
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Guru pengampu PJOK belum menugaskan kuesioner refleksi untuk kelas kamu. Silakan periksa kembali setelah kegiatan praktik selesai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classRefleksiList.map((refleksi) => {
                const submission = mySubmissions[refleksi.id];
                const isCompleted = !!submission;

                return (
                  <div
                    key={refleksi.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl p-5 border transition shadow-xs hover:shadow-md flex flex-col justify-between gap-4 ${
                      isCompleted ? 'border-emerald-200/90' : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-700">
                          {refleksi.materiJudul || 'PJOK Umum'}
                        </span>

                        {isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Sudah Diisi
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Belum Diisi
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                          {refleksi.judul}
                        </h4>
                        {refleksi.subJudul && (
                          <p className="text-xs text-teal-700 font-bold mt-0.5">
                            {refleksi.subJudul}
                          </p>
                        )}
                      </div>

                      {refleksi.deskripsi && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {refleksi.deskripsi}
                        </p>
                      )}

                      <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-3 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          Guru: {refleksi.guruNama || 'Guru PJOK'}
                        </span>
                        <span>•</span>
                        <span>{refleksi.soalList.length} Butir Pertanyaan</span>
                      </div>

                      {/* Teacher Feedback Preview if exists */}
                      {submission?.catatanGuru && (
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                          <span className="font-bold text-teal-900 flex items-center gap-1 text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                            Apresiasi dari Guru Pengampu:
                          </span>
                          <p className="text-teal-800 italic">"{submission.catatanGuru}"</p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenRefleksi(refleksi)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs'
                      }`}
                    >
                      <span>{isCompleted ? 'Lihat / Edit Jawaban' : 'Mulai Isi Refleksi'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Form View */
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedRefleksiId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Refleksi</span>
          </button>

          {activeRefleksi && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Question card header */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    {activeRefleksi.materiJudul || 'PJOK'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Ditugaskan oleh: {activeRefleksi.guruNama || 'Guru PJOK'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {activeRefleksi.judul}
                  </h3>
                  {activeRefleksi.subJudul && (
                    <p className="text-sm text-teal-700 font-bold mt-1">
                      {activeRefleksi.subJudul}
                    </p>
                  )}
                </div>

                {activeRefleksi.deskripsi && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {activeRefleksi.deskripsi}
                  </p>
                )}

                {/* Teacher Feedback Banner if already commented */}
                {activeSubmission?.catatanGuru && (
                  <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                      <MessageSquare className="w-4 h-4 text-teal-600" />
                      <span>Catatan & Apresiasi Guru Pengampu:</span>
                      {activeSubmission.tanggalTanggapanGuru && (
                        <span className="text-[11px] font-normal text-teal-600">
                          ({activeSubmission.tanggalTanggapanGuru})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-teal-800 italic pl-5">
                      "{activeSubmission.catatanGuru}"
                    </p>
                  </div>
                )}
              </div>

              {/* Mood Selection */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  Bagaimana Perasaan / Pengalaman Belajarmu Hari Ini?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveMood('sangat_senang')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      activeMood === 'sangat_senang'
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-2xl">😃</span>
                    <span className="text-xs font-bold">Sangat Senang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMood('senang')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      activeMood === 'senang'
                        ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-300 text-teal-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-2xl">🙂</span>
                    <span className="text-xs font-bold">Senang / Nyaman</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMood('netral')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      activeMood === 'netral'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-2xl">😐</span>
                    <span className="text-xs font-bold">Biasa Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMood('kesulitan')}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      activeMood === 'kesulitan'
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-2xl">🙁</span>
                    <span className="text-xs font-bold">Ada Kendala</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {activeRefleksi.soalList.map((soal, sIdx) => {
                  return (
                    <div
                      key={soal.id}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                            Pertanyaan #{sIdx + 1}
                          </span>
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {soal.pertanyaan}
                            {soal.wajib && <span className="text-rose-500 ml-1">*</span>}
                          </h4>
                        </div>
                      </div>

                      {/* Scale Question (1-5) */}
                      {soal.tipe === 'skala' && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>1 - Sangat Kurang Paham</span>
                            <span>5 - Sangat Menguasai</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((score) => {
                              const isSelected = answers[soal.id] === score;
                              return (
                                <button
                                  type="button"
                                  key={score}
                                  onClick={() =>
                                    setAnswers((prev) => ({ ...prev, [soal.id]: score }))
                                  }
                                  className={`py-3 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                                    isSelected
                                      ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <span>{score}</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: score }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-2.5 h-2.5 ${
                                          isSelected ? 'fill-amber-300 text-amber-300' : 'text-slate-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Text Question */}
                      {soal.tipe === 'teks' && (
                        <div className="space-y-1.5 pt-1">
                          <textarea
                            rows={3}
                            value={(answers[soal.id] as string) || ''}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [soal.id]: e.target.value }))
                            }
                            placeholder="Tuliskan pengalaman, kendala, atau refleksi jujurmu di sini..."
                            className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-slate-50/50"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefleksiId(null)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Refleksi ke Guru</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
