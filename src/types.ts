export type UserRole = 'ADMIN' | 'GURU' | 'MURID';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  avatar?: string;
  email?: string;
  status: 'Aktif' | 'Nonaktif';
  // Guru specific
  nip?: string;
  mataPelajaran?: string;
  kelasDiampuIds?: string[];
  kelasDiampu?: string[];
  // Murid specific
  nis?: string;
  nisn?: string;
  kelasId?: string;
  jenisKelamin?: 'L' | 'P';
  tahunPelajaran?: string;
}

export interface Kelas {
  id: string;
  nama: string; // e.g., "XI 1", "XI 2", "X 1", "XII 1"
  tingkat: 'X' | 'XI' | 'XII';
  waliKelasId: string;
  waliKelasNama: string;
  guruPengampuId: string;
  guruPengampuNama: string;
  tahunPelajaran: string;
  totalMurid: number;
}

export interface MataPelajaran {
  id: string;
  nama: string;
  fase: 'E' | 'F';
  tingkat: string;
  tahunPelajaran: string;
  guruPengampuId: string;
  guruPengampuNama: string;
}

export interface Materi {
  id: string;
  judul: string;
  subJudul?: string;
  kategori: string; // e.g. "Bola Voli", "Bulutangkis", "Atletik", "Kebugaran Jasmani", "Senam"
  kelasId?: string;
  kelasNama?: string;
  kelasIds?: string[];
  fase?: 'E' | 'F';
  semester?: '1' | '2';
  tujuanPembelajaran?: string; // Capaian dan Tujuan Pembelajaran (paling di atas)
  judulDeskripsi?: string; // Nama sub menu uraian diketik manual oleh guru (default: Uraian Materi & Konsep Gerak)
  namaSubMenuUraian?: string;
  deskripsi: string; // Uraian Materi & Konsep Gerak
  judulMateriInti?: string; // Nama sub menu materi inti diketik manual oleh guru (default: Materi Inti & Panduan Pelaksanaan Teknik)
  namaSubMenuInti?: string;
  materiInti?: string; // Materi Inti (penjelasan mendalam & tahapan gerak)
  kontenTeks?: string; // Dukungan teks konten tambahan / alias
  konten?: string;
  subMateriList?: {
    id: string;
    judul: string;
    subJudul?: string;
    konten?: string;
    durasi?: string;
  }[];
  topikSubMateri?: string; // Topik / sub materi diisikan manual
  kolomKustom?: {
    id: string;
    label: string;
    subJudul?: string;
    isi: string;
    gambarUrl?: string;
  }[];
  status?: 'Publish' | 'Draft' | 'Arsip';
  statusPublikasi?: 'Publish' | 'Draft';
  videoUrl?: string;
  gambarUrl?: string;
  pdfUrl?: string;
  fileUrl?: string;
  linkSumber?: string;
  aktivitasMurid?: string;
  dibuatOleh?: string;
  guruId?: string;
  guruNama?: string;
  tanggalDibuat?: string;
  dibuatPada?: string;
}

export interface SoalTugas {
  id: string;
  nomor: number;
  pertanyaan: string;
  petunjuk?: string;
  bobot?: number;
}

export interface Tugas {
  id: string;
  judul: string;
  subJudul?: string;
  materiId?: string;
  materiJudul?: string;
  kategori?: string;
  kelasId?: string;
  kelasNama?: string;
  kelasIds?: string[];
  instruksi: string;
  daftarSoal?: SoalTugas[];
  tanggalMulai?: string;
  deadline: string;
  fileLampiran?: string;
  jenisPengumpulan?: 'JAWAB_LANGSUNG' | 'UPLOAD_FILE' | 'KEDUANYA' | 'Teks' | 'Video/Foto' | 'Dokumen';
  status: 'Aktif' | 'Selesai' | 'Publish' | 'Draft';
  statusPublikasi?: 'Publish' | 'Draft';
  dibuatOleh?: string;
  guruId?: string;
  guruNama?: string;
  dibuatPada?: string;
}

export interface PengumpulanTugas {
  id: string;
  tugasId: string;
  tugasJudul?: string;
  muridId: string;
  muridNama: string;
  kelasId?: string;
  tanggalKumpul: string;
  isiJawaban?: string;
  jawabanPerSoal?: Record<string, string>;
  fileUrl?: string;
  namaFile?: string;
  linkVideo?: string;
  catatanSiswa?: string;
  catatanMurid?: string;
  status: 'Belum Dikerjakan' | 'Sudah Dikumpulkan' | 'Dinilai' | 'Terlambat' | 'Dikumpulkan';
  nilai?: number;
  komentarGuru?: string;
  catatanGuru?: string;
}

export type TipeSoal =
  | 'Pilihan Ganda'
  | 'Benar/Salah'
  | 'Mencocokkan Gambar'
  | 'Tarik Garis'
  | 'Urutan Gerak'
  | 'Isian'
  | 'Link Google Form'
  | 'Link AppScript'
  | 'Link Aplikasi Lainnya';

export interface MatchingPair {
  id?: string;
  left: string;
  right: string;
  imageUrl?: string;
}

export interface Soal {
  id: string;
  quizId?: string;
  nomor?: number;
  pertanyaan: string;
  tipe?: TipeSoal;
  kategoriSoal?: 'HOTS' | 'AKM' | 'Standar';
  pilihan: string[]; // Options for PG: A, B, C, D, E
  kunciJawaban: string;
  pembahasan?: string;
  bobot: number;
  gambarUrl?: string;
  matchingPairs?: MatchingPair[];
  steps?: string[];
  // Fitur Link Eksternal Terbuka di Dalam Aplikasi
  linkEksternal?: string;
  tipeLink?: 'google-form' | 'appscript' | 'aplikasi-lain';
  judulLink?: string;
  keteranganLink?: string;
}

export type SoalQuiz = Soal;

export interface Quiz {
  id: string;
  judul: string;
  subJudul?: string;
  materiId?: string;
  materiJudul?: string;
  kelasId?: string;
  kelasNama?: string;
  kelasIds?: string[];
  guruId?: string;
  guruNama?: string;
  durasiMenit: number;
  jamMulai?: string; // Default: '07:00'
  jamSelesai?: string; // Default: '07:20'
  zonaWaktu?: string; // Default: 'WITA'
  modeJadwal?: 'serentak' | 'bebas';
  tanggalUjian?: string;
  mulai?: string;
  selesai?: string;
  batasWaktu?: string;
  acakSoal?: boolean;
  acakJawaban?: boolean;
  tampilkanPembahasan?: boolean;
  dibuatOleh?: string;
  dibuatPada?: string;
  status?: 'Publish' | 'Draft' | 'Arsip';
  statusPublikasi?: 'Publish' | 'Draft';
  soalList?: Soal[];
  soal?: Soal[];
  // Tambahan link paket quiz eksternal
  linkEksternal?: string;
  tipeLink?: 'google-form' | 'appscript' | 'aplikasi-lain';
  // Kunci / Token Akses Kuis
  kunciMasuk?: string;
  // Token Keluar Ujian Otomatis (Exit Token)
  gunakanTokenKeluar?: boolean;
  tokenKeluar?: string;
  waktuMunculTokenKeluarMenit?: number; // Menit sejak ujian dimulai kapan token otomatis tampil di layar murid
}

export interface JawabanQuiz {
  id: string;
  quizId: string;
  quizJudul: string;
  muridId: string;
  muridNama: string;
  kelasId: string;
  tanggalMengerjakan: string;
  nilai: number;
  jumlahBenar: number;
  jumlahSalah: number;
  jawabanMurid: Record<string, string>; // soalId -> jawaban
  status: 'Selesai';
}

export type SkalaPraktik = 1 | 2 | 3 | 4; 
// 1 = Belum Berkembang (BB), 2 = Mulai Berkembang (MB), 3 = Berkembang (B), 4 = Sangat Berkembang (SB)

export interface RubrikPraktik {
  sikapAwal: number;
  pelaksanaanTeknik: number;
  sikapAkhir: number;
  hasilGerakan: number;
  sportivitas: number;
  kerjaSama: number;
}

export interface IndikatorPraktik {
  id: string;
  nama: string;
  deskripsi?: string;
  skor: number; // 1 | 2 | 3 | 4
}

export interface PenilaianPraktik {
  id: string;
  kelasId: string;
  kelasNama?: string;
  materi?: string; // e.g. "Passing Bawah Bola Voli"
  materiJudul?: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  tanggal: string;
  statusPublikasi?: 'Publish' | 'Draft';
  indikatorPenilaian?: IndikatorPraktik[];
  aspekNilai?: {
    sikapAwal: SkalaPraktik;
    teknikGerakan: SkalaPraktik;
    ketepatan: SkalaPraktik;
    koordinasi: SkalaPraktik;
    kerjaSama: SkalaPraktik;
    sportivitas: SkalaPraktik;
  };
  rubrik?: RubrikPraktik;
  totalSkor?: number; // max 24
  rataRata?: number; // max 4.0
  nilaiAkhir?: number; // converted to 0-100 scale: (totalSkor / 24) * 100
  nilaiTotal?: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  catatanGuru?: string;
  catatanEvaluasi?: string;
  guruNama?: string;
  guruPenilai?: string;
}

export type StatusPresensi = 'H' | 'S' | 'I' | 'A' | 'T'; 
// H: Hadir, S: Sakit, I: Izin, A: Alpa, T: Terlambat

export type KategoriIzin = 'Sakit' | 'Izin' | 'Dispensasi';
export type StatusPengajuanIzin = 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface PengajuanIzin {
  id: string;
  muridId: string;
  muridNama: string;
  muridNis?: string;
  kelasId: string;
  kelasNama?: string;
  tanggal: string; // YYYY-MM-DD
  tanggalSelesai?: string; // YYYY-MM-DD (opsional jika izin lebih dari 1 hari)
  kategori: KategoriIzin;
  alasan: string;
  namaOrangTua: string;
  noHpOrangTua: string;
  suratUrl: string; // Foto / dokumen surat bertandatangan ortu/wali
  namaSurat?: string;
  fotoBersamaOrangTuaUrl: string; // Foto siswa bersama ortu memegang surat
  namaFotoBersama?: string;
  status: StatusPengajuanIzin;
  catatanGuru?: string;
  diverifikasiOleh?: string;
  tanggalPengajuan: string; // ISO string
  tanggalVerifikasi?: string; // ISO string
}

export interface PresensiRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kelasId: string;
  kelasNama?: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  status: StatusPresensi;
  keterangan?: string;
  guruId?: string;
  guruNama?: string;
}

// ----------------------------------------------------
// PENILAIAN SIKAP & KARAKTER (PROFIL PELAJAR PANCASILA)
// ----------------------------------------------------
export interface PenilaianSikap {
  id: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  kelasId: string;
  kelasNama?: string;
  tanggal: string; // YYYY-MM-DD
  semester?: '1 (Ganjil)' | '2 (Genap)';
  tahunAjaran?: string;
  // Aspek Sikap PJOK (Skala 1: Perlu Bimbingan, 2: Cukup, 3: Baik, 4: Sangat Baik)
  integritas: number; // Kejujuran & Fair Play
  disiplin: number; // Disiplin waktu & tertib aturan olahraga
  kerjaSama: number; // Gotong royong & kekompakan tim
  sportivitas: number; // Menghargai lawan, respek atas keputusan
  tanggungJawab: number; // Merawat peralatan & keselamatan diri
  rataRata?: number; // 1.0 - 4.0
  predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  catatanGuru: string; // Deskripsi perkembangan sikap oleh guru
  guruId?: string;
  guruNama?: string;
  statusPublikasi?: 'Publish' | 'Draft';
  updatedAt?: string;
}

// ----------------------------------------------------
// PENILAIAN ANTAR TEMAN (SEBELUMNYA TEMAN SEJAWAT)
// ----------------------------------------------------
export interface IndikatorPenilaianItem {
  id: string;
  judulPenilaian: string; // JUDUL PENILAIAN
  materiPembelajaran: string; // MATERI PEMBELAJARAN
  pernyataanIndikator: string; // PERNYATAAN INDIKATOR YANG DI NILAI
  urutan: number; // URUTKAN INDIKATOR
  status: 'AKTIF' | 'NON AKTIF'; // STATUS (AKTIF, NON AKTIF)
  // DESKRIPSI SKALA PENILAIAN (1-4)
  skala1PerluBimbingan: string; // SKALA 1 - PERLU BIMBINGAN (ISIANNYA KETIK MANUAL)
  skala2MulaiBerkembang: string; // SKALA 2 - MULAI BERKEMBANG (KETIK MANUAL ISIANNYA)
  skala3BerkembangSesuaiHarapan: string; // SKALA 3 - BERKEMBANG SESUAI DENGAN HARAPAN
  skala4BerkembangSangatBaik: string; // SKALA 4 - BERKEMBANG SANGAT BAIK
  createdAt?: string;
  updatedAt?: string;
  guruId?: string;
  guruNama?: string;
}

export type StatusTugasPenilaian = 'AKTIF' | 'DRAF' | 'SELESAI';

export interface TugasPenilaianAntarTeman {
  id: string;
  namaTugas: string; // NAMA TUGAS PENILAIAN
  materi: string; // MATERI
  materiId?: string;
  kelasIds: string[]; // DITUGASKAN KE KELAS *(BISA PILIH LEBIH DARI 1 KELAS)
  tanggalMulai: string; // TANGGAL MULAI PENILAIAN
  batasWaktu: string; // BATAS WAKTU PENILAIAN
  instruksi: string; // INTRUKSI PENILAIAN BAGI MURID
  indikatorIds: string[]; // PILIH INDIKATOR PENILAIAN (DARI BANK INDIKATOR)
  jumlahWajibDinilai: number; // JUMLAH YANG WAJIB DI NILAI
  status: StatusTugasPenilaian; // STATUS TUGAS (AKTIF, DRAF, SELESAI)
  // OPSI TAMBAHAN
  allowVideoUpload: boolean; // Boleh murid menggungah video bukti gerakan
  allowPhotoUpload: boolean; // Boleh murid menggungah foto bukti gerakan
  requireProofUpload: boolean; // Wajib unggah bukti sebelum mengirim penilaian
  allowEditBeforeDeadline: boolean; // izinkan murid mengedit nilai sebelum batas waktu (fitur izinkan edit)
  guruId?: string;
  guruNama?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NilaiIndikatorItem {
  indikatorId: string;
  judul?: string;
  pernyataan: string;
  skor: number; // 1 - 4
  levelLabel?: string; // 'Perlu Bimbingan' | 'Mulai Berkembang' | 'Berkembang Sesuai Harapan' | 'Berkembang Sangat Baik'
  deskripsiCapaian?: string;
}

export interface DimensiAsesmenItem {
  id: string;
  nama: string;
  deskripsi?: string;
}

export interface DimensiTemanSejawatConfig {
  id: string;
  kelasId: string; // 'all' atau ID kelas spesifik (atau ID pertama)
  kelasIds?: string[]; // Mendukung lebih dari 1 kelas sekaligus (misal pembelajaran gabungan 3 rombel)
  kegiatan?: string;
  dimensiList: DimensiAsesmenItem[];
  updatedAt?: string;
  guruNama?: string;
}

export interface SkorDimensi {
  dimensiId: string;
  nama: string;
  skor: number; // 1 - 5
}

export interface PenilaianTemanSejawat {
  id: string;
  tugasId?: string; // ID Tugas Penilaian Antar Teman jika dikaitkan
  penilaiId: string; // Murid / Guru penilai
  penilaiNama: string;
  targetMuridId: string; // Murid yang dinilai
  targetMuridNama: string;
  targetNis?: string;
  kelasId: string;
  kelasNama?: string;
  tanggal: string; // YYYY-MM-DD
  kegiatanPraktik: string; // e.g. "Permainan Bola Voli Tim"
  materiId?: string; // ID materi pembelajaran terkait
  materiJudul?: string; // Judul materi pembelajaran terkait
  // Evaluasi Rubrik Indikator (Skala 1 - 4)
  nilaiIndikator?: NilaiIndikatorItem[];
  // Dynamic Dimensi Asesmen (diisi manual oleh guru)
  dimensiScores?: SkorDimensi[];
  // Aspek Penilaian Teman (Skala 1 - 5) - fallback & kompatibilitas
  skorKerjaSama: number; // 1-5: Kekompakan saat bermain
  skorSportivitas: number; // 1-5: Sikap sportif dan adil
  skorKomunikasi: number; // 1-5: Saling menyemangati & berbicara sopan
  skorTanggungJawab: number; // 1-5: Menjalankan peran dalam kelompok
  rataRata?: number; // 1.0 - 5.0 atau 1.0 - 4.0
  catatanPositif: string; // Kesan baik / apresiasi terhadap teman
  catatanPerbaikan?: string; // Saran perbaikan
  linkDokumentasi?: string; // Upload link / URL dokumentasi video/foto praktik bersama teman
  namaLinkDokumentasi?: string;
  buktiFotoUrl?: string; // Foto bukti gerakan
  buktiVideoUrl?: string; // Video bukti gerakan
  isEdited?: boolean; // Penanda apakah pernah diedit
  createdAt: string;
  updatedAt?: string;
}

export type PenilaianAntarTeman = PenilaianTemanSejawat;

// ----------------------------------------------------
// PENILAIAN HARIAN (TOMBOL CEPAT 1 - 5)
// ----------------------------------------------------
export interface PenilaianHarian {
  id: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  kelasId: string;
  kelasNama?: string;
  tanggal: string; // YYYY-MM-DD
  pertemuanKe?: number;
  materi: string; // Materi hari ini (misal "Passing Bawah Bola Voli")
  skor: number; // 1, 2, 3, 4, 5
  // 1 = Perlu Bimbingan Khusus
  // 2 = Kurang
  // 3 = Cukup
  // 4 = Baik
  // 5 = Sangat Baik / Mahir
  aspek?: string; // e.g. "Keaktifan & Antusiasme Gerak", "Penguasaan Teknik", "Kebugaran Fisik"
  catatan?: string;
  // Kotak Centang Keaktifan Harian
  bisaMenjawabCount?: number; // Berapa kali bisa menjawab (0, 1, 2, 3+)
  memberikanMasukan?: boolean; // Memberikan masukan / saran aktif
  mauAktif?: boolean; // Mau aktif gerak
  guruId?: string;
  guruNama?: string;
  updatedAt?: string;
}

export interface JurnalMengajar {
  id: string;
  tanggal: string;
  kelasId: string;
  kelasNama: string;
  materi?: string;
  materiJudul?: string;
  tujuanPembelajaran?: string;
  kegiatanPembelajaran?: string;
  kegiatan?: string;
  metode?: string; // e.g. "Demonstrasi, Problem-Based Learning, Praktik Lapangan"
  media?: string; // e.g. "Bola Voli, Lapangan, Peluit, Stopwatch"
  kehadiranRingkas?: string; // e.g. "H: 32, S: 1, I: 1, A: 0, T: 0"
  jumlahHadir?: number;
  jumlahTidakHadir?: number;
  catatanRefleksi?: string;
  catatanKhusus?: string;
  hambatan?: string;
  tindakLanjut?: string;
  jamKe?: string;
  guruId: string;
  guruNama: string;
}

export interface RekapNilaiMurid {
  id?: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  kelasId?: string;
  kelasNama?: string;
  semester?: string;
  tugas: number;
  quiz: number;
  praktik: number;
  pengetahuan: number;
  keterampilan: number;
  sikap: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D' | '-';
}

export type NilaiItem = RekapNilaiMurid;

export interface SoalRefleksi {
  id: string;
  pertanyaan: string;
  tipe: 'teks' | 'skala' | 'pilihan';
  kategori?: 'pemahaman' | 'kesulitan' | 'perasaan' | 'tindak_lanjut';
  opsi?: string[];
}

export interface RefleksiPembelajaran {
  id: string;
  judul: string;
  subJudul?: string;
  deskripsi?: string;
  materiId?: string;
  materiJudul?: string;
  kelasIds?: string[];
  kelasId?: string;
  targetKelasId?: string;
  guruId: string;
  guruNama: string;
  tanggalDibuat: string;
  deadline?: string;
  status: 'Aktif' | 'Ditutup' | 'Publish' | 'Draft';
  statusPublikasi?: 'Publish' | 'Draft';
  soalList: SoalRefleksi[];
}

export interface JawabanRefleksiMurid {
  id: string;
  refleksiId: string;
  refleksiJudul?: string;
  muridId: string;
  muridNama: string;
  kelasId: string;
  kelasNama?: string;
  tanggalIsi?: string;
  tanggalDiisi?: string;
  skalaEmosi?: 'sangat_senang' | 'senang' | 'netral' | 'kesulitan';
  mood?: string;
  jawaban: {
    soalId: string;
    pertanyaan: string;
    jawaban?: any;
    jawabanTeks?: string;
    nilaiSkala?: number;
  }[];
  catatanGuru?: string;
  tanggalTanggapanGuru?: string;
}

export interface NotifikasiItem {
  id: string;
  judul: string;
  pesan: string;
  waktu: string;
  tipe: 'tugas' | 'quiz' | 'nilai' | 'pengumuman' | 'presensi' | 'deadline' | 'materi' | string;
  dibaca: boolean;
  targetRole?: UserRole | 'ALL';
  targetMuridId?: string;
  targetKelasId?: string;
  targetKelasNama?: string;
  targetId?: string;
  targetMenu?: string;
  isUrgentDeadline?: boolean;
}

export interface PengaturanSekolah {
  namaSekolah: string;
  npsn?: string;
  logoSekolah?: string;
  tahunPelajaran: string;
  semester?: 'Ganjil' | 'Genap';
  semesterAktif?: string;
  namaKepalaSekolah?: string;
  kepalaSekolahNama?: string;
  nipKepalaSekolah?: string;
  kepalaSekolahNip?: string;
  namaGuruPJOKUtama?: string;
  guruPjokNama?: string;
  nipGuruPJOKUtama?: string;
  guruPjokNip?: string;
  mataPelajaran?: string;
  temaWarna?: string;
  terakhirSinkron?: string;
}

export type SettingsApp = PengaturanSekolah;

/**
 * Helper to get the list of classes assigned to a specific teacher
 */
export function getTeacherAssignedClasses(teacher: User | null | undefined, allKelas: Kelas[]): Kelas[] {
  if (!teacher || !allKelas || allKelas.length === 0) return [];
  if (teacher.role !== 'GURU') return allKelas;

  // 1. Check if teacher has explicit kelasDiampuIds
  if (Array.isArray(teacher.kelasDiampuIds) && teacher.kelasDiampuIds.length > 0) {
    const matched = allKelas.filter((k) => teacher.kelasDiampuIds!.includes(k.id));
    if (matched.length > 0) return matched;
  }

  // 2. Check if teacher has explicit kelasDiampu names (e.g. ['XI 1', 'XI 2'])
  if (Array.isArray(teacher.kelasDiampu) && teacher.kelasDiampu.length > 0) {
    const matched = allKelas.filter((k) =>
      teacher.kelasDiampu!.some((nama) => nama.toLowerCase().trim() === k.nama.toLowerCase().trim())
    );
    if (matched.length > 0) return matched;
  }

  // 3. Check Kelas properties (guruPengampuId or guruPengampuNama)
  const byPengampu = allKelas.filter((k) => {
    if (k.guruPengampuId && k.guruPengampuId === teacher.id) return true;
    if (k.guruPengampuNama && teacher.name && k.guruPengampuNama.toLowerCase().trim() === teacher.name.toLowerCase().trim()) return true;
    return false;
  });

  if (byPengampu.length > 0) return byPengampu;

  // 4. Fallback: if no specific class is assigned yet, return all classes so teacher can still operate
  return allKelas;
}

export type KategoriPengumuman = 'Penting' | 'Tugas' | 'Materi' | 'Informasi';

export interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  kategori?: KategoriPengumuman;
  disematkan?: boolean; // Prioritas disematkan (pinned)
  targetRole?: 'ALL' | 'MURID' | 'GURU';
  targetKelasId?: string; // 'ALL' or specific kelas id e.g. 'cls-xi-1'
  targetKelasNama?: string;
  targetKelasIds?: string[]; // Mendukung pemilihan lebih dari 1 kelas rombel target
  targetKelasNamas?: string[];
  prioritas?: 'Biasa' | 'Penting' | 'Mendesak';
  lampiranUrl?: string;
  namaLampiran?: string;
  guruId: string;
  guruNama: string;
  guruNip?: string;
  guruAvatar?: string;
  guruMataPelajaran?: string;
  tanggalDibuat: string; // ISO string
  dibacaOleh?: string[]; // user IDs who have read this announcement
  tautanAksi?: {
    label: string;
    menuTarget?: string; // e.g. 'tugas-saya', 'materi-saya', 'quiz-saya'
    targetId?: string;
    url?: string;
  };
}

/**
 * Intelligent helper to resolve any class identifier (name, code, or ID) to a valid Kelas ID
 */
export function resolveKelasId(
  rawInput: string | undefined | null,
  allKelas: Kelas[],
  fallbackId?: string
): { id: string; nama: string } {
  if (!allKelas || allKelas.length === 0) {
    return { id: fallbackId || '', nama: '' };
  }

  if (!rawInput || !rawInput.trim()) {
    const defaultK = (fallbackId && allKelas.find((k) => k.id === fallbackId)) || allKelas[0];
    return { id: defaultK ? defaultK.id : '', nama: defaultK ? defaultK.nama : '' };
  }

  const clean = rawInput.trim();
  const lower = clean.toLowerCase();
  const normalized = lower.replace(/[^a-z0-9]/g, '');

  // 1. Direct ID match
  const matchId = allKelas.find((k) => k.id.toLowerCase() === lower);
  if (matchId) return { id: matchId.id, nama: matchId.nama };

  // 2. Direct exact name match
  const matchName = allKelas.find((k) => k.nama.toLowerCase() === lower);
  if (matchName) return { id: matchName.id, nama: matchName.nama };

  // 3. Normalized name comparison (e.g. "xi1" vs "XI 1", "clsxi1" vs "cls-xi-1")
  const matchNormalized = allKelas.find((k) => {
    const kNormId = k.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const kNormNama = k.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
    return kNormId === normalized || kNormNama === normalized;
  });
  if (matchNormalized) return { id: matchNormalized.id, nama: matchNormalized.nama };

  // 4. Pattern check (e.g. "11-1" -> "XI 1", "10-1" -> "X 1", "12-1" -> "XII 1")
  let mappedTingkat = '';
  if (normalized.startsWith('10') || normalized.startsWith('x') && !normalized.startsWith('xi') && !normalized.startsWith('xii')) {
    mappedTingkat = 'X';
  } else if (normalized.startsWith('11') || normalized.startsWith('xi') && !normalized.startsWith('xii')) {
    mappedTingkat = 'XI';
  } else if (normalized.startsWith('12') || normalized.startsWith('xii')) {
    mappedTingkat = 'XII';
  }

  if (mappedTingkat) {
    // Extract trailing number
    const numMatch = normalized.match(/\d+$/);
    const rombelNum = numMatch ? numMatch[0] : '1';
    const targetName = `${mappedTingkat} ${rombelNum}`.toLowerCase();
    const foundByPattern = allKelas.find((k) => k.nama.toLowerCase() === targetName);
    if (foundByPattern) return { id: foundByPattern.id, nama: foundByPattern.nama };
  }

  // 5. Fallback
  const fallback = allKelas.find((k) => k.id === fallbackId) || allKelas[0];
  return { id: fallback.id, nama: fallback.nama };
}

export type ActivityLogCategory =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'PASSWORD_RESET'
  | 'STATUS_CHANGE'
  | 'CLASS_ASSIGNMENT'
  | 'DB_SYNC'
  | 'DB_RESET'
  | 'DATA_MODIFICATION'
  | 'TRASH_MOVE'
  | 'TRASH_RESTORE'
  | 'TRASH_PERMANENT_DELETE';

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO string
  category: ActivityLogCategory;
  actorName: string;
  actorRole: UserRole | 'SYSTEM' | 'GUEST';
  actorId?: string;
  targetName?: string;
  targetRole?: UserRole;
  targetId?: string;
  action: string;
  details: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'INFO';
  ipOrDevice?: string;
  metadata?: Record<string, any>;
}

export interface TrashUserItem {
  id: string; // unique ID in trash
  user: User;
  deletedAt: string; // ISO timestamp
  deletedBy?: string;
  role: UserRole;
  originalKelasId?: string;
}

export const APP_VERSION = '2.6.2';
export const APP_VERSION_LABEL = 'VERSI 2.6.2 - 2026 PJOK SMAN 1 TEJAKULA';

// ----------------------------------------------------
// FORM PENDAMPINGAN MURID (PEMBINAAN SISWA BERMASALAH / ALPA)
// ----------------------------------------------------
export type StatusPendampingan =
  | 'Dalam Proses'
  | 'Selesai / Teratasi'
  | 'Perlu Pemantauan Khusus'
  | 'Dirujuk ke Guru BK';

export interface PendampinganMuridRecord {
  id: string;
  muridId: string;
  muridNama: string;
  nis?: string;
  kelasId: string;
  kelasNama: string;
  tanggal: string; // YYYY-MM-DD
  jumlahAlpa: number; // Jumlah akumulasi alpa saat didata
  tanggalAlpaList?: string[]; // Tanggal-tanggal saat murid berstatus Alpa
  jenisMasalah: string; // e.g. Sering Alpa / Bolos, Tidak Mengikuti Praktik, Kedisiplinan, dll.
  deskripsiMasalah: string; // Kronologi / alasan ketidakhadiran siswa
  tindakanPenanganan: string; // Bentuk pembinaan / bimbingan oleh guru PJOK
  komitmenMurid: string; // Komitmen / janji tertulis siswa
  status: StatusPendampingan;
  guruId: string;
  guruNama: string;
  catatanGuru?: string;
  createdAt: string;
  updatedAt?: string;
}


