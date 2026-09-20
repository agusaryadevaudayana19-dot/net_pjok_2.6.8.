import { User, RekapNilaiMurid } from '../types';

export interface StudentCSVRecord {
  id: string;
  username: string;
  role: string;
  name: string;
  nip: string;
  email?: string;
  status: 'Aktif' | 'Nonaktif';
  avatar?: string;
}

export const RAW_USERS_CSV_DATA: StudentCSVRecord[] = [
  {
    id: 'usr-admin-1',
    username: 'admin',
    role: 'ADMIN',
    name: 'Administrator',
    nip: '198811152022211012',
    email: 'admin@guru.sma.belajar.id',
    status: 'Aktif',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
  },
];

// Data murid sampel dikosongkan sesuai permintaan pengguna (hanya yang diunggah dari aplikasi yang dipertahankan)
export const SAMPLE_MURID_DATA: StudentCSVRecord[] = [];

export const DEFAULT_USERS: User[] = RAW_USERS_CSV_DATA.map((r) => {
  const isMurid = r.role.toLowerCase().includes('murid') || (!r.role.includes('ADMIN') && !r.role.includes('GURU'));
  const isGuru = r.role === 'GURU';
  const isAdmin = r.role === 'ADMIN';

  const user: User = {
    id: r.id,
    username: r.username,
    role: isAdmin ? 'ADMIN' : isGuru ? 'GURU' : 'MURID',
    name: r.name,
    email: r.email || `${r.username}@guru.sma.belajar.id`,
    status: r.status,
    avatar: r.avatar,
    password: '123456',
  };

  if (isAdmin || isGuru) {
    user.nip = r.nip;
    if (isGuru) {
      user.mataPelajaran = 'PJOK';
      user.kelasDiampuIds = [];
      user.kelasDiampu = [];
    }
  } else {
    user.nis = r.nip;
    user.nisn = `0089${r.nip}`;
    user.kelasId = '';
    user.jenisKelamin = 'L';
    user.tahunPelajaran = '2026/2027';
  }

  return user;
});

// Rekap Nilai Kosong secara default (akan diisi manual atau diupload)
export const DEFAULT_NILAI: RekapNilaiMurid[] = [];
