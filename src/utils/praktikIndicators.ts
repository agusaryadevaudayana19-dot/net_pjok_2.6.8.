import { IndikatorPraktik } from '../types';

export interface IndikatorTemplate {
  id: string;
  nama: string;
  deskripsi: string;
  kategori?: string;
}

export const MASTER_INDIKATOR_LIBRARY: Record<string, IndikatorTemplate[]> = {
  'voli': [
    {
      id: 'ind-voli-1',
      nama: 'Sikap Awalan & Kuda-kuda Kaki',
      deskripsi: 'Kaki dibuka selebar bahu, lutut ditekuk rileks, berat badan seimbang di ujung kaki.',
    },
    {
      id: 'ind-voli-2',
      nama: 'Posisi Lengan & Ayunan Lurus',
      deskripsi: 'Kedua ibu jari sejajar, siku dikunci lurus rapat, ayunan lengan dari bawah ke depan atas.',
    },
    {
      id: 'ind-voli-3',
      nama: 'Titik Sentuh Bola (Impact Point)',
      deskripsi: 'Perkenaan bola tepat di bagian bidang datar pergelangan tangan, tidak memantul ke samping.',
    },
    {
      id: 'ind-voli-4',
      nama: 'Koordinasi Dorongan Lutut & Panggul',
      deskripsi: 'Mengekstensikan sendi lutut dan pinggul saat menyentuh bola untuk menghasilkan tenaga halus.',
    },
    {
      id: 'ind-voli-5',
      nama: 'Akurasi & Ketinggian Lambungan',
      deskripsi: 'Arah lambungan bola parabola stabil dan terarah tepat ke sasaran pengumpan/setter.',
    },
    {
      id: 'ind-voli-6',
      nama: 'Sikap Akhir & Follow Through',
      deskripsi: 'Keseimbangan terjaga tanpa terjatuh, pandangan mengikuti arah bola, kembali siap siaga.',
    },
    {
      id: 'ind-voli-7',
      nama: 'Sportivitas & Komunikasi Tim',
      deskripsi: 'Memanggil bola aktif dengan suara jelas, mematuhi instruksi guru dan menghargai teman.',
    },
  ],
  'sepak bola': [
    {
      id: 'ind-bola-1',
      nama: 'Posisi Kaki Tumpu di Samping Bola',
      deskripsi: 'Kaki tumpu diletakkan sekitar 15 cm di samping bola, ujung kaki mengarah ke sasaran.',
    },
    {
      id: 'ind-bola-2',
      nama: 'Titik Sentuh & Perkenaan Kaki',
      deskripsi: 'Perkenaan bola tepat di tengah bola menggunakan kaki bagian dalam/luar/kura-kura.',
    },
    {
      id: 'ind-bola-3',
      nama: 'Kontrol Bola & Penguasaan Tubuh',
      deskripsi: 'Bola tidak memantul terlalu jauh dari penguasaan tubuh, badan condong stabil.',
    },
    {
      id: 'ind-bola-4',
      nama: 'Akurasi Operan & Laju Bola',
      deskripsi: 'Bola meluncur datar stabil dan tepat sasaran kepada rekan atau gawang target.',
    },
    {
      id: 'ind-bola-5',
      nama: 'Gerakan Lanjutan (Follow Through)',
      deskripsi: 'Kaki penendang melanjutkan ayunan ke depan mengikuti garis lintasan bola.',
    },
    {
      id: 'ind-bola-6',
      nama: 'Kelincahan & Pandangan Lapangan',
      deskripsi: 'Kepala tegak memindai lapangan, tidak hanya menatap bola saat bergerak.',
    },
  ],
  'bulutangkis': [
    {
      id: 'ind-bad-1',
      nama: 'Pegangan Raket (Grip Forehand/Backhand)',
      deskripsi: 'Ibu jari dan jari telunjuk membentuk huruf V, cengkeraman rileks tidak kaku.',
    },
    {
      id: 'ind-bad-2',
      nama: 'Footwork & Posisi Kaki',
      deskripsi: 'Langkah kaki lincah menjangkau shuttlecock dengan tumpuan kaki dominan di depan.',
    },
    {
      id: 'ind-bad-3',
      nama: 'Titik Kontak Shuttlecock Tertinggi',
      deskripsi: 'Memukul shuttlecock di titik jangkauan optimal di atas kepala atau depan badan.',
    },
    {
      id: 'ind-bad-4',
      nama: 'Akurasi & Penempatan Pukulan',
      deskripsi: 'Shuttlecock jatuh di area bidang target (dalam garis batas lawan).',
    },
    {
      id: 'ind-bad-5',
      nama: 'Recovery Posisi Tengah Lapangan',
      deskripsi: 'Segera kembali ke base camp tengah lapangan setelah melepaskan pukulan.',
    },
  ],
  'senam': [
    {
      id: 'ind-senam-1',
      nama: 'Sikap Awalan & Posisi Telapak Tangan',
      deskripsi: 'Jongkok seimbang, kedua tangan bertumpu di atas matras selebar bahu.',
    },
    {
      id: 'ind-senam-2',
      nama: 'Tengkuk Menyentuh Matras (Dagu Rapat)',
      deskripsi: 'Dagu ditarik rapat ke dada, ubun-ubun kepala tidak membentur matras.',
    },
    {
      id: 'ind-senam-3',
      nama: 'Bentuk Badan Membulat (Tuck Position)',
      deskripsi: 'Lutut dirapatkan ke dada, badan menggulung bulat dengan rapi dan mulus.',
    },
    {
      id: 'ind-senam-4',
      nama: 'Dorongan Tangan & Kecepatan Berguling',
      deskripsi: 'Tolakan kedua tangan kuat dan simetris mendorong tubuh berguling lurus.',
    },
    {
      id: 'ind-senam-5',
      nama: 'Sikap Akhir & Pendaratan Tegak',
      deskripsi: 'Mendarat kembali dengan kedua kaki rapat, bertumpu stabil tanpa terjengkang.',
    },
  ],
  'kebugaran': [
    {
      id: 'ind-fit-1',
      nama: 'Kesesuaian Teknik Postur Gerak',
      deskripsi: 'Posisi tubuh lurus, sudut siku/lutut memenuhi standar penilaian tes fisik.',
    },
    {
      id: 'ind-fit-2',
      nama: 'Konsistensi Irama & Ritme Gerakan',
      deskripsi: 'Mampu menjaga tempo dan ritme stabil tanpa terputus sepanjang repetisi tes.',
    },
    {
      id: 'ind-fit-3',
      nama: 'Kepatuhan Regulasi & Instruksi',
      deskripsi: 'Mematuhi sinyal aba-aba mulai dan selesai dengan penuh kedisiplinan.',
    },
    {
      id: 'ind-fit-4',
      nama: 'Semangat Pantang Menyerah & Daya Juang',
      deskripsi: 'Berupaya mengerahkan kapasitas fisik maksimal secara jujur dan optimal.',
    },
  ],
  'basket': [
    {
      id: 'ind-bsk-1',
      nama: 'Kuda-kuda Triple Threat & Grip Bola',
      deskripsi: 'Kaki siap melangkah, kedua tangan memegang bola kokoh di depan dada.',
    },
    {
      id: 'ind-bsk-2',
      nama: 'Pelepasan Bola & Snap Pergelangan',
      deskripsi: 'Dorongan lurus dari dada dengan lecutan pergelangan tangan (wrist snap).',
    },
    {
      id: 'ind-bsk-3',
      nama: 'Akurasi & Target Lemparan',
      deskripsi: 'Bola meluncur setinggi dada rekan penerima tanpa melambung liar.',
    },
    {
      id: 'ind-bsk-4',
      nama: 'Keseimbangan Tubuh & Kesiapan Gerak',
      deskripsi: 'Keseimbangan kaki terjaga, siap bergerak memotong atau bertahan.',
    },
  ],
  'atletik': [
    {
      id: 'ind-atl-1',
      nama: 'Sikap Kesiapan Start & Aba-aba',
      deskripsi: 'Posisi tubuh stabil mengikuti aba-aba bersedia, siap, dan reaksi cepat pada letupan.',
    },
    {
      id: 'ind-atl-2',
      nama: 'Ayunan Lengan Dinamis & Efisien',
      deskripsi: 'Lengan ditekuk 90 derajat berayun selaras dari pinggul ke depan dada.',
    },
    {
      id: 'ind-atl-3',
      nama: 'Frekuensi & Langkah Kaki Optimal',
      deskripsi: 'Langkah kaki bertenaga pada telapak kaki depan, dorongan panggul optimal.',
    },
    {
      id: 'ind-atl-4',
      nama: 'Sikap Tubuh Menembus Garis Finish',
      deskripsi: 'Dada condong ke depan melintasi garis finish tanpa melompat atau memperlambat.',
    },
  ],
  'umum': [
    {
      id: 'ind-gen-1',
      nama: 'Sikap Awal & Kesiapan Gerakan',
      deskripsi: 'Memposisikan tubuh dengan kuda-kuda kokoh dan siap melakukan gerakan olahraga.',
    },
    {
      id: 'ind-gen-2',
      nama: 'Pelaksanaan Teknik Inti',
      deskripsi: 'Mengeksekusi tahapan teknik gerak sesuai instruksi dan prinsip biomekanika.',
    },
    {
      id: 'ind-gen-3',
      nama: 'Titik Sentuh / Kualitas Hasil Gerak',
      deskripsi: 'Hasil gerakan terarah, akurat, dan memenuhi target capaian pembelajaran.',
    },
    {
      id: 'ind-gen-4',
      nama: 'Keseimbangan & Sikap Akhir',
      deskripsi: 'Menjaga kestabilan tubuh setelah gerakan tuntas (follow through).',
    },
    {
      id: 'ind-gen-5',
      nama: 'Sportivitas, Keselamatan & Etika',
      deskripsi: 'Menghargai keselamatan diri dan orang lain, mematuhi norma olahraga PJOK.',
    },
  ],
};

export const DEFAULT_STANDAR_INDIKATOR: IndikatorTemplate[] = [
  {
    id: 'ind-std-1',
    nama: '1. Sikap Awalan & Kuda-kuda',
    deskripsi: 'Kesiapan posisi kaki, lutut, dan postur badan sebelum gerakan dimulai.',
  },
  {
    id: 'ind-std-2',
    nama: '2. Eksekusi Teknik Gerak Inti',
    deskripsi: 'Kebenaran pola gerak, koordinasi sendi, dan timing ayunan/dorongan.',
  },
  {
    id: 'ind-std-3',
    nama: '3. Titik Sentuh / Ketepatan Gerakan',
    deskripsi: 'Presisi perkenaan bola/alat/matras dan efektivitas tenaga yang disalurkan.',
  },
  {
    id: 'ind-std-4',
    nama: '4. Sikap Akhir (Follow Through)',
    deskripsi: 'Keseimbangan pendaratan tubuh dan kesiapan kembali ke posisi siaga.',
  },
  {
    id: 'ind-std-5',
    nama: '5. Sportivitas & Kedisiplinan',
    deskripsi: 'Mematuhi instruksi guru, memelihara keselamatan, dan menjunjung sportivitas.',
  },
];

/**
 * Mencari indikator yang paling sesuai berdasarkan judul materi pembelajaran
 */
export function getSuggestedIndicatorsForMateri(materiJudul: string): IndikatorTemplate[] {
  const q = (materiJudul || '').toLowerCase();

  if (q.includes('voli') || q.includes('volley')) {
    return MASTER_INDIKATOR_LIBRARY['voli'];
  }
  if (q.includes('sepak') || q.includes('futsal') || q.includes('bola besar')) {
    return MASTER_INDIKATOR_LIBRARY['sepak bola'];
  }
  if (q.includes('bulutangkis') || q.includes('badminton')) {
    return MASTER_INDIKATOR_LIBRARY['bulutangkis'];
  }
  if (q.includes('senam') || q.includes('lantai') || q.includes('roll')) {
    return MASTER_INDIKATOR_LIBRARY['senam'];
  }
  if (q.includes('kebugaran') || q.includes('jasmani') || q.includes('mft') || q.includes('push up')) {
    return MASTER_INDIKATOR_LIBRARY['kebugaran'];
  }
  if (q.includes('basket')) {
    return MASTER_INDIKATOR_LIBRARY['basket'];
  }
  if (q.includes('lari') || q.includes('atletik') || q.includes('estafet') || q.includes('sprint')) {
    return MASTER_INDIKATOR_LIBRARY['atletik'];
  }

  return DEFAULT_STANDAR_INDIKATOR;
}

/**
 * Konversi daftar template indikator menjadi objek IndikatorPraktik dengan skor awal (default 3 / Baik)
 */
export function createDefaultIndikatorPraktikList(
  templates: IndikatorTemplate[],
  defaultScore: number = 3
): IndikatorPraktik[] {
  return templates.map((t) => ({
    id: t.id || `ind-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nama: t.nama,
    deskripsi: t.deskripsi,
    skor: defaultScore,
  }));
}

/**
 * Kriteria Penilaian Praktik PJOK Sesuai Rentang Skor:
 * - Skor 1: Nilai 60 - 70
 * - Skor 2: Nilai 71 - 80
 * - Skor 3: Nilai 80 - 85
 * - Skor 4: Nilai 86 - 90
 */
export interface KriteriaSkorPraktik {
  skor: number;
  label: string;
  min: number;
  max: number;
  rentangText: string;
  deskripsi: string;
}

export const KRITERIA_SKOR_PRAKTIK: Record<number, KriteriaSkorPraktik> = {
  1: {
    skor: 1,
    label: 'Kurang',
    min: 60,
    max: 70,
    rentangText: '60 - 70',
    deskripsi: 'Penguasaan teknik dasar masih kurang dan butuh bimbingan intensif',
  },
  2: {
    skor: 2,
    label: 'Cukup',
    min: 71,
    max: 80,
    rentangText: '71 - 80',
    deskripsi: 'Mampu melakukan teknik gerakan meski belum konsisten',
  },
  3: {
    skor: 3,
    label: 'Baik',
    min: 80,
    max: 85,
    rentangText: '80 - 85',
    deskripsi: 'Pola gerak dan koordinasi baik, teknik terarah dan lancar',
  },
  4: {
    skor: 4,
    label: 'Sangat Baik',
    min: 86,
    max: 90,
    rentangText: '86 - 90',
    deskripsi: 'Gerakan presisi, otomatis, kontrol tinggi dan sportivitas prima',
  },
};

/**
 * Menghitung nilai skala 100 sesuai kriteria rentang:
 * - Skor 1: 60-70
 * - Skor 2: 71-80
 * - Skor 3: 80-85
 * - Skor 4: 86-90
 * Disesuaikan dengan persentase kehadiran murid dan variasi acak (random).
 */
export function calculatePraktikNilaiFromCriteria(
  skorSkala4: number,
  attendanceRate: number = 1.0,
  seedOrRandom?: number | string
): number {
  let min = 80;
  let max = 85;

  if (skorSkala4 < 1.75) {
    min = 60;
    max = 70;
  } else if (skorSkala4 < 2.75) {
    min = 71;
    max = 80;
  } else if (skorSkala4 < 3.75) {
    min = 80;
    max = 85;
  } else {
    min = 86;
    max = 90;
  }

  const range = max - min;

  // Pseudo-random factor between 0 and 1
  let randomFactor = 0.5;
  if (typeof seedOrRandom === 'number') {
    randomFactor = Math.abs(Math.sin(seedOrRandom * 123.45)) % 1;
  } else if (typeof seedOrRandom === 'string') {
    let hash = 0;
    for (let i = 0; i < seedOrRandom.length; i++) {
      hash = (hash << 5) - hash + seedOrRandom.charCodeAt(i);
      hash |= 0;
    }
    randomFactor = Math.abs(Math.sin(hash)) % 1;
  } else {
    randomFactor = Math.random();
  }

  // Attendance rate (clamped between 0.5 and 1.0)
  const clampedAttendance = Math.min(1.0, Math.max(0.5, attendanceRate));

  // Bobot: 60% kehadiran, 40% variasi acak dalam interval kriteria
  const combinedFactor = clampedAttendance * 0.6 + randomFactor * 0.4;
  const result = Math.round(min + combinedFactor * range);

  // Pastikan SELALU strictly berada di dalam interval min - max yang diminta
  return Math.min(max, Math.max(min, result));
}

/**
 * Menghitung nilai akhir 0-100 dan predikat dari kumpulan indikator
 * Menggunakan kriteria rentang skor (1: 60-70, 2: 71-80, 3: 80-85, 4: 86-90)
 * yang disesuaikan dengan kehadiran dan variasi acak.
 */
export function calculateIndikatorScore(
  indikatorList: IndikatorPraktik[],
  options?: {
    attendanceRate?: number;
    seed?: number | string;
  }
): {
  totalSkor: number;
  maxSkor: number;
  nilai100: number;
  rataRataSkala4: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  predikatLabel: string;
  rentangKriteria: string;
} {
  if (!indikatorList || indikatorList.length === 0) {
    return {
      totalSkor: 0,
      maxSkor: 4,
      nilai100: 82,
      rataRataSkala4: 3.0,
      predikat: 'B',
      predikatLabel: 'B (Baik)',
      rentangKriteria: '80 - 85',
    };
  }

  const totalSkor = indikatorList.reduce((sum, ind) => sum + (Number(ind.skor) || 1), 0);
  const maxSkor = indikatorList.length * 4;
  const rataRataSkala4 = Number((totalSkor / indikatorList.length).toFixed(2));

  const attendanceRate = options?.attendanceRate ?? 1.0;
  const seed = options?.seed;

  // Hitung nilai berdasarkan kriteria skor
  const nilai100 = calculatePraktikNilaiFromCriteria(rataRataSkala4, attendanceRate, seed);

  let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
  let predikatLabel = 'C (Cukup)';
  let rentangKriteria = '80 - 85';

  if (rataRataSkala4 >= 3.75) {
    predikat = 'A';
    predikatLabel = 'A (Sangat Baik)';
    rentangKriteria = '86 - 90';
  } else if (rataRataSkala4 >= 2.75) {
    predikat = 'B';
    predikatLabel = 'B (Baik)';
    rentangKriteria = '80 - 85';
  } else if (rataRataSkala4 >= 1.75) {
    predikat = 'C';
    predikatLabel = 'C (Cukup)';
    rentangKriteria = '71 - 80';
  } else {
    predikat = 'D';
    predikatLabel = 'D (Kurang)';
    rentangKriteria = '60 - 70';
  }

  return {
    totalSkor,
    maxSkor,
    nilai100,
    rataRataSkala4,
    predikat,
    predikatLabel,
    rentangKriteria,
  };
}

export const SKALA_INDIKATOR_INFO: Record<
  number,
  { label: string; badge: string; short: string; bg: string; text: string; activeBg: string; rentang: string }
> = {
  1: {
    label: 'Kurang (Skor 1)',
    short: 'Kurang',
    badge: 'K',
    rentang: 'Nilai 60 - 70',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    text: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold ring-2 ring-rose-400',
  },
  2: {
    label: 'Cukup (Skor 2)',
    short: 'Cukup',
    badge: 'C',
    rentang: 'Nilai 71 - 80',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    text: 'text-amber-700',
    activeBg: 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold ring-2 ring-amber-400',
  },
  3: {
    label: 'Baik (Skor 3)',
    short: 'Baik',
    badge: 'B',
    rentang: 'Nilai 80 - 85',
    bg: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    text: 'text-sky-700',
    activeBg: 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-400',
  },
  4: {
    label: 'Sangat Baik (Skor 4)',
    short: 'Sangat Baik',
    badge: 'SB',
    rentang: 'Nilai 86 - 90',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold ring-2 ring-emerald-400',
  },
};
