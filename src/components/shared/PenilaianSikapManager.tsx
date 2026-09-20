import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  Award,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  ChevronRight,
  Star,
  BookOpen,
  Edit3,
  Lock,
  UserCheck,
  Download,
  ClipboardList,
} from 'lucide-react';
import { User, PenilaianSikap, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface PenilaianSikapManagerProps {
  db: LMSDatabase;
  currentUser: User;
  initialTab?: 'entri' | 'rekap';
}

const ASPEK_SIKAP_CONFIG = [
  {
    key: 'integritas' as const,
    label: 'Integritas & Kejujuran (Fair Play)',
    desc: 'Menjunjung sportivitas, mengakui kesalahan/pelanggaran, dan bermain dengan jujur tanpa kecurangan.',
  },
  {
    key: 'disiplin' as const,
    label: 'Disiplin & Ketertiban Berolahraga',
    desc: 'Tepat waktu hadir ke lapangan, memakai seragam olahraga rapi, dan mematuhi instruksi keselamatan guru.',
  },
  {
    key: 'kerjaSama' as const,
    label: 'Kerja Sama & Gotong Royong',
    desc: 'Kompak bersama tim, tidak egois saat bermain, serta aktif merapikan dan merawat fasilitas olahraga bersama.',
  },
  {
    key: 'sportivitas' as const,
    label: 'Sportivitas & Respek',
    desc: 'Menghargai lawan tanding, menerima kekalahan dengan lapang dada, dan menghormati keputusan wasit/guru.',
  },
  {
    key: 'tanggungJawab' as const,
    label: 'Tanggung Jawab & Kemandirian',
    desc: 'Menjaga keselamatan diri dan rekan, merawat sarana prasarana sekolah, serta menjaga kebersihan lapangan.',
  },
];

const SKOR_SIKAP_LABEL: Record<number, { text: string; badge: string }> = {
  1: { text: 'Perlu Bimbingan (PB)', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  2: { text: 'Cukup (C)', badge: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  3: { text: 'Baik (B)', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
  4: { text: 'Sangat Baik (SB)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

function calculatePredikat(avg: number): 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan' {
  if (avg >= 3.5) return 'Sangat Baik';
  if (avg >= 2.75) return 'Baik';
  if (avg >= 2.0) return 'Cukup';
  return 'Perlu Bimbingan';
}

export const PenilaianSikapManager: React.FC<PenilaianSikapManagerProps> = ({
  db,
  currentUser,
  initialTab,
}) => {
  const isMurid = currentUser.role === 'MURID';

  // -------------------------------------------------------------
  // VIEW KHUSUS MURID: HANYA MELIHAT HASIL DARI GURU
  // -------------------------------------------------------------
  if (isMurid) {
    const myAssessment = (db.penilaianSikap || []).find((s) => s.muridId === currentUser.id);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Hasil Resmi Guru PJOK
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Profil Pelajar Pancasila</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Penilaian Sikap & Karakter
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Halaman ini menampilkan rekapitulasi penilaian sikap, karakter sportivitas, gotong royong, dan kedisiplinan Anda selama mengikuti pembelajaran PJOK sesuai asesmen Guru.
          </p>
        </div>

        {!myAssessment ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center space-y-3">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-base font-extrabold text-slate-700">Belum Ada Hasil Penilaian Sikap</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Penilaian sikap semester ini sedang diobservasi oleh Guru PJOK. Nilai dan umpan balik karakter Anda akan tampil otomatis di sini setelah diinput oleh guru.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    Predikat Sikap Keseluruhan
                  </span>
                  <div className="text-3xl sm:text-4xl font-black mt-1 flex items-center gap-3">
                    <span>{myAssessment.predikat}</span>
                    <span className="text-lg font-bold bg-white/20 px-3 py-0.5 rounded-full text-emerald-100">
                      Rata-rata: {myAssessment.rataRata?.toFixed(2) || '4.00'} / 4.0
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-emerald-100 space-y-1">
                  <p>Dinilai oleh: <strong className="text-white font-bold">{myAssessment.guruNama || 'Guru PJOK'}</strong></p>
                  <p>Tanggal Evaluasi: <strong className="text-white font-semibold">{myAssessment.tanggal}</strong></p>
                </div>
              </div>
            </div>

            {/* Aspek Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Rincian Aspek Sikap & Perilaku
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ASPEK_SIKAP_CONFIG.map((aspek) => {
                  const val = myAssessment[aspek.key] || 4;
                  const meta = SKOR_SIKAP_LABEL[val] || SKOR_SIKAP_LABEL[4];

                  return (
                    <div
                      key={aspek.key}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-xs text-slate-900">{aspek.label}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${meta.badge}`}>
                          {meta.text}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{aspek.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teacher Notes / Catatan Guru */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Catatan Perkembangan & Umpan Balik Guru
              </h2>
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 leading-relaxed font-medium">
                {myAssessment.catatanGuru ||
                  'Peserta didik menunjukkan sikap sportivitas yang sangat baik, selalu disiplin, serta aktif bekerja sama secara harmonis dalam setiap kegiatan olahraga.'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW GURU & ADMIN: INPUT & MANAJEMEN PENILAIAN SIKAP
  // -------------------------------------------------------------
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

  const [activeTab, setActiveTab] = useState<'entri' | 'rekap'>(initialTab || 'entri');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Sudah' | 'Belum'>('Semua');

  // Modal scoring state
  const [activeMuridToScore, setActiveMuridToScore] = useState<User | null>(null);
  const [formScores, setFormScores] = useState({
    integritas: 4,
    disiplin: 4,
    kerjaSama: 4,
    sportivitas: 4,
    tanggungJawab: 4,
    catatanGuru: '',
  });

  const currentKelas = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  const studentsInClass = useMemo(() => {
    return (db.users || [])
      .filter((u) => u.role === 'MURID' && u.kelasId === selectedKelasId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId]);

  const assessmentsMap = useMemo(() => {
    const map = new Map<string, PenilaianSikap>();
    (db.penilaianSikap || []).forEach((s) => {
      map.set(s.muridId, s);
    });
    return map;
  }, [db.penilaianSikap]);

  // Open modal to score a student
  const handleOpenScoreModal = (murid: User) => {
    const existing = assessmentsMap.get(murid.id);
    if (existing) {
      setFormScores({
        integritas: existing.integritas || 4,
        disiplin: existing.disiplin || 4,
        kerjaSama: existing.kerjaSama || 4,
        sportivitas: existing.sportivitas || 4,
        tanggungJawab: existing.tanggungJawab || 4,
        catatanGuru: existing.catatanGuru || '',
      });
    } else {
      setFormScores({
        integritas: 4,
        disiplin: 4,
        kerjaSama: 4,
        sportivitas: 4,
        tanggungJawab: 4,
        catatanGuru: `${murid.name} menunjukkan perilaku yang positif dan sportif dalam pembelajaran PJOK.`,
      });
    }
    setActiveMuridToScore(murid);
  };

  // Save student attitude assessment
  const handleSaveAssessment = () => {
    if (!activeMuridToScore) return;

    const avg =
      (formScores.integritas +
        formScores.disiplin +
        formScores.kerjaSama +
        formScores.sportivitas +
        formScores.tanggungJawab) /
      5;

    const predikat = calculatePredikat(avg);
    const existing = assessmentsMap.get(activeMuridToScore.id);

    const newAssessment: PenilaianSikap = {
      id: existing?.id || `sikap-${Date.now()}-${activeMuridToScore.id}`,
      muridId: activeMuridToScore.id,
      muridNama: activeMuridToScore.name,
      nis: activeMuridToScore.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      semester: '1 (Ganjil)',
      tahunAjaran: '2025/2026',
      integritas: formScores.integritas,
      disiplin: formScores.disiplin,
      kerjaSama: formScores.kerjaSama,
      sportivitas: formScores.sportivitas,
      tanggungJawab: formScores.tanggungJawab,
      rataRata: Number(avg.toFixed(2)),
      predikat,
      catatanGuru:
        formScores.catatanGuru.trim() ||
        `${activeMuridToScore.name} menunjukkan sikap ${predikat.toLowerCase()} dalam mengikuti seluruh rangkaian olahraga PJOK.`,
      guruId: currentUser.id,
      guruNama: currentUser.name,
      statusPublikasi: 'Publish',
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianSikap || [];
      const remaining = prevList.filter((s) => s.muridId !== activeMuridToScore.id);
      return {
        ...prev,
        penilaianSikap: [...remaining, newAssessment],
      };
    });

    setActiveMuridToScore(null);
  };

  // Batch grade all students in class with "Sangat Baik" or "Baik"
  const handleBatchAssess = (score: number) => {
    if (studentsInClass.length === 0) return;
    const confirmAction = window.confirm(
      `Isi cepat nilai sikap untuk semua (${studentsInClass.length}) murid di kelas ${currentKelas?.nama} dengan skor ${score} (${score === 4 ? 'Sangat Baik' : 'Baik'})?`
    );
    if (!confirmAction) return;

    const predikat = calculatePredikat(score);
    const updatedRecords: PenilaianSikap[] = studentsInClass.map((m) => {
      const existing = assessmentsMap.get(m.id);
      return {
        id: existing?.id || `sikap-${Date.now()}-${m.id}`,
        muridId: m.id,
        muridNama: m.name,
        nis: m.nis,
        kelasId: selectedKelasId,
        kelasNama: currentKelas?.nama || selectedKelasId,
        tanggal: new Date().toISOString().slice(0, 10),
        semester: '1 (Ganjil)',
        tahunAjaran: '2025/2026',
        integritas: score,
        disiplin: score,
        kerjaSama: score,
        sportivitas: score,
        tanggungJawab: score,
        rataRata: score,
        predikat,
        catatanGuru:
          existing?.catatanGuru ||
          `${m.name} menunjukkan perilaku dan sportivitas yang ${predikat.toLowerCase()} selama aktivitas jasmani.`,
        guruId: currentUser.id,
        guruNama: currentUser.name,
        statusPublikasi: 'Publish',
        updatedAt: new Date().toISOString(),
      };
    });

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianSikap || [];
      const studentIds = new Set(studentsInClass.map((s) => s.id));
      const remaining = prevList.filter((s) => !studentIds.has(s.muridId));
      return {
        ...prev,
        penilaianSikap: [...remaining, ...updatedRecords],
      };
    });
  };

  const filteredStudents = useMemo(() => {
    return studentsInClass.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nis && s.nis.includes(searchQuery));
      if (!matchSearch) return false;

      const hasAssessment = assessmentsMap.has(s.id);
      if (filterStatus === 'Sudah') return hasAssessment;
      if (filterStatus === 'Belum') return !hasAssessment;
      return true;
    });
  }, [studentsInClass, searchQuery, filterStatus, assessmentsMap]);

  const assessedCount = useMemo(() => {
    return studentsInClass.filter((s) => assessmentsMap.has(s.id)).length;
  }, [studentsInClass, assessmentsMap]);

  // CSV Export for Attitude Assessment
  const handleExportCSVSikap = () => {
    const headers = [
      'No',
      'NIS',
      'Nama Murid',
      'Kelas',
      'Integritas (Fair Play)',
      'Disiplin',
      'Kerja Sama',
      'Sportivitas',
      'Tanggung Jawab',
      'Rata-Rata (1-4)',
      'Predikat',
      'Catatan Umpan Balik Guru',
    ];
    const rows = studentsInClass.map((s, idx) => {
      const a = assessmentsMap.get(s.id);
      return [
        idx + 1,
        `"${s.nis || '-'}"`,
        `"${s.name}"`,
        `"${currentKelas?.nama || selectedKelasId}"`,
        a ? a.integritas : '-',
        a ? a.disiplin : '-',
        a ? a.kerjaSama : '-',
        a ? a.sportivitas : '-',
        a ? a.tanggungJawab : '-',
        a ? a.rataRata : '-',
        `"${a ? a.predikat : 'Belum Dinilai'}"`,
        `"${a?.catatanGuru ? a.catatanGuru.replace(/"/g, '""') : '-'}"`,
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Penilaian_Sikap_${(currentKelas?.nama || selectedKelasId).replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" /> Kurikulum Merdeka
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Profil Pelajar Pancasila</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'rekap' ? 'Rekapan Penilaian Sikap Murid' : 'Penilaian Sikap & Karakter Murid'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl mt-1">
              Evaluasi dimensi sikap peserta didik: Integritas (Fair Play), Disiplin, Kerja Sama, Sportivitas, dan Tanggung Jawab. Hasil penilaian guru akan langsung tampak pada akun murid masing-masing.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Sudah Dinilai</span>
              <span className="text-base font-black text-emerald-600">
                {assessedCount} / {studentsInClass.length}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center px-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Persentase</span>
              <span className="text-base font-black text-slate-800">
                {studentsInClass.length > 0
                  ? `${Math.round((assessedCount / studentsInClass.length) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('entri')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'entri'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Observasi & Entri Sikap</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Rekapan Penilaian Sikap</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden shrink-0"
            >
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>

            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'entri' ? (
              <>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Sudah">Sudah Dinilai</option>
                  <option value="Belum">Belum Dinilai</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleBatchAssess(4)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                >
                  Isi Cepat Semua (Sangat Baik)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak Rekap Sikap</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSVSikap}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Entri List or Rekapan Table */}
      {activeTab === 'entri' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Daftar Murid Kelas {currentKelas?.nama} ({filteredStudents.length} Murid)</span>
            <span className="text-slate-400 font-semibold hidden sm:inline">
              Klik tombol &quot;Nilai Sikap&quot; untuk input asesmen
            </span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">Tidak ada murid ditemukan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((murid, idx) => {
                const assessment = assessmentsMap.get(murid.id);

                return (
                  <div
                    key={murid.id}
                    className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                        {murid.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate">{murid.name}</h3>
                        <p className="text-xs text-slate-400">
                          NIS: <strong className="text-slate-600 font-semibold">{murid.nis || '-'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Status & Predikat */}
                    <div className="flex items-center gap-3 shrink-0">
                      {assessment ? (
                        <div className="text-left sm:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {assessment.predikat} ({assessment.rataRata?.toFixed(1)})
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Dinilai: {assessment.tanggal}
                          </p>
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Belum Dinilai
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(murid)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          assessment
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{assessment ? 'Ubah Sikap' : 'Nilai Sikap'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Rekapan Penilaian Sikap Table View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
            <div>
              <span>Tabel Rekapitulasi Sikap Kelas {currentKelas?.nama} ({filteredStudents.length} Murid)</span>
              <p className="text-[11px] text-slate-400 font-normal">
                Skala Skor: 1 (PB / Perlu Bimbingan), 2 (C / Cukup), 3 (B / Baik), 4 (SB / Sangat Baik)
              </p>
            </div>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-semibold self-start sm:self-auto">
              Tercatat: {assessedCount} dari {studentsInClass.length} Murid
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[180px]">Nama Murid & NIS</th>
                  <th className="py-3 px-2 text-center w-24">Integritas</th>
                  <th className="py-3 px-2 text-center w-20">Disiplin</th>
                  <th className="py-3 px-2 text-center w-24">Kerja Sama</th>
                  <th className="py-3 px-2 text-center w-24">Sportivitas</th>
                  <th className="py-3 px-2 text-center w-24">T. Jawab</th>
                  <th className="py-3 px-2 text-center w-20">Rata²</th>
                  <th className="py-3 px-3 text-center w-32">Predikat</th>
                  <th className="py-3 px-3 min-w-[200px]">Catatan Evaluasi Guru</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Tidak ada data murid ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((murid, idx) => {
                    const assessment = assessmentsMap.get(murid.id);

                    return (
                      <tr key={murid.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 leading-tight">{murid.name}</p>
                          <p className="text-[10px] text-slate-400">NIS: {murid.nis || '-'}</p>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {assessment ? assessment.integritas : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {assessment ? assessment.disiplin : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {assessment ? assessment.kerjaSama : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {assessment ? assessment.sportivitas : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {assessment ? assessment.tanggungJawab : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-emerald-700 bg-emerald-50/30">
                          {assessment ? assessment.rataRata?.toFixed(1) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {assessment ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                SKOR_SIKAP_LABEL[Math.round(assessment.rataRata || 3)]?.badge ||
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {assessment.predikat}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum Dinilai</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs truncate">
                          {assessment?.catatanGuru || <span className="text-slate-300 italic">-</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenScoreModal(murid)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit Nilai Sikap"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Penilaian Sikap Murid */}
      {activeMuridToScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Form Penilaian Sikap Peserta Didik
                </span>
                <h2 className="text-lg font-black text-slate-900">{activeMuridToScore.name}</h2>
                <p className="text-xs text-slate-500">
                  NIS: {activeMuridToScore.nis || '-'} • Kelas {currentKelas?.nama}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMuridToScore(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500">
                Pilih skor untuk masing-masing dimensi sikap (1: Perlu Bimbingan, 2: Cukup, 3: Baik, 4: Sangat Baik):
              </p>

              {ASPEK_SIKAP_CONFIG.map((aspek) => {
                const currentVal = formScores[aspek.key];

                return (
                  <div key={aspek.key} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-900">{aspek.label}</label>
                      <span className="text-xs font-extrabold text-emerald-700">
                        {SKOR_SIKAP_LABEL[currentVal]?.text}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{aspek.desc}</p>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[1, 2, 3, 4].map((skorVal) => {
                        const isChosen = currentVal === skorVal;
                        return (
                          <button
                            key={skorVal}
                            type="button"
                            onClick={() =>
                              setFormScores((prev) => ({ ...prev, [aspek.key]: skorVal }))
                            }
                            className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              isChosen
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {skorVal === 1 ? 'PB (1)' : skorVal === 2 ? 'C (2)' : skorVal === 3 ? 'B (3)' : 'SB (4)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Catatan Guru */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Catatan Perkembangan Karakter & Umpan Balik Guru
                </label>
                <textarea
                  rows={3}
                  value={formScores.catatanGuru}
                  onChange={(e) => setFormScores((prev) => ({ ...prev, catatanGuru: e.target.value }))}
                  placeholder="Tuliskan catatan apresiasi atau pembinaan karakter murid..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveMuridToScore(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan & Publikasikan ke Murid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
