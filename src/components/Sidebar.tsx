import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  BookOpen,
  FolderKanban,
  FileCheck2,
  CalendarCheck,
  Settings,
  GraduationCap,
  ClipboardList,
  CheckCircle,
  Activity,
  FileText,
  UserCheck,
  BookMarked,
  Award,
  Calendar,
  User,
  LogOut,
  Zap,
  X,
  Sparkles,
  Camera,
  Megaphone,
  ShieldAlert,
  Flame,
  HeartHandshake,
  Users2,
  Shield,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { UserRole, User as UserType, resolveKelasId, APP_VERSION_LABEL } from '../types';
import { dataStorage } from '../services/dataStorage';
import { calculateStudentFeatureBadges, markSidebarMenuAsReadForUser } from '../utils/studentNotificationHelper';

interface SidebarProps {
  role: UserRole;
  currentUser?: UserType;
  appLogo?: string;
  activeMenu: string;
  onSelectMenu: (menuId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

interface MenuSection {
  title: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  currentUser,
  appLogo,
  activeMenu,
  onSelectMenu,
  isOpen = false,
  onClose,
  onLogout,
}) => {
  const adminLogoInputRef = useRef<HTMLInputElement>(null);

  const handleDirectLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih berkas gambar yang valid (PNG, JPG, SVG, atau WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          dataStorage.updateDatabase((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              logoSekolah: dataUrl,
            },
          }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getAdminSections = (): MenuSection[] => {
    const pendingIzinCount = (dataStorage.getDatabase().pengajuanIzin || []).filter(
      (i) => i.status === 'Menunggu'
    ).length;

    return [
      {
        title: 'UTAMA',
        collapsible: false,
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'DATA PENGGUNA & PENGAJAR',
        collapsible: true,
        icon: <Users className="w-4 h-4 text-sky-400" />,
        items: [
          { id: 'data-murid', label: 'Data Murid', icon: <GraduationCap className="w-5 h-5 text-sky-400" /> },
          { id: 'data-guru', label: 'Data Guru', icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
          { id: 'users', label: 'Data Administrator', icon: <Shield className="w-5 h-5 text-purple-400" /> },
          { id: 'kelas', label: 'Kelas & Rombel', icon: <School className="w-5 h-5" /> },
          { id: 'mapel', label: 'Mata Pelajaran', icon: <BookOpen className="w-5 h-5" /> },
        ],
      },
      {
        title: 'PEMBELAJARAN',
        collapsible: true,
        icon: <BookOpen className="w-4 h-4 text-blue-400" />,
        items: [
          { id: 'materi', label: 'Konten Materi', icon: <BookMarked className="w-5 h-5" /> },
          { id: 'tugas', label: 'Tugas', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'quiz', label: 'Quiz & Asesmen', icon: <CheckCircle className="w-5 h-5" /> },
          { id: 'pendampingan-murid', label: 'Form Pendampingan Murid', icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
          { id: 'refleksi', label: 'Refleksi Pembelajaran', icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'PENILAIAN',
        collapsible: true,
        icon: <Flame className="w-4 h-4 text-amber-400" />,
        items: [
          { id: 'penilaian-harian', label: 'Penilaian Harian', icon: <Flame className="w-5 h-5 text-sky-400" /> },
          { id: 'penilaian-sikap', label: 'Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-emerald-400" /> },
          { id: 'penilaian-teman', label: 'Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'praktik', label: 'Penilaian Praktek', icon: <Activity className="w-5 h-5" /> },
        ],
      },
      {
        title: 'JURNAL & PRESENSI',
        collapsible: true,
        icon: <CalendarCheck className="w-4 h-4 text-emerald-400" />,
        items: [
          { id: 'jurnal', label: 'Jurnal Mengajar', icon: <FileText className="w-5 h-5" /> },
          { id: 'presensi', label: 'Presensi Murid', icon: <CalendarCheck className="w-5 h-5" /> },
          {
            id: 'surat-izin',
            label: 'Surat Izin Murid',
            icon: <FileText className="w-5 h-5 text-amber-400" />,
            badge: pendingIzinCount > 0 ? pendingIzinCount : undefined,
          },
        ],
      },
      {
        title: 'REKAPAN',
        collapsible: true,
        icon: <Award className="w-4 h-4 text-purple-400" />,
        items: [
          { id: 'rekap-praktik', label: 'Rekapan Penilaian Praktek', icon: <Activity className="w-5 h-5 text-orange-400" /> },
          { id: 'rekap-quiz', label: 'Rekapan Hasil Quis Murid', icon: <Award className="w-5 h-5 text-purple-400" /> },
          { id: 'rekap-jurnal', label: 'Rekapan Jurnal', icon: <ClipboardList className="w-5 h-5 text-teal-400" /> },
          { id: 'rekap-absensi', label: 'Rekapan Presensi', icon: <CalendarCheck className="w-5 h-5 text-emerald-400" /> },
          { id: 'rekap-pendampingan', label: 'Rekapan Pendampingan', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'rekap-penilaian-teman', label: 'Rekapan Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'rekap-penilaian-sikap', label: 'Rekapan Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'nilai', label: 'Penilaian & Rapor', icon: <Award className="w-5 h-5" /> },
        ],
      },
      {
        title: 'LAPORAN',
        collapsible: true,
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
        items: [
          { id: 'laporan-pelaksanaan', label: 'Laporan Pelaksanaan Pembelajaran', icon: <FileSpreadsheet className="w-5 h-5 text-teal-400" /> },
        ],
      },
      {
        title: 'PENGATURAN',
        collapsible: true,
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        items: [
          { id: 'log-aktivitas', label: 'Log & Diagnosa Akses', icon: <ShieldAlert className="w-5 h-5 text-indigo-400" /> },
          { id: 'profil-saya', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
          { id: 'settings', label: 'Pengaturan Sistem', icon: <Settings className="w-5 h-5" /> },
        ],
      },
    ];
  };

  const getGuruSections = (): MenuSection[] => {
    return [
      {
        title: 'UTAMA',
        collapsible: false,
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'PEMBELAJARAN',
        collapsible: true,
        icon: <BookOpen className="w-4 h-4 text-blue-400" />,
        items: [
          { id: 'data-murid', label: 'Data Murid', icon: <GraduationCap className="w-5 h-5" /> },
          { id: 'materi', label: 'Materi Pembelajaran', icon: <BookMarked className="w-5 h-5" /> },
          { id: 'tugas', label: 'Tugas', icon: <ClipboardList className="w-5 h-5" /> },
          { id: 'quiz', label: 'Quiz & Asesmen', icon: <CheckCircle className="w-5 h-5" /> },
          { id: 'pendampingan-murid', label: 'Form Pendampingan Murid', icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
          { id: 'refleksi', label: 'Refleksi Pembelajaran', icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
        ],
      },
      {
        title: 'PENILAIAN',
        collapsible: true,
        icon: <Flame className="w-4 h-4 text-amber-400" />,
        items: [
          { id: 'penilaian-harian', label: 'Penilaian Harian', icon: <Flame className="w-5 h-5 text-sky-400" /> },
          { id: 'penilaian-sikap', label: 'Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-emerald-400" /> },
          { id: 'penilaian-teman', label: 'Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'praktik', label: 'Penilaian Praktek', icon: <Activity className="w-5 h-5" /> },
        ],
      },
      {
        title: 'JURNAL & PRESENSI',
        collapsible: true,
        icon: <CalendarCheck className="w-4 h-4 text-emerald-400" />,
        items: [
          { id: 'jurnal', label: 'Jurnal Mengajar', icon: <FileText className="w-5 h-5" /> },
          { id: 'presensi', label: 'Presensi Murid', icon: <CalendarCheck className="w-5 h-5" /> },
          {
            id: 'surat-izin',
            label: 'Surat Izin Murid',
            icon: <FileText className="w-5 h-5 text-amber-400" />,
          },
        ],
      },
      {
        title: 'REKAPAN',
        collapsible: true,
        icon: <Award className="w-4 h-4 text-purple-400" />,
        items: [
          { id: 'rekap-praktik', label: 'Rekapan Penilaian Praktek', icon: <Activity className="w-5 h-5 text-orange-400" /> },
          { id: 'rekap-quiz', label: 'Rekapan Hasil Quis Murid', icon: <Award className="w-5 h-5 text-purple-400" /> },
          { id: 'rekap-jurnal', label: 'Rekapan Jurnal', icon: <ClipboardList className="w-5 h-5 text-teal-400" /> },
          { id: 'rekap-absensi', label: 'Rekapan Presensi', icon: <CalendarCheck className="w-5 h-5 text-emerald-400" /> },
          { id: 'rekap-pendampingan', label: 'Rekapan Pendampingan', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'rekap-penilaian-teman', label: 'Rekapan Penilaian Teman Sejawat', icon: <Users2 className="w-5 h-5 text-indigo-400" /> },
          { id: 'rekap-penilaian-sikap', label: 'Rekapan Penilaian Sikap', icon: <HeartHandshake className="w-5 h-5 text-pink-400" /> },
          { id: 'nilai', label: 'Rekapan Nilai', icon: <Award className="w-5 h-5" /> },
        ],
      },
      {
        title: 'LAPORAN',
        collapsible: true,
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
        items: [
          { id: 'laporan-pelaksanaan', label: 'Laporan Pelaksanaan Pembelajaran', icon: <FileSpreadsheet className="w-5 h-5 text-teal-400" /> },
        ],
      },
      {
        title: 'PENGATURAN',
        collapsible: true,
        icon: <Settings className="w-4 h-4 text-slate-400" />,
        items: [
          { id: 'profil-saya', label: 'Profil Saya', icon: <User className="w-5 h-5" /> },
          { id: 'settings', label: 'Pengaturan & Reset Data', icon: <Settings className="w-5 h-5" /> },
        ],
      },
    ];
  };

  // State pemicu update badge sidebar secara reaktif saat status baca berubah
  const [badgeVersion, setBadgeVersion] = useState(0);
  useEffect(() => {
    const handleBadgeChange = () => setBadgeVersion((v) => v + 1);
    window.addEventListener('lms_sidebar_badge_change', handleBadgeChange);
    return () => window.removeEventListener('lms_sidebar_badge_change', handleBadgeChange);
  }, []);

  // Ketika murid sedang membuka menu aktif, langsung tandai menu tersebut sudah dibaca di sidebar
  // "PADA SIDEBAR SETELAH DI BACA HILANGKAN ANGKA ATAU TANDA MERAH ITU"
  useEffect(() => {
    if (role === 'MURID' && currentUser?.id && activeMenu) {
      markSidebarMenuAsReadForUser(currentUser.id, activeMenu);
    }
  }, [role, currentUser?.id, activeMenu]);

  const studentBadges = useMemo(() => {
    if (role !== 'MURID' || !currentUser) return null;
    const dbData = dataStorage.getDatabase();
    return calculateStudentFeatureBadges(dbData, currentUser);
  }, [role, currentUser, badgeVersion]);

  const getMuridSections = (): MenuSection[] => {
    const b = studentBadges;
    return [
      {
        title: 'Utama',
        collapsible: false,
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
          },
          {
            id: 'pengumuman',
            label: 'Pengumuman',
            icon: <Megaphone className="w-5 h-5 text-amber-400" />,
            badge: b && b.pengumuman > 0 ? b.pengumuman : undefined,
          },
        ],
      },
      {
        title: 'Aktivitas Belajar',
        collapsible: true,
        icon: <BookOpen className="w-4 h-4 text-blue-400" />,
        items: [
          {
            id: 'materi-saya',
            label: 'Materi Pembelajaran',
            icon: <BookMarked className="w-5 h-5" />,
            badge: b && b.materi > 0 ? b.materi : undefined,
          },
          {
            id: 'tugas-saya',
            label: 'Tugas Saya',
            icon: <ClipboardList className="w-5 h-5" />,
            badge: b && b.tugas > 0 ? b.tugas : undefined,
          },
          {
            id: 'quiz-saya',
            label: 'Quiz & Asesmen',
            icon: <CheckCircle className="w-5 h-5" />,
            badge: b && b.quiz > 0 ? b.quiz : undefined,
          },
          {
            id: 'penilaian-teman-saya',
            label: 'Penilaian Teman Sejawat',
            icon: <Users2 className="w-5 h-5 text-indigo-400" />,
            badge: b && b.penilaianTeman > 0 ? b.penilaianTeman : undefined,
          },
          {
            id: 'pendampingan-murid-saya',
            label: 'Form Pendampingan Murid',
            icon: <UserCheck className="w-5 h-5 text-emerald-400" />,
            badge: b && b.pendampingan > 0 ? b.pendampingan : undefined,
          },
          {
            id: 'refleksi-saya',
            label: 'Refleksi Belajar',
            icon: <Sparkles className="w-5 h-5 text-amber-400" />,
            badge: b && b.refleksi > 0 ? b.refleksi : undefined,
          },
        ],
      },
      {
        title: 'Akademik & Profil',
        collapsible: true,
        icon: <Award className="w-4 h-4 text-purple-400" />,
        items: [
          {
            id: 'nilai-saya',
            label: 'Transkrip Nilai',
            icon: <Award className="w-5 h-5" />,
            badge: b && b.nilai > 0 ? b.nilai : undefined,
          },
          {
            id: 'sikap-saya',
            label: 'Penilaian Sikap',
            icon: <HeartHandshake className="w-5 h-5 text-emerald-500" />,
            badge: b && b.sikap > 0 ? b.sikap : undefined,
          },
          {
            id: 'presensi-saya',
            label: 'Riwayat Kehadiran',
            icon: <Calendar className="w-5 h-5" />,
            badge: b && b.presensi > 0 ? `${b.presensi} ALPA` : undefined,
          },
          {
            id: 'profil-saya',
            label: 'Profil Saya',
            icon: <User className="w-5 h-5" />,
            badge: b && b.profil > 0 ? '!' : undefined,
          },
        ],
      },
    ];
  };

  const kelasName = useMemo(() => {
    if (!currentUser?.kelasId) return '';
    const dbData = dataStorage.getDatabase();
    return resolveKelasId(currentUser.kelasId, dbData.kelas || []).nama;
  }, [currentUser?.kelasId]);

  const sections = useMemo(() => {
    return role === 'ADMIN' ? getAdminSections() : role === 'GURU' ? getGuruSections() : getMuridSections();
  }, [role, currentUser, studentBadges]);

  // Temukan section yang memuat activeMenu saat ini
  const currentActiveSectionTitle = useMemo(() => {
    const match = sections.find((s) => s.collapsible && s.items.some((i) => i.id === activeMenu));
    return match?.title || null;
  }, [sections, activeMenu]);

  // State untuk melacak section mana yang sedang terbuka (hanya 1 section terbuka sekaligus)
  const [expandedSection, setExpandedSection] = useState<string | null>(() => {
    return currentActiveSectionTitle;
  });

  // Saat activeMenu berubah ke section lain, otomatis buka section tersebut
  useEffect(() => {
    if (currentActiveSectionTitle) {
      setExpandedSection(currentActiveSectionTitle);
    }
  }, [currentActiveSectionTitle]);

  const handleToggleSection = (title: string) => {
    setExpandedSection((prev) => (prev === title ? null : title));
  };

  // Notifikasi badge pada sidebar ditampilkan untuk Admin dan Murid (akan hilang setelah dibaca)
  const showSidebarBadges = role === 'ADMIN' || role === 'MURID';

  const sidebarContent = (
    <div className="h-full flex flex-col bg-slate-900 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="min-h-20 py-3.5 flex items-center justify-between px-4 bg-slate-950 shrink-0 border-b border-slate-800/80">
        <div className="flex items-center min-w-0 flex-1 gap-3">
          {/* Logo container with quick change for Admin */}
          <div className="relative group/logo shrink-0">
            <div
              onClick={() => {
                if (role === 'ADMIN') {
                  adminLogoInputRef.current?.click();
                }
              }}
              className={`w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-white/10 ${
                role === 'ADMIN' ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' : ''
              }`}
              title={role === 'ADMIN' ? 'Klik untuk mengganti icon / logo aplikasi' : 'Logo NET PJOK'}
            >
              {appLogo ? (
                <img src={appLogo} alt="Logo NET PJOK" className="w-full h-full object-cover" />
              ) : (
                <Zap className="w-6 h-6 text-white fill-white" />
              )}
              {role === 'ADMIN' && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {role === 'ADMIN' && (
              <input
                ref={adminLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleDirectLogoUpload}
                className="hidden"
                id="sidebar-admin-logo-upload"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-white block leading-none">
                NET PJOK
              </span>
              <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded leading-none">
                SMANSAKA
              </span>
            </div>
            {/* Tampilkan nama lengkap di bawah logo tulisan NET PJOK nama guru/murid */}
            <div
              className="text-xs font-bold text-emerald-400 block truncate leading-snug mt-1"
              title={currentUser?.name}
            >
              {currentUser?.name || (role === 'ADMIN' ? 'Admin PJOK' : role === 'GURU' ? 'Guru PJOK' : 'Murid PJOK')}
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide block truncate">
              {role === 'ADMIN'
                ? 'SMA Negeri 1 Tejakula • Admin'
                : role === 'GURU'
                ? 'SMA Negeri 1 Tejakula • Guru'
                : kelasName
                ? `SMAN 1 Tejakula • Kelas ${kelasName}`
                : 'SMA Negeri 1 Tejakula • Murid'}
            </div>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List with Accordion Collapsible Sections */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 space-y-1.5">
        {sections.map((section, secIdx) => {
          if (!section.collapsible) {
            return (
              <div key={secIdx} className="mb-2">
                <div className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = activeMenu === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (role === 'MURID' && currentUser?.id) {
                            markSidebarMenuAsReadForUser(currentUser.id, item.id);
                          }
                          onSelectMenu(item.id);
                          if (onClose) onClose();
                        }}
                        id={`nav-menu-${item.id}`}
                        className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left group cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                        }`}
                      >
                        <span
                          className={`mr-3 shrink-0 transition-transform ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge !== undefined && showSidebarBadges && (
                          <span
                            className={`ml-auto px-2 py-0.5 rounded-full font-black shrink-0 ${
                              typeof item.badge === 'string'
                                ? 'bg-rose-500 text-white text-[9px] animate-pulse tracking-tight'
                                : 'bg-amber-500 text-white text-[10px]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isExpanded = expandedSection === section.title;
          const containsActive = section.items.some((i) => i.id === activeMenu);
          const totalBadge = showSidebarBadges
            ? section.items.reduce((acc, i) => {
                if (typeof i.badge === 'number') return acc + i.badge;
                if (typeof i.badge === 'string') return acc + 1;
                return acc;
              }, 0)
            : 0;

          return (
            <div key={section.title} className="rounded-xl overflow-hidden">
              {/* Header Accordion - Klik untuk hanya menampilkan fitur kategori ini */}
              <button
                type="button"
                onClick={() => handleToggleSection(section.title)}
                id={`accordion-btn-${section.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left group cursor-pointer ${
                  isExpanded
                    ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-xs'
                    : containsActive
                    ? 'bg-slate-800/40 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={`Klik untuk menampilkan fitur ${section.title}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`shrink-0 transition-colors ${
                      isExpanded || containsActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {section.icon || <FolderKanban className="w-4 h-4" />}
                  </span>
                  <span className="truncate uppercase tracking-wider text-[11px] font-bold">
                    {section.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {totalBadge > 0 && showSidebarBadges && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black animate-pulse">
                      {totalBadge}
                    </span>
                  )}
                  <span className="text-slate-500 group-hover:text-slate-300 transition-transform duration-200">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-blue-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                </div>
              </button>

              {/* Sub-items list yang disembunyikan sampai diklik */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeInOut' }}
                    className="overflow-hidden pl-2 pr-1 pt-1 pb-1 space-y-0.5 ml-2 border-l-2 border-slate-700/60 my-1"
                  >
                    {section.items.map((item) => {
                      const isActive = activeMenu === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (role === 'MURID' && currentUser?.id) {
                              markSidebarMenuAsReadForUser(currentUser.id, item.id);
                            }
                            onSelectMenu(item.id);
                            if (onClose) onClose();
                          }}
                          id={`nav-menu-${item.id}`}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-xs transition-colors text-left group cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                          }`}
                        >
                          <span
                            className={`mr-2.5 shrink-0 transition-transform ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge !== undefined && showSidebarBadges && (
                            <span
                              className={`ml-auto px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                                typeof item.badge === 'string'
                                  ? 'bg-rose-600 text-white text-[8px] animate-pulse px-2 tracking-tight'
                                  : 'bg-amber-500 text-white text-[9px]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Logout action */}
        {onLogout && (
          <div className="pt-2 px-1">
            <button
              onClick={() => {
                if (onClose) onClose();
                onLogout();
              }}
              id="btn-sidebar-logout"
              className="w-full flex items-center px-3.5 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-xs font-medium text-rose-300 border border-rose-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2.5 text-rose-400 shrink-0" />
              <span>Keluar Sistem</span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer Version Marker */}
      <div className="p-3.5 bg-slate-950 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest border-t border-slate-800/80 shrink-0">
        {APP_VERSION_LABEL}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 hidden lg:flex h-full border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-2xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
