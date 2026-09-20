import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Award,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Users,
  Target,
  Eye,
  X,
  BookOpen,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { User, Quiz, JawabanQuiz, Soal, getTeacherAssignedClasses } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface LaporanPenilaianProps {
  db: LMSDatabase;
  currentUser: User;
}

export const LaporanPenilaian: React.FC<LaporanPenilaianProps> = ({ db, currentUser }) => {
  // 1. Kelas yang tersedia (Guru melihat kelas ampuannya, Admin melihat semua kelas)
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas || [];
    }
    return db.kelas || [];
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<'butir' | 'nilai'>('butir');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('SEMUA');
  const [kkmScore, setKkmScore] = useState<number>(75);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKetuntasan, setFilterKetuntasan] = useState<'SEMUA' | 'TUNTAS' | 'REMEDIAL'>('SEMUA');
  const [selectedSemester, setSelectedSemester] = useState<string>('1 (Ganjil)');
  const [tahunPelajaran] = useState<string>('2026/2027');

  // Modal State
  const [activeSoalDetail, setActiveSoalDetail] = useState<{ soal: Soal; nomor: number } | null>(null);
  const [activeStudentDetail, setActiveStudentDetail] = useState<{
    murid: User;
    avgTugas: number;
    avgQuiz: number;
    avgPraktik: number;
    avgSikap: number;
    nilaiAkhir: number;
    predikat: string;
    isTuntas: boolean;
    tugasList: any[];
    quizList: any[];
    praktikList: any[];
  } | null>(null);

  const selectedKelasObj = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  const selectedKelasNama = selectedKelasObj?.nama || 'Kelas PJOK';

  // Daftar Murid pada Kelas Terpilih
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

  const muridInKelasIds = useMemo(() => new Set(muridInKelas.map((m) => m.id)), [muridInKelas]);

  // Daftar Kuis yang Relevan untuk Kelas Terpilih
  const classQuizzes = useMemo(() => {
    return (db.quiz || []).filter((q) => {
      if (!q.kelasIds || q.kelasIds.length === 0) return true;
      return q.kelasIds.includes(selectedKelasId);
    });
  }, [db.quiz, selectedKelasId]);

  // Kuis yang aktif untuk analisis butir soal
  const activeQuizForAnalysis = useMemo(() => {
    if (selectedQuizId !== 'SEMUA') {
      return (db.quiz || []).find((q) => q.id === selectedQuizId);
    }
    return classQuizzes[0] || (db.quiz || [])[0];
  }, [selectedQuizId, classQuizzes, db.quiz]);

  const activeQuestions: Soal[] = useMemo(() => {
    return activeQuizForAnalysis?.soal || activeQuizForAnalysis?.soalList || [];
  }, [activeQuizForAnalysis]);

  // Pengumpulan Jawaban Kuis di Kelas ini
  const submissionsForQuiz = useMemo(() => {
    if (!activeQuizForAnalysis) return [];
    return (db.jawabanQuiz || []).filter(
      (j) => j.quizId === activeQuizForAnalysis.id && muridInKelasIds.has(j.muridId)
    );
  }, [activeQuizForAnalysis, muridInKelasIds, db.jawabanQuiz]);

  // Helper fungsi koreksi jawaban
  const isCorrectAnswer = (soal: Soal, ans: string | undefined): boolean => {
    if (ans === undefined || ans === null || ans === '') return false;
    if (soal.tipe === 'Tarik Garis') {
      try {
        const parsed = JSON.parse(ans);
        if (typeof parsed === 'object' && soal.matchingPairs && soal.matchingPairs.length > 0) {
          let correctPairs = 0;
          soal.matchingPairs.forEach((p) => {
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

  // ==========================================
  // TAB 1: PERHITUNGAN ANALISIS BUTIR SOAL
  // ==========================================
  const analisisButirList = useMemo(() => {
    const totalPeserta = submissionsForQuiz.length;

    // Urutkan submission berdasarkan skor untuk menghitung daya pembeda (Kelompok Atas & Bawah)
    const sortedSubmissions = [...submissionsForQuiz].sort((a, b) => (b.nilai || 0) - (a.nilai || 0));
    // Proporsi 27% kelompok atas & 27% kelompok bawah
    const groupSize = Math.max(1, Math.round(sortedSubmissions.length * 0.27));
    const upperGroup = sortedSubmissions.slice(0, groupSize);
    const lowerGroup = sortedSubmissions.slice(-groupSize);

    return activeQuestions.map((soal, idx) => {
      let benar = 0;
      let salah = 0;
      const opsiCount: Record<string, number> = {};

      // Inisialisasi opsi (A, B, C, D, E)
      const pilihanArray = Array.isArray(soal.pilihan)
        ? soal.pilihan
        : typeof soal.pilihan === 'object' && soal.pilihan !== null
        ? Object.keys(soal.pilihan)
        : ['A', 'B', 'C', 'D'];

      pilihanArray.forEach((_, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        opsiCount[letter] = 0;
      });

      submissionsForQuiz.forEach((sub) => {
        const jMap = sub.jawabanMurid || (sub as any).jawaban || {};
        const studentAns = jMap[soal.id];
        if (studentAns !== undefined && studentAns !== null) {
          opsiCount[studentAns] = (opsiCount[studentAns] || 0) + 1;
        }
        if (isCorrectAnswer(soal, studentAns)) {
          benar++;
        } else {
          salah++;
        }
      });

      // 1. Tingkat Kesukaran (P-Value: Benar / Total)
      const pValue = totalPeserta > 0 ? Number((benar / totalPeserta).toFixed(2)) : 0;
      let kategoriKesukaran: 'Mudah' | 'Sedang' | 'Sukar';
      let badgeKesukaran: string;

      if (pValue >= 0.70) {
        kategoriKesukaran = 'Mudah';
        badgeKesukaran = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      } else if (pValue >= 0.30) {
        kategoriKesukaran = 'Sedang';
        badgeKesukaran = 'bg-sky-100 text-sky-800 border-sky-200';
      } else {
        kategoriKesukaran = 'Sukar';
        badgeKesukaran = 'bg-rose-100 text-rose-800 border-rose-200';
      }

      // 2. Daya Pembeda (D = (Benar Atas - Benar Bawah) / n_group)
      let benarAtas = 0;
      upperGroup.forEach((sub) => {
        const ans = (sub.jawabanMurid || (sub as any).jawaban || {})[soal.id];
        if (isCorrectAnswer(soal, ans)) benarAtas++;
      });

      let benarBawah = 0;
      lowerGroup.forEach((sub) => {
        const ans = (sub.jawabanMurid || (sub as any).jawaban || {})[soal.id];
        if (isCorrectAnswer(soal, ans)) benarBawah++;
      });

      const dValue =
        totalPeserta >= 3
          ? Number(((benarAtas - benarBawah) / groupSize).toFixed(2))
          : 0;

      let kategoriDayaPembeda: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek / Revisi';
      let badgeDayaPembeda: string;

      if (dValue >= 0.40) {
        kategoriDayaPembeda = 'Sangat Baik';
        badgeDayaPembeda = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      } else if (dValue >= 0.30) {
        kategoriDayaPembeda = 'Baik';
        badgeDayaPembeda = 'bg-teal-100 text-teal-800 border-teal-200';
      } else if (dValue >= 0.20) {
        kategoriDayaPembeda = 'Cukup';
        badgeDayaPembeda = 'bg-amber-100 text-amber-800 border-amber-200';
      } else {
        kategoriDayaPembeda = 'Jelek / Revisi';
        badgeDayaPembeda = 'bg-rose-100 text-rose-800 border-rose-200';
      }

      // 3. Analisis Distraktor / Pengecoh
      const opsiKunci = soal.kunciJawaban;
      const distraktorMati: string[] = [];
      Object.entries(opsiCount).forEach(([k, count]) => {
        if (k !== opsiKunci && count === 0) {
          distraktorMati.push(k);
        }
      });

      // 4. Rekomendasi Pedagogis
      let rekomendasi = '';
      if (totalPeserta === 0) {
        rekomendasi = 'Belum ada data pengerjaan murid di kelas ini.';
      } else if (dValue < 0) {
        rekomendasi = 'Soal menyesatkan (kelompok bawah lebih banyak benar). Perlu dibuang / diganti total.';
      } else if (pValue >= 0.85) {
        rekomendasi = 'Soal terlalu mudah. Cocok untuk apersepsi atau kuis pembuka, revisi opsi pengecoh.';
      } else if (pValue <= 0.20) {
        rekomendasi = 'Soal sangat sukar. Perlu bimbingan & remedial materi PJOK bersangkutan.';
      } else if (dValue >= 0.30 && pValue >= 0.30 && pValue <= 0.70) {
        rekomendasi = 'Butir soal ideal (daya pembeda kuat & tingkat kesukaran proporsional). Diterima baik.';
      } else if (distraktorMati.length > 0) {
        rekomendasi = `Pengecoh ${distraktorMati.join(', ')} tidak berfungsi (0 pemilih). Perlu revisi alternatif jawaban.`;
      } else {
        rekomendasi = 'Diterima dengan sedikit revisi pada redaksi kalimat atau pilihan distraktor.';
      }

      return {
        nomor: idx + 1,
        soal,
        benar,
        salah,
        totalPeserta,
        pValue,
        kategoriKesukaran,
        badgeKesukaran,
        dValue,
        kategoriDayaPembeda,
        badgeDayaPembeda,
        opsiCount,
        distraktorMati,
        rekomendasi,
      };
    });
  }, [activeQuestions, submissionsForQuiz]);

  // Ringkasan Butir Soal
  const butirStats = useMemo(() => {
    const total = analisisButirList.length;
    const mudah = analisisButirList.filter((b) => b.kategoriKesukaran === 'Mudah').length;
    const sedang = analisisButirList.filter((b) => b.kategoriKesukaran === 'Sedang').length;
    const sukar = analisisButirList.filter((b) => b.kategoriKesukaran === 'Sukar').length;
    const baik = analisisButirList.filter(
      (b) => b.kategoriDayaPembeda === 'Sangat Baik' || b.kategoriDayaPembeda === 'Baik'
    ).length;
    const revisi = total - baik;
    const avgScore =
      submissionsForQuiz.length > 0
        ? Math.round(
            submissionsForQuiz.reduce((acc, s) => acc + (s.nilai || 0), 0) / submissionsForQuiz.length
          )
        : 0;

    return {
      total,
      peserta: submissionsForQuiz.length,
      mudah,
      sedang,
      sukar,
      baik,
      revisi,
      avgScore,
    };
  }, [analisisButirList, submissionsForQuiz]);

  // ==========================================
  // TAB 2: PERHITUNGAN REKAPITULASI NILAI MURID
  // ==========================================
  const nilaiMuridList = useMemo(() => {
    return muridInKelas.map((murid, idx) => {
      // 1. Tugas
      const tugasSubmissions = (db.pengumpulanTugas || []).filter(
        (t) => t.muridId === murid.id && typeof t.nilai === 'number'
      );
      const avgTugas =
        tugasSubmissions.length > 0
          ? Math.round(
              tugasSubmissions.reduce((acc, t) => acc + (t.nilai || 0), 0) / tugasSubmissions.length
            )
          : 0;

      // 2. Quiz / Asesmen Kognitif
      const quizSubmissions = (db.jawabanQuiz || []).filter(
        (q) => q.muridId === murid.id && typeof q.nilai === 'number'
      );
      const avgQuiz =
        quizSubmissions.length > 0
          ? Math.round(
              quizSubmissions.reduce((acc, q) => acc + (q.nilai || 0), 0) / quizSubmissions.length
            )
          : 0;

      // 3. Praktik Kinerja PJOK
      const praktikSubmissions = (db.penilaianPraktik || []).filter(
        (p) => p.muridId === murid.id && typeof (p.nilaiTotal ?? p.nilaiAkhir) === 'number'
      );
      const avgPraktik =
        praktikSubmissions.length > 0
          ? Math.round(
              praktikSubmissions.reduce(
                (acc, p) => acc + (p.nilaiTotal ?? p.nilaiAkhir ?? 0),
                0
              ) / praktikSubmissions.length
            )
          : 0;

      // 4. Sikap & Teman Sejawat / Harian
      const sikapList = (db.penilaianSikap || []).filter((s) => s.muridId === murid.id);
      const avgSikap =
        sikapList.length > 0
          ? Math.round(
              sikapList.reduce((acc, s) => acc + (s.skorTotal || 80), 0) / sikapList.length
            )
          : 85;

      // Nilai Akhir (Formula Pembobotan PJOK: 30% Tugas + 25% Quiz + 35% Praktik + 10% Sikap)
      const hasAnyAssessment =
        tugasSubmissions.length > 0 || quizSubmissions.length > 0 || praktikSubmissions.length > 0;

      let nilaiAkhir = 0;
      if (hasAnyAssessment) {
        // Gunakan bobot proporsional untuk aspek yang sudah ada datanya
        let weightSum = 0;
        let scoreSum = 0;

        if (tugasSubmissions.length > 0) {
          scoreSum += avgTugas * 0.3;
          weightSum += 0.3;
        }
        if (quizSubmissions.length > 0) {
          scoreSum += avgQuiz * 0.25;
          weightSum += 0.25;
        }
        if (praktikSubmissions.length > 0) {
          scoreSum += avgPraktik * 0.35;
          weightSum += 0.35;
        }
        if (sikapList.length > 0) {
          scoreSum += avgSikap * 0.1;
          weightSum += 0.1;
        }

        nilaiAkhir = weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;
      }

      // Predikat Nilai Kurikulum Merdeka
      let predikat = 'D';
      if (nilaiAkhir >= 90) predikat = 'A';
      else if (nilaiAkhir >= 80) predikat = 'B';
      else if (nilaiAkhir >= kkmScore) predikat = 'C';
      else predikat = 'D';

      const isTuntas = nilaiAkhir >= kkmScore;

      return {
        no: idx + 1,
        murid,
        avgTugas,
        avgQuiz,
        avgPraktik,
        avgSikap,
        nilaiAkhir,
        predikat,
        isTuntas,
        tugasList: tugasSubmissions,
        quizList: quizSubmissions,
        praktikList: praktikSubmissions,
      };
    });
  }, [muridInKelas, db.pengumpulanTugas, db.jawabanQuiz, db.penilaianPraktik, db.penilaianSikap, kkmScore]);

  // Filtered Nilai Murid
  const filteredNilaiMurid = useMemo(() => {
    return nilaiMuridList.filter((item) => {
      if (filterKetuntasan === 'TUNTAS' && !item.isTuntas) return false;
      if (filterKetuntasan === 'REMEDIAL' && item.isTuntas) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.murid.name.toLowerCase().includes(q);
        const matchNis = (item.murid.nis || '').toLowerCase().includes(q);
        if (!matchName && !matchNis) return false;
      }
      return true;
    });
  }, [nilaiMuridList, filterKetuntasan, searchQuery]);

  // Statistik Nilai Kelas
  const classGradeStats = useMemo(() => {
    const total = nilaiMuridList.length;
    const scores = nilaiMuridList.map((m) => m.nilaiAkhir).filter((s) => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const tuntasCount = nilaiMuridList.filter((m) => m.isTuntas && m.nilaiAkhir > 0).length;
    const remedialCount = nilaiMuridList.filter((m) => !m.isTuntas || m.nilaiAkhir === 0).length;
    const ketuntasanPersen = total > 0 ? Math.round((tuntasCount / total) * 100) : 0;

    const countA = nilaiMuridList.filter((m) => m.predikat === 'A').length;
    const countB = nilaiMuridList.filter((m) => m.predikat === 'B').length;
    const countC = nilaiMuridList.filter((m) => m.predikat === 'C').length;
    const countD = nilaiMuridList.filter((m) => m.predikat === 'D').length;

    return {
      total,
      avgScore,
      maxScore,
      minScore,
      tuntasCount,
      remedialCount,
      ketuntasanPersen,
      countA,
      countB,
      countC,
      countD,
    };
  }, [nilaiMuridList]);

  // ==========================================
  // FITUR EKSPOR & CETAK RESMI
  // ==========================================

  const handlePrint = () => {
    window.print();
  };

  // Ekspor ke format CSV (Excel)
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

    if (activeTab === 'butir') {
      csvContent += `LAPORAN ANALISIS BUTIR SOAL ASESMEN PJOK\n`;
      csvContent += `Mata Pelajaran,Pendidikan Jasmani Olahraga dan Kesehatan (PJOK)\n`;
      csvContent += `Rombel / Kelas,${selectedKelasNama}\n`;
      csvContent += `Judul Kuis,${activeQuizForAnalysis?.judul || 'Semua Kuis'}\n`;
      csvContent += `Total Soal,${analisisButirList.length}\n`;
      csvContent += `Jumlah Peserta,${submissionsForQuiz.length}\n\n`;
      csvContent += `No,Tipe Soal,Pertanyaan,Kunci Jawaban,Benar,Salah,P-Value,Tingkat Kesukaran,Daya Pembeda,Kategori Pembeda,Distraktor Mati,Rekomendasi\n`;

      analisisButirList.forEach((b) => {
        const cleanQuestion = `"${(b.soal.pertanyaan || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const cleanRekom = `"${b.rekomendasi.replace(/"/g, '""')}"`;
        const dist = b.distraktorMati.length > 0 ? b.distraktorMati.join(';') : '-';
        csvContent += `${b.nomor},${b.soal.tipe || 'Pilihan Ganda'},${cleanQuestion},${b.soal.kunciJawaban || '-'},${b.benar},${b.salah},${b.pValue},${b.kategoriKesukaran},${b.dValue},${b.kategoriDayaPembeda},${dist},${cleanRekom}\n`;
      });
    } else {
      csvContent += `LAPORAN NILAI HASIL BELAJAR MURID PJOK\n`;
      csvContent += `Mata Pelajaran,Pendidikan Jasmani Olahraga dan Kesehatan (PJOK)\n`;
      csvContent += `Rombel / Kelas,${selectedKelasNama}\n`;
      csvContent += `Semester,${selectedSemester}\n`;
      csvContent += `Tahun Pelajaran,${tahunPelajaran}\n`;
      csvContent += `Batas KKM/KKTP,${kkmScore}\n\n`;
      csvContent += `No,NIS,Nama Murid,Kelas,Rata-rata Tugas,Rata-rata Quiz,Nilai Praktik PJOK,Nilai Sikap,Nilai Akhir,Predikat,Status Ketuntasan\n`;

      nilaiMuridList.forEach((m) => {
        const cleanName = `"${m.murid.name.replace(/"/g, '""')}"`;
        csvContent += `${m.no},${m.murid.nis || '-'},${cleanName},${selectedKelasNama},${m.avgTugas},${m.avgQuiz},${m.avgPraktik},${m.avgSikap},${m.nilaiAkhir},${m.predikat},${m.isTuntas ? 'Tuntas' : 'Remedial'}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_${activeTab === 'butir' ? 'Analisis_Butir_Soal' : 'Nilai_Murid'}_${selectedKelasNama.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ekspor ke format Word (.doc)
  const handleExportWord = () => {
    const namaSekolah = db.settings?.namaSekolah || 'SMAN 1 TEJAKULA';
    const guruPengampu = currentUser.name || 'Guru Mata Pelajaran PJOK';
    const nipGuru = currentUser.nip || '19850315 201001 1 012';

    let tableRows = '';
    let reportTitle = '';

    if (activeTab === 'butir') {
      reportTitle = 'LAPORAN ANALISIS BUTIR SOAL ASESMEN PJOK';
      tableRows = `
        <table border="1" style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr style="background-color:#f2f2f2;">
              <th style="padding:6px;">No</th>
              <th style="padding:6px;">Butir Pertanyaan</th>
              <th style="padding:6px;">Kunci</th>
              <th style="padding:6px;">Benar</th>
              <th style="padding:6px;">Salah</th>
              <th style="padding:6px;">Tingkat Kesukaran</th>
              <th style="padding:6px;">Daya Pembeda</th>
              <th style="padding:6px;">Rekomendasi</th>
            </tr>
          </thead>
          <tbody>
            ${analisisButirList
              .map(
                (b) => `
              <tr>
                <td style="text-align:center; padding:5px;">${b.nomor}</td>
                <td style="padding:5px;"><strong>${b.soal.pertanyaan}</strong><br><small>Tipe: ${b.soal.tipe || 'Pilihan Ganda'}</small></td>
                <td style="text-align:center; padding:5px;">${b.soal.kunciJawaban || '-'}</td>
                <td style="text-align:center; padding:5px;">${b.benar}</td>
                <td style="text-align:center; padding:5px;">${b.salah}</td>
                <td style="text-align:center; padding:5px;">${b.pValue} (${b.kategoriKesukaran})</td>
                <td style="text-align:center; padding:5px;">${b.dValue} (${b.kategoriDayaPembeda})</td>
                <td style="padding:5px;">${b.rekomendasi}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else {
      reportTitle = 'LAPORAN REKAPITULASI NILAI MURID PJOK';
      tableRows = `
        <table border="1" style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr style="background-color:#f2f2f2;">
              <th style="padding:6px;">No</th>
              <th style="padding:6px;">NIS</th>
              <th style="padding:6px;">Nama Murid</th>
              <th style="padding:6px;">Tugas</th>
              <th style="padding:6px;">Quiz</th>
              <th style="padding:6px;">Praktik</th>
              <th style="padding:6px;">Sikap</th>
              <th style="padding:6px;">Nilai Akhir</th>
              <th style="padding:6px;">Predikat</th>
              <th style="padding:6px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${nilaiMuridList
              .map(
                (m) => `
              <tr>
                <td style="text-align:center; padding:5px;">${m.no}</td>
                <td style="text-align:center; padding:5px;">${m.murid.nis || '-'}</td>
                <td style="padding:5px;"><strong>${m.murid.name}</strong></td>
                <td style="text-align:center; padding:5px;">${m.avgTugas}</td>
                <td style="text-align:center; padding:5px;">${m.avgQuiz}</td>
                <td style="text-align:center; padding:5px;">${m.avgPraktik}</td>
                <td style="text-align:center; padding:5px;">${m.avgSikap}</td>
                <td style="text-align:center; padding:5px;"><strong>${m.nilaiAkhir}</strong></td>
                <td style="text-align:center; padding:5px;"><strong>${m.predikat}</strong></td>
                <td style="text-align:center; padding:5px;">${m.isTuntas ? 'Tuntas' : 'Remedial'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${reportTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; line-height: 1.4; margin: 2cm; }
          .kop-container { text-align: center; margin-bottom: 20px; }
          .kop-instansi { font-size: 11pt; text-transform: uppercase; font-weight: bold; margin: 0; }
          .kop-sekolah { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; }
          .kop-alamat { font-size: 9.5pt; font-style: italic; margin: 0; }
          .kop-line { border-bottom: 3px double #000; margin-top: 8px; margin-bottom: 18px; }
          .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
          .doc-subtitle { text-align: center; font-size: 11pt; margin-bottom: 18px; }
          .sign-table { width: 100%; border: none; margin-top: 40px; }
          .sign-table td { border: none; text-align: center; padding: 10px; width: 50%; }
        </style>
      </head>
      <body>
        <div class="kop-container">
          <p class="kop-instansi">PEMERINTAH PROVINSI BALI • DINAS PENDIDIKAN, KEPEMUDAAN DAN OLAHRAGA</p>
          <h1 class="kop-sekolah">${namaSekolah}</h1>
          <p class="kop-alamat">${db.settings?.alamatSekolah || 'Jl. Singaraja - Amlapura, Tejakula, Buleleng, Bali'} • Telp/Email: ${db.settings?.kontakSekolah || 'sman1tejakula@gmail.com'}</p>
          <div class="kop-line"></div>
        </div>

        <h2 class="doc-title">${reportTitle}</h2>
        <p class="doc-subtitle">Mata Pelajaran: <strong>PJOK</strong> • Rombel: <strong>${selectedKelasNama}</strong> • Semester: <strong>${selectedSemester}</strong> • TP: <strong>${tahunPelajaran}</strong></p>

        ${tableRows}

        <table class="sign-table">
          <tr>
            <td>
              Mengetahui,<br>
              Kepala Sekolah ${namaSekolah}<br><br><br><br>
              <strong>${db.settings?.kepalaSekolah || 'Drs. I Made Sujana, M.Pd'}</strong><br>
              NIP. ${db.settings?.nipKepalaSekolah || '19680512 199403 1 008'}
            </td>
            <td>
              Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
              Guru Pengampu PJOK<br><br><br><br>
              <strong>${guruPengampu}</strong><br>
              NIP. ${nipGuru}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportTitle.replace(/\s+/g, '_')}_${selectedKelasNama.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden print:hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-indigo-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Laporan Resmi & Evaluasi Hasil Belajar • Kurikulum Merdeka Fase F</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Laporan Penilaian PJOK
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            Pusat analisis butir soal asesmen (tingkat kesukaran, daya pembeda, efektivitas distraktor) dan rekapitulasi nilai capaian kompetensi murid (tugas, kuis, praktik motorik, serta nilai rapor sekolah).
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              Cetak Dokumen Resmi
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Excel (CSV)
            </button>
            <button
              onClick={handleExportWord}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Ekspor Word (.doc)
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Kelas, Tab Switcher, & Pengaturan */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('butir')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'butir'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>1. Analisis Butir Soal</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px]">
              {analisisButirList.length} Soal
            </span>
          </button>
          <button
            onClick={() => setActiveTab('nilai')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'nilai'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>2. Rekap Nilai Murid</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {muridInKelas.length} Murid
            </span>
          </button>
        </div>

        {/* Filter Rombel & Semester */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">Rombel:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">Semester:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="1 (Ganjil)">1 (Ganjil)</option>
              <option value="2 (Genap)">2 (Genap)</option>
            </select>
          </div>

          {activeTab === 'nilai' && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500">KKM/KKTP:</span>
              <input
                type="number"
                min="50"
                max="100"
                value={kkmScore}
                onChange={(e) => setKkmScore(Number(e.target.value) || 75)}
                className="w-12 bg-white px-1 py-0.5 rounded text-xs font-bold text-slate-800 border border-slate-300 text-center outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW PRINT RESMI (HANYA MUNCUL KETIKA CETAK BROWSER/PRINTER) */}
      {/* ========================================================= */}
      <div className="hidden print:block font-serif text-slate-900">
        <div className="text-center pb-3 border-b-4 border-double border-black mb-4">
          <p className="text-xs uppercase tracking-wider font-bold">
            PEMERINTAH PROVINSI BALI • DINAS PENDIDIKAN, KEPEMUDAAN DAN OLAHRAGA
          </p>
          <h1 className="text-lg font-black uppercase">
            {db.settings?.namaSekolah || 'SMAN 1 TEJAKULA'}
          </h1>
          <p className="text-[10px] italic">
            {db.settings?.alamatSekolah || 'Jl. Singaraja - Amlapura, Tejakula, Buleleng, Bali'} • Kontak: {db.settings?.kontakSekolah || 'sman1tejakula@gmail.com'}
          </p>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-sm font-black uppercase tracking-wide">
            {activeTab === 'butir'
              ? 'LAPORAN ANALISIS BUTIR SOAL ASESMEN PJOK'
              : 'LAPORAN REKAPITULASI NILAI HASIL BELAJAR MURID'}
          </h2>
          <p className="text-xs">
            Mata Pelajaran: <strong>PJOK</strong> • Rombel: <strong>{selectedKelasNama}</strong> • Semester: <strong>{selectedSemester}</strong> • TP: <strong>{tahunPelajaran}</strong>
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* KONTEN TAB 1: ANALISIS BUTIR SOAL */}
      {/* ========================================================= */}
      {activeTab === 'butir' && (
        <div className="space-y-6">
          {/* KPI Butir Soal Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Total Soal</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{butirStats.total}</p>
              <span className="text-[10px] text-slate-500">Butir asesmen</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Peserta Mengerjakan</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{butirStats.peserta}</p>
              <span className="text-[10px] text-slate-500">dari {muridInKelas.length} murid kelas</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Rata-rata Kuis</span>
              <p className="text-2xl font-black text-teal-600 mt-1">{butirStats.avgScore}</p>
              <span className="text-[10px] text-slate-500">Skor rata-rata kelas</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Soal Mudah (P ≥ 0.7)</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{butirStats.mudah}</p>
              <span className="text-[10px] text-emerald-700">Daya serap tinggi</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Soal Sedang (Ideal)</span>
              <p className="text-2xl font-black text-sky-600 mt-1">{butirStats.sedang}</p>
              <span className="text-[10px] text-sky-700">Proporsional (0.3-0.7)</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Soal Sukar (P &lt; 0.3)</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{butirStats.sukar}</p>
              <span className="text-[10px] text-rose-700">Perlu remediasi materi</span>
            </div>
          </div>

          {/* Quiz Selector & Detail Info */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Asesmen yang Dianalisis:
                </h4>
                <p className="text-[11px] text-slate-500">
                  {activeQuizForAnalysis?.judul || 'Pilih kuis PJOK yang tersedia'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">Pilih Kuis:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="SEMUA">-- Kuis Utama Rombel Ini --</option>
                {classQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.judul} ({q.soalList?.length || q.soal?.length || 0} Soal)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabel Analisis Butir Soal */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Tabel Hasil Analisis Psikometri Butir Soal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluasi tingkat kesukaran ($P$), daya pembeda ($D$), serta fungsi opsi distraktor.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                {submissionsForQuiz.length} Responden Kelas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-4 min-w-[240px]">Pertanyaan Soal</th>
                    <th className="py-3 px-3 text-center">Kunci</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Benar</th>
                    <th className="py-3 px-3 text-center text-rose-700">Salah</th>
                    <th className="py-3 px-3 text-center">Tingkat Kesukaran (P)</th>
                    <th className="py-3 px-3 text-center">Daya Pembeda (D)</th>
                    <th className="py-3 px-3 text-center">Distraktor Mati</th>
                    <th className="py-3 px-4 min-w-[200px]">Rekomendasi Tindak Lanjut</th>
                    <th className="py-3 px-3 text-center print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analisisButirList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada butir soal yang tersedia pada kuis ini.
                      </td>
                    </tr>
                  ) : (
                    analisisButirList.map((item) => (
                      <tr key={item.soal.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {item.nomor}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900 line-clamp-2">
                            {item.soal.pertanyaan}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded">
                              {item.soal.tipe || 'Pilihan Ganda'}
                            </span>
                            {item.soal.kategoriSoal && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">
                                {item.soal.kategoriSoal}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          <span className="px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                            {item.soal.kunciJawaban || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">
                          {item.benar}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-600">
                          {item.salah}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-800">{item.pValue}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${item.badgeKesukaran}`}
                            >
                              {item.kategoriKesukaran}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-800">{item.dValue}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${item.badgeDayaPembeda}`}
                            >
                              {item.kategoriDayaPembeda}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.distraktorMati.length > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded border border-rose-200">
                              Opsi: {item.distraktorMati.join(', ')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Semua aktif</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 leading-relaxed">
                          {item.rekomendasi}
                        </td>
                        <td className="py-3 px-3 text-center print:hidden">
                          <button
                            onClick={() =>
                              setActiveSoalDetail({ soal: item.soal, nomor: item.nomor })
                            }
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Pratinjau Soal & Pembahasan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KONTEN TAB 2: REKAPITULASI NILAI MURID */}
      {/* ========================================================= */}
      {activeTab === 'nilai' && (
        <div className="space-y-6">
          {/* KPI Nilai Kelas Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Total Peserta Didik</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{classGradeStats.total}</p>
              <span className="text-[10px] text-slate-500">Rombel {selectedKelasNama}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Rata-rata Kelas</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{classGradeStats.avgScore}</p>
              <span className="text-[10px] text-slate-500">Nilai Akhir (NA)</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Tertinggi / Terendah</span>
              <p className="text-2xl font-black text-teal-600 mt-1">
                {classGradeStats.maxScore} <span className="text-xs text-slate-400">/ {classGradeStats.minScore}</span>
              </p>
              <span className="text-[10px] text-slate-500">Rentang nilai siswa</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Ketuntasan Klasikal</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {classGradeStats.ketuntasanPersen}%
              </p>
              <span className="text-[10px] text-emerald-700">Mencapai KKM ({kkmScore})</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Tuntas Belajar</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{classGradeStats.tuntasCount}</p>
              <span className="text-[10px] text-slate-500">Siswa melampaui KKM</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block">Perlu Remedial</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{classGradeStats.remedialCount}</p>
              <span className="text-[10px] text-rose-700">Perlu bimbingan khusus</span>
            </div>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari murid (nama atau NIS)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['SEMUA', 'TUNTAS', 'REMEDIAL'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterKetuntasan(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterKetuntasan === status
                        ? status === 'TUNTAS'
                          ? 'bg-emerald-600 text-white'
                          : status === 'REMEDIAL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabel Nilai Lengkap Murid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Daftar Nilai Capaian Kompetensi Murid • {selectedKelasNama}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formula bobot: 30% Tugas + 25% Quiz Kognitif + 35% Praktik Kinerja PJOK + 10% Sikap.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200">
                  A (≥90) • B (80-89) • C (75-79) • D (&lt;75)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3 text-center">NIS</th>
                    <th className="py-3 px-4 min-w-[180px]">Nama Lengkap Murid</th>
                    <th className="py-3 px-3 text-center">Tugas (30%)</th>
                    <th className="py-3 px-3 text-center">Quiz (25%)</th>
                    <th className="py-3 px-3 text-center">Praktik (35%)</th>
                    <th className="py-3 px-3 text-center">Sikap (10%)</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/50">Nilai Akhir</th>
                    <th className="py-3 px-3 text-center">Predikat</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center print:hidden">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNilaiMurid.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada data nilai murid yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredNilaiMurid.map((item) => (
                      <tr key={item.murid.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {item.no}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.murid.nis || '-'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.murid.name}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {item.avgTugas > 0 ? item.avgTugas : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {item.avgQuiz > 0 ? item.avgQuiz : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {item.avgPraktik > 0 ? item.avgPraktik : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {item.avgSikap}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-sm bg-indigo-50/40 text-indigo-900">
                          {item.nilaiAkhir > 0 ? item.nilaiAkhir : <span className="text-slate-300 font-normal">0</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black ${
                              item.predikat === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.predikat === 'B'
                                ? 'bg-sky-100 text-sky-800'
                                : item.predikat === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.predikat}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              item.isTuntas
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.isTuntas ? 'Tuntas' : 'Remedial'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center print:hidden">
                          <button
                            onClick={() => setActiveStudentDetail(item)}
                            className="px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TANDA TANGAN RESMI KETIKA DI CETAK / PRINT */}
      {/* ========================================================= */}
      <div className="hidden print:block font-serif pt-8 mt-6 border-t border-slate-300 text-xs">
        <div className="flex justify-between items-start text-center">
          <div className="w-1/2">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala {db.settings?.namaSekolah || 'SMAN 1 TEJAKULA'}</p>
            <div className="h-20" />
            <p className="font-bold underline">
              {db.settings?.kepalaSekolah || 'Drs. I Made Sujana, M.Pd'}
            </p>
            <p>NIP. {db.settings?.nipKepalaSekolah || '19680512 199403 1 008'}</p>
          </div>
          <div className="w-1/2">
            <p>Tejakula, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Guru Mata Pelajaran PJOK</p>
            <div className="h-20" />
            <p className="font-bold underline">{currentUser.name || 'Guru PJOK'}</p>
            <p>NIP. {currentUser.nip || '19850315 201001 1 012'}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: DETAIL SOAL & PEMBAHASAN */}
      {/* ========================================================= */}
      {activeSoalDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black">
                  #{activeSoalDetail.nomor}
                </span>
                <h4 className="text-sm font-black text-slate-900">Pratinjau Butir Soal</h4>
              </div>
              <button
                onClick={() => setActiveSoalDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                {activeSoalDetail.soal.pertanyaan}
              </p>

              {activeSoalDetail.soal.pilihan && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-500">Alternatif Jawaban:</span>
                  {Array.isArray(activeSoalDetail.soal.pilihan)
                    ? activeSoalDetail.soal.pilihan.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isKunci = letter === activeSoalDetail.soal.kunciJawaban;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                              isKunci
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isKunci ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {letter}
                            </span>
                            <span>{opt}</span>
                            {isKunci && (
                              <span className="ml-auto text-[10px] text-emerald-700 font-bold">
                                (Kunci Jawaban)
                              </span>
                            )}
                          </div>
                        );
                      })
                    : null}
                </div>
              )}

              {activeSoalDetail.soal.pembahasan && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block mb-1">Keterangan & Pembahasan:</span>
                  {activeSoalDetail.soal.pembahasan}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveSoalDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL NILAI MURID */}
      {/* ========================================================= */}
      {activeStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {activeStudentDetail.murid.name}
                </h4>
                <p className="text-xs text-slate-500">
                  NIS: {activeStudentDetail.murid.nis || '-'} • Kelas: {selectedKelasNama}
                </p>
              </div>
              <button
                onClick={() => setActiveStudentDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rekap Nilai Akhir & Predikat */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-teal-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600">Nilai Akhir Rapor (NA):</span>
                <p className="text-3xl font-black text-indigo-950 mt-0.5">
                  {activeStudentDetail.nilaiAkhir}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                    activeStudentDetail.isTuntas
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {activeStudentDetail.isTuntas ? 'Tuntas KKM' : 'Remedial'}
                </span>
                <p className="text-xs font-bold text-slate-600 mt-1">
                  Predikat: <strong>{activeStudentDetail.predikat}</strong>
                </p>
              </div>
            </div>

            {/* Breakdown Tiap Komponen */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">Tugas PJOK ({activeStudentDetail.tugasList.length} Tugas)</span>
                <span className="font-black text-slate-900">{activeStudentDetail.avgTugas}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">Quiz Kognitif ({activeStudentDetail.quizList.length} Kuis)</span>
                <span className="font-black text-slate-900">{activeStudentDetail.avgQuiz}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">Praktik Gerak ({activeStudentDetail.praktikList.length} Asesmen)</span>
                <span className="font-black text-slate-900">{activeStudentDetail.avgPraktik}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">Penilaian Sikap & Perilaku</span>
                <span className="font-black text-slate-900">{activeStudentDetail.avgSikap}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveStudentDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
