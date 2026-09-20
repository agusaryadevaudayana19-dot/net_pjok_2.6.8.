import { User, UserRole } from '../types';

/**
 * Robust CSV parser that handles commas inside quotes, multi-line values, and tab/semicolon separators.
 */
export const parseCSV = (text: string): string[][] => {
  const clean = text.trim();
  if (!clean) return [];

  const lines: string[][] = [];
  let row: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  // Auto detect delimiter (tab, semicolon, or comma) across the first few lines
  const sampleLines = clean.split(/\r?\n/).slice(0, 5).join('\n');
  let delimiter = ',';
  if (sampleLines.includes('\t')) {
    delimiter = '\t';
  } else if (sampleLines.includes(';') && !sampleLines.includes(',')) {
    delimiter = ';';
  }

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      currentVal = '';
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
};

/**
 * Parse CSV text into User records with intelligent header detection and flexible column matching.
 */
export const parseCSVToUsers = (csvText: string): User[] => {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  let headerIndex = 0;
  const headerKeywords = [
    'nama',
    'name',
    'nis',
    'nisn',
    'nip',
    'siswa',
    'murid',
    'user',
    'username',
    'kelas',
    'rombel',
    'gender',
    'jk',
    'role',
    'peran',
  ];

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const rowCells = rows[r].map((c) => c.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    const matches = rowCells.filter((c) => headerKeywords.some((kw) => c.includes(kw) || kw.includes(c)));
    if (matches.length >= 2) {
      headerIndex = r;
      break;
    }
  }

  const rawHeaders = rows[headerIndex].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (r: string[], colNames: string[]): string => {
    for (const name of colNames) {
      if (headerMap[name] !== undefined && r[headerMap[name]] !== undefined) {
        const val = r[headerMap[name]].trim();
        if (val) return val;
      }
    }
    for (const name of colNames) {
      for (const [h, colIdx] of Object.entries(headerMap)) {
        if ((h.includes(name) || name.includes(h)) && r[colIdx] !== undefined) {
          const val = r[colIdx].trim();
          if (val) return val;
        }
      }
    }
    return '';
  };

  const users: User[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c)) continue;

    const testLine = row.join(' ').toLowerCase();
    if (testLine.includes('daftar siswa') || testLine.includes('tahun pelajaran') || testLine.includes('rekapitulasi')) {
      continue;
    }

    const name = getCol(row, [
      'namasiswa',
      'namamurid',
      'namapesertadidik',
      'namalengkap',
      'nama',
      'name',
      'pesertadidik',
      'siswa',
      'murid',
    ]);
    const nipOrNis = getCol(row, [
      'nis',
      'nisn',
      'noinduk',
      'nomorinduk',
      'induk',
      'nip',
      'nik',
    ]);

    if (!name && !nipOrNis) continue;

    const id = getCol(row, ['id', 'userid']) || `usr-${Date.now()}-${i}`;
    const username = getCol(row, ['username', 'user']) || nipOrNis || (name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : `user${i}`);

    let roleStr = getCol(row, ['role', 'peran', 'jabatan', 'tipe']).toUpperCase();
    let role: UserRole = 'MURID';
    if (roleStr.includes('ADMIN')) {
      role = 'ADMIN';
    } else if (roleStr.includes('GURU') || getCol(row, ['nip'])) {
      role = 'GURU';
    } else {
      role = 'MURID';
    }

    const email = getCol(row, ['email', 'surel', 'mail', 'alamatemail']);
    const statusRaw = getCol(row, ['status', 'keaktifan', 'keterangan']);
    const status: 'Aktif' | 'Nonaktif' = statusRaw.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';
    const avatar = getCol(row, ['avatar', 'foto', 'image', 'fotoprofil']);

    const user: User = {
      id,
      username,
      role,
      name: name || username,
      email: email || undefined,
      status,
      avatar: avatar || undefined,
    };

    if (role === 'ADMIN' || role === 'GURU') {
      user.nip = nipOrNis || undefined;
      user.mataPelajaran = role === 'GURU' ? 'PJOK Fase E & F' : undefined;
      const rawDiampu = getCol(row, ['kelasdiampu', 'diampu', 'mengajar', 'kelas']);
      if (rawDiampu) {
        user.kelasDiampu = rawDiampu.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      }
    } else {
      user.nis = nipOrNis || undefined;
      const rawKelas = getCol(row, [
        'kelas',
        'rombel',
        'tingkat',
        'kelassiswa',
        'kelasid',
        'namakelas',
        'idkelas',
        'ruangkelas',
        'class',
      ]);

      const cleanKelas = (rawKelas || '').trim();
      user.kelasId = cleanKelas;
      user.tahunPelajaran = '2026/2027';

      const rawJk = getCol(row, ['jk', 'jeniskelamin', 'gender', 'sex', 'lp']).toUpperCase();
      if (rawJk.startsWith('P') || rawJk.includes('PEREMPUAN') || rawJk.includes('WANITA')) {
        user.jenisKelamin = 'P';
      } else if (rawJk.startsWith('L') || rawJk.includes('LAKI') || rawJk.includes('PRIA')) {
        user.jenisKelamin = 'L';
      } else {
        const lowerName = (name || '').toLowerCase();
        if (
          lowerName.includes('ni ') ||
          lowerName.includes('putu ') ||
          lowerName.includes('dewi') ||
          lowerName.includes('ayu') ||
          lowerName.includes('luh ') ||
          lowerName.includes('komang ayu') ||
          lowerName.includes('savitri') ||
          lowerName.includes('purwani') ||
          lowerName.includes('caitanya') ||
          lowerName.includes('febriana') ||
          lowerName.includes('vitare') ||
          lowerName.includes('sinthya') ||
          lowerName.includes('cintya') ||
          lowerName.includes('sinta') ||
          lowerName.includes('nadine') ||
          lowerName.includes('ida ayu')
        ) {
          user.jenisKelamin = 'P';
        } else {
          user.jenisKelamin = 'L';
        }
      }
    }

    users.push(user);
  }

  return users;
};

/**
 * Export users array to CSV format
 */
export const exportUsersToCSV = (users: User[]): string => {
  const headers = ['id', 'username', 'role', 'name', 'nip', 'kelas', 'jenisKelamin', 'email', 'status', 'avatar'];
  const escapeCell = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = users.map((u) => {
    const nipVal = u.role === 'MURID' ? u.nis || u.nip || '' : u.nip || '';
    const roleVal = u.role === 'MURID' ? (u.username.startsWith('murid') ? u.username : 'MURID') : u.role;
    const kelasVal = u.kelasId || '';
    const jkVal = u.jenisKelamin || '';
    return [
      escapeCell(u.id),
      escapeCell(u.username),
      escapeCell(roleVal),
      escapeCell(u.name),
      escapeCell(nipVal),
      escapeCell(kelasVal),
      escapeCell(jkVal),
      escapeCell(u.email || ''),
      escapeCell(u.status),
      escapeCell(u.avatar || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
