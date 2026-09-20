import React, { useState, useMemo } from 'react';
import {
  School,
  Users,
  BookMarked,
  ClipboardList,
  CheckCircle,
  CalendarCheck,
  Activity,
  ArrowUpRight,
  Sparkles,
  Award,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Table as TableIcon,
  FileText,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { LMSDatabase } from '../../services/dataStorage';
import { User, getTeacherAssignedClasses } from '../../types';

interface GuruDashboardProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigate: (menuId: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({ db, currentUser, onNavigate }) => {
  const [attendancePeriod, setAttendancePeriod] = useState<'ALL' | 'TODAY'>('ALL');
  const [classFilter, setClassFilter] = useState<'ASSIGNED' | 'ALL' | string>('ASSIGNED');

  const assignedClasses = useMemo(() => {
    return getTeacherAssignedClasses(currentUser, db.kelas);
  }, [currentUser, db.kelas]);

  const activeClasses = useMemo(() => {
    if (classFilter === 'ASSIGNED') {
      return assignedClasses.length > 0 ? assignedClasses : db.kelas;
    }
    if (classFilter === 'ALL') {
      return db.kelas;
    }
    return db.kelas.filter((k) => k.id === classFilter);
  }, [classFilter, assignedClasses, db.kelas]);

  const activeClassIds = useMemo(() => new Set(activeClasses.map((k) => k.id)), [activeClasses]);
  const activeClassNames = useMemo(
    () => new Set(activeClasses.map((k) => (k.nama || '').toLowerCase().trim())),
    [activeClasses]
  );

  const filteredMurid = useMemo(() => {
    return db.users.filter((u) => {
      if (u.role !== 'MURID') return false;
      const uKelas = (u.kelasId || '').toLowerCase().trim();
      return (
        activeClassIds.has(u.kelasId || '') ||
        activeClassNames.has(uKelas)
      );
    });
  }, [db.users, activeClassIds, activeClassNames]);

  const filteredStudentIds = useMemo(() => new Set(filteredMurid.map((m) => m.id)), [filteredMurid]);

  const totalKelas = activeClasses.length;
  const totalMurid = filteredMurid.length;
  const totalMateri = db.materi.length;
  const totalTugas = db.tugas.length;
  const totalQuiz = db.quiz.length;

  const todayDate = new Date().toISOString().slice(0, 10);
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const presensiToday = (db.presensi || []).filter((p) => {
    if (p.tanggal !== todayDate) return false;
    return (
      filteredStudentIds.has(p.muridId) ||
      activeClassIds.has(p.kelasId || '') ||
      activeClassNames.has((p.kelasNama || '').toLowerCase().trim())
    );
  });
  const hadirToday = presensiToday.filter((p) => p.status === 'H').length;

  const pendingIzinList = useMemo(() => {
    return (db.pengajuanIzin || []).filter((p) => p.status === 'Menunggu');
  }, [db.pengajuanIzin]);

  // Murid yang telah mengirimkan klarifikasi kendala & komitmen perubahan tapi belum ditangani guru
  const pendingPendampinganList = useMemo(() => {
    return (db.pendampinganMurid || []).filter((p) => {
      const hasStudentMessage = Boolean(p.deskripsiMasalah?.trim() || p.komitmenMurid?.trim());
      const isHandled =
        p.status === 'Selesai / Teratasi' ||
        p.status === 'Perlu Pemantauan Khusus' ||
        p.status === 'Dirujuk ke Guru BK' ||
        Boolean(p.tindakanPenanganan?.trim() || p.catatanGuru?.trim());

      if (!hasStudentMessage || isHandled) return false;
      if (activeClassIds.size > 0 && p.kelasId && !activeClassIds.has(p.kelasId)) {
        return false;
      }
      return true;
    });
  }, [db.pendampinganMurid, activeClassIds]);

  // Rekapitulasi Kehadiran & Kedisiplinan Per Rombel/Kelas yang Aktif
  const classAttendanceSummaries = useMemo(() => {
    return activeClasses.map((k) => {
      const targetId = (k.id || '').toLowerCase().trim();
      const targetNama = (k.nama || '').toLowerCase().trim();

      // Murid dalam kelas
      const muridKelas = db.users.filter((u) => {
        if (u.role !== 'MURID') return false;
        const uKelas = (u.kelasId || '').toLowerCase().trim();
        return uKelas === targetId || (targetNama && uKelas === targetNama);
      });
      const studentIds = new Set(muridKelas.map((m) => m.id));

      // Rekaman presensi kelas ini
      const classRecords = (db.presensi || []).filter((p) => {
        if (attendancePeriod === 'TODAY' && p.tanggal !== todayDate) return false;

        if (studentIds.has(p.muridId)) return true;
        const pKelasId = (p.kelasId || '').toLowerCase().trim();
        const pKelasNama = (p.kelasNama || '').toLowerCase().trim();
        return pKelasId === targetId || pKelasId === targetNama || pKelasNama.includes(targetNama);
      });

      const countH = classRecords.filter((p) => p.status === 'H').length;
      const countS = classRecords.filter((p) => p.status === 'S').length;
      const countI = classRecords.filter((p) => p.status === 'I').length;
      const countA = classRecords.filter((p) => p.status === 'A').length;
      const countT = classRecords.filter((p) => p.status === 'T').length;
      const totalRecorded = classRecords.length;

      // Unik tanggal pertemuan yang sudah dilakukan
      const uniqueDates = Array.from(new Set(classRecords.map((p) => p.tanggal)));

      const percentage = totalRecorded > 0 ? Math.round(((countH + countT) / totalRecorded) * 100) : 0;

      let disciplineLevel: 'excellent' | 'good' | 'warning' | 'empty' = 'empty';
      if (totalRecorded > 0) {
        if (percentage >= 90) disciplineLevel = 'excellent';
        else if (percentage >= 80) disciplineLevel = 'good';
        else disciplineLevel = 'warning';
      }

      return {
        kelas: k,
        totalMurid: muridKelas.length || k.totalMurid || 0,
        totalRecorded,
        uniqueDatesCount: uniqueDates.length,
        countH,
        countS,
        countI,
        countA,
        countT,
        percentage,
        disciplineLevel,
      };
    });
  }, [activeClasses, db.users, db.presensi, attendancePeriod, todayDate]);

  // Statistik Global Seluruh Kelas
  const globalAttendanceStats = useMemo(() => {
    const totalRecorded = classAttendanceSummaries.reduce((acc, c) => acc + c.totalRecorded, 0);
    const totalH = classAttendanceSummaries.reduce((acc, c) => acc + c.countH, 0);
    const totalT = classAttendanceSummaries.reduce((acc, c) => acc + c.countT, 0);
    const totalA = classAttendanceSummaries.reduce((acc, c) => acc + c.countA, 0);
    const totalS = classAttendanceSummaries.reduce((acc, c) => acc + c.countS, 0);
    const totalI = classAttendanceSummaries.reduce((acc, c) => acc + c.countI, 0);
    const avgPercentage = totalRecorded > 0 ? Math.round(((totalH + totalT) / totalRecorded) * 100) : 0;

    const classesWithData = classAttendanceSummaries.filter((c) => c.totalRecorded > 0);
    const topClass = classesWithData.length > 0
      ? [...classesWithData].sort((a, b) => b.percentage - a.percentage)[0]
      : null;

    const warningClasses = classesWithData.filter((c) => c.countA > 0 || c.percentage < 80);

    return {
      totalRecorded,
      totalH,
      totalT,
      totalA,
      totalS,
      totalI,
      avgPercentage,
      topClass,
      warningClassesCount: warningClasses.length,
    };
  }, [classAttendanceSummaries]);

  // Murid yang perlu perhatian khusus (sering alpa atau sakit/izin berulang)
  const frequentAbsentees = useMemo(() => {
    const map: Record<string, { muridNama: string; kelasNama: string; countA: number; countS: number; countI: number }> = {};
    (db.presensi || []).forEach((p) => {
      if (p.status === 'A' || p.status === 'S' || p.status === 'I') {
        if (!map[p.muridId]) {
          map[p.muridId] = {
            muridNama: p.muridNama,
            kelasNama: p.kelasNama || '-',
            countA: 0,
            countS: 0,
            countI: 0,
          };
        }
        if (p.status === 'A') map[p.muridId].countA += 1;
        if (p.status === 'S') map[p.muridId].countS += 1;
        if (p.status === 'I') map[p.muridId].countI += 1;
      }
    });

    return Object.entries(map)
      .filter(([_, data]) => data.countA >= 1 || (data.countS + data.countI) >= 2)
      .sort((a, b) => (b[1].countA * 3 + b[1].countS + b[1].countI) - (a[1].countA * 3 + a[1].countS + a[1].countI))
      .slice(0, 4);
  }, [db.presensi]);

  const stats = [
    {
      title: 'Kelas Diajar',
      value: `${totalKelas} Kelas`,
      sub: 'Semua Rombel Kelas Diampu',
      icon: <School className="w-5 h-5 text-sky-600" />,
      color: 'bg-sky-50 text-sky-900 border-sky-100',
      action: () => onNavigate('data-murid'),
    },
    {
      title: 'Total Murid',
      value: totalMurid,
      sub: 'Peserta Didik Aktif',
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 text-emerald-900 border-emerald-100',
      action: () => onNavigate('data-murid'),
    },
    {
      title: 'Materi PJOK',
      value: totalMateri,
      sub: 'Modul Teori & Praktik',
      icon: <BookMarked className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 text-purple-900 border-purple-100',
      action: () => onNavigate('materi'),
    },
    {
      title: 'Tugas PJOK',
      value: totalTugas,
      sub: 'Praktik & Analisis Gerak',
      icon: <ClipboardList className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 text-amber-900 border-amber-100',
      action: () => onNavigate('tugas'),
    },
    {
      title: 'Quiz & Asesmen',
      value: totalQuiz,
      sub: 'Soal AKM & HOTS',
      icon: <CheckCircle className="w-5 h-5 text-pink-600" />,
      color: 'bg-pink-50 text-pink-900 border-pink-100',
      action: () => onNavigate('quiz'),
    },
    {
      title: 'Presensi Hari Ini',
      value: `${hadirToday} Hadir`,
      sub: `${presensiToday.length} Total Tercatat`,
      icon: <CalendarCheck className="w-5 h-5 text-teal-600" />,
      color: 'bg-teal-50 text-teal-900 border-teal-100',
      action: () => onNavigate('presensi'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-sky-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Selamat Datang, {currentUser.name}
              {assignedClasses.length > 0 && ` • Mengampu Kelas: ${assignedClasses.map((k) => k.nama).join(', ')}`}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ruang Guru LMS PJOK
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            Pantau kemajuan motorik murid Fase F pada kelas yang Anda ampu, berikan penilaian praktik berdasar rubrik 6 kriteria,
            periksa tugas video passing/dribble, dan rekap nilai akhir untuk rapor sekolah.
          </p>

          <div className="pt-3 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('praktik')}
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              Beri Penilaian Praktik
            </button>
            <button
              onClick={() => onNavigate('presensi')}
              className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Isi Presensi Lapangan
            </button>
            <button
              onClick={() => onNavigate('surat-izin')}
              className="px-4 py-2 bg-amber-500/80 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Surat Izin ({pendingIzinList.length})
            </button>
            <button
              onClick={() => onNavigate('pendampingan-murid')}
              className={`px-4 py-2 ${
                pendingPendampinganList.length > 0
                  ? 'bg-rose-600 hover:bg-rose-500 ring-2 ring-rose-300'
                  : 'bg-rose-500/80 hover:bg-rose-500'
              } text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer`}
            >
              <UserCheck className="w-4 h-4" />
              Pendampingan Murid {pendingPendampinganList.length > 0 && `(${pendingPendampinganList.length})`}
            </button>
            <button
              onClick={() => onNavigate('rekap-jurnal')}
              className="px-4 py-2 bg-teal-500/80 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              Rekapan Jurnal
            </button>
          </div>
        </div>
      </div>

      {/* Alert Pengajuan Surat Izin Menunggu Konfirmasi Guru */}
      {pendingIzinList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border-2 border-amber-400/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  {pendingIzinList.length} Pengajuan Surat Izin / Sakit Menunggu Verifikasi
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                  Perlu Ditinjau
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Terdapat permohonan surat izin dan sakit murid yang membutuhkan persetujuan Anda untuk otomatis dicatat ke buku absensi kelas.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('surat-izin')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>Buka & Verifikasi Surat</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alert Murid Mengisi Form Pendampingan / Konsultasi Belajar */}
      {pendingPendampinganList.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-pink-500/15 border-2 border-rose-400/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-900">
                  {pendingPendampinganList.length} Murid Mengisi Formulir Kendala & Komitmen di Form Pendampingan
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                  Pesan Tersedia
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Terdapat klarifikasi ketidakhadiran alpa dan komitmen tertulis murid yang menunggu tinjauan serta arahan/tindakan pembinaan dari Anda.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('pendampingan-murid')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span>Buka & Tindak Lanjuti</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Class Scope Selector for Multi-Teacher */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-slate-800">
                Cakupan Rombel Dashboard:
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {classFilter === 'ASSIGNED'
                  ? `Kelas yang Anda Ampu (${assignedClasses.map((k) => k.nama).join(', ') || 'Semua'})`
                  : classFilter === 'ALL'
                  ? 'Semua Rombel Kelas'
                  : `Kelas ${activeClasses[0]?.nama || ''}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Statistik kehadiran, murid ({totalMurid} murid), dan penilaian disaring sesuai kelas yang Anda pilih.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {assignedClasses.length > 0 && (
            <button
              type="button"
              onClick={() => setClassFilter('ASSIGNED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                classFilter === 'ASSIGNED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Kelas Diampu ({assignedClasses.length})
            </button>
          )}

          {assignedClasses.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setClassFilter(k.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                classFilter === k.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {k.nama}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setClassFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              classFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua Rombel Kelas
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((st, i) => (
          <div
            key={i}
            onClick={st.action}
            className={`p-4 rounded-2xl border ${st.color} hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white rounded-xl shadow-2xs group-hover:scale-105 transition-transform">
                {st.icon}
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black tracking-tight">{st.value}</div>
              <div className="text-xs font-bold truncate mt-0.5">{st.title}</div>
              <div className="text-[10px] opacity-75 truncate">{st.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SEKSI REKAP & RINGKASAN PERSENTASE KEHADIRAN MURID (KEDISIPLINAN KELAS) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
        {/* Header Seksi & Kontrol Filter Periode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Monitoring Kedisiplinan &amp; Kehadiran Belajar PJOK</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Rekap &amp; Persentase Kehadiran Murid per Kelas
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Pantau tingkat kedisiplinan dan absensi per rombel secara instan tanpa harus memeriksa murid satu per satu.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Filter Periode Toggle */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setAttendancePeriod('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  attendancePeriod === 'ALL'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Akumulasi Semester
              </button>
              <button
                type="button"
                onClick={() => setAttendancePeriod('TODAY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  attendancePeriod === 'TODAY'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini ({todayDate})
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('presensi')}
              className="px-3 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Input Presensi</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rekap-absensi')}
              className="px-3 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 active:bg-teal-800 rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Rekapan Absensi</span>
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkas Kedisiplinan Global */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Rata-rata Kehadiran Global */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
              <span>Tingkat Kehadiran</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight">
              {globalAttendanceStats.avgPercentage}%
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              {globalAttendanceStats.totalRecorded > 0 ? (
                <span>
                  {globalAttendanceStats.avgPercentage >= 90
                    ? '★ Sangat Disiplin'
                    : globalAttendanceStats.avgPercentage >= 80
                    ? '✓ Cukup Tertib'
                    : '⚠ Perlu Perhatian'}
                </span>
              ) : (
                <span className="text-slate-500">Belum ada sesi tercatat</span>
              )}
            </div>
          </div>

          {/* 2. Total Hadir & Tercatat */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-blue-800 text-xs font-bold">
              <span>Murid Hadir (H)</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-950 font-mono tracking-tight">
              {globalAttendanceStats.totalH}
            </div>
            <div className="text-[11px] text-blue-700">
              dari {globalAttendanceStats.totalRecorded} presensi tercatat
            </div>
          </div>

          {/* 3. Kasus Alpa / Tanpa Keterangan */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-1 ${
            globalAttendanceStats.totalA > 0
              ? 'bg-rose-50/80 border-rose-300 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Alpa (A)</span>
              <AlertTriangle className={`w-4 h-4 ${globalAttendanceStats.totalA > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              globalAttendanceStats.totalA > 0 ? 'text-rose-700' : 'text-slate-800'
            }`}>
              {globalAttendanceStats.totalA}
            </div>
            <div className="text-[11px]">
              {globalAttendanceStats.totalA > 0 ? (
                <span className="font-bold text-rose-700">Perlu tindak lanjut</span>
              ) : (
                <span className="text-emerald-700 font-semibold">Nihil Alpa (Disiplin)</span>
              )}
            </div>
          </div>

          {/* 4. Rombel Terdisiplin */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50/50 border border-amber-200/80 space-y-1">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
              <span>Rombel Terdisiplin</span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-base sm:text-lg font-black text-amber-950 truncate tracking-tight">
              {globalAttendanceStats.topClass
                ? `Kelas ${globalAttendanceStats.topClass.kelas.nama}`
                : 'Belum Terhitung'}
            </div>
            <div className="text-[11px] text-amber-700 font-bold">
              {globalAttendanceStats.topClass
                ? `${globalAttendanceStats.topClass.percentage}% Kehadiran`
                : 'Mulai input presensi'}
            </div>
          </div>
        </div>

        {/* Grid Kartu Rekapitulasi Tiap Kelas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Persentase Kehadiran per Rombel ({classAttendanceSummaries.length} Kelas)
            </span>
            <span className="text-[11px] text-slate-400">
              Klik pada kelas untuk menuju presensi lengkap
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classAttendanceSummaries.map((c) => {
              const hasRecords = c.totalRecorded > 0;

              return (
                <div
                  key={c.kelas.id}
                  onClick={() => onNavigate('presensi')}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between space-y-3"
                >
                  {/* Baris Atas: Nama Kelas & Badge Status Kedisiplinan */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors flex items-center gap-1.5">
                        <span>Kelas {c.kelas.nama}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 transition-transform group-hover:translate-x-0.5" />
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Wali: {c.kelas.waliKelasNama || '-'} • {c.totalMurid} Murid
                      </p>
                    </div>

                    {/* Badge Tingkat Kedisiplinan */}
                    {hasRecords ? (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${
                          c.disciplineLevel === 'excellent'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : c.disciplineLevel === 'good'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {c.disciplineLevel === 'excellent'
                          ? 'Sangat Disiplin'
                          : c.disciplineLevel === 'good'
                          ? 'Cukup Tertib'
                          : 'Perlu Pantauan'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        Belum Diisi
                      </span>
                    )}
                  </div>

                  {/* Persentase Besar & Progress Bar Multi-Warna */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-slate-500">
                        Tingkat Kehadiran:
                      </span>
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {hasRecords ? `${c.percentage}%` : '0%'}
                      </span>
                    </div>

                    {/* Multi-segmented Progress Bar */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      {hasRecords ? (
                        <>
                          <div
                            style={{ width: `${(c.countH / c.totalRecorded) * 100}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Hadir: ${c.countH}`}
                          />
                          <div
                            style={{ width: `${(c.countT / c.totalRecorded) * 100}%` }}
                            className="bg-purple-500 h-full transition-all"
                            title={`Telat: ${c.countT}`}
                          />
                          <div
                            style={{ width: `${(c.countS / c.totalRecorded) * 100}%` }}
                            className="bg-sky-500 h-full transition-all"
                            title={`Sakit: ${c.countS}`}
                          />
                          <div
                            style={{ width: `${(c.countI / c.totalRecorded) * 100}%` }}
                            className="bg-amber-400 h-full transition-all"
                            title={`Izin: ${c.countI}`}
                          />
                          <div
                            style={{ width: `${(c.countA / c.totalRecorded) * 100}%` }}
                            className="bg-rose-500 h-full transition-all"
                            title={`Alpa: ${c.countA}`}
                          />
                        </>
                      ) : (
                        <div className="bg-slate-200 w-full h-full" />
                      )}
                    </div>
                  </div>

                  {/* Rincian 5 Huruf Tombol: H, S, I, A, T */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-5 gap-1 text-center font-mono">
                    <div className="p-1 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-[9px] font-bold text-emerald-800 block leading-none">H</span>
                      <span className="text-xs font-black text-emerald-950">{c.countH}</span>
                    </div>
                    <div className="p-1 rounded-lg bg-sky-50 border border-sky-100">
                      <span className="text-[9px] font-bold text-sky-800 block leading-none">S</span>
                      <span className="text-xs font-black text-sky-950">{c.countS}</span>
                    </div>
                    <div className="p-1 rounded-lg bg-amber-50 border border-amber-100">
                      <span className="text-[9px] font-bold text-amber-800 block leading-none">I</span>
                      <span className="text-xs font-black text-amber-950">{c.countI}</span>
                    </div>
                    <div className="p-1 rounded-lg bg-rose-50 border border-rose-100">
                      <span className="text-[9px] font-bold text-rose-800 block leading-none">A</span>
                      <span className="text-xs font-black text-rose-950">{c.countA}</span>
                    </div>
                    <div className="p-1 rounded-lg bg-purple-50 border border-purple-100">
                      <span className="text-[9px] font-bold text-purple-800 block leading-none">T</span>
                      <span className="text-xs font-black text-purple-950">{c.countT}</span>
                    </div>
                  </div>

                  {/* Catatan Sesi */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>{c.uniqueDatesCount} Tanggal Pertemuan</span>
                    <span className="text-teal-600 font-bold group-hover:underline">Detail Presensi →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Pantauan Murid Butuh Perhatian Khusus */}
        {frequentAbsentees.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Deteksi Murid Butuh Perhatian Khusus (Alpa / Sering Absen)
                </h4>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">
                Deteksi otomatis tanpa buka detail
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {frequentAbsentees.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate('presensi')}
                  className="p-2.5 bg-white rounded-xl border border-amber-200/90 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {m.muridNama}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {m.kelasNama}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    {m.countA > 0 && (
                      <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {m.countA} Alpa
                      </span>
                    )}
                    {m.countS > 0 && (
                      <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                        {m.countS} Sakit
                      </span>
                    )}
                    {m.countI > 0 && (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {m.countI} Izin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two columns: Quick Actions & Student Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Overview Cards */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Rombongan Belajar PJOK Aktif</h3>
              <p className="text-xs text-slate-400">Pilih kelas untuk menilai atau melihat rekap kehadiran</p>
            </div>
            <button
              onClick={() => onNavigate('data-murid')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Lihat Semua Murid →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeClasses.slice(0, 4).map((k) => (
              <div
                key={k.id}
                onClick={() => onNavigate('data-murid')}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-sm">Kelas {k.nama}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                    {k.totalMurid} Murid
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  <p>Wali: {k.waliKelasNama}</p>
                  <p className="text-emerald-700 font-semibold mt-0.5">PJOK: Kurikulum Merdeka Fase F</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Submissions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Tugas Masuk Murid</h3>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              {db.pengumpulanTugas.length} Pengumpulan
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {db.pengumpulanTugas.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{item.muridNama}</span>
                  <span className="text-[10px] text-slate-400">{item.tanggalKumpul}</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                  "{item.catatanMurid || item.catatanSiswa || item.isiJawaban || 'Tidak ada catatan'}"
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                    Nilai: {item.nilai || 'Belum'}
                  </span>
                  <button
                    onClick={() => onNavigate('tugas')}
                    className="text-[11px] text-sky-600 font-semibold hover:underline"
                  >
                    Koreksi Video →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
