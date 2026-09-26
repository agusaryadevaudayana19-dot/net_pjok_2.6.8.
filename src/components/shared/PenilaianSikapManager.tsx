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
  Save,
  CheckSquare,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Checklist State for Penilaian Sikap (Tinggal Centang Saja)
  interface StudentSikapChecklist {
    integritas: boolean; // Fair Play & Kejujuran
    disiplin: boolean;   // Disiplin & Tertib
    kerjaSama: boolean;  // Kerja Sama & Gotong Royong
    sportivitas: boolean;// Sportivitas & Respek
    tanggungJawab: boolean;// Tanggung Jawab & Mandiri
    customPredikat?: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
    catatan: string;
  }

  const [sikapChecklistData, setSikapChecklistData] = useState<Record<string, StudentSikapChecklist>>({});

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

  // Sync checklist state when class or assessments change
  useEffect(() => {
    const initial: Record<string, StudentSikapChecklist> = {};
    studentsInClass.forEach((s) => {
      const existing = assessmentsMap.get(s.id);
      if (existing) {
        initial[s.id] = {
          integritas: existing.integritas >= 3,
          disiplin: existing.disiplin >= 3,
          kerjaSama: existing.kerjaSama >= 3,
          sportivitas: existing.sportivitas >= 3,
          tanggungJawab: existing.tanggungJawab >= 3,
          customPredikat: existing.predikat,
          catatan: existing.catatanGuru || '',
        };
      } else {
        initial[s.id] = {
          integritas: true,
          disiplin: true,
          kerjaSama: true,
          sportivitas: true,
          tanggungJawab: true,
          customPredikat: 'Sangat Baik',
          catatan: '',
        };
      }
    });
    setSikapChecklistData(initial);
  }, [studentsInClass, assessmentsMap]);

  // Calculate score and predikat from checkboxes
  const computeSikapFromChecklist = (muridId: string) => {
    const c = sikapChecklistData[muridId];
    if (!c) {
      return {
        integritas: 4,
        disiplin: 4,
        kerjaSama: 4,
        sportivitas: 4,
        tanggungJawab: 4,
        rataRata: 4.0,
        predikat: 'Sangat Baik' as const,
      };
    }

    if (c.customPredikat) {
      const val =
        c.customPredikat === 'Sangat Baik' ? 4 :
        c.customPredikat === 'Baik' ? 3 :
        c.customPredikat === 'Cukup' ? 2 : 1;

      return {
        integritas: c.integritas ? val : Math.max(1, val - 1),
        disiplin: c.disiplin ? val : Math.max(1, val - 1),
        kerjaSama: c.kerjaSama ? val : Math.max(1, val - 1),
        sportivitas: c.sportivitas ? val : Math.max(1, val - 1),
        tanggungJawab: c.tanggungJawab ? val : Math.max(1, val - 1),
        rataRata: val,
        predikat: c.customPredikat,
      };
    }

    const sIntegritas = c.integritas ? 4 : 2;
    const sDisiplin = c.disiplin ? 4 : 2;
    const sKerjaSama = c.kerjaSama ? 4 : 2;
    const sSportivitas = c.sportivitas ? 4 : 2;
    const sTanggungJawab = c.tanggungJawab ? 4 : 2;

    const avg = (sIntegritas + sDisiplin + sKerjaSama + sSportivitas + sTanggungJawab) / 5;
    const predikat = calculatePredikat(avg);

    return {
      integritas: sIntegritas,
      disiplin: sDisiplin,
      kerjaSama: sKerjaSama,
      sportivitas: sSportivitas,
      tanggungJawab: sTanggungJawab,
      rataRata: Number(avg.toFixed(2)),
      predikat,
    };
  };

  const handleToggleAspect = (
    muridId: string,
    aspect: 'integritas' | 'disiplin' | 'kerjaSama' | 'sportivitas' | 'tanggungJawab'
  ) => {
    setSikapChecklistData((prev) => {
      const current = prev[muridId] || {
        integritas: true,
        disiplin: true,
        kerjaSama: true,
        sportivitas: true,
        tanggungJawab: true,
        catatan: '',
      };
      return {
        ...prev,
        [muridId]: {
          ...current,
          [aspect]: !current[aspect],
          customPredikat: undefined,
        },
      };
    });
  };

  const handleSetPredikatQuick = (
    muridId: string,
    predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan'
  ) => {
    setSikapChecklistData((prev) => {
      const current = prev[muridId] || {
        integritas: true,
        disiplin: true,
        kerjaSama: true,
        sportivitas: true,
        tanggungJawab: true,
        catatan: '',
      };
      const isSame = current.customPredikat === predikat;
      return {
        ...prev,
        [muridId]: {
          ...current,
          customPredikat: isSame ? undefined : predikat,
          integritas: predikat === 'Sangat Baik' || predikat === 'Baik',
          disiplin: predikat === 'Sangat Baik' || predikat === 'Baik',
          kerjaSama: predikat !== 'Perlu Bimbingan',
          sportivitas: predikat !== 'Perlu Bimbingan',
          tanggungJawab: predikat === 'Sangat Baik',
        },
      };
    });
  };

  const handleSetCatatanChecklist = (muridId: string, note: string) => {
    setSikapChecklistData((prev) => {
      const current = prev[muridId] || {
        integritas: true,
        disiplin: true,
        kerjaSama: true,
        sportivitas: true,
        tanggungJawab: true,
        catatan: '',
      };
      return {
        ...prev,
        [muridId]: {
          ...current,
          catatan: note,
        },
      };
    });
  };

  const handleBatchChecklistSemuaSB = () => {
    setSikapChecklistData((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        next[s.id] = {
          integritas: true,
          disiplin: true,
          kerjaSama: true,
          sportivitas: true,
          tanggungJawab: true,
          customPredikat: 'Sangat Baik',
          catatan: next[s.id]?.catatan || '',
        };
      });
      return next;
    });
    setToastMessage(`Semua murid dicentang Sangat Baik [✓]`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleBatchChecklistSemuaBaik = () => {
    setSikapChecklistData((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        next[s.id] = {
          integritas: true,
          disiplin: true,
          kerjaSama: true,
          sportivitas: true,
          tanggungJawab: false,
          customPredikat: 'Baik',
          catatan: next[s.id]?.catatan || '',
        };
      });
      return next;
    });
    setToastMessage(`Semua murid dicentang Baik [✓]`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleBatchChecklist5Dimensi = () => {
    setSikapChecklistData((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        next[s.id] = {
          integritas: true,
          disiplin: true,
          kerjaSama: true,
          sportivitas: true,
          tanggungJawab: true,
          customPredikat: undefined,
          catatan: next[s.id]?.catatan || '',
        };
      });
      return next;
    });
    setToastMessage(`Semua 5 dimensi sikap positif dicentang untuk seluruh murid [✓]`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSaveSingleSikapChecklist = (muridId: string) => {
    const murid = studentsInClass.find((s) => s.id === muridId);
    if (!murid) return;
    const computed = computeSikapFromChecklist(muridId);
    const c = sikapChecklistData[muridId];
    const existing = assessmentsMap.get(muridId);

    const newAssessment: PenilaianSikap = {
      id: existing?.id || `sikap-${Date.now()}-${murid.id}`,
      muridId: murid.id,
      muridNama: murid.name,
      nis: murid.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      semester: '1 (Ganjil)',
      tahunAjaran: '2025/2026',
      integritas: computed.integritas,
      disiplin: computed.disiplin,
      kerjaSama: computed.kerjaSama,
      sportivitas: computed.sportivitas,
      tanggungJawab: computed.tanggungJawab,
      rataRata: computed.rataRata,
      predikat: computed.predikat,
      catatanGuru:
        c?.catatan?.trim() ||
        existing?.catatanGuru ||
        `${murid.name} menunjukkan perilaku dan sikap yang ${computed.predikat.toLowerCase()} dalam aktivitas PJOK.`,
      guruId: currentUser.id,
      guruNama: currentUser.name,
      statusPublikasi: 'Publish',
      updatedAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const prevList = prev.penilaianSikap || [];
      const remaining = prevList.filter((s) => s.muridId !== murid.id);
      return {
        ...prev,
        penilaianSikap: [...remaining, newAssessment],
      };
    });

    setToastMessage(`Tersimpan: Sikap ${murid.name} (${computed.predikat})`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSaveAllSikapChecklist = () => {
    if (studentsInClass.length === 0) return;

    const newRecords: PenilaianSikap[] = studentsInClass.map((murid) => {
      const computed = computeSikapFromChecklist(murid.id);
      const c = sikapChecklistData[murid.id];
      const existing = assessmentsMap.get(murid.id);

      return {
        id: existing?.id || `sikap-${Date.now()}-${murid.id}`,
        muridId: murid.id,
        muridNama: murid.name,
        nis: murid.nis,
        kelasId: selectedKelasId,
        kelasNama: currentKelas?.nama || selectedKelasId,
        tanggal: new Date().toISOString().slice(0, 10),
        semester: '1 (Ganjil)',
        tahunAjaran: '2025/2026',
        integritas: computed.integritas,
        disiplin: computed.disiplin,
        kerjaSama: computed.kerjaSama,
        sportivitas: computed.sportivitas,
        tanggungJawab: computed.tanggungJawab,
        rataRata: computed.rataRata,
        predikat: computed.predikat,
        catatanGuru:
          c?.catatan?.trim() ||
          existing?.catatanGuru ||
          `${murid.name} menunjukkan sikap yang ${computed.predikat.toLowerCase()} dalam pembelajaran PJOK.`,
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
        penilaianSikap: [...remaining, ...newRecords],
      };
    });

    setToastMessage(`Berhasil menyimpan penilaian sikap ${studentsInClass.length} murid!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Sudah">Sudah Dinilai</option>
                  <option value="Belum">Belum Dinilai</option>
                </select>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Centang Cepat:</span>
                  <button
                    type="button"
                    onClick={handleBatchChecklistSemuaSB}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200 flex items-center gap-1"
                    title="Centang semua murid dengan predikat Sangat Baik (SB)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Semua Sangat Baik</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchChecklistSemuaBaik}
                    className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-sky-200 flex items-center gap-1"
                    title="Centang semua murid dengan predikat Baik (B)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Semua Baik</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchChecklist5Dimensi}
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-purple-200 flex items-center gap-1"
                    title="Centang 5 dimensi sikap positif untuk seluruh murid"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Centang 5 Dimensi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllSikapChecklist}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                    title="Simpan semua data centang sikap murid di kelas ini"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Langsung Simpan Semua</span>
                  </button>
                </div>
              </div>
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
          {/* Header Bar */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Mode Centang Cepat Sikap Murid ({filteredStudents.length} Murid Kelas {currentKelas?.nama})
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Tinggal centang dimensi sikap (Fair Play, Disiplin, Gotong Royong, Sportif, T. Jawab) atau centang predikat (SB, B, C, PB), langsung klik Simpan!
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold shrink-0 flex-wrap">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">SB: Sangat Baik</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">B: Baik</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">C: Cukup</span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">PB: Perlu Bimbingan</span>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-sm">Tidak ada murid ditemukan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((murid, idx) => {
                const chk = sikapChecklistData[murid.id] || {
                  integritas: true,
                  disiplin: true,
                  kerjaSama: true,
                  sportivitas: true,
                  tanggungJawab: true,
                  customPredikat: 'Sangat Baik',
                  catatan: '',
                };
                const computed = computeSikapFromChecklist(murid.id);
                const assessment = assessmentsMap.get(murid.id);

                return (
                  <div
                    key={murid.id}
                    className="p-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Left: Identity & Predikat Badge */}
                    <div className="flex items-center gap-3 min-w-0 min-w-[200px] flex-1">
                      <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                        {murid.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">{murid.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                              SKOR_SIKAP_LABEL[Math.round(computed.rataRata || 4)]?.badge ||
                              'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {computed.predikat} ({computed.rataRata.toFixed(1)})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          NIS: <strong className="text-slate-600 font-semibold">{murid.nis || '-'}</strong>
                          {assessment && (
                            <span className="text-emerald-600 font-semibold ml-2">
                              • Tersimpan ({assessment.tanggal})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Kotak Centang 5 Dimensi Sikap PJOK */}
                    <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all bg-white hover:bg-slate-50 text-[11px] font-bold select-none">
                        <input
                          type="checkbox"
                          checked={chk.integritas}
                          onChange={() => handleToggleAspect(murid.id, 'integritas')}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={chk.integritas ? 'text-emerald-800' : 'text-slate-400'}>
                          Fair Play
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all bg-white hover:bg-slate-50 text-[11px] font-bold select-none">
                        <input
                          type="checkbox"
                          checked={chk.disiplin}
                          onChange={() => handleToggleAspect(murid.id, 'disiplin')}
                          className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span className={chk.disiplin ? 'text-sky-800' : 'text-slate-400'}>
                          Disiplin
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all bg-white hover:bg-slate-50 text-[11px] font-bold select-none">
                        <input
                          type="checkbox"
                          checked={chk.kerjaSama}
                          onChange={() => handleToggleAspect(murid.id, 'kerjaSama')}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={chk.kerjaSama ? 'text-indigo-800' : 'text-slate-400'}>
                          Kerja Sama
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all bg-white hover:bg-slate-50 text-[11px] font-bold select-none">
                        <input
                          type="checkbox"
                          checked={chk.sportivitas}
                          onChange={() => handleToggleAspect(murid.id, 'sportivitas')}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className={chk.sportivitas ? 'text-amber-800' : 'text-slate-400'}>
                          Sportivitas
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all bg-white hover:bg-slate-50 text-[11px] font-bold select-none">
                        <input
                          type="checkbox"
                          checked={chk.tanggungJawab}
                          onChange={() => handleToggleAspect(murid.id, 'tanggungJawab')}
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className={chk.tanggungJawab ? 'text-teal-800' : 'text-slate-400'}>
                          T. Jawab
                        </span>
                      </label>

                      {/* Kotak Centang Predikat Cepat */}
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                        {(['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'] as const).map((p) => {
                          const isSelected = computed.predikat === p;
                          const labelShort =
                            p === 'Sangat Baik'
                              ? 'SB'
                              : p === 'Baik'
                              ? 'B'
                              : p === 'Cukup'
                              ? 'C'
                              : 'PB';
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleSetPredikatQuick(murid.id, p)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer border transition-all ${
                                isSelected
                                  ? p === 'Sangat Baik'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                    : p === 'Baik'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                    : p === 'Cukup'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                    : 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={`Centang predikat ${p}`}
                            >
                              {isSelected ? '✓ ' : ''}
                              {labelShort}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Note & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="text"
                        placeholder="Catatan sikap..."
                        value={chk.catatan || ''}
                        onChange={(e) => handleSetCatatanChecklist(murid.id, e.target.value)}
                        className="w-full sm:w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-hidden"
                      />

                      <button
                        type="button"
                        onClick={() => handleSaveSingleSikapChecklist(murid.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                        title="Langsung simpan nilai sikap murid ini"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(murid)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Form rubrik skala angka lengkap"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Detail</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Save Bar */}
          {filteredStudents.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Semua centang sikap murid siap disimpan ke sistem rapor & evaluasi karakter PJOK.
              </span>
              <button
                type="button"
                onClick={handleSaveAllSikapChecklist}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Penilaian Sikap ({filteredStudents.length} Murid)</span>
              </button>
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
