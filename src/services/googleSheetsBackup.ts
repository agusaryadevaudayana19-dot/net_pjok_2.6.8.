import { LMSDatabase } from './dataStorage';
import { getGoogleAccessToken } from './firebaseAuth';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SpreadsheetSummary {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheetTitles: string[];
}

export const BACKUP_TAB_NAMES = [
  'Data_Murid',
  'Data_Guru_Staf',
  'Daftar_Kelas',
  'Rekap_Presensi',
  'Rekap_Nilai',
  'Materi_Pembelajaran',
  'Tugas_Dan_Kuis',
  'Cadangan_JSON_Utuh',
] as const;

/**
 * Extract spreadsheet ID from either a full Google Sheets URL or raw ID
 */
export function extractSpreadsheetId(input: string): string {
  const clean = (input || '').trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
}

/**
 * Fetch metadata of an existing Google Spreadsheet to verify access and get actual sheet tab names
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<SpreadsheetSummary> {
  const token = accessToken || getGoogleAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum terhubung. Silakan klik tombol Sign in with Google terlebih dahulu.');
  }

  const res = await fetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Gagal mengakses Google Spreadsheet (Kode ${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const sheetTitles: string[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: any) => s?.properties?.title).filter(Boolean)
    : [];

  return {
    spreadsheetId: data.spreadsheetId || spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: data.properties?.title || 'Database Cadangan LMS PJOK',
    sheetTitles,
  };
}

/**
 * Create a brand-new Google Spreadsheet with structured tabs for LMS PJOK backup
 */
export async function createBackupSpreadsheet(
  schoolName: string,
  accessToken?: string | null
): Promise<SpreadsheetSummary> {
  const token = accessToken || getGoogleAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum terhubung. Silakan klik tombol Sign in with Google terlebih dahulu.');
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const title = `Cadangan LMS PJOK - ${schoolName || 'SMAN 1 Tejakula'} (${dateStr})`;

  const body = {
    properties: {
      title,
      locale: 'id_ID',
    },
    sheets: BACKUP_TAB_NAMES.map((tabName, index) => ({
      properties: {
        title: tabName,
        index,
        gridProperties: {
          rowCount: 1500,
          columnCount: 20,
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Gagal membuat Google Spreadsheet baru (Kode ${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const sheetTitles: string[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: any) => s?.properties?.title).filter(Boolean)
    : [...BACKUP_TAB_NAMES];

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
    sheetTitles,
  };
}

/**
 * Ensure all required backup tabs exist in the target spreadsheet before writing values
 */
async function ensureBackupTabsExist(
  spreadsheetId: string,
  existingTitles: string[],
  token: string
): Promise<void> {
  const existingSet = new Set(existingTitles);
  const missingTabs = BACKUP_TAB_NAMES.filter((tab) => !existingSet.has(tab));

  if (missingTabs.length === 0) return;

  const requests = missingTabs.map((tabName) => ({
    addSheet: {
      properties: {
        title: tabName,
        gridProperties: {
          rowCount: 1500,
          columnCount: 20,
          frozenRowCount: 1,
        },
      },
    },
  }));

  const res = await fetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.warn('Warning adding missing sheets:', errBody);
  }
}

/**
 * Sync & write complete LMS database to the Google Spreadsheet
 */
export async function syncDatabaseToSpreadsheet(
  spreadsheetId: string,
  db: LMSDatabase,
  accessToken?: string | null
): Promise<{ updatedCells: number; spreadsheetUrl: string; title: string; timestamp: string }> {
  const token = accessToken || getGoogleAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum terhubung. Silakan klik tombol Sign in with Google terlebih dahulu.');
  }

  const meta = await getSpreadsheetMetadata(spreadsheetId, token);
  await ensureBackupTabsExist(spreadsheetId, meta.sheetTitles, token);

  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const kelasMap = new Map<string, string>();
  (db.kelas || []).forEach((k) => kelasMap.set(k.id, k.nama));

  // 1. Data_Murid
  const muridList = (db.users || []).filter((u) => u.role === 'MURID');
  const muridRows: string[][] = [
    [
      'No',
      'ID Murid',
      'Nama Lengkap',
      'NIS',
      'NISN',
      'Kelas',
      'Jenis Kelamin',
      'Username',
      'Status Akun',
      'Tahun Pelajaran',
      'Waktu Cadangan',
    ],
    ...muridList.map((m, idx) => [
      String(idx + 1),
      m.id || '',
      m.name || '',
      m.nis || '',
      m.nisn || '',
      kelasMap.get(m.kelasId || '') || m.kelasId || '-',
      m.jenisKelamin || '-',
      m.username || '',
      m.status || 'Aktif',
      m.tahunPelajaran || db.settings?.tahunPelajaran || '2026/2027',
      nowStr,
    ]),
  ];

  // 2. Data_Guru_Staf
  const stafList = (db.users || []).filter((u) => u.role === 'GURU' || u.role === 'ADMIN');
  const stafRows: string[][] = [
    ['No', 'ID Pengguna', 'Nama Lengkap', 'Peran', 'NIP', 'Username', 'Email', 'Mata Pelajaran', 'Status'],
    ...stafList.map((s, idx) => [
      String(idx + 1),
      s.id || '',
      s.name || '',
      s.role || '',
      s.nip || '-',
      s.username || '',
      s.email || '-',
      s.mataPelajaran || 'PJOK',
      s.status || 'Aktif',
    ]),
  ];

  // 3. Daftar_Kelas
  const kelasRows: string[][] = [
    ['No', 'ID Kelas', 'Nama Rombel', 'Tingkat', 'Guru Pengampu', 'Wali Kelas', 'Tahun Pelajaran', 'Jumlah Murid'],
    ...(db.kelas || []).map((k, idx) => {
      const count = muridList.filter((m) => m.kelasId === k.id || m.kelasId === k.nama).length;
      return [
        String(idx + 1),
        k.id || '',
        k.nama || '',
        k.tingkat || '',
        k.guruPengampuNama || '-',
        k.waliKelasNama || '-',
        k.tahunPelajaran || db.settings?.tahunPelajaran || '2026/2027',
        String(count),
      ];
    }),
  ];

  // 4. Rekap_Presensi
  const presensiRows: string[][] = [
    ['No', 'ID Presensi', 'Tanggal', 'Nama Murid', 'ID Murid', 'Kelas', 'Status Kehadiran', 'Guru Pencatat', 'Keterangan'],
    ...(db.presensi || []).map((p, idx) => [
      String(idx + 1),
      p.id || '',
      p.tanggal || '',
      p.muridNama || '',
      p.muridId || '',
      p.kelasNama || kelasMap.get(p.kelasId || '') || p.kelasId || '-',
      p.status || '',
      p.guruNama || '-',
      p.keterangan || '-',
    ]),
  ];

  // 5. Rekap_Nilai (Gabungan Jawaban Kuis, Pengumpulan Tugas, Penilaian Praktik, dan Penilaian Harian)
  const nilaiRows: string[][] = [
    ['No', 'Kategori Penilaian', 'Nama Murid', 'Kelas', 'Judul Tugas / Kuis / Materi', 'Nilai / Skor', 'Tanggal', 'Keterangan'],
  ];
  let nilaiIdx = 1;

  (db.jawabanQuiz || []).forEach((jq) => {
    nilaiRows.push([
      String(nilaiIdx++),
      'Kuis / Ujian',
      jq.muridNama || '',
      kelasMap.get(jq.kelasId || '') || jq.kelasId || '-',
      jq.quizJudul || '',
      String(jq.nilai ?? 0),
      jq.tanggalMengerjakan || '',
      `Benar: ${jq.jumlahBenar}, Salah: ${jq.jumlahSalah}`,
    ]);
  });

  (db.pengumpulanTugas || []).forEach((pt) => {
    nilaiRows.push([
      String(nilaiIdx++),
      'Tugas',
      pt.muridNama || '',
      kelasMap.get(pt.kelasId || '') || pt.kelasId || '-',
      pt.tugasJudul || pt.tugasId || '',
      pt.nilai !== undefined ? String(pt.nilai) : 'Belum Dinilai',
      pt.tanggalKumpul || '',
      pt.status || '',
    ]);
  });

  (db.penilaianPraktik || []).forEach((pp: any) => {
    nilaiRows.push([
      String(nilaiIdx++),
      'Praktik PJOK',
      pp.muridNama || '',
      kelasMap.get(pp.kelasId || '') || pp.kelasId || '-',
      pp.materiJudul || pp.materi || '',
      String(pp.nilaiAkhir ?? pp.skorTotal ?? 0),
      pp.tanggal || '',
      pp.predikat || pp.catatan || '-',
    ]);
  });

  (db.penilaianHarian || []).forEach((ph: any) => {
    nilaiRows.push([
      String(nilaiIdx++),
      'Penilaian Harian',
      ph.muridNama || '',
      kelasMap.get(ph.kelasId || '') || ph.kelasId || '-',
      ph.materiJudul || ph.topik || 'Penilaian Harian',
      String(ph.nilaiAkhir ?? ph.nilai ?? 0),
      ph.tanggal || '',
      ph.keterangan || '-',
    ]);
  });

  // 6. Materi_Pembelajaran
  const materiRows: string[][] = [
    ['No', 'ID Materi', 'Judul Materi', 'Kategori', 'Kelas', 'Fase / Semester', 'Guru Pembuat', 'Status', 'Tanggal Dibuat'],
    ...(db.materi || []).map((m, idx) => [
      String(idx + 1),
      m.id || '',
      m.judul || '',
      m.kategori || '',
      m.kelasNama || kelasMap.get(m.kelasId || '') || 'Semua Kelas',
      `${m.fase || '-'} / Sem ${m.semester || '-'}`,
      m.guruNama || m.dibuatOleh || '-',
      m.status || 'Publish',
      m.tanggalDibuat || m.dibuatPada || '-',
    ]),
  ];

  // 7. Tugas_Dan_Kuis
  const tugasKuisRows: string[][] = [
    ['No', 'Jenis', 'ID', 'Judul', 'Kelas', 'Batas Waktu / Jadwal', 'Jumlah Soal', 'Guru Pembuat', 'Status'],
    ...(db.tugas || []).map((t, idx) => [
      String(idx + 1),
      'TUGAS',
      t.id || '',
      t.judul || '',
      t.kelasNama || kelasMap.get(t.kelasId || '') || 'Semua Kelas',
      t.deadline || '-',
      String((t.daftarSoal || []).length),
      t.guruNama || t.dibuatOleh || '-',
      t.status || 'Aktif',
    ]),
    ...(db.quiz || []).map((q, idx) => [
      String((db.tugas || []).length + idx + 1),
      'KUIS',
      q.id || '',
      q.judul || '',
      q.kelasNama || kelasMap.get(q.kelasId || '') || 'Semua Kelas',
      q.tanggalUjian || q.batasWaktu || '-',
      String((q.soalList || q.soal || []).length),
      q.guruNama || q.dibuatOleh || '-',
      q.status || 'Publish',
    ]),
  ];

  // 8. Cadangan_JSON_Utuh (Chunked by 40,000 chars per cell so Google Sheets 50,000 char cell limit is respected)
  const fullJsonString = JSON.stringify(db);
  const chunkSize = 40000;
  const jsonChunks: string[][] = [
    ['Bagian_Ke', 'Total_Bagian', 'Waktu_Cadangan', 'Versi_Aplikasi', 'Isi_Data_JSON'],
  ];
  const totalChunks = Math.max(1, Math.ceil(fullJsonString.length / chunkSize));
  for (let i = 0; i < totalChunks; i++) {
    const slice = fullJsonString.slice(i * chunkSize, (i + 1) * chunkSize);
    jsonChunks.push([
      String(i + 1),
      String(totalChunks),
      nowStr,
      '2.6.2',
      slice,
    ]);
  }

  // Clear existing ranges first so old rows don't linger
  await fetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: BACKUP_TAB_NAMES.map((tab) => `${tab}!A1:Z2000`),
    }),
  }).catch(() => {});

  // Batch write all 8 sheets
  const valueData = [
    { range: 'Data_Murid!A1', values: muridRows },
    { range: 'Data_Guru_Staf!A1', values: stafRows },
    { range: 'Daftar_Kelas!A1', values: kelasRows },
    { range: 'Rekap_Presensi!A1', values: presensiRows },
    { range: 'Rekap_Nilai!A1', values: nilaiRows },
    { range: 'Materi_Pembelajaran!A1', values: materiRows },
    { range: 'Tugas_Dan_Kuis!A1', values: tugasKuisRows },
    { range: 'Cadangan_JSON_Utuh!A1', values: jsonChunks },
  ];

  const writeRes = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  if (!writeRes.ok) {
    const errBody = await writeRes.json().catch(() => ({}));
    const msg =
      errBody?.error?.message || `Gagal menulis cadangan ke Google Spreadsheet (Kode ${writeRes.status})`;
    throw new Error(msg);
  }

  const writeResult = await writeRes.json();
  const updatedCells = writeResult.totalUpdatedCells || 0;

  return {
    updatedCells,
    spreadsheetUrl: meta.spreadsheetUrl,
    title: meta.title,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Restore complete LMS database from the Cadangan_JSON_Utuh tab of a Google Spreadsheet
 */
export async function restoreDatabaseFromSpreadsheet(
  spreadsheetId: string,
  accessToken?: string | null
): Promise<LMSDatabase> {
  const token = accessToken || getGoogleAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum terhubung. Silakan klik tombol Sign in with Google terlebih dahulu.');
  }

  const meta = await getSpreadsheetMetadata(spreadsheetId, token);
  if (!meta.sheetTitles.includes('Cadangan_JSON_Utuh')) {
    throw new Error(
      'Tab "Cadangan_JSON_Utuh" tidak ditemukan pada Spreadsheet ini. Pastikan Spreadsheet ini dibuat atau pernah dicadangkan dari aplikasi LMS PJOK.'
    );
  }

  const res = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent('Cadangan_JSON_Utuh!A2:E100')}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || `Gagal membaca data cadangan dari Google Spreadsheet (Kode ${res.status})`
    );
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];
  if (rows.length === 0) {
    throw new Error('Data cadangan di dalam tab "Cadangan_JSON_Utuh" masih kosong.');
  }

  // Sort chunks by Bagian_Ke and join Isi_Data_JSON (column index 4)
  const sortedRows = [...rows].sort((a, b) => Number(a[0] || 0) - Number(b[0] || 0));
  const combinedJson = sortedRows.map((r) => r[4] || '').join('');

  if (!combinedJson) {
    throw new Error('Isi JSON cadangan tidak ditemukan atau rusak.');
  }

  const parsedDb: LMSDatabase = JSON.parse(combinedJson);
  if (!parsedDb || typeof parsedDb !== 'object' || !Array.isArray(parsedDb.users)) {
    throw new Error('Format struktur database cadangan tidak valid.');
  }

  return parsedDb;
}
