import React, { useState, useEffect, useRef } from 'react';
import { dataStorage, LMSDatabase, FirestoreSyncStatus } from './services/dataStorage';
import { User, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { MuridManagement } from './components/admin/MuridManagement';
import { GuruManagement } from './components/admin/GuruManagement';
import { AdminManagement } from './components/admin/AdminManagement';
import { ClassManagement } from './components/admin/ClassManagement';
import { SubjectManagement } from './components/admin/SubjectManagement';
import { SchoolSettings } from './components/admin/SchoolSettings';
import { ActivityLogView } from './components/admin/ActivityLogView';

// Teacher Components
import { GuruDashboard } from './components/guru/GuruDashboard';
import { GuruDataMurid } from './components/guru/GuruDataMurid';
import { JurnalMengajarView } from './components/guru/JurnalMengajar';
import { GuruRefleksi } from './components/guru/GuruRefleksi';

// Student Components
import { MuridDashboard } from './components/murid/MuridDashboard';
import { MuridMateri } from './components/murid/MuridMateri';
import { MuridTugas } from './components/murid/MuridTugas';
import { MuridQuiz } from './components/murid/MuridQuiz';
import { MuridNilai } from './components/murid/MuridNilai';
import { MuridPresensi } from './components/murid/MuridPresensi';
import { MuridProfil } from './components/murid/MuridProfil';
import { MuridRefleksi } from './components/murid/MuridRefleksi';
import { MuridDeadlineAlertBanner } from './components/murid/MuridDeadlineAlertBanner';
import { syncStudentDeadlineNotifications } from './utils/deadlineNotification';

// Shared Components
import { PengumumanManager } from './components/shared/PengumumanManager';
import { MuridPengumumanView } from './components/murid/MuridPengumumanView';
import { MateriManager } from './components/shared/MateriManager';
import { TugasManager } from './components/shared/TugasManager';
import { QuizManager } from './components/shared/QuizManager';
import { ContentManager } from './components/shared/ContentManager';
import { AttendanceManager } from './components/shared/AttendanceManager';
import { GradesReport } from './components/shared/GradesReport';
import { PraktikAssessment } from './components/shared/PraktikAssessment';
import { RekapanPenilaianPraktik } from './components/shared/RekapanPenilaianPraktik';
import { RekapanHasilQuiz } from './components/shared/RekapanHasilQuiz';
import { ProfilMandiri } from './components/shared/ProfilMandiri';
import { ProfilModal } from './components/shared/ProfilModal';
import { LoginPage } from './components/LoginPage';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';
import { cleanupExpiredTrash } from './utils/trashCleanup';
import { APP_VERSION, APP_VERSION_LABEL } from './types';
import { PenilaianHarianManager } from './components/shared/PenilaianHarianManager';
import { PenilaianSikapManager } from './components/shared/PenilaianSikapManager';
import { PenilaianTemanSejawatManager } from './components/shared/PenilaianTemanSejawatManager';
import { FormPendampinganMurid } from './components/shared/FormPendampinganMurid';
import { RekapanPendampingan } from './components/shared/RekapanPendampingan';
import { LaporanPelaksanaanPembelajaran } from './components/shared/LaporanPelaksanaanPembelajaran';
import { LaporanPenilaian } from './components/shared/LaporanPenilaian';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [db, setDb] = useState<LMSDatabase>(dataStorage.getDatabase());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Keep user logged in persistently across tab switching, closing tab, or opening in new tab
    try {
      const savedUser = dataStorage.getCurrentUser();
      if (savedUser) return savedUser;
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [activeSubParam, setActiveSubParam] = useState<string | undefined>(undefined);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<FirestoreSyncStatus>(dataStorage.getSyncStatus());

  // Pembersihan data sampah (soft-deleted items) di Firestore yang > 30 hari secara otomatis
  useEffect(() => {
    cleanupExpiredTrash(30).then((res) => {
      if (res.purgedCount > 0) {
        console.info(`[AutoCleanup] Berhasil membersihkan ${res.purgedCount} data sampah lama (> 30 hari).`);
      }
    });
  }, []);

  // Keep currentUser synced if user profile/class assignments are updated in db
  useEffect(() => {
    if (currentUser) {
      const freshUser = (db.users || []).find((u) => u.id === currentUser.id);
      if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshUser);
        dataStorage.setCurrentUser(freshUser);
      }
    }
  }, [db.users]);

  // Subscribe to local storage changes and Firestore sync status
  useEffect(() => {
    const unsubscribeDb = dataStorage.subscribe((newDb) => {
      setDb(newDb);
    });
    const unsubscribeSync = dataStorage.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    return () => {
      unsubscribeDb();
      unsubscribeSync();
    };
  }, []);

  // Dynamically update favicon, apple-touch-icon, and Web App Manifest when school logo is customized
  useEffect(() => {
    const customLogo = db.settings?.logoSekolah;
    const targetIcon = customLogo && customLogo.trim() !== '' ? customLogo : '/pwa-192x192.png';
    const targetApple = customLogo && customLogo.trim() !== '' ? customLogo : '/apple-touch-icon.png';

    const iconElements = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    iconElements.forEach((el) => {
      el.href = targetIcon;
    });

    const appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = targetApple;
    }

    // Ensure the canonical manifest points to /manifest.json for Chrome WebAPK compliance
    const manifestEl = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (manifestEl && manifestEl.href !== '/manifest.json') {
      manifestEl.href = '/manifest.json';
    }
  }, [db.settings?.logoSekolah, db.settings?.namaSekolah]);

  // Sync deadline notifications for student (< 24 hours alerts)
  useEffect(() => {
    if (currentUser?.role === 'MURID') {
      syncStudentDeadlineNotifications(currentUser);
    }
  }, [currentUser?.id, currentUser?.role, db.tugas, db.quiz, db.pengumpulanTugas, db.jawabanQuiz]);

  // Update current user if updated in db
  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    dataStorage.setCurrentUser(updatedUser);
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    const targetUser = (db.users || []).find((u) => u.role === newRole) || db.users?.[0];
    if (targetUser) {
      setCurrentUser(targetUser);
      dataStorage.setCurrentUser(targetUser);
      setActiveMenu('dashboard');
      setActiveSubParam(undefined);
    }
  };

  const handleLogout = () => {
    dataStorage.clearCurrentUser();
    try {
      sessionStorage.removeItem('lms_pjok_session_active');
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setIsLoginModalOpen(false);
    setActiveMenu('dashboard');
    setActiveSubParam(undefined);
  };

  const handleNavigate = (menuId: string, param?: string) => {
    let targetMenu = menuId;
    if (currentUser?.role === 'MURID') {
      if (targetMenu === 'tugas') targetMenu = 'tugas-saya';
      else if (targetMenu === 'materi') targetMenu = 'materi-saya';
      else if (targetMenu === 'quiz' || targetMenu === 'kuis') targetMenu = 'quiz-saya';
      else if (targetMenu === 'presensi') targetMenu = 'presensi-saya';
      else if (targetMenu === 'nilai') targetMenu = 'nilai-saya';
      else if (targetMenu === 'sikap') targetMenu = 'sikap-saya';
      else if (targetMenu === 'refleksi') targetMenu = 'refleksi-saya';
      else if (targetMenu === 'penilaian-teman') targetMenu = 'penilaian-teman-saya';
      else if (targetMenu === 'profil') targetMenu = 'profil-saya';
    } else if (currentUser?.role === 'GURU') {
      if (targetMenu === 'tugas-saya') targetMenu = 'tugas';
      else if (targetMenu === 'materi-saya') targetMenu = 'materi';
      else if (targetMenu === 'quiz-saya') targetMenu = 'quiz';
      else if (targetMenu === 'presensi-saya') targetMenu = 'presensi';
      else if (targetMenu === 'nilai-saya') targetMenu = 'nilai';
      else if (targetMenu === 'profil') targetMenu = 'profil-saya';
    } else if (currentUser?.role === 'ADMIN') {
      if (targetMenu === 'profil') targetMenu = 'profil-saya';
    }
    setActiveMenu(targetMenu);
    setActiveSubParam(param);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not logged in, render the dedicated Login Screen as the main initial view
  if (!currentUser) {
    return (
      <LoginPage
        settings={db.settings}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          dataStorage.setCurrentUser(user);
          setActiveMenu('dashboard');
          setActiveSubParam(undefined);
        }}
      />
    );
  }

  const renderActiveView = () => {
    // 1. ADMIN VIEWS
    if (currentUser.role === 'ADMIN') {
      switch (activeMenu) {
        case 'dashboard':
          return (
            <AdminDashboard
              db={db}
              onNavigate={handleNavigate}
            />
          );
        case 'data-murid':
          return <MuridManagement db={db} />;
        case 'data-guru':
          return <GuruManagement db={db} />;
        case 'users':
          return <AdminManagement db={db} />;
        case 'kelas':
          return <ClassManagement db={db} />;
        case 'mapel':
          return <SubjectManagement db={db} />;
        case 'materi':
          return <MateriManager db={db} currentUser={currentUser} />;
        case 'tugas':
          return <TugasManager db={db} currentUser={currentUser} />;
        case 'quiz':
          return <QuizManager db={db} currentUser={currentUser} />;
        case 'praktik':
          return <PraktikAssessment db={db} currentUser={currentUser} />;
        case 'rekap-praktik':
          return (
            <RekapanPenilaianPraktik
              db={db}
              currentUser={currentUser}
              onNavigatePraktik={() => setActiveMenu('praktik')}
            />
          );
        case 'rekap-quiz':
          return (
            <RekapanHasilQuiz
              db={db}
              currentUser={currentUser}
              onNavigateQuiz={() => setActiveMenu('quiz')}
            />
          );
        case 'penilaian-harian':
          return <PenilaianHarianManager db={db} currentUser={currentUser} />;
        case 'penilaian-sikap':
          return <PenilaianSikapManager db={db} currentUser={currentUser} initialTab="entri" />;
        case 'rekap-penilaian-sikap':
          return <PenilaianSikapManager db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'penilaian-teman':
          return <PenilaianTemanSejawatManager db={db} currentUser={currentUser} initialTab="daftar" />;
        case 'rekap-penilaian-teman':
          return <PenilaianTemanSejawatManager db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'refleksi':
          return <GuruRefleksi db={db} currentUser={currentUser} />;
        case 'pengumuman':
          return <PengumumanManager db={db} currentUser={currentUser} />;
        case 'jurnal':
          return <JurnalMengajarView db={db} currentUser={currentUser} initialTab="harian" />;
        case 'rekap-jurnal':
          return <JurnalMengajarView db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'pendampingan-murid':
        case 'form-pendampingan':
          return (
            <FormPendampinganMurid
              db={db}
              currentUser={currentUser}
              initialKelasId={activeSubParam}
            />
          );
        case 'rekap-pendampingan':
          return (
            <RekapanPendampingan
              db={db}
              currentUser={currentUser}
              onNavigatePembinaan={(kId) => {
                handleNavigate('pendampingan-murid', kId);
              }}
            />
          );
        case 'laporan-pelaksanaan':
          return (
            <LaporanPelaksanaanPembelajaran
              db={db}
              currentUser={currentUser}
            />
          );
        case 'laporan-penilaian':
        case 'laporan':
          return (
            <LaporanPenilaian
              db={db}
              currentUser={currentUser}
            />
          );
        case 'presensi':
          return <AttendanceManager db={db} role="ADMIN" currentUser={currentUser} initialTab="harian" />;
        case 'rekap-absensi':
          return <AttendanceManager db={db} role="ADMIN" currentUser={currentUser} initialTab="rekap" />;
        case 'surat-izin':
        case 'pengajuan-izin':
          return <AttendanceManager db={db} role="ADMIN" currentUser={currentUser} initialTab="surat-izin" />;
        case 'nilai':
          return (
            <GradesReport
              db={db}
              currentUser={currentUser}
            />
          );
        case 'log-aktivitas':
          return (
            <ActivityLogView
              db={db}
              onNavigate={handleNavigate}
              onTestLoginMurid={(murid) => {
                setCurrentUser(murid);
                dataStorage.setCurrentUser(murid);
                setActiveMenu('dashboard');
                setActiveSubParam(undefined);
              }}
            />
          );
        case 'settings':
          return (
            <SchoolSettings
              db={db}
              currentUser={currentUser}
            />
          );
        case 'profil-saya':
        case 'profil':
          return (
            <ProfilMandiri
              currentUser={currentUser}
              db={db}
              onUpdateUser={handleUserUpdate}
            />
          );
        default:
          return <AdminDashboard db={db} onNavigate={handleNavigate} />;
      }
    }

    // 2. GURU VIEWS
    if (currentUser.role === 'GURU') {
      switch (activeMenu) {
        case 'dashboard':
          return <GuruDashboard db={db} currentUser={currentUser} onNavigate={handleNavigate} />;
        case 'data-murid':
          return (
            <GuruDataMurid
              db={db}
              currentUser={currentUser}
              onNavigatePraktik={(muridId) => {
                handleNavigate('praktik', muridId);
              }}
            />
          );
        case 'materi':
          return <MateriManager db={db} currentUser={currentUser} />;
        case 'tugas':
          return <TugasManager db={db} currentUser={currentUser} />;
        case 'quiz':
          return <QuizManager db={db} currentUser={currentUser} />;
        case 'praktik':
          return <PraktikAssessment db={db} currentUser={currentUser} />;
        case 'rekap-praktik':
          return (
            <RekapanPenilaianPraktik
              db={db}
              currentUser={currentUser}
              onNavigatePraktik={() => setActiveMenu('praktik')}
            />
          );
        case 'rekap-quiz':
          return (
            <RekapanHasilQuiz
              db={db}
              currentUser={currentUser}
              onNavigateQuiz={() => setActiveMenu('quiz')}
            />
          );
        case 'penilaian-harian':
          return <PenilaianHarianManager db={db} currentUser={currentUser} />;
        case 'penilaian-sikap':
          return <PenilaianSikapManager db={db} currentUser={currentUser} initialTab="entri" />;
        case 'rekap-penilaian-sikap':
          return <PenilaianSikapManager db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'penilaian-teman':
          return <PenilaianTemanSejawatManager db={db} currentUser={currentUser} initialTab="daftar" />;
        case 'rekap-penilaian-teman':
          return <PenilaianTemanSejawatManager db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'refleksi':
          return <GuruRefleksi db={db} currentUser={currentUser} />;
        case 'pengumuman':
          return <PengumumanManager db={db} currentUser={currentUser} />;
        case 'presensi':
          return <AttendanceManager db={db} role="GURU" currentUser={currentUser} initialTab="harian" />;
        case 'rekap-absensi':
          return <AttendanceManager db={db} role="GURU" currentUser={currentUser} initialTab="rekap" />;
        case 'surat-izin':
        case 'pengajuan-izin':
          return <AttendanceManager db={db} role="GURU" currentUser={currentUser} initialTab="surat-izin" />;
        case 'nilai':
          return (
            <GradesReport
              db={db}
              currentUser={currentUser}
            />
          );
        case 'jurnal':
          return <JurnalMengajarView db={db} currentUser={currentUser} initialTab="harian" />;
        case 'rekap-jurnal':
          return <JurnalMengajarView db={db} currentUser={currentUser} initialTab="rekap" />;
        case 'pendampingan-murid':
        case 'form-pendampingan':
          return (
            <FormPendampinganMurid
              db={db}
              currentUser={currentUser}
              initialKelasId={activeSubParam}
            />
          );
        case 'rekap-pendampingan':
          return (
            <RekapanPendampingan
              db={db}
              currentUser={currentUser}
              onNavigatePembinaan={(kId) => {
                handleNavigate('pendampingan-murid', kId);
              }}
            />
          );
        case 'laporan-pelaksanaan':
          return (
            <LaporanPelaksanaanPembelajaran
              db={db}
              currentUser={currentUser}
            />
          );
        case 'laporan-penilaian':
        case 'laporan':
          return (
            <LaporanPenilaian
              db={db}
              currentUser={currentUser}
            />
          );
        case 'settings':
          return (
            <SchoolSettings
              db={db}
              currentUser={currentUser}
            />
          );
        case 'profil-saya':
        case 'profil':
          return (
            <ProfilMandiri
              currentUser={currentUser}
              db={db}
              onUpdateUser={handleUserUpdate}
            />
          );
        default:
          return <GuruDashboard db={db} currentUser={currentUser} onNavigate={handleNavigate} />;
      }
    }

    // 3. MURID VIEWS
    if (currentUser.role === 'MURID') {
      switch (activeMenu) {
        case 'dashboard':
          return <MuridDashboard db={db} currentUser={currentUser} onNavigate={handleNavigate} />;
        case 'pengumuman':
          return (
            <MuridPengumumanView
              db={db}
              currentUser={currentUser}
              onNavigate={handleNavigate}
              initialPengumumanId={activeSubParam}
              onClearParam={() => setActiveSubParam(undefined)}
            />
          );
        case 'materi-saya':
        case 'materi':
          return (
            <MuridMateri
              db={db}
              currentUser={currentUser}
              initialMateriId={activeSubParam}
              onClearParam={() => setActiveSubParam(undefined)}
            />
          );
        case 'tugas-saya':
        case 'tugas':
          return (
            <MuridTugas
              db={db}
              currentUser={currentUser}
              initialTugasId={activeSubParam}
              onClearParam={() => setActiveSubParam(undefined)}
            />
          );
        case 'quiz-saya':
        case 'quiz':
        case 'kuis':
          return (
            <MuridQuiz
              db={db}
              currentUser={currentUser}
              initialQuizId={activeSubParam}
              onClearParam={() => setActiveSubParam(undefined)}
            />
          );
        case 'penilaian-teman-saya':
        case 'penilaian-teman':
          return <PenilaianTemanSejawatManager db={db} currentUser={currentUser} />;
        case 'pendampingan-murid-saya':
        case 'pendampingan-murid':
        case 'form-pendampingan':
          return (
            <FormPendampinganMurid
              db={db}
              currentUser={currentUser}
            />
          );
        case 'refleksi-saya':
        case 'refleksi':
          return <MuridRefleksi db={db} currentUser={currentUser} />;
        case 'nilai-saya':
        case 'nilai':
          return <MuridNilai db={db} currentUser={currentUser} />;
        case 'sikap-saya':
        case 'penilaian-sikap-saya':
        case 'penilaian-sikap':
        case 'sikap':
          return <PenilaianSikapManager db={db} currentUser={currentUser} />;
        case 'presensi-saya':
        case 'presensi':
          return <MuridPresensi db={db} currentUser={currentUser} />;
        case 'profil-saya':
        case 'profil':
          return (
            <MuridProfil
              db={db}
              currentUser={currentUser}
              onUpdateUser={handleUserUpdate}
              onNavigate={handleNavigate}
            />
          );
        default:
          return <MuridDashboard db={db} currentUser={currentUser} onNavigate={handleNavigate} />;
      }
    }

    return <div>Role tidak dikenali</div>;
  };

  return (
    <div id="app" className="flex h-screen w-full bg-gray-100 font-sans overflow-hidden text-slate-800 antialiased">
      {/* Left Sidebar */}
      <Sidebar
        role={currentUser.role}
        currentUser={currentUser}
        appLogo={db.settings?.logoSekolah}
        activeMenu={activeMenu}
        onSelectMenu={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          currentUser={currentUser}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onSwitchRole={handleRoleSwitch}
          onSelectMenuItem={(menuId, param) => {
            handleNavigate(menuId, param);
          }}
          settings={db.settings}
        />

        {/* Standby / Offline Mode Active Banner */}
        {syncStatus === 'offline' && (
          <div className="bg-amber-500/10 border-b border-amber-300/80 px-4 py-2 flex items-center justify-between text-xs text-amber-950 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong className="font-bold">Mode Standby / Offline Aktif:</strong> Perangkat tidak terhubung ke internet. Anda tetap dapat menginput nilai praktik, presensi, membaca materi, dan mengerjakan kuis. Seluruh data tersimpan aman di memori perangkat ini dan akan otomatis disinkronkan ke Cloud Firestore segera saat online.
              </span>
            </div>
            <button
              onClick={() => dataStorage.forceRefreshFromFirestore().catch(() => {})}
              className="ml-3 shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Cek Koneksi
            </button>
          </div>
        )}

        {/* Workspace Main View */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full space-y-4">
            {currentUser && currentUser.role === 'MURID' && (
              <MuridDeadlineAlertBanner
                db={db}
                currentUser={currentUser}
                onNavigate={(menu, subParam) => handleNavigate(menu, subParam)}
              />
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full"
              >
                {renderActiveView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer - Visible on every menu */}
        <footer className="h-12 bg-white border-t border-gray-200 flex items-center justify-between px-4 sm:px-8 text-[11px] text-slate-500 shrink-0 font-medium z-10">
          <div className="flex items-center gap-2">
            <span className="font-black text-blue-950 tracking-wider">
              {APP_VERSION_LABEL}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-500 font-semibold">
            <span>
              {!db.settings?.namaSekolah || db.settings.namaSekolah.includes('Kintamani')
                ? 'SMA Negeri 1 Tejakula (SMANSAKA)'
                : db.settings.namaSekolah}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              v{APP_VERSION}
            </span>
          </div>
        </footer>
      </div>

      {/* Login & Account Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        settings={db.settings}
        onSelectUser={(user) => {
          handleUserUpdate(user);
          setActiveMenu('dashboard');
          setActiveSubParam(undefined);
        }}
        currentUserId={currentUser.id}
      />

      {/* Profil Mandiri Modal */}
      <ProfilModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        db={db}
        onUpdateUser={handleUserUpdate}
      />

      {/* PWA Update & Offline Notifications */}
      <PWAUpdatePrompt />
    </div>
  );
}
