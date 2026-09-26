import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import {
  TugasPenilaianAntarTeman,
  StatusTugasPenilaian,
  User,
  IndikatorPenilaianItem,
} from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { BankIndikatorModal } from './BankIndikatorModal';

interface TugasPenilaianAntarTemanModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: LMSDatabase;
  currentUser: User;
  taskToEdit?: TugasPenilaianAntarTeman | null;
}

export const TugasPenilaianAntarTemanModal: React.FC<TugasPenilaianAntarTemanModalProps> = ({
  isOpen,
  onClose,
  db,
  currentUser,
  taskToEdit,
}) => {
  // Form fields per user spec
  const [namaTugas, setNamaTugas] = useState('');
  const [materi, setMateri] = useState('');
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().slice(0, 10));
  const [batasWaktu, setBatasWaktu] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [instruksi, setInstruksi] = useState('');
  const [selectedIndikatorIds, setSelectedIndikatorIds] = useState<string[]>([]);
  const [jumlahWajibDinilai, setJumlahWajibDinilai] = useState<number>(2);
  const [status, setStatus] = useState<StatusTugasPenilaian>('AKTIF');

  // Bottom checkboxes / toggles
  const [allowVideoUpload, setAllowVideoUpload] = useState<boolean>(true);
  const [allowPhotoUpload, setAllowPhotoUpload] = useState<boolean>(true);
  const [requireProofUpload, setRequireProofUpload] = useState<boolean>(false);
  const [allowEditBeforeDeadline, setAllowEditBeforeDeadline] = useState<boolean>(true);

  // Bank Indikator modal inside task form
  const [isBankIndikatorModalOpen, setIsBankIndikatorModalOpen] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setNamaTugas(taskToEdit.namaTugas || '');
      setMateri(taskToEdit.materi || '');
      setSelectedKelasIds(taskToEdit.kelasIds || []);
      setTanggalMulai(taskToEdit.tanggalMulai || new Date().toISOString().slice(0, 10));
      setBatasWaktu(taskToEdit.batasWaktu || '');
      setInstruksi(taskToEdit.instruksi || '');
      setSelectedIndikatorIds(taskToEdit.indikatorIds || []);
      setJumlahWajibDinilai(taskToEdit.jumlahWajibDinilai || 2);
      setStatus(taskToEdit.status || 'AKTIF');
      setAllowVideoUpload(taskToEdit.allowVideoUpload ?? true);
      setAllowPhotoUpload(taskToEdit.allowPhotoUpload ?? true);
      setRequireProofUpload(taskToEdit.requireProofUpload ?? false);
      setAllowEditBeforeDeadline(taskToEdit.allowEditBeforeDeadline ?? true);
    } else {
      setNamaTugas('');
      setMateri('');
      setSelectedKelasIds((db.kelas || []).map((k) => k.id));
      setTanggalMulai(new Date().toISOString().slice(0, 10));
      setBatasWaktu(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      setInstruksi(
        'Amati rekan satu kelompokmu selama praktik PJOK. Nilai capaian gerak teman berdasarkan indikator yang tersedia secara jujur dan berikan apresiasi positif.'
      );
      // Select all active indicators by default
      const defaultIds = (db.bankIndikatorPenilaian || [])
        .filter((i) => i.status === 'AKTIF')
        .map((i) => i.id);
      setSelectedIndikatorIds(defaultIds.slice(0, 4));
      setJumlahWajibDinilai(2);
      setStatus('AKTIF');
      setAllowVideoUpload(true);
      setAllowPhotoUpload(true);
      setRequireProofUpload(false);
      setAllowEditBeforeDeadline(true);
    }
  }, [taskToEdit, db.kelas, db.bankIndikatorPenilaian, isOpen]);

  if (!isOpen) return null;

  const handleToggleKelas = (kelasId: string) => {
    setSelectedKelasIds((prev) =>
      prev.includes(kelasId) ? prev.filter((id) => id !== kelasId) : [...prev, kelasId]
    );
  };

  const handleSelectAllKelas = () => {
    if (selectedKelasIds.length === (db.kelas || []).length) {
      setSelectedKelasIds([]);
    } else {
      setSelectedKelasIds((db.kelas || []).map((k) => k.id));
    }
  };

  const handleToggleIndikator = (id: string) => {
    setSelectedIndikatorIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaTugas.trim()) {
      alert('Harap isi Nama Tugas Penilaian!');
      return;
    }
    if (!materi.trim()) {
      alert('Harap isi Materi Pembelajaran!');
      return;
    }
    if (selectedKelasIds.length === 0) {
      alert('Harap pilih minimal 1 kelas yang ditugaskan!');
      return;
    }
    if (!batasWaktu) {
      alert('Harap tentukan batas waktu penilaian!');
      return;
    }
    if (selectedIndikatorIds.length === 0) {
      alert('Harap pilih minimal 1 Indikator Penilaian dari Bank Indikator!');
      return;
    }

    const newTask: TugasPenilaianAntarTeman = {
      id: taskToEdit?.id || `tugas-pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      namaTugas: namaTugas.trim(),
      materi: materi.trim(),
      kelasIds: selectedKelasIds,
      tanggalMulai,
      batasWaktu,
      instruksi: instruksi.trim(),
      indikatorIds: selectedIndikatorIds,
      jumlahWajibDinilai: Number(jumlahWajibDinilai) || 1,
      status,
      allowVideoUpload,
      allowPhotoUpload,
      requireProofUpload,
      allowEditBeforeDeadline,
      guruId: currentUser.id,
      guruNama: currentUser.name,
      createdAt: taskToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const existingList = [...(prev.tugasPenilaianAntarTeman || [])];
      if (taskToEdit) {
        const idx = existingList.findIndex((t) => t.id === taskToEdit.id);
        if (idx >= 0) existingList[idx] = newTask;
      } else {
        existingList.unshift(newTask);
      }
      return {
        ...prev,
        tugasPenilaianAntarTeman: existingList,
      };
    });

    onClose();
  };

  const allIndicators = db.bankIndikatorPenilaian || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/80">
            <div>
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
                Formulir Tugas Penilaian Antar Teman
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {taskToEdit ? 'Edit Tugas Penilaian' : 'Buat Tugas Penilaian Antar Teman'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* 1. NAMA TUGAS PENILAIAN */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                NAMA TUGAS PENILAIAN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Penilaian Antar Teman: Praktik Passing Bawah Bola Voli"
                value={namaTugas}
                onChange={(e) => setNamaTugas(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* 2. MATERI */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                MATERI PEMBELAJARAN <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ketik materi atau pilih dari materi terdaftar..."
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
                {db.materi && db.materi.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setMateri(e.target.value);
                    }}
                    value=""
                    className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">Pilih dari Kurikulum...</option>
                    {db.materi.map((m) => (
                      <option key={m.id} value={m.judul}>
                        {m.judul}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 3. DITUGASKAN KE KELAS (BISA PILIH LEBIH DARI 1 KELAS) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">
                  DITUGASKAN KE KELAS <span className="text-slate-400 font-normal">*(Bisa pilih lebih dari 1 kelas)</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllKelas}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {selectedKelasIds.length === (db.kelas || []).length
                    ? 'Batal Pilih Semua'
                    : 'Pilih Semua Kelas'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(db.kelas || []).map((k) => {
                  const isChecked = selectedKelasIds.includes(k.id);
                  return (
                    <label
                      key={k.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleKelas(k.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span className="truncate">{k.nama}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. TANGGAL MULAI DAN BATAS WAKTU PENILAIAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  TANGGAL MULAI PENILAIAN
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  BATAS WAKTU PENILAIAN (DEADLINE) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-rose-500 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={batasWaktu}
                    onChange={(e) => setBatasWaktu(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 5. INSTRUKSI PENILAIAN BAGI MURID */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                INSTRUKSI PENILAIAN BAGI MURID
              </label>
              <textarea
                rows={2}
                placeholder="Petunjuk pengerjaan bagi murid saat mengamati dan menilai rekannya..."
                value={instruksi}
                onChange={(e) => setInstruksi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* 6. PILIH INDIKATOR PENILAIAN (FITUR BANK INDIKATOR SECARA MANUAL DI DALAM INDIKATOR) */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black text-indigo-900 block">
                    PILIH INDIKATOR PENILAIAN (SKALA 1-4)
                  </span>
                  <span className="text-[11px] text-indigo-700">
                    Pilih rubrik dari Bank Indikator yang akan dinilai oleh murid.
                  </span>
                </div>

                {/* Tombol Fitur Bank Indikator Manual Langsung di Dalam Indikator */}
                <button
                  type="button"
                  onClick={() => setIsBankIndikatorModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Kelola & Buat Indikator Manual</span>
                </button>
              </div>

              {allIndicators.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                  Belum ada indikator di Bank Indikator. Klik tombol di atas untuk membuat indikator manual baru.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {allIndicators.map((ind) => {
                    const isSelected = selectedIndikatorIds.includes(ind.id);
                    return (
                      <div
                        key={ind.id}
                        onClick={() => handleToggleIndikator(ind.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-white border-indigo-500 shadow-2xs ring-1 ring-indigo-400'
                            : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleIndikator(ind.id)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900">{ind.judulPenilaian}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-500">
                              Urutan: #{ind.urutan}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                            {ind.pernyataanIndikator}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 7. JUMLAH YANG WAJIB DI NILAI & 8. STATUS TUGAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  JUMLAH YANG WAJIB DI NILAI (Teman / Siswa) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={jumlahWajibDinilai}
                  onChange={(e) => setJumlahWajibDinilai(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Berapa rekan yang wajib dinilai oleh setiap murid dalam kelas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  STATUS TUGAS
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusTugasPenilaian)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                >
                  <option value="AKTIF">🟢 AKTIF (Muncul di Dashboard Murid)</option>
                  <option value="DRAF">🟡 DRAF (Disimpan Belum Diterbitkan)</option>
                  <option value="SELESAI">🔵 SELESAI (Penilaian Ditutup)</option>
                </select>
              </div>
            </div>

            {/* 9. TAMBAHKAN DI BAWAHNYA (CHECKBOXES & TOGGLES KHUSUS) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                PENGATURAN BUKTI GERAKAN & IZIN EDIT
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Boleh murid mengunggah video bukti gerakan */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={allowVideoUpload}
                    onChange={(e) => setAllowVideoUpload(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Boleh murid mengunggah video bukti gerakan</span>
                  </div>
                </label>

                {/* Boleh murid mengunggah foto bukti gerakan */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={allowPhotoUpload}
                    onChange={(e) => setAllowPhotoUpload(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Boleh murid mengunggah foto bukti gerakan</span>
                  </div>
                </label>

                {/* Wajib unggah bukti sebelum mengirim penilaian */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={requireProofUpload}
                    onChange={(e) => setRequireProofUpload(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Wajib unggah bukti sebelum mengirim penilaian</span>
                  </div>
                </label>

                {/* izinkan murid mengedit nilai sebelum batas waktu (fitur izinkan edit) */}
                <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={allowEditBeforeDeadline}
                    onChange={(e) => setAllowEditBeforeDeadline(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Izinkan murid mengedit nilai sebelum batas waktu (fitur izinkan edit)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit buttons */}
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
                <span>{taskToEdit ? 'Simpan Perubahan Tugas' : 'Terbitkan Tugas Penilaian'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Bank Indikator Modal for immediate creation / addition */}
      {isBankIndikatorModalOpen && (
        <BankIndikatorModal
          isOpen={isBankIndikatorModalOpen}
          onClose={() => setIsBankIndikatorModalOpen(false)}
          db={db}
          initialMateri={materi}
          onSelectIndicator={(newInd) => {
            if (!selectedIndikatorIds.includes(newInd.id)) {
              setSelectedIndikatorIds((prev) => [...prev, newInd.id]);
            }
          }}
        />
      )}
    </>
  );
};
