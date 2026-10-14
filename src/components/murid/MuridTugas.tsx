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
  Plus,
} from 'lucide-react';
import { Tugas, PengumpulanTugas, BerkasLampiran, User, isItemAssignedToStudentClass } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { InAppMediaModal } from '../shared/InAppMediaModal';
import { parseDeadlineToDate, formatTimeRemaining, formatDeadlineIndo } from '../../utils/deadlineNotification';
import { ModalKonfirmasiKumpulTugas } from './ModalKonfirmasiKumpulTugas';

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
  const uploadModalContainerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeUploadTugas) {
      if (uploadModalContainerRef.current) {
        uploadModalContainerRef.current.scrollTop = 0;
      }
    }
  }, [activeUploadTugas]);

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
  const [links, setLinks] = useState<string[]>(['']);
  const [linkVideo, setLinkVideo] = useState('');
  const [linkDokumen, setLinkDokumen] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ id: string; name: string; url: string; type: string; size?: number }>
  >([]);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string; type: string } | null>(null);
  const [catatan, setCatatan] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);

  // Modal Konfirmasi & Notifikasi Pencegahan Salah Kirim
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccessBanner, setSubmitSuccessBanner] = useState<{
    show: boolean;
    message: string;
    tugasJudul: string;
  } | null>(null);

  const mySubmissions = db.pengumpulanTugas.filter((p) => p.muridId === currentUser.id);

  // Kalkulasi Tenggat Waktu untuk Tugas yang sedang dibuka di lembar pengumpulan
  const activeDeadlinDate = activeUploadTugas
    ? parseDeadlineToDate(activeUploadTugas.deadline)
    : null;
  const activeDiffMs = activeDeadlinDate ? activeDeadlinDate.getTime() - Date.now() : null;
  const isActiveOverdue = activeDiffMs !== null && activeDiffMs <= 0;
  const isActiveUrgent24H =
    activeDiffMs !== null && activeDiffMs > 0 && activeDiffMs <= 24 * 60 * 60 * 1000;
  const isActiveNearDeadline = activeDiffMs !== null && activeDiffMs <= 48 * 60 * 60 * 1000;
  const activeTimeRemaining = activeDeadlinDate
    ? formatTimeRemaining(activeDeadlinDate.getTime() - Date.now())
    : null;
  const formattedActiveDeadline = activeDeadlinDate
    ? formatDeadlineIndo(activeDeadlinDate)
    : activeUploadTugas?.deadline || '-';

  const getTugasStatus = (tugasId: string) => {
    const submission = mySubmissions.find((p) => p.tugasId === tugasId);
    if (!submission) return 'belum';
    if (submission.nilai !== undefined && submission.nilai !== null) return 'dinilai';
    return 'dikumpulkan';
  };

  const filteredTugas = (db.tugas || []).filter((t) => {
    if (t.status === 'Draft' || t.statusPublikasi === 'Draft') return false;
    if (t.status !== 'Publish' && t.status !== 'Aktif' && t.statusPublikasi !== 'Publish') return false;
    // Strict class filter: student only sees tasks explicitly assigned to their class
    if (!isItemAssignedToStudentClass(t, currentUser, db.kelas)) return false;
    const st = getTugasStatus(t.id);
    if (filterStatus === 'semua') return true;
    return st === filterStatus;
  });

  const handleOpenUpload = (tugas: Tugas) => {
    const existing = mySubmissions.find((p) => p.tugasId === tugas.id);
    setActiveUploadTugas(tugas);
    setPasteWarning(false);
    setValidationError(null);
    setIsConfirmModalOpen(false);
    if (existing) {
      setIsiJawaban(existing.isiJawaban || '');
      setJawabanPerSoal(existing.jawabanPerSoal || {});
      setCatatan(existing.catatanMurid || existing.catatanSiswa || '');

      // Load links
      if (Array.isArray(existing.links) && existing.links.length > 0) {
        setLinks(existing.links);
        setLinkVideo(existing.links[0] || '');
      } else if (existing.linkVideo) {
        setLinks([existing.linkVideo]);
        setLinkVideo(existing.linkVideo);
      } else {
        setLinks(['']);
        setLinkVideo('');
      }

      // Load files
      if (Array.isArray(existing.files) && existing.files.length > 0) {
        const mappedFiles = existing.files.map((f, idx) => ({
          id: f.id || `f-${idx}-${Date.now()}`,
          name: f.name,
          url: f.url,
          type: f.type || (f.url.startsWith('data:image') ? 'image' : 'document'),
          size: f.size,
        }));
        setUploadedFiles(mappedFiles);
        setUploadedFile(mappedFiles[0] || null);
        setLinkDokumen(mappedFiles[0]?.url || '');
      } else if (existing.fileUrl) {
        const singleFile = {
          id: `f-legacy-${Date.now()}`,
          name: existing.namaFile || 'Berkas Lampiran Tugas',
          url: existing.fileUrl,
          type: existing.fileUrl.startsWith('data:image') ? 'image' : 'document',
        };
        setUploadedFiles([singleFile]);
        setUploadedFile(singleFile);
        setLinkDokumen(existing.fileUrl);
      } else {
        setUploadedFiles([]);
        setUploadedFile(null);
        setLinkDokumen('');
      }
    } else {
      setIsiJawaban('');
      setJawabanPerSoal({});
      setLinks(['']);
      setLinkVideo('');
      setLinkDokumen('');
      setCatatan('');
      setUploadedFiles([]);
      setUploadedFile(null);
    }
  };

  // Multi-link helpers
  const handleAddLink = () => {
    setLinks((prev) => [...prev, '']);
  };

  const handleLinkChange = (index: number, val: string) => {
    setLinks((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    if (index === 0) {
      setLinkVideo(val);
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const nextLinks = filtered.length > 0 ? filtered : [''];
      setLinkVideo(nextLinks[0] || '');
      return nextLinks;
    });
  };

  // Multi-file upload helpers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    setValidationError(null);

    for (const file of filesArray) {
      if (file.size > 15 * 1024 * 1024) {
        setValidationError(
          `Ukuran berkas "${file.name}" melebihi batas 15MB. Silakan gunakan berkas berukuran lebih kecil atau gunakan tautan Google Drive / YouTube.`
        );
        return;
      }
    }

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newFile = {
          id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          url: dataUrl,
          type: file.type.startsWith('image/') ? 'image' : 'document',
          size: file.size,
        };
        setUploadedFiles((prev) => {
          const next = [...prev, newFile];
          setUploadedFile(next[0] || null);
          setLinkDokumen(next[0]?.url || '');
          return next;
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
      setUploadedFile(filtered[0] || null);
      setLinkDokumen(filtered[0]?.url || '');
      return filtered;
    });
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

  // Tahap 1: Validasi dan Buka Modal Konfirmasi Pengumpulan
  const handleInitiateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUploadTugas) return;
    setValidationError(null);

    const validLinks = links.map((l) => l.trim()).filter(Boolean);
    const hasAnyFile = uploadedFiles.length > 0;
    const hasAnyLink = validLinks.length > 0;

    // Validasi Jawaban Langsung jika jenis tugas mewajibkan
    if (
      activeUploadTugas.jenisPengumpulan === 'JAWAB_LANGSUNG' ||
      activeUploadTugas.jenisPengumpulan === 'Teks'
    ) {
      if (activeUploadTugas.daftarSoal && activeUploadTugas.daftarSoal.length > 0) {
        const hasAnyAnswer = activeUploadTugas.daftarSoal.some((s, idx) => {
          const a = jawabanPerSoal[s.id] || jawabanPerSoal[String(idx + 1)] || '';
          return a.trim().length > 0;
        });
        if (!hasAnyAnswer) {
          setValidationError(
            'Mohon ketikkan jawaban untuk butir pertanyaan tugas mandiri sebelum mengirim.'
          );
          return;
        }
      } else if (!isiJawaban.trim()) {
        setValidationError('Mohon ketikkan analisis jawaban Anda terlebih dahulu sebelum mengirim.');
        return;
      }
    } else if (
      activeUploadTugas.jenisPengumpulan === 'UPLOAD_FILE' ||
      activeUploadTugas.jenisPengumpulan === 'Dokumen' ||
      activeUploadTugas.jenisPengumpulan === 'Video/Foto'
    ) {
      if (!hasAnyFile && !hasAnyLink) {
        setValidationError(
          'Mohon lampirkan minimal 1 foto/gambar praktik, berkas PDF, atau tautan video tugas Anda.'
        );
        return;
      }
    }

    // Seluruh validasi lolos: buka modal konfirmasi khusus pencegahan salah kirim
    setIsConfirmModalOpen(true);
  };

  // Tahap 2: Eksekusi Penyimpanan Pengumpulan Tugas setelah Dikonfirmasi
  const handleConfirmFinalSubmit = () => {
    if (!activeUploadTugas) return;
    setIsSubmitting(true);

    const existing = mySubmissions.find((p) => p.tugasId === activeUploadTugas.id);
    const validLinks = links.map((l) => l.trim()).filter(Boolean);
    const primaryFile = uploadedFiles[0];
    const primaryLink = validLinks[0];

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
      linkVideo: primaryLink || undefined,
      fileUrl: primaryFile?.url || undefined,
      namaFile: primaryFile?.name || undefined,
      files: uploadedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        type: f.type,
        size: f.size,
      })),
      links: validLinks,
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

    const submittedTitle = activeUploadTugas.judul;
    setIsSubmitting(false);
    setIsConfirmModalOpen(false);
    handleCloseModal();

    setSubmitSuccessBanner({
      show: true,
      message: `Tugas "${submittedTitle}" berhasil dikumpulkan dan tersimpan aman. Data telah tercatat pada laporan guru PJOK.`,
      tugasJudul: submittedTitle,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Sukses Pengumpulan Tugas */}
      {submitSuccessBanner?.show && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between gap-3 text-emerald-950 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">Pengumpulan Tugas Berhasil Terkirim</h4>
              <p className="text-xs text-emerald-800">{submitSuccessBanner.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccessBanner(null)}
            className="px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

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

                      {/* Multiple links / single link */}
                      {(() => {
                        const allLinks = Array.isArray(submission.links) && submission.links.length > 0
                          ? submission.links
                          : submission.linkVideo
                          ? [submission.linkVideo]
                          : [];
                        if (allLinks.length === 0) return null;
                        return (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Video className="w-3.5 h-3.5 text-rose-600" /> Tautan Terlampir ({allLinks.length}):
                            </span>
                            {allLinks.map((lnk, lIdx) => (
                              <button
                                key={lIdx}
                                type="button"
                                onClick={() =>
                                  setMediaModal({
                                    isOpen: true,
                                    url: lnk,
                                    title: `Link #${lIdx + 1} - ${t.judul}`,
                                    category: 'Tautan Tugas Murid',
                                  })
                                }
                                className="text-rose-600 hover:underline flex items-center gap-1.5 font-semibold truncate text-left text-xs w-full cursor-pointer"
                                title="Buka tautan di aplikasi"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">#{lIdx + 1}: {lnk}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Multiple files / single file */}
                      {(() => {
                        const allFiles = Array.isArray(submission.files) && submission.files.length > 0
                          ? submission.files
                          : submission.fileUrl
                          ? [{ name: submission.namaFile || 'Berkas Lampiran', url: submission.fileUrl, type: 'document' }]
                          : [];
                        if (allFiles.length === 0) return null;
                        return (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-sky-600" /> Berkas / Foto Praktik ({allFiles.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {allFiles.map((f, fIdx) => (
                                <button
                                  key={fIdx}
                                  type="button"
                                  onClick={() =>
                                    setMediaModal({
                                      isOpen: true,
                                      url: f.url,
                                      title: `${f.name || `Berkas #${fIdx + 1}`} - ${t.judul}`,
                                      category: 'Dokumen / Foto Praktik',
                                    })
                                  }
                                  className="px-2.5 py-1 bg-sky-100 text-sky-800 hover:bg-sky-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {f.type === 'image' || (f.url && f.url.startsWith('data:image')) ? (
                                    <Image className="w-3.5 h-3.5 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="truncate max-w-[140px]">{f.name || `Berkas #${fIdx + 1}`}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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
          ref={uploadModalContainerRef}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            className="min-h-full flex items-start justify-center py-4 sm:py-8"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div
              className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
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

            {/* Notifikasi Khusus Peringatan Tenggat Waktu & Pencegahan Salah Kirim */}
            {(isActiveNearDeadline || isActiveOverdue) && (
              <div
                className={`p-3.5 sm:p-4 rounded-2xl border-2 mb-4 flex items-start gap-3 transition-all ${
                  isActiveOverdue
                    ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-2xs'
                    : isActiveUrgent24H
                    ? 'bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 border-rose-300 text-rose-950 shadow-2xs'
                    : 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isActiveOverdue || isActiveUrgent24H
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs">
                      {isActiveOverdue
                        ? 'Tenggat Waktu Pengumpulan Telah Berakhir'
                        : isActiveUrgent24H
                        ? 'Peringatan Kritis: Batas Akhir Tenggat Waktu (< 24 Jam)!'
                        : 'Peringatan: Tugas Mendekati Batas Akhir (Deadline)!'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${
                        isActiveOverdue || isActiveUrgent24H ? 'bg-rose-600' : 'bg-amber-600'
                      }`}
                    >
                      {activeTimeRemaining || 'Periksa Tenggat'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-700">
                    Batas waktu pengumpulan: <strong>{formattedActiveDeadline}</strong>.
                    Untuk <strong>mencegah salah kirim berkas</strong> atau tertukar tugas karena tergesa-gesa, mohon periksa kembali kesesuaian dokumen atau rekaman gerak sebelum mengirim.
                  </p>
                </div>
              </div>
            )}

            {/* Inline Validation Error Banner */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleInitiateSubmission} className="space-y-4 text-xs">
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-800 uppercase flex items-center gap-1.5 text-xs">
                        <FileUp className="w-3.5 h-3.5 text-sky-600" />
                        Upload Foto Praktik / Dokumen PDF (Boleh Lebih Dari 1)
                      </label>
                      {uploadedFiles.length > 0 && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[10px] font-extrabold">
                          {uploadedFiles.length} Berkas Dipilih
                        </span>
                      )}
                    </div>

                    {uploadedFiles.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                          {uploadedFiles.map((file, fIdx) => (
                            <div
                              key={file.id || fIdx}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden">
                                  {file.type === 'image' || file.url.startsWith('data:image') ? (
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-slate-900 truncate">
                                    {file.name}
                                  </p>
                                  <span className="text-[10px] text-slate-400">
                                    Foto/Berkas #{fIdx + 1}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Hapus foto/berkas ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Tombol Tambahkan Foto / Berkas Tambahan */}
                        <div className="flex items-center justify-between pt-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                            <Plus className="w-3.5 h-3.5 text-sky-600" />
                            <span>+ Tambah Foto / Gambar / Berkas Lagi</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*,application/pdf,.doc,.docx"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Mendukung multi-upload JPG, PNG, PDF
                          </span>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-800">
                          Pilih Foto Praktik atau File PDF (Boleh Lebih Dari 1)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Mendukung memilih sekaligus banyak foto JPG, PNG, atau dokumen PDF (Maks. 15MB/file)
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Link Video / Google Drive (Boleh lebih dari 1 dengan tombol Tambahkan) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 uppercase flex items-center gap-1.5 text-xs">
                        <Video className="w-3.5 h-3.5 text-rose-600" />
                        Tautan Video / Google Drive (Boleh Kirim Lebih Dari 1)
                      </label>
                      {links.filter((l) => l.trim().length > 0).length > 0 && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-full text-[10px] font-extrabold">
                          {links.filter((l) => l.trim().length > 0).length} Tautan
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {links.map((linkVal, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={linkVal}
                              onChange={(e) => handleLinkChange(lIdx, e.target.value)}
                              placeholder={`Link #${lIdx + 1}: https://youtu.be/... atau https://drive.google.com/...`}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          {links.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(lIdx)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                              title="Hapus tautan ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tombol Tambahkan Link Sesuai Permintaan User */}
                    <div>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                        <span>Tambahkan Link Lainnya</span>
                      </button>
                    </div>
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
      </div>
      )}

      {/* Modal Konfirmasi Khusus Pengumpulan Tugas (Pencegahan Salah Kirim) */}
      {activeUploadTugas && (
        <ModalKonfirmasiKumpulTugas
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmFinalSubmit}
          tugas={activeUploadTugas}
          submissionData={{
            isiJawaban,
            jawabanPerSoal,
            uploadedFile,
            linkVideo,
            catatan,
          }}
          isNearDeadline={isActiveNearDeadline}
          isUrgent24H={isActiveUrgent24H}
          isOverdue={isActiveOverdue}
          timeRemainingFormatted={activeTimeRemaining}
          formattedDeadline={formattedActiveDeadline}
          isSubmitting={isSubmitting}
        />
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
