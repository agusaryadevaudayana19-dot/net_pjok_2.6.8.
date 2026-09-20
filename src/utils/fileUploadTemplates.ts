import { Materi } from '../types';

/**
 * Trigger download of any text/blob content to local device
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a complete offline-ready study document (PDF-printable HTML)
 * for student download in MuridMateri.
 */
export function downloadMateriOffline(materi: Materi) {
  const materiInti = materi.materiInti || materi.kontenTeks || '';
  const cleanMateriInti = materiInti.replace(/###/g, '<h3>').replace(/##/g, '<h2>').replace(/#/g, '<h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Modul Materi PJOK - ${materi.judul}</title>
  <style>
    @media print {
      body { margin: 1.5cm; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      line-height: 1.7;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #f8fafc;
    }
    p, .content-text, .box > div {
      text-align: justify;
      text-justify: inter-word;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .container {
      background: #ffffff;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 3px solid #059669;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 12px 0 6px 0;
    }
    .meta {
      font-size: 12px;
      color: #64748b;
    }
    .box {
      margin: 16px 0;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .box-tujuan {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .box-uraian {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .box-inti {
      background: #eef2ff;
      border-color: #c7d2fe;
    }
    .box-aktivitas {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .box-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .text-emerald { color: #065f46; }
    .text-slate { color: #334155; }
    .text-indigo { color: #3730a3; }
    .text-amber { color: #92400e; }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 12px 0;
      border: 1px solid #cbd5e1;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    .print-btn {
      background: #059669;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
      margin-bottom: 16px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; margin-bottom: 12px;">
    <button class="print-btn" onclick="window.print()">
      🖨️ Simpan ke PDF / Cetak Modul
    </button>
  </div>

  <div class="container">
    <div class="header">
      <span class="badge">${materi.kategori || 'PJOK Fase F'}</span>
      <h1>${materi.judul}</h1>
      <div class="meta">
        <strong>Kurikulum Merdeka</strong> • Fase F • Guru Pengampu: <strong>${materi.guruNama || materi.dibuatOleh || 'Guru PJOK'}</strong>
        • Tanggal: ${materi.dibuatPada || new Date().toLocaleDateString('id-ID')}
      </div>
    </div>

    ${materi.tujuanPembelajaran ? `
    <div class="box box-tujuan">
      <div class="box-title text-emerald">1. Capaian & Tujuan Pembelajaran (IKTP):</div>
      <div style="text-align: justify;">${materi.tujuanPembelajaran}</div>
    </div>` : ''}

    ${materi.deskripsi ? `
    <div class="box box-uraian">
      <div class="box-title text-slate">2. ${materi.judulDeskripsi || materi.namaSubMenuUraian || 'Uraian Materi & Konsep Gerak'}:</div>
      <div style="white-space: pre-line; text-align: justify;">${materi.deskripsi}</div>
    </div>` : ''}

    ${materi.gambarUrl ? `
    <div style="text-align: center; margin: 16px 0;">
      <img src="${materi.gambarUrl}" alt="${materi.judul}" />
      <div style="font-size: 11px; color: #64748b; font-style: italic;">Gambar: Ilustrasi Peragaan Gerak Teknik PJOK</div>
    </div>` : ''}

    ${cleanMateriInti ? `
    <div class="box box-inti">
      <div class="box-title text-indigo">3. ${materi.judulMateriInti || materi.namaSubMenuInti || 'Materi Inti & Panduan Pelaksanaan Teknik'}:</div>
      <div style="white-space: pre-line; line-height: 1.7; text-align: justify;">${cleanMateriInti}</div>
    </div>` : ''}

    ${(materi.kolomKustom || []).map((kolom, i) => `
    <div class="box" style="background: #fffbeb; border-color: #fde68a;">
      <div class="box-title text-amber">${i + 4}. ${kolom.label || 'Sub-Materi Tambahan'}${kolom.subJudul ? ` (${kolom.subJudul})` : ''}:</div>
      ${kolom.gambarUrl ? `
      <div style="text-align: center; margin: 12px 0;">
        <img src="${kolom.gambarUrl}" alt="${kolom.label || 'Ilustrasi'}" style="max-height: 280px; object-fit: contain;" />
        <div style="font-size: 11px; color: #92400e; font-style: italic; margin-top: 4px;">Gambar: ${kolom.label || 'Ilustrasi Gerak'}</div>
      </div>` : ''}
      <div style="white-space: pre-line; line-height: 1.7; text-align: justify;">${kolom.isi}</div>
    </div>`).join('')}

    ${materi.aktivitasMurid ? `
    <div class="box box-aktivitas">
      <div class="box-title text-amber">4. Instruksi Aktivitas Mandiri di Lapangan:</div>
      <div>${materi.aktivitasMurid}</div>
    </div>` : ''}

    ${materi.videoUrl ? `
    <div style="margin-top: 16px; font-size: 12px; color: #475569;">
      <strong>Tautan Video Referensi:</strong> <a href="${materi.videoUrl}" target="_blank" style="color: #0284c7;">${materi.videoUrl}</a>
    </div>` : ''}

    <div class="footer">
      SMAN 1 Olahraga Nusantara — Modul Belajar Mandiri Siswa (Offline Ready)
      <br />Dikeluarkan melalui Sistem LMS PJOK Fase F Kurikulum Merdeka
    </div>
  </div>
</body>
</html>`;

  const safeTitle = (materi.judul || 'Materi_PJOK').replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(htmlContent, `Materi_PJOK_${safeTitle}.html`, 'text/html;charset=utf-8');
}

/**
 * CSV templates and samples for Guru uploads
 */
export const UPLOAD_TEMPLATES = {
  materi: {
    filename: 'template_import_materi_pjok.csv',
    header: 'judul,kategori,tujuanPembelajaran,deskripsi,materiInti,videoUrl,fileUrl',
    sample: `Permainan Sepak Bola - Taktik Tiki-Taka,Sepak Bola,Memahami penguasaan bola umpan-umpan pendek dan transisi menyerang,Konsep umpan satu-dua sentuhan untuk membongkar pertahanan gerendel lawan,1. Posisi tubuh membentuk segitiga 2. Passing menyusur tanah dengan kaki bagian dalam 3. Gerakan tanpa bola membuka ruang,https://www.youtube.com/watch?v=sample-bola,https://drive.google.com/file/sample-modul-bola.pdf
Senam Lantai - Rangkaian Handstand & Roll,Aktivitas Senam,Mengembangkan keseimbangan tubuh saat handstand dan keamanan pendaratan roll,Teknik meluruskan lengan menopang beban badan di atas matras,1. Kaki dibuka 2. Ayunan kaki ke atas vertikal 3. Tengkuk ditekuk saat mendarat roll depan,,`,
    description: 'Format CSV dengan kolom: Judul, Kategori, Tujuan Pembelajaran, Uraian Materi, Materi Inti, URL Video (Opsional), URL File Modul (Opsional).',
  },
  tugas: {
    filename: 'template_import_tugas_pjok.csv',
    header: 'judul,kategori,instruksi,deadline,kelasTarget',
    sample: `Tugas Analisis Biomekanika Lay-Up Shoot,Permainan Bola Besar,Rekam gerakan lay-up shoot Anda dari samping lalu catat sudut tolakan kaki dan posisi pelepasan bola.,2026-09-30T23:59,Semua
Laporan Kebugaran Jasmani Mandiri,Kebugaran Jasmani,Lakukan pencatatan denyut nadi istirahat dan denyut nadi setelah lari 12 menit selama 3 hari berturut-turut.,2026-10-05T23:59,X 1`,
    description: 'Format CSV dengan kolom: Judul Tugas, Kategori, Instruksi, Deadline (YYYY-MM-DDTHH:mm), Kelas Target (Semua atau nama kelas).',
  },
  murid: {
    filename: 'template_import_data_murid_pjok.csv',
    header: 'nis,name,kelas,jenisKelamin,email,username',
    sample: `240108,Hafiz Maulana,X 1,L,hafiz.m@siswa.sch.id,hafiz
240109,Intan Permatasari,X 1,P,intan.p@siswa.sch.id,intan
240110,Joko Susilo,XII 1,L,joko.s@siswa.sch.id,joko`,
    description: 'Format CSV dengan kolom: NIS, Nama Lengkap Siswa, Kelas (nama kelas seperti "X 1" / "XII 1"), Jenis Kelamin (L/P), Email (Opsional), Username.',
  },
  bankSoal: {
    filename: 'template_import_bank_soal_pjok.csv',
    header: 'nomor,pertanyaan,tipe,kategoriSoal,pilihan,kunciJawaban,pembahasan,bobot',
    sample: `1,Bagaimana perkenaan bola yang tepat saat melakukan passing bawah bola voli?,Pilihan Ganda,HOTS,Di telapak tangan|Di atas pergelangan tangan bagian dalam|Di ujung jari jemari|Di siku lengan|Di pergelangan tangan bagian luar,Di atas pergelangan tangan bagian dalam,Perkenaan di atas pergelangan tangan memberikan bantalan datar yang stabil.,20
2,Rotasi pemain bola voli bergerak berlawanan arah jarum jam.,Benar/Salah,AKM,Benar|Salah,Salah,Rotasi pemain bola voli bergerak searah jarum jam setiap kali merebut hak servis.,20
3,Cocokkan gambar di bawah dengan teknik dasarnya!,Mencocokkan Gambar,HOTS,Passing Bawah|Smash Keras|Block Net|Servis Atas|Passing Atas,Passing Bawah,Posisi lengan lurus rapat ke depan bawah adalah ciri passing bawah.,20
4,Tarik garis jodohkan peran Tosser dengan tugasnya!,Tarik Garis,AKM,Tosser=Mengatur serangan|Libero=Bertahan murni|Spiker=Mengeksekusi bola,Tosser=Mengatur serangan,Tosser adalah otak serangan tim bola voli.,20
5,Sebutkan jumlah pemain inti dalam 1 regu sepak bola di lapangan!,Isian,Standar,,11 pemain,Satu tim sepak bola terdiri dari 11 pemain termasuk penjaga gawang.,20`,
    description: 'Format CSV dengan kolom: Nomor, Pertanyaan, Tipe (Pilihan Ganda / Benar/Salah / Mencocokkan Gambar / Tarik Garis / Isian), Kategori (HOTS/AKM/Standar), Pilihan (dipisahkan tanda | untuk A sampai E), Kunci Jawaban, Pembahasan, Bobot.',
  },
};

/**
 * Parses simple CSV content with quote handling
 */
export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split(/\r?\n/);
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let insideQuotes = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    result.push(row);
  }

  return result;
}
