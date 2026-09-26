import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  KeyRound,
  UserCheck,
  UserX,
  Database,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Wrench,
  Sparkles,
  ExternalLink,
  Shield,
  Activity,
  ArrowRight,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { ActivityLog, ActivityLogCategory, User, UserRole } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface ActivityLogViewProps {
  db: LMSDatabase;
  onNavigate?: (tab: string) => void;
  onTestLoginMurid?: (user: User) => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  db,
  onNavigate,
  onTestLoginMurid,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'diagnosa' | 'keamanan'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Diagnosa state
  const [inspectQuery, setInspectQuery] = useState('');
  const [selectedMuridForDetail, setSelectedMuridForDetail] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const logs = useMemo(() => {
    return Array.isArray(db.activityLogs) ? db.activityLogs : [];
  }, [db.activityLogs]);

  const muridList = useMemo(() => {
    return (db.users || []).filter((u) => u.role === 'MURID');
  }, [db.users]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalLogs = logs.length;
    const loginSuccess = logs.filter((l) => l.category === 'LOGIN_SUCCESS').length;
    const loginFailed = logs.filter((l) => l.category === 'LOGIN_FAILED').length;
    const dbChanges = logs.filter((l) => ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'STATUS_CHANGE', 'PASSWORD_RESET', 'DATA_MODIFICATION'].includes(l.category)).length;

    const totalMurid = muridList.length;
    const activeMurid = muridList.filter((m) => m.status === 'Aktif').length;
    const inactiveMurid = muridList.filter((m) => m.status === 'Nonaktif').length;
    const missingClassMurid = muridList.filter((m) => !m.kelasId).length;

    const hasAccessTrouble = inactiveMurid > 0 || loginFailed > 0 || totalMurid === 0;

    return {
      totalLogs,
      loginSuccess,
      loginFailed,
      dbChanges,
      totalMurid,
      activeMurid,
      inactiveMurid,
      missingClassMurid,
      hasAccessTrouble,
    };
  }, [logs, muridList]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        (log.targetName && log.targetName.toLowerCase().includes(q));

      const matchCategory = selectedCategory === 'ALL' || log.category === selectedCategory;
      const matchRole =
        selectedRole === 'ALL' ||
        log.actorRole === selectedRole ||
        (log.targetRole && log.targetRole === selectedRole);
      const matchStatus = selectedStatus === 'ALL' || log.status === selectedStatus;

      return matchQuery && matchCategory && matchRole && matchStatus;
    });
  }, [logs, searchQuery, selectedCategory, selectedRole, selectedStatus]);

  const handleExportCSV = () => {
    try {
      if (logs.length === 0) {
        showToast('Belum ada data log untuk diekspor.', 'info');
        return;
      }

      const headers = ['ID', 'Waktu', 'Kategori', 'Pelaku', 'Role Pelaku', 'Target', 'Aksi', 'Status', 'Keterangan'];
      const rows = logs.map((l) => [
        `"${l.id}"`,
        `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
        `"${l.category}"`,
        `"${l.actorName}"`,
        `"${l.actorRole}"`,
        `"${l.targetName || '-'}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.status}"`,
        `"${l.details.replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `log_aktivitas_lms_pjok_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Log aktivitas berhasil diunduh dalam format CSV.');
    } catch (e) {
      showToast('Gagal mengekspor file CSV.', 'error');
    }
  };

  const handleClearLogs = () => {
    dataStorage.clearActivityLogs();
    setShowClearConfirm(false);
    showToast('Seluruh riwayat log aktivitas telah dibersihkan.');
  };

  const handleRepairAllStudents = () => {
    const res = dataStorage.repairAllMuridAccounts();
    showToast(res.message, 'success');
  };

  const handleActivateStudent = (userId: string, name: string) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => (u.id === userId ? { ...u, status: 'Aktif' } : u)),
    }));

    dataStorage.logActivity({
      category: 'STATUS_CHANGE',
      actorName: 'Administrator',
      actorRole: 'ADMIN',
      targetName: name,
      targetRole: 'MURID',
      targetId: userId,
      action: 'Aktivasi Akun Murid',
      details: `Status akun murid '${name}' telah diaktifkan kembali oleh Administrator. Murid kini dapat masuk ke LMS.`,
      status: 'SUCCESS',
      metadata: { userId, newStatus: 'Aktif' },
    });

    showToast(`Akun murid "${name}" berhasil diaktifkan kembali.`);
  };

  const handleResetStudentPassword = (student: User) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: (prev.users || []).map((u) => (u.id === student.id ? { ...u, password: '123456' } : u)),
    }));

    dataStorage.logActivity({
      category: 'PASSWORD_RESET',
      actorName: 'Administrator',
      actorRole: 'ADMIN',
      targetName: student.name,
      targetRole: 'MURID',
      targetId: student.id,
      action: 'Reset Password Murid ke Default',
      details: `Password akun murid '${student.name}' (${student.username}) berhasil direset menjadi '123456'.`,
      status: 'SUCCESS',
      metadata: { userId: student.id, username: student.username },
    });

    showToast(`Password akun "${student.name}" berhasil direset menjadi: 123456`);
  };

  // Inspect specific student
  const inspectedStudents = useMemo(() => {
    if (!inspectQuery.trim()) return muridList;
    const q = inspectQuery.toLowerCase().trim();
    return muridList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.nis && m.nis.toLowerCase().includes(q)) ||
        (m.nisn && m.nisn.toLowerCase().includes(q))
    );
  }, [muridList, inspectQuery]);

  const getRelativeTime = (iso: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return 'Baru saja';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  };

  const getCategoryBadge = (category: ActivityLogCategory) => {
    switch (category) {
      case 'LOGIN_SUCCESS':
        return { label: 'Login Sukses', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'LOGIN_FAILED':
        return { label: 'Login Gagal', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: ShieldAlert };
      case 'USER_CREATE':
        return { label: 'Akun Dibuat', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: UserCheck };
      case 'USER_UPDATE':
        return { label: 'Akun Diubah', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Wrench };
      case 'USER_DELETE':
        return { label: 'Akun Dihapus', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: UserX };
      case 'PASSWORD_RESET':
        return { label: 'Reset Sandi', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: KeyRound };
      case 'STATUS_CHANGE':
        return { label: 'Status Akun', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldCheck };
      case 'DB_SYNC':
        return { label: 'Sinkronisasi', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Database };
      default:
        return { label: 'Aktivitas Data', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Activity };
    }
  };

  return (
    <div id="activity-log-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-blue-900 text-blue-100 border-blue-800'
              : 'bg-emerald-900 text-emerald-100 border-emerald-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Log Aktivitas & Diagnosa Sistem</h1>
                <p className="text-xs text-slate-500">
                  Audit trail keamanan login pengguna dan riwayat perubahan data untuk identifikasi kendala akses
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Log</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostics Alert Banner if access troubles detected */}
        {metrics.hasAccessTrouble && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Perhatian Diagnosa Akses Murid</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  {metrics.totalMurid === 0
                    ? 'Belum ada data murid terdaftar di database. Murid tidak dapat masuk login!'
                    : metrics.inactiveMurid > 0
                    ? `Ditemukan ${metrics.inactiveMurid} akun murid berstatus 'Nonaktif' yang otomatis ditolak saat login.`
                    : `Terdeteksi ${metrics.loginFailed} kali percobaan login yang gagal baru-baru ini.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRepairAllStudents}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Perbaiki Otomatis</span>
              </button>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Log Tercatat</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">{metrics.totalLogs}</span>
              <span className="text-xs text-slate-400">peristiwa</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">Login Berhasil</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">{metrics.loginSuccess}</span>
              <span className="text-xs text-emerald-600">sesi</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border ${metrics.loginFailed > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
            <span className={`text-[11px] font-medium uppercase tracking-wider block ${metrics.loginFailed > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Login Ditolak / Gagal
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${metrics.loginFailed > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                {metrics.loginFailed}
              </span>
              <span className="text-xs text-slate-400">percobaan</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[11px] font-medium text-indigo-700 uppercase tracking-wider block">Akun Murid Aktif</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-700">{metrics.activeMurid}</span>
              <span className="text-xs text-indigo-600">/ {metrics.totalMurid} murid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Riwayat Log Aktivitas ({filteredLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnosa')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'diagnosa'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Diagnosa Akses Akun Murid</span>
          {metrics.inactiveMurid > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white rounded-full font-bold">
              {metrics.inactiveMurid}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('keamanan')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'keamanan'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Analisis Keamanan & Login</span>
        </button>
      </div>

      {/* TAB 1: RIWAYAT LOG AKTIVITAS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="sm:col-span-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pengguna, NIS, aksi, atau rincian log..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="LOGIN_SUCCESS">Login Berhasil</option>
                  <option value="LOGIN_FAILED">Login Ditolak / Gagal</option>
                  <option value="USER_CREATE">Pembuatan Akun</option>
                  <option value="USER_UPDATE">Pembaruan Akun</option>
                  <option value="STATUS_CHANGE">Perubahan Status</option>
                  <option value="PASSWORD_RESET">Reset Password</option>
                  <option value="USER_DELETE">Penghapusan Akun</option>
                  <option value="DB_SYNC">Sinkronisasi Basis Data</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SUCCESS">Berhasil (Success)</option>
                  <option value="FAILED">Gagal (Failed)</option>
                  <option value="WARNING">Peringatan (Warning)</option>
                  <option value="INFO">Informasi (Info)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Tidak ada data log yang cocok</h3>
                <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori Anda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const badge = getCategoryBadge(log.category);
                  const Icon = badge.icon;
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`p-4 transition-colors hover:bg-slate-50/80 ${
                        log.status === 'FAILED' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badge.bg}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{log.action}</span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                • {getRelativeTime(log.timestamp)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.details}</p>

                            {/* Actor and Target Chips */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                <span>Pelaku: <strong>{log.actorName}</strong> ({log.actorRole})</span>
                              </span>
                              {log.targetName && (
                                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <span>Target: <strong>{log.targetName}</strong> {log.targetRole ? `(${log.targetRole})` : ''}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timestamp & Expand button */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Tutup Rincian' : 'Rincian Teknis'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Technical Details Drawer */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 font-mono">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                            <div><span className="text-slate-400">ID Peristiwa:</span> {log.id}</div>
                            <div><span className="text-slate-400">Waktu Lengkap:</span> {new Date(log.timestamp).toISOString()}</div>
                            <div><span className="text-slate-400">Status Eksekusi:</span> <strong className={log.status === 'FAILED' ? 'text-rose-600' : 'text-emerald-600'}>{log.status}</strong></div>
                            <div><span className="text-slate-400">Target ID:</span> {log.targetId || '-'}</div>
                          </div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Metadata Event:</span>
                              <pre className="p-2 rounded bg-slate-900 text-slate-200 text-[10px] overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNOSA AKSES AKUN MURID */}
      {activeTab === 'diagnosa' && (
        <div className="space-y-5">
          {/* Quick Troubleshooting Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Pemeriksa Kesehatan Akun Murid
                </span>
                <h2 className="text-lg font-bold text-white">Diagnosa Mandiri: Kenapa Akun Murid Tidak Bisa Dibuka?</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Modul ini secara otomatis memeriksa kendala umum login murid: status akun Nonaktif, kata sandi yang salah/terkunci, spasi tersembunyi pada NIS, dan ketidaksesuaian rombel.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRepairAllStudents}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Perbaiki Semua Akun Murid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Murid for Inspection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Daftar Akun Murid & Uji Akses</h3>
                <p className="text-xs text-slate-500">Cari murid untuk melihat status kelayakan login dan lakukan perbaikan langsung</p>
              </div>

              <div className="w-full sm:w-72 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={inspectQuery}
                  onChange={(e) => setInspectQuery(e.target.value)}
                  placeholder="Ketik nama, username, atau NIS murid..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Students Inspection Table */}
            {inspectedStudents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Tidak ada akun murid ditemukan</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {muridList.length === 0
                    ? 'Database murid saat ini bersih (0 akun). Silakan impor data murid dari menu Manajemen Murid.'
                    : 'Coba periksa kembali ejaan nama atau NIS murid yang dicari.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Nama Lengkap & Username</th>
                      <th className="py-2.5 px-3">NIS / ID</th>
                      <th className="py-2.5 px-3">Rombel / Kelas</th>
                      <th className="py-2.5 px-3">Status Akun</th>
                      <th className="py-2.5 px-3">Kata Sandi</th>
                      <th className="py-2.5 px-3 text-right">Tindakan Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectedStudents.map((murid) => {
                      const isInactive = murid.status === 'Nonaktif';
                      const hasSpacingIssue = murid.nis && String(murid.nis) !== String(murid.nis).trim();
                      const hasClass = Boolean(murid.kelasId);

                      return (
                        <tr key={murid.id} className={`hover:bg-slate-50/60 ${isInactive ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{murid.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">username: {murid.username}</div>
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-700">
                            {murid.nis || <span className="text-rose-500">Belum diatur</span>}
                            {hasSpacingIssue && (
                              <span className="block text-[10px] text-amber-600 font-sans">
                                (Terdeteksi spasi ekstra)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {hasClass ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-100">
                                {db.kelas.find((k) => k.id === murid.kelasId)?.nama || murid.kelasId}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium">Belum ada kelas</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">
                                <XCircle className="w-3 h-3" />
                                <span>Nonaktif (Ditolak)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Aktif (Dapat Masuk)</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-slate-600 font-mono">
                              {murid.password ? (murid.password === '123456' ? '123456 (Default)' : 'Tersimpan (Kustom)') : '123456 (Default)'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isInactive && (
                                <button
                                  type="button"
                                  onClick={() => handleActivateStudent(murid.id, murid.name)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                                >
                                  Aktifkan
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResetStudentPassword(murid)}
                                title="Reset kata sandi ke 123456"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition-colors"
                              >
                                Reset Sandi
                              </button>
                              {onTestLoginMurid && (
                                <button
                                  type="button"
                                  onClick={() => onTestLoginMurid(murid)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                                >
                                  <span>Uji Masuk</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ANALISIS KEAMANAN & LOGIN */}
      {activeTab === 'keamanan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Failure Reasons Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Penyebab Utama Login Gagal</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Ringkasan alasan penolakan login dari riwayat audit</p>

            {metrics.loginFailed === 0 ? (
              <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-900">Tidak ada catatan login gagal</p>
                <p className="text-[11px] text-emerald-700">Semua percobaan login pengguna berjalan mulus.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {['USER_NOT_FOUND', 'ACCOUNT_INACTIVE', 'WRONG_PASSWORD'].map((reasonKey) => {
                  const count = logs.filter((l) => l.category === 'LOGIN_FAILED' && l.metadata?.reason === reasonKey).length;
                  const label =
                    reasonKey === 'USER_NOT_FOUND'
                      ? 'Pengguna Tidak Terdaftar (Username / NIS Salah)'
                      : reasonKey === 'ACCOUNT_INACTIVE'
                      ? 'Akun Dinonaktifkan oleh Admin'
                      : 'Kata Sandi Tidak Sesuai';

                  return (
                    <div key={reasonKey} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">{label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Kode: {reasonKey}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">
                        {count} kali
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Guide for Administrators */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Panduan Mengatasi Akun Murid Terkendala</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">Langkah praktis bagi Administrator dan Guru PJOK</p>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">1. Pastikan Murid Menggunakan NIS atau Username</strong>
                Murid dapat masuk menggunakan NIS (misal <code>240101</code>) atau Username (misal <code>murid</code>).
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">2. Kata Sandi Bawaan</strong>
                Kata sandi standar seluruh murid adalah <code>123456</code> atau nomor NIS masing-masing.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">3. Periksa Status 'Aktif'</strong>
                Jika murid berstatus 'Nonaktif', tombol Masuk akan menolak akses secara otomatis. Aktifkan melalui tab Diagnosa.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Log Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Bersihkan Seluruh Riwayat Log?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tindakan ini akan mengosongkan riwayat aktivitas login dan modifikasi sistem sebelumnya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
              >
                Ya, Bersihkan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
