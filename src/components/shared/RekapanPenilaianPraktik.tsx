import React, { useState, useMemo } from 'react';
import {
  Activity,
  Award,
  Download,
  Printer,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  BookOpen,
  Plus,
} from 'lucide-react';
import { User, PenilaianPraktik, getTeacherAssignedClasses } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface RekapanPenilaianPraktikProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigatePraktik?: () => void;
}

const DEFAULT_MATERI_PJOK = [
  'Permainan Bola Besar',
  'Permainan Bola Kecil',
  'Atletik',
  'Kebugaran Jasmani',
  'Aktivitas Senam',
  'Aktivitas Air',
  'Kesehatan',
];

export const RekapanPenilaianPraktik: React.FC<RekapanPenilaianPraktikProps> = ({
  db,
  currentUser,
  onNavigatePraktik,
}) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [selectedMateri, setSelectedMateri] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kkmScore, setKkmScore] = useState<number>(75);

  const selectedKelasObj = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  // Students in selected class
  const muridInKelas = useMemo(() => {
    const targetId = (selectedKelasId || '').toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();

    return (db.users || [])
      .filter((u) => {
        if (u.role !== 'MURID') return false;
        const uKelas = (u.kelasId || '').toLowerCase().trim();
        return uKelas === targetId || (targetNama && uKelas === targetNama);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId, selectedKelasObj]);

  // Dynamic available practical materials
  const materiList = useMemo(() => {
    const fromDb = db.materiPraktikList || [];
    const fromAssessments = (db.penilaianPraktik || []).map((p) => p.materiJudul || p.materi || '');
    const combined = Array.from(new Set([...DEFAULT_MATERI_PJOK, ...fromDb, ...fromAssessments])).filter(
      Boolean
    );
    return combined;
  }, [db.materiPraktikList, db.penilaianPraktik]);

  // All practical assessments for this class
  const classAssessments = useMemo(() => {
    const studentIds = new Set(muridInKelas.map((m) => m.id));
    return (db.penilaianPraktik || []).filter((p) => studentIds.has(p.muridId));
  }, [db.penilaianPraktik, muridInKelas]);

  // Student assessment aggregation
  const studentRows = useMemo(() => {
    return muridInKelas.map((murid) => {
      const studentAssessments = classAssessments.filter((p) => p.muridId === murid.id);

      // Map score per material
      const scoresPerMateri: Record<string, number> = {};
      studentAssessments.forEach((p) => {
        const mat = p.materiJudul || p.materi || 'Umum';
        scoresPerMateri[mat] = p.nilaiAkhir;
      });

      // Filtered assessment if specific material selected
      const currentAssessment =
        selectedMateri !== 'SEMUA'
          ? studentAssessments.find((p) => (p.materiJudul || p.materi) === selectedMateri)
          : null;

      // Overall average
      const assessedValues = Object.values(scoresPerMateri);
      const avgScore =
        assessedValues.length > 0
          ? Math.round(assessedValues.reduce((a, b) => a + b, 0) / assessedValues.length)
          : 0;

      const finalScore = selectedMateri === 'SEMUA' ? avgScore : (currentAssessment?.nilaiAkhir || 0);

      let predikat = 'D';
      if (finalScore >= 90) predikat = 'A';
      else if (finalScore >= 80) predikat = 'B';
      else if (finalScore >= 75) predikat = 'C';

      const isTuntas = finalScore >= kkmScore;
      const isAssessed = selectedMateri === 'SEMUA' ? assessedValues.length > 0 : !!currentAssessment;

      return {
        murid,
        scoresPerMateri,
        currentAssessment,
        finalScore,
        avgScore,
        assessedCount: assessedValues.length,
        predikat,
        isTuntas,
        isAssessed,
      };
    });
  }, [muridInKelas, classAssessments, selectedMateri, kkmScore]);

  // Filtered rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return studentRows;
    const q = searchQuery.toLowerCase();
    return studentRows.filter(
      (r) => r.murid.name.toLowerCase().includes(q) || (r.murid.nis && r.murid.nis.includes(q))
    );
  }, [studentRows, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const assessedStudents = studentRows.filter((r) => r.isAssessed).length;
    const tuntasStudents = studentRows.filter((r) => r.isAssessed && r.isTuntas).length;
    const scores = studentRows.filter((r) => r.isAssessed).map((r) => r.finalScore);
    const avgClass =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const tuntasPercent =
      assessedStudents > 0 ? Math.round((tuntasStudents / assessedStudents) * 100) : 0;

    return {
      totalStudents,
      assessedStudents,
      tuntasStudents,
      avgClass,
      highestScore,
      lowestScore,
      tuntasPercent,
    };
  }, [studentRows]);

  // Export CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (selectedMateri === 'SEMUA') {
      headers = [
        'No',
        'NIS',
        'Nama Siswa',
        'Kelas',
        ...materiList,
        'Rata-Rata Praktik',
        'Predikat',
        'Status Ketuntasan (KKM ' + kkmScore + ')',
      ];
      rows = filteredRows.map((r, idx) => {
        const matScores = materiList.map((m) => r.scoresPerMateri[m] ?? '-');
        return [
          idx + 1,
          `"${r.murid.nis || '-'}"`,
          `"${r.murid.name}"`,
          `"Kelas ${selectedKelasObj?.nama || selectedKelasId}"`,
          ...matScores,
          r.isAssessed ? r.finalScore : '-',
          r.isAssessed ? r.predikat : '-',
          r.isAssessed ? (r.isTuntas ? 'TUNTAS' : 'REMEDIAL') : 'BELUM DINILAI',
        ];
      });
    } else {
      headers = [
        'No',
        'NIS',
        'Nama Siswa',
        'Kelas',
        'Materi Praktik',
        'Nilai Akhir',
        'Predikat',
        'Status Ketuntasan',
        'Catatan Capaian Gerak',
      ];
      rows = filteredRows.map((r, idx) => [
        idx + 1,
        `"${r.murid.nis || '-'}"`,
        `"${r.murid.name}"`,
        `"Kelas ${selectedKelasObj?.nama || selectedKelasId}"`,
        `"${selectedMateri}"`,
        r.isAssessed ? r.finalScore : '-',
        r.isAssessed ? r.predikat : '-',
        r.isAssessed ? (r.isTuntas ? 'TUNTAS' : 'REMEDIAL') : 'BELUM DINILAI',
        `"${(r.currentAssessment?.catatan || '-').replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Penilaian_Praktik_PJOK_${(selectedKelasObj?.nama || 'Kelas').replace(
        /\s+/g,
        '_'
      )}_${selectedMateri.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-1 border border-white/20">
              <Activity className="w-3.5 h-3.5" />
              <span>Rekapitulasi Asesmen PJOK</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapan Penilaian Praktek Murid
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 leading-relaxed">
              Tabel rekapitulasi penilaian praktik lapangan, rubrik indikator gerak, serta status ketuntasan siswa per kelas dan materi PJOK.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title="Cetak format cetak lembar rekap nilai"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title="Ekspor ke format file CSV / Spreadsheet"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
            {onNavigatePraktik && (
              <button
                type="button"
                onClick={onNavigatePraktik}
                className="px-4 py-2 bg-white text-orange-900 hover:bg-orange-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-600" />
                <span>Entri Nilai Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-orange-200 block font-medium">Siswa Terdata</span>
            <span className="text-xl font-black block mt-0.5">{stats.totalStudents} Siswa</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-orange-200 block font-medium">Sudah Dinilai</span>
            <span className="text-xl font-black block mt-0.5">
              {stats.assessedStudents} / {stats.totalStudents}
            </span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-orange-200 block font-medium">Rata-Rata Kelas</span>
            <span className="text-xl font-black block mt-0.5">{stats.avgClass} / 100</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-orange-200 block font-medium">Ketuntasan (≥ {kkmScore})</span>
            <span className="text-xl font-black block mt-0.5 text-amber-200">
              {stats.tuntasPercent}% Tuntas
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Kelas Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Kelas:</span>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Materi Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Materi:</span>
              <select
                value={selectedMateri}
                onChange={(e) => setSelectedMateri(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden max-w-[200px] truncate"
              >
                <option value="SEMUA">📊 Semua Materi (Matriks Praktik)</option>
                {materiList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* KKM Setting */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">KKM:</span>
              <select
                value={kkmScore}
                onChange={(e) => setKkmScore(Number(e.target.value))}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value={70}>70</option>
                <option value={75}>75 (Standar)</option>
                <option value={80}>80</option>
                <option value={85}>85</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa atau NIS..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Tabel Rekapitulasi Nilai Praktik Kelas {selectedKelasObj?.nama || selectedKelasId}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedMateri === 'SEMUA'
                ? 'Menampilkan matriks seluruh materi praktik PJOK yang terdata'
                : `Menampilkan detail capaian materi: ${selectedMateri}`}
            </p>
          </div>
          <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl self-start sm:self-auto">
            {filteredRows.length} Murid
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-3.5 w-12 text-center">No</th>
                <th className="py-3.5 px-3.5 min-w-[180px]">Nama Siswa & NIS</th>

                {selectedMateri === 'SEMUA' ? (
                  <>
                    {materiList.map((m) => (
                      <th
                        key={m}
                        className="py-3.5 px-2 text-center min-w-[110px] truncate"
                        title={m}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-3.5 px-3 text-center min-w-[90px]">Rata²</th>
                    <th className="py-3.5 px-3 text-center w-24">Predikat</th>
                    <th className="py-3.5 px-3 text-center w-28">Status</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 px-3 text-center min-w-[100px]">Nilai Akhir</th>
                    <th className="py-3.5 px-3 text-center w-24">Predikat</th>
                    <th className="py-3.5 px-3 text-center w-28">Status</th>
                    <th className="py-3.5 px-3 min-w-[260px]">Catatan Capaian Gerak</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedMateri === 'SEMUA' ? 5 + materiList.length : 6}
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-sm text-slate-600">Tidak ada data murid ditemukan</p>
                    <p className="text-xs text-slate-400">
                      Pastikan kelas yang dipilih memiliki data siswa aktif.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.murid.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-3.5">
                      <p className="font-extrabold text-slate-900 leading-tight">{row.murid.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">NIS: {row.murid.nis || '-'}</p>
                    </td>

                    {selectedMateri === 'SEMUA' ? (
                      <>
                        {materiList.map((m) => {
                          const val = row.scoresPerMateri[m];
                          return (
                            <td key={m} className="py-3.5 px-2 text-center font-bold">
                              {val !== undefined ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                                    val >= kkmScore
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                                  }`}
                                >
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-3 text-center">
                          {row.isAssessed ? (
                            <span className="font-black text-xs text-orange-950 bg-orange-100/70 px-2.5 py-1 rounded-lg">
                              {row.finalScore}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                          {row.isAssessed ? row.predikat : '-'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {row.isAssessed ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                row.isTuntas
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.isTuntas ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                              )}
                              <span>{row.isTuntas ? 'Tuntas' : 'Remedial'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum dinilai</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3.5 px-3 text-center">
                          {row.isAssessed ? (
                            <span className="font-black text-xs text-orange-950 bg-orange-100/70 px-2.5 py-1 rounded-lg">
                              {row.finalScore}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                          {row.isAssessed ? row.predikat : '-'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {row.isAssessed ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                row.isTuntas
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.isTuntas ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                              )}
                              <span>{row.isTuntas ? 'Tuntas' : 'Remedial'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum dinilai</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 text-[11px]">
                          {row.currentAssessment?.catatan ? (
                            <p className="line-clamp-2 italic text-slate-700">
                              &quot;{row.currentAssessment.catatan}&quot;
                            </p>
                          ) : (
                            <span className="text-slate-300 italic">Belum ada catatan deskriptif</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
