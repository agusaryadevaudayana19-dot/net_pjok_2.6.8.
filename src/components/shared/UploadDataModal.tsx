import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  UPLOAD_TEMPLATES,
  parseCSV,
  downloadFile,
} from '../../utils/fileUploadTemplates';
import { Kelas, resolveKelasId } from '../../types';

export type UploadDataType = 'materi' | 'tugas' | 'murid' | 'bankSoal';

interface UploadDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: UploadDataType;
  onImport: (parsedData: any[]) => void;
  allKelas?: Kelas[];
  defaultKelasId?: string;
}

export const UploadDataModal: React.FC<UploadDataModalProps> = ({
  isOpen,
  onClose,
  type,
  onImport,
  allKelas = [],
  defaultKelasId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [showPasteMode, setShowPasteMode] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fallbackKelasId, setFallbackKelasId] = useState<string>(
    defaultKelasId || (allKelas && allKelas[0]?.id) || ''
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const templateInfo = UPLOAD_TEMPLATES[type];

  const getTitle = () => {
    switch (type) {
      case 'materi':
        return 'Upload & Import Materi PJOK';
      case 'tugas':
        return 'Upload & Import Tugas PJOK';
      case 'murid':
        return 'Upload & Import Data Murid';
      case 'bankSoal':
        return 'Upload & Import Bank Soal / Quiz';
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = `${templateInfo.header}\n${templateInfo.sample}`;
    downloadFile(csvContent, templateInfo.filename, 'text/csv;charset=utf-8');
  };

  const processContent = (content: string) => {
    setErrorMessage('');
    try {
      const rows = parseCSV(content);
      if (rows.length === 0) {
        setErrorMessage('File atau data kosong. Harap periksa kembali.');
        return;
      }

      // Check if first row is header
      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      if (dataRows.length === 0) {
        setErrorMessage('Tidak ditemukan baris data setelah header template.');
        return;
      }

      const parsed: any[] = [];

      const getColValue = (r: string[], keywords: string[], fallbackIdx: number) => {
        for (let c = 0; c < headers.length; c++) {
          const h = headers[c];
          if (keywords.some((k) => h.includes(k))) {
            return r[c]?.trim() || '';
          }
        }
        return r[fallbackIdx]?.trim() || '';
      };

      if (type === 'materi') {
        dataRows.forEach((r, idx) => {
          if (!r[0]) return;
          parsed.push({
            id: `mat-imp-${Date.now()}-${idx}`,
            judul: r[0] || 'Materi PJOK Baru',
            kategori: r[1] || 'PJOK Fase F',
            tujuanPembelajaran: r[2] || '',
            deskripsi: r[3] || '',
            materiInti: r[4] || '',
            videoUrl: r[5] || '',
            fileUrl: r[6] || '',
            status: 'Publish',
            dibuatPada: new Date().toISOString().slice(0, 10),
          });
        });
      } else if (type === 'tugas') {
        dataRows.forEach((r, idx) => {
          if (!r[0]) return;
          parsed.push({
            id: `tug-imp-${Date.now()}-${idx}`,
            judul: r[0] || 'Tugas Baru',
            kategori: r[1] || 'Praktik Gerak Mandiri',
            instruksi: r[2] || '',
            deadline: r[3] || '2026-09-30T23:59',
            kelasIds: r[4] && r[4] !== 'Semua' ? [r[4]] : (allKelas.length > 0 ? allKelas.map((k) => k.id) : []),
            status: 'Publish',
            dibuatPada: new Date().toISOString().slice(0, 10),
          });
        });
      } else if (type === 'murid') {
        dataRows.forEach((r, idx) => {
          const name = getColValue(r, ['name', 'nama', 'murid'], 1);
          const rawNis = getColValue(r, ['nis', 'nisn', 'induk', 'nomor'], 0);
          if (!name && !rawNis) return;

          const nis = rawNis || `24${String(Date.now()).slice(-4)}${idx}`;
          const rawKelas = getColValue(r, ['kelas', 'rombel', 'tingkat', 'class'], 2);
          const rawJk = getColValue(r, ['jk', 'gender', 'kelamin', 'sex'], 3);
          const rawEmail = getColValue(r, ['email', 'surel'], 4);
          const rawUsername = getColValue(r, ['username', 'user', 'akun'], 5);

          const resolved = resolveKelasId(rawKelas || fallbackKelasId, allKelas, fallbackKelasId);
          const kelasId = resolved.id;
          const jk = (rawJk.toUpperCase().startsWith('P') || rawJk.toLowerCase().includes('perempuan') || rawJk.toLowerCase().includes('wanita')) ? 'P' : 'L';
          const email = rawEmail || `${(name || 'murid').toLowerCase().replace(/[^a-z0-9]/g, '.')}@murid.sch.id`;
          const username = rawUsername || (nis ? `murid_${nis}` : (name || 'murid').toLowerCase().replace(/[^a-z0-9]/g, ''));

          parsed.push({
            id: `usr-murid-imp-${Date.now()}-${idx}`,
            username,
            role: 'MURID',
            name: name || `Murid Baru ${idx + 1}`,
            nis,
            kelasId,
            jenisKelamin: jk,
            email,
            avatar: `https://images.unsplash.com/photo-${1535713875002 + idx}?w=120&auto=format&fit=crop&q=80`,
          });
        });
      } else if (type === 'bankSoal') {
        dataRows.forEach((r, idx) => {
          if (!r[1]) return;
          const nomor = parseInt(r[0], 10) || idx + 1;
          const pertanyaan = r[1];
          const rawTipe = (r[2] || '').trim().toLowerCase();
          let tipe = 'Pilihan Ganda';
          if (rawTipe.includes('benar') || rawTipe.includes('salah')) {
            tipe = 'Benar/Salah';
          } else if (rawTipe.includes('gambar')) {
            tipe = 'Mencocokkan Gambar';
          } else if (rawTipe.includes('garis') || rawTipe.includes('jodoh')) {
            tipe = 'Tarik Garis';
          } else if (rawTipe.includes('isian') || rawTipe.includes('esai')) {
            tipe = 'Isian';
          }

          const kategoriSoal = (r[3] as any) || 'HOTS';
          const pilihanRaw = r[4] ? r[4].split('|').map((p) => p.trim()) : [];
          const kunciJawaban = r[5] || (pilihanRaw[0] || 'A');
          const pembahasan = r[6] || '';
          const bobot = parseInt(r[7], 10) || 20;

          parsed.push({
            id: `soal-imp-${Date.now()}-${idx}`,
            nomor,
            pertanyaan,
            tipe,
            kategoriSoal,
            pilihan: pilihanRaw,
            kunciJawaban,
            pembahasan,
            bobot,
          });
        });
      }

      if (parsed.length === 0) {
        setErrorMessage('Tidak ada data valid yang dapat diekstrak. Pastikan kolom sesuai format template.');
      } else {
        setPreviewRows(parsed);
      }
    } catch (err: any) {
      setErrorMessage(`Gagal memproses data: ${err.message || 'Format tidak valid'}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      processContent(text);
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = () => {
    if (previewRows.length === 0) return;
    onImport(previewRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">{getTitle()}</h3>
              <p className="text-xs text-slate-500">
                Unggah file CSV/Excel atau tempel data untuk menambah data secara massal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 text-xs">
          {/* 1. Format Template Download Box */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-emerald-900 text-xs">
                  Format File yang Diunggah (CSV / Excel):
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Format Template
              </button>
            </div>
            <p className="text-emerald-800/90 leading-relaxed text-[11px]">
              {templateInfo.description}
            </p>
            <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-100 font-mono text-[10px] text-slate-700 overflow-x-auto">
              <span className="text-emerald-700 font-bold block mb-1">Struktur Kolom Header:</span>
              {templateInfo.header}
            </div>
          </div>

          {/* 1.5 Target Kelas Selector for Murid */}
          {type === 'murid' && (
            <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-sky-950 text-xs">
                  Target Kelas Standar (digunakan bila baris CSV belum memiliki kolom kelas):
                </label>
                <span className="text-[10px] text-sky-800 font-semibold bg-sky-100 px-2 py-0.5 rounded-md">
                  Deteksi Cerdas
                </span>
              </div>
              <select
                value={fallbackKelasId}
                onChange={(e) => setFallbackKelasId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              >
                {allKelas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.id})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-sky-800/80">
                Jika di dalam CSV sudah terdapat kolom kelas (misal: nama kelas atau kode kelas), sistem akan otomatis memetakan ke kelas yang bersangkutan.
              </p>
            </div>
          )}

          {/* 2. File Upload Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 text-xs">Pilih File dari Perangkat:</label>
              <button
                type="button"
                onClick={() => setShowPasteMode(!showPasteMode)}
                className="text-[11px] text-emerald-700 font-bold hover:underline"
              >
                {showPasteMode ? '← Gunakan File Picker' : 'Atau Tempel / Paste Teks CSV'}
              </button>
            </div>

            {!showPasteMode ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs">
                    {file ? file.name : 'Klik untuk memilih file CSV'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Mendukung format .csv atau .txt'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    processContent(e.target.value);
                  }}
                  placeholder={`Tempelkan baris data CSV di sini...\nContoh:\n${templateInfo.header}\n${templateInfo.sample.split('\n')[0]}`}
                  className="w-full p-3 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Preview of Parsed Data */}
          {previewRows.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Terdeteksi {previewRows.length} Data Siap Diimpor
                </span>
                <span className="text-[10px] text-slate-500">Pratinjau Ringkas</span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
                {previewRows.slice(0, 5).map((row, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="font-bold text-slate-800 truncate">
                      #{idx + 1}. {row.judul || row.name || row.pertanyaan}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 shrink-0">
                      {row.kategori || row.kelasId || row.tipe}
                    </span>
                  </div>
                ))}
                {previewRows.length > 5 && (
                  <div className="text-center text-[10px] text-slate-500 py-1 italic">
                    ...dan {previewRows.length - 5} data lainnya
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={previewRows.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Konfirmasi & Tambah Data ({previewRows.length})
          </button>
        </div>
      </div>
    </div>
  );
};
