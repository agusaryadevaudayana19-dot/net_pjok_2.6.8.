import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  ExternalLink,
  Users,
  Search,
  School,
  X,
  Eye,
  Award,
  MessageSquare,
  Sparkles,
  Check,
  ChevronRight,
  Filter,
  Upload,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';
import { Tugas, PengumpulanTugas, User, SoalTugas, NotifikasiItem, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { InAppMediaModal } from './InAppMediaModal';
import { UploadDataModal } from './UploadDataModal';

interface TugasManagerProps {
  db: LMSDatabase;
  currentUser: User;
}

export const TugasManager: React.FC<TugasManagerProps> = ({ db, currentUser }) => {
  const availableClasses = React.useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedTab, setSelectedTab] = useState<'tugas' | 'pengumpulan'>('tugas');
  const [selectedTugasId, setSelectedTugasId] = useState<string>('Semua');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPengumpulanStatus, setFilterPengumpulanStatus] = useState<
    'semua' | 'menunggu' | 'dinilai'
  >('semua');
  const [filterPublikasi, setFilterPublikasi] = useState<'Semua' | 'Publish' | 'Draft'>('Semua');

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

  // Modals & Active states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTugas, setEditingTugas] = useState<Tugas | null>(null);
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<PengumpulanTugas | null>(null);
  const [reviewNilai, setReviewNilai] = useState<number>(85);
  const [reviewCatatan, setReviewCatatan] = useState<string>('');

  const handleImportTugas = (imported: Tugas[]) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      tugas: [...imported, ...prev.tugas],
    }));
    alert(`Berhasil menambahkan ${imported.length} tugas baru ke database!`);
  };

  // Form state
  const [form, setForm] = useState<Partial<Tugas>>({
    judul: '',
    kategori: 'Praktik Gerak Mandiri',
    jenisPengumpulan: 'JAWAB_LANGSUNG',
    instruksi: '',
    deadline: '2026-09-30T23:59',
    kelasIds: availableClasses.map((k) => k.id),
    status: 'Publish',
  });

  const categories = [
    'Praktik Gerak Mandiri',
    'Analisis Video Pertandingan',
    'Portofolio Kebugaran Jasmani',
    'Laporan Pola Hidup Sehat',
    'Tugas Teori Aturan Olahraga',
  ];

  // Filtering tasks
  const filteredTugas = db.tugas.filter((t) => {
    const matchQuery =
      t.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subJudul && t.subJudul.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.instruksi.toLowerCase().includes(searchQuery.toLowerCase());

    const matchKelas =
      selectedKelasId === 'Semua' ||
      !t.kelasIds ||
      t.kelasIds.length === 0 ||
      t.kelasIds.includes(selectedKelasId);

    // If teacher, only show tasks for their assigned classes or general
    if (currentUser?.role === 'GURU') {
      const teacherClassIds = availableClasses.map((k) => k.id);
      const isGeneral = !t.kelasIds || t.kelasIds.length === 0;
      const matchesTeacherClass = t.kelasIds && t.kelasIds.some((cId) => teacherClassIds.includes(cId));
      if (!isGeneral && !matchesTeacherClass) return false;
    }

    const isDraft = t.status === 'Draft' || t.statusPublikasi === 'Draft';
    const matchPublikasi =
      filterPublikasi === 'Semua' ||
      (filterPublikasi === 'Draft' && isDraft) ||
      (filterPublikasi === 'Publish' && !isDraft);

    return matchQuery && matchKelas && matchPublikasi;
  });

  const handleTogglePublikasi = (t: Tugas) => {
    const isDraft = t.status === 'Draft' || t.statusPublikasi === 'Draft';
    const newStatus = isDraft ? 'Publish' : 'Draft';
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      tugas: prev.tugas.map((item) =>
        item.id === t.id
          ? {
              ...item,
              status: newStatus as any,
              statusPublikasi: newStatus as any,
            }
          : item
      ),
    }));

    if (newStatus === 'Publish') {
      const notif: NotifikasiItem = {
        id: `notif-tug-${Date.now()}`,
        judul: `Tugas Baru: ${t.judul}`,
        pesan: `${currentUser.name} mempublikasikan tugas "${t.judul}". Silakan cek lembar penugasan dan kumpulkan tepat waktu.`,
        waktu: 'Baru saja',
        tipe: 'tugas',
        dibaca: false,
        targetRole: 'MURID',
        targetId: t.id,
        targetKelasId: t.kelasIds && t.kelasIds.length === 1 ? t.kelasIds[0] : (t.kelasId || 'ALL'),
      };
      dataStorage.pushNotifikasi(notif);
    }
  };

  // Submissions calculation
  const allSubmissions = db.pengumpulanTugas;
  const waitingGrading = allSubmissions.filter(
    (p) => p.nilai === undefined || p.nilai === null
  ).length;
  const gradedSubmissions = allSubmissions.filter(
    (p) => p.nilai !== undefined && p.nilai !== null
  ).length;

  const filteredSubmissions = allSubmissions.filter((p) => {
    // If teacher, only show submissions from teacher's assigned classes
    if (currentUser?.role === 'GURU') {
      const teacherClassIds = availableClasses.map((k) => k.id);
      if (p.kelasId && !teacherClassIds.includes(p.kelasId)) return false;
    }

    const matchTugas = selectedTugasId === 'Semua' || p.tugasId === selectedTugasId;
    const matchKelas = selectedKelasId === 'Semua' || p.kelasId === selectedKelasId;
    const matchStatus =
      filterPengumpulanStatus === 'semua' ||
      (filterPengumpulanStatus === 'menunggu' && (p.nilai === undefined || p.nilai === null)) ||
      (filterPengumpulanStatus === 'dinilai' && p.nilai !== undefined && p.nilai !== null);

    const matchSearch =
      p.muridNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tugasJudul && p.tugasJudul.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((p.catatanMurid || p.catatanSiswa) && (p.catatanMurid || p.catatanSiswa)!.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchTugas && matchKelas && matchStatus && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingTugas(null);
    setForm({
      judul: '',
      kategori: 'Praktik Gerak Mandiri',
      jenisPengumpulan: 'JAWAB_LANGSUNG',
      instruksi: '',
      daftarSoal: [
        {
          id: `soal-${Date.now()}-1`,
          nomor: 1,
          pertanyaan: '',
          petunjuk: '',
          bobot: 100,
        },
      ],
      deadline: '2026-09-30T23:59',
      kelasIds: availableClasses.map((k) => k.id),
      status: 'Publish',
      statusPublikasi: 'Publish',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tugas) => {
    setEditingTugas(t);
    const existingSoal =
      t.daftarSoal && t.daftarSoal.length > 0
        ? t.daftarSoal
        : t.jenisPengumpulan === 'JAWAB_LANGSUNG' || t.jenisPengumpulan === 'KEDUANYA' || !t.jenisPengumpulan
        ? [
            {
              id: `soal-${Date.now()}-1`,
              nomor: 1,
              pertanyaan: t.instruksi || '',
              petunjuk: '',
              bobot: 100,
            },
          ]
        : [];

    setForm({
      ...t,
      jenisPengumpulan: t.jenisPengumpulan || 'JAWAB_LANGSUNG',
      daftarSoal: existingSoal,
      kelasIds: t.kelasIds || (t.kelasId ? [t.kelasId] : availableClasses.map((k) => k.id)),
    });
    setIsModalOpen(true);
  };

  const handleAddSoal = () => {
    const cur = form.daftarSoal || [];
    const nextNomor = cur.length + 1;
    const newS: SoalTugas = {
      id: `soal-${Date.now()}-${nextNomor}`,
      nomor: nextNomor,
      pertanyaan: '',
      petunjuk: '',
      bobot: 100,
    };
    setForm((prev) => ({
      ...prev,
      daftarSoal: [...(prev.daftarSoal || []), newS],
    }));
  };

  const handleRemoveSoal = (index: number) => {
    const cur = form.daftarSoal || [];
    const updated = cur.filter((_, i) => i !== index).map((s, idx) => ({ ...s, nomor: idx + 1 }));
    setForm((prev) => ({
      ...prev,
      daftarSoal: updated,
    }));
  };

  const handleUpdateSoal = (index: number, field: keyof SoalTugas, val: any) => {
    const cur = [...(form.daftarSoal || [])];
    if (cur[index]) {
      cur[index] = { ...cur[index], [field]: val };
      setForm((prev) => ({ ...prev, daftarSoal: cur }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul?.trim()) {
      alert('Judul tugas harus diisi');
      return;
    }

    const finalStatus = form.status === 'Draft' || form.statusPublikasi === 'Draft' ? 'Draft' : 'Publish';
    const isJawabLangsung = form.jenisPengumpulan === 'JAWAB_LANGSUNG' || form.jenisPengumpulan === 'KEDUANYA' || !form.jenisPengumpulan;

    // Filter and clean questions
    let cleanedDaftarSoal: SoalTugas[] = [];
    if (isJawabLangsung && form.daftarSoal) {
      cleanedDaftarSoal = form.daftarSoal
        .filter((s) => s.pertanyaan && s.pertanyaan.trim())
        .map((s, idx) => ({ ...s, nomor: idx + 1 }));

      // If direct answering is picked but no specific questions were typed, use instruksi as Soal 1
      if (cleanedDaftarSoal.length === 0 && form.instruksi?.trim()) {
        cleanedDaftarSoal = [
          {
            id: `soal-${Date.now()}-1`,
            nomor: 1,
            pertanyaan: form.instruksi.trim(),
            petunjuk: '',
            bobot: 100,
          },
        ];
      }
    }

    if (editingTugas) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        tugas: prev.tugas.map((item) =>
          item.id === editingTugas.id
            ? ({
                ...item,
                ...form,
                daftarSoal: cleanedDaftarSoal,
                jenisPengumpulan: form.jenisPengumpulan || 'JAWAB_LANGSUNG',
                status: finalStatus as any,
                statusPublikasi: finalStatus as any,
              } as Tugas)
            : item
        ),
      }));

      if (finalStatus === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-tug-${Date.now()}`,
          judul: `Tugas PJOK: ${form.judul || editingTugas.judul}`,
          pesan: `${currentUser.name} memperbarui tugas "${form.judul || editingTugas.judul}". Cek instruksi dan batas waktu pengerjaan.`,
          waktu: 'Baru saja',
          tipe: 'tugas',
          dibaca: false,
          targetRole: 'MURID',
          targetId: editingTugas.id,
          targetKelasId: form.kelasIds && form.kelasIds.length === 1 ? form.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    } else {
      const newT: Tugas = {
        id: `tug-${Date.now()}`,
        judul: form.judul || 'Tugas Baru',
        subJudul: form.subJudul || '',
        kategori: form.kategori || 'Praktik Gerak Mandiri',
        instruksi: form.instruksi || (cleanedDaftarSoal[0]?.pertanyaan ?? ''),
        daftarSoal: cleanedDaftarSoal,
        jenisPengumpulan: form.jenisPengumpulan || 'JAWAB_LANGSUNG',
        deadline: form.deadline || '2026-09-30T23:59',
        kelasIds: form.kelasIds && form.kelasIds.length > 0 ? form.kelasIds : availableClasses.map((k) => k.id),
        status: finalStatus,
        statusPublikasi: finalStatus,
        dibuatOleh: currentUser.name,
        guruNama: currentUser.name,
        dibuatPada: new Date().toISOString().slice(0, 10),
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        tugas: [newT, ...prev.tugas],
      }));

      if (finalStatus === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-tug-${Date.now()}`,
          judul: `Tugas Baru: ${newT.judul}`,
          pesan: `${currentUser.name} memberikan tugas baru: "${newT.judul}". Segera periksa lembar instruksi tugas.`,
          waktu: 'Baru saja',
          tipe: 'tugas',
          dibaca: false,
          targetRole: 'MURID',
          targetId: newT.id,
          targetKelasId: newT.kelasIds && newT.kelasIds.length === 1 ? newT.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Yakin ingin menghapus tugas "${judul}"?`)) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        tugas: prev.tugas.filter((item) => item.id !== id),
        pengumpulanTugas: prev.pengumpulanTugas.filter((p) => p.tugasId !== id),
      }));
    }
  };

  const handleOpenReview = (submission: PengumpulanTugas) => {
    setActiveReviewSubmission(submission);
    setReviewNilai(submission.nilai ?? 85);
    setReviewCatatan(submission.komentarGuru || submission.catatanGuru || '');
  };

  const handleSaveNilai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewSubmission) return;

    dataStorage.updateDatabase((prev) => {
      const updatedSubmissions = prev.pengumpulanTugas.map((sub) => {
        if (sub.id === activeReviewSubmission.id) {
          return {
            ...sub,
            nilai: Number(reviewNilai),
            komentarGuru: reviewCatatan,
            catatanGuru: reviewCatatan,
            status: 'Dinilai' as const,
          };
        }
        return sub;
      });

      return {
        ...prev,
        pengumpulanTugas: updatedSubmissions,
      };
    });

    setActiveReviewSubmission(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-sky-200">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Penugasan Mandiri & Analisis Gerak PJOK</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Tugas PJOK
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Kelola penugasan rekaman video gerak, analisis taktik pertandingan, dan tinjau hasil pengerjaan serta penilaian murid.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 backdrop-blur-xs border border-white/20"
            >
              <Upload className="w-4 h-4 text-sky-200" />
              <span>Upload Tugas</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-white text-sky-950 hover:bg-sky-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4 text-sky-600" />
              Buat Tugas Baru
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/15">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-sky-200 font-medium">Total Tugas</p>
            <p className="text-xl font-black mt-0.5">{db.tugas.length}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-sky-200 font-medium">Pengumpulan Masuk</p>
            <p className="text-xl font-black mt-0.5">{allSubmissions.length}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-amber-200 font-medium">Menunggu Penilaian</p>
            <p className="text-xl font-black mt-0.5 text-amber-300">{waitingGrading}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-emerald-200 font-medium">Sudah Dinilai</p>
            <p className="text-xl font-black mt-0.5 text-emerald-300">{gradedSubmissions}</p>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation (Daftar Tugas vs Rekap Pengumpulan) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab('tugas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTab === 'tugas'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Daftar Tugas PJOK ({db.tugas.length})
          </button>
          <button
            onClick={() => setSelectedTab('pengumpulan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTab === 'pengumpulan'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Review Pengumpulan Murid ({allSubmissions.length})
            {waitingGrading > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 rounded-full text-[10px] font-extrabold">
                {waitingGrading}
              </span>
            )}
          </button>
        </div>

        {/* Filter Kelas & Search */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tugas / murid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <select
            value={filterPublikasi}
            onChange={(e) => setFilterPublikasi(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="Semua">Semua Status Publikasi</option>
            <option value="Publish">🟢 Diterbitkan (Publish)</option>
            <option value="Draft">🟡 Draft (Belum Terbit)</option>
          </select>

          <select
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="Semua">
              {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Rombel'}
            </option>
            {availableClasses.map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama} (Tingkat {k.tingkat})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: DAFTAR TUGAS PJOK */}
      {selectedTab === 'tugas' && (
        <div className="space-y-4">
          {filteredTugas.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">Tidak ada tugas ditemukan</h3>
              <p className="text-xs text-slate-500">
                Silakan buat tugas praktik gerak atau analisis video baru untuk murid Anda.
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Buat Tugas Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredTugas.map((t) => {
                const subs = db.pengumpulanTugas.filter((p) => p.tugasId === t.id);
                const pendingCount = subs.filter((p) => p.nilai === undefined || p.nilai === null).length;
                const isDraft = t.status === 'Draft' || t.statusPublikasi === 'Draft';

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md ${
                      isDraft ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-extrabold">
                            {t.kategori || 'Praktik Gerak'}
                          </span>

                          {/* Status Publikasi Badge */}
                          {!isDraft ? (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terbit (Publish)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Draft
                            </span>
                          )}

                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Batas: {new Date(t.deadline).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePublikasi(t)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                              isDraft
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                            }`}
                            title={isDraft ? 'Publikasikan ke murid sekarang' : 'Tarik kembali ke Draft'}
                          >
                            {isDraft ? 'Terbitkan' : 'Jadikan Draft'}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Tugas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.judul)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Tugas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-base text-slate-800 leading-snug">
                          {t.judul}
                        </h3>
                        {t.subJudul && (
                          <p className="text-xs text-sky-700 font-bold mt-1">
                            {t.subJudul}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                          {t.instruksi}
                        </p>
                      </div>

                      {/* Question count badge */}
                      {t.daftarSoal && t.daftarSoal.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                            <ListOrdered className="w-3.5 h-3.5 text-sky-600" />
                            {t.daftarSoal.length} Butir Soal Terlampir
                          </span>
                        </div>
                      )}

                      {/* Target Classes */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-semibold">Target Rombel:</span>
                        {t.kelasIds && t.kelasIds.length > 0 ? (
                          t.kelasIds.slice(0, 3).map((cid) => {
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
                            Semua Rombel
                          </span>
                        )}
                        {t.kelasIds && t.kelasIds.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{t.kelasIds.length - 3} lagi</span>
                        )}
                      </div>
                    </div>

                    {/* Footer / Submissions review action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-bold text-slate-700">{subs.length} Murid</span>{' '}
                        <span className="text-slate-400 text-[11px]">mengumpulkan</span>
                        {pendingCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                            {pendingCount} belum dinilai
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTugasId(t.id);
                          setSelectedTab('pengumpulan');
                        }}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        Tinjau Pengumpulan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW PENGUMPULAN MURID */}
      {selectedTab === 'pengumpulan' && (
        <div className="space-y-4">
          {/* Submissions Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Pilih Tugas:</span>
              <select
                value={selectedTugasId}
                onChange={(e) => setSelectedTugasId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Semua">Semua Penugasan</option>
                {db.tugas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.judul}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status Penilaian:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setFilterPengumpulanStatus('semua')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterPengumpulanStatus === 'semua' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Semua ({allSubmissions.length})
                </button>
                <button
                  onClick={() => setFilterPengumpulanStatus('menunggu')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterPengumpulanStatus === 'menunggu'
                      ? 'bg-amber-400 text-slate-900 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Belum Dinilai ({waitingGrading})
                </button>
                <button
                  onClick={() => setFilterPengumpulanStatus('dinilai')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterPengumpulanStatus === 'dinilai'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Selesai Dinilai ({gradedSubmissions})
                </button>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">Tidak ada pengumpulan</h3>
              <p className="text-xs text-slate-500">
                Belum ada murid yang mengumpulkan tugas dengan filter yang dipilih saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => {
                const tugasObj = (db.tugas || []).find((t) => t.id === sub.tugasId);
                const muridObj = (db.users || []).find((m) => m.id === sub.muridId);
                const kelasObj = (db.kelas || []).find((k) => k.id === (sub.kelasId || muridObj?.kelasId));
                const isGraded = sub.nilai !== undefined && sub.nilai !== null;

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-800">{sub.muridNama}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            Kelas {kelasObj?.nama || muridObj?.kelasId || 'XI'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • Dikumpulkan: {sub.tanggalKumpul}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-sky-700 mt-0.5">
                          Tugas: {sub.tugasJudul || tugasObj?.judul || 'Praktik Gerak PJOK'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isGraded ? (
                          <div className="text-right">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs inline-flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Nilai: {sub.nilai}
                            </span>
                          </div>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl font-bold text-xs inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Menunggu Penilaian
                          </span>
                        )}

                        <button
                          onClick={() => handleOpenReview(sub)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          {isGraded ? 'Edit Nilai / Masukan' : 'Beri Nilai & Evaluasi'}
                        </button>
                      </div>
                    </div>

                    {/* Student notes & attachment links */}
                    <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2 text-xs">
                      {sub.isiJawaban || sub.catatanMurid || sub.catatanSiswa ? (
                        <p className="text-slate-700 leading-relaxed italic">
                          "{sub.isiJawaban || sub.catatanMurid || sub.catatanSiswa}"
                        </p>
                      ) : (
                        <p className="text-slate-400 italic">Tidak ada catatan pengantar dari murid.</p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {sub.linkVideo && (
                          <button
                            type="button"
                            onClick={() =>
                              setMediaModal({
                                isOpen: true,
                                url: sub.linkVideo!,
                                title: `Video Tugas - ${sub.muridNama}`,
                                category: 'Video Tugas Murid',
                              })
                            }
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-100 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" /> Lihat Video Gerakan Murid
                          </button>
                        )}
                        {sub.fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setMediaModal({
                                isOpen: true,
                                url: sub.fileUrl!,
                                title: `Dokumen Tugas - ${sub.muridNama}`,
                                category: 'Dokumen / Portofolio',
                              })
                            }
                            className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 hover:bg-sky-100 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> Lihat Dokumen / Portofolio
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Teacher feedback display */}
                    {(sub.komentarGuru || sub.catatanGuru) && (
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px] text-emerald-800">
                            Masukan & Catatan Guru:
                          </span>
                          <p className="mt-0.5">{sub.komentarGuru || sub.catatanGuru}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review & Input Nilai Modal */}
      {activeReviewSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setActiveReviewSubmission(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 font-bold text-[10px] rounded-full">
                Form Penilaian Guru
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                Penilaian Tugas: {activeReviewSubmission.muridNama}
              </h3>
              <p className="text-xs text-slate-500">
                {activeReviewSubmission.tugasJudul || 'Tugas Praktik PJOK'}
              </p>
            </div>

            {/* Preview Jawaban & Lampiran Murid */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs max-h-64 overflow-y-auto">
              {(() => {
                const correspondingTugas = db.tugas.find((t) => t.id === activeReviewSubmission.tugasId);
                const hasDaftarSoal = correspondingTugas?.daftarSoal && correspondingTugas.daftarSoal.length > 0;

                if (hasDaftarSoal) {
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-900 border-b border-slate-200/80 pb-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-sky-600" />
                        <span>Jawaban Murid per Butir Soal:</span>
                      </div>
                      {correspondingTugas!.daftarSoal!.map((soal, sIdx) => {
                        const ans =
                          activeReviewSubmission.jawabanPerSoal?.[soal.id] ||
                          activeReviewSubmission.jawabanPerSoal?.[String(sIdx + 1)] ||
                          '';

                        return (
                          <div key={soal.id || sIdx} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-extrabold text-[11px] text-sky-950">
                                Soal #{sIdx + 1}:
                              </span>
                              {soal.petunjuk && (
                                <span className="text-[10px] text-slate-400 italic">
                                  {soal.petunjuk}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-700 font-semibold text-xs leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                              {soal.pertanyaan}
                            </p>
                            <div className="pt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">
                                Jawaban Murid:
                              </span>
                              {ans ? (
                                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                                  {ans}
                                </div>
                              ) : (
                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 italic text-[11px] border border-dashed border-slate-200">
                                  (Murid belum mengisi jawaban untuk butir soal ini)
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                if (activeReviewSubmission.isiJawaban) {
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Jawaban Langsung Murid:</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {activeReviewSubmission.isiJawaban}
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {(activeReviewSubmission.catatanMurid || activeReviewSubmission.catatanSiswa) && (
                <div className="text-slate-600 text-[11px] pt-1 border-t border-slate-100">
                  <strong>Catatan Murid:</strong> "{activeReviewSubmission.catatanMurid || activeReviewSubmission.catatanSiswa}"
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {activeReviewSubmission.fileUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setMediaModal({
                        isOpen: true,
                        url: activeReviewSubmission.fileUrl!,
                        title: `Lampiran - ${activeReviewSubmission.muridNama}`,
                        category: 'Berkas Portofolio / Foto',
                      })
                    }
                    className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 hover:bg-sky-200"
                  >
                    <FileText className="w-3.5 h-3.5" /> Lihat Berkas / Foto / PDF
                  </button>
                )}
                {activeReviewSubmission.linkVideo && (
                  <button
                    type="button"
                    onClick={() =>
                      setMediaModal({
                        isOpen: true,
                        url: activeReviewSubmission.linkVideo!,
                        title: `Video - ${activeReviewSubmission.muridNama}`,
                        category: 'Video Gerakan',
                      })
                    }
                    className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-200"
                  >
                    <Video className="w-3.5 h-3.5" /> Buka Link Video
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveNilai} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nilai Akhir Tugas (Skala 0 - 100) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={reviewNilai}
                    onChange={(e) => setReviewNilai(Number(e.target.value))}
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-base text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  />
                  <span className="text-xs text-slate-400">
                    {reviewNilai >= 85 ? 'Sangat Baik (A)' : reviewNilai >= 75 ? 'Baik (B)' : 'Cukup (C)'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Umpan Balik & Catatan Guru untuk Murid
                </label>
                <textarea
                  rows={3}
                  placeholder="Misal: Posisi lutut dan siku sudah tepat, perhatikan perkenaan bola pada lengan bawah..."
                  value={reviewCatatan}
                  onChange={(e) => setReviewCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveReviewSubmission(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 shadow-sm"
                >
                  Simpan Nilai & Masukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Tugas Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2.5 py-0.5 bg-sky-50 text-sky-800 font-bold text-[10px] rounded-full">
                {editingTugas ? 'Edit Penugasan' : 'Penugasan Baru'}
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                {editingTugas ? 'Edit Tugas PJOK' : 'Buat Penugasan PJOK Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Berikan instruksi jelas bagi peserta didik untuk mempraktikkan atau menganalisis gerak.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Tugas PJOK *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Analisis Video & Praktik Mandiri Passing Bawah"
                  value={form.judul || ''}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub Judul Tugas (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Teknik Dasar & Variasi Gerakan Mandiri di Rumah"
                  value={form.subJudul || ''}
                  onChange={(e) => setForm({ ...form, subJudul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              {/* Status Publikasi Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Status Publikasi</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.status !== 'Draft' && form.statusPublikasi !== 'Draft'
                        ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusPublikasiTugas"
                      checked={form.status !== 'Draft' && form.statusPublikasi !== 'Draft'}
                      onChange={() => setForm({ ...form, status: 'Publish', statusPublikasi: 'Publish' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-extrabold text-xs flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terbitkan (Publish)
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Murid dapat langsung melihat & mengumpulkan tugas</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      form.status === 'Draft' || form.statusPublikasi === 'Draft'
                        ? 'bg-amber-50/70 border-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusPublikasiTugas"
                      checked={form.status === 'Draft' || form.statusPublikasi === 'Draft'}
                      onChange={() => setForm({ ...form, status: 'Draft', statusPublikasi: 'Draft' })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-extrabold text-xs flex items-center gap-1 text-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Simpan Draft
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Disimpan sebagai draf, belum dapat dilihat murid</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Kategori Manual & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Tugas (Ketik Manual) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Praktik Bola Voli, Analisis Gerak..."
                    value={form.kategori || ''}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 font-medium"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold self-center mr-0.5">Saran:</span>
                    {categories.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setForm({ ...form, kategori: tag })}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 rounded-md text-[10px] transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Waktu (Deadline) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.deadline || '2026-09-30T23:59'}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pilihan Metode Pengumpulan Tugas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Pilihan Metode Pengumpulan Tugas *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      form.jenisPengumpulan === 'JAWAB_LANGSUNG' || !form.jenisPengumpulan
                        ? 'bg-sky-50/80 border-sky-400 text-sky-950 ring-2 ring-sky-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="jenisPengumpulanTugas"
                        value="JAWAB_LANGSUNG"
                        checked={form.jenisPengumpulan === 'JAWAB_LANGSUNG' || !form.jenisPengumpulan}
                        onChange={() => setForm({ ...form, jenisPengumpulan: 'JAWAB_LANGSUNG' })}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-extrabold text-xs text-sky-900">Menjawab Langsung</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Murid mengetik langsung di aplikasi. <strong>Copy-paste dinonaktifkan</strong> untuk orisinalitas jawaban.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      form.jenisPengumpulan === 'UPLOAD_FILE'
                        ? 'bg-sky-50/80 border-sky-400 text-sky-950 ring-2 ring-sky-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="jenisPengumpulanTugas"
                        value="UPLOAD_FILE"
                        checked={form.jenisPengumpulan === 'UPLOAD_FILE'}
                        onChange={() => setForm({ ...form, jenisPengumpulan: 'UPLOAD_FILE' })}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-extrabold text-xs text-sky-900">Upload Berkas</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Murid mengunggah file foto dokumentasi praktik, dokumen PDF, atau link video.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      form.jenisPengumpulan === 'KEDUANYA'
                        ? 'bg-sky-50/80 border-sky-400 text-sky-950 ring-2 ring-sky-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="jenisPengumpulanTugas"
                        value="KEDUANYA"
                        checked={form.jenisPengumpulan === 'KEDUANYA'}
                        onChange={() => setForm({ ...form, jenisPengumpulan: 'KEDUANYA' })}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-extrabold text-xs text-sky-900">Bisa Keduanya</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Murid dapat mengetik uraian langsung sekaligus melampirkan berkas foto/PDF.
                    </p>
                  </label>
                </div>
              </div>

              {/* Target Kelas Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Target Kelas / Rombel</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
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
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-semibold text-slate-700">{k.nama}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instruksi Lengkap Tugas *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Instruksikan murid untuk memahami konteks tugas, kriteria penilaian, dan langkah-langkah pengerjaan..."
                  value={form.instruksi || ''}
                  onChange={(e) => setForm({ ...form, instruksi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden text-xs font-medium"
                />
              </div>

              {/* Kolom Soal Uraian untuk Menjawab Langsung */}
              {(form.jenisPengumpulan === 'JAWAB_LANGSUNG' ||
                form.jenisPengumpulan === 'KEDUANYA' ||
                !form.jenisPengumpulan) && (
                <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-sky-100">
                    <div>
                      <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <ListOrdered className="w-4 h-4 text-sky-600" />
                        Kolom Soal / Pertanyaan Tugas Uraian *
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tuliskan butir-butir pertanyaan di bawah ini. Murid akan mendapatkan kolom jawaban tersendiri untuk setiap soal dengan proteksi anti copy-paste.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSoal}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Soal
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(!form.daftarSoal || form.daftarSoal.length === 0) && (
                      <div className="p-3 bg-white rounded-xl border border-dashed border-sky-200 text-center text-xs text-slate-500">
                        Belum ada butir soal. Klik tombol "Tambah Soal" untuk membuat pertanyaan.
                      </div>
                    )}

                    {(form.daftarSoal || []).map((soal, sIdx) => (
                      <div
                        key={soal.id || sIdx}
                        className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-sky-100 text-sky-900 font-extrabold text-[11px] rounded-md">
                            Soal No. {sIdx + 1}
                          </span>
                          {(form.daftarSoal?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSoal(sIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Butir Soal Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Teks Soal / Pertanyaan *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder={`Tuliskan butir pertanyaan No. ${sIdx + 1} di sini...`}
                            value={soal.pertanyaan}
                            onChange={(e) => handleUpdateSoal(sIdx, 'pertanyaan', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400 font-medium leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                              Petunjuk / Rubrik Khusus (Opsional):
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: Jelaskan minimal 3 tahapan gerak..."
                              value={soal.petunjuk || ''}
                              onChange={(e) => handleUpdateSoal(sIdx, 'petunjuk', e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                              Bobot Nilai:
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={soal.bobot || 100}
                              onChange={(e) => handleUpdateSoal(sIdx, 'bobot', Number(e.target.value))}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] focus:bg-white focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 shadow-sm"
                >
                  {editingTugas ? 'Simpan Perubahan' : 'Terbitkan Tugas'}
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

      {/* Upload Data Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        type="tugas"
        onImport={handleImportTugas}
      />
    </div>
  );
};
