import {
  User,
  Kelas,
  MataPelajaran,
  Materi,
  Tugas,
  PengumpulanTugas,
  Quiz,
  Soal,
  JawabanQuiz,
  PenilaianPraktik,
  PresensiRecord,
  JurnalMengajar,
  NotifikasiItem,
  RekapNilaiMurid,
  PengaturanSekolah,
  RefleksiPembelajaran,
  JawabanRefleksiMurid,
  SoalRefleksi,
  PengajuanIzin,
  Pengumuman,
  ActivityLog,
  PenilaianSikap,
  PenilaianTemanSejawat,
  PenilaianHarian,
  DimensiTemanSejawatConfig,
  DimensiAsesmenItem,
  TrashUserItem,
  UserRole,
  PendampinganMuridRecord,
} from '../types';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { firestore, handleFirestoreError, OperationType } from './firestore';
import { auth } from './firebaseAuth';
import { DEFAULT_USERS, DEFAULT_NILAI } from '../data/defaultUsers';
import { exportUsersToCSV, parseCSVToUsers } from '../utils/csvUserHelpers';

export interface LMSDatabase {
  users: User[];
  kelas: Kelas[];
  mataPelajaran: MataPelajaran[];
  materi: Materi[];
  tugas: Tugas[];
  pengumpulanTugas: PengumpulanTugas[];
  quiz: Quiz[];
  jawabanQuiz: JawabanQuiz[];
  penilaianPraktik: PenilaianPraktik[];
  presensi: PresensiRecord[];
  jurnal: JurnalMengajar[];
  notifikasi: NotifikasiItem[];
  pengumuman?: Pengumuman[];
  nilai: RekapNilaiMurid[];
  settings: PengaturanSekolah;
  pengajuanIzin?: PengajuanIzin[];
  refleksi?: RefleksiPembelajaran[];
  jawabanRefleksi?: JawabanRefleksiMurid[];
  materiPraktikList?: string[];
  penilaianSikap?: PenilaianSikap[];
  penilaianTemanSejawat?: PenilaianTemanSejawat[];
  dimensiTemanSejawat?: DimensiTemanSejawatConfig[];
  penilaianHarian?: PenilaianHarian[];
  pendampinganMurid?: PendampinganMuridRecord[];
  trashUsers?: TrashUserItem[];
  isCleanSlate?: boolean;
  cleanSlateTimestamp?: string;
  isNilaiPresensiReset?: boolean;
  activityLogs?: ActivityLog[];
}

const STORAGE_KEY = 'lms_pjok_db_v6_clean';

export const DEFAULT_DIMENSI_TEMAN_SEJAWAT: DimensiAsesmenItem[] = [
  { id: 'dim-1', nama: 'Kerja Sama & Kekompakan Tim' },
  { id: 'dim-2', nama: 'Sportivitas & Fair Play' },
  { id: 'dim-3', nama: 'Komunikasi Saling Mendukung' },
  { id: 'dim-4', nama: 'Tanggung Jawab dalam Peran Kelompok' },
];

export function safeStringTrim(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

const DEFAULT_QUIZ_SOAL: Soal[] = [
  {
    id: 'soal-1',
    quizId: 'qz-1',
    nomor: 1,
    pertanyaan:
      'Ketika seorang pemain menerima smash keras lawan, mengapa posisi tangan passing bawah harus dikunci lurus dan siku tidak boleh tertekuk?',
    tipe: 'Pilihan Ganda',
    kategoriSoal: 'HOTS',
    pilihan: [
      'Agar pantulan bola stabil dan arah lambungan mudah dikontrol ke arah setter',
      'Agar bola langsung kembali ke lapangan lawan tanpa disentuh setter',
      'Untuk menghindari terjadinya pelanggaran double touch oleh wasit',
      'Agar kecepatan bola meningkat tajam saat memantul ke atas',
      'Untuk meredam kekuatan smash tanpa mengubah arah lintas bola',
    ],
    kunciJawaban: 'Agar pantulan bola stabil dan arah lambungan mudah dikontrol ke arah setter',
    pembahasan:
      'Siku yang dikunci lurus menciptakan bidang datar solid pada lengan bawah, meminimalkan getaran dan menghasilkan pantulan elastis yang terarah.',
    bobot: 20,
  },
  {
    id: 'soal-2',
    quizId: 'qz-1',
    nomor: 2,
    pertanyaan:
      'Dalam sistem rotasi bola voli modern, rotasi dilakukan searah jarum jam setiap kali regu penerima servis berhasil mematikan bola lawan dan merebut hak servis.',
    tipe: 'Benar/Salah',
    kategoriSoal: 'AKM',
    pilihan: ['Benar', 'Salah'],
    kunciJawaban: 'Benar',
    pembahasan:
      'Rotasi searah jarum jam (posisi 1 ke 6, 6 ke 5, dst) dilakukan saat tim berhasil merebut hak servis dari lawan.',
    bobot: 15,
  },
  {
    id: 'soal-3',
    quizId: 'qz-1',
    nomor: 3,
    pertanyaan:
      'Cocokkan gambar teknik olahraga di bawah ini dengan nama teknik gerak dasar yang paling tepat!',
    tipe: 'Mencocokkan Gambar',
    kategoriSoal: 'HOTS',
    gambarUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
    pilihan: [
      'Passing Bawah Bola Voli',
      'Smash Keras Menukik',
      'Block / Bendungan Net',
      'Servis Atas Mengapung',
      'Passing Atas (Set Up)',
    ],
    kunciJawaban: 'Passing Bawah Bola Voli',
    pembahasan:
      'Gambar menunjukkan posisi kedua tangan rapat lurus ke depan bawah dengan lutut sedikit ditekuk untuk menerima bola.',
    matchingPairs: [
      {
        id: 'mp-1',
        left: 'Passing Bawah',
        right: 'Menerima servis dan smash lawan di depan bawah',
        imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'mp-2',
        left: 'Lay-Up Shoot',
        right: 'Tembakan melayang dua langkah ke papan pantul basket',
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'mp-3',
        left: 'Smash Bulutangkis',
        right: 'Pukulan overhead keras menukik tajam ke area lawan',
        imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&auto=format&fit=crop&q=80',
      },
    ],
    bobot: 25,
  },
  {
    id: 'soal-4',
    quizId: 'qz-1',
    nomor: 4,
    pertanyaan:
      'Tarik garis / jodohkan peran pemain bola voli (Kolom A) dengan tugas taktis utamanya di lapangan (Kolom B)!',
    tipe: 'Tarik Garis',
    kategoriSoal: 'AKM',
    pilihan: [],
    matchingPairs: [
      { left: 'Tosser / Setter', right: 'Mengatur serangan dan mengumpan bola matang untuk spiker' },
      { left: 'Libero', right: 'Pemain bertahan murni, dilarang menyerang dan servis' },
      { left: 'Spiker / Smasher', right: 'Mengeksekusi bola di atas net untuk mencetak poin serangan' },
      { left: 'Blocker', right: 'Membendung serangan smash lawan di dekat bibir net' },
    ],
    kunciJawaban: 'Tosser=Mengatur serangan, Libero=Pemain bertahan murni, Spiker=Mengeksekusi bola, Blocker=Membendung serangan',
    pembahasan:
      'Setiap posisi dalam bola voli memiliki spesialisasi peran yang saling melengkapi dalam formasi taktik regu.',
    bobot: 25,
  },
  {
    id: 'soal-5',
    quizId: 'qz-1',
    nomor: 5,
    pertanyaan:
      'Berapa jumlah sentuhan maksimal yang diperbolehkan bagi satu regu sebelum bola harus diseberangkan ke daerah lawan (tidak termasuk sentuhan bendungan/block)?',
    tipe: 'Pilihan Ganda',
    kategoriSoal: 'Standar',
    pilihan: [
      '1 kali sentuhan langsung',
      '2 kali sentuhan beruntun',
      '3 kali sentuhan tim',
      '4 kali sentuhan bebas',
      '5 kali sentuhan dalam reli panjang',
    ],
    kunciJawaban: '3 kali sentuhan tim',
    pembahasan:
      'Berdasarkan regulasi resmi FIVB, satu tim berhak menyentuh bola maksimal 3 kali sebelum melewati net.',
    bobot: 15,
  },
  {
    id: 'soal-6',
    quizId: 'qz-1',
    nomor: 6,
    pertanyaan:
      'Pada saat mendarat setelah melakukan loncatan smash atau block bola voli, sendi manakah yang harus ditekuk untuk meredam gaya tumbukan (shock absorption) agar mencegah cedera ligamen lutut?',
    tipe: 'Isian',
    kategoriSoal: 'HOTS',
    pilihan: [],
    kunciJawaban: 'Lutut dan pergelangan kaki',
    pembahasan:
      'Fleksi sendi lutut (knee flexion) bersama sendi pergelangan kaki (ankle) dan panggul bertindak sebagai peredam kejut mekanis tubuh (deceleration phase). Mendarat dengan tungkai kaku atau lurus meningkatkan risiko cedera robekan ligamen ACL secara drastis.',
    bobot: 20,
  },
];

export const INITIAL_CLASSES: Kelas[] = [
  {
    id: 'cls-x-1',
    nama: 'X 1',
    tingkat: 'X',
    waliKelasId: 'usr-admin-1',
    waliKelasNama: 'Administrator',
    guruPengampuId: 'usr-admin-1',
    guruPengampuNama: 'Administrator',
    tahunPelajaran: '2026/2027',
    totalMurid: 0,
  },
  {
    id: 'cls-xii-1',
    nama: 'XII 1',
    tingkat: 'XII',
    waliKelasId: 'usr-admin-1',
    waliKelasNama: 'Administrator',
    guruPengampuId: 'usr-admin-1',
    guruPengampuNama: 'Administrator',
    tahunPelajaran: '2026/2027',
    totalMurid: 0,
  },
];

export const INITIAL_DATABASE: LMSDatabase = {
  settings: {
    namaSekolah: 'SMA Negeri 1 Tejakula (SMANSAKA)',
    logoSekolah: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=150&auto=format&fit=crop&q=80',
    tahunPelajaran: '2026/2027',
    semester: 'Ganjil',
    namaKepalaSekolah: 'Nyoman Sukrada, S.Pd., M.Pd.',
    nipKepalaSekolah: '19680105 199103 1 020',
    namaGuruPJOKUtama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nipGuruPJOKUtama: '19881115 202221 1 012',
    mataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    temaWarna: 'Biru & Hijau Sportif',
    terakhirSinkron: new Date().toISOString(),
  },
  users: DEFAULT_USERS,
  kelas: INITIAL_CLASSES,
  mataPelajaran: [],
  materi: [],
  tugas: [],
  pengumpulanTugas: [],
  quiz: [],
  jawabanQuiz: [],
  penilaianPraktik: [],
  presensi: [],
  jurnal: [],
  notifikasi: [],
  pengumuman: [],
  nilai: [],
  refleksi: [],
  jawabanRefleksi: [],
  materiPraktikList: [],
  pengajuanIzin: [],
  penilaianSikap: [],
  penilaianTemanSejawat: [],
  penilaianHarian: [],
  pendampinganMurid: [],
  trashUsers: [],
  isCleanSlate: true,
  cleanSlateTimestamp: new Date().toISOString(),
  isNilaiPresensiReset: true,
  activityLogs: [
    {
      id: 'log-sys-init',
      timestamp: new Date().toISOString(),
      category: 'DB_SYNC',
      actorName: 'Sistem Audit LMS',
      actorRole: 'SYSTEM',
      action: 'Inisialisasi Sistem & Modul Log Aktivitas',
      details: 'Audit trail aktif. Mencatat seluruh aktivitas login pengguna dan modifikasi basis data.',
      status: 'INFO',
    },
  ],
};

export type FirestoreSyncStatus = 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

/**
 * Deduplikasi data murid agar tidak terjadi penumpukan nama/duplikasi ganda.
 * Mengidentifikasi kesamaan berdasarkan NIS atau Nama + Kelas.
 */
export function deduplicateMuridList(users: User[]): {
  cleanUsers: User[];
  idReplacements: Map<string, string>;
} {
  const cleanUsers: User[] = [];
  const idReplacements = new Map<string, string>();
  const seenMap = new Map<string, User>();

  for (const u of users) {
    if (u.role !== 'MURID') {
      cleanUsers.push(u);
      continue;
    }

    const cleanNis = safeStringTrim(u.nis || u.nip).toLowerCase();
    const cleanName = safeStringTrim(u.name).toLowerCase();
    const cleanKelas = safeStringTrim(u.kelasId).toLowerCase();

    // Matching key priority:
    // 1. If non-empty NIS exists: "nis:" + cleanNis
    // 2. Otherwise: "name_kelas:" + cleanName + ":" + cleanKelas
    let matchKey = '';
    if (cleanNis) {
      matchKey = `nis:${cleanNis}`;
    } else if (cleanName) {
      matchKey = `name_kelas:${cleanName}:${cleanKelas}`;
    }

    if (!matchKey) {
      cleanUsers.push(u);
      continue;
    }

    if (seenMap.has(matchKey)) {
      const canonical = seenMap.get(matchKey)!;
      // Record ID replacement
      if (u.id !== canonical.id) {
        idReplacements.set(u.id, canonical.id);
      }
      // Merge richer fields
      if (!canonical.nis && u.nis) canonical.nis = u.nis;
      if (!canonical.nisn && u.nisn) canonical.nisn = u.nisn;
      if ((!canonical.kelasId || canonical.kelasId === '') && u.kelasId) canonical.kelasId = u.kelasId;
      if (!canonical.avatar && u.avatar) canonical.avatar = u.avatar;
      if (!canonical.email && u.email) canonical.email = u.email;
      if (u.status === 'Aktif') canonical.status = 'Aktif';
      if (u.password && (!canonical.password || canonical.password === '123456')) {
        canonical.password = u.password;
      }
    } else {
      seenMap.set(matchKey, u);
      if (cleanNis && cleanName) {
        seenMap.set(`name_kelas:${cleanName}:${cleanKelas}`, u);
        if (cleanKelas) {
          seenMap.set(`name_kelas:${cleanName}:`, u);
        }
      }
      cleanUsers.push(u);
    }
  }

  return { cleanUsers, idReplacements };
}

class DataStorageService {
  private db: LMSDatabase;
  private listeners: Array<(db: LMSDatabase) => void> = [];
  private syncStatus: FirestoreSyncStatus = 'connecting';
  private lastSyncTime: Date | null = null;
  private statusListeners: Array<(status: FirestoreSyncStatus, lastSync?: Date | null) => void> = [];
  private isApplyingRemoteUpdate = false;
  private isSyncingToFirestore = false;
  private unsubscribeFirestore: Unsubscribe | null = null;

  constructor() {
    const CLEAN_KEY = 'lms_hard_clean_v6_done';
    if (typeof window !== 'undefined') {
      try {
        if (localStorage.getItem(CLEAN_KEY) !== 'yes') {
          // Remove old storage versions
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('lms_pjok_db_') || k.startsWith('lms_pengajuan_') || k === 'lms_pjok_current_user')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          sessionStorage.clear();
          localStorage.setItem(CLEAN_KEY, 'yes');
        }
      } catch (e) {}
    }

    this.db = this.loadFromLocalStorage();

    // Pastikan data murid kosong awal sesuai permintaan user agar bisa diisi bersih melalui import CSV/Excel
    if (typeof window !== 'undefined') {
      try {
        const MURID_CLEAN_FLAG = 'lms_murid_cleaned_for_import_v8';
        if (localStorage.getItem(MURID_CLEAN_FLAG) !== 'done') {
          this.db.users = (this.db.users || []).filter(
            (u) => !(u.role === 'MURID' && (u.id === 'usr-murid-1' || u.id === 'usr-murid-2' || u.id === 'usr-murid-3'))
          );
          if (!Array.isArray(this.db.trashUsers)) {
            this.db.trashUsers = [];
          }
          this.saveToLocalStorage(this.db);
          localStorage.setItem(MURID_CLEAN_FLAG, 'done');
        }
      } catch (e) {}
    }

    this.initFirestoreSync();
  }

  /**
   * Mengosongkan seluruh rekap nilai (tugas, kuis, praktik) dan riwayat absensi
   * Murid, Guru, Kelas, Materi, dan Tugas tetap aman tersimpan.
   */
  public resetNilaiDanPresensi(notifyUser: boolean = true): void {
    this.updateDatabase((prev) => ({
      ...prev,
      nilai: [],
      presensi: [],
      penilaianPraktik: [],
      penilaianSikap: [],
      penilaianTemanSejawat: [],
      penilaianHarian: [],
      jawabanQuiz: [],
      pengumpulanTugas: [],
      isNilaiPresensiReset: true,
      notifikasi: notifyUser
        ? [
            {
              id: `notif-reset-nilai-${Date.now()}`,
              judul: 'Nilai dan Absensi Direset ke Nol',
              pesan: 'Seluruh rekap nilai dan riwayat absensi telah dikosongkan. Siap mulai mengisi dari nol.',
              tipe: 'pengumuman',
              waktu: 'Baru saja',
              dibaca: false,
            },
            ...(prev.notifikasi || []),
          ]
        : prev.notifikasi,
    }));
    this.seedAllToFirestore();
  }

  /**
   * Memperbarui relasi ID murid pada tabel presensi, nilai, kuis, tugas, dan izin
   * ketika terjadi penyatuan (merging) ID duplikat.
   */
  private remapMuridIdsInDb(idReplacements: Map<string, string>, targetDb?: LMSDatabase): void {
    if (idReplacements.size === 0) return;
    const db = targetDb || this.db;

    const remap = (id: string | undefined): string => {
      if (!id) return '';
      return idReplacements.get(id) || id;
    };

    if (Array.isArray(db.presensi)) {
      db.presensi = db.presensi.map((p) => ({
        ...p,
        muridId: remap(p.muridId),
      }));
    }

    if (Array.isArray(db.penilaianPraktik)) {
      db.penilaianPraktik = db.penilaianPraktik.map((p) => ({
        ...p,
        muridId: remap(p.muridId),
      }));
    }

    if (Array.isArray(db.penilaianSikap)) {
      db.penilaianSikap = db.penilaianSikap.map((p) => ({
        ...p,
        muridId: remap(p.muridId),
      }));
    }

    if (Array.isArray(db.penilaianTemanSejawat)) {
      db.penilaianTemanSejawat = db.penilaianTemanSejawat.map((p) => ({
        ...p,
        penilaiId: remap(p.penilaiId),
        targetMuridId: remap(p.targetMuridId),
      }));
    }

    if (Array.isArray(db.nilai)) {
      db.nilai = db.nilai.map((n) => ({
        ...n,
        muridId: remap(n.muridId),
      }));
    }

    if (Array.isArray(db.pengajuanIzin)) {
      db.pengajuanIzin = db.pengajuanIzin.map((i) => ({
        ...i,
        muridId: remap(i.muridId),
      }));
    }

    if (Array.isArray(db.pengumpulanTugas)) {
      db.pengumpulanTugas = db.pengumpulanTugas.map((peng) => ({
        ...peng,
        muridId: remap(peng.muridId),
      }));
    }

    if (Array.isArray(db.jawabanQuiz)) {
      db.jawabanQuiz = db.jawabanQuiz.map((j) => ({
        ...j,
        muridId: remap(j.muridId),
      }));
    }
  }

  /**
   * Membersihkan seluruh duplikasi murid yang menumpuk di database lokal dan cloud.
   */
  public cleanDuplicateUsers(): { removedCount: number } {
    const beforeCount = this.db.users.filter((u) => u.role === 'MURID').length;
    const { cleanUsers, idReplacements } = deduplicateMuridList(this.db.users);
    const afterCount = cleanUsers.filter((u) => u.role === 'MURID').length;
    const removedCount = beforeCount - afterCount;

    if (removedCount > 0 || idReplacements.size > 0) {
      this.remapMuridIdsInDb(idReplacements);
      this.db.users = cleanUsers;
      this.saveToLocalStorage(this.db);
      this.notifyLocalListeners();
      this.syncChangesToFirestore(this.db, this.db);
    }
    return { removedCount };
  }

  /**
   * Menginisialisasi pendengar real-time Firestore agar perubahan di satu perangkat
   * (misal laptop guru) langsung otomatis diterima di perangkat lain (misal HP murid)
   * serta mendukung mode Standby / Offline tanpa gangguan.
   */
  private async initFirestoreSync() {
    try {
      // Pasang deteksi status jaringan browser
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          console.info('Koneksi internet terdeteksi online. Memulai sinkronisasi otomatis Cloud Firestore...');
          this.updateSyncStatus('syncing');
          this.forceRefreshFromFirestore().catch(() => {});
        });

        window.addEventListener('offline', () => {
          console.warn('Mode Standby / Offline aktif. Data tersimpan aman di IndexedDB & LocalStorage.');
          this.updateSyncStatus('offline');
        });
      }

      // Pastikan ada sesi autentikasi Firebase di background
      if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => {
          console.info('Anonymous sign-in status:', err?.code || 'bypassed');
        });
      }

      this.updateSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connecting');
      const recordsCol = collection(firestore, 'lms_records');

      // Pasang listener real-time onSnapshot dengan includeMetadataChanges untuk mendeteksi cache & server state
      this.unsubscribeFirestore = onSnapshot(
        recordsCol,
        { includeMetadataChanges: true },
        (snapshot) => {
          this.lastSyncTime = new Date();
          const isFromCache = snapshot.metadata.fromCache;
          const hasPendingWrites = snapshot.metadata.hasPendingWrites;

          if (snapshot.empty) {
            console.log('Firestore masih kosong, mengunggah data inisial sistem ke Firestore...');
            this.seedAllToFirestore();
            return;
          }

          // Jangan timpa jika sedang dalam proses upload lokal kita sendiri
          if (this.isSyncingToFirestore) {
            this.updateSyncStatus(isFromCache && typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
            return;
          }

          this.isApplyingRemoteUpdate = true;
          try {
            const incoming: Partial<LMSDatabase> = {};
            let hasIncomingData = false;

            snapshot.forEach((docSnap) => {
              const docId = docSnap.id;
              const data = docSnap.data();

              if (docId === 'settings' && data?.data) {
                const s = { ...data.data };
                if (!s.namaSekolah || s.namaSekolah.includes('Kintamani')) {
                  s.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
                }
                incoming.settings = { ...this.db.settings, ...s };
                hasIncomingData = true;
              } else if (data && Array.isArray(data.items)) {
                if (docId === 'pengajuanIzin') {
                  const serverItems: PengajuanIzin[] = data.items;
                  const localItems: PengajuanIzin[] = Array.isArray(this.db.pengajuanIzin) ? this.db.pengajuanIzin : [];
                  const map = new Map<string, PengajuanIzin>();
                  serverItems.forEach((it) => map.set(it.id, it));
                  localItems.forEach((it) => {
                    if (!map.has(it.id)) map.set(it.id, it);
                  });
                  incoming.pengajuanIzin = Array.from(map.values());
                } else if (docId === 'presensi') {
                  const serverItems: PresensiRecord[] = data.items;
                  const localItems: PresensiRecord[] = Array.isArray(this.db.presensi) ? this.db.presensi : [];
                  const map = new Map<string, PresensiRecord>();
                  serverItems.forEach((it) => map.set(it.id, it));
                  localItems.forEach((it) => {
                    if (!map.has(it.id)) map.set(it.id, it);
                  });
                  incoming.presensi = Array.from(map.values());
                } else if (docId === 'users') {
                  const serverUsers: User[] = Array.isArray(data.items) ? data.items : [];
                  
                  // Filter out any user IDs currently in trash so deleted users are never resurrected
                  const currentTrashIds = new Set<string>();
                  (this.db.trashUsers || []).forEach((t) => {
                    if (t.id) currentTrashIds.add(t.id);
                    if (t.user?.id) currentTrashIds.add(t.user.id);
                  });

                  let filtered = serverUsers.filter((u) => {
                    if (currentTrashIds.has(u.id)) return false;
                    if (u.id === 'usr-guru-1' || u.id === 'usr-guru-2' || u.id === 'usr-guru-3') return false;
                    if (u.username === 'guru' || u.username === 'ratna' || u.username === 'haryono') return false;
                    if (u.id === 'usr-murid-1' || u.id === 'usr-murid-2' || u.id === 'usr-murid-3') return false;
                    if (u.username === 'murid' || u.username === 'murid1' || u.username === 'murid2') return false;
                    if (u.name === 'Gede Aditya Pratama' || u.name === 'Ni Kadek Dwi Lestari' || u.name === 'I Made Yoga Mahendra') return false;
                    if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') return false;
                    return Boolean(u.id && u.name);
                  });

                  // Ensure admin account exists
                  const hasAdmin = filtered.some((u) => u.id === 'usr-admin-1' || u.username === 'admin');
                  if (!hasAdmin) {
                    const adminUser = DEFAULT_USERS.find((u) => u.role === 'ADMIN');
                    if (adminUser) filtered.unshift(adminUser);
                  }

                  // Guarantee student accounts are in an active, login-ready state
                  filtered = filtered.map((u) => {
                    if (u.role === 'MURID') {
                      const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip);
                      return {
                        ...u,
                        status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
                        password: u.password || '123456',
                        kelasId: u.kelasId === 'cls-xi-1' || u.kelasId === 'cls-xi-2' ? '' : (u.kelasId || ''),
                        nis: cleanNis,
                      };
                    }
                    return u;
                  });

                  // Deduplicate to guarantee no stacking of same names
                  const { cleanUsers, idReplacements } = deduplicateMuridList(filtered);
                  if (idReplacements.size > 0) {
                    this.remapMuridIdsInDb(idReplacements);
                  }

                  incoming.users = cleanUsers;
                } else if (docId === 'kelas') {
                  const serverKelas: Kelas[] = Array.isArray(data.items) ? data.items : [];
                  const filtered = serverKelas.filter((k) => k.id !== 'cls-xi-1' && k.id !== 'cls-xi-2' && !/^cls-(x|xi|xii)-\d+$/.test(k.id));
                  incoming.kelas = filtered;
                } else if (docId === 'mataPelajaran') {
                  const serverMp: MataPelajaran[] = Array.isArray(data.items) ? data.items : [];
                  const filtered = serverMp.filter((m) => !/^mp-pjok-(x|xi|xii)$/.test(m.id));
                  incoming.mataPelajaran = filtered;
                } else if (['materi', 'tugas', 'quiz', 'jurnal', 'notifikasi', 'pengumuman', 'refleksi', 'penilaianPraktik'].includes(docId)) {
                  // Filter out legacy mock demo items so empty slate is respected
                  const legacyMockIds = new Set([
                    'mat-1', 'mat-2', 'mat-3', 'mat-4',
                    'tug-1', 'tug-2',
                    'qz-1',
                    'jrn-1',
                    'notif-1', 'notif-2', 'notif-3', 'notif-4',
                    'ann-1', 'ann-2',
                    'ref-1', 'ref-2',
                    'pen-1', 'pen-2',
                  ]);
                  const filtered = Array.isArray(data.items)
                    ? (data.items as any[]).filter((item) => !legacyMockIds.has(item.id))
                    : [];
                  (incoming as any)[docId] = filtered;
                } else {
                  (incoming as any)[docId] = data.items;
                }
                hasIncomingData = true;
              }
            });

            if (hasIncomingData) {
              const currentNamaSekolah = incoming.settings?.namaSekolah || this.db.settings?.namaSekolah;
              const cleanNamaSekolah =
                !currentNamaSekolah || currentNamaSekolah.includes('Kintamani')
                  ? 'SMA Negeri 1 Tejakula (SMANSAKA)'
                  : currentNamaSekolah;

              this.db = {
                ...this.db,
                ...incoming,
                settings: {
                  ...(incoming.settings || this.db.settings),
                  namaSekolah: cleanNamaSekolah,
                },
              };

              this.saveToLocalStorage(this.db);
              this.notifyLocalListeners();
            }

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              this.updateSyncStatus('offline');
            } else if (hasPendingWrites) {
              this.updateSyncStatus('syncing');
            } else {
              this.updateSyncStatus('synced');
            }
          } catch (err) {
            console.error('Gagal menerapkan update real-time dari Firestore:', err);
            this.updateSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
          } finally {
            this.isApplyingRemoteUpdate = false;
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot notice (offline fallback active):', error?.message || error);
          this.updateSyncStatus('offline');
          if (
            error?.code === 'permission-denied' ||
            error?.message?.includes('Missing or insufficient permissions')
          ) {
            handleFirestoreError(error, OperationType.GET, 'lms_records');
          }
        }
      );
    } catch (error) {
      console.warn('Gagal menghubungkan listener real-time Firestore:', error);
      this.updateSyncStatus('offline');
    }
  }

  /**
   * Mengunggah seluruh data inisial ke Firestore (digunakan saat koleksi baru dibuat)
   */
  public async seedAllToFirestore(): Promise<void> {
    try {
      this.updateSyncStatus('syncing');
      const sections: (keyof LMSDatabase)[] = [
        'settings',
        'users',
        'kelas',
        'mataPelajaran',
        'materi',
        'tugas',
        'pengumpulanTugas',
        'quiz',
        'jawabanQuiz',
        'penilaianPraktik',
        'presensi',
        'jurnal',
        'notifikasi',
        'pengumuman',
        'nilai',
        'refleksi',
        'jawabanRefleksi',
        'materiPraktikList',
        'pengajuanIzin',
        'penilaianSikap',
        'penilaianTemanSejawat',
        'dimensiTemanSejawat',
        'penilaianHarian',
        'pendampinganMurid',
        'trashUsers',
        'activityLogs',
      ];

      for (const sec of sections) {
        const docRef = doc(firestore, 'lms_records', sec);
        const rawVal = this.db[sec] || [];
        const cleanVal = JSON.parse(JSON.stringify(rawVal));

        const payload =
          sec === 'settings'
            ? { data: cleanVal, section: sec, updatedAt: new Date().toISOString() }
            : { items: cleanVal, section: sec, updatedAt: new Date().toISOString() };

        await setDoc(docRef, payload);
      }

      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
      console.log('Seluruh database awal berhasil disinkronkan ke Firestore cloud.');
    } catch (err) {
      console.error('Gagal melakukan seed database ke Firestore:', err);
      this.updateSyncStatus('error');
    }
  }

  /**
   * Sinkronkan bagian yang berubah ke Firestore secara otomatis
   */
  private async syncChangesToFirestore(prev: LMSDatabase, next: LMSDatabase) {
    if (this.isApplyingRemoteUpdate) {
      return;
    }

    try {
      this.isSyncingToFirestore = true;
      this.updateSyncStatus('syncing');

      const sections: (keyof LMSDatabase)[] = [
        'settings',
        'users',
        'kelas',
        'mataPelajaran',
        'materi',
        'tugas',
        'pengumpulanTugas',
        'quiz',
        'jawabanQuiz',
        'penilaianPraktik',
        'presensi',
        'jurnal',
        'notifikasi',
        'pengumuman',
        'nilai',
        'refleksi',
        'jawabanRefleksi',
        'materiPraktikList',
        'pengajuanIzin',
        'penilaianSikap',
        'penilaianTemanSejawat',
        'dimensiTemanSejawat',
        'penilaianHarian',
        'pendampinganMurid',
        'trashUsers',
        'activityLogs',
      ];

      const changedSections = sections.filter((sec) => prev[sec] !== next[sec]);

      for (const sec of changedSections) {
        const docRef = doc(firestore, 'lms_records', sec);
        const rawVal = next[sec] ?? (sec === 'settings' ? {} : []);
        const cleanVal = JSON.parse(JSON.stringify(rawVal));

        const payload =
          sec === 'settings'
            ? { data: cleanVal, section: sec, updatedAt: new Date().toISOString() }
            : { items: cleanVal, section: sec, updatedAt: new Date().toISOString() };

        await setDoc(docRef, payload, { merge: true });
      }

      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
    } catch (err: any) {
      console.warn('Gagal sinkronisasi ke Firestore (data tetap aman di penyimpanan lokal):', err?.message || err);
      this.updateSyncStatus('offline');
      if (
        err?.code === 'permission-denied' ||
        err?.message?.includes('Missing or insufficient permissions')
      ) {
        handleFirestoreError(err, OperationType.WRITE, 'lms_records');
      }
    } finally {
      this.isSyncingToFirestore = false;
    }
  }

  private updateSyncStatus(status: FirestoreSyncStatus) {
    this.syncStatus = status;
    this.statusListeners.forEach((l) => l(status, this.lastSyncTime));
  }

  public getSyncStatus(): FirestoreSyncStatus {
    return this.syncStatus;
  }

  public getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  public onSyncStatusChange(
    listener: (status: FirestoreSyncStatus, lastSync?: Date | null) => void
  ): () => void {
    this.statusListeners.push(listener);
    listener(this.syncStatus, this.lastSyncTime);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  public async forceRefreshFromFirestore(): Promise<void> {
    try {
      this.updateSyncStatus('syncing');
      const recordsCol = collection(firestore, 'lms_records');
      const snapshot = await getDocs(recordsCol);

      if (!snapshot.empty) {
        const incoming: Partial<LMSDatabase> = {};
        snapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          const data = docSnap.data();
          if (docId === 'settings' && data?.data) {
            incoming.settings = data.data;
          } else if (data && Array.isArray(data.items)) {
            if (docId === 'pengajuanIzin') {
              const serverItems: PengajuanIzin[] = data.items;
              const localItems: PengajuanIzin[] = Array.isArray(this.db.pengajuanIzin) ? this.db.pengajuanIzin : [];
              const map = new Map<string, PengajuanIzin>();
              serverItems.forEach((it) => map.set(it.id, it));
              localItems.forEach((it) => {
                if (!map.has(it.id)) map.set(it.id, it);
              });
              incoming.pengajuanIzin = Array.from(map.values());
            } else if (docId === 'presensi') {
              const serverItems: PresensiRecord[] = data.items;
              const localItems: PresensiRecord[] = Array.isArray(this.db.presensi) ? this.db.presensi : [];
              const map = new Map<string, PresensiRecord>();
              serverItems.forEach((it) => map.set(it.id, it));
              localItems.forEach((it) => {
                if (!map.has(it.id)) map.set(it.id, it);
              });
              incoming.presensi = Array.from(map.values());
            } else if (docId === 'users') {
              const serverUsers: User[] = Array.isArray(data.items) ? data.items : [];

              // Filter out any user IDs currently in trash so deleted users are not resurrected
              const currentTrashIds = new Set<string>();
              (this.db.trashUsers || []).forEach((t) => {
                if (t.id) currentTrashIds.add(t.id);
                if (t.user?.id) currentTrashIds.add(t.user.id);
              });

              let filtered = serverUsers.filter((u) => {
                if (currentTrashIds.has(u.id)) return false;
                if (u.id === 'usr-guru-1' || u.id === 'usr-guru-2' || u.id === 'usr-guru-3') return false;
                if (u.username === 'guru' || u.username === 'ratna' || u.username === 'haryono') return false;
                if (u.id === 'usr-murid-1' || u.id === 'usr-murid-2' || u.id === 'usr-murid-3') return false;
                if (u.username === 'murid' || u.username === 'murid1' || u.username === 'murid2') return false;
                if (u.name === 'Gede Aditya Pratama' || u.name === 'Ni Kadek Dwi Lestari' || u.name === 'I Made Yoga Mahendra') return false;
                if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') return false;
                return Boolean(u.id && u.name);
              });

              // Ensure admin exists
              const hasAdmin = filtered.some((u) => u.id === 'usr-admin-1' || u.username === 'admin');
              if (!hasAdmin) {
                const adminUser = DEFAULT_USERS.find((u) => u.role === 'ADMIN');
                if (adminUser) filtered.unshift(adminUser);
              }

              filtered = filtered.map((u) => {
                if (u.role === 'MURID') {
                  const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip);
                  return {
                    ...u,
                    status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
                    password: u.password || '123456',
                    kelasId: u.kelasId === 'cls-xi-1' || u.kelasId === 'cls-xi-2' ? '' : (u.kelasId || ''),
                    nis: cleanNis,
                  };
                }
                return u;
              });

              // Deduplicate to guarantee no stacking of same names
              const { cleanUsers, idReplacements } = deduplicateMuridList(filtered);
              if (idReplacements.size > 0) {
                this.remapMuridIdsInDb(idReplacements);
              }

              incoming.users = cleanUsers;
            } else if (['materi', 'tugas', 'quiz', 'jurnal', 'notifikasi', 'pengumuman', 'refleksi', 'penilaianPraktik'].includes(docId)) {
              const filtered = (data.items || []).filter((item: any) => {
                if (!item) return false;
                const j = (item.judul || item.topik || item.materi || '').toLowerCase();
                const g = (item.guruNama || '').toLowerCase();
                if (j.includes('demo') || j.includes('contoh template') || g.includes('ratna') || g.includes('haryono')) {
                  return false;
                }
                return true;
              });
              (incoming as any)[docId] = filtered;
            } else {
              (incoming as any)[docId] = data.items;
            }
          }
        });

        this.db = {
          ...this.db,
          ...incoming,
          settings: incoming.settings || this.db.settings,
        };
        this.saveToLocalStorage(this.db);
        this.notifyLocalListeners();
      }
      this.lastSyncTime = new Date();
      this.updateSyncStatus('synced');
    } catch (err: any) {
      console.error('Gagal mengambil data paksa dari Firestore:', err?.message || err);
      this.updateSyncStatus('error');
      if (
        err?.code === 'permission-denied' ||
        err?.message?.includes('Missing or insufficient permissions')
      ) {
        handleFirestoreError(err, OperationType.LIST, 'lms_records');
      }
    }
  }

  public getCurrentUser(): User | null {
    try {
      const savedUser = localStorage.getItem('lms_pjok_current_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (
          !u ||
          !u.id ||
          u?.id === 'usr-guru-2' ||
          u?.id === 'usr-guru-3' ||
          u?.username === 'ratna' ||
          u?.username === 'haryono'
        ) {
          this.clearCurrentUser();
          return null;
        }
        return u;
      }
    } catch (e) {
      // fallback
    }
    return null;
  }

  public setCurrentUser(user: User | null) {
    try {
      if (user) {
        localStorage.setItem('lms_pjok_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('lms_pjok_current_user');
      }
    } catch (e) {
      console.error('Failed to save current user:', e);
    }
  }

  public clearCurrentUser() {
    try {
      localStorage.removeItem('lms_pjok_current_user');
      sessionStorage.removeItem('lms_pjok_session_active');
    } catch (e) {
      console.error('Failed to clear current user:', e);
    }
  }

  public resetToDefault() {
    this.resetToDefaults();
  }

  private loadFromLocalStorage(): LMSDatabase {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        let loadedUsers: User[] = Array.isArray(parsed?.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_USERS;
        // Filter out default/demo teachers and murid (keep only admin and user-uploaded accounts)
        loadedUsers = loadedUsers.filter((u) => {
          if (u.id === 'usr-guru-1' || u.id === 'usr-guru-2' || u.id === 'usr-guru-3') return false;
          if (u.username === 'guru' || u.username === 'ratna' || u.username === 'haryono') return false;
          if (u.id === 'usr-murid-1' || u.id === 'usr-murid-2' || u.id === 'usr-murid-3') return false;
          if (u.username === 'murid' || u.username === 'murid1' || u.username === 'murid2') return false;
          if (u.name === 'Gede Aditya Pratama' || u.name === 'Ni Kadek Dwi Lestari' || u.name === 'I Made Yoga Mahendra') return false;
          if (u.name === 'Ratna Sartika, S.Pd.' || u.name === 'Haryono, S.Pd.Jas') return false;
          if (!u.id || !u.name) return false;
          return true;
        });

        // Ensure default staff accounts are present
        const hasAdmin = loadedUsers.some((u) => u.id === 'usr-admin-1' || u.username === 'admin');
        if (!hasAdmin) {
          const adminUser = DEFAULT_USERS.find((u) => u.role === 'ADMIN');
          if (adminUser) loadedUsers.unshift(adminUser);
        }

        // Guarantee all student accounts are active, have password and valid class assignment
        loadedUsers = loadedUsers.map((u) => {
          if (u.role === 'MURID') {
            const cleanNis = safeStringTrim(u.nis) || safeStringTrim(u.nip);
            return {
              ...u,
              status: u.status === 'Nonaktif' ? 'Aktif' : (u.status || 'Aktif'),
              password: u.password || '123456',
              kelasId: u.kelasId === 'cls-xi-1' || u.kelasId === 'cls-xi-2' ? '' : (u.kelasId || ''),
              nis: cleanNis,
            };
          }
          return u;
        });

        // Deduplicate murid on load so stacked names are automatically eliminated
        const { cleanUsers, idReplacements } = deduplicateMuridList(loadedUsers);
        loadedUsers = cleanUsers;
        if (idReplacements.size > 0 && parsed) {
          this.remapMuridIdsInDb(idReplacements, parsed);
        }

        // Exclude cls-xi-1, cls-xi-2 and mock classes
        let loadedKelas: Kelas[] = Array.isArray(parsed?.kelas) ? parsed.kelas : [];
        loadedKelas = loadedKelas.filter((k) => k.id !== 'cls-xi-1' && k.id !== 'cls-xi-2' && !/^cls-(x|xi|xii)-\d+$/.test(k.id));
        if (loadedKelas.length === 0) {
          loadedKelas = INITIAL_CLASSES;
        }

        // Exclude legacy demo subjects
        let loadedMp: MataPelajaran[] = Array.isArray(parsed?.mataPelajaran) ? parsed.mataPelajaran : [];
        loadedMp = loadedMp.filter((m) => !/^mp-pjok-(x|xi|xii)$/.test(m.id));

        // Filter mock IDs from educational content
        const legacyMockIds = new Set([
          'mat-1', 'mat-2', 'mat-3', 'mat-4',
          'tug-1', 'tug-2',
          'qz-1',
          'jrn-1',
          'notif-1', 'notif-2', 'notif-3', 'notif-4',
          'ann-1', 'ann-2',
          'ref-1', 'ref-2',
          'pen-1', 'pen-2',
        ]);

        const loadedMateri = (Array.isArray(parsed?.materi) ? parsed.materi : []).filter((m: any) => !legacyMockIds.has(m.id));
        const loadedTugas = (Array.isArray(parsed?.tugas) ? parsed.tugas : []).filter((t: any) => !legacyMockIds.has(t.id));
        const loadedQuiz = (Array.isArray(parsed?.quiz) ? parsed.quiz : []).filter((q: any) => !legacyMockIds.has(q.id));
        const loadedJurnal = (Array.isArray(parsed?.jurnal) ? parsed.jurnal : []).filter((j: any) => !legacyMockIds.has(j.id));
        const loadedNotif = (Array.isArray(parsed?.notifikasi) ? parsed.notifikasi : []).filter((n: any) => !legacyMockIds.has(n.id));
        const loadedPengumuman = (Array.isArray(parsed?.pengumuman) ? parsed.pengumuman : []).filter((p: any) => !legacyMockIds.has(p.id));
        const loadedRefleksi = (Array.isArray(parsed?.refleksi) ? parsed.refleksi : []).filter((r: any) => !legacyMockIds.has(r.id));
        const loadedPraktik = (Array.isArray(parsed?.penilaianPraktik) ? parsed.penilaianPraktik : []).filter((p: any) => !legacyMockIds.has(p.id));

        const loadedLogs = Array.isArray(parsed?.activityLogs) && parsed.activityLogs.length > 0
          ? parsed.activityLogs
          : INITIAL_DATABASE.activityLogs;

        return {
          ...INITIAL_DATABASE,
          ...parsed,
          isCleanSlate: true,
          isNilaiPresensiReset: true,
          users: loadedUsers,
          kelas: loadedKelas,
          mataPelajaran: loadedMp,
          materi: loadedMateri,
          tugas: loadedTugas,
          pengumpulanTugas: Array.isArray(parsed?.pengumpulanTugas) ? parsed.pengumpulanTugas : [],
          quiz: loadedQuiz,
          jawabanQuiz: Array.isArray(parsed?.jawabanQuiz) ? parsed.jawabanQuiz : [],
          penilaianPraktik: loadedPraktik,
          presensi: Array.isArray(parsed?.presensi) ? parsed.presensi : [],
          jurnal: loadedJurnal,
          notifikasi: loadedNotif,
          pengumuman: loadedPengumuman,
          nilai: Array.isArray(parsed?.nilai) ? parsed.nilai : [],
          refleksi: loadedRefleksi,
          jawabanRefleksi: Array.isArray(parsed?.jawabanRefleksi) ? parsed.jawabanRefleksi : [],
          materiPraktikList: [],
          pengajuanIzin: Array.isArray(parsed?.pengajuanIzin) ? parsed.pengajuanIzin : [],
          penilaianSikap: Array.isArray(parsed?.penilaianSikap) ? parsed.penilaianSikap : [],
          penilaianTemanSejawat: Array.isArray(parsed?.penilaianTemanSejawat) ? parsed.penilaianTemanSejawat : [],
          penilaianHarian: Array.isArray(parsed?.penilaianHarian) ? parsed.penilaianHarian : [],
          pendampinganMurid: Array.isArray(parsed?.pendampinganMurid) ? parsed.pendampinganMurid : [],
          trashUsers: Array.isArray(parsed?.trashUsers) ? parsed.trashUsers : [],
          activityLogs: loadedLogs,
          settings: {
            ...INITIAL_DATABASE.settings,
            ...(parsed?.settings || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load local DB, resetting to defaults:', e);
    }
    this.saveToLocalStorage(INITIAL_DATABASE);
    return INITIAL_DATABASE;
  }

  private saveToLocalStorage(data: LMSDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (Array.isArray(data.pengajuanIzin) && data.pengajuanIzin.length > 0) {
        localStorage.setItem('lms_pengajuan_izin_backup', JSON.stringify(data.pengajuanIzin));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      try {
        if (Array.isArray(data.pengajuanIzin)) {
          localStorage.setItem('lms_pengajuan_izin_backup', JSON.stringify(data.pengajuanIzin));
        }
      } catch (err) {
        // ignore
      }
    }
  }

  public getDatabase(): LMSDatabase {
    if (this.db?.settings?.namaSekolah && this.db.settings.namaSekolah.includes('Kintamani')) {
      this.db.settings.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
      this.saveToLocalStorage(this.db);
    }
    return this.db;
  }

  public subscribe(listener: (db: LMSDatabase) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyLocalListeners() {
    this.listeners.forEach((l) => l(this.db));
  }

  private notify() {
    this.saveToLocalStorage(this.db);
    this.notifyLocalListeners();
  }

  public updateDatabase(updater: (prev: LMSDatabase) => LMSDatabase) {
    const prev = { ...this.db };
    const next = updater(prev);
    if (next.settings?.namaSekolah && next.settings.namaSekolah.includes('Kintamani')) {
      next.settings.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
    }
    this.db = next;
    this.notify();
    // Sinkronkan perubahan secara asinkron ke Firestore
    this.syncChangesToFirestore(prev, next);
  }

  public resetToDefaults() {
    this.db = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.notify();
    this.seedAllToFirestore();
  }

  /**
   * Mengosongkan seluruh data pembelajaran, murid, kuis, tugas, dan nilai agar bisa diisi dari nol.
   * Tetap mempertahankan:
   * 1. Akun Admin dan Guru utama (agar tidak terkunci keluar)
   * 2. Pengaturan sekolah dan profil LMS
   */
  public resetToCleanSlate(keepAdminAndGuru: boolean = true) {
    const currentSettings = this.db.settings || INITIAL_DATABASE.settings;

    let retainedUsers: User[] = [];
    if (keepAdminAndGuru) {
      retainedUsers = (this.db.users || []).filter((u) => u.role === 'ADMIN' || u.role === 'GURU');
      if (!retainedUsers.some((u) => u.role === 'ADMIN')) {
        retainedUsers.unshift(DEFAULT_USERS[0]);
      }
      const defaultTeacher = DEFAULT_USERS.find((u) => u.role === 'GURU');
      if (defaultTeacher && !retainedUsers.some((u) => u.role === 'GURU')) {
        retainedUsers.push(defaultTeacher);
      }
    } else {
      retainedUsers = [DEFAULT_USERS[0]].filter(Boolean);
    }

    const resetKelas = (this.db.kelas || INITIAL_DATABASE.kelas).map((k) => ({
      ...k,
      totalMurid: 0,
    }));

    const cleanDb: LMSDatabase = {
      isCleanSlate: true,
      cleanSlateTimestamp: new Date().toISOString(),
      settings: {
        ...currentSettings,
        terakhirSinkron: new Date().toISOString(),
      },
      users: retainedUsers,
      kelas: resetKelas,
      mataPelajaran: this.db.mataPelajaran || INITIAL_DATABASE.mataPelajaran,
      materi: [],
      tugas: [],
      pengumpulanTugas: [],
      quiz: [],
      jawabanQuiz: [],
      penilaianPraktik: [],
      presensi: [],
      jurnal: [],
      notifikasi: [
        {
          id: `notif-clean-${Date.now()}`,
          judul: 'Database Telah Direset ke Nol',
          pesan: 'Data pembelajaran, tugas, kuis, nilai, dan murid telah dibersihkan. Anda dapat mulai mengisi dari awal secara langsung terintegrasi dengan Firebase Firestore.',
          tipe: 'pengumuman',
          waktu: 'Baru saja',
          dibaca: false,
        },
      ],
      pengumuman: [],
      nilai: [],
      refleksi: [],
      jawabanRefleksi: [],
      materiPraktikList: this.db.materiPraktikList || INITIAL_DATABASE.materiPraktikList,
      pengajuanIzin: [],
      isNilaiPresensiReset: true,
    };

    this.db = cleanDb;
    this.saveToLocalStorage(cleanDb);
    this.notify();
    this.seedAllToFirestore();
  }

  // ==========================================
  // ACTIVITY AUDIT LOGS & DIAGNOSTICS METHODS
  // ==========================================

  public logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...logData,
    };

    this.updateDatabase((prev) => {
      const existingLogs = Array.isArray(prev.activityLogs) ? prev.activityLogs : [];
      // Keep up to 300 logs
      const updatedLogs = [newLog, ...existingLogs].slice(0, 300);
      return {
        ...prev,
        activityLogs: updatedLogs,
      };
    });

    return newLog;
  }

  public getActivityLogs(): ActivityLog[] {
    return Array.isArray(this.db.activityLogs) ? this.db.activityLogs : [];
  }

  public clearActivityLogs(): void {
    this.updateDatabase((prev) => ({
      ...prev,
      activityLogs: [
        {
          id: `act-clean-${Date.now()}`,
          timestamp: new Date().toISOString(),
          category: 'DATA_MODIFICATION',
          actorName: 'Administrator',
          actorRole: 'ADMIN',
          action: 'Pembersihan Riwayat Log',
          details: 'Seluruh riwayat log aktivitas sebelumnya telah dibersihkan oleh Administrator.',
          status: 'INFO',
        },
      ],
    }));
  }

  public seedSampleStudents(): void {
    // Demo students removed per user request. Only users uploaded or created via UI will exist.
    return;
  }

  public repairAllMuridAccounts(): { repairedCount: number; message: string } {
    let repairedCount = 0;
    this.updateDatabase((prev) => {
      const defaultKelasId = prev.kelas?.[0]?.id || 'cls-x-1';
      const updatedUsers = (prev.users || []).map((u) => {
        if (u.role === 'MURID') {
          let modified = false;
          const updated = { ...u };
          if (updated.status !== 'Aktif') {
            updated.status = 'Aktif';
            modified = true;
          }
          if (!updated.password || updated.password.trim() === '') {
            updated.password = '123456';
            modified = true;
          }
          if (!updated.kelasId || updated.kelasId.trim() === '') {
            updated.kelasId = defaultKelasId;
            modified = true;
          }
          if (updated.nis !== undefined && updated.nis !== null) {
            const cleanNis = safeStringTrim(updated.nis);
            if (cleanNis !== updated.nis) {
              updated.nis = cleanNis;
              modified = true;
            }
          }
          if (modified) repairedCount++;
          return updated;
        }
        return u;
      });

      const updatedKelas = Array.isArray(prev.kelas) && prev.kelas.length > 0 ? prev.kelas : INITIAL_CLASSES;

      return {
        ...prev,
        users: updatedUsers,
        kelas: updatedKelas,
      };
    });

    this.logActivity({
      category: 'USER_UPDATE',
      actorName: 'Administrator',
      actorRole: 'ADMIN',
      action: 'Perbaikan Massal Akun Murid',
      details: `Pemeriksaan otomatis berhasil memeriksa ${repairedCount} akun murid (status aktif, password default '123456', pembersihan spasi, penugasan kelas).`,
      status: 'SUCCESS',
    });

    return {
      repairedCount,
      message: `Pemeriksaan selesai. Berhasil menstabilkan ${repairedCount} data akun murid. Semua murid berstatus Aktif dengan password default 123456.`,
    };
  }

  public diagnoseStudentAccount(identifierOrId: string) {
    const raw = identifierOrId.trim();
    const cleanId = raw.toLowerCase();
    const allUsers = this.db.users || [];
    const muridList = allUsers.filter((u) => u.role === 'MURID');

    const found = muridList.find(
      (u) =>
        u.id === raw ||
        u.username.toLowerCase() === cleanId ||
        (u.nis && safeStringTrim(u.nis).toLowerCase() === cleanId) ||
        (u.nisn && safeStringTrim(u.nisn).toLowerCase() === cleanId) ||
        (u.nip && safeStringTrim(u.nip).toLowerCase() === cleanId) ||
        u.name.toLowerCase().includes(cleanId)
    );

    if (!found) {
      return {
        found: false,
        user: null,
        issues: [`Akun dengan identitas '${raw}' tidak ditemukan di daftar murid database (Total murid terdaftar: ${muridList.length}).`],
        canLogin: false,
        recommendedAction: 'Pastikan NIS atau Username sudah terdaftar di menu Pengguna > Murid atau klik tombol "Pulihkan Akun Murid Percontohan".',
      };
    }

    const issues: string[] = [];
    let canLogin = true;

    if (found.status === 'Nonaktif') {
      issues.push("Status akun adalah 'Nonaktif'. Murid ditolak sistem saat mencoba masuk.");
      canLogin = false;
    }

    if (!found.kelasId) {
      issues.push("Akun belum memiliki rombel/kelas yang terhubung (kelasId kosong).");
    } else {
      const kelasExists = (this.db.kelas || []).some((k) => k.id === found.kelasId);
      if (!kelasExists) {
        issues.push(`Kelas ID '${found.kelasId}' tidak ditemukan di master data kelas.`);
      }
    }

    if (found.nis && String(found.nis) !== safeStringTrim(found.nis)) {
      issues.push("NIS mengandung karakter spasi tersembunyi di awal atau akhir yang dapat menyebabkan kegagalan login.");
    }

    return {
      found: true,
      user: found,
      issues,
      canLogin,
      recommendedAction: issues.length > 0 ? issues.join(' ') : 'Akun murid dalam kondisi sehat dan siap digunakan login.',
    };
  }

  // Helper getters
  public getMuridList(kelasId?: string): User[] {
    return this.db.users.filter(
      (u) => u.role === 'MURID' && (!kelasId || u.kelasId === kelasId)
    );
  }

  public getGuruList(): User[] {
    return this.db.users.filter((u) => u.role === 'GURU');
  }

  public getKelasList(): Kelas[] {
    return this.db.kelas;
  }

  public getMateriList(kelasId?: string): Materi[] {
    return this.db.materi.filter((m) => !kelasId || m.kelasId === kelasId);
  }

  public getTugasList(kelasId?: string): Tugas[] {
    return this.db.tugas.filter((t) => !kelasId || t.kelasId === kelasId);
  }

  public getQuizList(kelasId?: string): Quiz[] {
    return this.db.quiz.filter((q) => !kelasId || q.kelasId === kelasId);
  }

  // Refleksi helpers
  public saveRefleksi(item: RefleksiPembelajaran) {
    this.updateDatabase((prev) => {
      const existingList = prev.refleksi || [];
      const idx = existingList.findIndex((r) => r.id === item.id);
      let updated: RefleksiPembelajaran[];
      if (idx >= 0) {
        updated = [...existingList];
        updated[idx] = item;
      } else {
        updated = [item, ...existingList];
      }
      return {
        ...prev,
        refleksi: updated,
      };
    });
  }

  public deleteRefleksi(id: string) {
    this.updateDatabase((prev) => ({
      ...prev,
      refleksi: (prev.refleksi || []).filter((r) => r.id !== id),
      jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => j.refleksiId !== id),
    }));
  }

  public submitJawabanRefleksi(jawaban: JawabanRefleksiMurid) {
    this.updateDatabase((prev) => {
      const list = prev.jawabanRefleksi || [];
      const existingIdx = list.findIndex(
        (j) => j.refleksiId === jawaban.refleksiId && j.muridId === jawaban.muridId
      );
      let updated: JawabanRefleksiMurid[];
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...list[existingIdx], ...jawaban };
      } else {
        updated = [jawaban, ...list];
      }
      return {
        ...prev,
        jawabanRefleksi: updated,
      };
    });
  }

  public tanggapiRefleksi(jawabanId: string, catatanGuru: string) {
    this.updateDatabase((prev) => {
      const list = (prev.jawabanRefleksi || []).map((j) => {
        if (j.id === jawabanId) {
          return {
            ...j,
            catatanGuru,
            tanggalTanggapanGuru: new Date().toISOString().slice(0, 10),
          };
        }
        return j;
      });
      return {
        ...prev,
        jawabanRefleksi: list,
      };
    });
  }

  // Pengumuman Helpers & Notifications
  public savePengumuman(item: Pengumuman) {
    this.updateDatabase((prev) => {
      const existing = prev.pengumuman || [];
      const idx = existing.findIndex((p) => p.id === item.id);
      let updated: Pengumuman[];
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = item;
      } else {
        updated = [item, ...existing];
      }

      // If new announcement, generate a notification item for students
      let updatedNotifikasi = [...(prev.notifikasi || [])];
      if (idx < 0) {
        const targetDesc = item.targetKelasNama || (item.targetKelasId && item.targetKelasId !== 'ALL' ? item.targetKelasId : 'Semua Kelas');
        const notif: NotifikasiItem = {
          id: `notif-ann-${Date.now()}`,
          judul: `Pengumuman Guru: ${item.judul}`,
          pesan: `${item.guruNama} menyiarkan pengumuman (${targetDesc}): "${item.isi.slice(0, 100)}${item.isi.length > 100 ? '...' : ''}"`,
          waktu: 'Baru saja',
          tipe: 'pengumuman',
          dibaca: false,
          targetRole: 'MURID',
          targetId: item.id,
          targetKelasId: item.targetKelasId || 'ALL',
          targetKelasNama: item.targetKelasNama || 'Semua Kelas',
          isUrgentDeadline: item.prioritas === 'Mendesak' || item.prioritas === 'Penting',
        };
        updatedNotifikasi = [notif, ...updatedNotifikasi];
      }

      return {
        ...prev,
        pengumuman: updated,
        notifikasi: updatedNotifikasi,
      };
    });
  }

  public deletePengumuman(id: string) {
    this.updateDatabase((prev) => ({
      ...prev,
      pengumuman: (prev.pengumuman || []).filter((p) => p.id !== id),
      notifikasi: (prev.notifikasi || []).filter((n) => n.targetId !== id),
    }));
  }

  public togglePinPengumuman(id: string) {
    this.updateDatabase((prev) => {
      const list = (prev.pengumuman || []).map((p) => {
        if (p.id === id) {
          return { ...p, disematkan: !p.disematkan };
        }
        return p;
      });
      return {
        ...prev,
        pengumuman: list,
      };
    });
  }

  public markPengumumanDibaca(id: string, userId: string) {
    this.updateDatabase((prev) => {
      const list = (prev.pengumuman || []).map((p) => {
        if (p.id === id) {
          const readers = p.dibacaOleh || [];
          if (!readers.includes(userId)) {
            return { ...p, dibacaOleh: [...readers, userId] };
          }
        }
        return p;
      });
      const notifList = (prev.notifikasi || []).map((n) => {
        if (n.targetId === id) {
          return { ...n, dibaca: true };
        }
        return n;
      });
      return {
        ...prev,
        pengumuman: list,
        notifikasi: notifList,
      };
    });
  }

  /**
   * Menambahkan atau memperbarui notifikasi sistem untuk murid / guru
   */
  public pushNotifikasi(item: NotifikasiItem): void {
    this.updateDatabase((prev) => {
      // Hapus notifikasi lama dengan targetId dan tipe yang sama untuk mencegah duplikasi
      const existing = (prev.notifikasi || []).filter(
        (n) => !(n.targetId === item.targetId && n.tipe === item.tipe && n.targetMuridId === item.targetMuridId)
      );
      return {
        ...prev,
        notifikasi: [item, ...existing],
      };
    });
  }

  // ==========================================
  // MANAJEMEN PENGGUNA, BAK SAMPAH & BULK ACTIONS
  // ==========================================

  /**
   * Memindahkan satu atau banyak pengguna ke Bak Sampah (Soft Delete)
   */
  public moveToTrash(userIds: string[] | string, actorName: string = 'Administrator'): void {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;

    this.updateDatabase((prev) => {
      const targetUsers = prev.users.filter((u) => ids.includes(u.id));
      if (targetUsers.length === 0) return prev;

      const newTrashItems: TrashUserItem[] = targetUsers.map((u) => ({
        id: `trash-${u.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user: { ...u },
        deletedAt: new Date().toISOString(),
        deletedBy: actorName,
        role: u.role,
        originalKelasId: u.kelasId,
      }));

      const remainingUsers = prev.users.filter((u) => !ids.includes(u.id));
      const updatedTrash = [...(prev.trashUsers || []), ...newTrashItems];

      const roles = Array.from(new Set(targetUsers.map((u) => u.role))).join(', ');
      const namesPreview = targetUsers.slice(0, 3).map((u) => u.name).join(', ') + (targetUsers.length > 3 ? ` (+${targetUsers.length - 3} lainnya)` : '');

      const log: ActivityLog = {
        id: `log-trash-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'TRASH_MOVE',
        actorName,
        actorRole: 'ADMIN',
        action: `Memindahkan ${targetUsers.length} pengguna (${roles}) ke Bak Sampah`,
        details: `Pengguna yang dipindahkan: ${namesPreview}. Data dapat dipulihkan sewaktu-waktu dari Bak Sampah.`,
        status: 'WARNING',
      };

      return {
        ...prev,
        users: remainingUsers,
        trashUsers: updatedTrash,
        activityLogs: [log, ...(prev.activityLogs || [])],
      };
    });
  }

  /**
   * Mengembalikan pengguna dari Bak Sampah ke data aktif
   */
  public restoreFromTrash(trashIdsOrUserIds: string[] | string, actorName: string = 'Administrator'): void {
    const ids = Array.isArray(trashIdsOrUserIds) ? trashIdsOrUserIds : [trashIdsOrUserIds];
    if (ids.length === 0) return;

    this.updateDatabase((prev) => {
      const currentTrash = prev.trashUsers || [];
      const itemsToRestore = currentTrash.filter((item) => ids.includes(item.id) || ids.includes(item.user.id));
      if (itemsToRestore.length === 0) return prev;

      const restoredUsers: User[] = itemsToRestore.map((item) => item.user);
      const remainingTrash = currentTrash.filter((item) => !ids.includes(item.id) && !ids.includes(item.user.id));

      // Hindari duplikasi ID pengguna di data aktif
      const existingUserIds = new Set(prev.users.map((u) => u.id));
      const usersToAdd = restoredUsers.filter((u) => !existingUserIds.has(u.id));

      const log: ActivityLog = {
        id: `log-restore-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'TRASH_RESTORE',
        actorName,
        actorRole: 'ADMIN',
        action: `Memulihkan ${itemsToRestore.length} pengguna dari Bak Sampah`,
        details: `Berhasil mengembalikan ${itemsToRestore.map((t) => t.user.name).join(', ')} ke data aktif.`,
        status: 'SUCCESS',
      };

      return {
        ...prev,
        users: [...prev.users, ...usersToAdd],
        trashUsers: remainingTrash,
        activityLogs: [log, ...(prev.activityLogs || [])],
      };
    });
  }

  /**
   * Menghapus permanen satu atau banyak pengguna dari Bak Sampah
   */
  public permanentDeleteFromTrash(trashIdsOrUserIds: string[] | string, actorName: string = 'Administrator'): void {
    const ids = Array.isArray(trashIdsOrUserIds) ? trashIdsOrUserIds : [trashIdsOrUserIds];
    if (ids.length === 0) return;

    this.updateDatabase((prev) => {
      const currentTrash = prev.trashUsers || [];
      const itemsToDelete = currentTrash.filter((item) => ids.includes(item.id) || ids.includes(item.user.id));
      if (itemsToDelete.length === 0) return prev;

      const userIdsToDelete = new Set(itemsToDelete.map((item) => item.user.id));
      const remainingTrash = currentTrash.filter((item) => !ids.includes(item.id) && !ids.includes(item.user.id));

      // Hapus seluruh relasi data murid terkait agar bersih total
      const log: ActivityLog = {
        id: `log-perm-del-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'TRASH_PERMANENT_DELETE',
        actorName,
        actorRole: 'ADMIN',
        action: `Hapus Permanen ${itemsToDelete.length} data dari Tong Sampah`,
        details: `Data berikut dihapus permanen dan tidak dapat dikembalikan: ${itemsToDelete.map((t) => t.user.name).join(', ')}.`,
        status: 'FAILED',
      };

      return {
        ...prev,
        trashUsers: remainingTrash,
        presensi: prev.presensi.filter((p) => !userIdsToDelete.has(p.muridId)),
        penilaianPraktik: (prev.penilaianPraktik || []).filter((p) => !userIdsToDelete.has(p.muridId)),
        pengumpulanTugas: prev.pengumpulanTugas.filter((t) => !userIdsToDelete.has(t.muridId)),
        jawabanQuiz: prev.jawabanQuiz.filter((q) => !userIdsToDelete.has(q.muridId)),
        jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => !userIdsToDelete.has(j.muridId)),
        pengajuanIzin: (prev.pengajuanIzin || []).filter((iz) => !userIdsToDelete.has(iz.muridId)),
        penilaianHarian: (prev.penilaianHarian || []).filter((ph) => !userIdsToDelete.has(ph.muridId)),
        penilaianSikap: (prev.penilaianSikap || []).filter((ps) => !userIdsToDelete.has(ps.muridId)),
        penilaianTemanSejawat: (prev.penilaianTemanSejawat || []).filter((pt) => !userIdsToDelete.has(pt.penilaiId) && !userIdsToDelete.has(pt.targetMuridId)),
        nilai: (prev.nilai || []).filter((n) => !userIdsToDelete.has(n.muridId)),
        activityLogs: [log, ...(prev.activityLogs || [])],
      };
    });
  }

  /**
   * Kosongkan seluruh Bak Sampah (atau berdasarkan filter peran)
   */
  public emptyTrash(roleFilter?: UserRole, actorName: string = 'Administrator'): void {
    this.updateDatabase((prev) => {
      const currentTrash = prev.trashUsers || [];
      const itemsToDelete = roleFilter ? currentTrash.filter((item) => item.role === roleFilter) : currentTrash;
      if (itemsToDelete.length === 0) return prev;

      const userIdsToDelete = new Set(itemsToDelete.map((item) => item.user.id));
      const remainingTrash = roleFilter ? currentTrash.filter((item) => item.role !== roleFilter) : [];

      const log: ActivityLog = {
        id: `log-empty-trash-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'TRASH_PERMANENT_DELETE',
        actorName,
        actorRole: 'ADMIN',
        action: `Mengosongkan Seluruh Tong Sampah ${roleFilter ? `(${roleFilter})` : ''}`,
        details: `Sebanyak ${itemsToDelete.length} akun dan berkas nilai/absensi terkait telah dibersihkan secara permanen.`,
        status: 'FAILED',
      };

      return {
        ...prev,
        trashUsers: remainingTrash,
        presensi: prev.presensi.filter((p) => !userIdsToDelete.has(p.muridId)),
        penilaianPraktik: (prev.penilaianPraktik || []).filter((p) => !userIdsToDelete.has(p.muridId)),
        pengumpulanTugas: prev.pengumpulanTugas.filter((t) => !userIdsToDelete.has(t.muridId)),
        jawabanQuiz: prev.jawabanQuiz.filter((q) => !userIdsToDelete.has(q.muridId)),
        jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => !userIdsToDelete.has(j.muridId)),
        pengajuanIzin: (prev.pengajuanIzin || []).filter((iz) => !userIdsToDelete.has(iz.muridId)),
        penilaianHarian: (prev.penilaianHarian || []).filter((ph) => !userIdsToDelete.has(ph.muridId)),
        penilaianSikap: (prev.penilaianSikap || []).filter((ps) => !userIdsToDelete.has(ps.muridId)),
        penilaianTemanSejawat: (prev.penilaianTemanSejawat || []).filter((pt) => !userIdsToDelete.has(pt.penilaiId) && !userIdsToDelete.has(pt.targetMuridId)),
        nilai: (prev.nilai || []).filter((n) => !userIdsToDelete.has(n.muridId)),
        activityLogs: [log, ...(prev.activityLogs || [])],
      };
    });
  }

  /**
   * Kosongkan seluruh Data Murid (dipindahkan ke Bak Sampah agar bisa diisi bersih via Import)
   */
  public clearAllMurid(actorName: string = 'Administrator'): number {
    const muridUsers = this.db.users.filter((u) => u.role === 'MURID');
    const count = muridUsers.length;
    if (count > 0) {
      this.moveToTrash(muridUsers.map((m) => m.id), actorName);
    }
    return count;
  }

  /**
   * Delete User helper (Murid / Guru / Admin)
   * Default: dipindahkan ke Bak Sampah (soft delete) agar aman dan bisa dipulihkan.
   * Jika permanent === true: langsung dibersihkan total.
   */
  public deleteUser(userId: string, permanent: boolean = false, actorName: string = 'Administrator'): void {
    if (permanent) {
      this.updateDatabase((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
        trashUsers: (prev.trashUsers || []).filter((t) => t.id !== userId && t.user.id !== userId),
        presensi: prev.presensi.filter((p) => p.muridId !== userId),
        penilaianPraktik: (prev.penilaianPraktik || []).filter((p) => p.muridId !== userId),
        pengumpulanTugas: prev.pengumpulanTugas.filter((t) => t.muridId !== userId),
        jawabanQuiz: prev.jawabanQuiz.filter((q) => q.muridId !== userId),
        jawabanRefleksi: (prev.jawabanRefleksi || []).filter((j) => j.muridId !== userId),
        pengajuanIzin: (prev.pengajuanIzin || []).filter((iz) => iz.muridId !== userId),
      }));
    } else {
      this.moveToTrash([userId], actorName);
    }
  }

  /**
   * Batch Delete Pengguna (Murid / Guru)
   */
  public deleteUsersBatch(userIds: string[], permanent: boolean = false, actorName: string = 'Administrator'): void {
    if (permanent) {
      this.permanentDeleteFromTrash(userIds, actorName);
    } else {
      this.moveToTrash(userIds, actorName);
    }
  }

  /**
   * Import data murid batch dari CSV/Excel dengan perlindungan anti-duplikasi:
   * 1. Jika murid dengan NIS atau Nama & Kelas sudah ada di database, data diperbarui (upsert) dan tidak menumpuk ganda.
   * 2. Jika murid sebelumnya berada di Bak Sampah, otomatis dipulihkan aktif.
   * 3. Seluruh nama yang sama langsung digabungkan ke satu akun kanonikal.
   */
  public importMuridBatch(newMuridList: User[], actorName: string = 'Administrator'): void {
    if (!newMuridList || newMuridList.length === 0) return;

    this.updateDatabase((prev) => {
      const existingUsers = [...prev.users];
      const existingTrash = [...(prev.trashUsers || [])];

      // Hapus dari bak sampah jika murid yang diimport sebelumnya terhapus ke bak sampah
      const importedNisSet = new Set(
        newMuridList.map((m) => safeStringTrim(m.nis || m.nip).toLowerCase()).filter(Boolean)
      );
      const importedNameSet = new Set(
        newMuridList.map((m) => safeStringTrim(m.name).toLowerCase()).filter(Boolean)
      );

      const filteredTrash = existingTrash.filter((t) => {
        const tNis = safeStringTrim(t.user?.nis || t.user?.nip).toLowerCase();
        const tName = safeStringTrim(t.user?.name).toLowerCase();
        if (tNis && importedNisSet.has(tNis)) return false;
        if (tName && importedNameSet.has(tName)) return false;
        return true;
      });

      let updatedCount = 0;
      let insertedCount = 0;

      for (const m of newMuridList) {
        const cleanNis = safeStringTrim(m.nis || m.nip).toLowerCase();
        const cleanName = safeStringTrim(m.name).toLowerCase();
        const cleanKelas = safeStringTrim(m.kelasId).toLowerCase();

        // Cari apakah murid ini sudah ada di database (berdasarkan NIS atau Nama + Kelas)
        let matchIdx = -1;
        if (cleanNis) {
          matchIdx = existingUsers.findIndex(
            (u) => u.role === 'MURID' && safeStringTrim(u.nis || u.nip).toLowerCase() === cleanNis
          );
        }
        if (matchIdx === -1 && cleanName) {
          matchIdx = existingUsers.findIndex(
            (u) =>
              u.role === 'MURID' &&
              safeStringTrim(u.name).toLowerCase() === cleanName &&
              (!cleanKelas || !u.kelasId || safeStringTrim(u.kelasId).toLowerCase() === cleanKelas)
          );
        }

        if (matchIdx >= 0) {
          // UPDATE murid yang sudah ada (pertahankan ID lama agar rekap nilai & absensi tidak putus)
          const old = existingUsers[matchIdx];
          existingUsers[matchIdx] = {
            ...old,
            ...m,
            id: old.id,
            username: old.username || m.username || (cleanNis ? `murid_${cleanNis}` : `murid_${Date.now()}`),
            name: (m.name || old.name).trim(),
            nis: m.nis || old.nis || '',
            nisn: m.nisn || old.nisn || '',
            kelasId: m.kelasId || old.kelasId || '',
            jenisKelamin: m.jenisKelamin || old.jenisKelamin || 'L',
            status: 'Aktif',
            password: m.password || old.password || '123456',
            tahunPelajaran: m.tahunPelajaran || old.tahunPelajaran || prev.settings?.tahunPelajaran || '2026/2027',
          };
          updatedCount++;
        } else {
          // INSERT murid baru
          const finalId = m.id || `usr-murid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const cleanUsername = (m.username || (cleanNis ? `murid_${cleanNis}` : '') || `murid_${Date.now()}`).toLowerCase().trim();
          existingUsers.push({
            ...m,
            id: finalId,
            username: cleanUsername,
            role: 'MURID',
            password: m.password || '123456',
            status: 'Aktif',
            tahunPelajaran: m.tahunPelajaran || prev.settings?.tahunPelajaran || '2026/2027',
          });
          insertedCount++;
        }
      }

      // Jaminan akhir: bersihkan sisa duplikasi jika ada file import yang memiliki baris ganda di dalamnya
      const { cleanUsers, idReplacements } = deduplicateMuridList(existingUsers);
      if (idReplacements.size > 0) {
        this.remapMuridIdsInDb(idReplacements, prev);
      }

      const log: ActivityLog = {
        id: `log-imp-murid-${Date.now()}`,
        timestamp: new Date().toISOString(),
        category: 'DATA_MODIFICATION',
        actorName,
        actorRole: 'ADMIN',
        action: `Import ${newMuridList.length} Data Murid (${insertedCount} baru, ${updatedCount} diperbarui)`,
        details: `Berhasil mengimpor data murid tanpa duplikasi nama ke dalam database sekolah.`,
        status: 'SUCCESS',
      };

      return {
        ...prev,
        users: cleanUsers,
        trashUsers: filteredTrash,
        activityLogs: [log, ...(prev.activityLogs || [])],
      };
    });
  }

  // Materi Praktik & Penilaian Multi-Materi helpers
  public addMateriPraktik(judulMateri: string) {
    const trimmed = judulMateri.trim();
    if (!trimmed) return;
    this.updateDatabase((prev) => {
      const current = prev.materiPraktikList || [];
      if (current.includes(trimmed)) return prev;
      return {
        ...prev,
        materiPraktikList: [...current, trimmed],
      };
    });
  }

  public savePenilaianPraktikBatch(newItems: PenilaianPraktik[]) {
    this.updateDatabase((prev) => {
      const existing = [...(prev.penilaianPraktik || [])];
      newItems.forEach((newItem) => {
        const targetMateri = newItem.materiJudul || newItem.materi || '';
        const idx = existing.findIndex(
          (p) =>
            p.muridId === newItem.muridId &&
            ((p.materiJudul || p.materi || '').trim().toLowerCase() === targetMateri.trim().toLowerCase())
        );
        if (idx >= 0) {
          existing[idx] = newItem;
        } else {
          existing.push(newItem);
        }
      });
      return {
        ...prev,
        penilaianPraktik: existing,
      };
    });
  }

  // CSV Data Export & Import Methods
  public exportUsersCSV(): string {
    return exportUsersToCSV(this.db.users);
  }

  public importUsersCSV(csvText: string): { count: number; message: string } {
    const importedUsers = parseCSVToUsers(csvText);
    if (importedUsers.length === 0) {
      return { count: 0, message: 'Tidak ada data pengguna yang valid ditemukan dalam CSV.' };
    }

    this.updateDatabase((prev) => {
      // Merge users by ID or username
      const existingMap = new Map(prev.users.map((u) => [u.id, u]));
      for (const u of importedUsers) {
        existingMap.set(u.id, {
          ...(existingMap.get(u.id) || {}),
          ...u,
        });
      }
      return {
        ...prev,
        users: Array.from(existingMap.values()),
        settings: {
          ...prev.settings,
          terakhirSinkron: new Date().toISOString(),
        },
      };
    });

    return {
      count: importedUsers.length,
      message: `Berhasil mengimpor ${importedUsers.length} data pengguna dari file CSV!`,
    };
  }

  public savePendampinganMurid(record: PendampinganMuridRecord): void {
    this.updateDatabase((prev) => {
      const list = prev.pendampinganMurid || [];
      const idx = list.findIndex((r) => r.id === record.id);
      const updatedList =
        idx >= 0
          ? [...list.slice(0, idx), record, ...list.slice(idx + 1)]
          : [record, ...list];
      return {
        ...prev,
        pendampinganMurid: updatedList,
      };
    });
  }

  public deletePendampinganMurid(id: string): void {
    this.updateDatabase((prev) => ({
      ...prev,
      pendampinganMurid: (prev.pendampinganMurid || []).filter((r) => r.id !== id),
    }));
  }
}

export const dataStorage = new DataStorageService();
