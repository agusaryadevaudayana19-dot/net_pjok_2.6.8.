import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Sparkles,
  Video,
  Image as ImageIcon,
  AlertCircle,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import {
  User,
  TugasPenilaianAntarTeman,
  PenilaianTemanSejawat,
  NilaiIndikatorItem,
  IndikatorPenilaianItem,
} from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface FormPenilaianMuridModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: LMSDatabase;
  currentUser: User;
  task: TugasPenilaianAntarTeman;
  existingRecord?: PenilaianTemanSejawat | null;
  onSuccess?: () => void;
}

export const FormPenilaianMuridModal: React.FC<FormPenilaianMuridModalProps> = ({
  isOpen,
  onClose,
  db,
  currentUser,
  task,
  existingRecord,
  onSuccess,
}) => {
  const isMurid = currentUser.role === 'MURID';
  const [targetMuridId, setTargetMuridId] = useState('');
  const [formPenilaiId, setFormPenilaiId] = useState(currentUser.id);
  const [indikatorScores, setIndikatorScores] = useState<Record<string, number>>({});
  const [catatanPositif, setCatatanPositif] = useState('');
  const [catatanPerbaikan, setCatatanPerbaikan] = useState('');
  const [buktiFotoUrl, setBuktiFotoUrl] = useState('');
  const [buktiVideoUrl, setBuktiVideoUrl] = useState('');
  const [linkDokumentasi, setLinkDokumentasi] = useState('');

  // Find students in class
  const userKelasId = isMurid ? currentUser.kelasId : task.kelasIds[0] || '';
  const studentsInClass = (db.users || [])
    .filter((u) => u.role === 'MURID' && (!userKelasId || u.kelasId === userKelasId))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Find task indicators
  const indicators: IndikatorPenilaianItem[] = (task.indikatorIds || [])
    .map((id) => (db.bankIndikatorPenilaian || []).find((ind) => ind.id === id))
    .filter((ind): ind is IndikatorPenilaianItem => !!ind)
    .sort((a, b) => (a.urutan || 1) - (b.urutan || 1));

  useEffect(() => {
    if (existingRecord) {
      setTargetMuridId(existingRecord.targetMuridId);
      setFormPenilaiId(existingRecord.penilaiId);
      setCatatanPositif(existingRecord.catatanPositif || '');
      setCatatanPerbaikan(existingRecord.catatanPerbaikan || '');
      setBuktiFotoUrl(existingRecord.buktiFotoUrl || '');
      setBuktiVideoUrl(existingRecord.buktiVideoUrl || '');
      setLinkDokumentasi(existingRecord.linkDokumentasi || '');

      const initialScores: Record<string, number> = {};
      (existingRecord.nilaiIndikator || []).forEach((ni) => {
        initialScores[ni.indikatorId] = ni.skor;
      });
      // Fallback if dynamic scores present
      (existingRecord.dimensiScores || []).forEach((ds) => {
        if (!initialScores[ds.dimensiId]) initialScores[ds.dimensiId] = ds.skor;
      });
      setIndikatorScores(initialScores);
    } else {
      setTargetMuridId('');
      setFormPenilaiId(currentUser.id);
      setCatatanPositif('');
      setCatatanPerbaikan('');
      setBuktiFotoUrl('');
      setBuktiVideoUrl('');
      setLinkDokumentasi('');
      const defaultScores: Record<string, number> = {};
      indicators.forEach((ind) => {
        defaultScores[ind.id] = 3; // Default Skala 3: Berkembang Sesuai Harapan
      });
      setIndikatorScores(defaultScores);
    }
  }, [existingRecord, task, currentUser, isOpen]);

  if (!isOpen) return null;

  // Check if deadline has passed
  const isDeadlinePassed =
    task.batasWaktu && new Date(task.batasWaktu).getTime() < new Date().setHours(0, 0, 0, 0);

  // Check edit permission
  if (existingRecord && !task.allowEditBeforeDeadline && isMurid) {
    alert('Pengaturan tugas ini tidak mengizinkan pengeditan nilai yang telah terkirim.');
    onClose();
    return null;
  }

  if (existingRecord && isDeadlinePassed && isMurid) {
    alert('Batas waktu penilaian telah berakhir. Nilai tidak dapat diedit kembali.');
    onClose();
    return null;
  }

  const handleScoreChange = (indikatorId: string, skor: number) => {
    setIndikatorScores((prev) => ({ ...prev, [indikatorId]: skor }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file foto maksimal 2MB!');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBuktiFotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetMuridId) {
      alert('Harap pilih rekan yang dinilai!');
      return;
    }

    if (isMurid && targetMuridId === currentUser.id) {
      alert('Kamu tidak dapat menilai diri sendiri dalam penilaian antar teman!');
      return;
    }

    // Require proof validation
    if (task.requireProofUpload && !buktiFotoUrl && !buktiVideoUrl && !linkDokumentasi) {
      alert('Tugas ini mewajibkan unggah bukti (foto atau tautan video gerakan) sebelum mengirim penilaian!');
      return;
    }

    const targetUser = (db.users || []).find((u) => u.id === targetMuridId);
    const penilaiUser = (db.users || []).find((u) => u.id === formPenilaiId) || currentUser;

    const nilaiIndikator: NilaiIndikatorItem[] = indicators.map((ind) => {
      const skor = indikatorScores[ind.id] || 3;
      let levelLabel = 'Berkembang Sesuai Harapan';
      let deskripsiCapaian = ind.skala3BerkembangSesuaiHarapan;
      if (skor === 1) {
        levelLabel = 'Perlu Bimbingan';
        deskripsiCapaian = ind.skala1PerluBimbingan;
      } else if (skor === 2) {
        levelLabel = 'Mulai Berkembang';
        deskripsiCapaian = ind.skala2MulaiBerkembang;
      } else if (skor === 4) {
        levelLabel = 'Berkembang Sangat Baik';
        deskripsiCapaian = ind.skala4BerkembangSangatBaik;
      }
      return {
        indikatorId: ind.id,
        judul: ind.judulPenilaian,
        pernyataan: ind.pernyataanIndikator,
        skor,
        levelLabel,
        deskripsiCapaian,
      };
    });

    const avg =
      nilaiIndikator.length > 0
        ? nilaiIndikator.reduce((acc, curr) => acc + curr.skor, 0) / nilaiIndikator.length
        : 3.0;

    const kelasObj = (db.kelas || []).find((k) => k.id === targetUser?.kelasId || k.id === userKelasId);

    const recordToSave: PenilaianTemanSejawat = {
      id: existingRecord?.id || `pts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tugasId: task.id,
      penilaiId: penilaiUser.id,
      penilaiNama: penilaiUser.name,
      targetMuridId: targetUser?.id || targetMuridId,
      targetMuridNama: targetUser?.name || 'Murid',
      targetNis: targetUser?.nis,
      kelasId: targetUser?.kelasId || userKelasId || '',
      kelasNama: kelasObj?.nama || 'Kelas',
      tanggal: existingRecord?.tanggal || new Date().toISOString().slice(0, 10),
      kegiatanPraktik: task.namaTugas || task.materi,
      materiJudul: task.materi,
      nilaiIndikator,
      skorKerjaSama: nilaiIndikator[0]?.skor || 3,
      skorSportivitas: nilaiIndikator[1]?.skor || 3,
      skorKomunikasi: nilaiIndikator[2]?.skor || 3,
      skorTanggungJawab: nilaiIndikator[3]?.skor || 3,
      rataRata: Number(avg.toFixed(2)),
      catatanPositif:
        catatanPositif.trim() ||
        'Gerakan sangat baik, sportif, dan menunjukkan kerjasama yang solid.',
      catatanPerbaikan: catatanPerbaikan.trim() || undefined,
      linkDokumentasi: linkDokumentasi.trim() || undefined,
      buktiFotoUrl: buktiFotoUrl || undefined,
      buktiVideoUrl: buktiVideoUrl.trim() || undefined,
      isEdited: !!existingRecord,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const list = [...(prev.penilaianTemanSejawat || [])];
      if (existingRecord) {
        const idx = list.findIndex((r) => r.id === existingRecord.id);
        if (idx >= 0) list[idx] = recordToSave;
      } else {
        list.unshift(recordToSave);
      }
      return {
        ...prev,
        penilaianTemanSejawat: list,
      };
    });

    alert(
      existingRecord
        ? `Berhasil memperbarui penilaian antar teman untuk ${targetUser?.name}!`
        : `Berhasil mengirim penilaian antar teman untuk ${targetUser?.name}!`
    );

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/80">
          <div>
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
              {existingRecord ? 'Edit Penilaian Antar Teman' : 'Lembar Penilaian Antar Teman'}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">{task.namaTugas}</h2>
            <p className="text-xs text-slate-500 font-medium">Materi: {task.materi}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Instruksi Card */}
          {task.instruksi && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-black block">Petunjuk Pengamatan:</span>
                <p className="text-amber-800 leading-relaxed">{task.instruksi}</p>
              </div>
            </div>
          )}

          {/* Target Friend Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Pilih Teman yang Dinilai <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!!existingRecord}
                value={targetMuridId}
                onChange={(e) => setTargetMuridId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">-- Pilih Rekan Sekelas --</option>
                {studentsInClass
                  .filter((s) => !isMurid || s.id !== currentUser.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.nis ? `(${s.nis})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {!isMurid && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Murid Penilai (Pengamat)
                </label>
                <select
                  value={formPenilaiId}
                  onChange={(e) => setFormPenilaiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                >
                  {studentsInClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Rubric Scale Evaluation (1-4) for each indicator */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Indikator Capaian Gerak (Skala 1 - 4)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Klik salah satu kotak capaian
              </span>
            </div>

            {indicators.map((ind) => {
              const currentScore = indikatorScores[ind.id] || 3;
              const options = [
                {
                  skor: 1,
                  title: '1 - Perlu Bimbingan',
                  desc: ind.skala1PerluBimbingan,
                  color: 'border-rose-300 bg-rose-50/40 text-rose-900',
                  activeColor: 'bg-rose-600 text-white ring-2 ring-rose-400',
                },
                {
                  skor: 2,
                  title: '2 - Mulai Berkembang',
                  desc: ind.skala2MulaiBerkembang,
                  color: 'border-amber-300 bg-amber-50/40 text-amber-900',
                  activeColor: 'bg-amber-600 text-white ring-2 ring-amber-400',
                },
                {
                  skor: 3,
                  title: '3 - Sesuai Harapan',
                  desc: ind.skala3BerkembangSesuaiHarapan,
                  color: 'border-sky-300 bg-sky-50/40 text-sky-900',
                  activeColor: 'bg-sky-600 text-white ring-2 ring-sky-400',
                },
                {
                  skor: 4,
                  title: '4 - Sangat Baik',
                  desc: ind.skala4BerkembangSangatBaik,
                  color: 'border-emerald-300 bg-emerald-50/40 text-emerald-900',
                  activeColor: 'bg-emerald-600 text-white ring-2 ring-emerald-400',
                },
              ];

              return (
                <div key={ind.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black flex items-center justify-center shrink-0">
                      #{ind.urutan}
                    </span>
                    <h4 className="text-xs font-black text-slate-900">{ind.judulPenilaian}</h4>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                    {ind.pernyataanIndikator}
                  </p>

                  {/* 4 Clickable Rubric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    {options.map((opt) => {
                      const isSelected = currentScore === opt.skor;
                      return (
                        <button
                          key={opt.skor}
                          type="button"
                          onClick={() => handleScoreChange(ind.id, opt.skor)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? `${opt.activeColor} shadow-md`
                              : `${opt.color} hover:bg-white`
                          }`}
                        >
                          <div className="flex items-center justify-between font-black text-[11px] mb-1">
                            <span>{opt.title}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span
                            className={`text-[10px] leading-relaxed line-clamp-3 ${
                              isSelected ? 'text-white/90' : 'text-slate-600'
                            }`}
                          >
                            {opt.desc || '-'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Bukti Gerakan Section */}
          {(task.allowPhotoUpload || task.allowVideoUpload) && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  Unggah Bukti Praktik Gerakan
                </span>
                {task.requireProofUpload && (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                    * Wajib Mengunggah Bukti
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Photo Upload */}
                {task.allowPhotoUpload && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Foto Bukti Gerakan
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                    {buktiFotoUrl && (
                      <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                        <img
                          src={buktiFotoUrl}
                          alt="Bukti Gerakan"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setBuktiFotoUrl('')}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Video / URL Link */}
                {task.allowVideoUpload && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-indigo-600" />
                      Link Video Dokumentasi (Drive / YouTube / Link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={buktiVideoUrl || linkDokumentasi}
                      onChange={(e) => {
                        setBuktiVideoUrl(e.target.value);
                        setLinkDokumentasi(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback & Apresiasi */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Catatan Positif & Apresiasi untuk Teman <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Contoh: Sangat kompak, selalu memanggil bola dengan sopan, dan teknik passing bawahnya sudah sangat stabil."
                value={catatanPositif}
                onChange={(e) => setCatatanPositif(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Saran Perbaikan / Masukan Konstruktif (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Saat bola datang kencang, lutut bisa sedikit lebih ditekuk agar pantulan tidak terlalu tinggi."
                value={catatanPerbaikan}
                onChange={(e) => setCatatanPerbaikan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{existingRecord ? 'Simpan Pembaruan Nilai' : 'Kirim Penilaian Antar Teman'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
