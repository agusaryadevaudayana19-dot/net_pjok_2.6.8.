import React from 'react';
import {
  Users,
  School,
  BookMarked,
  ClipboardList,
  UserPlus,
  ArrowUpRight,
  Download,
  GraduationCap,
  UserCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { LMSDatabase } from '../../services/dataStorage';

interface AdminDashboardProps {
  db: LMSDatabase;
  onNavigate: (menuId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ db, onNavigate }) => {
  const totalMurid = db.users.filter((u) => u.role === 'MURID').length;
  const inactiveMurid = db.users.filter((u) => u.role === 'MURID' && u.status === 'Nonaktif').length;
  const totalGuru = db.users.filter((u) => u.role === 'GURU').length;
  const totalKelas = db.kelas.length;
  const totalMateri = db.materi.length;
  const totalTugasDanQuiz = db.tugas.length + db.quiz.length;

  const activityLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
  const recentLogs = activityLogs.slice(0, 5);
  const failedLogins = activityLogs.filter((l) => l.category === 'LOGIN_FAILED').length;

  const formatRelativeTime = (iso: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ringkasan Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Selamat datang kembali di Pusat Kendali LMS PJOK Nusantara.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('log-aktivitas')}
            className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 rounded-xl shadow-2xs hover:bg-indigo-100 flex items-center transition-colors"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5 text-indigo-600" />
            <span>Log & Diagnosa Akses</span>
            {failedLogins > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {failedLogins}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              window.print();
            }}
            className="px-3.5 py-2 bg-white border border-gray-200 text-xs font-semibold text-slate-700 rounded-xl shadow-2xs hover:bg-gray-50 flex items-center transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Cetak / PDF
          </button>
          <button
            onClick={() => onNavigate('data-murid')}
            className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-emerald-700 flex items-center transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Tambah Data Murid
          </button>
        </div>
      </div>

      {/* Access Diagnostic Alert if any issue detected */}
      {(inactiveMurid > 0 || totalMurid === 0) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Perhatian Kendala Akses Akun Murid</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {totalMurid === 0
                  ? 'Belum ada data murid terdaftar di sistem. Murid belum bisa masuk ke portal LMS.'
                  : `Terdapat ${inactiveMurid} akun murid berstatus 'Nonaktif' yang tidak bisa login.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('log-aktivitas')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
          >
            Buka Diagnosa Akun
          </button>
        </div>
      )}

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 shrink-0">
        {/* Total Murid */}
        <div
          onClick={() => onNavigate('data-murid')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:border-gray-200 transition-all group"
        >
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mr-3.5 shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Data Murid</p>
            <h3 className="text-xl font-black text-slate-900">{totalMurid > 0 ? totalMurid.toLocaleString() : '0'}</h3>
            <p className="text-[10px] text-emerald-500 font-bold">Fase E & F</p>
          </div>
        </div>

        {/* Total Guru */}
        <div
          onClick={() => onNavigate('data-guru')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:border-gray-200 transition-all group"
        >
          <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 mr-3.5 shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Data Guru</p>
            <h3 className="text-xl font-black text-slate-900">{totalGuru > 0 ? totalGuru : '0'}</h3>
            <p className="text-[10px] text-sky-500 font-bold">Pengampu PJOK</p>
          </div>
        </div>

        {/* Total Kelas */}
        <div
          onClick={() => onNavigate('kelas')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:border-gray-200 transition-all group"
        >
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mr-3.5 shrink-0 group-hover:scale-105 transition-transform">
            <School className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Total Kelas</p>
            <h3 className="text-xl font-black text-slate-900">{totalKelas > 0 ? totalKelas : '0'}</h3>
            <p className="text-[10px] text-slate-400 font-bold">Rombel Aktif</p>
          </div>
        </div>

        {/* Materi Aktif */}
        <div
          onClick={() => onNavigate('materi')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:border-gray-200 transition-all group"
        >
          <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mr-3.5 shrink-0 group-hover:scale-105 transition-transform">
            <BookMarked className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Materi Aktif</p>
            <h3 className="text-xl font-black text-slate-900">{totalMateri > 0 ? totalMateri : '0'}</h3>
            <p className="text-[10px] text-amber-500 font-bold">Kurikulum Merdeka</p>
          </div>
        </div>

        {/* Tugas & Quiz */}
        <div
          onClick={() => onNavigate('tugas')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center cursor-pointer hover:border-gray-200 transition-all group"
        >
          <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 mr-3.5 shrink-0 group-hover:scale-105 transition-transform">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">Tugas & Quiz</p>
            <h3 className="text-xl font-black text-slate-900">{totalTugasDanQuiz > 0 ? totalTugasDanQuiz : '0'}</h3>
            <p className="text-[10px] text-slate-400 font-bold">Asesmen Aktif</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Aktivitas Terbaru (2 cols) & Statistik Presensi (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aktivitas Terbaru */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-slate-900">Aktivitas Sistem & Login Terbaru</h2>
            </div>
            <button
              onClick={() => onNavigate('log-aktivitas')}
              className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
            >
              <span>Buka Log Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider font-bold text-slate-500 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Pengguna</th>
                  <th className="px-6 py-3">Aktivitas / Aksi</th>
                  <th className="px-6 py-3">Waktu</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-400">
                      Belum ada catatan aktivitas terbaru.
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => {
                    const initials = log.actorName
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'US';

                    return (
                      <tr key={log.id} className="text-sm hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3.5 flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 mr-3 overflow-hidden text-[10px] flex items-center justify-center font-bold text-slate-700 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                              {log.actorName}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 text-xs">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <span className="block text-[11px] text-slate-400 truncate max-w-[260px]">
                            {log.details}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {formatRelativeTime(log.timestamp)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-700'
                                : log.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-700'
                                : log.status === 'WARNING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.status === 'SUCCESS'
                              ? 'Berhasil'
                              : log.status === 'FAILED'
                              ? 'Gagal'
                              : log.status === 'WARNING'
                              ? 'Peringatan'
                              : 'Info'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistik Presensi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Statistik Presensi</h2>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Rata-rata 94%
            </span>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Hadir (94%)</span>
                  <span className="text-emerald-600 font-extrabold">329 Murid</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Izin / Sakit (4%)</span>
                  <span className="text-blue-600 font-extrabold">14 Murid</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '4%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700">Alpa / Tanpa Keterangan (2%)</span>
                  <span className="text-rose-600 font-extrabold">7 Murid</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '2%' }} />
                </div>
              </div>
            </div>

            {/* Tahun Pelajaran Berjalan card */}
            <div className="mt-auto p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-800 mb-1.5">Tahun Pelajaran Berjalan</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-blue-950">
                  {db.settings?.tahunPelajaran || '2026/2027'}
                </span>
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider shadow-2xs">
                  {db.settings?.semester || 'Ganjil'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
