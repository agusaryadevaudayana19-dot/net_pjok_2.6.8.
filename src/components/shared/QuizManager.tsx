import React, { useState } from 'react';
import {
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Users,
  Search,
  School,
  X,
  Eye,
  HelpCircle,
  Check,
  ChevronRight,
  Filter,
  Sparkles,
  BookOpen,
  Upload,
  Activity,
  FileText,
  Code2,
  Globe,
  ExternalLink,
  Key,
  KeyRound,
  Copy,
  Lock,
  LogOut,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { Quiz, Soal, JawabanQuiz, User, NotifikasiItem, getTeacherAssignedClasses, TipeSoal } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { UploadDataModal } from './UploadDataModal';
import { InAppQuizViewerModal } from './InAppQuizViewerModal';

interface QuizManagerProps {
  db: LMSDatabase;
  currentUser: User;
  initialTab?: 'quiz' | 'hasil';
}

export const QuizManager: React.FC<QuizManagerProps> = ({ db, currentUser, initialTab = 'quiz' }) => {
  const availableClasses = React.useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedTab, setSelectedTab] = useState<'quiz' | 'hasil'>(initialTab);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('Semua');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('Semua');
  const [filterPublikasi, setFilterPublikasi] = useState<'Semua' | 'Publish' | 'Draft'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & detail view
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [activeJawabanDetail, setActiveJawabanDetail] = useState<JawabanQuiz | null>(null);

  // In-App External Quiz Link Viewer Modal State
  const [inAppViewerState, setInAppViewerState] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    type?: 'google-form' | 'appscript' | 'aplikasi-lain';
    subtitle?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  const handleOpenInAppPreview = (
    url: string,
    title: string,
    type?: 'google-form' | 'appscript' | 'aplikasi-lain',
    subtitle?: string
  ) => {
    if (!url || !url.trim()) {
      alert('Masukkan tautan URL terlebih dahulu untuk melakukan pratinjau di aplikasi.');
      return;
    }
    setInAppViewerState({
      isOpen: true,
      url: url.trim(),
      title,
      type: type || 'aplikasi-lain',
      subtitle,
    });
  };

  const handleImportBankSoal = (importedSoal: Soal[]) => {
    if (isModalOpen) {
      // If currently editing a quiz, append to form.soal
      const existing = form.soal || [];
      const updated = [...existing, ...importedSoal].map((s, idx) => ({ ...s, nomor: idx + 1 }));
      setForm((prev) => ({ ...prev, soal: updated }));
      alert(`Berhasil menambahkan ${importedSoal.length} butir soal ke dalam formulir kuis ini!`);
    } else {
      // Create new quiz package
      const newQ: Quiz = {
        id: `quiz-imp-${Date.now()}`,
        judul: `Bank Soal PJOK Impor (${importedSoal.length} Butir)`,
        materiJudul: 'Asesmen Komprehensif PJOK',
        durasiMenit: 30,
        acakSoal: true,
        acakJawaban: true,
        tampilkanPembahasan: true,
        status: 'Publish',
        kelasIds: availableClasses.map((k) => k.id),
        dibuatPada: new Date().toISOString().slice(0, 10),
        dibuatOleh: currentUser.name,
        guruNama: currentUser.name,
        soal: importedSoal,
        soalList: importedSoal,
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        quiz: [newQ, ...prev.quiz],
      }));
      alert(`Berhasil menambahkan paket Bank Soal baru dengan ${importedSoal.length} butir soal!`);
    }
  };

  // Form state
  const [form, setForm] = useState<Partial<Quiz>>({
    judul: '',
    materiJudul: 'Teknik Dasar & Taktik Permainan Bola Voli',
    durasiMenit: 20,
    jamMulai: '07:00',
    jamSelesai: '07:20',
    zonaWaktu: 'WITA',
    modeJadwal: 'serentak',
    acakSoal: true,
    acakJawaban: true,
    tampilkanPembahasan: true,
    kelasIds: availableClasses.map((k) => k.id),
    soal: [
      {
        id: `soal-1`,
        nomor: 1,
        pertanyaan: 'Bagaimanakah posisi kedua lengan yang benar saat melakukan passing bawah bola voli?',
        tipe: 'Pilihan Ganda',
        pilihan: [
          'Kedua tangan ditekuk pada siku',
          'Kedua lengan dirapatkan dan diluruskan ke depan bawah',
          'Kedua lengan dibuka selebar bahu',
          'Satu tangan di depan dan satu di belakang',
          'Lengan bebas mengayun tanpa dirapatkan',
        ],
        kunciJawaban: 'Kedua lengan dirapatkan dan diluruskan ke depan bawah',
        pembahasan: 'Lengan harus lurus dan rapat agar pantulan bola stabil dan terkontrol.',
        bobot: 25,
      } as any,
      {
        id: `soal-2`,
        nomor: 2,
        pertanyaan: 'Pemain yang bertugas sebagai pengatur serangan dan pengumpan utama dalam bola voli disebut...',
        tipe: 'Pilihan Ganda',
        pilihan: ['Libero', 'Tosser / Setter', 'Spiker', 'Blocker', 'Server'],
        kunciJawaban: 'Tosser / Setter',
        pembahasan: 'Tosser / Setter bertugas mengumpan bola kepada spiker untuk dieksekusi.',
        bobot: 25,
      } as any,
    ],
  });

  // Calculate stats
  const totalQuiz = db.quiz.length;
  const totalJawaban = db.jawabanQuiz.length;
  const totalSoalCount = db.quiz.reduce(
    (acc, q) => acc + (q.soal?.length || q.soalList?.length || 0),
    0
  );
  const avgScore =
    totalJawaban > 0
      ? Math.round(db.jawabanQuiz.reduce((acc, j) => acc + (j.nilai || 0), 0) / totalJawaban)
      : 85;

  // Filter quizzes
  const filteredQuiz = db.quiz.filter((q) => {
    const matchQuery =
      q.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subJudul && q.subJudul.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.materiJudul && q.materiJudul.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchKelas =
      selectedKelasId === 'Semua' ||
      !q.kelasIds ||
      q.kelasIds.length === 0 ||
      q.kelasIds.includes(selectedKelasId);

    // If teacher, only show quizzes for their assigned classes or general
    if (currentUser?.role === 'GURU') {
      const teacherClassIds = availableClasses.map((k) => k.id);
      const isGeneral = !q.kelasIds || q.kelasIds.length === 0;
      const matchesTeacherClass = q.kelasIds && q.kelasIds.some((cId) => teacherClassIds.includes(cId));
      if (!isGeneral && !matchesTeacherClass) return false;
    }

    const isDraft = q.status === 'Draft' || q.statusPublikasi === 'Draft';
    const matchPublikasi =
      filterPublikasi === 'Semua' ||
      (filterPublikasi === 'Draft' && isDraft) ||
      (filterPublikasi === 'Publish' && !isDraft);

    return matchQuery && matchKelas && matchPublikasi;
  });

  const handleTogglePublikasi = (q: Quiz) => {
    const isDraft = q.status === 'Draft' || q.statusPublikasi === 'Draft';
    const newStatus = isDraft ? 'Publish' : 'Draft';
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      quiz: prev.quiz.map((item) =>
        item.id === q.id
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
        id: `notif-qz-${Date.now()}`,
        judul: `Ujian/Quiz Baru: ${q.judul}`,
        pesan: `${currentUser.name} mempublikasikan ${q.judul} (${q.durasiMenit || 20} menit). Silakan kerjakan dengan teliti.`,
        waktu: 'Baru saja',
        tipe: 'quiz',
        dibaca: false,
        targetRole: 'MURID',
        targetId: q.id,
        targetKelasId: q.kelasIds && q.kelasIds.length === 1 ? q.kelasIds[0] : (q.kelasId || 'ALL'),
      };
      dataStorage.pushNotifikasi(notif);
    }
  };

  // Filter student quiz attempts
  const filteredHasil = db.jawabanQuiz.filter((j) => {
    // If teacher, only show student answers from teacher's assigned classes
    if (currentUser?.role === 'GURU') {
      const teacherClassIds = availableClasses.map((k) => k.id);
      if (j.kelasId && !teacherClassIds.includes(j.kelasId)) return false;
    }

    const matchQuiz = selectedQuizId === 'Semua' || j.quizId === selectedQuizId;
    const matchKelas = selectedKelasId === 'Semua' || j.kelasId === selectedKelasId;
    const matchSearch =
      j.muridNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.quizJudul.toLowerCase().includes(searchQuery.toLowerCase());

    return matchQuiz && matchKelas && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingQuiz(null);
    setForm({
      judul: '',
      materiJudul: db.materi[0]?.judul || 'Materi PJOK',
      durasiMenit: 20,
      jamMulai: '07:00',
      jamSelesai: '07:20',
      zonaWaktu: 'WITA',
      modeJadwal: 'serentak',
      acakSoal: true,
      acakJawaban: true,
      tampilkanPembahasan: true,
      kunciMasuk: '',
      gunakanTokenKeluar: false,
      tokenKeluar: '',
      waktuMunculTokenKeluarMenit: 10,
      kelasIds: availableClasses.map((k) => k.id),
      soal: [
        {
          id: `soal-${Date.now()}`,
          nomor: 1,
          pertanyaan: '',
          tipe: 'Pilihan Ganda',
          kategoriSoal: 'HOTS',
          pilihan: ['', '', '', '', ''],
          kunciJawaban: '',
          pembahasan: '',
          bobot: 20,
        } as any,
      ],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: Quiz) => {
    setEditingQuiz(q);
    const existingQuestions =
      Array.isArray(q.soal) && q.soal.length > 0
        ? q.soal
        : Array.isArray(q.soalList) && q.soalList.length > 0
        ? q.soalList
        : [];

    setForm({
      ...q,
      kunciMasuk: q.kunciMasuk || '',
      gunakanTokenKeluar: Boolean(q.gunakanTokenKeluar || q.tokenKeluar),
      tokenKeluar: q.tokenKeluar || '',
      waktuMunculTokenKeluarMenit: q.waktuMunculTokenKeluarMenit ?? 10,
      jamMulai: q.jamMulai || '07:00',
      jamSelesai: q.jamSelesai || '07:20',
      zonaWaktu: q.zonaWaktu || 'WITA',
      modeJadwal: q.modeJadwal || 'serentak',
      durasiMenit: q.durasiMenit || 20,
      kelasIds: q.kelasIds || (q.kelasId ? [q.kelasId] : availableClasses.map((k) => k.id)),
      soal: existingQuestions,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul?.trim()) {
      alert('Judul quiz harus diisi');
      return;
    }

    const currentQuestions = (form.soal || []).map((s, idx) => ({
      ...s,
      nomor: idx + 1,
      bobot: s.bobot || Math.round(100 / (form.soal?.length || 1)),
    }));

    const finalStatus = form.status === 'Draft' || form.statusPublikasi === 'Draft' ? 'Draft' : 'Publish';
    const cleanKunciMasuk = form.kunciMasuk ? form.kunciMasuk.trim().toUpperCase() : undefined;
    const cleanTokenKeluar = form.gunakanTokenKeluar && form.tokenKeluar ? form.tokenKeluar.trim().toUpperCase() : undefined;
    const cleanWaktuMuncul = form.gunakanTokenKeluar ? Math.max(1, Number(form.waktuMunculTokenKeluarMenit) || 10) : undefined;

    if (editingQuiz) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        quiz: prev.quiz.map((item) =>
          item.id === editingQuiz.id
            ? ({
                ...item,
                ...form,
                kunciMasuk: cleanKunciMasuk,
                gunakanTokenKeluar: Boolean(cleanTokenKeluar),
                tokenKeluar: cleanTokenKeluar,
                waktuMunculTokenKeluarMenit: cleanWaktuMuncul,
                status: finalStatus as any,
                statusPublikasi: finalStatus as any,
                soal: currentQuestions,
                soalList: currentQuestions,
              } as Quiz)
            : item
        ),
      }));

      if (finalStatus === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-qz-${Date.now()}`,
          judul: `Ujian/Quiz PJOK: ${form.judul || editingQuiz.judul}`,
          pesan: `${currentUser.name} memperbarui ${form.judul || editingQuiz.judul}. Silakan persiapkan diri dan kerjakan soal.${cleanKunciMasuk ? ` [Kunci: ${cleanKunciMasuk}]` : ''}`,
          waktu: 'Baru saja',
          tipe: 'quiz',
          dibaca: false,
          targetRole: 'MURID',
          targetId: editingQuiz.id,
          targetKelasId: form.kelasIds && form.kelasIds.length === 1 ? form.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    } else {
      const newQ: Quiz = {
        id: `qz-${Date.now()}`,
        judul: form.judul || 'Quiz Baru',
        subJudul: form.subJudul || '',
        materiJudul: form.materiJudul || 'Materi PJOK',
        durasiMenit: Number(form.durasiMenit) || 20,
        jamMulai: form.jamMulai || '07:00',
        jamSelesai: form.jamSelesai || '07:20',
        zonaWaktu: 'WITA',
        modeJadwal: 'serentak',
        acakSoal: Boolean(form.acakSoal),
        acakJawaban: Boolean(form.acakJawaban),
        tampilkanPembahasan: Boolean(form.tampilkanPembahasan),
        kunciMasuk: cleanKunciMasuk,
        gunakanTokenKeluar: Boolean(cleanTokenKeluar),
        tokenKeluar: cleanTokenKeluar,
        waktuMunculTokenKeluarMenit: cleanWaktuMuncul,
        kelasIds: form.kelasIds && form.kelasIds.length > 0 ? form.kelasIds : availableClasses.map((k) => k.id),
        status: finalStatus,
        statusPublikasi: finalStatus,
        dibuatOleh: currentUser.name,
        guruNama: currentUser.name,
        soal: currentQuestions,
        soalList: currentQuestions,
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        quiz: [newQ, ...prev.quiz],
      }));

      if (finalStatus === 'Publish') {
        const notif: NotifikasiItem = {
          id: `notif-qz-${Date.now()}`,
          judul: `Ujian/Quiz Baru: ${newQ.judul}`,
          pesan: `${currentUser.name} mempublikasikan ${newQ.judul} (${newQ.durasiMenit} menit).${cleanKunciMasuk ? ` Kunci Masuk: ${cleanKunciMasuk}.` : ''} Silakan mulai mengerjakan.`,
          waktu: 'Baru saja',
          tipe: 'quiz',
          dibaca: false,
          targetRole: 'MURID',
          targetId: newQ.id,
          targetKelasId: newQ.kelasIds && newQ.kelasIds.length === 1 ? newQ.kelasIds[0] : 'ALL',
        };
        dataStorage.pushNotifikasi(notif);
      }
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Yakin ingin menghapus quiz "${judul}"?`)) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        quiz: prev.quiz.filter((item) => item.id !== id),
        jawabanQuiz: prev.jawabanQuiz.filter((j) => j.quizId !== id),
      }));
    }
  };

  // Helpers for question editor inside modal
  const handleAddQuestion = (type: TipeSoal = 'Pilihan Ganda') => {
    let defaultPertanyaan = '';
    let defaultKey = '';
    let defaultLinkType: 'google-form' | 'appscript' | 'aplikasi-lain' | undefined;
    let defaultPilihan: string[] = ['', '', '', '', ''];

    if (type === 'Link Google Form') {
      defaultPertanyaan = 'Silakan kerjakan asesmen butir soal melalui formulir Google Form tersemat berikut:';
      defaultKey = 'Selesai';
      defaultLinkType = 'google-form';
      defaultPilihan = [];
    } else if (type === 'Link AppScript') {
      defaultPertanyaan = 'Silakan kerjakan aplikasi soal interaktif Google Apps Script (AppScript) berikut:';
      defaultKey = 'Selesai';
      defaultLinkType = 'appscript';
      defaultPilihan = [];
    } else if (type === 'Link Aplikasi Lainnya') {
      defaultPertanyaan = 'Silakan kerjakan butir soal interaktif melalui tautan aplikasi kuis berikut:';
      defaultKey = 'Selesai';
      defaultLinkType = 'aplikasi-lain';
      defaultPilihan = [];
    }

    const newQuestions = [
      ...(form.soal || []),
      {
        id: `soal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nomor: (form.soal?.length || 0) + 1,
        pertanyaan: defaultPertanyaan,
        tipe: type,
        tipeLink: defaultLinkType,
        linkEksternal: '',
        pilihan: defaultPilihan,
        kunciJawaban: defaultKey,
        pembahasan: '',
        bobot: 20,
      } as any,
    ];
    setForm({ ...form, soal: newQuestions });
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = (form.soal || []).filter((_, idx) => idx !== index);
    setForm({ ...form, soal: newQuestions });
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...(form.soal || [])];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setForm({ ...form, soal: newQuestions });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...(form.soal || [])];
    const newOptions = [...newQuestions[qIndex].pilihan];
    newOptions[optIndex] = value;
    newQuestions[qIndex].pilihan = newOptions;
    setForm({ ...form, soal: newQuestions });
  };

  const handleTypeChange = (index: number, newType: string) => {
    const newQuestions = [...(form.soal || [])];
    const curr = newQuestions[index];
    let newPilihan = curr.pilihan || [];
    let newKey = curr.kunciJawaban || '';
    let newPairs = curr.matchingPairs;
    let newGambar = curr.gambarUrl;
    let updatedTipeLink = curr.tipeLink;
    let updatedLink = curr.linkEksternal || '';

    if (newType === 'Pilihan Ganda') {
      if (!newPilihan || newPilihan.length < 5) {
        newPilihan = ['', '', '', '', ''];
      }
      if (!newPilihan.includes(newKey) && newPilihan[0]) {
        newKey = newPilihan[0];
      }
    } else if (newType === 'Benar/Salah') {
      newPilihan = ['Benar', 'Salah'];
      if (newKey !== 'Benar' && newKey !== 'Salah') {
        newKey = 'Benar';
      }
    } else if (newType === 'Tarik Garis') {
      if (!newPairs || newPairs.length === 0) {
        newPairs = [
          { left: 'Tosser / Setter', right: 'Mengatur serangan dan mengumpan bola' },
          { left: 'Libero', right: 'Pemain bertahan murni, dilarang servis' },
          { left: 'Spiker / Smasher', right: 'Mengeksekusi bola serangan di atas bibir net' },
          { left: 'Blocker', right: 'Membendung serangan smash lawan' },
        ];
        newKey = newPairs.map((p) => `${p.left}=${p.right}`).join(', ');
      }
    } else if (newType === 'Mencocokkan Gambar') {
      if (!newGambar) {
        newGambar = 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80';
      }
      if (!newPilihan || newPilihan.length < 5) {
        newPilihan = [
          'Passing Bawah Bola Voli',
          'Smash Keras Menukik',
          'Block / Bendungan Net',
          'Servis Atas Mengapung',
          'Passing Atas (Set Up)',
        ];
        newKey = newPilihan[0];
      }
    } else if (newType === 'Isian') {
      newPilihan = [];
      if (!newKey || newKey.includes('=')) {
        newKey = '';
      }
    } else if (newType === 'Link Google Form') {
      newPilihan = [];
      updatedTipeLink = 'google-form';
      if (!curr.pertanyaan) {
        curr.pertanyaan = 'Silakan kerjakan asesmen butir soal melalui formulir Google Form tersemat berikut:';
      }
      if (!newKey) newKey = 'Selesai';
    } else if (newType === 'Link AppScript') {
      newPilihan = [];
      updatedTipeLink = 'appscript';
      if (!curr.pertanyaan) {
        curr.pertanyaan = 'Silakan kerjakan aplikasi soal interaktif Google Apps Script (AppScript) berikut:';
      }
      if (!newKey) newKey = 'Selesai';
    } else if (newType === 'Link Aplikasi Lainnya') {
      newPilihan = [];
      updatedTipeLink = 'aplikasi-lain';
      if (!curr.pertanyaan) {
        curr.pertanyaan = 'Silakan kerjakan butir soal interaktif melalui tautan aplikasi kuis berikut:';
      }
      if (!newKey) newKey = 'Selesai';
    }

    newQuestions[index] = {
      ...curr,
      tipe: newType as any,
      pilihan: newPilihan,
      kunciJawaban: newKey,
      matchingPairs: newPairs,
      gambarUrl: newGambar,
      tipeLink: updatedTipeLink,
      linkEksternal: updatedLink,
    };
    setForm({ ...form, soal: newQuestions });
  };

  const handleAddMatchingPair = (qIndex: number) => {
    const newQuestions = [...(form.soal || [])];
    const pairs = newQuestions[qIndex].matchingPairs || [];
    const updatedPairs = [...pairs, { left: '', right: '' }];
    newQuestions[qIndex].matchingPairs = updatedPairs;
    newQuestions[qIndex].kunciJawaban = updatedPairs.map((p) => `${p.left}=${p.right}`).join(', ');
    setForm({ ...form, soal: newQuestions });
  };

  const handleMatchingPairChange = (qIndex: number, pIndex: number, field: 'left' | 'right', value: string) => {
    const newQuestions = [...(form.soal || [])];
    const pairs = [...(newQuestions[qIndex].matchingPairs || [])];
    pairs[pIndex] = { ...pairs[pIndex], [field]: value };
    newQuestions[qIndex].matchingPairs = pairs;
    newQuestions[qIndex].kunciJawaban = pairs.map((p) => `${p.left}=${p.right}`).join(', ');
    setForm({ ...form, soal: newQuestions });
  };

  const handleRemoveMatchingPair = (qIndex: number, pIndex: number) => {
    const newQuestions = [...(form.soal || [])];
    const pairs = (newQuestions[qIndex].matchingPairs || []).filter((_, idx) => idx !== pIndex);
    newQuestions[qIndex].matchingPairs = pairs;
    newQuestions[qIndex].kunciJawaban = pairs.map((p) => `${p.left}=${p.right}`).join(', ');
    setForm({ ...form, soal: newQuestions });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-purple-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Asesmen Formatif & Sumatif AKM / HOTS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Bank Soal & Quiz PJOK
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
              Kelola butir soal pengetahuan olahraga, waktu pengerjaan otomatis, acak soal & opsi, serta tinjau hasil rekap nilai murid.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 backdrop-blur-xs border border-white/20"
            >
              <Upload className="w-4 h-4 text-purple-200" />
              <span>Upload Bank Soal</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              Buat Quiz Baru
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/15">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-purple-200 font-medium">Paket Quiz</p>
            <p className="text-xl font-black mt-0.5">{totalQuiz}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-purple-200 font-medium">Total Butir Soal</p>
            <p className="text-xl font-black mt-0.5">{totalSoalCount} Butir</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-purple-200 font-medium">Murid Selesai</p>
            <p className="text-xl font-black mt-0.5">{totalJawaban}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <p className="text-[11px] text-emerald-200 font-medium">Rata-rata Skor</p>
            <p className="text-xl font-black mt-0.5 text-emerald-300">{avgScore}</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab('quiz')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTab === 'quiz'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Daftar Paket Quiz ({totalQuiz})
          </button>
          <button
            onClick={() => setSelectedTab('hasil')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTab === 'hasil'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Hasil & Nilai Murid ({totalJawaban})
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari quiz / murid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
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

      {/* TAB 1: DAFTAR PAKET QUIZ */}
      {selectedTab === 'quiz' && (
        <div className="space-y-4">
          {filteredQuiz.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">Tidak ada paket quiz</h3>
              <p className="text-xs text-slate-500">
                Belum ada paket soal quiz yang dibuat untuk rombel ini.
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Buat Quiz Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredQuiz.map((q) => {
                const questionList = q.soal || q.soalList || [];
                const attempts = db.jawabanQuiz.filter((j) => j.quizId === q.id);
                const isDraft = q.status === 'Draft' || q.statusPublikasi === 'Draft';

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md ${
                      isDraft ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-extrabold">
                            {questionList.length} Butir Soal
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

                          <span className="text-[10px] text-purple-800 flex items-center gap-1 font-bold bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                            <Clock className="w-3 h-3 text-purple-600" />
                            {q.jamMulai || '07:00'} - {q.jamSelesai || '07:20'} {q.zonaWaktu || 'WITA'} ({q.durasiMenit || 20}m)
                          </span>
                          {q.tampilkanPembahasan && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              Pembahasan Aktif
                            </span>
                          )}
                          {questionList.some((s) => s.linkEksternal || s.tipe?.startsWith('Link')) && (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
                              <Globe className="w-3 h-3 text-blue-600" />
                              Tautan Interaktif (Di Aplikasi)
                            </span>
                          )}

                          {/* Kunci / Token Kuis Badge */}
                          {q.kunciMasuk ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(q.kunciMasuk || '');
                                alert(`Kunci Kuis "${q.kunciMasuk}" disalin ke clipboard! Bagikan kepada murid saat ujian dimulai.`);
                              }}
                              className="px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Klik untuk menyalin Kunci / Token Kuis"
                            >
                              <Key className="w-3 h-3 text-amber-700" />
                              <span>Kunci: <strong className="font-mono text-amber-950 tracking-wider">{q.kunciMasuk}</strong></span>
                              <Copy className="w-2.5 h-2.5 text-amber-600 ml-0.5" />
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-medium flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-slate-400" />
                              Tanpa Kunci
                            </span>
                          )}

                          {/* Token Keluar Badge */}
                          {q.tokenKeluar ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(q.tokenKeluar || '');
                                alert(`Token Keluar "${q.tokenKeluar}" disalin! Token ini akan muncul otomatis di layar murid setelah ${q.waktuMunculTokenKeluarMenit || 10} menit.`);
                              }}
                              className="px-2.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Klik untuk menyalin Token Keluar"
                            >
                              <LogOut className="w-3 h-3 text-teal-700" />
                              <span>Token Keluar: <strong className="font-mono text-teal-950 tracking-wider">{q.tokenKeluar}</strong> (Otomatis: Menit ke-{q.waktuMunculTokenKeluarMenit || 10})</span>
                              <Copy className="w-2.5 h-2.5 text-teal-600 ml-0.5" />
                            </button>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePublikasi(q)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                              isDraft
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                            }`}
                            title={isDraft ? 'Publikasikan ke murid sekarang' : 'Kembalikan ke status Draft'}
                          >
                            {isDraft ? 'Terbitkan' : 'Jadikan Draft'}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit Quiz"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id, q.judul)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-base text-slate-800 leading-snug">
                          {q.judul}
                        </h3>
                        {q.subJudul && (
                          <p className="text-xs text-purple-700 font-bold mt-1">
                            {q.subJudul}
                          </p>
                        )}
                        {q.materiJudul && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Materi: {q.materiJudul}
                          </p>
                        )}
                      </div>

                      {/* Question Preview Box */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                          Contoh Butir Soal:
                        </span>
                        {questionList.slice(0, 2).map((soal, sIdx) => (
                          <div
                            key={soal.id || sIdx}
                            className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2"
                          >
                            <span className="font-bold text-purple-700 shrink-0 text-[11px]">
                              #{sIdx + 1}
                            </span>
                            <p className="line-clamp-2 leading-relaxed text-[11px] font-medium">
                              {soal.pertanyaan}
                            </p>
                          </div>
                        ))}
                        {questionList.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            +{questionList.length - 2} soal lainnya
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="text-slate-500 text-[11px]">
                        Dikerjakan oleh: <strong className="text-slate-800">{attempts.length} Murid</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {questionList.some((s) => s.linkEksternal || s.tipe?.startsWith('Link')) && (
                          <button
                            type="button"
                            onClick={() => {
                              const linkSoal = questionList.find((s) => s.linkEksternal || s.tipe?.startsWith('Link'));
                              if (linkSoal && linkSoal.linkEksternal) {
                                handleOpenInAppPreview(
                                  linkSoal.linkEksternal,
                                  linkSoal.judulLink || q.judul,
                                  linkSoal.tipeLink || (linkSoal.tipe === 'Link Google Form' ? 'google-form' : linkSoal.tipe === 'Link AppScript' ? 'appscript' : 'aplikasi-lain'),
                                  q.materiJudul
                                );
                              } else {
                                alert('Tautan soal belum diisi.');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                            title="Buka dan uji soal berbasis link eksternal langsung di dalam aplikasi"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Buka di Aplikasi</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedQuizId(q.id);
                            setSelectedTab('hasil');
                          }}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Lihat Nilai Murid
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP HASIL & NILAI MURID */}
      {selectedTab === 'hasil' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Pilih Paket Quiz:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Semua">Semua Paket Quiz</option>
                {db.quiz.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.judul}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-800">{filteredHasil.length}</strong> hasil pengerjaan
            </div>
          </div>

          {filteredHasil.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">Belum ada hasil quiz</h3>
              <p className="text-xs text-slate-500">
                Murid belum mengerjakan paket quiz yang dipilih.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="p-3.5 pl-5">Nama Murid</th>
                      <th className="p-3.5">Paket Quiz</th>
                      <th className="p-3.5">Waktu Selesai</th>
                      <th className="p-3.5 text-center">Akurasi</th>
                      <th className="p-3.5 text-center">Skor Akhir</th>
                      <th className="p-3.5 pr-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHasil.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-800">
                          {item.muridNama}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Kelas XI 1
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium max-w-xs truncate">
                          {item.quizJudul}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {item.tanggalMengerjakan}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                            {item.jumlahBenar} Benar • {item.jumlahSalah} Salah
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-3 py-1 rounded-xl font-black text-xs ${
                              item.nilai >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.nilai >= 75
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.nilai}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => setActiveJawabanDetail(item)}
                            className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            Detail Jawaban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Jawaban Murid Modal */}
      {activeJawabanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8 space-y-4">
            <button
              onClick={() => setActiveJawabanDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 font-bold text-[10px] rounded-full">
                Lembar Jawaban Murid
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                {activeJawabanDetail.muridNama}
              </h3>
              <p className="text-xs text-slate-500">
                {activeJawabanDetail.quizJudul} • Nilai: <strong className="text-emerald-700 font-black">{activeJawabanDetail.nilai}</strong>
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {Object.entries(activeJawabanDetail.jawabanMurid || {}).map(([soalId, ans], idx) => (
                <div key={soalId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800 text-[11px]">Soal #{idx + 1}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Tercatat
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    Jawaban Murid: <strong className="text-slate-900">{ans}</strong>
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveJawabanDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Quiz Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-800 font-bold text-[10px] rounded-full">
                {editingQuiz ? 'Edit Paket Quiz' : 'Paket Quiz Baru'}
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1">
                {editingQuiz ? 'Edit Bank Soal Quiz' : 'Buat Paket Quiz PJOK Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Atur durasi, butir soal, kunci jawaban, dan pembahasan untuk penilaian murid.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Paket Quiz *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Quiz Pengetahuan Aturan & Analisis Taktik Bola Voli"
                  value={form.judul || ''}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub Judul Quiz (Opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Evaluasi Pemahaman Mandiri Bab Permainan Bola Besar"
                  value={form.subJudul || ''}
                  onChange={(e) => setForm({ ...form, subJudul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
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
                      name="statusPublikasiQuiz"
                      checked={form.status !== 'Draft' && form.statusPublikasi !== 'Draft'}
                      onChange={() => setForm({ ...form, status: 'Publish', statusPublikasi: 'Publish' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="font-extrabold text-xs flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terbitkan (Publish)
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Murid dapat langsung melihat & mengerjakan quiz</p>
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
                      name="statusPublikasiQuiz"
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Materi Terkait</label>
                <input
                  type="text"
                  placeholder="Nama materi/bab terkait..."
                  value={form.materiJudul || ''}
                  onChange={(e) => setForm({ ...form, materiJudul: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Jadwal & Waktu Pengerjaan Serentak (WITA) */}
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-700" />
                    <span className="font-extrabold text-xs text-purple-950">
                      Jadwal Pengerjaan Serentak (WITA)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        jamMulai: '07:00',
                        jamSelesai: '07:20',
                        durasiMenit: 20,
                        zonaWaktu: 'WITA',
                        modeJadwal: 'serentak',
                      }));
                    }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Set Standar SMANSAKA (07:00 - 07:20 WITA)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Mulai (WITA) *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.jamMulai || '07:00'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => {
                          const [h1, m1] = val.split(':').map(Number);
                          const [h2, m2] = (prev.jamSelesai || '07:20').split(':').map(Number);
                          let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                          if (diff <= 0) diff = 20;
                          return { ...prev, jamMulai: val, durasiMenit: diff };
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Selesai (WITA) *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.jamSelesai || '07:20'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => {
                          const [h1, m1] = (prev.jamMulai || '07:00').split(':').map(Number);
                          const [h2, m2] = val.split(':').map(Number);
                          let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                          if (diff <= 0) diff = 20;
                          return { ...prev, jamSelesai: val, durasiMenit: diff };
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Durasi Waktu Total
                    </label>
                    <div className="flex items-center gap-1.5 h-8 px-3 bg-white border border-purple-200 rounded-xl font-extrabold text-purple-900 text-xs">
                      <span>{form.durasiMenit || 20} Menit</span>
                      <span className="text-[10px] text-purple-600 font-normal">(WITA UTC+8)</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10.5px] text-purple-900 leading-snug">
                  📌 <strong>Pengerjaan Serentak</strong>: Semua murid akan mengerjakan serentak pada rentang pukul <strong>{form.jamMulai || '07:00'}</strong> sampai <strong>{form.jamSelesai || '07:20'} WITA</strong>. Saat jam mencapai {form.jamSelesai || '07:20'} WITA, kuis akan otomatis ditutup dan nilai terkirim bersamaan.
                </p>
              </div>

              {/* Target Kelas Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 text-xs">Target Kelas / Rombel</label>
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
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-semibold text-slate-700">Kelas {k.nama}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.acakSoal ?? true}
                    onChange={(e) => setForm({ ...form, acakSoal: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Acak Urutan Soal Murid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.tampilkanPembahasan ?? true}
                    onChange={(e) => setForm({ ...form, tampilkanPembahasan: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Tampilkan Kunci & Pembahasan Setelah Selesai</span>
                </label>
              </div>

              {/* Kunci / Token Akses Kuis */}
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-2xs border border-amber-200">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block flex items-center gap-1.5">
                        Kunci / Token Akses Kuis (Wajib Dimasukkan Murid)
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">
                        Murid tidak dapat langsung mengerjakan sebelum memasukkan kunci/token yang tepat.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const randomCode = 'PJOK' + Math.floor(1000 + Math.random() * 9000);
                        setForm({ ...form, kunciMasuk: randomCode });
                      }}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 border border-amber-300"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Acak Token Baru
                    </button>
                    {form.kunciMasuk && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, kunciMasuk: '' })}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Hapus Kunci
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Ketik Kunci Akses / Token (Huruf Besar & Angka):
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PJOK88 / KUIS2026 (Kosongkan jika tanpa kunci)"
                      value={form.kunciMasuk || ''}
                      onChange={(e) => setForm({ ...form, kunciMasuk: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-black text-amber-950 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-hidden uppercase tracking-widest"
                    />
                  </div>
                  <div className="flex items-center text-[11px] text-amber-900 leading-snug">
                    {form.kunciMasuk?.trim() ? (
                      <div className="bg-amber-100/80 p-2.5 rounded-xl border border-amber-300 text-[11px] font-medium flex items-start gap-2 w-full">
                        <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-950">
                            Kuis Terproteksi Kunci: <span className="font-mono tracking-wider font-black text-amber-900">{form.kunciMasuk.trim()}</span>
                          </p>
                          <p className="text-amber-800 text-[10.5px]">
                            Bagikan kunci ini kepada murid di kelas saat waktu pengerjaan dimulai.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-100/80 p-2.5 rounded-xl border border-slate-200 text-slate-500 text-[11px] w-full">
                        🔓 <strong>Mode Tanpa Kunci</strong>: Murid dapat langsung memulai kuis tanpa dimintai token.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Token Keluar Ujian Otomatis (Exit Token) */}
              <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 p-4 rounded-2xl border border-teal-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-teal-200/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-teal-950 text-sm">
                          Token Keluar Ujian Otomatis (Layar Murid)
                        </span>
                        <span className="px-2 py-0.5 bg-teal-200/80 text-teal-900 rounded-md text-[10px] font-black tracking-wide">
                          ANTI-SUBMIT TERBURU-BURU
                        </span>
                      </div>
                      <span className="text-[11px] text-teal-800 font-medium block">
                        Kunci selesai ujian agar murid tidak langsung mengumpulkan. Atur waktu kapan token keluar akan muncul otomatis di layar murid.
                      </span>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-teal-300 shadow-2xs hover:bg-teal-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(form.gunakanTokenKeluar)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const defaultCode = form.tokenKeluar || 'OUT' + Math.floor(1000 + Math.random() * 9000);
                        setForm({
                          ...form,
                          gunakanTokenKeluar: checked,
                          tokenKeluar: checked ? defaultCode : form.tokenKeluar,
                          waktuMunculTokenKeluarMenit: form.waktuMunculTokenKeluarMenit || 10,
                        });
                      }}
                      className="w-4 h-4 text-teal-600 rounded-sm focus:ring-teal-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-teal-950">
                      Aktifkan Token Keluar
                    </span>
                  </label>
                </div>

                {form.gunakanTokenKeluar ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Token String */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-teal-950">
                            Kode Token Keluar (Huruf Besar & Angka):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const randomCode = 'OUT' + Math.floor(1000 + Math.random() * 9000);
                              setForm({ ...form, tokenKeluar: randomCode });
                            }}
                            className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 bg-teal-100/70 hover:bg-teal-200/80 px-2 py-0.5 rounded-lg border border-teal-300 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-3 h-3" /> Acak Kode
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Contoh: OUT88 / SELESAI2026"
                          value={form.tokenKeluar || ''}
                          onChange={(e) => setForm({ ...form, tokenKeluar: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl font-mono font-black text-teal-950 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-hidden uppercase tracking-widest"
                        />
                        <span className="text-[10px] text-teal-700 block">
                          Kode yang harus diisi untuk menyelesaikan/mengirim jawaban ujian.
                        </span>
                      </div>

                      {/* Waktu Muncul Token Otomatis */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-teal-950">
                            Atur Waktu Muncul Otomatis di Layar Murid:
                          </label>
                          <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200">
                            Menit ke-{form.waktuMunculTokenKeluarMenit || 10}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="1"
                              max={form.durasiMenit || 120}
                              value={form.waktuMunculTokenKeluarMenit ?? 10}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  waktuMunculTokenKeluarMenit: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl font-bold text-teal-950 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-hidden pr-14"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-teal-700 pointer-events-none">
                              Menit
                            </span>
                          </div>
                        </div>

                        {/* Quick presets */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">Preset:</span>
                          {[5, 10, 15].map((menit) => (
                            <button
                              key={menit}
                              type="button"
                              onClick={() => setForm({ ...form, waktuMunculTokenKeluarMenit: menit })}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-colors ${
                                form.waktuMunculTokenKeluarMenit === menit
                                  ? 'bg-teal-700 text-white border-teal-700'
                                  : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-100'
                              }`}
                            >
                              {menit} Menit
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.max(1, Math.round((Number(form.durasiMenit) || 20) / 2));
                              setForm({ ...form, waktuMunculTokenKeluarMenit: half });
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer transition-colors ${
                              form.waktuMunculTokenKeluarMenit === Math.max(1, Math.round((Number(form.durasiMenit) || 20) / 2))
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-white text-teal-800 border-teal-300 hover:bg-teal-100'
                            }`}
                          >
                            50% Durasi ({Math.max(1, Math.round((Number(form.durasiMenit) || 20) / 2))} Menit)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live explanation preview */}
                    <div className="p-3 bg-white/80 rounded-xl border border-teal-200 text-[11px] text-teal-900 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-teal-950">
                          Mekanisme di Layar Murid:
                        </p>
                        <p className="text-teal-800 leading-relaxed text-[11px] mt-0.5">
                          1. Selama <strong>{form.waktuMunculTokenKeluarMenit || 10} menit</strong> pertama pengerjaan, murid tidak bisa mengumpulkan jawaban ujian sembarangan. Di layar murid akan terlihat hitung mundur waktu token keluar.
                          <br />
                          2. Setelah pengerjaan mencapai <strong>menit ke-{form.waktuMunculTokenKeluarMenit || 10}</strong>, Token Keluar <span className="font-mono font-black text-teal-950 px-1.5 py-0.5 bg-teal-100 rounded border border-teal-300">{form.tokenKeluar || 'OUT88'}</span> akan <strong>otomatis ditampilkan di layar murid</strong> beserta tombol instan untuk mengumpulkan ujian.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white/60 rounded-xl border border-teal-200/50 text-[11px] text-slate-500 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      🔓 <strong>Token Keluar Nonaktif</strong>: Murid dapat mengumpulkan ujian kapan saja tanpa batasan token selesai.
                    </span>
                  </div>
                )}
              </div>

              {/* Soal List Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <span className="font-extrabold text-slate-800 text-sm block">
                      Daftar Butir Soal ({(form.soal || []).length})
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pilihan membuat butir soal manual, atau tautkan Link Google Form, AppScript & Aplikasi soal (terbuka di dalam aplikasi).
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('Pilihan Ganda')}
                      className="px-2.5 py-1.5 bg-white text-purple-700 hover:bg-purple-50 font-bold rounded-xl text-xs flex items-center gap-1 border border-purple-200 cursor-pointer shadow-2xs"
                      title="Tambah butir soal reguler / manual"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Soal Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('Link Google Form')}
                      className="px-2.5 py-1.5 bg-purple-600 text-white hover:bg-purple-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tambah soal Google Form (terbuka langsung di dalam aplikasi)"
                    >
                      <FileText className="w-3.5 h-3.5" /> + Google Form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('Link AppScript')}
                      className="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tambah soal Google Apps Script (AppScript)"
                    >
                      <Code2 className="w-3.5 h-3.5" /> + AppScript
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('Link Aplikasi Lainnya')}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Tambah soal aplikasi lainnya (Wordwall, Quizizz, dsb.)"
                    >
                      <Globe className="w-3.5 h-3.5" /> + Aplikasi Lain
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-2.5 py-1.5 bg-slate-200/80 text-slate-700 hover:bg-slate-300 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-700" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {(form.soal || []).map((s, qIdx) => (
                    <div
                      key={s.id || qIdx}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-purple-800 text-xs">
                            Soal #{qIdx + 1}
                          </span>
                          <select
                            value={s.tipe || 'Pilihan Ganda'}
                            onChange={(e) => handleTypeChange(qIdx, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                          >
                            <optgroup label="Soal Internal / Manual">
                              <option value="Pilihan Ganda">Pilihan Ganda (A s.d. E)</option>
                              <option value="Benar/Salah">Benar / Salah (Kartu Taktil)</option>
                              <option value="Mencocokkan Gambar">Mencocokkan Gambar (Teknik Motorik)</option>
                              <option value="Tarik Garis">Tarik Garis (Kolom A & B)</option>
                              <option value="Isian">Isian Singkat & Analisis Gerak</option>
                            </optgroup>
                            <optgroup label="Tautan Soal (Buka di Aplikasi)">
                              <option value="Link Google Form">📄 Link Google Form (Di Aplikasi)</option>
                              <option value="Link AppScript">⚡ Link Google Apps Script (AppScript)</option>
                              <option value="Link Aplikasi Lainnya">🌐 Link Aplikasi Soal Lainnya (Wordwall/Quizizz/dll)</option>
                            </optgroup>
                          </select>

                          <select
                            value={s.kategoriSoal || 'HOTS'}
                            onChange={(e) => handleQuestionChange(qIdx, 'kategoriSoal', e.target.value)}
                            className="px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-[11px] font-bold text-purple-800 focus:outline-hidden"
                          >
                            <option value="HOTS">Kategori: HOTS</option>
                            <option value="AKM">Kategori: AKM</option>
                            <option value="Standar">Kategori: Standar</option>
                          </select>
                        </div>
                        {(form.soal?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Teks Pertanyaan / Instruksi Soal:
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Tuliskan teks pertanyaan soal atau instruksi motorik..."
                          value={s.pertanyaan}
                          onChange={(e) => handleQuestionChange(qIdx, 'pertanyaan', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                        />
                      </div>

                      {/* 1. Benar / Salah */}
                      {s.tipe === 'Benar/Salah' && (
                        <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            Pilih Kunci Jawaban Benar / Salah:
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIdx, 'kunciJawaban', 'Benar')}
                              className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 font-bold text-xs ${
                                s.kunciJawaban === 'Benar'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                                  : 'bg-emerald-50/50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/50'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>BENAR (True)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(qIdx, 'kunciJawaban', 'Salah')}
                              className={`p-3 rounded-xl border text-center transition-all flex items-center justify-center gap-2 font-bold text-xs ${
                                s.kunciJawaban === 'Salah'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                                  : 'bg-rose-50/50 text-rose-800 border-rose-200 hover:bg-rose-100/50'
                              }`}
                            >
                              <X className="w-4 h-4" />
                              <span>SALAH (False)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2. Mencocokkan Gambar */}
                      {s.tipe === 'Mencocokkan Gambar' && (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              URL Gambar / Foto Ilustrasi Gerak Motorik:
                            </label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/..."
                              value={s.gambarUrl || ''}
                              onChange={(e) => handleQuestionChange(qIdx, 'gambarUrl', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            />
                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold">Preset PJOK:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(
                                    qIdx,
                                    'gambarUrl',
                                    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80'
                                  )
                                }
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-semibold"
                              >
                                Bola Voli
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(
                                    qIdx,
                                    'gambarUrl',
                                    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
                                  )
                                }
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-semibold"
                              >
                                Bola Basket
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(
                                    qIdx,
                                    'gambarUrl',
                                    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80'
                                  )
                                }
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-semibold"
                              >
                                Bulutangkis
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuestionChange(
                                    qIdx,
                                    'gambarUrl',
                                    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80'
                                  )
                                }
                                className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-semibold"
                              >
                                Atletik / Lari
                              </button>
                            </div>
                          </div>

                          {s.gambarUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 w-full max-w-xs h-36 bg-slate-100">
                              <img
                                src={s.gambarUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Options */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-600 block">
                              Pilihan Teknik Motorik (A s.d. E) & Tentukan Kunci:
                            </span>
                            {(s.pilihan || []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="w-6 font-black text-slate-400 text-xs text-center">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Teknik ${String.fromCharCode(65 + optIdx)}`}
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuestionChange(qIdx, 'kunciJawaban', opt)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-colors ${
                                    s.kunciJawaban === opt && opt !== ''
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  {s.kunciJawaban === opt && opt !== '' ? '✓ Kunci' : 'Jadikan Kunci'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Tarik Garis (Menjodohkan Kolom A & Kolom B) */}
                      {s.tipe === 'Tarik Garis' && (
                        <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              Pasangan Menjodohkan (Kolom A ➔ Kolom B):
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddMatchingPair(qIdx)}
                              className="px-2 py-0.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded text-[10px] font-bold transition-colors"
                            >
                              + Tambah Baris Pasangan
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(s.matchingPairs || []).map((pair, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                <span className="w-5 text-[11px] font-bold text-slate-400 text-center">
                                  #{pIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  placeholder="Kolom A (Istilah / Posisi)"
                                  value={pair.left}
                                  onChange={(e) => handleMatchingPairChange(qIdx, pIdx, 'left', e.target.value)}
                                  className="w-1/2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <span className="text-purple-600 font-black">➔</span>
                                <input
                                  type="text"
                                  placeholder="Kolom B (Definisi / Peran Taktis)"
                                  value={pair.right}
                                  onChange={(e) => handleMatchingPairChange(qIdx, pIdx, 'right', e.target.value)}
                                  className="w-1/2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                {(s.matchingPairs?.length || 0) > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMatchingPair(qIdx, pIdx)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Pilihan Ganda (A s.d. E) */}
                      {s.tipe === 'Pilihan Ganda' && (
                        <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700">
                              Pilihan Jawaban (A sampai E):
                            </span>
                            {(s.pilihan?.length || 0) < 5 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newQuestions = [...(form.soal || [])];
                                  newQuestions[qIdx].pilihan = [...newQuestions[qIdx].pilihan, ''];
                                  setForm({ ...form, soal: newQuestions });
                                }}
                                className="text-[10px] text-purple-700 font-bold hover:underline"
                              >
                                + Tambah Opsi {String.fromCharCode(65 + s.pilihan.length)}
                              </button>
                            )}
                          </div>
                          {(s.pilihan || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="w-6 text-center font-black text-slate-400 text-xs">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                required
                                placeholder={`Opsi Jawaban ${String.fromCharCode(65 + optIdx)}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(qIdx, 'kunciJawaban', opt)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-colors ${
                                  s.kunciJawaban === opt && opt !== ''
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                              >
                                {s.kunciJawaban === opt && opt !== '' ? '✓ Kunci' : 'Jadikan Kunci'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 5. Isian Singkat */}
                      {s.tipe === 'Isian' && (
                        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Kunci Jawaban Singkat (Kata Kunci Utama):
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Lutut dan pergelangan kaki / Passing bawah..."
                            value={s.kunciJawaban}
                            onChange={(e) => handleQuestionChange(qIdx, 'kunciJawaban', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800"
                          />
                        </div>
                      )}

                      {/* 6. Link Google Form (Terbuka di Dalam Aplikasi) */}
                      {s.tipe === 'Link Google Form' && (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-purple-900 block">
                                  Tautan Formulir Google Form
                                </span>
                                <span className="text-[10px] text-purple-600 font-medium">
                                  Terbuka dan dapat dikerjakan murid langsung di dalam frame aplikasi ini.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenInAppPreview(
                                  s.linkEksternal || '',
                                  s.judulLink || 'Pratinjau Google Form Soal',
                                  'google-form',
                                  'Uji Tampilan Google Form di Dalam Aplikasi'
                                )
                              }
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Uji Buka di Aplikasi
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Judul / Nama Form Soal:
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Asesmen Harian Bab Kebugaran Jasmani"
                                value={s.judulLink || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'judulLink', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                URL Link Google Form: *
                              </label>
                              <input
                                type="url"
                                required
                                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                                value={s.linkEksternal || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'linkEksternal', e.target.value)}
                                className="w-full px-3 py-1.5 bg-purple-50/50 border border-purple-300 rounded-lg text-xs font-mono text-purple-900"
                              />
                            </div>
                          </div>

                          {/* Quick Preset / Format Helpers */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const sample = 'https://docs.google.com/forms/d/e/1FAIpQLScP_sample_pjok/viewform?embedded=true';
                                handleQuestionChange(qIdx, 'linkEksternal', sample);
                                if (!s.judulLink) handleQuestionChange(qIdx, 'judulLink', 'Kuis PJOK Form Template');
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 text-[10px] rounded font-semibold transition-colors"
                            >
                              Gunakan Contoh Template Form
                            </button>
                            {s.linkEksternal && !s.linkEksternal.includes('embedded=true') && (
                              <button
                                type="button"
                                onClick={() => {
                                  let u = s.linkEksternal || '';
                                  u += u.includes('?') ? '&embedded=true' : '?embedded=true';
                                  handleQuestionChange(qIdx, 'linkEksternal', u);
                                }}
                                className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded font-bold hover:bg-purple-200 transition-colors"
                              >
                                + Format Otomatis Embed (?embedded=true)
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 7. Link AppScript (Terbuka di Dalam Aplikasi) */}
                      {s.tipe === 'Link AppScript' && (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <Code2 className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-blue-900 block">
                                  Tautan Web App Google Apps Script (AppScript)
                                </span>
                                <span className="text-[10px] text-blue-600 font-medium">
                                  Menjalankan web app interaktif soal Apps Script langsung di dalam frame LMS.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenInAppPreview(
                                  s.linkEksternal || '',
                                  s.judulLink || 'Pratinjau AppScript Interaktif',
                                  'appscript',
                                  'Uji Tampilan Web App Apps Script di Dalam Aplikasi'
                                )
                              }
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Uji Buka di Aplikasi
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Judul / Modul AppScript:
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Asesmen Interaktif GAS Gerak Motorik"
                                value={s.judulLink || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'judulLink', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                URL Web App Apps Script (/exec): *
                              </label>
                              <input
                                type="url"
                                required
                                placeholder="https://script.google.com/macros/s/.../exec"
                                value={s.linkEksternal || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'linkEksternal', e.target.value)}
                                className="w-full px-3 py-1.5 bg-blue-50/50 border border-blue-300 rounded-lg text-xs font-mono text-blue-900"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const sample = 'https://script.google.com/macros/s/AKfycbw_sample_appscript/exec';
                                handleQuestionChange(qIdx, 'linkEksternal', sample);
                                if (!s.judulLink) handleQuestionChange(qIdx, 'judulLink', 'Aplikasi Soal Interaktif GAS');
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 text-[10px] rounded font-semibold transition-colors"
                            >
                              Gunakan Contoh URL Apps Script
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 8. Link Aplikasi Lainnya (Terbuka di Dalam Aplikasi) */}
                      {s.tipe === 'Link Aplikasi Lainnya' && (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                          <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <Globe className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-emerald-900 block">
                                  Tautan Aplikasi Soal Lainnya (Wordwall / Quizizz / dll)
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Aplikasi kuis eksternal interaktif yang disematkan langsung di dalam LMS.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenInAppPreview(
                                  s.linkEksternal || '',
                                  s.judulLink || 'Pratinjau Kuis Aplikasi Eksternal',
                                  'aplikasi-lain',
                                  'Uji Tampilan Aplikasi Kuis di Dalam LMS'
                                )
                              }
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Uji Buka di Aplikasi
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Judul / Nama Aplikasi Kuis:
                              </label>
                              <input
                                type="text"
                                placeholder="Contoh: Game Wordwall Senam Irama / Quizizz Live"
                                value={s.judulLink || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'judulLink', e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                URL Tautan Kuis Aplikasi: *
                              </label>
                              <input
                                type="url"
                                required
                                placeholder="https://wordwall.net/embed/... atau https://quizizz.com/..."
                                value={s.linkEksternal || ''}
                                onChange={(e) => handleQuestionChange(qIdx, 'linkEksternal', e.target.value)}
                                className="w-full px-3 py-1.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-xs font-mono text-emerald-900"
                              />
                            </div>
                          </div>

                          {/* Quick Platform Presets */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-bold text-slate-400">Pilihan Aplikasi Cepat:</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleQuestionChange(qIdx, 'linkEksternal', 'https://wordwall.net/embed/resource/12345/pjok');
                                handleQuestionChange(qIdx, 'judulLink', 'Kuis Wordwall Interaktif PJOK');
                              }}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold transition-colors"
                            >
                              Wordwall Embed
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleQuestionChange(qIdx, 'linkEksternal', 'https://quizizz.com/join?gc=pjok');
                                handleQuestionChange(qIdx, 'judulLink', 'Quizizz Online PJOK');
                              }}
                              className="px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-bold transition-colors"
                            >
                              Quizizz
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleQuestionChange(qIdx, 'linkEksternal', 'https://kahoot.it');
                                handleQuestionChange(qIdx, 'judulLink', 'Kahoot Challenge PJOK');
                              }}
                              className="px-2 py-0.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[10px] font-bold transition-colors"
                            >
                              Kahoot
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleQuestionChange(qIdx, 'linkEksternal', 'https://www.liveworksheets.com');
                                handleQuestionChange(qIdx, 'judulLink', 'Liveworksheets Interaktif');
                              }}
                              className="px-2 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10px] font-bold transition-colors"
                            >
                              Liveworksheets
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Kunci Jawaban Indicator / Override (Hanya untuk soal manual selain tarik garis, isian, dan link eksternal) */}
                      {s.tipe !== 'Tarik Garis' &&
                        s.tipe !== 'Isian' &&
                        s.tipe !== 'Link Google Form' &&
                        s.tipe !== 'Link AppScript' &&
                        s.tipe !== 'Link Aplikasi Lainnya' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                              Kunci Jawaban Terpilih *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Pilih dari tombol di atas atau ketik kunci..."
                              value={s.kunciJawaban}
                              onChange={(e) => handleQuestionChange(qIdx, 'kunciJawaban', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800"
                            />
                          </div>
                        )}

                      {/* Status Otomatis untuk Soal Berbasis Tautan */}
                      {(s.tipe === 'Link Google Form' ||
                        s.tipe === 'Link AppScript' ||
                        s.tipe === 'Link Aplikasi Lainnya') && (
                        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl text-[11px] text-slate-600 font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Soal link eksternal otomatis bernilai tuntas saat murid menandai dan mengonfirmasi pengerjaan di lembar tersemat.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-sm"
                >
                  {editingQuiz ? 'Simpan Perubahan' : 'Terbitkan Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Upload Data Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        type="bankSoal"
        onImport={handleImportBankSoal}
      />

      {/* In-App Quiz Viewer Modal (Terbuka di dalam Aplikasi) */}
      <InAppQuizViewerModal
        isOpen={inAppViewerState.isOpen}
        onClose={() => setInAppViewerState((prev) => ({ ...prev, isOpen: false }))}
        url={inAppViewerState.url}
        title={inAppViewerState.title}
        type={inAppViewerState.type}
        subtitle={inAppViewerState.subtitle}
      />
    </div>
  );
};
