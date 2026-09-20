import React, { useState, useRef } from 'react';
import {
  X,
  Calendar,
  Phone,
  User,
  FileText,
  Upload,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  HelpCircle,
  Activity,
  HeartPulse,
  Award,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';
import { User as UserType, KategoriIzin, PengajuanIzin, NotifikasiItem, PresensiRecord, StatusPresensi } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { processDocumentOrProofImage } from '../../utils/imageHelper';

interface ModalAjukanIzinProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  db: LMSDatabase;
  initialData?: PengajuanIzin | null;
  onSuccess?: () => void;
}

export const ModalAjukanIzin: React.FC<ModalAjukanIzinProps> = ({
  isOpen,
  onClose,
  currentUser,
  db,
  initialData,
  onSuccess,
}) => {
  const [kategori, setKategori] = useState<KategoriIzin>('Sakit');
  const [tanggalMulai, setTanggalMulai] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [namaOrangTua, setNamaOrangTua] = useState<string>('');
  const [noHpOrangTua, setNoHpOrangTua] = useState<string>('');
  const [alasan, setAlasan] = useState<string>('');

  // Upload Surat
  const [suratUrl, setSuratUrl] = useState<string>('');
  const [namaSurat, setNamaSurat] = useState<string>('');
  const [isUploadingSurat, setIsUploadingSurat] = useState<boolean>(false);

  // Upload Foto Bersama Ortu
  const [fotoBersamaUrl, setFotoBersamaUrl] = useState<string>('');
  const [namaFotoBersama, setNamaFotoBersama] = useState<string>('');
  const [isUploadingFotoBersama, setIsUploadingFotoBersama] = useState<boolean>(false);

  // Preview Image Modal & Template Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<'sakit_ortu' | 'izin_ortu' | 'surat_dokter'>('sakit_ortu');
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const suratInputRef = useRef<HTMLInputElement>(null);
  const fotoBersamaInputRef = useRef<HTMLInputElement>(null);

  const isResubmission = Boolean(initialData && initialData.status === 'Ditolak');

  React.useEffect(() => {
    if (initialData) {
      setKategori(initialData.kategori);
      setTanggalMulai(initialData.tanggal);
      setTanggalSelesai(initialData.tanggalSelesai || initialData.tanggal);
      setIsMultiDay(Boolean(initialData.tanggalSelesai && initialData.tanggalSelesai !== initialData.tanggal));
      setNamaOrangTua(initialData.namaOrangTua || '');
      setNoHpOrangTua(initialData.noHpOrangTua || '');
      setAlasan(initialData.alasan || '');
      setSuratUrl(initialData.suratUrl || '');
      setNamaSurat(initialData.namaSurat || '');
      setFotoBersamaUrl(initialData.fotoBersamaOrangTuaUrl || '');
      setNamaFotoBersama(initialData.namaFotoBersama || '');
    } else {
      setKategori('Sakit');
      setTanggalMulai(new Date().toISOString().slice(0, 10));
      setTanggalSelesai(new Date().toISOString().slice(0, 10));
      setIsMultiDay(false);
      setNamaOrangTua('');
      setNoHpOrangTua('');
      setAlasan('');
      setSuratUrl('');
      setNamaSurat('');
      setFotoBersamaUrl('');
      setNamaFotoBersama('');
    }
  }, [initialData, isOpen]);

  const kelasNama =
    db.kelas?.find((k) => k.id === currentUser.kelasId)?.nama || currentUser.kelasId || 'Kelas XI';

  if (!isOpen) return null;

  const handleSuratFileChange = async (file: File | null) => {
    if (!file) return;
    try {
      setIsUploadingSurat(true);
      setErrorMessage(null);
      const dataUrl = await processDocumentOrProofImage(file);
      setSuratUrl(dataUrl);
      setNamaSurat(file.name);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses file surat izin.');
    } finally {
      setIsUploadingSurat(false);
    }
  };

  const handleFotoBersamaFileChange = async (file: File | null) => {
    if (!file) return;
    try {
      setIsUploadingFotoBersama(true);
      setErrorMessage(null);
      const dataUrl = await processDocumentOrProofImage(file);
      setFotoBersamaUrl(dataUrl);
      setNamaFotoBersama(file.name);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses foto bersama orang tua.');
    } finally {
      setIsUploadingFotoBersama(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!tanggalMulai) {
      setErrorMessage('Silakan pilih tanggal izin/sakit.');
      return;
    }
    if (!namaOrangTua.trim()) {
      setErrorMessage('Nama orang tua atau wali wajib diisi.');
      return;
    }
    if (!noHpOrangTua.trim()) {
      setErrorMessage('Nomor HP/WhatsApp orang tua wajib diisi untuk verifikasi pihak sekolah.');
      return;
    }
    if (!alasan.trim()) {
      setErrorMessage('Silakan tuliskan alasan lengkap tidak dapat mengikuti pembelajaran PJOK.');
      return;
    }
    if (!suratUrl) {
      setErrorMessage('Wajib mengunggah surat izin/sakit yang telah ditandatangani oleh orang tua/wali.');
      return;
    }
    if (!fotoBersamaUrl) {
      setErrorMessage('Wajib mengunggah foto murid bersama orang tua sambil menunjukkan surat fisik.');
      return;
    }

    try {
      setIsSubmitting(true);
      const userKelas = (db.kelas || []).find((k) => k.id === currentUser.kelasId);
      const kelasNama = userKelas ? `Kelas ${userKelas.nama}` : currentUser.kelasId || 'XI 1';

      const pengajuanId = initialData?.id || `izin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newPengajuan: PengajuanIzin = {
        id: pengajuanId,
        muridId: currentUser.id,
        muridNama: currentUser.name,
        muridNis: currentUser.nis || '',
        kelasId: currentUser.kelasId || '',
        kelasNama: kelasNama,
        tanggal: tanggalMulai,
        tanggalSelesai: isMultiDay && tanggalSelesai ? tanggalSelesai : tanggalMulai,
        kategori,
        alasan: alasan.trim(),
        namaOrangTua: namaOrangTua.trim(),
        noHpOrangTua: noHpOrangTua.trim(),
        suratUrl,
        namaSurat: namaSurat || 'Surat_Izin.jpg',
        fotoBersamaOrangTuaUrl: fotoBersamaUrl,
        namaFotoBersama: namaFotoBersama || 'Foto_Bersama_Ortu.jpg',
        status: 'Menunggu',
        tanggalPengajuan: new Date().toISOString(),
        catatanGuru: undefined, // Reset teacher note on resubmission
        diverifikasiOleh: undefined,
        tanggalVerifikasi: undefined,
      };

      // Notification for teachers
      const notifItem: NotifikasiItem = {
        id: `notif-izin-${Date.now()}`,
        judul: isResubmission
          ? `Pengajuan Ulang Surat ${kategori}: ${currentUser.name}`
          : `Pengajuan ${kategori}: ${currentUser.name}`,
        pesan: isResubmission
          ? `${currentUser.name} (${kelasNama}) telah mengajukan ulang surat ${kategori.toLowerCase()} (perbaikan sesuai catatan guru) untuk tgl ${tanggalMulai}. Menunggu verifikasi guru.`
          : `${currentUser.name} (${kelasNama}) mengirimkan surat ${kategori.toLowerCase()} untuk tgl ${tanggalMulai}. Menunggu verifikasi guru.`,
        waktu: 'Baru saja',
        tipe: 'presensi',
        targetMenu: 'surat-izin',
        dibaca: false,
      };

      // Automatic Attendance Synchronization:
      // When a student submits a leave/sick request, immediately record it in attendance
      // so teacher and student see the synced status ('S' or 'I') without waiting
      const presensiStatus: StatusPresensi = kategori === 'Sakit' ? 'S' : 'I';
      const newPresensiRecord: PresensiRecord = {
        id: `prs-${currentUser.id}-${tanggalMulai}`,
        tanggal: tanggalMulai,
        kelasId: currentUser.kelasId || '',
        kelasNama: kelasNama,
        muridId: currentUser.id,
        muridNama: currentUser.name,
        status: presensiStatus,
        keterangan: `Surat ${kategori}: ${alasan.trim()} (Menunggu Verifikasi Guru)`,
      };

      // Direct persistent backup to prevent any loss on browser refresh
      try {
        const backupStr = localStorage.getItem('lms_pengajuan_izin_backup');
        const currentBackup: PengajuanIzin[] = backupStr ? JSON.parse(backupStr) : [];
        const updatedBackup = [newPengajuan, ...currentBackup.filter((p) => p.id !== newPengajuan.id)];
        localStorage.setItem('lms_pengajuan_izin_backup', JSON.stringify(updatedBackup));
      } catch (e) {
        console.warn('Backup pengajuan izin locally:', e);
      }

      dataStorage.updateDatabase((prev) => {
        const existingList = Array.isArray(prev.pengajuanIzin) ? prev.pengajuanIzin : [];
        const existingNotif = Array.isArray(prev.notifikasi) ? prev.notifikasi : [];
        const existingPresensi = Array.isArray(prev.presensi) ? prev.presensi : [];

        // If multi-day, generate presensi records for days in range
        const recordsToInsert: PresensiRecord[] = [newPresensiRecord];
        if (isMultiDay && tanggalSelesai && tanggalSelesai > tanggalMulai) {
          try {
            const startD = new Date(tanggalMulai);
            const endD = new Date(tanggalSelesai);
            const cur = new Date(startD);
            cur.setDate(cur.getDate() + 1);
            while (cur <= endD) {
              const dStr = cur.toISOString().slice(0, 10);
              recordsToInsert.push({
                id: `prs-${currentUser.id}-${dStr}`,
                tanggal: dStr,
                kelasId: currentUser.kelasId || '',
                kelasNama: kelasNama,
                muridId: currentUser.id,
                muridNama: currentUser.name,
                status: presensiStatus,
                keterangan: `Surat ${kategori}: ${alasan.trim()} (Menunggu Verifikasi Guru)`,
              });
              cur.setDate(cur.getDate() + 1);
            }
          } catch (e) {
            // fallback
          }
        }

        const insertedDates = new Set(recordsToInsert.map((r) => r.tanggal));
        const filteredOldPresensi = existingPresensi.filter(
          (p) => !(p.muridId === currentUser.id && insertedDates.has(p.tanggal))
        );

        return {
          ...prev,
          pengajuanIzin: [
            newPengajuan,
            ...existingList.filter((p) => p.id !== newPengajuan.id && (initialData ? p.id !== initialData.id : true)),
          ],
          presensi: [...recordsToInsert, ...filteredOldPresensi],
          notifikasi: [notifItem, ...existingNotif],
        };
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat mengirim pengajuan izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-800 via-teal-800 to-emerald-800 text-white flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-xs">
                Formulir Presensi Khusus Murid
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-1 tracking-tight">
                Pengajuan Izin, Sakit & Dispensasi
              </h2>
              <p className="text-xs text-sky-100 mt-0.5">
                Kirimkan surat permohonan bertandatangan orang tua dan foto bukti otentik
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {isResubmission && initialData && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-xs font-black">Pengajuan Ulang Surat Izin Sesuai Catatan Guru</span>
                </div>
                <div className="p-3 bg-white/90 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                    Catatan Penolakan Guru:
                  </span>
                  <p className="text-xs font-bold text-slate-800 italic mt-0.5">
                    "{initialData.catatanGuru || 'Dokumen belum lengkap / belum sesuai'}"
                  </p>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Silakan perbarui atau unggah ulang foto surat bertandatangan dan/atau foto bersama orang tua yang lebih lengkap sesuai arahan guru di atas, kemudian klik <strong>Kirim Pengajuan Ulang</strong>.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Kategori Pilihan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Keterangan / Kategori Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setKategori('Sakit')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    kategori === 'Sakit'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${kategori === 'Sakit' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xs">Sakit (S)</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Kurang sehat / rawat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setKategori('Izin')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    kategori === 'Izin'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${kategori === 'Izin' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xs">Izin (I)</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Urusan keluarga / darurat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setKategori('Dispensasi')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                    kategori === 'Dispensasi'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${kategori === 'Dispensasi' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xs">Dispensasi (D)</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Tugas sekolah / lomba</span>
                </button>
              </div>
            </div>

            {/* Tanggal Izin */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Tanggal Tidak Masuk / Izin <span className="text-rose-500">*</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={(e) => setIsMultiDay(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Lebih dari 1 hari?</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {isMultiDay ? 'Tanggal Mulai:' : 'Tanggal Pembelajaran PJOK:'}
                  </span>
                  <input
                    type="date"
                    required
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {isMultiDay && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">
                      Sampai Tanggal:
                    </span>
                    <input
                      type="date"
                      required
                      min={tanggalMulai}
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Data Orang Tua / Wali */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Nama Orang Tua / Wali <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: I Wayan Sudarma, S.Pd."
                  value={namaOrangTua}
                  onChange={(e) => setNamaOrangTua(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  No. HP / WA Orang Tua <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={noHpOrangTua}
                  onChange={(e) => setNoHpOrangTua(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Alasan Lengkap */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Alasan Lengkap Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Tuliskan secara jelas alasan izin/sakit/dispensasi secara santun dan jujur..."
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Banner Panduan & Contoh Format Surat Izin / Sakit */}
            <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 p-3.5 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-950 block">
                    Belum Punya Surat / Belum Ada Surat Dokter?
                  </span>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Lihat contoh format surat izin orang tua (tulis tangan) & surat keterangan sakit sementara sebelum periksa dokter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Contoh Surat</span>
              </button>
            </div>

            {/* Upload Bagian 1: Surat Ditandatangani Orang Tua */}
            <div className="space-y-2 p-4 bg-sky-50/50 rounded-2xl border border-sky-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    1. Upload Surat yang Ditandatangani Orang Tua / Wali <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Surat izin tulis tangan atau surat dokter berstempel & bertandatangan basah orang tua/wali.
                  </p>
                </div>
              </div>

              {suratUrl ? (
                <div className="p-3 bg-white rounded-xl border border-sky-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={suratUrl}
                      alt="Preview Surat"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {namaSurat || 'Surat Bertandatangan'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Berkas Siap Dikirim
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: suratUrl, title: 'Surat Izin Bertandatangan Ortu' })}
                      className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSuratUrl('');
                        setNamaSurat('');
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                      title="Hapus / Ganti"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => suratInputRef.current?.click()}
                  className="p-4 bg-white border-2 border-dashed border-sky-300 rounded-xl text-center hover:bg-sky-50/60 transition cursor-pointer"
                >
                  <input
                    ref={suratInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleSuratFileChange(e.target.files?.[0] || null)}
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="p-2.5 bg-sky-100 text-sky-700 rounded-full">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-sky-900">
                      {isUploadingSurat ? 'Memproses Berkas...' : 'Klik untuk Pilih Foto Surat atau Dokumen PDF'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Mendukung JPG, PNG, atau scan PDF (Kamera HP / Galeri)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Bagian 2: Foto Bersama Orang Tua Sambil Menunjukkan Surat */}
            <div className="space-y-2 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    2. Upload Foto Bersama Orang Tua Sambil Menunjukkan Surat <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Foto otentik murid bersama orang tua/wali memegang surat tersebut untuk validasi kebenaran izin oleh guru.
                  </p>
                </div>
              </div>

              {fotoBersamaUrl ? (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={fotoBersamaUrl}
                      alt="Preview Foto Bersama Ortu"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {namaFotoBersama || 'Foto Bersama Orang Tua'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Foto Otentik Siap Dikirim
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ url: fotoBersamaUrl, title: 'Foto Bersama Orang Tua Memegang Surat' })}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoBersamaUrl('');
                        setNamaFotoBersama('');
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                      title="Hapus / Ganti"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fotoBersamaInputRef.current?.click()}
                  className="p-4 bg-white border-2 border-dashed border-emerald-300 rounded-xl text-center hover:bg-emerald-50/60 transition cursor-pointer"
                >
                  <input
                    ref={fotoBersamaInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFotoBersamaFileChange(e.target.files?.[0] || null)}
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-emerald-900">
                      {isUploadingFotoBersama ? 'Memproses Foto...' : 'Klik untuk Ambil / Upload Foto Bersama Ortu & Surat'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Ambil foto selfie/berdua bersama orang tua sambil memperlihatkan surat fisik
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Aksi Form */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingSurat || isUploadingFotoBersama}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Mengirim Surat...'
                    : isResubmission
                    ? 'Kirim Pengajuan Ulang Surat'
                    : 'Kirim Pengajuan Izin'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Zoom Gambar Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden p-3 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800 text-white">
              <span className="text-xs font-extrabold">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewImage.url}
                alt="Zoom Preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal Contoh & Format Surat Izin / Sakit */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Contoh & Pedoman Format Surat
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Salin teks atau jadikan panduan menulis tangan pada kertas bergaris
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl mt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateTab('sakit_ortu');
                  setCopiedTemplate(false);
                }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition ${
                  selectedTemplateTab === 'sakit_ortu'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Sakit (Ortu)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateTab('izin_ortu');
                  setCopiedTemplate(false);
                }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition ${
                  selectedTemplateTab === 'izin_ortu'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Izin Keluarga
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateTab('surat_dokter');
                  setCopiedTemplate(false);
                }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition ${
                  selectedTemplateTab === 'surat_dokter'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Pedoman Dokter
              </button>
            </div>

            {/* Template Content */}
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900">
                <span className="font-bold block mb-0.5">
                  {selectedTemplateTab === 'sakit_ortu' && 'Panduan Surat Sakit Tulis Tangan Orang Tua:'}
                  {selectedTemplateTab === 'izin_ortu' && 'Panduan Surat Izin Urusan Keluarga:'}
                  {selectedTemplateTab === 'surat_dokter' && 'Panduan Surat Dokter / Klinik Medis:'}
                </span>
                {selectedTemplateTab === 'sakit_ortu' &&
                  'Dapat ditulis tangan oleh orang tua pada selembar kertas folio/HVS bergaris, lalu ditandatangani dan difoto bersama orang tua.'}
                {selectedTemplateTab === 'izin_ortu' &&
                  'Wajib mencantumkan alasan yang jelas, jangka waktu izin, dan tanda tangan asli orang tua/wali murid.'}
                {selectedTemplateTab === 'surat_dokter' &&
                  'Jika sakit lebih dari 2 hari atau kondisi berat, surat keterangan dokter dengan stempel puskesmas/klinik wajib dilampirkan.'}
              </div>

              <div className="relative">
                <pre className="w-full p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto border border-slate-800">
                  {selectedTemplateTab === 'sakit_ortu' &&
`Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

Kepada Yth.
Bapak/Ibu Guru Mata Pelajaran PJOK
SMA Negeri 1 Tejakula (SMANSAKA)
di Tempat

Dengan hormat,
Saya yang bertanda tangan di bawah ini selaku orang tua/wali dari:

Nama Murid    : ${currentUser.name}
NIS           : ${currentUser.nis || '.....................'}
Kelas         : ${kelasNama}

Dengan ini memberitahukan bahwa anak kami tersebut di atas tidak dapat mengikuti kegiatan pembelajaran PJOK pada hari ini, dikarenakan sedang mengalami SAKIT (demam/cedera fisik/kurang sehat).

Saat ini anak kami sedang beristirahat di rumah. Apabila kondisi berlanjut, kami akan segera memeriksakan ke fasilitas kesehatan terdekat dan menyusulkan surat dokter.

Demikian surat pemberitahuan ini kami sampaikan dengan sebenarnya. Atas perhatian dan izin dari Bapak/Ibu Guru PJOK, kami ucapkan terima kasih.

Hormat kami,
Orang Tua / Wali Murid,

(Tanda Tangan Basah)
[Nama Lengkap Orang Tua/Wali]`}

                  {selectedTemplateTab === 'izin_ortu' &&
`Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

Kepada Yth.
Bapak/Ibu Guru Mata Pelajaran PJOK
SMA Negeri 1 Tejakula (SMANSAKA)
di Tempat

Dengan hormat,
Saya yang bertanda tangan di bawah ini selaku orang tua/wali dari:

Nama Murid    : ${currentUser.name}
NIS           : ${currentUser.nis || '.....................'}
Kelas         : ${kelasNama}

Dengan ini memohon izin bagi anak kami untuk tidak mengikuti pembelajaran PJOK pada tanggal ${tanggalMulai} dikarenakan ada keperluan keluarga mendesak / upacara adat keluarga yang tidak dapat ditinggalkan.

Kami selaku orang tua memastikan anak kami akan tetap mengejar materi dan menyelesaikan tugas PJOK yang tertinggal.

Demikian surat permohonan izin ini kami sampaikan. Atas izin dan kebijaksanaan Bapak/Ibu Guru, kami ucapkan terima kasih.

Hormat kami,
Orang Tua / Wali Murid,

(Tanda Tangan Basah)
[Nama Lengkap Orang Tua/Wali]`}

                  {selectedTemplateTab === 'surat_dokter' &&
`SYARAT KEABSAHAN SURAT KETERANGAN DOKTER:
1. Memiliki KOP RESMI (Puskesmas Tejakula / Rumah Sakit / Klinik Dokter).
2. Mencantumkan Nama Pasien: ${currentUser.name}.
3. Terdapat keterangan anjuran istirahat (misal: istirahat selama 2-3 hari).
4. Bertanda tangan dokter pemeriksa dan STEMPEL BASAH instansi medis.
5. Difoto bersama orang tua/wali murid sebagai bukti validasi.`}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    const textToCopy =
                      selectedTemplateTab === 'sakit_ortu'
                        ? `Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nKepada Yth.\nBapak/Ibu Guru Mata Pelajaran PJOK\nSMA Negeri 1 Tejakula (SMANSAKA)\ndi Tempat\n\nDengan hormat,\nSaya yang bertanda tangan di bawah ini selaku orang tua/wali dari:\n\nNama Murid    : ${currentUser.name}\nNIS           : ${currentUser.nis || '.....................'}\nKelas         : ${kelasNama}\n\nDengan ini memberitahukan bahwa anak kami tersebut di atas tidak dapat mengikuti kegiatan pembelajaran PJOK pada hari ini, dikarenakan sedang mengalami SAKIT.\n\nSaat ini anak kami sedang beristirahat di rumah.\n\nDemikian surat pemberitahuan ini kami sampaikan dengan sebenarnya. Atas perhatian Bapak/Ibu Guru PJOK, kami ucapkan terima kasih.\n\nHormat kami,\nOrang Tua / Wali Murid,\n\n(Tanda Tangan Basah)\n[Nama Lengkap Orang Tua/Wali]`
                        : selectedTemplateTab === 'izin_ortu'
                        ? `Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nKepada Yth.\nBapak/Ibu Guru Mata Pelajaran PJOK\nSMA Negeri 1 Tejakula (SMANSAKA)\ndi Tempat\n\nDengan hormat,\nSaya yang bertanda tangan di bawah ini selaku orang tua/wali dari:\n\nNama Murid    : ${currentUser.name}\nNIS           : ${currentUser.nis || '.....................'}\nKelas         : ${kelasNama}\n\nDengan ini memohon izin bagi anak kami untuk tidak mengikuti pembelajaran PJOK pada tanggal ${tanggalMulai} dikarenakan ada keperluan keluarga mendesak.\n\nDemikian permohonan ini kami buat, terima kasih.\n\nHormat kami,\nOrang Tua / Wali Murid,\n\n(Tanda Tangan Basah)\n[Nama Lengkap Orang Tua/Wali]`
                        : `Surat Dokter Puskesmas / Klinik Resmi dengan tanda tangan & stempel basah.`;

                    navigator.clipboard.writeText(textToCopy);
                    setCopiedTemplate(true);
                    setTimeout(() => setCopiedTemplate(false), 2500);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedTemplate ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Format</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup & Lanjutkan Mengisi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
