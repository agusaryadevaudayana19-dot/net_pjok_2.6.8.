import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Video,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  Layers,
  Sparkles,
  School,
  Target,
  BookOpen,
  Eye,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Materi, User, NotifikasiItem, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { InAppMediaModal, parseMediaUrl } from './InAppMediaModal';
import { UploadDataModal } from './UploadDataModal';
import { FormattedMateriText } from './FormattedMateriText';
import { AutoNumberedTextArea } from './AutoNumberedTextArea';
import { processImageUpload } from '../../utils/imageUploadHelper';
import {
  getMateriCategoryList,
  isMateriCategoryMatch,
  STANDARD_MATERI_CATEGORIES,
} from '../../utils/materiCategoryUtils';

interface MateriManagerProps {
  db: LMSDatabase;
  currentUser: User;
}

export const MateriManager: React.FC<MateriManagerProps> = ({ db, currentUser }) => {
  const availableClasses = React.useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingMateri, setEditingMateri] = useState<Materi | null>(null);
  const [previewDetailMateri, setPreviewDetailMateri] = useState<Materi | null>(null);

  // In-App Media Viewer
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

  // Form state
  const [form, setForm] = useState<Partial<Materi>>({
    judul: '',
    subJudul: '',
    topikSubMateri: '',
    gambarUrl: '',
    kategori: 'Permainan Bola Besar',
    tujuanPembelajaran: '',
    deskripsi: '',
    materiInti: '',
    kelasIds: availableClasses.map((k) => k.id),
    videoUrl: '',
    fileUrl: '',
    status: 'Publish',
  });

  const [imageLoading, setImageLoading] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    try {
      const dataUrl = await processImageUpload(file);
      setForm((prev) => ({ ...prev, gambarUrl: dataUrl }));
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses gambar');
    } finally {
      setImageLoading(false);
      e.target.value = '';
    }
  };

  const [kolomImageLoadingIndex, setKolomImageLoadingIndex] = useState<number | null>(null);

  const handleKolomImageFileChange = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKolomImageLoadingIndex(index);
    try {
      const dataUrl = await processImageUpload(file);
      handleUpdateKolomKustom(index, 'gambarUrl', dataUrl);
    } catch (err: any) {
      alert(err?.message || 'Gagal memproses gambar untuk kolom tambahan');
    } finally {
      setKolomImageLoadingIndex(null);
      e.target.value = '';
    }
  };

  // Toast feedback
  const [toastFeedback, setToastFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const categories = getMateriCategoryList(db.materi);

  const filteredMateri = db.materi.filter((m) => {
    const matchCat = isMateriCategoryMatch(m, selectedKategori);

    const matchQuery =
      m.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.kategori && m.kategori.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.tujuanPembelajaran && m.tujuanPembelajaran.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.materiInti && m.materiInti.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.kontenTeks && m.kontenTeks.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchKelas =
      selectedKelasId === 'Semua' ||
      !m.kelasIds ||
      m.kelasIds.length === 0 ||
      m.kelasIds.includes(selectedKelasId);

    // If teacher, only show materials relevant to their assigned classes or general materials
    if (currentUser?.role === 'GURU') {
      const teacherClassIds = availableClasses.map((k) => k.id);
      const isGeneral = !m.kelasIds || m.kelasIds.length === 0;
      const matchesTeacherClass = m.kelasIds && m.kelasIds.some((cId) => teacherClassIds.includes(cId));
      if (!isGeneral && !matchesTeacherClass) return false;
    }

    return matchCat && matchQuery && matchKelas;
  });

  const handleAddKolomKustom = () => {
    const newCol = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label: '',
      subJudul: '',
      isi: '',
    };
    setForm((prev) => ({
      ...prev,
      kolomKustom: [...(prev.kolomKustom || []), newCol],
    }));
  };

  const handleUpdateKolomKustom = (index: number, field: string, value: string) => {
    setForm((prev) => {
      const updated = [...(prev.kolomKustom || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, kolomKustom: updated };
    });
  };

  const handleRemoveKolomKustom = (index: number) => {
    setForm((prev) => ({
      ...prev,
      kolomKustom: (prev.kolomKustom || []).filter((_, i) => i !== index),
    }));
  };

  const handleOpenAdd = () => {
    setEditingMateri(null);
    setForm({
      judul: '',
      subJudul: '',
      topikSubMateri: '',
      gambarUrl: '',
      kategori: 'Permainan Bola Besar',
      tujuanPembelajaran: '',
      deskripsi: '',
      materiInti: '',
      kolomKustom: [],
      kelasIds: availableClasses.map((k) => k.id),
      videoUrl: '',
      fileUrl: '',
      status: 'Publish',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Materi) => {
    setEditingMateri(m);
    setForm({
      ...m,
      subJudul: m.subJudul || '',
      topikSubMateri: m.topikSubMateri || m.subJudul || '',
      gambarUrl: m.gambarUrl || '',
      kolomKustom: m.kolomKustom ? [...m.kolomKustom] : [],
      tujuanPembelajaran: m.tujuanPembelajaran || '',
      deskripsi: m.deskripsi || '',
      materiInti: m.materiInti || m.kontenTeks || m.konten || '',
      kelasIds: m.kelasIds || (m.kelasId ? [m.kelasId] : availableClasses.map((k) => k.id)),
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul?.trim()) {
      alert('Judul materi harus diisi');
      return;
    }

    const materiIntiText = form.materiInti || '';
    const cleanKolomKustom = (form.kolomKustom || []).filter(
      (col) => (col.label && col.label.trim()) || (col.isi && col.isi.trim())
    );

    if (editingMateri) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        materi: prev.materi.map((m) =>
          m.id === editingMateri.id
            ? ({
                ...m,
                ...form,
                subJudul: form.topikSubMateri || form.subJudul || '',
                topikSubMateri: form.topikSubMateri || form.subJudul || '',
                gambarUrl: form.gambarUrl || '',
                kolomKustom: cleanKolomKustom,
                materiInti: materiIntiText,
                kontenTeks: materiIntiText || m.kontenTeks,
                dibuatPada: m.dibuatPada || new Date().toISOString().slice(0, 10),
              } as Materi)
            : m
        ),
      }));

      // If updated to Publish from non-Publish or edited active materi
      if (form.status === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-mat-${Date.now()}`,
          judul: `Materi Pelajaran: ${form.judul || editingMateri.judul}`,
          pesan: `${currentUser.name} memperbarui modul materi "${form.judul || editingMateri.judul}". Silakan buka untuk membaca.`,
          waktu: 'Baru saja',
          tipe: 'materi',
          dibaca: false,
          targetRole: 'MURID',
          targetId: editingMateri.id,
          targetKelasId: form.kelasIds && form.kelasIds.length === 1 ? form.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    } else {
      const newM: Materi = {
        id: `mat-${Date.now()}`,
        judul: form.judul || 'Materi Baru',
        subJudul: form.topikSubMateri || form.subJudul || '',
        topikSubMateri: form.topikSubMateri || form.subJudul || '',
        kategori: form.kategori || 'Permainan Bola Besar',
        tujuanPembelajaran: form.tujuanPembelajaran || '',
        deskripsi: form.deskripsi || '',
        materiInti: materiIntiText,
        kontenTeks: materiIntiText,
        kolomKustom: cleanKolomKustom,
        kelasIds: form.kelasIds && form.kelasIds.length > 0 ? form.kelasIds : availableClasses.map((k) => k.id),
        status: form.status || 'Publish',
        videoUrl: form.videoUrl || '',
        fileUrl: form.fileUrl || '',
        gambarUrl: form.gambarUrl || '',
        dibuatOleh: currentUser.name,
        guruNama: currentUser.name,
        dibuatPada: new Date().toISOString().slice(0, 10),
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        materi: [newM, ...prev.materi],
      }));

      // Push notification for students if published
      if (newM.status === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-mat-${Date.now()}`,
          judul: `Materi Baru: ${newM.judul}`,
          pesan: `${currentUser.name} mempublikasikan modul materi baru: "${newM.judul}". Silakan pelajari materinya.`,
          waktu: 'Baru saja',
          tipe: 'materi',
          dibaca: false,
          targetRole: 'MURID',
          targetId: newM.id,
          targetKelasId: newM.kelasIds && newM.kelasIds.length === 1 ? newM.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    }

    setToastFeedback({
      type: 'success',
      text: 'Materi berhasil disimpan dan disinkronkan ke Cloud Firestore!',
    });
    setTimeout(() => setToastFeedback(null), 4000);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Yakin ingin menghapus materi "${judul}"?`)) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        materi: prev.materi.filter((m) => m.id !== id),
      }));
    }
  };

  const openMedia = (url: string, title: string, category?: string) => {
    setMediaModal({
      isOpen: true,
      url,
      title,
      category,
    });
  };

  const handleImportMateri = (imported: Materi[]) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      materi: [...imported, ...prev.materi],
    }));
    alert(`Berhasil menambahkan ${imported.length} modul materi baru ke database!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-600" />
            <span>Kelola Materi Pembelajaran PJOK</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun capaian & tujuan pembelajaran, uraian materi & konsep gerak, dan materi inti PJOK
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Upload Berkas Materi</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Modul PJOK</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2.5 transition-all shadow-2xs ${
            toastFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : toastFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-sky-50 text-sky-800 border border-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastFeedback.text}</span>
          </div>
          <button
            onClick={() => setToastFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari materi berdasarkan judul, capaian, atau konsep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <School className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Filter Kelas:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold text-slate-700 flex-1 md:flex-initial"
            >
              <option value="Semua">
                {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas'}
              </option>
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedKategori(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedKategori === cat
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materi Cards Grid */}
      {filteredMateri.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <BookMarked className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Tidak ada materi ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ganti kata kunci pencarian atau buat materi ajar PJOK baru untuk kelas yang dipilih.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Materi Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMateri.map((m) => {
            const materiIntiText = m.materiInti || m.kontenTeks || m.konten || '';
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-[10px] font-extrabold">
                        {m.kategori}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          m.status === 'Publish'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.status || 'Publish'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewDetailMateri(m)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Lihat Tampilan Murid"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Materi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.judul)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Materi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    {m.gambarUrl && (
                      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2.5">
                        <img
                          src={m.gambarUrl}
                          alt={m.judul}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h3 className="font-extrabold text-base text-slate-800 leading-snug">
                      {m.judul}
                    </h3>
                    {(m.topikSubMateri || m.subJudul) && (
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        <span className="text-[11px] text-slate-400 font-normal">Topik/Sub: </span>
                        {m.topikSubMateri || m.subJudul}
                      </p>
                    )}
                  </div>

                  {/* 1. Capaian & Tujuan Pembelajaran (Paling di atas) */}
                  {m.tujuanPembelajaran && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-950">
                      <div className="flex items-center gap-1.5 font-extrabold text-emerald-800 text-[10px] uppercase tracking-wider mb-1">
                        <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1. Capaian & Tujuan Pembelajaran (IKTP):</span>
                      </div>
                      <p className="leading-relaxed line-clamp-2">{m.tujuanPembelajaran}</p>
                    </div>
                  )}

                  {/* 2. Uraian Materi & Konsep Gerak (Setelah Capaian & Tujuan) */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-700">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>2. Uraian Materi & Konsep Gerak:</span>
                    </div>
                    <p className="leading-relaxed text-slate-600 line-clamp-2">{m.deskripsi}</p>
                  </div>

                  {/* 3. Materi Inti (Setelah Uraian Materi) */}
                  {materiIntiText && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/80 text-[11px] text-indigo-950">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-800 text-[10px] uppercase tracking-wider mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>3. Materi Inti:</span>
                      </div>
                      <p className="leading-relaxed text-indigo-900/80 line-clamp-2">
                        {materiIntiText.replace(/###|\*\*|#/g, '')}
                      </p>
                    </div>
                  )}

                  {/* 4. Kolom & Sub-Materi Tambahan jika ada */}
                  {m.kolomKustom && m.kolomKustom.length > 0 && (
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>{m.kolomKustom.length} Kolom / Sub-Materi Tambahan</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.kolomKustom.map((col, idx) => (
                          <span
                            key={col.id || idx}
                            className="px-2 py-0.5 bg-white border border-amber-200 rounded-md text-[10px] font-semibold text-amber-900"
                          >
                            {col.label} {col.subJudul ? `• ${col.subJudul}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Classes */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Target Rombel:</span>
                    {m.kelasIds && m.kelasIds.length > 0 ? (
                      m.kelasIds.slice(0, 3).map((cid) => {
                        const k = (db.kelas || []).find((kls) => kls.id === cid);
                        return (
                          <span
                            key={cid}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold"
                          >
                            {k?.nama || cid}
                          </span>
                        );
                      })
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                        Semua Kelas
                      </span>
                    )}
                    {m.kelasIds && m.kelasIds.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{m.kelasIds.length - 3} lagi</span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions & Author */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">
                    Pengampu:{' '}
                    <strong className="text-slate-700">
                      {m.guruNama || m.dibuatOleh || currentUser.name}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {m.videoUrl && (
                      <button
                        type="button"
                        onClick={() => openMedia(m.videoUrl!, `Video: ${m.judul}`, 'YouTube PJOK')}
                        className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 font-bold text-[11px] transition-colors"
                        title="Buka Video di Aplikasi"
                      >
                        <Play className="w-3 h-3 fill-rose-600" />
                        Video Gerak
                      </button>
                    )}

                    {m.fileUrl && (
                      <button
                        type="button"
                        onClick={() => openMedia(m.fileUrl!, `Dokumen: ${m.judul}`, 'Modul & Dokumen')}
                        className="px-2.5 py-1 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 font-bold text-[11px] transition-colors"
                        title="Buka Dokumen di Aplikasi"
                      >
                        <FileText className="w-3 h-3" />
                        Modul Dokumen
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPreviewDetailMateri(m)}
                      className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 font-bold text-[11px] transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail In-App Preview Modal (Matching 1-2-3 Order) */}
      {previewDetailMateri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative my-6 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    {previewDetailMateri.kategori}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold">
                    Preview Tampilan Pembelajaran
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 mt-2">
                  {previewDetailMateri.judul}
                </h3>
                {previewDetailMateri.subJudul && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    {previewDetailMateri.subJudul}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pengampu: {previewDetailMateri.guruNama || previewDetailMateri.dibuatOleh || currentUser.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDetailMateri(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              {/* Gambar Materi jika ada */}
              {previewDetailMateri.gambarUrl && (
                <div className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs flex items-center justify-center max-h-72">
                  <img
                    src={previewDetailMateri.gambarUrl}
                    alt={previewDetailMateri.judul}
                    className="max-h-72 w-auto max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* 1. Capaian & Tujuan Pembelajaran (Paling di atas) */}
              {previewDetailMateri.tujuanPembelajaran && (
                <div className="p-4 bg-emerald-50/75 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span>1. Capaian & Tujuan Pembelajaran (IKTP)</span>
                  </div>
                  <div className="pl-8">
                    <FormattedMateriText content={previewDetailMateri.tujuanPembelajaran} justify />
                  </div>
                </div>
              )}

              {/* 2. Uraian Materi & Konsep Gerak */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span>2. Uraian Materi & Konsep Gerak</span>
                </div>
                <div className="pl-8">
                  <FormattedMateriText content={previewDetailMateri.deskripsi} justify />
                </div>
              </div>

              {/* 3. Materi Inti */}
              {(previewDetailMateri.materiInti || previewDetailMateri.kontenTeks || previewDetailMateri.konten) && (
                <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider mb-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span>3. Materi Inti & Panduan Pelaksanaan Teknik</span>
                  </div>
                  <div className="pl-8">
                    <FormattedMateriText
                      content={previewDetailMateri.materiInti || previewDetailMateri.kontenTeks || previewDetailMateri.konten || ''}
                      justify
                    />
                  </div>
                </div>
              )}

              {/* 4. Kolom & Sub-Materi Tambahan jika ada */}
              {previewDetailMateri.kolomKustom && previewDetailMateri.kolomKustom.length > 0 && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                    <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span>4. Kolom & Sub-Materi Tambahan (Judul Manual)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                    {previewDetailMateri.kolomKustom.map((kolom, i) => (
                      <div key={kolom.id || i} className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2 w-full max-w-full min-w-0 overflow-hidden break-words">
                        <div>
                          <h5 className="font-extrabold text-xs text-amber-950">{kolom.label}</h5>
                          {kolom.subJudul && (
                            <p className="text-[11px] font-bold text-amber-800 mt-0.5">{kolom.subJudul}</p>
                          )}
                        </div>

                        {kolom.gambarUrl && (
                          <div
                            className="w-full rounded-xl overflow-hidden bg-slate-900 border border-amber-200/80 flex items-center justify-center max-h-52 cursor-pointer group relative shadow-2xs"
                            onClick={() =>
                              setMediaModal({
                                isOpen: true,
                                url: kolom.gambarUrl!,
                                title: `Gambar: ${kolom.label}`,
                                category: 'Ilustrasi Kolom Tambahan',
                              })
                            }
                            title="Klik untuk memperbesar gambar"
                          >
                            <img
                              src={kolom.gambarUrl}
                              alt={kolom.label}
                              className="max-h-52 w-auto max-w-full object-contain group-hover:scale-101 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs">
                              <Eye className="w-3 h-3" />
                              <span>Perbesar</span>
                            </div>
                          </div>
                        )}

                        <div className="w-full max-w-full min-w-0 overflow-hidden break-words">
                          <FormattedMateriText content={kolom.isi} justify />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Embedded In-App Video */}
              {previewDetailMateri.videoUrl && (
                <div className="p-4 bg-slate-950 text-white rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-white">Video Peragaan Gerak PJOK</h4>
                    </div>
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800">
                    <iframe
                      src={parseMediaUrl(previewDetailMateri.videoUrl).embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={`Video: ${previewDetailMateri.judul}`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDetailMateri(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Materi Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative my-6 max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-3 shrink-0">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-full">
                {editingMateri ? 'Perbarui Modul PJOK' : 'Modul Ajar PJOK Baru'}
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                {editingMateri ? 'Edit Materi PJOK' : 'Tambah Modul Ajar PJOK Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi modul ajar dengan susunan terstruktur: Capaian & Tujuan di atas, Uraian Konsep Gerak, dan Materi Inti.
              </p>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Materi PJOK *</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Permainan Bola Voli"
                    value={form.judul || ''}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Topik / Sub Materi (Diisi Manual) *
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Teknik Passing Bawah & Passing Atas"
                    value={form.topikSubMateri ?? form.subJudul ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, topikSubMateri: e.target.value, subJudul: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Topik atau sub materi diisikan bebas manual sesuai silabus guru
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Olahraga</label>
                  <select
                    value={form.kategori || 'Permainan Bola Besar'}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-xs font-medium"
                  >
                    {STANDARD_MATERI_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {form.kategori &&
                      !STANDARD_MATERI_CATEGORIES.includes(form.kategori) && (
                        <option value={form.kategori}>{form.kategori}</option>
                      )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Publikasi</label>
                  <select
                    value={form.status || 'Publish'}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-xs"
                  >
                    <option value="Publish">Publish (Bisa Diakses Murid)</option>
                    <option value="Draft">Draft (Hanya Guru/Admin)</option>
                  </select>
                </div>
              </div>

              {/* Upload Gambar Materi */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Upload Gambar Materi / Bagan Gerak</span>
                  </label>
                  {form.gambarUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, gambarUrl: '' }))}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Hapus Gambar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-slate-600 font-semibold text-xs">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>
                      {imageLoading
                        ? 'Sedang memproses gambar...'
                        : form.gambarUrl
                        ? 'Ganti Gambar'
                        : 'Pilih / Upload Gambar (JPG/PNG/WEBP)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      disabled={imageLoading}
                    />
                  </label>

                  {form.gambarUrl && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-900 flex items-center justify-center">
                      <img
                        src={form.gambarUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Gambar akan otomatis terkompresi dan tampil pada modul ajar murid serta preview materi.
                </p>
              </div>

              {/* Target Kelas Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Target Kelas / Rombel</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-28 overflow-y-auto">
                  {availableClasses.map((k) => {
                    const isChecked = form.kelasIds?.includes(k.id) ?? false;
                    return (
                      <label key={k.id} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = form.kelasIds || [];
                            if (e.target.checked) {
                              setForm({ ...form, kelasIds: [...cur, k.id] });
                            } else {
                              setForm({ ...form, kelasIds: cur.filter((id) => id !== k.id) });
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-700">Kelas {k.nama}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 1. Capaian & Tujuan Pembelajaran (Paling di atas) */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 space-y-2 w-full max-w-full min-w-0">
                <label className="flex items-center gap-1.5 font-extrabold text-emerald-900 text-xs">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>1. Capaian & Tujuan Pembelajaran (Fase F / IKTP) *</span>
                </label>
                <p className="text-[10px] text-emerald-800">
                  Ditempatkan paling di atas sebagai target kompetensi pembelajaran yang harus dicapai murid. Otomatis melanjutkan penomoran gaya Microsoft Word saat menekan Enter.
                </p>
                <AutoNumberedTextArea
                  rows={3}
                  placeholder={`1. Peserta didik mampu menganalisis keterampilan gerak spesifik...\n2. Peserta didik dapat mempraktikkan variasi pola gerak secara berkelompok...`}
                  value={form.tujuanPembelajaran || ''}
                  onChange={(val) => setForm({ ...form, tujuanPembelajaran: val })}
                  theme="emerald"
                  showHeadingButton={false}
                />
              </div>

              {/* 2. Uraian Materi & Konsep Gerak (Setelah Capaian) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 w-full max-w-full min-w-0">
                <label className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>2. Uraian Materi & Konsep Gerak *</span>
                </label>
                <p className="text-[10px] text-slate-500">
                  Penjelasan konseptual mengenai prinsip gerak, biomekanika, dan pengantar materi. Tekan Enter untuk otomatis lanjut nomor / huruf.
                </p>
                <AutoNumberedTextArea
                  rows={3}
                  placeholder="Materi mencakup pengenalan posisi siap (ready position), perkenaan bola pada lengan bawah..."
                  value={form.deskripsi || ''}
                  onChange={(val) => setForm({ ...form, deskripsi: val })}
                  theme="slate"
                />
              </div>

              {/* 3. Materi Inti (Setelah Uraian Materi) */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200/70 space-y-2 w-full max-w-full min-w-0">
                <div>
                  <label className="flex items-center gap-1.5 font-extrabold text-indigo-950 text-xs">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>3. Materi Inti (Panduan Teknik & Tahapan Gerak) *</span>
                  </label>
                  <p className="text-[10px] text-indigo-800 mt-0.5">
                    Penulisan otomatis dirapikan: penomoran (1., 2., a., b.) atau strip (-), tulisan tersusun rapi dengan indent gantung gaya Microsoft Word tanpa melebihi batas kolom.
                  </p>
                </div>
                <AutoNumberedTextArea
                  rows={7}
                  placeholder={`### 1. Sikap Awal (Ready Position)\n1. Berdiri dengan kedua kaki dibuka selebar bahu.\n2. Lutut ditekuk sedikit dan berat badan bertumpu pada kedua ujung kaki bagian depan.\n\n### 2. Pelaksanaan Gerak\na. Ayunkan kedua lengan secara bersamaan dari bawah ke atas menuju arah datangnya bola.\nb. Pandangan selalu mengikuti jalannya bola.`}
                  value={form.materiInti || ''}
                  onChange={(val) => setForm({ ...form, materiInti: val })}
                  theme="indigo"
                />
              </div>

              {/* 4. Kolom & Sub-Materi Tambahan Sesuai Keinginan Guru (Ada Gambar Ada Materi) */}
              <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3 w-full max-w-full min-w-0">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="flex items-center gap-1.5 font-extrabold text-amber-950 text-xs">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>4. Tambah Kolom & Sub-Materi Tambahan (Ada Gambar Ada Materi)</span>
                    </label>
                    <p className="text-[10px] text-amber-800 mt-0.5">
                      Guru dapat menambahkan kolom tambahan baru dengan judul manual, gambar ilustrasi gerak pendukung, serta materi berpenomoran otomatis.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddKolomKustom}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Kolom</span>
                  </button>
                </div>

                {(!form.kolomKustom || form.kolomKustom.length === 0) ? (
                  <div className="text-center p-3 bg-white/80 border border-dashed border-amber-300 rounded-xl text-amber-800 text-[11px]">
                    Belum ada kolom materi tambahan. Klik tombol <strong>+ Tambah Kolom</strong> di atas jika materi memiliki banyak sub-pokok bahasan atau ilustrasi gambar tambahan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.kolomKustom.map((kolom, idx) => (
                      <div key={kolom.id || idx} className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2.5 w-full max-w-full min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 text-[11px] flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 inline-flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>Kolom Tambahan #{idx + 1} (Judul Ditulis Manual)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKolomKustom(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Kolom Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title and Subtitle inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 text-[10px] mb-0.5">
                              Nama / Judul Kolom Tambahan (Tulis Manual) *
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: Variasi Latihan Berpasangan & Formasi"
                              value={kolom.label || ''}
                              onChange={(e) => handleUpdateKolomKustom(idx, 'label', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 text-[10px] mb-0.5">
                              Sub Judul Kolom Tambahan (Tulis Manual - Opsional)
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: Latihan Mandiri Dinding & Berpasangan"
                              value={kolom.subJudul || ''}
                              onChange={(e) => handleUpdateKolomKustom(idx, 'subJudul', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        {/* Gambar Kolom Tambahan (Ada Gambar Ada Materi) */}
                        <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 font-bold text-slate-700 text-[10px]">
                              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                              <span>Gambar Pendukung Kolom Ini (Ada Gambar Ada Materi)</span>
                            </label>
                            {kolom.gambarUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdateKolomKustom(idx, 'gambarUrl', '')}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                Hapus Gambar
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 border border-dashed border-amber-300 rounded-lg cursor-pointer transition text-amber-900 font-semibold text-[11px]">
                              <Upload className="w-3.5 h-3.5 text-amber-600" />
                              <span>
                                {kolomImageLoadingIndex === idx
                                  ? 'Memproses gambar...'
                                  : kolom.gambarUrl
                                  ? 'Ganti Gambar Kolom'
                                  : 'Upload Gambar Kolom (JPG/PNG/WEBP)'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleKolomImageFileChange(idx, e)}
                                className="hidden"
                                disabled={kolomImageLoadingIndex === idx}
                              />
                            </label>

                            {kolom.gambarUrl && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-amber-300 shrink-0 bg-slate-900 flex items-center justify-center">
                                <img
                                  src={kolom.gambarUrl}
                                  alt="Preview Kolom"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Isi Uraian Materi Kolom */}
                        <div>
                          <label className="block font-semibold text-slate-700 text-[10px] mb-1">
                            Isi Uraian Materi Kolom (Tersusun Rapi & Berpenomoran Otomatis) *
                          </label>
                          <AutoNumberedTextArea
                            rows={3}
                            placeholder="Tulis uraian materi kolom, tahapan gerak (1., 2., a., b.), atau catatan teknis..."
                            value={kolom.isi || ''}
                            onChange={(val) => handleUpdateKolomKustom(idx, 'isi', val)}
                            theme="amber"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links: Video & Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Link Video Peraga (YouTube / Drive)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={form.videoUrl || ''}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Video akan diputar langsung di dalam aplikasi
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Link Modul / Dokumen (Google Drive / PDF)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={form.fileUrl || ''}
                    onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Dibuka di dalam modal viewer aplikasi
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-sm text-xs"
                >
                  {editingMateri ? 'Simpan Perubahan' : 'Terbitkan Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global In-App Media Viewer Modal */}
      <InAppMediaModal
        isOpen={mediaModal.isOpen}
        onClose={() => setMediaModal((prev) => ({ ...prev, isOpen: false }))}
        url={mediaModal.url}
        title={mediaModal.title}
        category={mediaModal.category}
      />

      {/* Upload Data Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        type="materi"
        onImport={handleImportMateri}
      />
    </div>
  );
};
