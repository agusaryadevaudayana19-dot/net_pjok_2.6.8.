import { Materi } from '../types';

/**
 * Standard Kurikulum Merdeka PJOK Phase E & F Categories
 */
export const STANDARD_MATERI_CATEGORIES = [
  'Permainan Bola Besar',
  'Permainan Bola Kecil',
  'Atletik',
  'Kebugaran Jasmani',
  'Aktivitas Senam',
  'Aktivitas Air',
  'Kesehatan',
];

/**
 * Semantic keyword mapping for flexible sport-group resolution
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'permainan bola besar': [
    'bola besar',
    'sepak bola',
    'sepakbola',
    'bola voli',
    'voli',
    'volleyball',
    'bola basket',
    'basket',
    'basketball',
    'futsal',
    'bola tangan',
    'handball',
  ],
  'permainan bola kecil': [
    'bola kecil',
    'bulutangkis',
    'bulu tangkis',
    'badminton',
    'tenis meja',
    'tenismeja',
    'pingpong',
    'kasti',
    'rounders',
    'softball',
    'kriket',
    'tenis lapangan',
    'tenis',
  ],
  'atletik': [
    'atletik',
    'lari',
    'sprint',
    'estafet',
    'lari jarak pendek',
    'lari jarak menengah',
    'lari jarak jauh',
    'maraton',
    'jalan cepat',
    'lompat jauh',
    'lompat tinggi',
    'tolak peluru',
    'lempar lembing',
    'lempar cakram',
  ],
  'kebugaran jasmani': [
    'kebugaran',
    'kebugaran jasmani',
    'aktivitas kebugaran',
    'daya tahan',
    'kekuatan',
    'kelenturan',
    'kelincahan',
    'denyut nadi',
    'push up',
    'sit up',
    'vo2max',
    'aerobik',
    'cardio',
  ],
  'aktivitas senam': [
    'senam',
    'aktivitas senam',
    'senam lantai',
    'ritmik',
    'guling depan',
    'guling belakang',
    'kayang',
    'sikap lilin',
    'headstand',
    'handstand',
    'skj',
    'senam irama',
  ],
  'aktivitas air': [
    'aktivitas air',
    'renang',
    'gaya dada',
    'gaya bebas',
    'gaya punggung',
    'gaya kupu-kupu',
    'penyelamatan air',
    'keselamatan air',
    'aquatik',
  ],
  'kesehatan': [
    'kesehatan',
    'pola hidup sehat',
    'p3k',
    'hidup sehat',
    'nutrisi',
    'gizi',
    'narkoba',
    'pencegahan cedera',
    'pertolongan pertama',
    'penyakit menular',
    'kesehatan reproduksi',
  ],
};

/**
 * Normalizes text for lenient comparison (removes symbols, extra spaces)
 */
export const normalizeCategoryText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Checks if a Materi matches the selected category filter with high tolerance
 */
export const isMateriCategoryMatch = (
  materi: Materi,
  selectedCategory: string
): boolean => {
  if (!selectedCategory || selectedCategory === 'Semua') {
    return true;
  }

  const matCat = (materi.kategori || '').trim().toLowerCase();
  const selCat = selectedCategory.trim().toLowerCase();
  const matJudul = (materi.judul || '').trim().toLowerCase();
  const matDeskripsi = (materi.deskripsi || '').trim().toLowerCase();

  // 1. Direct exact or substring matches on kategori
  if (matCat === selCat) return true;
  if (matCat.includes(selCat) || selCat.includes(matCat)) return true;

  // 2. Normalized alphanumeric match (e.g., "Bulu Tangkis" vs "Bulutangkis")
  const normMatCat = normalizeCategoryText(matCat);
  const normSelCat = normalizeCategoryText(selCat);
  if (normMatCat && normSelCat) {
    if (normMatCat === normSelCat) return true;
    if (normMatCat.includes(normSelCat) || normSelCat.includes(normMatCat)) return true;
  }

  // 3. Synonym / Group expansion match for Standard Categories
  for (const [standardKey, keywords] of Object.entries(CATEGORY_SYNONYMS)) {
    const isTargetingThisGroup =
      selCat === standardKey ||
      selCat.includes(standardKey) ||
      standardKey.includes(selCat);

    if (isTargetingThisGroup) {
      // Check if materi's category or title or description matches any keyword in the group
      const matchesGroup = keywords.some(
        (kw) =>
          matCat.includes(kw) ||
          matJudul.includes(kw) ||
          normalizeCategoryText(matCat).includes(normalizeCategoryText(kw)) ||
          normalizeCategoryText(matJudul).includes(normalizeCategoryText(kw))
      );
      if (matchesGroup) return true;
    }

    // Reverse check: If materi has a standard category and user selected a specific sport
    const materiInThisGroup =
      matCat === standardKey ||
      matCat.includes(standardKey) ||
      standardKey.includes(matCat);

    if (materiInThisGroup) {
      const selectedIsKeyword = keywords.some(
        (kw) =>
          selCat.includes(kw) ||
          kw.includes(selCat) ||
          normalizeCategoryText(selCat).includes(normalizeCategoryText(kw))
      );
      if (selectedIsKeyword && (matJudul.includes(selCat) || matDeskripsi.includes(selCat))) {
        return true;
      }
    }
  }

  // 4. Fallback: match by title or description
  if (matJudul.includes(selCat) || matDeskripsi.includes(selCat)) {
    return true;
  }

  return false;
};

/**
 * Builds an aggregated and deduplicated list of categories from DB + standard options
 */
export const getMateriCategoryList = (materiList: Materi[] = []): string[] => {
  // Extract all non-empty categories that actually exist in the database
  const dynamicCategories = new Set<string>();

  materiList.forEach((m) => {
    const cat = (m.kategori || '').trim();
    if (cat) {
      dynamicCategories.add(cat);
    }
  });

  // Always include standard categories
  STANDARD_MATERI_CATEGORIES.forEach((std) => dynamicCategories.add(std));

  // Sort list logically: 'Semua' first, then the rest
  const listWithoutSemua = Array.from(dynamicCategories).sort((a, b) => {
    // Keep standard categories prioritized at the top
    const aIdx = STANDARD_MATERI_CATEGORIES.indexOf(a);
    const bIdx = STANDARD_MATERI_CATEGORIES.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });

  return ['Semua', ...listWithoutSemua];
};
