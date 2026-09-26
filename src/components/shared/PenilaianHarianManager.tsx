import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Filter,
  Save,
  Search,
  Users,
  Sparkles,
  BookOpen,
  ArrowUpDown,
  Printer,
  ChevronRight,
  TrendingUp,
  Flame,
  Info,
} from 'lucide-react';
import { User, PenilaianHarian, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface PenilaianHarianManagerProps {
  db: LMSDatabase;
  currentUser: User;
}

const DEFAULT_MATERI_HARIAN = [
  'Permainan Bola Voli - Passing Bawah',
  'Permainan Bola Voli - Passing Atas & Servis',
  'Sepak Bola - Dribbling & Passing',
  'Bulutangkis - Servis Pendek & Footwork',
  'Senam Lantai - Roll Depan & Sikap Lilin',
  'Kebugaran Jasmani - Sirkuit Training & Push-up',
  'Atletik - Lari Jarak Pendek (Sprint)',
  'Bola Basket - Chest Pass & Lay-up',
];

const SKOR_LABEL: Record<number, { label: string; desc: string; color: string; activeBg: string; border: string }> = {
  1: {
    label: '1',
    desc: 'Perlu Bimbingan',
    color: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-400',
    border: 'border-rose-300 hover:bg-rose-50 text-rose-700',
  },
  2: {
    label: '2',
    desc: 'Kurang',
    color: 'text-amber-700',
    activeBg: 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-300',
    border: 'border-amber-300 hover:bg-amber-50 text-amber-700',
  },
  3: {
    label: '3',
    desc: 'Cukup',
    color: 'text-yellow-800',
    activeBg: 'bg-yellow-500 text-white shadow-md shadow-yellow-200 ring-2 ring-yellow-300',
    border: 'border-yellow-300 hover:bg-yellow-50 text-yellow-800',
  },
  4: {
    label: '4',
    desc: 'Baik',
    color: 'text-sky-700',
    activeBg: 'bg-sky-600 text-white shadow-md shadow-sky-200 ring-2 ring-sky-300',
    border: 'border-sky-300 hover:bg-sky-50 text-sky-700',
  },
  5: {
    label: '5',
    desc: 'Sangat Baik',
    color: 'text-emerald-700',
    activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-300',
    border: 'border-emerald-300 hover:bg-emerald-50 text-emerald-700',
  },
};

export const PenilaianHarianManager: React.FC<PenilaianHarianManagerProps> = ({ db, currentUser }) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [selectedTanggal, setSelectedTanggal] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [pertemuanKe, setPertemuanKe] = useState<number>(1);
  const [selectedMateri, setSelectedMateri] = useState<string>(DEFAULT_MATERI_HARIAN[0]);
  const [customMateriInput, setCustomMateriInput] = useState<string>('');
  const [aspekPenilaian, setAspekPenilaian] = useState<string>('Keaktifan & Penguasaan Gerak Dasar');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSkor, setFilterSkor] = useState<string>('Semua');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active class object
  const currentKelas = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  // Students in selected class
  const studentsInClass = useMemo(() => {
    return (db.users || [])
      .filter((u) => u.role === 'MURID' && u.kelasId === selectedKelasId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId]);

  // Current daily evaluations map: studentId -> PenilaianHarian
  const activeMateriJudul = customMateriInput.trim() || selectedMateri;

  const currentRecordsMap = useMemo(() => {
    const map = new Map<string, PenilaianHarian>();
    (db.penilaianHarian || []).forEach((r) => {
      if (
        r.kelasId === selectedKelasId &&
        r.tanggal === selectedTanggal &&
        r.materi === activeMateriJudul
      ) {
        map.set(r.muridId, r);
      }
    });
    return map;
  }, [db.penilaianHarian, selectedKelasId, selectedTanggal, activeMateriJudul]);

  // Kotak Centang State for quick participation entry
  interface StudentChecklist {
    bisaMenjawabCount: number; // 0, 1, 2, 3+
    memberikanMasukan: boolean;
    mauAktif: boolean;
    customSkor?: number;
    catatan: string;
  }

  const [checklistData, setChecklistData] = useState<Record<string, StudentChecklist>>({});

  // Sync checklist state when class, date, or records change
  React.useEffect(() => {
    const initial: Record<string, StudentChecklist> = {};
    studentsInClass.forEach((s) => {
      const rec = currentRecordsMap.get(s.id);
      if (rec) {
        initial[s.id] = {
          bisaMenjawabCount: rec.bisaMenjawabCount ?? (rec.skor >= 4 ? 1 : 0),
          memberikanMasukan: rec.memberikanMasukan ?? (rec.skor === 5),
          mauAktif: rec.mauAktif ?? (rec.skor >= 3),
          customSkor: rec.skor,
          catatan: rec.catatan || '',
        };
      } else {
        initial[s.id] = {
          bisaMenjawabCount: 0,
          memberikanMasukan: false,
          mauAktif: true, // Default siswa di kelas PJOK bersiap aktif
          catatan: '',
        };
      }
    });
    setChecklistData(initial);
  }, [studentsInClass, currentRecordsMap]);

  // Function to calculate score 1-5 from checkboxes
  const computeStudentScore = (sId: string): number => {
    const c = checklistData[sId];
    if (!c) return 3;
    if (c.customSkor) return c.customSkor;
    let s = 1;
    if (c.mauAktif) s += 2; // Aktif = 3 (Cukup)
    if (c.bisaMenjawabCount >= 1) s += 1; // Menjawab 1x = 4 (Baik)
    if (c.bisaMenjawabCount >= 2 || c.memberikanMasukan) s += 1; // Menjawab 2x+ / Masukan = 5 (Sangat Baik)
    return Math.min(5, Math.max(1, s));
  };

  const handleToggleMauAktif = (muridId: string) => {
    setChecklistData((prev) => {
      const current = prev[muridId] || { bisaMenjawabCount: 0, memberikanMasukan: false, mauAktif: true, catatan: '' };
      return {
        ...prev,
        [muridId]: {
          ...current,
          mauAktif: !current.mauAktif,
          customSkor: undefined, // Recalculate
        },
      };
    });
  };

  const handleToggleMasukan = (muridId: string) => {
    setChecklistData((prev) => {
      const current = prev[muridId] || { bisaMenjawabCount: 0, memberikanMasukan: false, mauAktif: true, catatan: '' };
      return {
        ...prev,
        [muridId]: {
          ...current,
          memberikanMasukan: !current.memberikanMasukan,
          customSkor: undefined,
        },
      };
    });
  };

  const handleSetBisaMenjawab = (muridId: string, count: number) => {
    setChecklistData((prev) => {
      const current = prev[muridId] || { bisaMenjawabCount: 0, memberikanMasukan: false, mauAktif: true, catatan: '' };
      const newCount = current.bisaMenjawabCount === count ? 0 : count;
      return {
        ...prev,
        [muridId]: {
          ...current,
          bisaMenjawabCount: newCount,
          customSkor: undefined,
        },
      };
    });
  };

  const handleSetCustomScore = (muridId: string, score: number) => {
    setChecklistData((prev) => {
      const current = prev[muridId] || { bisaMenjawabCount: 0, memberikanMasukan: false, mauAktif: true, catatan: '' };
      return {
        ...prev,
        [muridId]: {
          ...current,
          customSkor: score,
        },
      };
    });
  };

  const handleChecklistNoteChange = (muridId: string, note: string) => {
    setChecklistData((prev) => {
      const current = prev[muridId] || { bisaMenjawabCount: 0, memberikanMasukan: false, mauAktif: true, catatan: '' };
      return {
        ...prev,
        [muridId]: {
          ...current,
          catatan: note,
        },
      };
    });
  };

  // Quick Action: Centang Semua Mau Aktif
  const handleBatchCentangSemuaAktif = () => {
    setChecklistData((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        next[s.id] = {
          ...(next[s.id] || { bisaMenjawabCount: 0, memberikanMasukan: false, catatan: '' }),
          mauAktif: true,
          customSkor: undefined,
        };
      });
      return next;
    });
    setToastMessage(`Semua ${studentsInClass.length} murid dicentang Mau Aktif [✓]`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Quick Action: Centang Menjawab 1x Semua
  const handleBatchCentangMenjawab = () => {
    setChecklistData((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        next[s.id] = {
          ...(next[s.id] || { memberikanMasukan: false, mauAktif: true, catatan: '' }),
          bisaMenjawabCount: 1,
          customSkor: undefined,
        };
      });
      return next;
    });
    setToastMessage(`Semua murid dicentang Bisa Menjawab 1x [✓]`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // SAVE ALL CHECKLISTS DIRECTLY
  const handleSaveAllChecklists = () => {
    if (studentsInClass.length === 0) return;

    const newRecords: PenilaianHarian[] = studentsInClass.map((m) => {
      const c = checklistData[m.id] || {
        bisaMenjawabCount: 0,
        memberikanMasukan: false,
        mauAktif: true,
        catatan: '',
      };
      const existing = currentRecordsMap.get(m.id);
      const computedScore = computeStudentScore(m.id);

      return {
        id: existing?.id || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        muridId: m.id,
        muridNama: m.name,
        nis: m.nis,
        kelasId: selectedKelasId,
        kelasNama: currentKelas?.nama || selectedKelasId,
        tanggal: selectedTanggal,
        pertemuanKe,
        materi: activeMateriJudul,
        skor: computedScore,
        aspek: aspekPenilaian,
        bisaMenjawabCount: c.bisaMenjawabCount,
        memberikanMasukan: c.memberikanMasukan,
        mauAktif: c.mauAktif,
        catatan: c.catatan || existing?.catatan || '',
        guruId: currentUser.id,
        guruNama: currentUser.name,
        updatedAt: new Date().toISOString(),
      };
    });

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      const studentIds = new Set(studentsInClass.map((s) => s.id));
      const remaining = prevList.filter(
        (r) =>
          !(
            studentIds.has(r.muridId) &&
            r.kelasId === selectedKelasId &&
            r.tanggal === selectedTanggal &&
            r.materi === activeMateriJudul
          )
      );
      return {
        ...prev,
        penilaianHarian: [...remaining, ...newRecords],
      };
    });

    setToastMessage(`Berhasil menyimpan penilaian harian untuk ${studentsInClass.length} murid!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Direct save for a single student row
  const handleSaveSingleChecklist = (muridId: string) => {
    const murid = studentsInClass.find((s) => s.id === muridId);
    if (!murid) return;
    const c = checklistData[muridId] || {
      bisaMenjawabCount: 0,
      memberikanMasukan: false,
      mauAktif: true,
      catatan: '',
    };
    const existing = currentRecordsMap.get(muridId);
    const computedScore = computeStudentScore(muridId);

    const newRecord: PenilaianHarian = {
      id: existing?.id || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      muridId: murid.id,
      muridNama: murid.name,
      nis: murid.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: selectedTanggal,
      pertemuanKe,
      materi: activeMateriJudul,
      skor: computedScore,
      aspek: aspekPenilaian,
      bisaMenjawabCount: c.bisaMenjawabCount,
      memberikanMasukan: c.memberikanMasukan,
      mauAktif: c.mauAktif,
      catatan: c.catatan || existing?.catatan || '',
      guruId: currentUser.id,
      guruNama: currentUser.name,
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      const remaining = prevList.filter(
        (r) =>
          !(
            r.muridId === muridId &&
            r.kelasId === selectedKelasId &&
            r.tanggal === selectedTanggal &&
            r.materi === activeMateriJudul
          )
      );
      return {
        ...prev,
        penilaianHarian: [...remaining, newRecord],
      };
    });

    setToastMessage(`Tersimpan: ${murid.name} (Skor ${computedScore})`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  // Handle setting a student's score 1-5 manually
  const handleSetScore = (murid: User, score: number) => {
    const existing = currentRecordsMap.get(murid.id);

    const updatedRecord: PenilaianHarian = {
      id: existing?.id || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      muridId: murid.id,
      muridNama: murid.name,
      nis: murid.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: selectedTanggal,
      pertemuanKe,
      materi: activeMateriJudul,
      skor: score,
      aspek: aspekPenilaian,
      catatan: existing?.catatan || '',
      guruId: currentUser.id,
      guruNama: currentUser.name,
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      const filtered = prevList.filter(
        (r) =>
          !(
            r.muridId === murid.id &&
            r.kelasId === selectedKelasId &&
            r.tanggal === selectedTanggal &&
            r.materi === activeMateriJudul
          )
      );
      return {
        ...prev,
        penilaianHarian: [...filtered, updatedRecord],
      };
    });

    setToastMessage(`Skor ${score} berhasil dicatat untuk ${murid.name}`);
    setTimeout(() => setToastMessage(null), 1800);
  };

  // Handle note change
  const handleSetNote = (murid: User, note: string) => {
    const existing = currentRecordsMap.get(murid.id);
    if (!existing) return;

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      return {
        ...prev,
        penilaianHarian: prevList.map((r) =>
          r.id === existing.id ? { ...r, catatan: note, updatedAt: new Date().toISOString() } : r
        ),
      };
    });
  };

  // Batch set all students to a certain score
  const handleBatchSetAll = (score: number) => {
    if (studentsInClass.length === 0) return;
    const confirmAction = window.confirm(
      `Setel semua (${studentsInClass.length}) murid di kelas ini ke Skor ${score}?`
    );
    if (!confirmAction) return;

    const newRecords: PenilaianHarian[] = studentsInClass.map((m) => {
      const existing = currentRecordsMap.get(m.id);
      return {
        id: existing?.id || `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        muridId: m.id,
        muridNama: m.name,
        nis: m.nis,
        kelasId: selectedKelasId,
        kelasNama: currentKelas?.nama || selectedKelasId,
        tanggal: selectedTanggal,
        pertemuanKe,
        materi: activeMateriJudul,
        skor: score,
        aspek: aspekPenilaian,
        catatan: existing?.catatan || '',
        guruId: currentUser.id,
        guruNama: currentUser.name,
        updatedAt: new Date().toISOString(),
      };
    });

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      const studentIds = new Set(studentsInClass.map((s) => s.id));
      const remaining = prevList.filter(
        (r) =>
          !(
            studentIds.has(r.muridId) &&
            r.kelasId === selectedKelasId &&
            r.tanggal === selectedTanggal &&
            r.materi === activeMateriJudul
          )
      );
      return {
        ...prev,
        penilaianHarian: [...remaining, ...newRecords],
      };
    });

    setToastMessage(`Semua ${studentsInClass.length} murid disetel ke Skor ${score}!`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Reset/Clear today's scores for this class
  const handleClearTodayScores = () => {
    const confirmClear = window.confirm(
      'Yakin ingin mengosongkan nilai harian untuk pertemuan & materi ini?'
    );
    if (!confirmClear) return;

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianHarian || [];
      const studentIds = new Set(studentsInClass.map((s) => s.id));
      const remaining = prevList.filter(
        (r) =>
          !(
            studentIds.has(r.muridId) &&
            r.kelasId === selectedKelasId &&
            r.tanggal === selectedTanggal &&
            r.materi === activeMateriJudul
          )
      );
      return {
        ...prev,
        penilaianHarian: remaining,
      };
    });
  };

  // Statistics
  const stats = useMemo(() => {
    let totalScore = 0;
    let count = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    studentsInClass.forEach((s) => {
      const rec = currentRecordsMap.get(s.id);
      if (rec && rec.skor >= 1 && rec.skor <= 5) {
        totalScore += rec.skor;
        count++;
        distribution[rec.skor] = (distribution[rec.skor] || 0) + 1;
      }
    });

    const avg = count > 0 ? (totalScore / count).toFixed(1) : '-';
    return { count, total: studentsInClass.length, avg, distribution };
  }, [studentsInClass, currentRecordsMap]);

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    return studentsInClass.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery));
      if (!matchSearch) return false;

      const rec = currentRecordsMap.get(s.id);
      if (filterSkor === 'Semua') return true;
      if (filterSkor === 'Belum') return !rec;
      if (filterSkor === 'Sudah') return !!rec;
      return rec?.skor === Number(filterSkor);
    });
  }, [studentsInClass, searchQuery, filterSkor, currentRecordsMap]);

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-sky-600" /> Asesmen Cepat Lapangan
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Skala Skor 1 - 5</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Penilaian Harian PJOK
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl mt-1">
              Asesmen cepat keaktifan lapangan: cukup isi <strong>kotak centang</strong> (berapa kali bisa menjawab, memberikan masukan, dan mau aktif), nilai otomatis terhitung dan langsung klik <strong>Simpan</strong>.
            </p>
          </div>

          {/* Quick Stats & Primary Save Button */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-center px-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Ternilai</span>
                <span className="text-base font-black text-slate-800">
                  {stats.count} / {stats.total}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center px-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Rata-rata</span>
                <span className="text-base font-black text-sky-600">{stats.avg} / 5</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAllChecklists}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Penilaian Harian</span>
            </button>
          </div>
        </div>

        {/* Form Controls: Kelas, Tanggal, Pertemuan, Materi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Kelas / Rombel</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Pembelajaran</label>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Pertemuan Ke-</label>
            <input
              type="number"
              min={1}
              max={36}
              value={pertemuanKe}
              onChange={(e) => setPertemuanKe(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Materi / Topik Harian</label>
            <select
              value={selectedMateri}
              onChange={(e) => setSelectedMateri(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              {DEFAULT_MATERI_HARIAN.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend Petunjuk Centang */}
        <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Petunjuk Kotak Centang Keaktifan:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
              [✓] Mau Aktif (+skor gerak)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-bold">
              [✓] Bisa Menjawab (1x, 2x, 3x)
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 font-bold">
              [✓] Memberikan Masukan / Ide
            </span>
            <span className="text-slate-500 font-semibold">• Nilai 1-5 otomatis terisi</span>
          </div>
        </div>
      </div>

      {/* Quick Batch Actions & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama murid atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
            />
          </div>
          <select
            value={filterSkor}
            onChange={(e) => setFilterSkor(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shrink-0"
          >
            <option value="Semua">Semua Status</option>
            <option value="Sudah">Sudah Dinilai ({stats.count})</option>
            <option value="Belum">Belum Dinilai ({stats.total - stats.count})</option>
            <option value="5">Skor 5 Saja</option>
            <option value="4">Skor 4 Saja</option>
            <option value="3">Skor 3 Saja</option>
            <option value="2">Skor 2 Saja</option>
            <option value="1">Skor 1 Saja</option>
          </select>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Centang Cepat:</span>
          <button
            type="button"
            onClick={handleBatchCentangSemuaAktif}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200 flex items-center gap-1"
            title="Centang semua murid mau aktif"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Semua Mau Aktif</span>
          </button>
          <button
            type="button"
            onClick={handleBatchCentangMenjawab}
            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-sky-200 flex items-center gap-1"
            title="Centang semua murid menjawab 1x"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Semua Menjawab 1x</span>
          </button>
          <button
            type="button"
            onClick={handleClearTodayScores}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kosongkan
          </button>
          <button
            type="button"
            onClick={handleSaveAllChecklists}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
            title="Simpan semua data centang yang ada di layar"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Langsung Simpan Semua</span>
          </button>
        </div>
      </div>

      {/* Student List with Kotak Centang & Score Display */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Daftar Peserta Didik ({filteredStudents.length} Murid)</span>
          <span className="text-emerald-700 font-semibold hidden sm:inline">
            Cukup centang keaktifan, nilai otomatis terhitung lalu klik Simpan
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-sm">Tidak ada data murid di kelas ini</p>
            <p className="text-xs">Pastikan kelas memiliki murid terdaftar atau ubah kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((murid, idx) => {
              const chk = checklistData[murid.id] || {
                bisaMenjawabCount: 0,
                memberikanMasukan: false,
                mauAktif: true,
                catatan: '',
              };
              const computedScore = computeStudentScore(murid.id);

              return (
                <div
                  key={murid.id}
                  className="p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Left: Student Identity */}
                  <div className="flex items-center gap-3 min-w-0 min-w-[200px] flex-1">
                    <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                      {murid.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate">{murid.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            SKOR_LABEL[computedScore]?.color || 'text-slate-700'
                          }`}
                        >
                          Skor {computedScore} ({SKOR_LABEL[computedScore]?.desc})
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        NIS: <strong className="text-slate-600 font-semibold">{murid.nis || '-'}</strong>{' '}
                        • Kelas {currentKelas?.nama}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Kotak Centang Keaktifan */}
                  <div className="flex items-center gap-2.5 flex-wrap bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                    {/* Kotak Centang 1: Mau Aktif */}
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all bg-white hover:bg-slate-50 text-xs font-bold select-none">
                      <input
                        type="checkbox"
                        checked={chk.mauAktif}
                        onChange={() => handleToggleMauAktif(murid.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={chk.mauAktif ? 'text-emerald-800' : 'text-slate-500'}>
                        Mau Aktif
                      </span>
                    </label>

                    {/* Kotak Centang 2: Memberikan Masukan */}
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all bg-white hover:bg-slate-50 text-xs font-bold select-none">
                      <input
                        type="checkbox"
                        checked={chk.memberikanMasukan}
                        onChange={() => handleToggleMasukan(murid.id)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className={chk.memberikanMasukan ? 'text-purple-800' : 'text-slate-500'}>
                        Memberikan Masukan
                      </span>
                    </label>

                    {/* Kotak Centang 3: Berapa Kali Bisa Menjawab (Tally Checkbox) */}
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Bisa Menjawab:</span>
                      {[1, 2, 3].map((num) => {
                        const isChecked = chk.bisaMenjawabCount >= num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleSetBisaMenjawab(murid.id, num)}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                              isChecked
                                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={`Klik untuk tandai menjawab ${num}x`}
                          >
                            ✓ {num}x
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Skor Buttons 1-5 & Note */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const isSelected = computedScore === val;
                        const meta = SKOR_LABEL[val];

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSetCustomScore(murid.id, val)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs transition-all transform active:scale-95 cursor-pointer flex items-center justify-center border ${
                              isSelected
                                ? meta.activeBg
                                : `bg-white ${meta.border} text-slate-700 hover:bg-slate-50 shadow-2xs`
                            }`}
                            title={`Skor manual ${val}`}
                          >
                            <span>{val}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Note input */}
                    <input
                      type="text"
                      placeholder="Catatan..."
                      value={chk.catatan || ''}
                      onChange={(e) => handleChecklistNoteChange(murid.id, e.target.value)}
                      className="w-full sm:w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-hidden"
                    />

                    {/* Direct Row Save Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveSingleChecklist(murid.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                      title="Simpan nilai keaktifan murid ini sekarang"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Bar */}
        {filteredStudents.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Semua centang keaktifan siap disimpan ke rekap harian kelas.
            </span>
            <button
              type="button"
              onClick={handleSaveAllChecklists}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Penilaian Harian ({filteredStudents.length} Murid)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
