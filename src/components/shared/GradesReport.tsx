import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Printer,
  Search,
  Filter,
  Award,
  BookCheck,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { User, NilaiItem, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface GradesReportProps {
  db: LMSDatabase;
  currentUser: User;
  onOpenSheets?: () => void;
}

export const GradesReport: React.FC<GradesReportProps> = ({ db, currentUser }) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (availableClasses.length > 0) {
      return availableClasses[0].id;
    }
    return db.kelas.length > 0 ? db.kelas[0].id : '';
  });

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.some((k) => k.id === selectedKelasId)) {
      setSelectedKelasId(availableClasses[0].id);
    }
  }, [availableClasses, selectedKelasId]);
  const [selectedSemester, setSelectedSemester] = useState<string>('1 (Ganjil)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedKelasObj = (db.kelas || []).find((k) => k.id === selectedKelasId);

  const muridInKelas = db.users.filter((u) => {
    if (u.role !== 'MURID') return false;
    const uKelas = (u.kelasId || '').toLowerCase().trim();
    const targetId = selectedKelasId.toLowerCase().trim();
    const targetNama = (selectedKelasObj?.nama || '').toLowerCase().trim();
    return uKelas === targetId || (targetNama && uKelas === targetNama);
  });

  // Match grades - start from 0 if no real assessment has taken place
  const gradesRows = muridInKelas.map((murid) => {
    const existing = (db.nilai || []).find((n) => n.muridId === murid.id);
    if (existing) {
      return { murid, nilai: existing };
    }

    // Check if there are real assignment submissions, quizzes, or practical tests
    const studentTugas = (db.pengumpulanTugas || []).filter(
      (t) => t.muridId === murid.id && typeof t.nilai === 'number'
    );
    const avgTugas =
      studentTugas.length > 0
        ? Math.round(studentTugas.reduce((acc, t) => acc + (t.nilai || 0), 0) / studentTugas.length)
        : 0;

    const studentQuiz = (db.jawabanQuiz || []).filter(
      (q) => q.muridId === murid.id && typeof q.nilai === 'number'
    );
    const avgQuiz =
      studentQuiz.length > 0
        ? Math.round(studentQuiz.reduce((acc, q) => acc + (q.nilai || 0), 0) / studentQuiz.length)
        : 0;

    const studentPraktik = (db.penilaianPraktik || []).filter(
      (p) => p.muridId === murid.id && typeof (p.nilaiTotal ?? p.nilaiAkhir) === 'number'
    );
    const avgPraktik =
      studentPraktik.length > 0
        ? Math.round(
            studentPraktik.reduce((acc, p) => acc + (p.nilaiTotal ?? p.nilaiAkhir ?? 0), 0) /
              studentPraktik.length
          )
        : 0;

    const hasAnyAssessment = studentTugas.length > 0 || studentQuiz.length > 0 || studentPraktik.length > 0;
    const defAkhir = hasAnyAssessment ? Math.round((avgTugas + avgQuiz + avgPraktik) / 3) : 0;

    const fallbackNilai: NilaiItem = {
      id: `nil-${murid.id}`,
      muridId: murid.id,
      muridNama: murid.name,
      kelasId: selectedKelasId,
      semester: selectedSemester,
      tugas: avgTugas,
      quiz: avgQuiz,
      praktik: avgPraktik,
      pengetahuan: hasAnyAssessment ? Math.round((avgTugas + avgQuiz) / 2) : 0,
      keterampilan: avgPraktik,
      sikap: hasAnyAssessment ? 85 : 0,
      nilaiAkhir: defAkhir,
      predikat: defAkhir >= 90 ? 'A' : defAkhir >= 80 ? 'B' : defAkhir >= 70 ? 'C' : defAkhir > 0 ? 'D' : '-',
    };
    return { murid, nilai: fallbackNilai };
  });

  const handleResetNilai = () => {
    dataStorage.resetNilaiDanPresensi();
    setShowResetConfirm(false);
    setToastMessage('Seluruh rekap nilai berhasil dikosongkan. Nilai dimulai dari nol!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredRows = gradesRows.filter((r) =>
    r.murid.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.murid.nis && r.murid.nis.includes(searchQuery))
  );

  const handleExportCSV = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Murid',
      'Kelas',
      'Tugas',
      'Quiz',
      'Praktik',
      'Pengetahuan',
      'Keterampilan',
      'Sikap',
      'Nilai Akhir',
      'Predikat',
    ];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      r.murid.nis || '',
      `"${r.murid.name}"`,
      selectedKelasObj?.nama || '',
      r.nilai.tugas,
      r.nilai.quiz,
      r.nilai.praktik,
      r.nilai.pengetahuan,
      r.nilai.keterampilan,
      r.nilai.sikap,
      r.nilai.nilaiAkhir,
      r.nilai.predikat,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Nilai_PJOK_${selectedKelasObj?.nama || 'Kelas'}_${(db.settings?.tahunPelajaran || '2026/2027').replace(/\//g, '-')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Rekap Leger Nilai PJOK
          </h2>
          <p className="text-xs text-slate-500">
            Nilai capaian kompetensi tugas, quiz, praktik psikomotorik, pengetahuan, keterampilan, sikap, dan nilai akhir
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(currentUser.role === 'ADMIN' || currentUser.role === 'GURU') && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Reset seluruh rekap nilai ke nol"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nilai ke Nol</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Leger
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Konfirmasi Reset Nilai */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reset Nilai ke Nol?</h3>
                <p className="text-xs text-slate-500">Mulai pembelajaran baru dari awal</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Tindakan ini akan mengosongkan seluruh rekaman nilai (tugas, kuis, praktik, dan nilai akhir) serta riwayat absensi untuk memulai tahun ajaran dari nol. Data murid, akun guru, kelas, materi, dan instrumen tugas tetap aman.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetNilai}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Ya, Kosongkan Nilai ke Nol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Rombongan Belajar
            </span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Semester
            </span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
            >
              <option value="1 (Ganjil)">Semester 1 (Ganjil)</option>
              <option value="2 (Genap)">Semester 2 (Genap)</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama murid atau NIS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Leger Nilai Printable Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Print Header only visible on print */}
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <h1 className="text-xl font-black uppercase tracking-wider">
            {db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula'}
          </h1>
          <h2 className="text-sm font-bold mt-0.5">LEGER REKAPITULASI NILAI AKHIR MATA PELAJARAN PJOK</h2>
          <p className="text-xs text-slate-600 mt-1">
            Kelas: {selectedKelasObj?.nama} • Semester: {selectedSemester} • Tahun Pelajaran:{' '}
            {db.settings?.tahunPelajaran || '2026/2027'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">NIS</th>
                <th className="py-3 px-4">Nama Murid</th>
                <th className="py-3 px-3 text-center">Tugas</th>
                <th className="py-3 px-3 text-center">Quiz</th>
                <th className="py-3 px-3 text-center">Praktik</th>
                <th className="py-3 px-3 text-center">Pengetahuan</th>
                <th className="py-3 px-3 text-center">Keterampilan</th>
                <th className="py-3 px-3 text-center">Sikap</th>
                <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-800">Nilai Akhir</th>
                <th className="py-3 px-3 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.map((row, idx) => (
                <tr key={row.murid.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{row.murid.nis}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800 break-words whitespace-normal leading-snug min-w-[200px]">
                    {row.murid.name}
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold">{row.nilai.tugas}</td>
                  <td className="py-2.5 px-3 text-center font-semibold">{row.nilai.quiz}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                    {row.nilai.praktik}
                  </td>
                  <td className="py-2.5 px-3 text-center">{row.nilai.pengetahuan}</td>
                  <td className="py-2.5 px-3 text-center">{row.nilai.keterampilan}</td>
                  <td className="py-2.5 px-3 text-center">{row.nilai.sikap}</td>
                  <td className="py-2.5 px-3 text-center font-black text-sm text-emerald-700 bg-emerald-50/50">
                    {row.nilai.nilaiAkhir}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        row.nilai.predikat === 'A'
                          ? 'bg-emerald-100 text-emerald-800'
                          : row.nilai.predikat === 'B'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {row.nilai.predikat}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Print Signatures Block */}
        <div className="hidden print:grid grid-cols-2 p-8 text-xs text-center mt-6">
          <div className="space-y-16">
            <p>Mengetahui,<br />Kepala {db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula'}</p>
            <p className="font-bold underline">
              {db.settings?.kepalaSekolahNama || db.settings?.namaKepalaSekolah || 'Nyoman Sukrada, S.Pd., M.Pd.'}
              <br />
              <span className="font-normal text-[10px]">
                NIP: {db.settings?.kepalaSekolahNip || db.settings?.nipKepalaSekolah || '19680105 199103 1 020'}
              </span>
            </p>
          </div>
          <div className="space-y-16">
            <p>Tejakula, 5 September 2026<br />Guru Mata Pelajaran PJOK</p>
            <p className="font-bold underline">
              {db.settings?.guruPjokNama || db.settings?.namaGuruPJOKUtama || 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.'}
              <br />
              <span className="font-normal text-[10px]">
                NIP: {db.settings?.guruPjokNip || db.settings?.nipGuruPJOKUtama || '19881115 202221 1 012'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
