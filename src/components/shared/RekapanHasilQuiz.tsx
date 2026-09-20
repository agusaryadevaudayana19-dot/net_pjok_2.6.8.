import React, { useState, useMemo } from 'react';
import {
  Award,
  CheckCircle,
  Download,
  Printer,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  HelpCircle,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  BookOpen,
  BarChart3,
  Unlock,
  Key,
  RotateCcw,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import { User, Quiz, JawabanQuiz, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface RekapanHasilQuizProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigateQuiz?: () => void;
}

export const isAnswerCorrect = (soal: any, ans: string | undefined): boolean => {
  if (ans === undefined || ans === null || ans === '') return false;
  if (soal.tipe === 'Tarik Garis') {
    try {
      const parsed = JSON.parse(ans);
      if (typeof parsed === 'object' && soal.matchingPairs && soal.matchingPairs.length > 0) {
        let correctPairs = 0;
        soal.matchingPairs.forEach((p: any) => {
          if (parsed[p.left] === p.right) correctPairs++;
        });
        return correctPairs >= Math.ceil(soal.matchingPairs.length * 0.7);
      }
    } catch {
      // fallback
    }
  }
  return String(ans).trim().toLowerCase() === String(soal.kunciJawaban || '').trim().toLowerCase();
};

export const RekapanHasilQuiz: React.FC<RekapanHasilQuizProps> = ({
  db,
  currentUser,
  onNavigateQuiz,
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

  const [selectedQuizId, setSelectedQuizId] = useState<string>('SEMUA');
  const [activeTab, setActiveTab] = useState<'rekap' | 'analisis'>('rekap');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'SUDAH' | 'BELUM'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kkmScore, setKkmScore] = useState<number>(75);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [activeDetailJawaban, setActiveDetailJawaban] = useState<{
    jawaban: JawabanQuiz;
    quiz?: Quiz;
  } | null>(null);

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

  // Quizzes assigned to this class or all quizzes
  const classQuizzes = useMemo(() => {
    return (db.quiz || []).filter((q) => {
      if (!q.kelasIds || q.kelasIds.length === 0) return true;
      return q.kelasIds.includes(selectedKelasId);
    });
  }, [db.quiz, selectedKelasId]);

  // All student responses in DB
  const allJawaban = useMemo(() => {
    return db.jawabanQuiz || [];
  }, [db.jawabanQuiz]);

  // Active quiz for detailed analysis
  const activeQuizForAnalysis = useMemo(() => {
    if (selectedQuizId !== 'SEMUA') {
      return (db.quiz || []).find((q) => q.id === selectedQuizId);
    }
    return classQuizzes[0] || (db.quiz || [])[0];
  }, [selectedQuizId, classQuizzes, db.quiz]);

  const activeQuestions = useMemo(() => {
    return activeQuizForAnalysis?.soal || activeQuizForAnalysis?.soalList || [];
  }, [activeQuizForAnalysis]);

  // Computed matrix rows
  const studentRows = useMemo(() => {
    return muridInKelas.map((murid) => {
      const studentAnswers = allJawaban.filter((j) => j.muridId === murid.id);

      let matchedJawaban: JawabanQuiz | undefined;
      let matchedQuiz: Quiz | undefined;

      if (selectedQuizId !== 'SEMUA') {
        matchedJawaban = studentAnswers.find((j) => j.quizId === selectedQuizId);
        matchedQuiz = (db.quiz || []).find((q) => q.id === selectedQuizId);
      } else {
        matchedJawaban = studentAnswers[0];
        if (matchedJawaban) {
          matchedQuiz = (db.quiz || []).find((q) => q.id === matchedJawaban!.quizId);
        }
      }

      const hasSubmitted = !!matchedJawaban;
      const score = matchedJawaban?.nilai ?? 0;
      const isTuntas = hasSubmitted && score >= kkmScore;

      return {
        murid,
        matchedJawaban,
        matchedQuiz,
        hasSubmitted,
        score,
        isTuntas,
        totalCompletedQuizzes: studentAnswers.length,
      };
    });
  }, [muridInKelas, allJawaban, selectedQuizId, db.quiz, kkmScore]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return studentRows.filter((r) => {
      if (filterStatus === 'SUDAH' && !r.hasSubmitted) return false;
      if (filterStatus === 'BELUM' && r.hasSubmitted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.murid.name.toLowerCase().includes(q);
        const matchNis = (r.murid.nis || '').toLowerCase().includes(q);
        if (!matchName && !matchNis) return false;
      }

      return true;
    });
  }, [studentRows, filterStatus, searchQuery]);

  // KPI Stats
  const stats = useMemo(() => {
    const totalStudents = studentRows.length;
    const submittedStudents = studentRows.filter((r) => r.hasSubmitted).length;
    const tuntasStudents = studentRows.filter((r) => r.isTuntas).length;
    const scores = studentRows.filter((r) => r.hasSubmitted).map((r) => r.score);
    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const participationRate =
      totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0;

    return {
      totalStudents,
      submittedStudents,
      tuntasStudents,
      avgScore,
      participationRate,
    };
  }, [studentRows]);

  // Submissions for active quiz in this class
  const submissionsForQuiz = useMemo(() => {
    if (!activeQuizForAnalysis) return [];
    const classMuridIds = new Set(muridInKelas.map((m) => m.id));
    return (db.jawabanQuiz || []).filter(
      (j) => j.quizId === activeQuizForAnalysis.id && classMuridIds.has(j.muridId)
    );
  }, [activeQuizForAnalysis, muridInKelas, db.jawabanQuiz]);

  // Analisis Butir Soal Data
  const analisisButirList = useMemo(() => {
    const totalPeserta = submissionsForQuiz.length;

    return activeQuestions.map((soal, sIdx) => {
      let benar = 0;
      let salah = 0;
      const opsiCount: Record<string, number> = {};
      const opsiList = Object.keys(soal.pilihan || {});

      opsiList.forEach((k) => {
        opsiCount[k] = 0;
      });

      submissionsForQuiz.forEach((sub) => {
        const jMap = sub.jawaban || (sub as any).jawabanMurid || {};
        const studentAns = jMap[soal.id];
        if (studentAns !== undefined && studentAns !== null) {
          opsiCount[studentAns] = (opsiCount[studentAns] || 0) + 1;
        }
        if (isAnswerCorrect(soal, studentAns)) {
          benar++;
        } else {
          salah++;
        }
      });

      const pValue = totalPeserta > 0 ? Number((benar / totalPeserta).toFixed(2)) : 0;
      let kategoriKesukaran: 'Mudah' | 'Sedang' | 'Sukar';
      let kesukaranLabel: string;
      let badgeColor: string;

      if (pValue >= 0.70) {
        kategoriKesukaran = 'Mudah';
        kesukaranLabel = 'Mudah (Daya serap tinggi)';
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      } else if (pValue >= 0.30) {
        kategoriKesukaran = 'Sedang';
        kesukaranLabel = 'Sedang (Ideal / Proporsional)';
        badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
      } else {
        kategoriKesukaran = 'Sukar';
        kesukaranLabel = 'Sukar (Perlu Remediasi)';
        badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
      }

      // Check non-functional distractors
      const distraktorMati = opsiList.filter(
        (k) => k !== soal.kunciJawaban && (opsiCount[k] || 0) === 0
      );

      let rekomendasi = '';
      if (totalPeserta === 0) {
        rekomendasi = 'Menunggu pengerjaan oleh murid di kelas ini.';
      } else if (pValue >= 0.85) {
        rekomendasi = 'Soal sangat mudah. Disarankan memperkaya opsi pengecoh agar lebih menantang.';
      } else if (pValue < 0.25) {
        rekomendasi = 'Tingkat kesukaran tinggi. Disarankan remedial materi dan evaluasi kalimat soal.';
      } else if (distraktorMati.length > 0) {
        rekomendasi = `Pengecoh (${distraktorMati.join(', ')}) belum dipilih. Perlu revisi daya beda pengecoh.`;
      } else {
        rekomendasi = 'Soal berkualitas baik dan memenuhi taraf pembeda instrumen PJOK (Diterima).';
      }

      return {
        nomor: sIdx + 1,
        soal,
        totalPeserta,
        benar,
        salah,
        pValue,
        kategoriKesukaran,
        kesukaranLabel,
        badgeColor,
        opsiCount,
        opsiList,
        distraktorMati,
        rekomendasi,
      };
    });
  }, [activeQuestions, submissionsForQuiz]);

  // Item analysis summary stats
  const analisisSummary = useMemo(() => {
    const totalSoal = analisisButirList.length;
    const countMudah = analisisButirList.filter((a) => a.kategoriKesukaran === 'Mudah').length;
    const countSedang = analisisButirList.filter((a) => a.kategoriKesukaran === 'Sedang').length;
    const countSukar = analisisButirList.filter((a) => a.kategoriKesukaran === 'Sukar').length;
    const avgPValue =
      totalSoal > 0
        ? Math.round(
            (analisisButirList.reduce((acc, curr) => acc + curr.pValue, 0) / totalSoal) * 100
          )
        : 0;

    return {
      totalSoal,
      countMudah,
      countSedang,
      countSukar,
      avgPValue,
      totalPeserta: submissionsForQuiz.length,
    };
  }, [analisisButirList, submissionsForQuiz]);

  // Handle single student unlock (1x attempt reset)
  const handleUnlockSingle = (row: (typeof filteredRows)[0]) => {
    const quizName = row.matchedQuiz?.judul || row.matchedJawaban?.quizJudul || 'Kuis PJOK';
    const confirmUnlock = window.confirm(
      `Buka kunci kuis "${quizName}" untuk murid "${row.murid.name}"?\n\nMurid ini telah mengerjakan kuis (Nilai: ${row.score}). Membuka kunci akan mereset pengerjaan sebelumnya sehingga murid dapat login dan mengerjakan kuis kembali 1 kali.`
    );
    if (!confirmUnlock) return;

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      jawabanQuiz: (prev.jawabanQuiz || []).filter(
        (j) =>
          !(
            j.id === row.matchedJawaban?.id ||
            (row.matchedQuiz &&
              j.quizId === row.matchedQuiz.id &&
              (j.muridId === row.murid.id || j.muridNama === row.murid.name))
          )
      ),
    }));

    setUnlockToast(
      `Kunci kuis "${quizName}" untuk murid ${row.murid.name} berhasil dibuka! Murid dapat mengerjakan kembali.`
    );
    setTimeout(() => setUnlockToast(null), 4500);
  };

  // Handle batch unlock for all students in this class
  const handleBatchUnlockClass = () => {
    const submittedRows = filteredRows.filter((r) => r.hasSubmitted);
    if (submittedRows.length === 0) {
      alert('Tidak ada data pengerjaan kuis murid yang perlu dibuka kuncinya pada filter saat ini.');
      return;
    }

    const confirmUnlock = window.confirm(
      `Buka kunci kuis untuk SEMUA (${submittedRows.length}) murid di kelas ${
        selectedKelasObj?.nama || selectedKelasId
      }?\n\nMurid yang telah menyelesaikan kuis akan diizinkan mengerjakan ulang 1 kali.`
    );
    if (!confirmUnlock) return;

    const submittedMuridIds = new Set(submittedRows.map((r) => r.murid.id));

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      jawabanQuiz: (prev.jawabanQuiz || []).filter((j) => {
        if (selectedQuizId !== 'SEMUA') {
          return !(j.quizId === selectedQuizId && submittedMuridIds.has(j.muridId));
        }
        return !submittedMuridIds.has(j.muridId);
      }),
    }));

    setUnlockToast(
      `Berhasil membuka kunci kuis untuk ${submittedRows.length} murid kelas ${
        selectedKelasObj?.nama || selectedKelasId
      }!`
    );
    setTimeout(() => setUnlockToast(null), 4500);
  };

  // Export CSV Rekapan Murid (With question-by-question details!)
  const handleExportCSV = () => {
    // Determine questions to append
    const quizForCols =
      selectedQuizId !== 'SEMUA'
        ? (db.quiz || []).find((q) => q.id === selectedQuizId)
        : classQuizzes[0] || (db.quiz || [])[0];
    const soalList = quizForCols?.soal || quizForCols?.soalList || [];

    const questionHeaders = soalList.flatMap((s, sIdx) => [
      `Soal_${sIdx + 1}_Teks`,
      `Soal_${sIdx + 1}_Kunci`,
      `Soal_${sIdx + 1}_Pilihan_Murid`,
      `Soal_${sIdx + 1}_Status`,
    ]);

    const headers = [
      'No',
      'NIS',
      'Nama Murid',
      'Kelas',
      'Paket Quiz',
      'Waktu Pengerjaan',
      'Jumlah Benar',
      'Jumlah Salah',
      'Nilai Akhir',
      'Status Ketuntasan (KKM ' + kkmScore + ')',
      ...questionHeaders,
    ];

    const rows = filteredRows.map((r, idx) => {
      const qCols = soalList.flatMap((s) => {
        if (!r.hasSubmitted || !r.matchedJawaban) {
          return ['"-"', `"${(s.kunciJawaban || '').replace(/"/g, '""')}"`, '"-"', '"-"'];
        }
        const jMap = r.matchedJawaban.jawaban || (r.matchedJawaban as any).jawabanMurid || {};
        const studentAns = jMap[s.id] ?? '-';
        const correct = isAnswerCorrect(s, studentAns);
        const teks = (s.pertanyaan || '').replace(/"/g, '""').replace(/\n/g, ' ');
        return [
          `"${teks}"`,
          `"${(s.kunciJawaban || '').replace(/"/g, '""')}"`,
          `"${String(studentAns).replace(/"/g, '""')}"`,
          correct ? 'BENAR (1)' : 'SALAH (0)',
        ];
      });

      return [
        idx + 1,
        `"${r.murid.nis || '-'}"`,
        `"${r.murid.name}"`,
        `"Kelas ${selectedKelasObj?.nama || selectedKelasId}"`,
        `"${r.matchedQuiz?.judul || (r.hasSubmitted ? 'Quiz PJOK' : '-')}"`,
        `"${r.matchedJawaban?.tanggalMengerjakan || '-'}"`,
        r.hasSubmitted ? (r.matchedJawaban?.jumlahBenar ?? '-') : '-',
        r.hasSubmitted ? (r.matchedJawaban?.jumlahSalah ?? '-') : '-',
        r.hasSubmitted ? r.score : '-',
        r.hasSubmitted ? (r.isTuntas ? 'TUNTAS' : 'REMEDIAL') : 'BELUM MENGERJAKAN',
        ...qCols,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Hasil_Quiz_Lengkap_${(selectedKelasObj?.nama || 'Kelas').replace(
        /\s+/g,
        '_'
      )}_${selectedQuizId.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV Analisis Butir Soal
  const handleExportAnalisisCSV = () => {
    const headers = [
      'No_Soal',
      'Tipe_Soal',
      'Pertanyaan',
      'Kunci_Jawaban',
      'Total_Peserta',
      'Jumlah_Benar',
      'Jumlah_Salah',
      'Indeks_Kesukaran_P',
      'Kategori_Kesukaran',
      'Distribusi_Pilihan_Murid',
      'Rekomendasi_Evaluasi',
    ];

    const rows = analisisButirList.map((a) => {
      const distStr = a.opsiList
        .map((k) => `${k}: ${a.opsiCount[k] || 0} murid`)
        .join('; ');

      return [
        a.nomor,
        `"${a.soal.tipe || 'Pilihan Ganda'}"`,
        `"${(a.soal.pertanyaan || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(a.soal.kunciJawaban || '').replace(/"/g, '""')}"`,
        a.totalPeserta,
        a.benar,
        a.salah,
        a.pValue,
        `"${a.kategoriKesukaran}"`,
        `"${distStr}"`,
        `"${a.rekomendasi.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Analisis_Butir_Soal_${(selectedKelasObj?.nama || 'Kelas').replace(
        /\s+/g,
        '_'
      )}_${(activeQuizForAnalysis?.judul || 'Quiz').replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold mb-1 border border-white/20">
              <Award className="w-3.5 h-3.5" />
              <span>Rekapitulasi Asesmen Teori & Kuis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Rekapan Hasil Quis Murid & Analisis Butir Soal
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Daftar rekapitulasi nilai kuis, akurasi jawaban, waktu pengerjaan, manajemen kunci pengerjaan 1x, serta analisis butir soal per kelas.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title="Cetak format cetak rekapan"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
            <button
              type="button"
              onClick={activeTab === 'rekap' ? handleExportCSV : handleExportAnalisisCSV}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer"
              title={
                activeTab === 'rekap'
                  ? 'Ekspor CSV lengkap rincian pilihan jawaban'
                  : 'Ekspor CSV analisis butir soal'
              }
            >
              <Download className="w-4 h-4" />
              <span>
                {activeTab === 'rekap' ? 'Ekspor CSV (+Detail Jawaban)' : 'Ekspor CSV Analisis Butir'}
              </span>
            </button>
            {onNavigateQuiz && (
              <button
                type="button"
                onClick={onNavigateQuiz}
                className="px-4 py-2 bg-white text-purple-950 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-purple-600" />
                <span>Kelola Kuis</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Murid Terdata</span>
            <span className="text-xl font-black block mt-0.5">{stats.totalStudents} Murid</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Partisipasi</span>
            <span className="text-xl font-black block mt-0.5">
              {stats.submittedStudents} ({stats.participationRate}%)
            </span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Rata-Rata Skor</span>
            <span className="text-xl font-black block mt-0.5">{stats.avgScore} / 100</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-purple-200 block font-medium">Tuntas (≥ {kkmScore})</span>
            <span className="text-xl font-black block mt-0.5 text-emerald-300">
              {stats.tuntasStudents} Murid
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification for Quiz Unlock */}
      {unlockToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{unlockToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setUnlockToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher & Batch Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-white text-purple-950 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rekapan Nilai Murid</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analisis')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'analisis'
                ? 'bg-white text-purple-950 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Analisis Butir Soal</span>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded-md font-extrabold">
              Per Butir
            </span>
          </button>
        </div>

        {activeTab === 'rekap' && (
          <button
            type="button"
            onClick={handleBatchUnlockClass}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
            title="Buka kunci ujian untuk semua murid yang sudah selesai di kelas ini agar bisa mengulang"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>Buka Kunci Semua Murid Kelas Ini</span>
          </button>
        )}
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

            {/* Quiz Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 shrink-0">Paket Quiz:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden max-w-[220px] truncate"
              >
                <option value="SEMUA">🎯 Semua Paket Quiz (Aktivitas Terbaru)</option>
                {classQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.judul}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter (Rekap tab only) */}
            {activeTab === 'rekap' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 shrink-0">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="SUDAH">Sudah Mengerjakan</option>
                  <option value="BELUM">Belum Mengerjakan</option>
                </select>
              </div>
            )}

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
          {activeTab === 'rekap' && (
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari murid atau NIS..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: REKAPAN NILAI MURID */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Daftar Rekapan Hasil Quis Kelas {selectedKelasObj?.nama || selectedKelasId}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedQuizId === 'SEMUA'
                  ? 'Menampilkan rekapitulasi status pengerjaan kuis terbaru murid'
                  : `Paket Kuis: ${
                      classQuizzes.find((q) => q.id === selectedQuizId)?.judul || selectedQuizId
                    }`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
                {filteredRows.length} Murid Ditampilkan
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-3.5 w-12 text-center">No</th>
                  <th className="py-3.5 px-3.5 min-w-[180px]">Nama Murid & NIS</th>
                  <th className="py-3.5 px-3 min-w-[170px]">Paket Quiz</th>
                  <th className="py-3.5 px-3 text-center min-w-[130px]">Waktu Selesai</th>
                  <th className="py-3.5 px-3 text-center min-w-[130px]">Akurasi Jawaban</th>
                  <th className="py-3.5 px-3 text-center w-20">Skor</th>
                  <th className="py-3.5 px-3 text-center w-28">Status KKM</th>
                  <th className="py-3.5 px-3.5 text-center min-w-[150px]">Aksi Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                      <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-sm text-slate-600">Tidak ada data hasil kuis</p>
                      <p className="text-xs text-slate-400">
                        Coba ganti filter paket kuis atau pilih kelas lain.
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
                      <td className="py-3.5 px-3 text-slate-700 font-semibold max-w-[200px] truncate">
                        {row.hasSubmitted ? (
                          row.matchedQuiz?.judul || row.matchedJawaban?.quizJudul || 'Kuis PJOK'
                        ) : (
                          <span className="text-slate-400 font-normal italic">Belum Mengerjakan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-500 text-[11px]">
                        {row.hasSubmitted && row.matchedJawaban?.tanggalMengerjakan ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{row.matchedJawaban.tanggalMengerjakan}</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {row.hasSubmitted && row.matchedJawaban ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {row.matchedJawaban.jumlahBenar} Benar • {row.matchedJawaban.jumlahSalah} Salah
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {row.hasSubmitted ? (
                          <span
                            className={`inline-block px-3 py-1 rounded-xl font-black text-xs ${
                              row.score >= kkmScore
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.score}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {row.hasSubmitted ? (
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
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Belum Mulai
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {row.hasSubmitted && row.matchedJawaban ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveDetailJawaban({
                                    jawaban: row.matchedJawaban!,
                                    quiz: row.matchedQuiz,
                                  })
                                }
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Lihat rincian jawaban per butir soal"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detail</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnlockSingle(row)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Buka kunci agar murid dapat mengulang kuis"
                              >
                                <Unlock className="w-3 h-3 text-amber-600" />
                                <span>Buka Kunci</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">Terkunci (1x)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ANALISIS BUTIR SOAL (ITEM ANALYSIS) */}
      {activeTab === 'analisis' && (
        <div className="space-y-5">
          {/* Summary KPI Analisis Butir */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Butir Soal
              </span>
              <span className="text-2xl font-black text-purple-950 block mt-1">
                {analisisSummary.totalSoal} Soal
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Paket: {activeQuizForAnalysis?.judul || '-'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Murid Mengerjakan
              </span>
              <span className="text-2xl font-black text-indigo-700 block mt-1">
                {analisisSummary.totalPeserta} Murid
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Dari {stats.totalStudents} murid kelas {selectedKelasObj?.nama}
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Daya Serap Rata-Rata (P)
              </span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">
                {analisisSummary.avgPValue}%
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Indeks Kemudahan Kelas
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Distribusi Kesukaran
              </span>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px] font-extrabold">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  {analisisSummary.countMudah} Mudah
                </span>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                  {analisisSummary.countSedang} Sedang
                </span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                  {analisisSummary.countSukar} Sukar
                </span>
              </div>
            </div>
          </div>

          {/* Analisis Table / Card List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span>
                    Analisis Butir Soal: {activeQuizForAnalysis?.judul || 'Kuis PJOK'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Taraf kesukaran (P), efektivitas opsi pengecoh, dan rekomendasi perbaikan instrumen soal di kelas {selectedKelasObj?.nama}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAnalisisCSV}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Unduh CSV Analisis</span>
                </button>
              </div>
            </div>

            {analisisButirList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-700">Tidak ada butir soal ditemukan</p>
                <p className="text-xs text-slate-400">
                  Pilih paket kuis yang memiliki butir soal pada selector di atas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {analisisButirList.map((item) => (
                  <div key={item.soal.id || item.nomor} className="p-5 sm:p-6 space-y-4 hover:bg-slate-50/40 transition">
                    {/* Top Row: Soal Header & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-black text-xs rounded-lg">
                            Soal #{item.nomor}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                            Tipe: {item.soal.tipe || 'Pilihan Ganda'}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 border rounded-lg text-xs font-black ${item.badgeColor}`}
                          >
                            Tingkat Kesukaran P: {item.pValue} ({item.kategoriKesukaran})
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 pt-1 leading-snug">
                          {item.soal.pertanyaan}
                        </p>
                      </div>

                      {/* Right Stats Quick Pill */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                          <span className="text-[9px] font-bold text-emerald-600 block uppercase">
                            Benar
                          </span>
                          <span className="text-sm font-black text-emerald-800">
                            {item.benar} / {item.totalPeserta}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                          <span className="text-[9px] font-bold text-rose-600 block uppercase">
                            Salah
                          </span>
                          <span className="text-sm font-black text-rose-800">
                            {item.salah}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Options Distribution Grid */}
                    {item.opsiList.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          Distribusi Pilihan Murid & Kunci Jawaban:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {item.opsiList.map((key) => {
                            const isKey = key === item.soal.kunciJawaban;
                            const count = item.opsiCount[key] || 0;
                            const pct =
                              item.totalPeserta > 0
                                ? Math.round((count / item.totalPeserta) * 100)
                                : 0;

                            return (
                              <div
                                key={key}
                                className={`p-2.5 rounded-2xl border text-xs transition ${
                                  isKey
                                    ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className={`font-black ${
                                      isKey ? 'text-emerald-800' : 'text-slate-700'
                                    }`}
                                  >
                                    Opsi {key} {isKey && '★ (Kunci)'}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                      isKey
                                        ? 'bg-emerald-200/80 text-emerald-900'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {count} murid ({pct}%)
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 truncate">
                                  {item.soal.pilihan?.[key]}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recommendation Footer */}
                    <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-700 shrink-0" />
                        <span className="text-purple-950 font-medium">
                          <strong>Evaluasi Butir:</strong> {item.rekomendasi}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-purple-700 shrink-0">
                        Status Kualitas: {item.kategoriKesukaran === 'Sedang' ? '🟢 Ideal' : item.kategoriKesukaran === 'Mudah' ? '🟡 Terlalu Mudah' : '🔴 Butuh Remedial'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detail Jawaban Murid */}
      {activeDetailJawaban && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">
                    Hasil Analisis Jawaban Murid
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeDetailJawaban.jawaban.muridNama} • Skor:{' '}
                    <strong className="text-purple-700 font-black">
                      {activeDetailJawaban.jawaban.nilai}/100
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailJawaban(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Jawaban Benar</span>
                  <span className="text-base font-black text-emerald-600">
                    {activeDetailJawaban.jawaban.jumlahBenar} Soal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Jawaban Salah</span>
                  <span className="text-base font-black text-rose-600">
                    {activeDetailJawaban.jawaban.jumlahSalah} Soal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Nilai Akhir</span>
                  <span className="text-base font-black text-purple-700">
                    {activeDetailJawaban.jawaban.nilai}
                  </span>
                </div>
              </div>

              {/* Questions Detail */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>Rincian Tiap Butir Soal:</span>
                </h4>

                {(() => {
                  const quiz = activeDetailJawaban.quiz;
                  const soalList = quiz?.soal || quiz?.soalList || [];

                  if (soalList.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        Butir soal detail tidak tersedia untuk paket kuis ini.
                      </p>
                    );
                  }

                  const jawabanMap = activeDetailJawaban.jawaban.jawaban || {};

                  return soalList.map((soal, sIdx) => {
                    const studentAns = jawabanMap[soal.id];
                    const isCorrect = isAnswerCorrect(soal, studentAns);

                    return (
                      <div
                        key={soal.id || sIdx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-rose-50/40 border-rose-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            Soal #{sIdx + 1}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? '✓ Benar' : '✗ Salah'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 mb-2 font-medium">
                          {soal.pertanyaan}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">
                              Jawaban Murid:
                            </span>
                            <span
                              className={`font-semibold ${
                                isCorrect ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {studentAns !== undefined
                                ? `${studentAns}. ${soal.pilihan?.[studentAns] ?? ''}`
                                : 'Tidak dijawab'}
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-white border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-bold">
                              Kunci Jawaban:
                            </span>
                            <span className="font-semibold text-emerald-700">
                              {soal.kunciJawaban !== undefined
                                ? `${soal.kunciJawaban}. ${soal.pilihan?.[soal.kunciJawaban] ?? ''}`
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDetailJawaban(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
