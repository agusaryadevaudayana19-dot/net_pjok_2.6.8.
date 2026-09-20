import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Video,
  ExternalLink,
  MessageSquare,
  Award,
  X,
  Lock,
  ShieldAlert,
  Image,
  FileUp,
  Trash2,
  ListOrdered,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Tugas, PengumpulanTugas, User } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { InAppMediaModal } from '../shared/InAppMediaModal';
import { parseDeadlineToDate, formatTimeRemaining } from '../../utils/deadlineNotification';

interface MuridTugasProps {
  db: LMSDatabase;
  currentUser: User;
  initialTugasId?: string;
  onClearParam?: () => void;
}

export const MuridTugas: React.FC<MuridTugasProps> = ({ db, currentUser, initialTugasId, onClearParam }) => {
  const [filterStatus, setFilterStatus] = useState<'semua' | 'belum' | 'dikumpulkan' | 'dinilai'>(
    'semua'
  );
  const [activeUploadTugas, setActiveUploadTugas] = useState<Tugas | null>(null);

  const openedInitialIdRef = React.useRef<string | null>(null);
  const dismissedInitialIdRef = React.useRef<string | null>(null);

  const handleCloseModal = () => {
    if (initialTugasId) {
      dismissedInitialIdRef.current = initialTugasId;
    }
    setActiveUploadTugas(null);
    if (onClearParam) {
      onClearParam();
    }
  };

  // Keyboard Escape listener to close upload modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeUploadTugas) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeUploadTugas, initialTugasId]);

  // In-app media viewer
  const [mediaModal, setMediaModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Form submission states
  const [isiJawaban, setIsiJawaban] = useState('');
  const [jawabanPerSoal, setJawabanPerSoal] = useState<Record<string, string>>({});
  const [linkVideo, setLinkVideo] = useState('');
  const [linkDokumen, setLinkDokumen] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [catatan, setCatatan] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);

  const mySubmissions = db.pengumpulanTugas.filter((p) => p.muridId === currentUser.id);

  const getTugasStatus = (tugasId: string) => {
    const submission = mySubmissions.find((p) => p.tugasId === tugasId);
    if (!submission) return 'belum';
    if (submission.nilai !== undefined && submission.nilai !== null) return 'dinilai';
    return 'dikumpulkan';
  };

  const filteredTugas = db.tugas.filter((t) => {
    if (t.status === 'Draft' || t.statusPublikasi === 'Draft') return false;
    if (t.status !== 'Publish' && t.status !== 'Aktif' && t.statusPublikasi !== 'Publish') return false;
    const st = getTugasStatus(t.id);
    if (filterStatus === 'semua') return true;
    return st === filterStatus;
  });

  const handleOpenUpload = (tugas: Tugas) => {
    const existing = mySubmissions.find((p) => p.tugasId === tugas.id);
    setActiveUploadTugas(tugas);
    setPasteWarning(false);
    if (existing) {
      setIsiJawaban(existing.isiJawaban || '');
      setJawabanPerSoal(existing.jawabanPerSoal || {});
      setLinkVideo(existing.linkVideo || '');
      setLinkDokumen(existing.fileUrl || '');
      setCatatan(existing.catatanMurid || existing.catatanSiswa || '');
      if (existing.fileUrl) {
        setUploadedFile({
          name: existing.namaFile || 'Berkas Lampiran Tugas',
          url: existing.fileUrl,
          type: existing.fileUrl.startsWith('data:image') ? 'image' : 'document',
        });
      } else {
        setUploadedFile(null);
      }
    } else {
      setIsiJawaban('');
      setJawabanPerSoal({});
      setLinkVideo('');
      setLinkDokumen('');
      setCatatan('');
      setUploadedFile(null);
    }
  };

  // Auto-open upload submission modal if initialTugasId is provided via notification
  useEffect(() => {
    if (initialTugasId && db.tugas.length > 0) {
      if (
        dismissedInitialIdRef.current === initialTugasId ||
        openedInitialIdRef.current === initialTugasId
      ) {
        return;
      }
      const found = db.tugas.find((t) => t.id === initialTugasId);
      if (found) {
        openedInitialIdRef.current = initialTugasId;
        handleOpenUpload(found);
      }
    }
  }, [initialTugasId, db.tugas]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran berkas maksimal 15MB. Untuk video berdurasi panjang, silakan sertakan tautan Google Drive / YouTube.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedFile({
        name: file.name,
        url: dataUrl,
        type: file.type.startsWith('image/') ? 'image' : 'document',
      });
      setLinkDokumen(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUploadTugas) return;

    const existing = mySubmissions.find((p) => p.tugasId === activeUploadTugas.id);

    // Combine answers for backward compatibility and overview
    let combinedJawaban = isiJawaban.trim();
    if (activeUploadTugas.daftarSoal && activeUploadTugas.daftarSoal.length > 0) {
      combinedJawaban = activeUploadTugas.daftarSoal
        .map((s, idx) => {
          const ans = jawabanPerSoal[s.id] || jawabanPerSoal[String(idx + 1)] || '';
          return `[Soal #${idx + 1}: ${s.pertanyaan}]\nJawaban: ${ans}`;
        })
        .join('\n\n');
    }

    const submissionData: PengumpulanTugas = {
      id: existing ? existing.id : `sub-${currentUser.id}-${activeUploadTugas.id}`,
      tugasId: activeUploadTugas.id,
      tugasJudul: activeUploadTugas.judul,
      muridId: currentUser.id,
      muridNama: currentUser.name,
      kelasId: currentUser.kelasId,
      isiJawaban: combinedJawaban || undefined,
      jawabanPerSoal: jawabanPerSoal,
      linkVideo: linkVideo.trim() || undefined,
      fileUrl: uploadedFile?.url || linkDokumen.trim() || undefined,
      namaFile: uploadedFile?.name || undefined,
      catatanMurid: catatan.trim(),
      catatanSiswa: catatan.trim(),
      tanggalKumpul: new Date().toISOString().slice(0, 10),
      status: 'Dikumpulkan',
      nilai: existing?.nilai,
      catatanGuru: existing?.catatanGuru,
    };

    dataStorage.updateDatabase((prev) => {
      const otherSubs = prev.pengumpulanTugas.filter(
        (p) => !(p.tugasId === activeUploadTugas.id && p.muridId === currentUser.id)
      );
      return {
        ...prev,
        pengumpulanTugas: [...otherSubs, submissionData],
      };
    });

    alert('Tugas berhasil dikumpulkan dan tersimpan!');
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Tugas PJOK Saya</h2>
          <p className="text-xs text-slate-500">
            Daftar penugasan gerak praktik, tugas teori, dan unggah video pembelajaran
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
          {[
            { key: 'semua', label: 'Semua Tugas' },
            { key: 'belum', label: 'Belum Dikerjakan' },
            { key: 'dikumpulkan', label: 'Sudah Dikumpulkan' },
            { key: 'dinilai', label: 'Sudah Dinilai' },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilterStatus(btn.key as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                filterStatus === btn.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tugas Cards List */}
      <div className="space-y-4">
        {filteredTugas.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            Tidak ada tugas dengan filter ini.
          </div>
        ) : (
          filteredTugas.map((t) => {
            const submission = mySubmissions.find((p) => p.tugasId === t.id);
            const status = getTugasStatus(t.id);
            const deadlineDate = parseDeadlineToDate(t.deadline);
            const isUrgent24H =
              deadlineDate &&
              status === 'belum' &&
              deadlineDate.getTime() - Date.now() > 0 &&
              deadlineDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000;
            const timeRemainingText = isUrgent24H
              ? formatTimeRemaining(Math.max(0, deadlineDate.getTime() - Date.now()))
              : null;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl p-5 border transition-all space-y-4 ${
                  isUrgent24H
                    ? 'border-rose-300 shadow-md ring-1 ring-rose-300/60'
                    : 'border-slate-200/80 shadow-xs hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[10px] font-bold">
                        {t.kategori}
                      </span>
                      {isUrgent24H && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-black flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Tenggat &lt; 24 Jam (Sisa {timeRemainingText})
                        </span>
                      )}
                      {t.jenisPengumpulan === 'JAWAB_LANGSUNG' ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600" /> Menjawab Langsung
                        </span>
                      ) : t.jenisPengumpulan === 'UPLOAD_FILE' ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[10px] font-bold flex items-center gap-1">
                          <Upload className="w-3 h-3 text-purple-600" /> Upload Berkas/Foto/PDF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Menjawab & Upload
                        </span>
                      )}
                      {t.daftarSoal && t.daftarSoal.length > 0 && (
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[10px] font-bold flex items-center gap-1">
                          <ListOrdered className="w-3 h-3 text-sky-600" /> {t.daftarSoal.length} Butir Soal
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: {new Date(t.deadline).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-800">{t.judul}</h3>
                    {t.subJudul && (
                      <p className="text-xs text-emerald-700 font-bold mt-0.5">{t.subJudul}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.instruksi}</p>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status === 'dinilai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'dikumpulkan'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {status === 'dinilai'
                        ? 'Sudah Dinilai'
                        : status === 'dikumpulkan'
                        ? 'Sudah Dikumpulkan'
                        : 'Belum Dikerjakan'}
                    </span>

                    <button
                      onClick={() => handleOpenUpload(t)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      {submission ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}
                    </button>
                  </div>
                </div>

                {/* Submission & Teacher Grade View */}
                {submission && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* What student submitted */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <span className="font-bold text-slate-700 uppercase tracking-wider block text-[10px]">
                        Data Pengumpulan Anda:
                      </span>

                      {/* Jawaban Langsung */}
                      {t.daftarSoal && t.daftarSoal.length > 0 ? (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <ListOrdered className="w-3.5 h-3.5 text-emerald-600" /> Jawaban per Butir Soal:
                          </span>
                          <div className="space-y-2">
                            {t.daftarSoal.map((soal, sIdx) => {
                              const ans =
                                submission.jawabanPerSoal?.[soal.id] ||
                                submission.jawabanPerSoal?.[String(sIdx + 1)] ||
                                '';
                              return (
                                <div key={soal.id || sIdx} className="p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                                  <div className="font-extrabold text-[11px] text-slate-700">
                                    Soal #{sIdx + 1}: {soal.pertanyaan}
                                  </div>
                                  <div className="text-slate-900 font-medium pl-2 border-l-2 border-emerald-500 whitespace-pre-wrap">
                                    {ans || <span className="text-slate-400 italic font-normal">Belum dijawab</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : submission.isiJawaban ? (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <FileText className="w-3 h-3 text-emerald-600" /> Jawaban Anda:
                          </span>
                          <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                            {submission.isiJawaban}
                          </p>
                        </div>
                      ) : null}

                      {submission.linkVideo && (
                        <button
                          type="button"
                          onClick={() =>
                            setMediaModal({
                              isOpen: true,
                              url: submission.linkVideo!,
                              title: `Video Tugas: ${t.judul}`,
                              category: 'Video Tugas Murid',
                            })
                          }
                          className="text-rose-600 hover:underline flex items-center gap-1 font-semibold truncate text-left"
                          title="Tonton Video di Aplikasi"
                        >
                          <Video className="w-3.5 h-3.5 shrink-0" />
                          <span>Lihat Video: {submission.linkVideo}</span>
                        </button>
                      )}
                      {submission.fileUrl && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMediaModal({
                                isOpen: true,
                                url: submission.fileUrl!,
                                title: `Berkas Tugas: ${t.judul}`,
                                category: 'Dokumen / Foto Praktik',
                              })
                            }
                            className="px-2.5 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>Buka Berkas ({submission.namaFile || 'Lampiran'})</span>
                          </button>
                        </div>
                      )}
                      {(submission.catatanMurid || submission.catatanSiswa) && (
                        <p className="text-slate-600 text-[11px] italic">
                          Catatan: "{submission.catatanMurid || submission.catatanSiswa}"
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block">
                        Dikumpulkan: {submission.tanggalKumpul}
                      </span>
                    </div>

                    {/* Teacher Feedback / Grade */}
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
                          Koreksi & Nilai Guru:
                        </span>
                        {submission.nilai !== undefined && (
                          <span className="text-lg font-black text-emerald-700">
                            Skor: {submission.nilai}
                          </span>
                        )}
                      </div>

                      {submission.catatanGuru ? (
                        <p className="text-emerald-800 text-[11px] leading-relaxed">
                          {submission.catatanGuru}
                        </p>
                      ) : (
                        <p className="text-slate-400 text-[11px] italic">
                          Menunggu evaluasi dan koreksi dari guru pengampu.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Upload Submission Modal */}
      {activeUploadTugas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup lembar tugas"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-full">
                Lembar Pengumpulan Tugas PJOK
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                {activeUploadTugas.judul}
              </h3>
              <p className="text-xs text-slate-500">{activeUploadTugas.instruksi}</p>
            </div>

            <form onSubmit={handleSaveSubmission} className="space-y-4 text-xs">
              {/* Bagian 1: Menjawab Langsung (Dengan Anti Copy-Paste) */}
              {(activeUploadTugas.jenisPengumpulan === 'JAWAB_LANGSUNG' ||
                activeUploadTugas.jenisPengumpulan === 'KEDUANYA' ||
                !activeUploadTugas.jenisPengumpulan ||
                activeUploadTugas.jenisPengumpulan === 'Teks') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Jawaban Langsung (Analisis & Uraian Mandiri) *
                    </label>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-extrabold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-700" /> Anti Copy-Paste
                    </span>
                  </div>

                  {/* Warning Pop-up if user tried to paste */}
                  {pasteWarning && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-pulse">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Peringatan: Tindakan Salin/Tempel (Copy-Paste) dinonaktifkan! Mohon ketikkan jawaban Anda secara mandiri untuk melatih pemahaman dan orisinalitas gerak.
                      </span>
                    </div>
                  )}

                  {/* Render questions list if daftarSoal exists */}
                  {activeUploadTugas.daftarSoal && activeUploadTugas.daftarSoal.length > 0 ? (
                    <div className="space-y-3">
                      {activeUploadTugas.daftarSoal.map((soal, sIdx) => {
                        const curAnswer =
                          jawabanPerSoal[soal.id] ||
                          jawabanPerSoal[String(sIdx + 1)] ||
                          '';

                        return (
                          <div
                            key={soal.id || sIdx}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 font-extrabold text-[11px] rounded-md">
                                Soal #{sIdx + 1}
                              </span>
                              {soal.petunjuk && (
                                <span className="text-[10px] text-slate-500 italic bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {soal.petunjuk}
                                </span>
                              )}
                            </div>

                            <div className="font-bold text-slate-800 text-xs leading-relaxed">
                              {soal.pertanyaan}
                            </div>

                            <div>
                              <textarea
                                rows={3}
                                required={activeUploadTugas.jenisPengumpulan === 'JAWAB_LANGSUNG'}
                                value={curAnswer}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setJawabanPerSoal((prev) => ({
                                    ...prev,
                                    [soal.id]: val,
                                    [String(sIdx + 1)]: val,
                                  }));
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  setPasteWarning(true);
                                  setTimeout(() => setPasteWarning(false), 4500);
                                }}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                                onKeyDown={(e) => {
                                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                                    e.preventDefault();
                                    setPasteWarning(true);
                                    setTimeout(() => setPasteWarning(false), 4500);
                                  }
                                }}
                                placeholder={`Ketikkan jawaban Anda untuk Soal #${sIdx + 1} secara mandiri di sini...`}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 leading-relaxed font-medium"
                              />
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>Ketik mandiri (Anti copy-paste aktif)</span>
                                <span>
                                  {curAnswer.length} Karakter •{' '}
                                  {curAnswer.trim() ? curAnswer.trim().split(/\s+/).length : 0} Kata
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Fallback to single textarea for legacy assignments */
                    <div>
                      <textarea
                        rows={6}
                        required={activeUploadTugas.jenisPengumpulan === 'JAWAB_LANGSUNG'}
                        value={isiJawaban}
                        onChange={(e) => setIsiJawaban(e.target.value)}
                        onPaste={(e) => {
                          e.preventDefault();
                          setPasteWarning(true);
                          setTimeout(() => setPasteWarning(false), 4500);
                        }}
                        onCopy={(e) => e.preventDefault()}
                        onCut={(e) => e.preventDefault()}
                        onContextMenu={(e) => e.preventDefault()}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                            e.preventDefault();
                            setPasteWarning(true);
                            setTimeout(() => setPasteWarning(false), 4500);
                          }
                        }}
                        placeholder="Ketikkan analisis atau jawaban Anda langsung di sini secara mandiri..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 leading-relaxed font-normal"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>Ketik mandiri menggunakan keyboard</span>
                        <span>
                          {isiJawaban.length} Karakter •{' '}
                          {isiJawaban.trim() ? isiJawaban.trim().split(/\s+/).length : 0} Kata
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bagian 2: Upload Tugas Berupa Foto / PDF / Dokumen */}
              {(activeUploadTugas.jenisPengumpulan === 'UPLOAD_FILE' ||
                activeUploadTugas.jenisPengumpulan === 'KEDUANYA' ||
                !activeUploadTugas.jenisPengumpulan ||
                activeUploadTugas.jenisPengumpulan === 'Video/Foto' ||
                activeUploadTugas.jenisPengumpulan === 'Dokumen') && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                      <FileUp className="w-3.5 h-3.5 text-sky-600" />
                      Upload Berkas Tugas (Foto Praktik / Dokumen PDF)
                    </label>

                    {uploadedFile ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            {uploadedFile.type === 'image' ? (
                              <Image className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-emerald-950 truncate">
                              {uploadedFile.name}
                            </p>
                            <span className="text-[10px] text-emerald-700">Berkas siap dikirim</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFile(null);
                            setLinkDokumen('');
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"
                          title="Hapus Berkas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-700">
                          Pilih Foto Praktik atau File PDF
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Mendukung file JPG, PNG, PDF (Maksimal 15MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Link Video Olahraga */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-rose-600" />
                      Link Video Olahraga (YouTube / Google Drive) - Opsional
                    </label>
                    <input
                      type="text"
                      value={linkVideo}
                      onChange={(e) => setLinkVideo(e.target.value)}
                      placeholder="https://youtu.be/... atau https://drive.google.com/file/d/..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Catatan untuk Guru */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Catatan untuk Guru (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Ceritakan kendala atau catatan selama latihan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Kirim Pengumpulan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Media Viewer Modal */}
      <InAppMediaModal
        isOpen={mediaModal.isOpen}
        onClose={() => setMediaModal((prev) => ({ ...prev, isOpen: false }))}
        url={mediaModal.url}
        title={mediaModal.title}
        category={mediaModal.category}
      />
    </div>
  );
};
