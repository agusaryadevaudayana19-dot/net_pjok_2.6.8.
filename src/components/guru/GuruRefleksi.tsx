import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  BookOpen,
  Users,
  MessageSquare,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle2,
  Calendar,
  Filter,
  Check,
  Send,
  Star,
  Smile,
  Meh,
  Frown,
  Eye,
  Clock,
} from 'lucide-react';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import {
  JawabanRefleksiMurid,
  RefleksiPembelajaran,
  SoalRefleksi,
  User,
  getTeacherAssignedClasses,
} from '../../types';

interface GuruRefleksiProps {
  db: LMSDatabase;
  currentUser: User;
}

export const GuruRefleksi: React.FC<GuruRefleksiProps> = ({ db, currentUser }) => {
  const availableClasses = useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [activeTab, setActiveTab] = useState<'daftar' | 'respon'>('daftar');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('ALL');
  const [filterPublikasi, setFilterPublikasi] = useState<'Semua' | 'Publish' | 'Draft'>('Semua');
  const [selectedRefleksiId, setSelectedRefleksiId] = useState<string | null>(null);

  // Modal State for New/Edit Refleksi
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRefleksiId, setEditingRefleksiId] = useState<string | null>(null);
  const [formJudul, setFormJudul] = useState<string>('');
  const [formSubJudul, setFormSubJudul] = useState<string>('');
  const [formStatusPublikasi, setFormStatusPublikasi] = useState<'Publish' | 'Draft'>('Publish');
  const [formMateriJudul, setFormMateriJudul] = useState<string>('');
  const [formKelasId, setFormKelasId] = useState<string>('ALL');
  const [formDeskripsi, setFormDeskripsi] = useState<string>('');
  const [formSoalList, setFormSoalList] = useState<SoalRefleksi[]>([]);

  // Feedback State
  const [feedbackJawabanId, setFeedbackJawabanId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered refleksi list
  const refleksiList = useMemo(() => {
    return (db.refleksi || []).filter((r) => {
      const matchKelas = selectedKelasId === 'ALL' || r.kelasId === selectedKelasId || r.kelasId === 'ALL';
      const isDraft = r.status === 'Draft' || r.statusPublikasi === 'Draft';
      const matchPublikasi =
        filterPublikasi === 'Semua' ||
        (filterPublikasi === 'Draft' && isDraft) ||
        (filterPublikasi === 'Publish' && !isDraft);
      return matchKelas && matchPublikasi;
    });
  }, [db.refleksi, selectedKelasId, filterPublikasi]);

  const handleTogglePublikasi = (r: RefleksiPembelajaran) => {
    const isDraft = r.status === 'Draft' || r.statusPublikasi === 'Draft';
    const newStatus = isDraft ? 'Aktif' : 'Draft';
    const newPublikasi = isDraft ? 'Publish' : 'Draft';
    const updated: RefleksiPembelajaran = {
      ...r,
      status: newStatus as any,
      statusPublikasi: newPublikasi as any,
    };
    dataStorage.saveRefleksi(updated);
    setToastMessage(`Status refleksi diubah menjadi ${newPublikasi === 'Publish' ? 'Diterbitkan' : 'Draft'}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active refleksi for viewing responses
  const currentRefleksi = useMemo(() => {
    if (selectedRefleksiId) {
      return (db.refleksi || []).find((r) => r.id === selectedRefleksiId) || null;
    }
    return refleksiList.length > 0 ? refleksiList[0] : null;
  }, [db.refleksi, selectedRefleksiId, refleksiList]);

  // Responses for the current selected refleksi
  const activeResponses = useMemo(() => {
    if (!currentRefleksi) return [];
    return (db.jawabanRefleksi || []).filter((j) => j.refleksiId === currentRefleksi.id);
  }, [db.jawabanRefleksi, currentRefleksi]);

  // Metrics for active responses
  const responseMetrics = useMemo(() => {
    const total = activeResponses.length;
    if (total === 0) return { total: 0, avgSkor: 0, senangCount: 0, kendalaCount: 0 };

    let sumSkor = 0;
    let skorCount = 0;
    let senangCount = 0;
    let kendalaCount = 0;

    activeResponses.forEach((res) => {
      if (res.mood === 'senang' || res.mood === 'sangat_senang') senangCount++;
      if (res.mood === 'kesulitan') kendalaCount++;

      res.jawaban.forEach((item) => {
        if (typeof item.jawaban === 'number') {
          sumSkor += item.jawaban;
          skorCount++;
        }
      });
    });

    return {
      total,
      avgSkor: skorCount > 0 ? (sumSkor / skorCount).toFixed(1) : '-',
      senangCount,
      kendalaCount,
    };
  }, [activeResponses]);

  // Standard PJOK Question Template
  const handleLoadTemplate = () => {
    setFormSoalList([
      {
        id: `soal-${Date.now()}-1`,
        pertanyaan: 'Seberapa baik kamu memahami dan menguasai teknik gerakan hari ini?',
        tipe: 'skala',
        wajib: true,
      },
      {
        id: `soal-${Date.now()}-2`,
        pertanyaan: 'Bagaimana tingkat kebugaran dan daya tahan fisikmu selama latihan di lapangan?',
        tipe: 'skala',
        wajib: true,
      },
      {
        id: `soal-${Date.now()}-3`,
        pertanyaan: 'Gerakan atau bagian latihan mana yang paling sulit bagimu dan bagaimana kamu mengatasinya?',
        tipe: 'teks',
        wajib: true,
      },
      {
        id: `soal-${Date.now()}-4`,
        pertanyaan: 'Apa yang akan kamu latih atau perbaiki pada pertemuan pembelajaran berikutnya?',
        tipe: 'teks',
        wajib: false,
      },
    ]);
  };

  const handleOpenNewModal = () => {
    setEditingRefleksiId(null);
    setFormJudul('');
    setFormSubJudul('');
    setFormStatusPublikasi('Publish');
    setFormMateriJudul('');
    setFormKelasId('ALL');
    setFormDeskripsi('Isilah refleksi pembelajaran ini secara jujur untuk membantu gurumu memahami kendala dan perkembangan belajarmu.');
    handleLoadTemplate();
    setShowModal(true);
  };

  const handleOpenEditModal = (r: RefleksiPembelajaran) => {
    setEditingRefleksiId(r.id);
    setFormJudul(r.judul);
    setFormSubJudul(r.subJudul || '');
    setFormStatusPublikasi(r.status === 'Draft' || r.statusPublikasi === 'Draft' ? 'Draft' : 'Publish');
    setFormMateriJudul(r.materiJudul || '');
    setFormKelasId(r.kelasId || 'ALL');
    setFormDeskripsi(r.deskripsi || '');
    setFormSoalList(r.soalList || []);
    setShowModal(true);
  };

  const handleAddQuestion = () => {
    setFormSoalList((prev) => [
      ...prev,
      {
        id: `soal-${Date.now()}-${prev.length + 1}`,
        pertanyaan: '',
        tipe: 'teks',
        wajib: true,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setFormSoalList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRefleksi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim()) {
      alert('Judul refleksi tidak boleh kosong');
      return;
    }
    if (formSoalList.length === 0) {
      alert('Tambahkan minimal 1 butir pertanyaan refleksi');
      return;
    }

    const item: RefleksiPembelajaran = {
      id: editingRefleksiId || `refl-${Date.now()}`,
      judul: formJudul,
      subJudul: formSubJudul,
      materiJudul: formMateriJudul || 'PJOK',
      guruId: currentUser.id,
      guruNama: currentUser.name,
      kelasId: formKelasId,
      tanggalDibuat: new Date().toISOString().slice(0, 10),
      deskripsi: formDeskripsi,
      status: formStatusPublikasi === 'Draft' ? 'Draft' : 'Aktif',
      statusPublikasi: formStatusPublikasi,
      soalList: formSoalList,
    };

    dataStorage.saveRefleksi(item);
    setShowModal(false);
    setSelectedRefleksiId(item.id);
    setToastMessage(
      formStatusPublikasi === 'Draft'
        ? 'Refleksi pembelajaran berhasil disimpan sebagai Draft.'
        : 'Soal refleksi pembelajaran berhasil disimpan dan diterbitkan untuk murid!'
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteRefleksi = (id: string) => {
    if (window.confirm('Yakin ingin menghapus kuesioner refleksi ini beserta jawaban murid?')) {
      dataStorage.deleteRefleksi(id);
      if (selectedRefleksiId === id) {
        setSelectedRefleksiId(null);
      }
      setToastMessage('Kuesioner refleksi berhasil dihapus.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSaveFeedback = (jawabanId: string) => {
    if (!feedbackText.trim()) return;
    dataStorage.tanggapiRefleksi(jawabanId, feedbackText.trim());
    setFeedbackJawabanId(null);
    setFeedbackText('');
    setToastMessage('Tanggapan dan apresiasi Anda berhasil dikirimkan kepada murid!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getMoodBadge = (mood: string) => {
    switch (mood) {
      case 'sangat_senang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>😃</span> Sangat Senang
          </span>
        );
      case 'senang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <span>🙂</span> Senang / Nyaman
          </span>
        );
      case 'netral':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span>😐</span> Biasa Saja
          </span>
        );
      case 'kesulitan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span>🙁</span> Mengalami Kendala
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-3">
          <div className="p-3.5 rounded-2xl shadow-xl bg-teal-700 text-white flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Manajemen Refleksi Murid • Guru PJOK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Kuesioner Refleksi Pembelajaran
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
              Buat pertanyaan reflektif untuk akun murid, pantau umpan balik penguasaan teknik gerak, serta berikan catatan apresiasi secara langsung.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Soal Refleksi Baru</span>
            </button>
          </div>
        </div>

        {/* Tab & Class Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-white/15">
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('daftar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'daftar' ? 'bg-white text-slate-900 shadow-xs' : 'text-teal-200 hover:text-white'
              }`}
            >
              Daftar Soal Refleksi ({refleksiList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('respon')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'respon' ? 'bg-white text-slate-900 shadow-xs' : 'text-teal-200 hover:text-white'
              }`}
            >
              Hasil & Jawaban Murid ({activeResponses.length})
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-teal-200 font-medium">Status:</span>
              <select
                value={filterPublikasi}
                onChange={(e) => setFilterPublikasi(e.target.value as any)}
                className="text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-1.5 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
              >
                <option value="Semua" className="bg-slate-900 text-white">Semua Status</option>
                <option value="Publish" className="bg-slate-900 text-white">🟢 Diterbitkan</option>
                <option value="Draft" className="bg-slate-900 text-white">🟡 Draft</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-teal-200 font-medium">Filter Kelas:</span>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-1.5 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas'}
                </option>
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id} className="bg-slate-900 text-white">
                    Kelas {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'daftar' ? (
        <div className="space-y-4">
          {refleksiList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-800">
                Belum Ada Kuesioner Refleksi
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Klik tombol "+ Buat Soal Refleksi Baru" untuk menugaskan pertanyaan refleksi pada materi PJOK yang sedang berjalan.
              </p>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kuesioner Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {refleksiList.map((refleksi) => {
                const responses = (db.jawabanRefleksi || []).filter(
                  (j) => j.refleksiId === refleksi.id
                );
                const isDraft = refleksi.status === 'Draft' || refleksi.statusPublikasi === 'Draft';

                return (
                  <div
                    key={refleksi.id}
                    className={`bg-white rounded-2xl sm:rounded-3xl p-5 border shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4 ${
                      isDraft ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            {refleksi.materiJudul || 'PJOK'}
                          </span>
                          {!isDraft ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terbit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Draft
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {refleksi.tanggalDibuat}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-slate-900 leading-snug">
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

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Target Kelas:</span>
                        <span className="text-teal-700">
                          {refleksi.kelasId === 'ALL'
                            ? 'Semua Kelas'
                            : (db.kelas.find((k) => k.id === refleksi.kelasId)?.nama || refleksi.kelasId)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                        <span>{refleksi.soalList.length} Butir Soal</span>
                        <span className="font-bold text-teal-600">
                          {responses.length} Murid Merespon
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleTogglePublikasi(refleksi)}
                        className={`px-2 py-1.5 text-[10px] font-bold rounded-xl border transition ${
                          isDraft
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title={isDraft ? 'Terbitkan ke akun murid' : 'Kembalikan ke status draf'}
                      >
                        {isDraft ? 'Terbitkan' : 'Draft'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(refleksi)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition cursor-pointer"
                        title="Edit Soal Refleksi"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRefleksiId(refleksi.id);
                          setActiveTab('respon');
                        }}
                        className="flex-1 py-1.5 px-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Jawaban ({responses.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRefleksi(refleksi.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Hapus Soal Refleksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Response View */
        <div className="space-y-4">
          {/* Top selection of reflection */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Topik Refleksi:</span>
              <select
                value={selectedRefleksiId || (refleksiList[0]?.id ?? '')}
                onChange={(e) => setSelectedRefleksiId(e.target.value)}
                className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden"
              >
                {refleksiList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.judul} ({r.materiJudul})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-teal-700">
                <Users className="w-4 h-4" />
                <span>{responseMetrics.total} Murid Mengisi</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Rata-rata Skor: {responseMetrics.avgSkor} / 5</span>
              </div>
            </div>
          </div>

          {/* Student Responses Cards */}
          {activeResponses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Belum ada murid yang mengirimkan jawaban refleksi untuk topik ini.
              </p>
              <p className="text-xs text-slate-400">
                Murid dapat mengisi kuesioner ini melalui menu "Refleksi Belajar" di akun mereka.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeResponses.map((res) => {
                const isWritingFeedback = feedbackJawabanId === res.id;

                return (
                  <div
                    key={res.id}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{res.muridNama}</h4>
                          <span className="text-xs text-slate-400">
                            • Kelas {db.kelas.find((k) => k.id === res.kelasId)?.nama || res.kelasId}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Diisi pada: {res.tanggalDiisi}
                        </span>
                      </div>

                      <div>{getMoodBadge(res.mood)}</div>
                    </div>

                    {/* Answers detail */}
                    <div className="space-y-3">
                      {res.jawaban.map((item, aIdx) => (
                        <div key={item.soalId || aIdx} className="space-y-1 text-xs">
                          <span className="font-bold text-slate-500 block">
                            Q{aIdx + 1}: {item.pertanyaan}
                          </span>
                          <div className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium border border-slate-100">
                            {typeof item.jawaban === 'number' ? (
                              <div className="flex items-center gap-1.5 font-bold text-teal-700">
                                <span>Skor {item.jawaban} / 5</span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: item.jawaban }).map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span>{item.jawaban || <em className="text-slate-400">Tidak ada jawaban</em>}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Feedback from teacher */}
                    <div className="pt-2 border-t border-slate-100">
                      {res.catatanGuru && !isWritingFeedback && (
                        <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-900 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              Tanggapan Anda:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackJawabanId(res.id);
                                setFeedbackText(res.catatanGuru || '');
                              }}
                              className="text-[11px] font-bold text-teal-700 hover:underline"
                            >
                              Edit Tanggapan
                            </button>
                          </div>
                          <p className="text-xs text-teal-800 italic">"{res.catatanGuru}"</p>
                        </div>
                      )}

                      {(!res.catatanGuru || isWritingFeedback) && (
                        <div>
                          {isWritingFeedback ? (
                            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                              <label className="text-xs font-bold text-slate-700 block">
                                Berikan Umpan Balik / Catatan untuk {res.muridNama}:
                              </label>
                              <textarea
                                rows={2}
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Tuliskan apresiasi atau saran perbaikan teknik gerakan..."
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFeedbackJawabanId(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveFeedback(res.id)}
                                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-xs"
                                >
                                  Kirimkan Apresiasi
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackJawabanId(res.id);
                                setFeedbackText('');
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Beri Umpan Balik / Apresiasi</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Buat / Edit Soal Refleksi */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md">
                  Formulir Soal Refleksi
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                  {editingRefleksiId ? 'Edit Soal Refleksi Pembelajaran' : 'Buat Soal Refleksi Pembelajaran Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRefleksi} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Judul Refleksi *</label>
                  <input
                    type="text"
                    required
                    value={formJudul}
                    onChange={(e) => setFormJudul(e.target.value)}
                    placeholder="Contoh: Refleksi Pembelajaran Bola Voli"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sub Judul (Opsional)</label>
                  <input
                    type="text"
                    value={formSubJudul}
                    onChange={(e) => setFormSubJudul(e.target.value)}
                    placeholder="Contoh: Evaluasi Mandiri Passing Bawah & Kerjasama Tim"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Materi Terkait</label>
                  <input
                    type="text"
                    value={formMateriJudul}
                    onChange={(e) => setFormMateriJudul(e.target.value)}
                    placeholder="Contoh: Permainan Bola Voli / Kebugaran Jasmani"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Publikasi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatusPublikasi('Publish')}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatusPublikasi === 'Publish'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Terbitkan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatusPublikasi('Draft')}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        formStatusPublikasi === 'Draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Draf (Simpan Saja)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Kelas</label>
                  <select
                    value={formKelasId}
                    onChange={(e) => setFormKelasId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="ALL">
                      {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas (Umum)'}
                    </option>
                    {availableClasses.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama} (Tingkat {k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Preset Soal Cepat</label>
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    className="w-full text-xs p-2.5 rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200 hover:bg-teal-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Gunakan Template Soal PJOK Standar</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Petunjuk Pengisian Murid</label>
                <textarea
                  rows={2}
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              {/* Questions list */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    Daftar Butir Pertanyaan ({formSoalList.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pertanyaan</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {formSoalList.map((soal, idx) => (
                    <div
                      key={soal.id || idx}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-teal-700">#{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={soal.tipe}
                            onChange={(e) => {
                              const newTipe = e.target.value as 'skala' | 'teks';
                              setFormSoalList((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, tipe: newTipe } : s))
                              );
                            }}
                            className="text-[11px] font-bold p-1 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="skala">Skala Nilai (1 - 5)</option>
                            <option value="teks">Uraian / Teks</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        required
                        value={soal.pertanyaan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSoalList((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, pertanyaan: val } : s))
                          );
                        }}
                        placeholder="Ketikkan teks pertanyaan refleksi..."
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-sm cursor-pointer"
                >
                  {formStatusPublikasi === 'Draft' ? 'Simpan Sebagai Draf' : 'Simpan & Terbitkan Refleksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
