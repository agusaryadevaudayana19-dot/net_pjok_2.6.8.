import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  ArrowUpDown,
  Check,
  Smartphone,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import { PresensiRecord, StatusPresensi, User, getTeacherAssignedClasses } from '../../types';

interface RekapPresensiTableProps {
  db: LMSDatabase;
  selectedKelasId: string;
  onSelectKelasId: (kelasId: string) => void;
  currentUser: User;
  onSwitchToInputHarian?: (tanggal?: string) => void;
}

export const RekapPresensiTable: React.FC<RekapPresensiTableProps> = ({
  db,
  selectedKelasId,
  onSelectKelasId,
  currentUser,
  onSwitchToInputHarian,
}) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState<string>('ALL');
  const [filterKedisiplinan, setFilterKedisiplinan] = useState<
    'ALL' | 'BERMASALAH' | 'DISIPLIN' | 'PERLU_PERHATIAN'
  >('ALL');
  const [selectedMuridDetail, setSelectedMuridDetail] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const selectedKelasObj = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  // Murid in selected class
  const muridInKelas = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();
    return (db.users || []).filter((u) => {
      if (u.role !== 'MURID') return false;
      const uKelas = (u.kelasId || '').toLowerCase().trim();
      return uKelas === targetId || (targetNama && uKelas === targetNama);
    });
  }, [db.users, selectedKelasId, selectedKelasObj]);

  // All attendance records for this class
  const classPresensi = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();
    return (db.presensi || []).filter((p) => {
      const pKelas = (p.kelasId || '').toLowerCase().trim();
      return pKelas === targetId || (targetNama && pKelas === targetNama);
    });
  }, [db.presensi, selectedKelasId, selectedKelasObj]);

  // All distinct recorded dates sorted chronologically
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    classPresensi.forEach((p) => {
      if (p.tanggal) dateSet.add(p.tanggal);
    });
    return Array.from(dateSet).sort();
  }, [classPresensi]);

  // Available months from dates
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allDates.forEach((d) => {
      months.add(d.slice(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort();
  }, [allDates]);

  // Filtered dates based on month selection
  const filteredDates = useMemo(() => {
    if (filterBulan === 'ALL') return allDates;
    return allDates.filter((d) => d.startsWith(filterBulan));
  }, [allDates, filterBulan]);

  // Map of [muridId_tanggal] -> StatusPresensi
  const attendanceLookup = useMemo(() => {
    const map: Record<string, { status: StatusPresensi; keterangan?: string }> = {};
    classPresensi.forEach((p) => {
      map[`${p.muridId}_${p.tanggal}`] = {
        status: p.status,
        keterangan: p.keterangan,
      };
    });
    return map;
  }, [classPresensi]);

  // Per-student summary stats
  const studentStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalH: number;
        totalS: number;
        totalI: number;
        totalA: number;
        totalT: number;
        totalPertemuan: number;
        persenHadir: number;
        predikat: string;
        color: string;
      }
    > = {};

    muridInKelas.forEach((m) => {
      let h = 0,
        s = 0,
        i = 0,
        a = 0,
        t = 0;

      filteredDates.forEach((d) => {
        const item = attendanceLookup[`${m.id}_${d}`];
        if (item) {
          if (item.status === 'H') h++;
          else if (item.status === 'S') s++;
          else if (item.status === 'I') i++;
          else if (item.status === 'A') a++;
          else if (item.status === 'T') t++;
        }
      });

      const totalRecord = h + s + i + a + t;
      const totalPertemuan = filteredDates.length;
      // Persentase dihitung dari kehadiran fisik (Hadir + Terlambat) dibanding total sesi
      const persenHadir =
        totalPertemuan > 0 ? Math.round(((h + t) / totalPertemuan) * 100) : 100;

      let predikat = 'Sangat Disiplin';
      let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';

      if (a >= 2 || persenHadir < 75) {
        predikat = 'Perlu Pembinaan';
        color = 'text-rose-700 bg-rose-50 border-rose-200';
      } else if (a === 1 || persenHadir < 85) {
        predikat = 'Perlu Perhatian';
        color = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (persenHadir < 90) {
        predikat = 'Cukup Tertib';
        color = 'text-sky-700 bg-sky-50 border-sky-200';
      }

      stats[m.id] = {
        totalH: h,
        totalS: s,
        totalI: i,
        totalA: a,
        totalT: t,
        totalPertemuan,
        persenHadir,
        predikat,
        color,
      };
    });

    return stats;
  }, [muridInKelas, filteredDates, attendanceLookup]);

  // Filtered students
  const displayedStudents = useMemo(() => {
    return muridInKelas.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchNis = m.nis && m.nis.includes(q);
        if (!matchName && !matchNis) return false;
      }

      const st = studentStats[m.id];
      if (!st) return true;

      if (filterKedisiplinan === 'BERMASALAH') {
        return st.totalA > 0 || st.persenHadir < 80;
      }
      if (filterKedisiplinan === 'PERLU_PERHATIAN') {
        return st.totalA > 0 || st.totalS >= 2 || st.persenHadir < 85;
      }
      if (filterKedisiplinan === 'DISIPLIN') {
        return st.persenHadir >= 90 && st.totalA === 0;
      }

      return true;
    });
  }, [muridInKelas, searchQuery, filterKedisiplinan, studentStats]);

  // Overall class averages
  const classMetrics = useMemo(() => {
    const totalStudents = muridInKelas.length;
    if (totalStudents === 0) return { avgPersen: 0, totalH: 0, totalS: 0, totalI: 0, totalA: 0, totalT: 0 };

    let sumPersen = 0;
    let totalH = 0;
    let totalS = 0;
    let totalI = 0;
    let totalA = 0;
    let totalT = 0;

    muridInKelas.forEach((m) => {
      const st = studentStats[m.id];
      if (st) {
        sumPersen += st.persenHadir;
        totalH += st.totalH;
        totalS += st.totalS;
        totalI += st.totalI;
        totalA += st.totalA;
        totalT += st.totalT;
      }
    });

    return {
      avgPersen: Math.round(sumPersen / totalStudents),
      totalH,
      totalS,
      totalI,
      totalA,
      totalT,
    };
  }, [muridInKelas, studentStats]);

  // Generate Sample Month Attendance if empty
  const handleGenerateSampleData = () => {
    const dates = [
      '2026-08-07',
      '2026-08-14',
      '2026-08-21',
      '2026-08-28',
      '2026-09-04',
      '2026-09-10',
    ];

    const newRecords: PresensiRecord[] = [];
    muridInKelas.forEach((m, idx) => {
      dates.forEach((d, dIdx) => {
        let status: StatusPresensi = 'H';
        let ket = 'Hadir mengikuti praktik';

        // Sample realistic variations
        if (idx === 3 && dIdx === 1) {
          status = 'S';
          ket = 'Demam dan flu';
        } else if (idx === 7 && dIdx === 4) {
          status = 'I';
          ket = 'Izin acara keluarga';
        } else if (idx === 12 && dIdx === 5) {
          status = 'A';
          ket = 'Tanpa keterangan';
        } else if (idx === 5 && dIdx === 2) {
          status = 'T';
          ket = 'Terlambat 10 menit';
        }

        newRecords.push({
          id: `pres-${m.id}-${d}`,
          kelasId: selectedKelasId,
          tanggal: d,
          muridId: m.id,
          muridNama: m.name,
          status,
          keterangan: ket,
        });
      });
    });

    dataStorage.updateDatabase((prev) => {
      // Remove any previous records for these dates in this class
      const remaining = (prev.presensi || []).filter(
        (p) => !(p.kelasId === selectedKelasId && dates.includes(p.tanggal))
      );
      return {
        ...prev,
        presensi: [...remaining, ...newRecords],
      };
    });
  };

  // Export to Excel (.xlsx)
  const handleExportXLSX = () => {
    try {
      const data = displayedStudents.map((m, idx) => {
        const st = studentStats[m.id];
        const rowData: Record<string, string | number> = {
          'No': idx + 1,
          'NIS': m.nis || '-',
          'Nama Siswa': m.name,
          'Kelas': selectedKelasObj?.nama || selectedKelasId,
        };

        filteredDates.forEach((d) => {
          const item = attendanceLookup[`${m.id}_${d}`];
          rowData[d] = item ? item.status : '-';
        });

        rowData['Hadir (H)'] = st?.totalH ?? 0;
        rowData['Sakit (S)'] = st?.totalS ?? 0;
        rowData['Izin (I)'] = st?.totalI ?? 0;
        rowData['Alpa (A)'] = st?.totalA ?? 0;
        rowData['Terlambat (T)'] = st?.totalT ?? 0;
        rowData['Persentase Kehadiran (%)'] = `${st?.persenHadir ?? 0}%`;
        rowData['Predikat Kedisiplinan'] = st?.predikat ?? '-';

        return rowData;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');
      XLSX.writeFile(
        wb,
        `Rekap_Presensi_PJOK_${selectedKelasObj?.nama || selectedKelasId}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      console.error('Error exporting Excel:', e);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      ...filteredDates.map((d) => d.slice(5)), // MM-DD
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      'Terlambat (T)',
      'Persentase Kehadiran (%)',
      'Predikat Kedisiplinan',
    ];

    const rows = displayedStudents.map((m, idx) => {
      const st = studentStats[m.id];
      const dateStatuses = filteredDates.map((d) => {
        const item = attendanceLookup[`${m.id}_${d}`];
        return item ? item.status : '-';
      });

      return [
        idx + 1,
        m.nis || '-',
        `"${m.name.replace(/"/g, '""')}"`,
        `"${selectedKelasObj?.nama || selectedKelasId}"`,
        ...dateStatuses,
        st?.totalH ?? 0,
        st?.totalS ?? 0,
        st?.totalI ?? 0,
        st?.totalA ?? 0,
        st?.totalT ?? 0,
        `${st?.persenHadir ?? 0}%`,
        `"${st?.predikat ?? '-'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rekap_Presensi_PJOK_${selectedKelasObj?.nama || selectedKelasId}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status?: StatusPresensi) => {
    switch (status) {
      case 'H':
        return (
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black inline-flex items-center justify-center border border-emerald-300">
            H
          </span>
        );
      case 'S':
        return (
          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black inline-flex items-center justify-center border border-sky-300">
            S
          </span>
        );
      case 'I':
        return (
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black inline-flex items-center justify-center border border-amber-300">
            I
          </span>
        );
      case 'A':
        return (
          <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black inline-flex items-center justify-center border border-rose-300 animate-pulse">
            A
          </span>
        );
      case 'T':
        return (
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black inline-flex items-center justify-center border border-purple-300">
            T
          </span>
        );
      default:
        return <span className="text-slate-300 text-xs font-mono">-</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Rekapan */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-indigo-200">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Matriks & Rekapitulasi Presensi Semester Berjalan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapan Absensi Kelas {selectedKelasObj?.nama || selectedKelasId}
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
              Memantau akumulasi kehadiran, sakit, izin, alpa, serta persentase disiplin siswa dari seluruh sesi tatap muka dan praktik lapangan PJOK.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {allDates.length === 0 && (
              <button
                type="button"
                onClick={handleGenerateSampleData}
                className="px-3.5 py-2 text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Isi Contoh Rekap (6 Pertemuan)</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportXLSX}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Unduh Rekapitulasi Format Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Unduh Rekapitulasi Format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Cetak format lembar cetak A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* Filter Controls inside banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/15">
          {/* Kelas */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
              Pilih Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => onSelectKelasId(e.target.value)}
              className="w-full text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id} className="bg-slate-900 text-white">
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* Bulan Filter */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
              Periode Bulan
            </label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Semua Bulan ({allDates.length} Pertemuan)
              </option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  Bulan {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Disiplin */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
              Filter Kedisiplinan
            </label>
            <select
              value={filterKedisiplinan}
              onChange={(e) => setFilterKedisiplinan(e.target.value as any)}
              className="w-full text-xs font-bold bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 focus:outline-hidden focus:bg-slate-900 cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Semua Siswa ({muridInKelas.length})
              </option>
              <option value="BERMASALAH" className="bg-slate-900 text-white">
                Pernah Alpa (A) / Kehadiran &lt; 80%
              </option>
              <option value="PERLU_PERHATIAN" className="bg-slate-900 text-white">
                Perlu Perhatian (Sakit/Izin/Alpa)
              </option>
              <option value="DISIPLIN" className="bg-slate-900 text-white">
                Sangat Disiplin (≥ 90%)
              </option>
            </select>
          </div>

          {/* Cari Siswa */}
          <div>
            <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">
              Cari Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-indigo-200" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari murid..."
                className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 text-white placeholder:text-indigo-200/60 rounded-xl text-xs focus:outline-hidden focus:bg-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-indigo-200 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Sesi
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{filteredDates.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">Pertemuan</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Rata-rata Disiplin
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-black ${
                classMetrics.avgPersen >= 85 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {classMetrics.avgPersen}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Kelas</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Total Hadir (H)
          </span>
          <span className="text-xl font-black text-emerald-700">{classMetrics.totalH}</span>
        </div>

        <div className="bg-sky-50/70 rounded-2xl p-3.5 border border-sky-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
            Total Sakit (S)
          </span>
          <span className="text-xl font-black text-sky-700">{classMetrics.totalS}</span>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Total Izin (I)
          </span>
          <span className="text-xl font-black text-amber-700">{classMetrics.totalI}</span>
        </div>

        <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
            Total Alpa (A)
          </span>
          <span className="text-xl font-black text-rose-700">{classMetrics.totalA}</span>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800">
              Rekapitulasi Presensi: {displayedStudents.length} Siswa
            </h3>
            <span className="text-xs text-slate-400">
              • {filteredDates.length} Tanggal Pertemuan
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                id="btn-rekap-view-cards"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan kartu ramah HP dengan rekapitulasi langsung per siswa"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Ringkasan HP (Kartu)</span>
              </button>
              <button
                type="button"
                id="btn-rekap-view-matrix"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan matriks tabel lengkap semua tanggal pertemuan"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matriks Tabel</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> H (Hadir)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> S (Sakit)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> I (Izin)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> A (Alpa)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> T (Terlambat)
              </span>
            </div>
          </div>
        </div>

        {allDates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-800">
              Belum Ada Sesi Pertemuan Tersimpan
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Presensi kelas ini belum diinputkan pada menu Input Harian. Anda dapat menginput tanggal hari ini atau klik tombol di bawah untuk membuat contoh data simulasi 6 pertemuan.
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleGenerateSampleData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Muat Contoh Rekapan Presensi
              </button>
              {onSwitchToInputHarian && (
                <button
                  type="button"
                  onClick={() => onSwitchToInputHarian()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Input Presensi Hari Ini
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* ========================================================================= */
          /* TAMPILAN KARTU HP (OPTIMAL UNTUK SMARTPHONE DENGAN REKAPAN JELAS)         */
          /* ========================================================================= */
          <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
              <span>Menampilkan {displayedStudents.length} siswa dengan ringkasan presensi lengkap:</span>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                Mode HP Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedStudents.map((m, idx) => {
                const st = studentStats[m.id];
                const isExpanded = expandedStudentId === m.id;

                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                  >
                    {/* Header Siswa */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {m.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500">
                            NIS: {m.nis || '-'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 ${st?.color}`}
                      >
                        {st?.predikat}
                      </span>
                    </div>

                    {/* Ringkasan Angka Rekapan (H, S, I, A, T) - Tampil Jelas di HP */}
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2">
                        <span className="text-[10px] font-extrabold text-emerald-700 block">H</span>
                        <span className="text-sm sm:text-base font-black text-emerald-900">
                          {st?.totalH ?? 0}
                        </span>
                        <span className="text-[8px] text-emerald-600 font-semibold block sm:hidden">Hadir</span>
                      </div>

                      <div className="bg-sky-50 border border-sky-200/80 rounded-xl p-2">
                        <span className="text-[10px] font-extrabold text-sky-700 block">S</span>
                        <span className="text-sm sm:text-base font-black text-sky-900">
                          {st?.totalS ?? 0}
                        </span>
                        <span className="text-[8px] text-sky-600 font-semibold block sm:hidden">Sakit</span>
                      </div>

                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2">
                        <span className="text-[10px] font-extrabold text-amber-700 block">I</span>
                        <span className="text-sm sm:text-base font-black text-amber-900">
                          {st?.totalI ?? 0}
                        </span>
                        <span className="text-[8px] text-amber-600 font-semibold block sm:hidden">Izin</span>
                      </div>

                      <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-2">
                        <span className="text-[10px] font-extrabold text-rose-700 block">A</span>
                        <span className="text-sm sm:text-base font-black text-rose-900">
                          {st?.totalA ?? 0}
                        </span>
                        <span className="text-[8px] text-rose-600 font-semibold block sm:hidden">Alpa</span>
                      </div>

                      <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-2">
                        <span className="text-[10px] font-extrabold text-purple-700 block">T</span>
                        <span className="text-sm sm:text-base font-black text-purple-900">
                          {st?.totalT ?? 0}
                        </span>
                        <span className="text-[8px] text-purple-600 font-semibold block sm:hidden">Telat</span>
                      </div>
                    </div>

                    {/* Progress Bar Persentase Kehadiran */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">Tingkat Kehadiran:</span>
                        <span
                          className={
                            (st?.persenHadir ?? 0) >= 80
                              ? 'text-emerald-700 font-black'
                              : (st?.persenHadir ?? 0) >= 60
                              ? 'text-amber-700 font-black'
                              : 'text-rose-700 font-black'
                          }
                        >
                          {st?.persenHadir ?? 0}% ({st?.totalH ?? 0}/{st?.totalPertemuan ?? 0} Sesi)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            (st?.persenHadir ?? 0) >= 80
                              ? 'bg-emerald-500'
                              : (st?.persenHadir ?? 0) >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, st?.persenHadir ?? 0))}%` }}
                        />
                      </div>
                    </div>

                    {/* Accordion Rincian Status per Tanggal Pertemuan */}
                    {filteredDates.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setExpandedStudentId(isExpanded ? null : m.id)}
                          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-indigo-600 py-1 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rincian {filteredDates.length} Tanggal Pertemuan</span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap gap-1.5 animate-in fade-in">
                            {filteredDates.map((d, dIdx) => {
                              const item = attendanceLookup[`${m.id}_${d}`];
                              const status = item?.status;

                              let badgeStyle = 'bg-slate-200 text-slate-700 border-slate-300';
                              if (status === 'H') badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                              else if (status === 'S') badgeStyle = 'bg-sky-100 text-sky-800 border-sky-300 font-bold';
                              else if (status === 'I') badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                              else if (status === 'A') badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-black';
                              else if (status === 'T') badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';

                              return (
                                <div
                                  key={d}
                                  className={`px-2 py-1 rounded-lg text-[10px] border flex items-center gap-1 ${badgeStyle}`}
                                  title={item?.keterangan ? `${d}: ${item.keterangan}` : d}
                                >
                                  <span className="text-[9px] opacity-75">P{dIdx + 1} ({d.slice(8, 10)}/{d.slice(5, 7)}):</span>
                                  <span className="font-black">{status || '-'}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tombol Buka Riwayat Detail */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedMuridDetail(m)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Riwayat & Catatan Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAMPILAN MATRIKS TABEL LENGKAP (DENGAN RESPONSIVE STICKY UNTUK HP)        */
          /* ========================================================================= */
          <div>
            {/* Hint Geser untuk Layar Kecil */}
            <div className="md:hidden px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-800 flex items-center justify-between font-semibold">
              <span>👉 Geser tabel ke kanan untuk melihat rincian tanggal & kolom rekap (H, S, I, A, T)</span>
              <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.5 rounded font-black">
                Swipe
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-2 w-[44px] min-w-[44px] max-w-[44px] text-center md:sticky md:left-0 bg-slate-50 z-20">No</th>
                    <th className="py-3 px-3 w-[90px] min-w-[90px] max-w-[90px] md:sticky md:left-[44px] bg-slate-50 z-20">NIS</th>
                    <th className="py-3 px-4 w-[200px] min-w-[200px] max-w-[240px] md:sticky md:left-[134px] bg-slate-50 z-20 md:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] md:border-r-2 md:border-slate-300">
                      Nama Siswa
                    </th>

                    {/* Dates */}
                    {filteredDates.map((d, dIdx) => (
                      <th
                        key={d}
                        className="py-3 px-2 text-center min-w-[56px] border-l border-slate-200/60"
                        title={`Pertemuan ${dIdx + 1}: ${d}`}
                      >
                        <div className="font-extrabold text-slate-800">{d.slice(8, 10)}/{d.slice(5, 7)}</div>
                        <div className="text-[9px] text-slate-400 font-medium">P{dIdx + 1}</div>
                      </th>
                    ))}

                    {/* Summary Totals */}
                    <th className="py-3 px-2.5 text-center min-w-[44px] bg-emerald-50/70 border-l border-emerald-200 text-emerald-800 font-black">
                      H
                    </th>
                    <th className="py-3 px-2.5 text-center min-w-[44px] bg-sky-50/70 border-l border-sky-200 text-sky-800 font-black">
                      S
                    </th>
                    <th className="py-3 px-2.5 text-center min-w-[44px] bg-amber-50/70 border-l border-amber-200 text-amber-800 font-black">
                      I
                    </th>
                    <th className="py-3 px-2.5 text-center min-w-[44px] bg-rose-50/70 border-l border-rose-200 text-rose-800 font-black">
                      A
                    </th>
                    <th className="py-3 px-2.5 text-center min-w-[44px] bg-purple-50/70 border-l border-purple-200 text-purple-800 font-black">
                      T
                    </th>
                    <th className="py-3 px-3 text-center min-w-[70px] bg-slate-100 border-l border-slate-200 font-black text-slate-800">
                      % Hadir
                    </th>
                    <th className="py-3 px-4 min-w-[140px] text-center bg-slate-50 border-l border-slate-200">
                      Status Disiplin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStudents.map((m, idx) => {
                    const st = studentStats[m.id];
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => setSelectedMuridDetail(m)}
                      >
                        <td className="py-2.5 px-2 w-[44px] min-w-[44px] max-w-[44px] text-center font-bold text-slate-400 md:sticky md:left-0 bg-white group-hover:bg-slate-50 z-10">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 w-[90px] min-w-[90px] max-w-[90px] font-mono text-slate-500 text-[11px] md:sticky md:left-[44px] bg-white group-hover:bg-slate-50 z-10">
                          {m.nis || '-'}
                        </td>
                        <td className="py-2.5 px-4 w-[200px] min-w-[200px] max-w-[240px] font-bold text-slate-800 md:sticky md:left-[134px] bg-white group-hover:bg-slate-50 z-10 md:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] md:border-r-2 md:border-slate-300 truncate">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{m.name}</span>
                            {st?.totalA > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Memiliki catatan Alpa" />
                            )}
                          </div>
                        </td>

                        {/* Attendance per date */}
                        {filteredDates.map((d) => {
                          const item = attendanceLookup[`${m.id}_${d}`];
                          return (
                            <td
                              key={d}
                              className="py-2 px-1 text-center border-l border-slate-100"
                              title={item?.keterangan ? `${d}: ${item.keterangan}` : d}
                            >
                              {getStatusBadge(item?.status)}
                            </td>
                          );
                        })}

                        {/* Cumulative Columns */}
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-800 bg-emerald-50/40 border-l border-emerald-100">
                          {st?.totalH ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-sky-800 bg-sky-50/40 border-l border-sky-100">
                          {st?.totalS ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-800 bg-amber-50/40 border-l border-amber-100">
                          {st?.totalI ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-rose-800 bg-rose-50/40 border-l border-rose-100">
                          {st?.totalA ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-purple-800 bg-purple-50/40 border-l border-purple-100">
                          {st?.totalT ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-slate-900 bg-slate-50 border-l border-slate-200">
                          {st?.persenHadir ?? 0}%
                        </td>
                        <td className="py-2.5 px-3 text-center border-l border-slate-200">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st?.color}`}
                          >
                            {st?.predikat}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedMuridDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                  Detail Riwayat Kehadiran Siswa
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedMuridDetail.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  NIS: {selectedMuridDetail.nis || '-'} • Kelas {selectedKelasObj?.nama}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMuridDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Stats Summary */}
            {(() => {
              const st = studentStats[selectedMuridDetail.id];
              return (
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-base font-black text-emerald-700">{st?.totalH ?? 0}</div>
                    <div className="text-[10px] font-bold text-emerald-800">Hadir</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
                    <div className="text-base font-black text-sky-700">{st?.totalS ?? 0}</div>
                    <div className="text-[10px] font-bold text-sky-800">Sakit</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="text-base font-black text-amber-700">{st?.totalI ?? 0}</div>
                    <div className="text-[10px] font-bold text-amber-800">Izin</div>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="text-base font-black text-rose-700">{st?.totalA ?? 0}</div>
                    <div className="text-[10px] font-bold text-rose-800">Alpa</div>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="text-base font-black text-purple-700">{st?.totalT ?? 0}</div>
                    <div className="text-[10px] font-bold text-purple-800">Telat</div>
                  </div>
                </div>
              );
            })()}

            {/* List of dates */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-slate-700">Rincian Pertemuan:</h4>
              {filteredDates.map((d) => {
                const item = attendanceLookup[`${selectedMuridDetail.id}_${d}`];
                return (
                  <div
                    key={d}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {getStatusBadge(item?.status)}
                      <span className="font-semibold text-slate-700">{d}</span>
                    </div>
                    <span className="text-slate-500 text-[11px] italic">
                      {item?.keterangan || 'Presensi PJOK'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMuridDetail(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
