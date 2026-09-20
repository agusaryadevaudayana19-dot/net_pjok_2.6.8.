import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Calendar,
  Save,
  Users,
  Clock,
  Search,
  Check,
  Sparkles,
  LayoutList,
  Table as TableIcon,
  MessageSquare,
  X,
  Filter,
  Lock,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RotateCcw,
  AlertTriangle,
  MoveHorizontal,
  WrapText,
  SlidersHorizontal,
  FileText,
  RefreshCw,
  Printer,
  Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PresensiRecord, StatusPresensi, User, UserRole, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { RekapPresensiTable } from './RekapPresensiTable';
import { PengajuanIzinManager } from './PengajuanIzinManager';

interface AttendanceManagerProps {
  db: LMSDatabase;
  role: UserRole;
  currentUser: User;
  initialTab?: 'harian' | 'rekap' | 'surat-izin';
}

interface StatusConfig {
  key: StatusPresensi;
  code: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  activeColor: string;
  unselectedColor: string;
  ringColor: string;
}

const STATUS_LIST: StatusConfig[] = [
  {
    key: 'H',
    code: 'H',
    name: 'Hadir',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    activeColor: 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 font-black',
    unselectedColor: 'bg-emerald-50/80 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100 font-bold',
    ringColor: 'border-emerald-500',
  },
  {
    key: 'S',
    code: 'S',
    name: 'Sakit',
    badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
    badgeText: 'text-sky-800 dark:text-sky-300',
    activeColor: 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-400 font-black',
    unselectedColor: 'bg-sky-50/80 text-sky-800 border border-sky-200/90 hover:bg-sky-100 font-bold',
    ringColor: 'border-sky-500',
  },
  {
    key: 'I',
    code: 'I',
    name: 'Izin',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    activeColor: 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300 font-black',
    unselectedColor: 'bg-amber-50/80 text-amber-800 border border-amber-200/90 hover:bg-amber-100 font-bold',
    ringColor: 'border-amber-500',
  },
  {
    key: 'A',
    code: 'A',
    name: 'Alpa',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    activeColor: 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400 font-black',
    unselectedColor: 'bg-rose-50/80 text-rose-800 border border-rose-200/90 hover:bg-rose-100 font-bold',
    ringColor: 'border-rose-500',
  },
  {
    key: 'T',
    code: 'T',
    name: 'Terlambat',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    activeColor: 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400 font-black',
    unselectedColor: 'bg-purple-50/80 text-purple-800 border border-purple-200/90 hover:bg-purple-100 font-bold',
    ringColor: 'border-purple-500',
  },
];

const DEFAULT_KETERANGAN: Record<StatusPresensi, string> = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
  T: 'Terlambat',
};

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  db,
  role,
  currentUser,
  initialTab = 'harian',
}) => {
  const assignedClasses = useMemo(() => {
    if (role === 'GURU') {
      return getTeacherAssignedClasses(currentUser, db.kelas);
    }
    return db.kelas;
  }, [role, currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (role === 'GURU' && assignedClasses.length > 0) {
      return assignedClasses[0].id;
    }
    return db.kelas.length > 0 ? db.kelas[0].id : '';
  });

  useEffect(() => {
    if (assignedClasses.length > 0 && !assignedClasses.some((k) => k.id === selectedKelasId)) {
      setSelectedKelasId(assignedClasses[0].id);
    }
  }, [assignedClasses, selectedKelasId]);
  const [selectedTanggal, setSelectedTanggal] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [mainTab, setMainTab] = useState<'harian' | 'rekap' | 'surat-izin'>(initialTab || 'harian');

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab);
    }
  }, [initialTab]);

  const pendingIzinCount = (db.pengajuanIzin || []).filter((i) => i.status === 'Menunggu').length;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusPresensi>('ALL');

  // Default to compact mobile-first mode with H, S, I, A, T directly fitted with student name
  const [viewMode, setViewMode] = useState<'compact' | 'table' | 'card'>('compact');
  // Mode tampilan nama murid pada hp: 'wrap' (semua nama utuh) atau 'scroll' (geser kanan kiri)
  const [compactNameMode, setCompactNameMode] = useState<'wrap' | 'scroll'>('wrap');
  const [showResetAbsensiModal, setShowResetAbsensiModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [editingNoteMuridId, setEditingNoteMuridId] = useState<string | null>(null);

  const selectedKelasObj = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  const muridInKelas = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();
    return db.users.filter((u) => {
      if (u.role !== 'MURID') return false;
      const uKelas = (u.kelasId || '').toLowerCase().trim();
      return uKelas === targetId || (targetNama && uKelas === targetNama);
    });
  }, [db.users, selectedKelasId, selectedKelasObj]);

  // Attendance and notes maps for selected date & class
  const getInitialStatus = (): Record<string, StatusPresensi> => {
    const map: Record<string, StatusPresensi> = {};
    muridInKelas.forEach((m) => {
      const existing = (db.presensi || []).find(
        (p) => p.muridId === m.id && p.tanggal === selectedTanggal
      );
      map[m.id] = existing ? existing.status : 'H';
    });
    return map;
  };

  const getInitialNotes = (): Record<string, string> => {
    const map: Record<string, string> = {};
    muridInKelas.forEach((m) => {
      const existing = (db.presensi || []).find(
        (p) => p.muridId === m.id && p.tanggal === selectedTanggal
      );
      if (existing && existing.keterangan && existing.keterangan !== 'Presensi Pembelajaran PJOK') {
        map[m.id] = existing.keterangan;
      } else {
        const st = existing ? existing.status : 'H';
        map[m.id] = DEFAULT_KETERANGAN[st];
      }
    });
    return map;
  };

  const [attendanceMap, setAttendanceMap] = useState<Record<string, StatusPresensi>>(getInitialStatus());
  const [keteranganMap, setKeteranganMap] = useState<Record<string, string>>(getInitialNotes());

  // Sync attendance map when class or date changes, automatically checking pengajuan izin
  useEffect(() => {
    const statusMap: Record<string, StatusPresensi> = {};
    const notesMap: Record<string, string> = {};

    muridInKelas.forEach((m) => {
      // Cari surat izin siswa untuk tanggal ini (urutkan dari yang terbaru)
      const matchingIzinList = (db.pengajuanIzin || [])
        .filter((i) => {
          const matchStudent =
            i.muridId === m.id ||
            (m.nis && i.muridNis === m.nis) ||
            (i.muridNama && m.name && i.muridNama.trim().toLowerCase() === m.name.trim().toLowerCase());
          if (!matchStudent) return false;
          const start = i.tanggal;
          const end = i.tanggalSelesai || i.tanggal;
          return selectedTanggal >= start && selectedTanggal <= end;
        })
        .sort((a, b) => (b.tanggalPengajuan || '').localeCompare(a.tanggalPengajuan || ''));

      const izin = matchingIzinList[0] || null;

      const existing = (db.presensi || []).find(
        (p) =>
          (p.muridId === m.id || (m.nis && p.nis === m.nis) || (p.muridNama && m.name && p.muridNama.trim().toLowerCase() === m.name.trim().toLowerCase())) &&
          p.tanggal === selectedTanggal
      );

      let st: StatusPresensi = 'H';
      let note = '';

      if (izin && izin.status === 'Ditolak') {
        // Jika surat izin ditolak, status presensi TIDAK boleh Sakit/Izin, tapi ALPA TETAP!
        st = 'A';
        note = `Surat ${izin.kategori} Ditolak Guru: ${izin.catatanGuru || ''} (Alpa Tetap. Wajib ajukan ulang)`;
      } else if (izin && izin.status === 'Disetujui') {
        st = izin.kategori === 'Sakit' ? 'S' : 'I';
        note = `Surat ${izin.kategori}: ${izin.alasan || ''} (Disetujui)`;
      } else if (izin && izin.status === 'Menunggu') {
        st = izin.kategori === 'Sakit' ? 'S' : 'I';
        note = `Surat ${izin.kategori}: ${izin.alasan || ''} (Menunggu Verifikasi Guru)`;
      } else if (existing) {
        st = existing.status;
        note = existing.keterangan || DEFAULT_KETERANGAN[st];
      } else {
        st = 'H';
        note = DEFAULT_KETERANGAN['H'];
      }

      statusMap[m.id] = st;
      notesMap[m.id] = note;
    });

    setAttendanceMap(statusMap);
    setKeteranganMap(notesMap);
  }, [selectedKelasId, selectedTanggal, muridInKelas, db.presensi, db.pengajuanIzin]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSyncIzinMurid = () => {
    let syncedCount = 0;
    const updatedStatus = { ...attendanceMap };
    const updatedNotes = { ...keteranganMap };

    muridInKelas.forEach((m) => {
      const izin = (db.pengajuanIzin || []).find((i) => {
        if (i.muridId !== m.id) return false;
        const start = i.tanggal;
        const end = i.tanggalSelesai || i.tanggal;
        return selectedTanggal >= start && selectedTanggal <= end;
      });

      if (izin && izin.status !== 'Ditolak') {
        const st: StatusPresensi = izin.kategori === 'Sakit' ? 'S' : 'I';
        updatedStatus[m.id] = st;
        const verifTag = izin.status === 'Disetujui' ? '(Disetujui)' : '(Pengajuan Murid)';
        updatedNotes[m.id] = `Surat ${izin.kategori}: ${izin.alasan || ''} ${verifTag}`;
        syncedCount++;
      } else if (izin && izin.status === 'Ditolak') {
        updatedStatus[m.id] = 'A';
        updatedNotes[m.id] = `Surat ${izin.kategori} Ditolak: ${izin.catatanGuru || ''} (Alpa Tetap)`;
        syncedCount++;
      }
    });

    setAttendanceMap(updatedStatus);
    setKeteranganMap(updatedNotes);
    if (syncedCount > 0) {
      showToast(`Berhasil menyinkronkan ${syncedCount} murid yang memiliki surat izin/sakit!`, 'success');
    } else {
      showToast('Tidak ada pengajuan izin/sakit untuk tanggal ini.', 'info');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredMurid.map((m, idx) => {
        const st = attendanceMap[m.id] || 'H';
        const ket = keteranganMap[m.id] || DEFAULT_KETERANGAN[st];
        return {
          'No': idx + 1,
          'NIS': m.nis || '-',
          'Nama Murid': m.name,
          'Kelas': selectedKelasObj?.nama || selectedKelasId,
          'Tanggal': selectedTanggal,
          'Status': st,
          'Keterangan': ket,
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Presensi Harian');
      XLSX.writeFile(wb, `Presensi_Kelas_${selectedKelasObj?.nama || selectedKelasId}_${selectedTanggal}.xlsx`);
      showToast('Data presensi berhasil diexport ke file Excel (.xlsx)!', 'success');
    } catch (e) {
      showToast('Gagal mengekspor data ke Excel.', 'info');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['No', 'NIS', 'Nama Murid', 'Kelas', 'Tanggal', 'Status', 'Keterangan'];
      const rows = filteredMurid.map((m, idx) => [
        idx + 1,
        `"${m.nis || '-'}"`,
        `"${m.name}"`,
        `"${selectedKelasObj?.nama || selectedKelasId}"`,
        `"${selectedTanggal}"`,
        `"${attendanceMap[m.id] || 'H'}"`,
        `"${(keteranganMap[m.id] || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Presensi_Kelas_${selectedKelasObj?.nama || selectedKelasId}_${selectedTanggal}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Data presensi berhasil diexport ke file CSV (.csv)!', 'success');
    } catch (e) {
      showToast('Gagal mengekspor data ke CSV.', 'info');
    }
  };

  const handleChangeStatus = (muridId: string, status: StatusPresensi) => {
    setAttendanceMap((prev) => ({ ...prev, [muridId]: status }));

    // Automatically update default keterangan unless a custom note was typed
    setKeteranganMap((prev) => {
      const currentNote = prev[muridId] || '';
      const isDefault = Object.values(DEFAULT_KETERANGAN).includes(currentNote) || !currentNote;
      if (isDefault) {
        return { ...prev, [muridId]: DEFAULT_KETERANGAN[status] };
      }
      return prev;
    });
  };

  const handleUpdateKeterangan = (muridId: string, note: string) => {
    setKeteranganMap((prev) => ({ ...prev, [muridId]: note }));
  };

  const handleSetAllHadir = () => {
    const updatedStatus: Record<string, StatusPresensi> = {};
    const updatedNotes: Record<string, string> = {};

    muridInKelas.forEach((m) => {
      updatedStatus[m.id] = 'H';
      updatedNotes[m.id] = DEFAULT_KETERANGAN['H'];
    });

    setAttendanceMap(updatedStatus);
    setKeteranganMap(updatedNotes);
    showToast(`Semua (${muridInKelas.length} murid) disetel Hadir (H)`, 'info');
  };

  const handleSavePresensi = () => {
    const currentKelasObj = (db.kelas || []).find((k) => k.id === selectedKelasId);
    const kelasNama = currentKelasObj?.nama || selectedKelasId;

    const newRecords: PresensiRecord[] = muridInKelas.map((m) => {
      const st = attendanceMap[m.id] || 'H';
      const note = keteranganMap[m.id] || DEFAULT_KETERANGAN[st];

      return {
        id: `prs-${m.id}-${selectedTanggal}`,
        muridId: m.id,
        muridNama: m.name,
        kelasId: selectedKelasId,
        kelasNama: `Kelas ${kelasNama}`,
        tanggal: selectedTanggal,
        status: st,
        keterangan: note,
        guruId: currentUser?.id,
        guruNama: currentUser?.name,
      };
    });

    dataStorage.updateDatabase((prev) => {
      const otherRecords = prev.presensi.filter(
        (p) => !(p.kelasId === selectedKelasId && p.tanggal === selectedTanggal)
      );
      return {
        ...prev,
        presensi: [...otherRecords, ...newRecords],
      };
    });

    showToast(`Presensi Kelas ${kelasNama} (${newRecords.length} murid) berhasil disimpan!`, 'success');
  };

  const filteredMurid = useMemo(() => {
    return muridInKelas.filter((m) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesNis = m.nis && m.nis.toLowerCase().includes(q);
        if (!matchesName && !matchesNis) return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        const currentSt = attendanceMap[m.id] || 'H';
        if (currentSt !== statusFilter) return false;
      }
      return true;
    });
  }, [muridInKelas, searchQuery, statusFilter, attendanceMap]);

  // Stats calculation
  const total = muridInKelas.length || 1;
  const countH = Object.values(attendanceMap).filter((s) => s === 'H').length;
  const countS = Object.values(attendanceMap).filter((s) => s === 'S').length;
  const countI = Object.values(attendanceMap).filter((s) => s === 'I').length;
  const countA = Object.values(attendanceMap).filter((s) => s === 'A').length;
  const countT = Object.values(attendanceMap).filter((s) => s === 'T').length;
  const persentase = Math.round(((countH + countT) / total) * 100);

  const handleResetCurrentDatePresensi = () => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      presensi: (prev.presensi || []).filter(
        (p) => !(p.kelasId === selectedKelasId && p.tanggal === selectedTanggal)
      ),
    }));
    const newStatus: Record<string, StatusPresensi> = {};
    const newNotes: Record<string, string> = {};
    muridInKelas.forEach((m) => {
      newStatus[m.id] = 'H';
      newNotes[m.id] = DEFAULT_KETERANGAN['H'];
    });
    setAttendanceMap(newStatus);
    setKeteranganMap(newNotes);
    setShowResetAbsensiModal(false);
    showToast(`Presensi tanggal ${selectedTanggal} berhasil dikosongkan ke nol.`, 'success');
  };

  const handleResetAllPresensi = () => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      presensi: [],
      isNilaiPresensiReset: true,
    }));
    const newStatus: Record<string, StatusPresensi> = {};
    const newNotes: Record<string, string> = {};
    muridInKelas.forEach((m) => {
      newStatus[m.id] = 'H';
      newNotes[m.id] = DEFAULT_KETERANGAN['H'];
    });
    setAttendanceMap(newStatus);
    setKeteranganMap(newNotes);
    setShowResetAbsensiModal(false);
    showToast('Seluruh riwayat presensi semua kelas berhasil dikosongkan ke nol!', 'success');
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-3">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="flex-1">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Switcher: Input Harian vs Rekapan Absensi */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-1.5 bg-slate-200/90 rounded-2xl shadow-xs border border-slate-300/60">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setMainTab('harian')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'harian'
                ? 'bg-white text-blue-950 shadow-sm ring-1 ring-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <span>Input Presensi Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('rekap')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'rekap'
                ? 'bg-white text-indigo-950 shadow-sm ring-2 ring-indigo-400 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <TableIcon className="w-4 h-4 text-indigo-600" />
            <span>📊 Rekapan Absensi & Rekapitulasi</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('surat-izin')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
              mainTab === 'surat-izin'
                ? 'bg-white text-emerald-950 shadow-sm ring-2 ring-emerald-500 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Surat Izin & Sakit</span>
            {pendingIzinCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingIzinCount}
              </span>
            )}
          </button>
        </div>

        <div className="px-3 py-1 bg-white/70 rounded-xl text-[11px] font-semibold text-slate-600 flex items-center justify-between sm:justify-start gap-2">
          <span>Rombel Aktif:</span>
          <span className="font-extrabold text-blue-900">Kelas {selectedKelasObj?.nama || selectedKelasId}</span>
        </div>
      </div>

      {mainTab === 'rekap' ? (
        <RekapPresensiTable
          db={db}
          selectedKelasId={selectedKelasId}
          onSelectKelasId={setSelectedKelasId}
          currentUser={currentUser}
          onSwitchToInputHarian={(tgl) => {
            if (tgl) setSelectedTanggal(tgl);
            setMainTab('harian');
          }}
        />
      ) : mainTab === 'surat-izin' ? (
        <PengajuanIzinManager
          db={db}
          role={role}
          currentUser={currentUser}
          selectedKelasId={selectedKelasId}
          onSelectKelasId={setSelectedKelasId}
        />
      ) : (
        <>
          {/* Top Header Banner - Mobile-Optimized */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full text-[11px] font-semibold text-blue-200 backdrop-blur-xs">
              <CalendarCheck className="w-3 h-3 text-emerald-400" />
              <span>Presensi Guru PJOK • VERSI 2.6.2 - 2026 PJOK SMAN 1 TEJAKULA</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Presensi Murid Harian
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-xl hidden sm:block">
              Pencatatan kehadiran murid dengan tombol cepat <strong>H, S, I, A, T</strong> yang responsif di layar ponsel untuk pengisian langsung di lapangan.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleSyncIzinMurid}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 border border-amber-400/30 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="Sinkronkan otomatis absensi dari data pengajuan surat izin/sakit murid"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Sinkronkan Izin</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 border border-emerald-400/30 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              title="Unduh rekap presensi hari ini dalam format Microsoft Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-sky-200 bg-sky-500/20 hover:bg-sky-500/30 active:bg-sky-500/40 border border-sky-400/30 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              title="Cetak atau simpan lembar absensi formal dalam format PDF"
            >
              <Printer className="w-3.5 h-3.5 text-sky-300" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setShowResetAbsensiModal(true)}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 border border-rose-400/30 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              title="Kosongkan riwayat absensi untuk mulai dari nol"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSetAllHadir}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-blue-100 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl transition text-center cursor-pointer"
              title="Setel semua murid menjadi Hadir (H)"
            >
              Semua H
            </button>
            <button
              type="button"
              onClick={handleSavePresensi}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition text-center cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-white/15">
          {/* Pilih Kelas */}
          <div>
            <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">
              Rombel / Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
            >
              {assignedClasses.map((k) => (
                <option key={k.id} value={k.id} className="bg-slate-900 text-white">
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">
              Tanggal Presensi
            </label>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full text-xs font-semibold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:bg-slate-900"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">
              Cari Nama / NIS
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-blue-200" />
              <input
                type="text"
                placeholder="Ketik nama murid..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 text-white placeholder:text-blue-200/60 rounded-xl text-xs focus:outline-hidden focus:bg-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-blue-200 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats & Summary */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 uppercase tracking-wider text-xs">
              Kelas {selectedKelasObj?.nama || selectedKelasId}
            </span>
            <span className="text-slate-400 font-medium">
              ({muridInKelas.length} Murid)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-xs">
              Kehadiran: {persentase}%
            </span>
            
            {/* View Mode Toggle: Ringkas HP, Tabel, Kartu */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Ringkas HP (Nama & Tombol H,S,I,A,T Pas di Layar HP)"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-[11px] sm:text-xs">Ringkas HP</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Tabel Lengkap"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kartu Rinci"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5 Status Quick Summary Counters (Clickable to Filter) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 text-center">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'H' ? 'ALL' : 'H')}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition text-center cursor-pointer ${
              statusFilter === 'H'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
            }`}
          >
            <span className="text-base sm:text-xl font-black font-mono block leading-none">{countH}</span>
            <p className="text-[10px] sm:text-xs font-bold mt-1">H</p>
            <span className="text-[9px] opacity-80 hidden sm:block">Hadir</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'S' ? 'ALL' : 'S')}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition text-center cursor-pointer ${
              statusFilter === 'S'
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : 'bg-sky-50/80 hover:bg-sky-100 border-sky-200 text-sky-900'
            }`}
          >
            <span className="text-base sm:text-xl font-black font-mono block leading-none">{countS}</span>
            <p className="text-[10px] sm:text-xs font-bold mt-1">S</p>
            <span className="text-[9px] opacity-80 hidden sm:block">Sakit</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'I' ? 'ALL' : 'I')}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition text-center cursor-pointer ${
              statusFilter === 'I'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-amber-900'
            }`}
          >
            <span className="text-base sm:text-xl font-black font-mono block leading-none">{countI}</span>
            <p className="text-[10px] sm:text-xs font-bold mt-1">I</p>
            <span className="text-[9px] opacity-80 hidden sm:block">Izin</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'A' ? 'ALL' : 'A')}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition text-center cursor-pointer ${
              statusFilter === 'A'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50/80 hover:bg-rose-100 border-rose-200 text-rose-900'
            }`}
          >
            <span className="text-base sm:text-xl font-black font-mono block leading-none">{countA}</span>
            <p className="text-[10px] sm:text-xs font-bold mt-1">A</p>
            <span className="text-[9px] opacity-80 hidden sm:block">Alpa</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'T' ? 'ALL' : 'T')}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition text-center cursor-pointer ${
              statusFilter === 'T'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-purple-50/80 hover:bg-purple-100 border-purple-200 text-purple-900'
            }`}
          >
            <span className="text-base sm:text-xl font-black font-mono block leading-none">{countT}</span>
            <p className="text-[10px] sm:text-xs font-bold mt-1">T</p>
            <span className="text-[9px] opacity-80 hidden sm:block">Telat</span>
          </button>
        </div>

        {statusFilter !== 'ALL' && (
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl text-slate-600">
            <span>
              Menampilkan murid dengan status: <strong>{statusFilter} ({DEFAULT_KETERANGAN[statusFilter]})</strong>
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className="text-indigo-600 hover:underline font-bold cursor-pointer"
            >
              Tampilkan Semua
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${persentase}%` }}
          />
        </div>
      </div>

      {/* VIEW MODE 1: RINGKAS HP (ULTRA RESPONSIF - NAMA DAN TOMBOL H, S, I, A, T SEJAJAR PAS DI LAYAR HP) */}
      {viewMode === 'compact' && (
        <div className="space-y-2.5">
          {/* Bar Kontrol Pilihan Tampilan Nama: Tampilkan Semua Nama (Turun Baris) atau Geser Kanan-Kiri */}
          <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50/50 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-600 text-white rounded-lg shadow-2xs">
                  <Smartphone className="w-3.5 h-3.5" />
                </span>
                <span className="font-black text-blue-950 text-xs">
                  Tampilan Nama Murid di HP:
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                {compactNameMode === 'wrap' ? (
                  <>
                    <strong className="text-blue-900">Mode Nama Utuh:</strong> Nama lengkap murid ditampilkan seluruhnya (turun baris tanpa terpotong).
                  </>
                ) : (
                  <>
                    <strong className="text-indigo-900">Mode Geser Kanan-Kiri:</strong> Kolom nama lebar 1 baris &amp; baris dapat digeser kanan-kiri (↔).
                  </>
                )}
              </p>
            </div>

            {/* Toggle Tombol Pilihan Mode */}
            <div className="flex items-center gap-1.5 p-1 bg-white/90 border border-blue-200 rounded-xl shrink-0 self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setCompactNameMode('wrap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  compactNameMode === 'wrap'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Tampilkan seluruh nama murid lengkap tanpa terpotong (turun baris)"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span>Nama Utuh</span>
              </button>

              <button
                type="button"
                onClick={() => setCompactNameMode('scroll')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  compactNameMode === 'scroll'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Aktifkan geser kanan-kiri pada baris murid"
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>Geser Kanan-Kiri (↔)</span>
              </button>
            </div>
          </div>

          {/* Panduan Kode Huruf */}
          <div className="px-3 py-2 bg-slate-100/90 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-[11px] font-bold flex-wrap">
            <span className="text-slate-600 text-[10px] sm:text-xs">Panduan Tombol:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">H = Hadir</span>
              <span className="text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-md">S = Sakit</span>
              <span className="text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">I = Izin</span>
              <span className="text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-md">A = Alpa</span>
              <span className="text-purple-800 bg-purple-100/90 px-2 py-0.5 rounded-md">T = Telat</span>
            </div>
          </div>

          {filteredMurid.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Tidak ada data murid yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            filteredMurid.map((murid, idx) => {
              const currentStatus = attendanceMap[murid.id] || 'H';
              const currentNote = keteranganMap[murid.id] || DEFAULT_KETERANGAN[currentStatus];
              const activeConfig = STATUS_LIST.find((s) => s.key === currentStatus);
              const isEditingNote = editingNoteMuridId === murid.id;
              const hasCustomNote = currentNote && currentNote !== DEFAULT_KETERANGAN[currentStatus];
              const matchingIzin = (db.pengajuanIzin || []).find(
                (iz) =>
                  iz.muridId === murid.id &&
                  (iz.tanggal === selectedTanggal ||
                    (iz.tanggalSelesai &&
                      selectedTanggal >= iz.tanggal &&
                      selectedTanggal <= iz.tanggalSelesai))
              );

              return (
                <div
                  key={murid.id}
                  className={`rounded-2xl p-2.5 sm:p-3 border transition-all ${
                    currentStatus !== 'H'
                      ? 'bg-amber-50/20 border-amber-200 shadow-2xs'
                      : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* Kontainer Geser Kanan-Kiri (Horizontal Scrollable Container) */}
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-0.5 -mx-0.5 px-0.5 touch-pan-x">
                    <div
                      className={`flex items-center justify-between gap-2.5 ${
                        compactNameMode === 'scroll'
                          ? 'min-w-[430px] sm:min-w-0'
                          : 'min-w-0 w-full'
                      }`}
                    >
                      {/* Sisi Kiri: Nomor + Nama Murid Lengkap & NIS */}
                      <div
                        className={`flex items-start sm:items-center gap-2 ${
                          compactNameMode === 'scroll'
                            ? 'min-w-[210px] sm:min-w-[260px] flex-1'
                            : 'min-w-0 flex-1'
                        }`}
                      >
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-slate-100 text-slate-700 font-mono font-black text-[10px] sm:text-xs flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              className={`font-extrabold text-slate-900 text-xs sm:text-sm leading-snug ${
                                compactNameMode === 'scroll'
                                  ? 'whitespace-nowrap'
                                  : 'break-words whitespace-normal'
                              }`}
                            >
                              {murid.name}
                            </h4>
                            {matchingIzin && (
                              <button
                                type="button"
                                onClick={() => setMainTab('surat-izin')}
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition shrink-0 ${
                                  matchingIzin.status === 'Disetujui'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                    : matchingIzin.status === 'Ditolak'
                                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 animate-pulse'
                                }`}
                                title="Klik untuk membuka arsip surat izin & foto bersama orang tua"
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span>Surat {matchingIzin.kategori} ({matchingIzin.status})</span>
                              </button>
                            )}
                            {currentStatus !== 'H' && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${activeConfig?.badgeBg} ${activeConfig?.badgeText} shrink-0`}
                              >
                                {activeConfig?.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono leading-none mt-0.5 flex-wrap">
                            <span>NIS: {murid.nis || '-'}</span>
                            {murid.jenisKelamin && (
                              <span>• {murid.jenisKelamin === 'P' ? 'P' : 'L'}</span>
                            )}
                            {hasCustomNote && (
                              <span className="text-indigo-600 font-sans font-bold break-words">
                                • {currentNote}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sisi Kanan: 5 Tombol H, S, I, A, T Pas di Ukuran Layar Ponsel */}
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {STATUS_LIST.map((st) => {
                          const isSelected = currentStatus === st.key;
                          return (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => handleChangeStatus(murid.id, st.key)}
                              className={`w-7.5 h-8 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center cursor-pointer active:scale-95 select-none ${
                                isSelected
                                  ? `${st.activeColor} scale-[1.05]`
                                  : `${st.unselectedColor}`
                              }`}
                              title={`Tandai ${murid.name} sebagai ${st.name} (${st.code})`}
                            >
                              <span className="leading-none">{st.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sub-baris Catatan: Muncul jika status bukan Hadir atau sedang diedit */}
                  {(isEditingNote || (currentStatus !== 'H' && hasCustomNote)) && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">Catatan:</span>
                      <input
                        type="text"
                        value={currentNote}
                        onChange={(e) => handleUpdateKeterangan(murid.id, e.target.value)}
                        placeholder={`Keterangan ${activeConfig?.name || ''} (misal: Cedera, Demam, Lomba)...`}
                        className="flex-1 py-1 px-2 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                      {isEditingNote && (
                        <button
                          type="button"
                          onClick={() => setEditingNoteMuridId(null)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                        >
                          Tutup
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tombol Mini Catatan Jika Status Hadir / Belum Ada Catatan Khusus */}
                  {!isEditingNote && !hasCustomNote && (
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingNoteMuridId(murid.id)}
                        className="text-[9px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
                        title="Tambah catatan khusus untuk murid ini"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>+ catatan</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: KARTU RINCI DENGAN FOTO MURID */}
      {viewMode === 'card' && (
        <div className="space-y-3">
          {filteredMurid.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Tidak ada data murid yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            filteredMurid.map((murid, idx) => {
              const currentStatus = attendanceMap[murid.id] || 'H';
              const currentNote = keteranganMap[murid.id] || DEFAULT_KETERANGAN[currentStatus];
              const activeConfig = STATUS_LIST.find((s) => s.key === currentStatus);
              const isEditingNote = editingNoteMuridId === murid.id;

              return (
                <div
                  key={murid.id}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs transition hover:shadow-xs space-y-3"
                >
                  {/* Baris 1: No, Avatar, Nama Murid Lengkap, dan Keterangan Terpilih */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Nomor urut */}
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>

                      {/* Avatar */}
                      <img
                        src={
                          murid.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${murid.name}`
                        }
                        alt={murid.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200 mt-0.5"
                      />

                      {/* Nama Murid & NIS - Jelas dan Terbuka */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug break-words">
                          {murid.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                          <span>NIS: {murid.nis || '-'}</span>
                          {murid.jenisKelamin && (
                            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px]">
                              {murid.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge Keterangan Terpilih */}
                    <div className="shrink-0 flex flex-col items-end">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                          activeConfig?.badgeBg || 'bg-emerald-100'
                        } ${activeConfig?.badgeText || 'text-emerald-800'}`}
                      >
                        <span className="font-black text-xs font-mono">[{currentStatus}]</span>
                        <span className="font-bold">{activeConfig?.name || currentStatus}</span>
                      </span>
                    </div>
                  </div>

                  {/* Baris 2: Tombol Status Presensi (H, S, I, A, T SAJA) */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Pilih Status Kehadiran:</span>
                      <span className="text-[11px] font-mono text-slate-600">
                        {activeConfig?.code} - {activeConfig?.name}
                      </span>
                    </div>

                    {/* 5 Tombol H, S, I, A, T - Ukuran nyaman di jari jempol hp */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {STATUS_LIST.map((st) => {
                        const isSelected = currentStatus === st.key;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => handleChangeStatus(murid.id, st.key)}
                            className={`py-2.5 sm:py-2 text-sm sm:text-base font-black rounded-xl transition-all flex flex-col items-center justify-center min-h-[44px] cursor-pointer ${
                              isSelected
                                ? `${st.activeColor} scale-[1.02]`
                                : `${st.unselectedColor}`
                            }`}
                            title={`Tandai ${murid.name} sebagai ${st.name} (${st.code})`}
                          >
                            <span className="font-black leading-none">{st.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Baris 3: Catatan Keterangan Detail (Bisa diedit jika sakit/izin tertentu) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">
                        Keterangan:
                      </span>
                      {isEditingNote ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={currentNote}
                            onChange={(e) => handleUpdateKeterangan(murid.id, e.target.value)}
                            placeholder="Tulis catatan (misal: Cedera kaki, Dispen)..."
                            className="flex-1 px-2.5 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setEditingNoteMuridId(null)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => setEditingNoteMuridId(murid.id)}
                          className="text-slate-700 font-medium truncate cursor-pointer hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-100"
                          title="Klik untuk mengubah catatan keterangan detail"
                        >
                          {currentNote || DEFAULT_KETERANGAN[currentStatus]}
                        </span>
                      )}
                    </div>

                    {!isEditingNote && (
                      <button
                        type="button"
                        onClick={() => setEditingNoteMuridId(murid.id)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold shrink-0 flex items-center gap-0.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Catatan</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABEL DENGAN KOLOM STATUS KEHADIRAN DIBEKUKAN DI SISI KIRI */}
      {viewMode === 'table' && (
        <div className="space-y-2.5">
          {/* Petunjuk Pembekuan Kolom & Versi Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-white border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-blue-950 shadow-2xs">
            <div className="flex items-center gap-2 font-medium">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span>
                Kolom <strong>No</strong>, <strong>Nama Murid</strong>, dan <strong>STATUS KEHADIRAN</strong> dibekukan di sisi kiri. Geser tabel ke kanan untuk memilih tombol status kehadiran (H, S, I, A, T).
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="text-[10px] font-black tracking-wider text-blue-800 bg-blue-100/90 border border-blue-200 px-2.5 py-1 rounded-full uppercase">
                VERSI 2.6.2 - 2026 PJOK SMAN 1 TEJAKULA
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto relative max-h-[640px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="bg-slate-100/95 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
                    {/* Kolom 1 Dibekukan: No */}
                    <th className="py-3.5 px-2.5 w-12 min-w-[48px] max-w-[48px] text-center sticky left-0 z-50 bg-slate-100 border-r border-slate-200">
                      No
                    </th>

                    {/* Kolom 2 Dibekukan: Nama Murid & Identitas */}
                    <th className="py-3.5 px-3 w-52 min-w-[208px] max-w-[208px] sticky left-12 z-50 bg-slate-100 border-r border-slate-200">
                      Nama Murid & NIS
                    </th>

                    {/* Kolom 3 Dibekukan: STATUS KEHADIRAN */}
                    <th className="py-3.5 px-3 w-40 min-w-[160px] max-w-[160px] text-center sticky left-[256px] z-50 bg-slate-100 border-r-2 border-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center justify-center gap-1.5 text-blue-950 font-black">
                        <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Status Kehadiran</span>
                      </div>
                    </th>

                    {/* Kolom Geser ke Kanan: Tombol Pilihan Status (H, S, I, A, T) - Kotak Huruf Saja */}
                    <th className="py-3.5 px-4 text-center min-w-[260px] bg-slate-50 border-r border-slate-200">
                      Pilihan Status (H, S, I, A, T)
                    </th>

                    {/* Kolom Keterangan / Alasan Lengkap */}
                    <th className="py-3.5 px-3 min-w-[220px] border-r border-slate-200">
                      Keterangan / Catatan Murid
                    </th>

                    {/* Kolom Rekapitulasi Kehadiran */}
                    <th className="py-3.5 px-3 min-w-[140px] text-center">
                      Rekap Murid
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMurid.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ditemukan data murid yang sesuai filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMurid.map((murid, idx) => {
                      const currentStatus = attendanceMap[murid.id] || 'H';
                      const currentNote = keteranganMap[murid.id] || DEFAULT_KETERANGAN[currentStatus];
                      const activeConfig = STATUS_LIST.find((s) => s.key === currentStatus);

                      // Summary stats for this student across all recorded sessions
                      const studentPresensi = (db.presensi || []).filter((p) => p.muridId === murid.id);
                      const sHadir = studentPresensi.filter((p) => p.status === 'H').length;
                      const sSakit = studentPresensi.filter((p) => p.status === 'S').length;
                      const sIzin = studentPresensi.filter((p) => p.status === 'I').length;
                      const sAlpa = studentPresensi.filter((p) => p.status === 'A').length;

                      return (
                        <tr key={murid.id} className="hover:bg-slate-50/90 transition-colors group">
                          {/* Kolom 1 Dibekukan: No */}
                          <td className="py-2.5 px-2.5 text-center font-bold text-slate-400 sticky left-0 z-30 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                            {idx + 1}
                          </td>

                          {/* Kolom 2 Dibekukan: Nama Murid & Identitas */}
                          <td className="py-2.5 px-3 sticky left-12 z-30 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  murid.avatar ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${murid.name}`
                                }
                                alt={murid.name}
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                              />
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 block break-words whitespace-normal leading-snug">
                                  {murid.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  NIS: {murid.nis || '-'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Kolom 3 Dibekukan: STATUS KEHADIRAN (DI SISI KIRI) */}
                          <td className="py-2.5 px-3 sticky left-[256px] z-30 bg-white group-hover:bg-slate-50 border-r-2 border-slate-300 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] text-center">
                            <button
                              type="button"
                              onClick={() => {
                                // Siklus klik cepat status H -> S -> I -> A -> T -> H
                                const keys: StatusPresensi[] = ['H', 'S', 'I', 'A', 'T'];
                                const curIdx = keys.indexOf(currentStatus);
                                const nextStatus = keys[(curIdx + 1) % keys.length];
                                handleChangeStatus(murid.id, nextStatus);
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-transform active:scale-95 shadow-2xs w-full cursor-pointer ${activeConfig?.badgeBg} ${activeConfig?.badgeText} border ${activeConfig?.ringColor}`}
                              title="Klik untuk mengganti status cepat (siklus H, S, I, A, T)"
                            >
                              <span className="font-black font-mono text-sm">[{currentStatus}]</span>
                              <span className="truncate">{activeConfig?.name}</span>
                            </button>
                          </td>

                          {/* Kolom Geser Kanan: 1 KOLOM PILIHAN STATUS (H, S, I, A, T) DENGAN KOTAK ISI HURUF SAJA & SENTUH LAPANG */}
                          <td className="py-2.5 px-4 text-center border-r border-slate-100">
                            <div className="inline-flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
                              {STATUS_LIST.map((st) => {
                                const isSelected = currentStatus === st.key;
                                return (
                                  <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => handleChangeStatus(murid.id, st.key)}
                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm sm:text-base font-black transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 ${
                                      isSelected
                                        ? `${st.activeColor} ring-2 ring-offset-1 ring-blue-400`
                                        : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-slate-200/90'
                                    }`}
                                    title={`Setel ${st.name} (${st.code})`}
                                  >
                                    <span>{st.code}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Kolom Keterangan / Alasan Lengkap */}
                          <td className="py-2.5 px-3 border-r border-slate-100">
                            <input
                              type="text"
                              value={currentNote}
                              onChange={(e) => handleUpdateKeterangan(murid.id, e.target.value)}
                              placeholder="Keterangan murid..."
                              className="text-[11px] py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl w-full focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700"
                            />
                          </td>

                          {/* Kolom Rekapitulasi Kehadiran Murid */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold">
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {sHadir}H
                              </span>
                              <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                                {sSakit}S
                              </span>
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                {sIzin}I
                              </span>
                              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                {sAlpa}A
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING / STICKY BOTTOM ACTION BAR FOR MOBILE PHONES */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5">
          {/* Status summary pill */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-mono font-bold">
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[11px]">
              {countH}H
            </span>
            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded font-black text-[11px]">
              {countS}S
            </span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-black text-[11px]">
              {countI}I
            </span>
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[11px]">
              {countA}A
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-black text-[11px]">
              {countT}T
            </span>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetAllHadir}
              className="px-2.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition whitespace-nowrap cursor-pointer"
              title="Setel semua Hadir"
            >
              Semua H
            </button>
            <button
              type="button"
              onClick={handleSavePresensi}
              className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Presensi</span>
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* MODAL KONFIRMASI RESET ABSENSI KE NOL */}
      {showResetAbsensiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Reset Absensi ke Nol
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mulai pencatatan absensi dari kondisi bersih (nol).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              Pilih cakupan reset yang Anda inginkan. Tindakan ini akan mengosongkan rekaman kehadiran dan menyetel kembali status murid ke default.
            </p>

            <div className="space-y-2 pt-1">
              {/* Opsi 1: Kosongkan Tanggal Ini Saja */}
              <button
                type="button"
                onClick={handleResetCurrentDatePresensi}
                className="w-full text-left p-3 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 group-hover:text-amber-950">
                    Kosongkan Tanggal Ini Saja
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200">
                    {selectedTanggal}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Hapus rekaman kehadiran Kelas {selectedKelasObj?.nama || selectedKelasId} pada tanggal {selectedTanggal}.
                </p>
              </button>

              {/* Opsi 2: Kosongkan Seluruh Riwayat Presensi Semua Kelas */}
              <button
                type="button"
                onClick={handleResetAllPresensi}
                className="w-full text-left p-3 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 group-hover:text-rose-950">
                    Kosongkan SEMUA Riwayat Absensi
                  </span>
                  <span className="text-[10px] font-mono text-rose-700 bg-white/80 px-2 py-0.5 rounded-lg border border-rose-200">
                    Mulai dari Nol
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 mt-1">
                  Hapus seluruh data presensi semua kelas dan tanggal untuk memulai tahun/semester baru dari nol.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowResetAbsensiModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
