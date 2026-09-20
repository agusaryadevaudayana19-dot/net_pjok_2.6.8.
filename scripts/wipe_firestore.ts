import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const DEFAULT_STAFF = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    role: 'ADMIN',
    name: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nip: '198811152022211012',
    email: 'i5123@guru.sma.belajar.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-guru-1',
    username: 'guru',
    role: 'GURU',
    name: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
    nip: '198811152022211013',
    email: 'i5123@guru.sma.belajar.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    mataPelajaran: 'PJOK',
    kelasDiampuIds: [],
    kelasDiampu: [],
  },
];

const SETTINGS = {
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
  autoSyncSpreadsheet: true,
};

const collectionsToClear = [
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
];

async function main() {
  console.log('Starting cloud Firestore wipe...');

  // Set clean settings
  await setDoc(doc(db, 'lms_records', 'settings'), {
    data: SETTINGS,
    section: 'settings',
    updatedAt: new Date().toISOString(),
  });
  console.log('Reset lms_records/settings');

  // Set users to ONLY the authentic admin/guru account (0 dummy students, 0 dummy teachers)
  await setDoc(doc(db, 'lms_records', 'users'), {
    items: DEFAULT_STAFF,
    section: 'users',
    updatedAt: new Date().toISOString(),
  });
  console.log('Reset lms_records/users with ONLY admin/guru account');

  // Set all content and class collections to empty array []
  for (const col of collectionsToClear) {
    await setDoc(doc(db, 'lms_records', col), {
      items: [],
      section: col,
      updatedAt: new Date().toISOString(),
    });
    console.log(`Reset lms_records/${col} to []`);
  }

  console.log('Successfully wiped Firestore database completely!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
