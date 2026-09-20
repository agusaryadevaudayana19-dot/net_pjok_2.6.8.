import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  BookOpen,
  Award,
  Sparkles,
  Users,
  UserCheck,
  Cloud,
  RefreshCw,
  Smartphone,
  Laptop,
  CheckCircle2,
  CloudOff,
  AlertTriangle,
  Clock,
  UploadCloud,
  DownloadCloud,
  X,
  Megaphone,
  ClipboardList,
  CheckCircle,
  CalendarCheck,
} from 'lucide-react';
import { User, UserRole, PengaturanSekolah, resolveKelasId, APP_VERSION_LABEL, NotifikasiItem } from '../types';
import { dataStorage, LMSDatabase, FirestoreSyncStatus } from '../services/dataStorage';
import { getStudentUrgentDeadlines } from '../utils/deadlineNotification';
import { getStudentPendampinganStatus, getLatestTeacherUpdates, markSidebarMenuAsReadForUser, isSidebarMenuRead } from '../utils/studentNotificationHelper';
import { PWAInstallButton } from './pwa/PWAInstallButton';

interface NavbarProps {
  currentUser: User;
  onOpenSidebar?: () => void;
  onToggleSidebar?: () => void;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenProfileModal?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onSelectMenuItem?: (menuId: string, param?: string) => void;
  settings?: PengaturanSekolah;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSidebar,
  onToggleSidebar,
  onOpenLoginModal,
  onLogout,
  onOpenProfileModal,
  onSwitchRole,
  onSelectMenuItem,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FirestoreSyncStatus>(dataStorage.getSyncStatus());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(dataStorage.getLastSyncTime());
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLDivElement>(null);

  const [db, setDb] = useState<LMSDatabase>(dataStorage.getDatabase());

  useEffect(() => {
    return dataStorage.subscribe((updatedDb) => {
      setDb(updatedDb);
    });
  }, []);

  const [notifTab, setNotifTab] = useState<'semua' | 'guru'>('semua');

  // Compute urgent deadlines (< 24 hours) for student
  const urgentDeadlines = useMemo(() => {
    if (currentUser.role !== 'MURID') return [];
    return getStudentUrgentDeadlines(db, currentUser);
  }, [db, currentUser]);

  // Compute student mentoring status (pengingat otomatis pendampingan murid)
  const studentPendampingan = useMemo(() => {
    return getStudentPendampinganStatus(db, currentUser);
  }, [db, currentUser]);

  // Compute latest teacher updates (informasi terbaru dari guru lewat notifikasi)
  const teacherUpdates = useMemo(() => {
    return getLatestTeacherUpdates(db, currentUser);
  }, [db, currentUser]);

  // State untuk menyimpan ID notifikasi pendampingan otomatis yang ditutup/dibaca dalam sesi berjalan
  const [dismissedAutoNotifIds, setDismissedAutoNotifIds] = useState<Set<string>>(new Set());

  // Filter notifications relevant to current user:
  // "JANGAN HILANGKAN NOTIFIKASI PADA FITUR NOTIFIKASI AGAR MURID SELALU INGAT ADA NOTIFIKASI"
  const userNotifikasi = useMemo(() => {
    const list = db.notifikasi || [];
    if (currentUser.role === 'MURID') {
      const myKelasId = currentUser.kelasId || '';
      const muridList = list.filter((n) => {
        if (n.targetRole && n.targetRole !== 'MURID' && n.targetRole !== 'ALL') return false;
        if (n.targetMuridId && n.targetMuridId !== currentUser.id) return false;
        if (n.targetKelasId && n.targetKelasId !== 'ALL' && myKelasId && n.targetKelasId !== myKelasId) {
          return false;
        }
        return true;
      });

      // Urutkan: belum dibaca di atas, lalu yang sudah dibaca
      return muridList.sort((a, b) => {
        if (a.dibaca === b.dibaca) return 0;
        return a.dibaca ? 1 : -1;
      });
    }

    if (currentUser.role === 'GURU') {
      const guruKelasIds = currentUser.kelasIds || (currentUser.kelasDiampuIds || []);

      // 1. Notifikasi reguler guru
      const normalList = list.filter((n) => {
        if (n.dibaca) return false;
        // Jangan tampilkan notifikasi pribadi yang ditargetkan untuk murid spesifik
        if (n.targetMuridId) return false;
        if (n.targetRole && n.targetRole !== 'GURU' && n.targetRole !== 'ALL' && n.targetRole !== 'ADMIN') {
          return false;
        }
        // Notifikasi pendampingan murid / konsultasi harus dapat diakses oleh Guru PJOK
        const isPendampingan = n.tipe === 'pendampingan' || n.targetMenu === 'pendampingan-murid';
        if (!isPendampingan) {
          if (n.targetKelasId && n.targetKelasId !== 'ALL' && guruKelasIds.length > 0 && !guruKelasIds.includes(n.targetKelasId)) {
            return false;
          }
        } else {
          // Khusus pendampingan: jika guru memiliki kelas, utamakan kelasnya, namun jika notifikasi umum guru, tetap izinkan
          if (n.targetKelasId && n.targetKelasId !== 'ALL' && guruKelasIds.length > 0 && !guruKelasIds.includes(n.targetKelasId) && n.targetRole !== 'GURU') {
            return false;
          }
        }
        return true;
      });

      // 2. Deteksi otomatis pesan kendala / komitmen dari form pendampingan murid
      const pendingPendampinganList = (db.pendampinganMurid || []).filter((p) => {
        const hasStudentMessage = Boolean(p.deskripsiMasalah?.trim() || p.komitmenMurid?.trim());
        const isHandled =
          p.status === 'Selesai / Teratasi' ||
          p.status === 'Perlu Pemantauan Khusus' ||
          p.status === 'Dirujuk ke Guru BK' ||
          Boolean(p.tindakanPenanganan?.trim() || p.catatanGuru?.trim());

        if (!hasStudentMessage || isHandled) return false;
        // Jika guru ditugaskan langsung pada berkas pendampingan, selalu tampilkan
        if (p.guruId && p.guruId === currentUser.id) return true;
        // Jika guru memiliki daftar kelas ampu, cocokkan jika p.kelasId terdaftar
        if (guruKelasIds.length > 0 && p.kelasId && !guruKelasIds.includes(p.kelasId) && p.guruId) {
          return false;
        }
        return true;
      });

      const autoPendampinganNotifs: NotifikasiItem[] = pendingPendampinganList
        .filter((p) => !dismissedAutoNotifIds.has(`auto-pnd-${p.id}`))
        .filter((p) => !normalList.some((n) => n.targetId === p.id && (n.tipe === 'pendampingan' || n.targetMenu === 'pendampingan-murid')))
        .map((p) => ({
          id: `auto-pnd-${p.id}`,
          judul: `Form Pendampingan: ${p.muridNama} (${p.kelasNama || 'Murid'})`,
          pesan: `${p.muridNama} telah mengisi formulir kendala & komitmen belajar (${p.jenisMasalah || 'Konsultasi'}). Menunggu arahan dan pembinaan dari Guru PJOK.`,
          waktu: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('id-ID') : 'Perlu Ditinjau',
          tipe: 'pendampingan',
          targetRole: 'GURU',
          targetKelasId: p.kelasId,
          targetKelasNama: p.kelasNama,
          targetMenu: 'pendampingan-murid',
          targetId: p.id,
          dibaca: false,
        }));

      return [...autoPendampinganNotifs, ...normalList];
    }

    if (currentUser.role === 'ADMIN') {
      const normalList = list.filter((n) => !n.dibaca && !n.targetMuridId);

      const pendingPendampinganList = (db.pendampinganMurid || []).filter((p) => {
        const hasStudentMessage = Boolean(p.deskripsiMasalah?.trim() || p.komitmenMurid?.trim());
        const isHandled =
          p.status === 'Selesai / Teratasi' ||
          p.status === 'Perlu Pemantauan Khusus' ||
          p.status === 'Dirujuk ke Guru BK' ||
          Boolean(p.tindakanPenanganan?.trim() || p.catatanGuru?.trim());
        return hasStudentMessage && !isHandled;
      });

      const autoPendampinganNotifs: NotifikasiItem[] = pendingPendampinganList
        .filter((p) => !dismissedAutoNotifIds.has(`auto-pnd-${p.id}`))
        .filter((p) => !normalList.some((n) => n.targetId === p.id && (n.tipe === 'pendampingan' || n.targetMenu === 'pendampingan-murid')))
        .map((p) => ({
          id: `auto-pnd-${p.id}`,
          judul: `Form Pendampingan: ${p.muridNama} (${p.kelasNama || 'Murid'})`,
          pesan: `${p.muridNama} telah mengisi klarifikasi kendala & komitmen perubahan (${p.jenisMasalah || 'Konsultasi'}). Perlu ditinjau dan diberikan arahan pembinaan guru.`,
          waktu: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('id-ID') : 'Perlu Ditinjau',
          tipe: 'pendampingan',
          targetRole: 'ADMIN',
          targetKelasId: p.kelasId,
          targetKelasNama: p.kelasNama,
          targetMenu: 'pendampingan-murid',
          targetId: p.id,
          dibaca: false,
        }));

      return [...autoPendampinganNotifs, ...normalList];
    }

    return list.filter((n) => !n.dibaca);
  }, [db.notifikasi, db.pendampinganMurid, currentUser, dismissedAutoNotifIds]);

  const unreadNotifsCount = userNotifikasi.filter((n) => !n.dibaca).length;
  const isAlpaSidebarRead = currentUser.role === 'MURID' ? isSidebarMenuRead(currentUser.id, 'presensi-saya') : true;

  const unreadCount =
    unreadNotifsCount +
    (urgentDeadlines.length > 0 ? 1 : 0) +
    (studentPendampingan.needsFollowUp && !isAlpaSidebarRead ? 1 : 0);

  useEffect(() => {
    return dataStorage.onSyncStatusChange((status, lastSync) => {
      setSyncStatus(status);
      if (lastSync) setLastSyncTime(lastSync);
    });
  }, []);

  const handleSidebarClick = () => {
    if (onOpenSidebar) onOpenSidebar();
    else if (onToggleSidebar) onToggleSidebar();
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (syncRef.current && !syncRef.current.contains(e.target as Node)) {
        setShowSyncDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkNotifRead = (id: string) => {
    if (id.startsWith('auto-pnd-')) {
      setDismissedAutoNotifIds((prev) => new Set([...prev, id]));
    }
    // Update status dibaca = true, JANGAN HAPUS NOTIFIKASI AGAR SELALU BISA DIPANTAU
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      notifikasi: (prev.notifikasi || []).map((n) =>
        n.id === id ? { ...n, dibaca: true } : n
      ),
    }));
  };

  const handleClearAllUserNotifikasi = () => {
    const autoIds = userNotifikasi.filter((n) => n.id.startsWith('auto-pnd-')).map((n) => n.id);
    if (autoIds.length > 0) {
      setDismissedAutoNotifIds((prev) => new Set([...prev, ...autoIds]));
    }
    // Tandai semua notifikasi user ini sebagai sudah dibaca (dibaca: true), JANGAN HAPUS NOTIFIKASI
    const userNotifIds = new Set(userNotifikasi.map((n) => n.id));
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      notifikasi: (prev.notifikasi || []).map((n) =>
        userNotifIds.has(n.id) ? { ...n, dibaca: true } : n
      ),
    }));
  };

  const handleNotificationClick = (item: any) => {
    // Tandai sudah dibaca, tapi tetap simpan di daftar notifikasi
    handleMarkNotifRead(item.id);
    // Jika ada targetMenu, tandai juga menu di sidebar sebagai sudah dibaca
    if (item.targetMenu && currentUser.role === 'MURID' && currentUser.id) {
      markSidebarMenuAsReadForUser(currentUser.id, item.targetMenu);
    }
    setShowNotifMenu(false);
    if (!onSelectMenuItem) return;

    const isMurid = currentUser.role === 'MURID';
    const isGuru = currentUser.role === 'GURU';
    const isAdmin = currentUser.role === 'ADMIN';
    const tipe = (item.tipe || '').toLowerCase().trim();
    const judul = (item.judul || '').toLowerCase();
    const pesan = (item.pesan || '').toLowerCase();
    const targetId = item.targetId;

    // 1. Explicit Tipe Routing
    if (tipe === 'pengumuman' || tipe === 'informasi') {
      if (targetId && currentUser.role === 'MURID') {
        dataStorage.updateDatabase((prev) => ({
          ...prev,
          pengumuman: (prev.pengumuman || []).map((p) => {
            if (p.id === targetId && !p.dibacaOleh?.includes(currentUser.id)) {
              return { ...p, dibacaOleh: [...(p.dibacaOleh || []), currentUser.id] };
            }
            return p;
          }),
        }));
      }
      onSelectMenuItem('pengumuman', targetId);
      return;
    }

    if (tipe === 'tugas') {
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    if (tipe === 'quiz' || tipe === 'kuis' || tipe === 'asesmen') {
      onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
      return;
    }

    if (tipe === 'materi' || tipe === 'modul') {
      onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
      return;
    }

    if (tipe === 'presensi' || tipe === 'kehadiran' || tipe === 'absensi') {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'presensi', targetId);
      return;
    }

    if (tipe === 'izin' || tipe === 'surat-izin' || tipe === 'pengajuan-izin') {
      onSelectMenuItem(isMurid ? 'presensi-saya' : (isGuru || isAdmin ? 'surat-izin' : 'presensi'), targetId);
      return;
    }

    if (tipe === 'nilai' || tipe === 'rapor') {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'nilai', targetId);
      return;
    }

    if (tipe === 'sikap' || tipe === 'penilaian-sikap') {
      onSelectMenuItem(isMurid ? 'sikap-saya' : 'penilaian-sikap', targetId);
      return;
    }

    if (tipe === 'penilaian-teman' || tipe === 'teman-sejawat') {
      onSelectMenuItem(isMurid ? 'penilaian-teman-saya' : 'penilaian-teman', targetId);
      return;
    }

    if (tipe === 'refleksi') {
      onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
      return;
    }

    if (tipe === 'praktik' || tipe === 'penilaian-praktik') {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'praktik', targetId);
      return;
    }

    if (tipe === 'pendampingan' || tipe === 'pendampingan-murid' || tipe === 'bimbingan') {
      onSelectMenuItem(isMurid ? 'pendampingan-murid-saya' : 'pendampingan-murid', targetId);
      return;
    }

    if (tipe === 'deadline') {
      if (targetId && db.quiz?.some((q) => q.id === targetId)) {
        onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
        return;
      }
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    // 2. Target ID entity matching
    if (targetId) {
      if (db.pengumuman?.some((p) => p.id === targetId)) {
        onSelectMenuItem('pengumuman', targetId);
        return;
      }
      if (db.tugas?.some((t) => t.id === targetId)) {
        onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
        return;
      }
      if (db.quiz?.some((q) => q.id === targetId)) {
        onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
        return;
      }
      if (db.materi?.some((m) => m.id === targetId)) {
        onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
        return;
      }
      if (db.refleksi?.some((r) => r.id === targetId)) {
        onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
        return;
      }
    }

    // 3. Keyword heuristic on Judul & Pesan
    if (judul.includes('pengumuman') || pesan.includes('pengumuman') || judul.includes('informasi')) {
      onSelectMenuItem('pengumuman', targetId);
      return;
    }

    if (judul.includes('tugas') || pesan.includes('tugas')) {
      onSelectMenuItem(isMurid ? 'tugas-saya' : 'tugas', targetId);
      return;
    }

    if (judul.includes('quiz') || judul.includes('kuis') || pesan.includes('quiz') || pesan.includes('kuis')) {
      onSelectMenuItem(isMurid ? 'quiz-saya' : 'quiz', targetId);
      return;
    }

    if (judul.includes('materi') || pesan.includes('materi') || judul.includes('modul')) {
      onSelectMenuItem(isMurid ? 'materi-saya' : 'materi', targetId);
      return;
    }

    if (judul.includes('absen') || judul.includes('presensi') || judul.includes('kehadiran') || pesan.includes('presensi')) {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'presensi', targetId);
      return;
    }

    if (judul.includes('izin') || pesan.includes('izin')) {
      onSelectMenuItem(isMurid ? 'presensi-saya' : 'surat-izin', targetId);
      return;
    }

    if (judul.includes('nilai') || pesan.includes('nilai') || judul.includes('rapor')) {
      onSelectMenuItem(isMurid ? 'nilai-saya' : 'nilai', targetId);
      return;
    }

    if (judul.includes('sikap') || pesan.includes('sikap')) {
      onSelectMenuItem(isMurid ? 'sikap-saya' : 'penilaian-sikap', targetId);
      return;
    }

    if (judul.includes('teman') || pesan.includes('teman sejawat')) {
      onSelectMenuItem(isMurid ? 'penilaian-teman-saya' : 'penilaian-teman', targetId);
      return;
    }

    if (judul.includes('refleksi') || pesan.includes('refleksi')) {
      onSelectMenuItem(isMurid ? 'refleksi-saya' : 'refleksi', targetId);
      return;
    }

    // Default Fallback
    onSelectMenuItem(isMurid ? 'pengumuman' : 'dashboard', targetId);
  };

  // Search filtering
  const query = searchQuery.trim().toLowerCase();
  const filteredMateri = query
    ? db.materi.filter(
        (m) =>
          m.judul.toLowerCase().includes(query) ||
          m.kategori.toLowerCase().includes(query) ||
          m.deskripsi.toLowerCase().includes(query)
      )
    : [];
  const filteredTugas = query
    ? db.tugas.filter((t) => t.judul.toLowerCase().includes(query) || t.instruksi.toLowerCase().includes(query))
    : [];
  const filteredQuiz = query ? db.quiz.filter((q) => q.judul.toLowerCase().includes(query)) : [];
  const filteredMurid = query
    ? db.users.filter(
        (u) =>
          u.role === 'MURID' &&
          (u.name.toLowerCase().includes(query) || (u.nis && u.nis.includes(query)))
      )
    : [];
  const filteredGuru = query
    ? db.users.filter((u) => u.role === 'GURU' && u.name.toLowerCase().includes(query))
    : [];

  const hasResults =
    filteredMateri.length > 0 ||
    filteredTugas.length > 0 ||
    filteredQuiz.length > 0 ||
    filteredMurid.length > 0 ||
    filteredGuru.length > 0;

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator Utama';
      case 'GURU':
        return 'Guru Pengampu PJOK';
      case 'MURID': {
        const dbData = dataStorage.getDatabase();
        const kName = currentUser.kelasId ? resolveKelasId(currentUser.kelasId, dbData.kelas || []).nama : '';
        return kName ? `Murid Kelas ${kName}` : 'Murid PJOK';
      }
      default:
        return 'Pengguna';
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'PJ';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.trim().slice(0, 2) || 'PJ').toUpperCase();
  };

  const renderSearchResultsContent = () => {
    if (!hasResults) {
      return (
        <div className="p-4 text-center text-slate-400">
          Tidak ditemukan hasil untuk "{searchQuery}"
        </div>
      );
    }
    return (
      <>
        {filteredMateri.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Materi Pembelajaran
            </div>
            {filteredMateri.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setShowSearchResults(false);
                  setIsMobileSearchOpen(false);
                  if (onSelectMenuItem) {
                    onSelectMenuItem(currentUser.role === 'MURID' ? 'materi-saya' : 'materi', m.id);
                  }
                }}
                className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
              >
                <span className="font-medium truncate">{m.judul}</span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                  {m.kategori}
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredTugas.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
              Tugas PJOK
            </div>
            {filteredTugas.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setShowSearchResults(false);
                  setIsMobileSearchOpen(false);
                  if (onSelectMenuItem) {
                    onSelectMenuItem(currentUser.role === 'MURID' ? 'tugas-saya' : 'tugas', t.id);
                  }
                }}
                className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
              >
                <span className="font-medium truncate">{t.judul}</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  Tugas
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredQuiz.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
              Quiz
            </div>
            {filteredQuiz.map((q) => (
              <div
                key={q.id}
                onClick={() => {
                  setShowSearchResults(false);
                  setIsMobileSearchOpen(false);
                  if (onSelectMenuItem) {
                    onSelectMenuItem(currentUser.role === 'MURID' ? 'quiz-saya' : 'quiz', q.id);
                  }
                }}
                className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
              >
                <span className="font-medium truncate">{q.judul}</span>
                <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                  Quiz
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredMurid.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-t border-gray-100 mt-1">
              Murid / Murid
            </div>
            {filteredMurid.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setShowSearchResults(false);
                  setIsMobileSearchOpen(false);
                  if (onSelectMenuItem) {
                    onSelectMenuItem(currentUser.role === 'ADMIN' ? 'users' : 'data-murid', s.id);
                  }
                }}
                className="px-3 py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-between text-slate-700 cursor-pointer"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-[10px] text-slate-400">NIS: {s.nis}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 z-30 relative">
      {/* Left: Mobile Toggle & Brand / Desktop Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
        <button
          onClick={handleSidebarClick}
          id="btn-sidebar-toggle"
          aria-label="Buka Menu Sidebar"
          className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-colors focus:outline-hidden shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Header Brand & Name */}
        <div className="lg:hidden flex items-center gap-2 min-w-0 mr-1 truncate">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white overflow-hidden shadow-xs shrink-0">
            {db.settings?.logoSekolah ? (
              <img src={db.settings.logoSekolah} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-black text-xs">PJ</span>
            )}
          </div>
          <div className="leading-tight min-w-0 truncate">
            <span className="font-black text-[11px] text-slate-800 block leading-none truncate">NET PJOK</span>
            <span className="text-[10px] text-emerald-600 font-bold block truncate leading-none mt-0.5" title={currentUser.name}>
              {currentUser.name}
            </span>
          </div>
        </div>

        {/* Desktop Global Search Bar */}
        <div ref={searchRef} className="hidden sm:block relative w-48 sm:w-64 md:w-80 lg:w-96">
          <div className="flex items-center bg-gray-100 rounded-full px-3.5 py-1.5 w-full border border-gray-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              id="input-global-search"
              placeholder="Cari guru, murid, materi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="bg-transparent border-none text-xs sm:text-sm focus:outline-none w-full text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Search Dropdown Results Desktop */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 z-50 max-h-80 overflow-y-auto space-y-2 text-xs">
              {renderSearchResultsContent()}
            </div>
          )}
        </div>
      </div>

      {/* Center: Version Pill Badge - Visible across every menu */}
      <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 border border-slate-200/90 rounded-full text-[11px] font-extrabold text-blue-950 tracking-wider shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>{APP_VERSION_LABEL}</span>
      </div>

      {/* Right: Actions, Notifications, & User Info */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
        {/* Mobile Search Toggle Button (Screen < sm) */}
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(!isMobileSearchOpen);
            setShowSearchResults(!isMobileSearchOpen);
          }}
          className="sm:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg shrink-0 cursor-pointer"
          title="Cari"
          aria-label="Cari"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Firestore Real-Time Sync Indicator */}
        <div ref={syncRef} className="relative shrink-0">
          <button
            onClick={() => setShowSyncDetails(!showSyncDetails)}
            id="btn-firestore-sync-status"
            className={`flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs focus:outline-hidden shrink-0 cursor-pointer ${
              syncStatus === 'synced'
                ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800'
                : syncStatus === 'syncing' || isManualSyncing
                ? 'border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800'
                : syncStatus === 'connecting'
                ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800'
                : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900'
            }`}
            title="Status Cloud Firestore Real-Time"
          >
            {syncStatus === 'synced' ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden md:inline font-bold text-[11px]">Firestore Real-Time</span>
              </>
            ) : syncStatus === 'syncing' || isManualSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                <span className="hidden md:inline font-semibold text-[11px]">Sinkronisasi...</span>
              </>
            ) : syncStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                <span className="hidden md:inline font-semibold text-[11px]">Menghubungkan...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden md:inline font-bold text-[11px]">Standby / Offline</span>
              </>
            )}
          </button>

          {/* Sync Details Popover - Mobile Modal (Centered & Backdrop) / Desktop Dropdown */}
          {showSyncDetails && (
            <>
              {/* Backdrop pada layar HP agar tidak menumpuk di atas konten dan mudah ditutup */}
              <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-150"
                onClick={() => setShowSyncDetails(false)}
                aria-hidden="true"
              />

              <div className="fixed inset-x-3 top-20 max-w-sm mx-auto sm:max-w-none sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-84 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 p-4 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-100 text-emerald-700'
                        : syncStatus === 'syncing' || isManualSyncing
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {syncStatus === 'synced' ? (
                        <Cloud className="w-5 h-5" />
                      ) : syncStatus === 'syncing' || isManualSyncing ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <CloudOff className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">Cloud Firestore</h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        Terakhir sinkron:{' '}
                        <span className="font-bold text-slate-700">
                          {lastSyncTime
                            ? lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Baru saja'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase shrink-0 ${
                        syncStatus === 'synced'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : syncStatus === 'syncing' || isManualSyncing
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : syncStatus === 'connecting'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {syncStatus === 'synced'
                        ? '🟢 Real-Time'
                        : syncStatus === 'syncing' || isManualSyncing
                        ? '🔄 Menyinkron'
                        : syncStatus === 'connecting'
                        ? '🟡 Menghubungkan'
                        : '🟠 Standby'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSyncDetails(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Tutup dialog"
                      aria-label="Tutup dialog status"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Feedback Notifikasi */}
                {syncFeedbackMsg && (
                  <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{syncFeedbackMsg}</span>
                  </div>
                )}

                {/* Dua Tombol Utama Sesuai Permintaan: Unggah ke Cloud & Tarik Data Terbaru */}
                <div className="space-y-2">
                  <button
                    type="button"
                    id="btn-upload-to-cloud"
                    onClick={async () => {
                      setIsManualSyncing(true);
                      setSyncFeedbackMsg(null);
                      try {
                        await dataStorage.seedAllToFirestore();
                        setSyncFeedbackMsg('Data berhasil diunggah ke Cloud Firestore');
                        setTimeout(() => setSyncFeedbackMsg(null), 3500);
                      } catch (e: any) {
                        setSyncFeedbackMsg('Gagal mengunggah data');
                        setTimeout(() => setSyncFeedbackMsg(null), 3500);
                      } finally {
                        setIsManualSyncing(false);
                      }
                    }}
                    disabled={isManualSyncing}
                    className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer"
                  >
                    <UploadCloud className={`w-4 h-4 ${isManualSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isManualSyncing ? 'Sedang Memproses...' : 'Unggah ke Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-pull-latest-data"
                    onClick={async () => {
                      setIsManualSyncing(true);
                      setSyncFeedbackMsg(null);
                      try {
                        await dataStorage.forceRefreshFromFirestore();
                        setSyncFeedbackMsg('Data terbaru berhasil ditarik dari Cloud');
                        setTimeout(() => setSyncFeedbackMsg(null), 3500);
                      } catch (e: any) {
                        setSyncFeedbackMsg('Gagal menarik data terbaru');
                        setTimeout(() => setSyncFeedbackMsg(null), 3500);
                      } finally {
                        setIsManualSyncing(false);
                      }
                    }}
                    disabled={isManualSyncing}
                    className="w-full py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs border border-slate-200 cursor-pointer"
                  >
                    <DownloadCloud className={`w-4 h-4 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    <span>{isManualSyncing ? 'Sedang Menarik Data...' : 'Tarik Data Terbaru'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* PWA Install Button */}
        <PWAInstallButton variant="compact" />

        {/* Notification Bell */}
        <div ref={notifRef} className="relative shrink-0">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            id="btn-notifications"
            className="relative text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer shrink-0"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {urgentDeadlines.length > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[10px] items-center justify-center font-black">
                  {urgentDeadlines.length}
                </span>
              </span>
            ) : unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifMenu && (
            <>
              {/* Backdrop pada layar HP */}
              <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-150"
                onClick={() => setShowNotifMenu(false)}
                aria-hidden="true"
              />

              <div className="fixed inset-x-3 top-20 max-w-sm mx-auto sm:max-w-none sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-slate-50/70">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">Notifikasi</span>
                    {urgentDeadlines.length > 0 && (
                      <span className="text-[10px] text-rose-700 font-black bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {urgentDeadlines.length} Urgent
                      </span>
                    )}
                    {studentPendampingan.needsFollowUp && (
                      <span className="text-[10px] text-amber-700 font-black bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-amber-600" /> Pendampingan
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {userNotifikasi.some((n) => !n.dibaca) && (
                      <button
                        type="button"
                        onClick={handleClearAllUserNotifikasi}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                        title="Tandai semua notifikasi sudah dibaca"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                      {unreadCount} Baru
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifMenu(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Tutup notifikasi"
                      aria-label="Tutup notifikasi"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs Switcher for Student */}
                {currentUser.role === 'MURID' && (
                  <div className="flex border-b border-gray-100 bg-slate-50/60 p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setNotifTab('semua')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        notifTab === 'semua'
                          ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>Semua</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-black">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifTab('guru')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        notifTab === 'guru'
                          ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>Dari Guru PJOK</span>
                      {teacherUpdates.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[9px] font-black">
                          {teacherUpdates.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {notifTab === 'semua' ? (
                  <>
                    {/* Peringatan 1x, 2x, 3x Alpa: Tetap ada di fitur notifikasi agar murid selalu ingat */}
                    {studentPendampingan.alpaCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (currentUser.id) {
                            markSidebarMenuAsReadForUser(currentUser.id, 'presensi-saya');
                          }
                          if (onSelectMenuItem) {
                            onSelectMenuItem('presensi-saya');
                          }
                        }}
                        className={`p-3 border-b cursor-pointer transition-all flex items-start gap-2.5 group ${
                          studentPendampingan.alpaCount >= 3
                            ? 'bg-rose-50/90 border-rose-200/90 hover:bg-rose-100/80'
                            : studentPendampingan.alpaCount === 2
                            ? 'bg-orange-50/90 border-orange-200/90 hover:bg-orange-100/80'
                            : 'bg-amber-50/90 border-amber-200/90 hover:bg-amber-100/80'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shadow-2xs shrink-0 mt-0.5 text-white ${
                            studentPendampingan.alpaCount >= 3
                              ? 'bg-rose-600 animate-pulse'
                              : studentPendampingan.alpaCount === 2
                              ? 'bg-orange-600'
                              : 'bg-amber-600'
                          }`}
                        >
                          <CalendarCheck className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                              ⚠️ Catatan Alpa ({studentPendampingan.alpaCount} Pertemuan)
                            </span>
                            <span
                              className={`px-2 py-0.5 text-white text-[9px] font-black rounded-full uppercase tracking-wider ${
                                studentPendampingan.alpaCount >= 3
                                  ? 'bg-rose-600'
                                  : studentPendampingan.alpaCount === 2
                                  ? 'bg-orange-600'
                                  : 'bg-amber-600'
                              }`}
                            >
                              Terus Dipantau
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                            Anda tercatat tidak hadir tanpa keterangan (Alpa) sebanyak{' '}
                            <strong>{studentPendampingan.alpaCount} kali</strong> pada:{' '}
                            <span className="font-semibold text-slate-900">
                              {studentPendampingan.alpaDates.join(', ')}
                            </span>
                            .
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 text-[10px] font-bold text-blue-700">
                            <span>Buka Riwayat Kehadiran Presensi</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">
                              Lihat & Tandai Dibaca →
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pengingat Otomatis Status Pendampingan Murid */}
                    {studentPendampingan.needsFollowUp && (
                      <div
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (onSelectMenuItem) {
                            onSelectMenuItem('pendampingan-murid-saya');
                          }
                        }}
                        className="p-3 bg-gradient-to-br from-amber-50 via-rose-50/80 to-orange-50 border-b border-amber-200/90 cursor-pointer hover:bg-amber-100/60 transition-all flex items-start gap-2.5 group"
                      >
                        <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0 animate-pulse mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-extrabold text-amber-950 text-xs">
                              Pengingat Status Pendampingan
                            </span>
                            <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-2xs">
                              {studentPendampingan.statusLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                            {studentPendampingan.latestRecord?.deskripsiMasalah
                              ? `Bimbingan PJOK: "${studentPendampingan.latestRecord.deskripsiMasalah}"`
                              : `Status pendampingan Anda masih dalam proses atau butuh tindak lanjut oleh Guru PJOK.`}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-amber-200/60 text-[10px] text-rose-700 font-bold">
                            <span>Buka Formulir Pendampingan & Konsultasi</span>
                            <span className="group-hover:translate-x-0.5 transition-transform">Buka Form →</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Urgent Deadline Warnings (< 24 Jam) Section */}
                    {urgentDeadlines.length > 0 && (
                      <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-2.5 border-b border-rose-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[11px] text-rose-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            Tenggat Kritis (&lt; 24 Jam)
                          </span>
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-full">
                            Peringatan Aktif
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {urgentDeadlines.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setShowNotifMenu(false);
                                if (onSelectMenuItem) {
                                  onSelectMenuItem(item.tipe === 'tugas' ? 'tugas-saya' : 'quiz-saya', item.targetId);
                                }
                              }}
                              className="p-2 bg-white/95 hover:bg-white border border-rose-200 rounded-xl cursor-pointer transition shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-black uppercase">
                                    {item.tipe}
                                  </span>
                                  <p className="font-bold text-slate-900 text-[11px] truncate">
                                    {item.judul}
                                  </p>
                                </div>
                                <p className="text-[10px] text-rose-600 font-black flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-rose-500" /> Sisa {item.timeRemainingFormatted}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black shrink-0 transition cursor-pointer"
                              >
                                Kerjakan
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Notifications List */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                      {userNotifikasi && userNotifikasi.length > 0 ? (
                        userNotifikasi.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-2.5 ${
                              !item.dibaca ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'bg-white opacity-85 hover:opacity-100'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {item.isUrgentDeadline ? (
                                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'pengumuman' ? (
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                  <Megaphone className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'tugas' ? (
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                  <ClipboardList className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'quiz' || item.tipe === 'kuis' ? (
                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'materi' ? (
                                <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'presensi' || item.tipe === 'izin' ? (
                                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                </div>
                              ) : item.tipe === 'pendampingan' ? (
                                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                  <UserCheck className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <Award className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p
                                    className={`text-[11px] truncate ${
                                      !item.dibaca ? 'font-black text-slate-900' : 'font-semibold text-slate-700'
                                    }`}
                                  >
                                    {item.judul}
                                  </p>
                                  {!item.dibaca ? (
                                    <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[8px] font-black rounded-full shrink-0">
                                      Baru
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 text-[8px] font-medium rounded-full shrink-0">
                                      ✓ Dibaca
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0 ml-1">{item.waktu}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.pesan}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 space-y-1.5">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">Semua Notifikasi Sudah Dibaca</p>
                          <p className="text-[11px] text-slate-400">Tidak ada notifikasi yang belum dibaca saat ini.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Tab: Informasi & Tanggapan Terbaru dari Guru */
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {teacherUpdates.length === 0 ? (
                      <div className="p-5 text-center text-slate-400">
                        Belum ada arahan atau tanggapan baru dari Guru PJOK.
                      </div>
                    ) : (
                      teacherUpdates.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (t.notifId) {
                              handleMarkNotifRead(t.notifId);
                            }
                            setShowNotifMenu(false);
                            if (onSelectMenuItem) {
                              onSelectMenuItem(t.targetMenu, t.targetId);
                            }
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex gap-2.5 group"
                        >
                          <div className="mt-0.5 shrink-0">
                            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {t.tipe === 'pendampingan' ? (
                                <UserCheck className="w-4 h-4 text-rose-600" />
                              ) : t.tipe === 'tugas' ? (
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                              ) : t.tipe === 'pengumuman' ? (
                                <Megaphone className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${t.badgeColor}`}>
                                {t.badgeLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{t.tanggal}</span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                              {t.judul}
                            </h4>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {t.ringkasan}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[10px]">
                              <span className="text-slate-400 font-medium">Oleh: <strong className="text-slate-700">{t.authorNama}</strong></span>
                              <span className="font-bold text-blue-600 hover:underline">
                                Buka Detail →
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      {/* User Profile Widget - Professional Polish Style */}
      <div ref={profileRef} className="relative shrink-0">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          id="btn-user-profile-menu"
          className="flex items-center space-x-2 sm:space-x-3 border-l pl-2 sm:pl-4 border-gray-200 focus:outline-hidden text-left cursor-pointer shrink-0"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold leading-none text-slate-900 truncate max-w-[140px]">
              {currentUser.name}
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {getRoleLabel(currentUser.role)}
            </p>
          </div>
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 border-2 border-white shadow-2xs flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(currentUser.name)}</span>
              )}
            </div>
            {currentUser.role === 'MURID' && studentPendampingan.needsFollowUp && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] items-center justify-center font-black">
                  !
                </span>
              </span>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
        </button>

        {showProfileMenu && (
          <>
            {/* Backdrop pada layar HP agar tidak menumpuk di atas konten */}
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-150"
              onClick={() => setShowProfileMenu(false)}
              aria-hidden="true"
            />

            <div className="fixed inset-x-3 top-20 max-w-xs mx-auto sm:max-w-none sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 p-2 text-xs divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</p>
                  <p className="text-slate-500 text-[11px] truncate">{currentUser.email || currentUser.username}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {currentUser.role}
                    </span>
                    {currentUser.role === 'MURID' && studentPendampingan.needsFollowUp && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-black">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                        {studentPendampingan.statusLabel}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  className="sm:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
                  title="Tutup menu profil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pengingat Otomatis Status Pendampingan Murid */}
              {currentUser.role === 'MURID' && studentPendampingan.needsFollowUp && (
                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onSelectMenuItem) {
                      onSelectMenuItem('pendampingan-murid-saya');
                    }
                  }}
                  className="m-1.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100/80 transition-colors space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                      Status Pendampingan
                    </span>
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full">
                      {studentPendampingan.statusLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-800 leading-tight">
                    Catatan pendampingan Anda masih dalam proses atau butuh tindak lanjut oleh Guru PJOK.
                  </p>
                  <p className="text-[10px] font-bold text-rose-700 group-hover:underline pt-0.5 flex items-center gap-0.5">
                    <span>Buka Form Pendampingan</span> →
                  </p>
                </div>
              )}

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onOpenProfileModal) {
                      onOpenProfileModal();
                    } else if (onSelectMenuItem) {
                      onSelectMenuItem('profil-saya');
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-slate-800 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center gap-2 font-semibold transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <span>Profil & Foto Saya</span>
                </button>
              </div>

              <div className="pt-1 space-y-0.5">
                {onOpenLoginModal && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenLoginModal();
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Masuk Akun Lain / Dialog Login</span>
                  </button>
                )}

                {(onLogout || onOpenLoginModal) && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else if (onOpenLoginModal) {
                        onOpenLoginModal();
                      }
                    }}
                    id="btn-navbar-logout"
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Sistem</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  );
};
