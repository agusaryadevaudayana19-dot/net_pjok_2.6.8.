import { LMSDatabase, dataStorage } from '../services/dataStorage';
import { User, PendampinganMuridRecord, NotifikasiItem } from '../types';

export interface StudentFeatureBadges {
  pengumuman: number;
  materi: number;
  tugas: number;
  quiz: number;
  pendampingan: number;
  refleksi: number;
  penilaianTeman: number;
  nilai: number;
  sikap: number;
  presensi: number;
  profil: number; // Pengingat otomatis pendampingan
  total: number;
}

export interface TeacherUpdateItem {
  id: string;
  tipe: 'pendampingan' | 'tugas' | 'materi' | 'quiz' | 'refleksi' | 'pengumuman' | 'presensi';
  judul: string;
  ringkasan: string;
  tanggal: string;
  authorNama: string;
  targetMenu: string;
  targetId?: string;
  badgeLabel: string;
  badgeColor: string; // Tailwind class
  prioritas?: 'Biasa' | 'Penting' | 'Mendesak';
  dibaca?: boolean;
}

// ----------------------------------------------------------------------
// HELPER PELACAKAN STATUS BACA UNTUK BADGE SIDEBAR
// "PADA SIDEBAR SETELAH DI BACA HILANGKAN ANGKA ATAU TANDA MERAH ITU"
// ----------------------------------------------------------------------
export function getSidebarReadMap(userId: string): Record<string, string> {
  if (typeof window === 'undefined' || !userId) return {};
  try {
    const raw = localStorage.getItem(`lms_sidebar_read_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function markSidebarMenuAsRead(userId: string, menuId: string, contextKey: string = 'read'): void {
  if (typeof window === 'undefined' || !userId || !menuId) return;
  try {
    const current = getSidebarReadMap(userId);
    current[menuId] = contextKey;
    localStorage.setItem(`lms_sidebar_read_${userId}`, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('lms_sidebar_badge_change', { detail: { menuId, contextKey } }));
  } catch (e) {
    // ignore
  }
}

export function isSidebarMenuRead(userId: string, menuId: string, currentContextKey: string = 'read'): boolean {
  if (typeof window === 'undefined' || !userId || !menuId) return false;
  try {
    const current = getSidebarReadMap(userId);
    return current[menuId] === currentContextKey;
  } catch (e) {
    return false;
  }
}

/**
 * Menandai menu di sidebar sebagai sudah dibaca sesuai konteks aktifnya.
 * Dipanggil saat murid membuka menu atau mengklik notifikasi terkait.
 */
export function markSidebarMenuAsReadForUser(userId: string, menuId: string, db?: LMSDatabase): void {
  if (!userId || !menuId) return;
  const currentDb = db || dataStorage.getDatabase();
  const currentUser = (currentDb.users || []).find((u) => u.id === userId);
  if (!currentUser) return;

  if (menuId === 'presensi-saya' || menuId === 'presensi') {
    const presensiSaya = (currentDb.presensi || []).filter(
      (p) => p.muridId === userId || (p.muridNama && currentUser.name && p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
    const alpaRecords = presensiSaya.filter((p) => p.status === 'A');
    const alpaDates = alpaRecords.map((p) => p.tanggal).sort().reverse();
    const ctx = alpaRecords.length > 0 ? `alpa_${alpaRecords.length}_${alpaDates.join('_')}` : 'none';
    markSidebarMenuAsRead(userId, 'presensi-saya', ctx);
    markSidebarMenuAsRead(userId, 'presensi', ctx);
    return;
  }

  if (menuId === 'pendampingan-murid-saya' || menuId === 'pendampingan-murid') {
    const status = getStudentPendampinganStatus(currentDb, currentUser);
    const ctx = `pnd_${status.count}_${status.latestRecord?.id || 'none'}_${status.latestRecord?.updatedAt || ''}`;
    markSidebarMenuAsRead(userId, 'pendampingan-murid-saya', ctx);
    markSidebarMenuAsRead(userId, 'pendampingan-murid', ctx);
    return;
  }

  if (menuId === 'pengumuman') {
    const myKelasId = currentUser.kelasId || '';
    const unread = (currentDb.pengumuman || []).filter((p) => {
      if (p.targetRole && p.targetRole !== 'ALL' && p.targetRole !== 'MURID') return false;
      if (p.targetKelasIds && p.targetKelasIds.length > 0) {
        if (!p.targetKelasIds.includes('ALL') && myKelasId && !p.targetKelasIds.includes(myKelasId)) return false;
      } else if (p.targetKelasId && p.targetKelasId !== 'ALL' && myKelasId && p.targetKelasId !== myKelasId) {
        return false;
      }
      return !(p.dibacaOleh || []).includes(userId);
    });
    const ctx = `peng_${unread.map((p) => p.id).join('_')}`;
    markSidebarMenuAsRead(userId, 'pengumuman', ctx);
    return;
  }

  if (menuId === 'tugas-saya' || menuId === 'tugas') {
    const myKelasId = currentUser.kelasId || '';
    const pengumpulan = (currentDb.pengumpulanTugas || []).filter((p) => p.muridId === userId);
    const submittedIds = new Set(pengumpulan.map((p) => p.tugasId));
    const pending = (currentDb.tugas || []).filter((t) => {
      if (t.status !== 'Publish' && t.status !== 'Aktif' && t.statusPublikasi !== 'Publish') return false;
      if (t.kelasIds && t.kelasIds.length > 0) {
        if (!t.kelasIds.includes(myKelasId)) return false;
      } else if (t.kelasId && t.kelasId !== myKelasId) {
        return false;
      }
      return !submittedIds.has(t.id);
    });
    const ctx = `tugas_${pending.length}_${pending.map((t) => t.id).join('_')}`;
    markSidebarMenuAsRead(userId, 'tugas-saya', ctx);
    markSidebarMenuAsRead(userId, 'tugas', ctx);
    return;
  }

  if (menuId === 'quiz-saya' || menuId === 'quiz') {
    const myKelasId = currentUser.kelasId || '';
    const jwb = (currentDb.jawabanQuiz || []).filter((j) => j.muridId === userId);
    const doneIds = new Set(jwb.map((j) => j.quizId));
    const pending = (currentDb.quiz || []).filter((q) => {
      if (q.status !== 'Publish' && q.statusPublikasi !== 'Publish') return false;
      if (q.kelasIds && q.kelasIds.length > 0) {
        if (!q.kelasIds.includes(myKelasId)) return false;
      } else if (q.kelasId && q.kelasId !== myKelasId) {
        return false;
      }
      return !doneIds.has(q.id);
    });
    const ctx = `quiz_${pending.length}_${pending.map((q) => q.id).join('_')}`;
    markSidebarMenuAsRead(userId, 'quiz-saya', ctx);
    markSidebarMenuAsRead(userId, 'quiz', ctx);
    return;
  }

  if (menuId === 'refleksi-saya' || menuId === 'refleksi') {
    const myKelasId = currentUser.kelasId || '';
    const ans = new Set((currentDb.jawabanRefleksi || []).filter((j) => j.muridId === userId).map((j) => j.refleksiId));
    const pending = (currentDb.refleksi || []).filter((r) => {
      if (r.status === 'Draft' || r.statusPublikasi === 'Draft' || r.status === 'Ditutup') return false;
      const targetK = (r.kelasId || r.targetKelasId || 'ALL').toLowerCase().trim();
      if (targetK !== 'all' && targetK !== myKelasId.toLowerCase().trim()) return false;
      return !ans.has(r.id);
    });
    const ctx = `refl_${pending.length}_${pending.map((r) => r.id).join('_')}`;
    markSidebarMenuAsRead(userId, 'refleksi-saya', ctx);
    markSidebarMenuAsRead(userId, 'refleksi', ctx);
    return;
  }

  // Default mark read
  markSidebarMenuAsRead(userId, menuId, 'read');
}

/**
 * Sinkronisasi notifikasi presensi Alpa ke dalam db.notifikasi:
 * 1x, 2x, 3x Alpa TETAP diberikan notifikasi agar terus bisa dipantau.
 * JANGAN hilangkan notifikasi ini dari fitur notifikasi!
 */
export function syncStudentAlpaNotifications(currentUser: User): void {
  if (!currentUser || currentUser.role !== 'MURID') return;

  const db = dataStorage.getDatabase();
  const myId = currentUser.id;
  const presensiSaya = (db.presensi || []).filter(
    (p) => p.muridId === myId || (p.muridNama && currentUser.name && p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );
  const alpaRecords = presensiSaya.filter((p) => p.status === 'A');
  const alpaCount = alpaRecords.length;

  if (alpaCount === 0) return;

  const alpaDates = alpaRecords.map((p) => p.tanggal).sort().reverse();
  const alpaNotifId = `notif-alpa-monitor-${currentUser.id}`;

  const currentNotif = (db.notifikasi || []).find((n) => n.id === alpaNotifId);

  const judul =
    alpaCount === 1
      ? '⚠️ Peringatan Presensi: 1x Alpa Terdeteksi (Terus Dipantau)'
      : alpaCount === 2
      ? '⚠️ Peringatan Serius Presensi: 2x Alpa Terdeteksi (Terus Dipantau)'
      : `🚨 Peringatan Kritis Presensi: ${alpaCount}x Alpa Terdeteksi (Terus Dipantau)`;

  const pesan = `Perhatian Presensi: Anda memiliki catatan ${alpaCount} kali tidak hadir tanpa keterangan (Alpa) pada tanggal: ${alpaDates.join(', ')}. Notifikasi ini tetap tersimpan di fitur notifikasi agar kedisiplinan kehadiran terus terpantau bersama oleh Anda dan Guru PJOK.`;

  if (currentNotif) {
    if (currentNotif.pesan !== pesan || currentNotif.judul !== judul) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        notifikasi: (prev.notifikasi || []).map((n) =>
          n.id === alpaNotifId
            ? { ...n, judul, pesan, waktu: alpaDates[0] || 'Terbaru' }
            : n
        ),
      }));
    }
    return;
  }

  const newNotif: NotifikasiItem = {
    id: alpaNotifId,
    judul,
    pesan,
    waktu: alpaDates[0] || 'Terbaru',
    tipe: 'presensi',
    targetRole: 'MURID',
    targetMuridId: currentUser.id,
    targetKelasId: currentUser.kelasId,
    targetMenu: 'presensi-saya',
    targetId: 'presensi-saya',
    dibaca: false,
  };

  dataStorage.updateDatabase((prev) => ({
    ...prev,
    notifikasi: [newNotif, ...(prev.notifikasi || [])],
  }));
}

/**
 * Check if the student has active pendampingan that is still in progress
 * or needs follow-up by the teacher.
 * CATATAN PENTING: 1x, 2x, 3x Alpa TETAP berikan notifikasi agar terus bisa dipantau!
 */
export function getStudentPendampinganStatus(db: LMSDatabase, currentUser: User) {
  if (currentUser.role !== 'MURID') {
    return {
      hasActive: false,
      count: 0,
      activeRecords: [] as PendampinganMuridRecord[],
      latestRecord: null as PendampinganMuridRecord | null,
      statusLabel: '',
      needsFollowUp: false,
      alpaCount: 0,
      alpaDates: [] as string[],
      isHandledByTeacher: false,
    };
  }

  const myId = currentUser.id;
  const myNis = currentUser.nis;

  // Filter student's pendampingan records
  const records = (db.pendampinganMurid || []).filter((p) => {
    if (p.muridId === myId) return true;
    if (myNis && p.nis === myNis) return true;
    if (p.muridNama && currentUser.name && p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  // Check if pendampingan has been handled by teacher
  const isHandledByTeacher = records.some(
    (p) =>
      p.status === 'Selesai / Teratasi' ||
      p.status === 'Perlu Pemantauan Khusus' ||
      p.status === 'Dirujuk ke Guru BK' ||
      Boolean(p.tindakanPenanganan && p.tindakanPenanganan.trim().length > 0) ||
      Boolean(p.catatanGuru && p.catatanGuru.trim().length > 0)
  );

  // Active records: not 'Selesai / Teratasi' and not handled
  const activeRecords = records.filter(
    (p) =>
      p.status !== 'Selesai / Teratasi' &&
      !Boolean(p.tindakanPenanganan && p.tindakanPenanganan.trim().length > 0)
  );

  // Check presensi Alpa
  const presensiSaya = (db.presensi || []).filter(
    (p) => p.muridId === myId || (p.muridNama && currentUser.name && p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );
  const alpaRecords = presensiSaya.filter((p) => p.status === 'A');
  const alpaCount = alpaRecords.length;
  const alpaDates = alpaRecords.map((p) => p.tanggal).sort().reverse();

  // 1x, 2x, 3x Alpa TETAP berikan notifikasi agar terus bisa dipantau!
  const hasActive = activeRecords.length > 0 || alpaCount > 0;
  const latestRecord = activeRecords[0] || records[0] || null;

  let statusLabel = '';
  let needsFollowUp = false;

  if (alpaCount > 0) {
    needsFollowUp = true;
    if (alpaCount === 1) {
      statusLabel = isHandledByTeacher
        ? '1x Alpa (Terus Dipantau - Sudah Ditinjau Guru)'
        : '1x Alpa (Perlu Dipantau)';
    } else if (alpaCount === 2) {
      statusLabel = isHandledByTeacher
        ? '2x Alpa (Terus Dipantau - Sudah Ditinjau Guru)'
        : '2x Alpa (Perlu Perhatian)';
    } else {
      statusLabel = isHandledByTeacher
        ? `${alpaCount}x Alpa (Terus Dipantau - Pembinaan BK/Guru)`
        : `${alpaCount}x Alpa (Peringatan Kritis)`;
    }
  } else if (activeRecords.length > 0 && latestRecord) {
    statusLabel = latestRecord.status || 'Dalam Proses';
    needsFollowUp = true;
  } else {
    statusLabel = isHandledByTeacher ? 'Sudah Ditangani Guru' : 'Aman / Selesai';
    needsFollowUp = false;
  }

  return {
    hasActive,
    count: activeRecords.length > 0 ? activeRecords.length : alpaCount > 0 ? alpaCount : 0,
    activeRecords,
    latestRecord,
    statusLabel,
    needsFollowUp,
    alpaCount,
    alpaDates,
    isHandledByTeacher,
  };
}

/**
 * Calculate the exact notification count for EVERY feature for the current student.
 * Menerapkan aturan: pada sidebar setelah dibaca, hilangkan angka atau tanda merah itu!
 */
export function calculateStudentFeatureBadges(
  db: LMSDatabase,
  currentUser: User
): StudentFeatureBadges {
  if (currentUser.role !== 'MURID') {
    return {
      pengumuman: 0,
      materi: 0,
      tugas: 0,
      quiz: 0,
      pendampingan: 0,
      refleksi: 0,
      penilaianTeman: 0,
      nilai: 0,
      sikap: 0,
      presensi: 0,
      profil: 0,
      total: 0,
    };
  }

  const myId = currentUser.id;
  const myKelasId = currentUser.kelasId || '';

  // 1. Pengumuman: unread count
  const unreadPengumumanList = (db.pengumuman || []).filter((p) => {
    if (p.targetRole && p.targetRole !== 'ALL' && p.targetRole !== 'MURID') return false;
    if (p.targetKelasIds && p.targetKelasIds.length > 0) {
      if (!p.targetKelasIds.includes('ALL') && myKelasId && !p.targetKelasIds.includes(myKelasId)) {
        return false;
      }
    } else if (p.targetKelasId && p.targetKelasId !== 'ALL' && myKelasId && p.targetKelasId !== myKelasId) {
      return false;
    }
    return !(p.dibacaOleh || []).includes(myId);
  });
  const unreadPengumuman = unreadPengumumanList.length;
  const pengumumanContextKey = `peng_${unreadPengumumanList.map((p) => p.id).join('_')}`;
  const pengumumanBadge =
    unreadPengumuman > 0 && !isSidebarMenuRead(myId, 'pengumuman', pengumumanContextKey)
      ? unreadPengumuman
      : 0;

  // 2. Materi Pembelajaran: materi aktif yang dipublish
  const materiAktifList = (db.materi || []).filter((m) => {
    if (m.status !== 'Publish') return false;
    if (m.kelasIds && m.kelasIds.length > 0) {
      return m.kelasIds.includes(myKelasId);
    }
    if (m.kelasId) {
      return m.kelasId === myKelasId || m.kelasId === 'ALL';
    }
    return true;
  });
  const materiAktif = materiAktifList.length;
  const materiContextKey = `mat_${materiAktifList.map((m) => m.id).join('_')}`;
  const materiBadge =
    materiAktif > 0 && !isSidebarMenuRead(myId, 'materi-saya', materiContextKey)
      ? materiAktif
      : 0;

  // 3. Tugas: belum dikumpulkan
  const pengumpulanSaya = (db.pengumpulanTugas || []).filter((p) => p.muridId === myId);
  const submittedTugasIds = new Set(pengumpulanSaya.map((p) => p.tugasId));

  const tugasBelumList = (db.tugas || []).filter((t) => {
    if (t.status !== 'Publish' && t.status !== 'Aktif' && t.statusPublikasi !== 'Publish') return false;
    if (t.kelasIds && t.kelasIds.length > 0) {
      if (!t.kelasIds.includes(myKelasId)) return false;
    } else if (t.kelasId && t.kelasId !== myKelasId) {
      return false;
    }
    return !submittedTugasIds.has(t.id);
  });
  const tugasBelum = tugasBelumList.length;
  const tugasContextKey = `tugas_${tugasBelum}_${tugasBelumList.map((t) => t.id).join('_')}`;
  const tugasBadge =
    tugasBelum > 0 && !isSidebarMenuRead(myId, 'tugas-saya', tugasContextKey)
      ? tugasBelum
      : 0;

  // 4. Quiz: belum selesai dikerjakan
  const jawabanQuizSaya = (db.jawabanQuiz || []).filter((j) => j.muridId === myId);
  const submittedQuizIds = new Set(jawabanQuizSaya.map((j) => j.quizId));

  const quizBelumList = (db.quiz || []).filter((q) => {
    if (q.status !== 'Publish' && q.statusPublikasi !== 'Publish') return false;
    if (q.kelasIds && q.kelasIds.length > 0) {
      if (!q.kelasIds.includes(myKelasId)) return false;
    } else if (q.kelasId && q.kelasId !== myKelasId) {
      return false;
    }
    return !submittedQuizIds.has(q.id);
  });
  const quizBelum = quizBelumList.length;
  const quizContextKey = `quiz_${quizBelum}_${quizBelumList.map((q) => q.id).join('_')}`;
  const quizBadge =
    quizBelum > 0 && !isSidebarMenuRead(myId, 'quiz-saya', quizContextKey)
      ? quizBelum
      : 0;

  // 5. Pendampingan Murid: active records or alpa needing attention
  const pendampinganStatus = getStudentPendampinganStatus(db, currentUser);
  const pendampinganCount = pendampinganStatus.count;
  const pendampinganContextKey = `pnd_${pendampinganCount}_${pendampinganStatus.latestRecord?.id || 'none'}_${pendampinganStatus.latestRecord?.updatedAt || ''}`;
  const pendampinganBadge =
    pendampinganCount > 0 && !isSidebarMenuRead(myId, 'pendampingan-murid-saya', pendampinganContextKey)
      ? pendampinganCount
      : 0;

  // 6. Refleksi Belajar: belum diisi
  const myRefleksiList = (db.refleksi || []).filter((r) => {
    if (r.status === 'Draft' || r.statusPublikasi === 'Draft' || r.status === 'Ditutup') return false;
    const targetK = (r.kelasId || r.targetKelasId || 'ALL').toLowerCase().trim();
    if (targetK === 'all') return true;
    return targetK === myKelasId.toLowerCase().trim();
  });
  const answeredRefleksiIds = new Set(
    (db.jawabanRefleksi || []).filter((j) => j.muridId === myId).map((j) => j.refleksiId)
  );
  const refleksiBelumList = myRefleksiList.filter((r) => !answeredRefleksiIds.has(r.id));
  const refleksiBelum = refleksiBelumList.length;
  const refleksiContextKey = `refl_${refleksiBelum}_${refleksiBelumList.map((r) => r.id).join('_')}`;
  const refleksiBadge =
    refleksiBelum > 0 && !isSidebarMenuRead(myId, 'refleksi-saya', refleksiContextKey)
      ? refleksiBelum
      : 0;

  // 7. Penilaian Teman Sejawat: reviews done by student
  const temanDalamKelas = (db.users || []).filter(
    (u) => u.role === 'MURID' && u.kelasId === myKelasId && u.id !== myId
  );
  const myPeerReviews = (db.penilaianTemanSejawat || []).filter((p) => p.penilaiId === myId);
  const reviewedFriendIds = new Set(myPeerReviews.map((p) => p.targetMuridId));
  const pendingPeerReviews = Math.max(0, temanDalamKelas.length - reviewedFriendIds.size);
  const penilaianTemanContextKey = `teman_${pendingPeerReviews}`;
  const penilaianTemanBadge =
    pendingPeerReviews > 0 && !isSidebarMenuRead(myId, 'penilaian-teman-saya', penilaianTemanContextKey)
      ? pendingPeerReviews
      : 0;

  // 8. Transkrip Nilai: graded items with teacher feedback
  const gradedAssignmentsWithFeedback = pengumpulanSaya.filter(
    (p) => p.nilai !== undefined && p.nilai !== null && p.catatanGuru
  ).length;
  const nilaiContextKey = `nilai_${gradedAssignmentsWithFeedback}`;
  const nilaiBadge =
    gradedAssignmentsWithFeedback > 0 && !isSidebarMenuRead(myId, 'nilai-saya', nilaiContextKey)
      ? gradedAssignmentsWithFeedback
      : 0;

  // 9. Penilaian Sikap: published attitude assessments for this student
  const sikapPublished = (db.penilaianSikap || []).filter(
    (s) => s.muridId === myId && s.statusPublikasi === 'Publish'
  ).length;
  const sikapContextKey = `sikap_${sikapPublished}`;
  const sikapBadge =
    sikapPublished > 0 && !isSidebarMenuRead(myId, 'sikap-saya', sikapContextKey)
      ? sikapPublished
      : 0;

  // 10. Presensi: alpa count (1x, 2x, 3x Alpa)
  // Pada sidebar: jika belum dibaca, tampilkan angka / tanda merah; jika sudah dibaca, HILANGKAN!
  const alpaCount = pendampinganStatus.alpaCount;
  const alpaDates = pendampinganStatus.alpaDates;
  const presensiContextKey = alpaCount > 0 ? `alpa_${alpaCount}_${alpaDates.join('_')}` : 'none';
  const presensiBadge =
    alpaCount > 0 && !isSidebarMenuRead(myId, 'presensi-saya', presensiContextKey)
      ? alpaCount
      : 0;

  // 11. Profil: badge pengingat otomatis jika status pendampingan butuh tindak lanjut
  const profilBadge =
    pendampinganStatus.needsFollowUp && !isSidebarMenuRead(myId, 'pendampingan-murid-saya', pendampinganContextKey)
      ? 1
      : 0;

  const total =
    pengumumanBadge +
    materiBadge +
    tugasBadge +
    quizBadge +
    pendampinganBadge +
    refleksiBadge +
    presensiBadge +
    profilBadge;

  return {
    pengumuman: pengumumanBadge,
    materi: materiBadge,
    tugas: tugasBadge,
    quiz: quizBadge,
    pendampingan: pendampinganBadge,
    refleksi: refleksiBadge,
    penilaianTeman: penilaianTemanBadge,
    nilai: nilaiBadge,
    sikap: sikapBadge,
    presensi: presensiBadge,
    profil: profilBadge,
    total,
  };
}

/**
 * Extract the latest updates, instructions, and feedback directly from Teachers for this student.
 */
export function getLatestTeacherUpdates(
  db: LMSDatabase,
  currentUser: User
): TeacherUpdateItem[] {
  if (currentUser.role !== 'MURID') return [];

  const myId = currentUser.id;
  const myKelasId = currentUser.kelasId || '';
  const myNis = currentUser.nis;
  const updates: TeacherUpdateItem[] = [];

  // 1. Tindak Lanjut & Catatan Guru di Form Pendampingan Murid
  const pendampinganRecords = (db.pendampinganMurid || []).filter((p) => {
    if (p.muridId === myId) return true;
    if (myNis && p.nis === myNis) return true;
    return false;
  });

  pendampinganRecords.forEach((p) => {
    if (p.tindakanPenanganan || p.catatanGuru || p.status !== 'Selesai / Teratasi') {
      updates.push({
        id: `t-pend-${p.id}`,
        tipe: 'pendampingan',
        judul: `Tindak Lanjut Pendampingan: Status ${p.status}`,
        ringkasan:
          p.tindakanPenanganan ||
          p.catatanGuru ||
          `Guru PJOK sedang memproses pendampingan terkait "${p.jenisMasalah}". Mohon berikan komitmen atau penjelasan izin/kendala.`,
        tanggal: p.updatedAt ? p.updatedAt.slice(0, 10) : p.tanggal,
        authorNama: p.guruNama || 'Guru PJOK',
        targetMenu: 'pendampingan-murid-saya',
        targetId: p.id,
        badgeLabel: p.status,
        badgeColor:
          p.status === 'Dalam Proses'
            ? 'bg-amber-100 text-amber-900 border border-amber-300'
            : p.status === 'Perlu Pemantauan Khusus'
            ? 'bg-rose-100 text-rose-900 border border-rose-300'
            : 'bg-blue-100 text-blue-900 border border-blue-300',
        prioritas: p.status !== 'Selesai / Teratasi' ? 'Penting' : 'Biasa',
      });
    }
  });

  // 2. Pengumuman Terbaru dari Guru
  (db.pengumuman || [])
    .filter((p) => {
      if (p.targetRole && p.targetRole !== 'ALL' && p.targetRole !== 'MURID') return false;
      if (p.targetKelasIds && p.targetKelasIds.length > 0) {
        if (!p.targetKelasIds.includes('ALL') && myKelasId && !p.targetKelasIds.includes(myKelasId)) {
          return false;
        }
      } else if (p.targetKelasId && p.targetKelasId !== 'ALL' && myKelasId && p.targetKelasId !== myKelasId) {
        return false;
      }
      return true;
    })
    .slice(0, 5)
    .forEach((p) => {
      const isUnread = !(p.dibacaOleh || []).includes(myId);
      updates.push({
        id: `t-peng-${p.id}`,
        tipe: 'pengumuman',
        judul: p.judul,
        ringkasan: p.isi,
        tanggal: p.tanggalDibuat ? p.tanggalDibuat.slice(0, 10) : new Date().toISOString().slice(0, 10),
        authorNama: p.guruNama || 'Guru PJOK',
        targetMenu: 'pengumuman',
        targetId: p.id,
        badgeLabel: p.kategori || 'Pengumuman',
        badgeColor: 'bg-sky-100 text-sky-800 border border-sky-200',
        prioritas: p.prioritas === 'Mendesak' ? 'Mendesak' : p.prioritas === 'Penting' ? 'Penting' : 'Biasa',
        dibaca: !isUnread,
      });
    });

  // 3. Koreksi & Nilai Tugas Terbaru dari Guru
  const mySubmissions = (db.pengumpulanTugas || []).filter(
    (p) => p.muridId === myId && (p.nilai !== undefined || p.catatanGuru)
  );

  mySubmissions.slice(0, 4).forEach((s) => {
    const matchedTugas = (db.tugas || []).find((t) => t.id === s.tugasId);
    updates.push({
      id: `t-tugas-grade-${s.id}`,
      tipe: 'tugas',
      judul: `Koreksi Nilai: ${s.tugasJudul || matchedTugas?.judul || 'Tugas PJOK'}`,
      ringkasan: s.catatanGuru
        ? `Nilai: ${s.nilai || '-'}. Catatan Guru: "${s.catatanGuru}"`
        : `Tugas Anda telah dinilai oleh guru dengan perolehan: ${s.nilai}.`,
      tanggal: s.tanggalKumpul || new Date().toISOString().slice(0, 10),
      authorNama: 'Guru PJOK',
      targetMenu: 'tugas-saya',
      targetId: s.tugasId,
      badgeLabel: s.nilai !== undefined ? `Nilai: ${s.nilai}` : 'Tugas Dikoreksi',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      prioritas: 'Biasa',
    });
  });

  // 4. Catatan Tanggapan Guru pada Refleksi
  const myRefleksiAnswers = (db.jawabanRefleksi || []).filter(
    (j) => j.muridId === myId && j.catatanGuru
  );

  myRefleksiAnswers.slice(0, 3).forEach((j) => {
    updates.push({
      id: `t-refl-${j.id}`,
      tipe: 'refleksi',
      judul: `Tanggapan Refleksi: ${j.refleksiJudul || 'Refleksi Belajar'}`,
      ringkasan: `Tanggapan Guru PJOK: "${j.catatanGuru}"`,
      tanggal: j.tanggalTanggapanGuru || j.tanggalDiisi || new Date().toISOString().slice(0, 10),
      authorNama: 'Guru PJOK',
      targetMenu: 'refleksi-saya',
      targetId: j.refleksiId,
      badgeLabel: 'Tanggapan Guru',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      prioritas: 'Biasa',
    });
  });

  // Sort by date descending
  return updates.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
}
