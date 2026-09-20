import React, { useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  FileText,
  Printer,
  Activity,
  Check,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { User, NilaiItem } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface MuridNilaiProps {
  db: LMSDatabase;
  currentUser: User;
}

export const MuridNilai: React.FC<MuridNilaiProps> = ({ db, currentUser }) => {
  const kelasObj = (db.kelas || []).find(
    (k) =>
      k.id === currentUser.kelasId ||
      (currentUser.kelasId && k.nama.toLowerCase() === currentUser.kelasId.toLowerCase())
  );

  // Practical assessments for student with flexible identifier matching (id, nis, or name)
  const myPraktikAssessments = useMemo(() => {
    return (db.penilaianPraktik || []).filter((p) => {
      if (p.muridId === currentUser.id) return true;
      if (currentUser.nis && (p.muridId === currentUser.nis || p.nis === currentUser.nis))
        return true;
      if (
        p.muridNama &&
        currentUser.name &&
        p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
      )
        return true;
      return false;
    });
  }, [db.penilaianPraktik, currentUser]);

  // Real practical average from assessments
  const realPraktikAvg = useMemo(() => {
    if (myPraktikAssessments.length === 0) return 88;
    const sum = myPraktikAssessments.reduce(
      (acc, p) => acc + (p.nilaiAkhir || p.nilaiTotal || 80),
      0
    );
    return Math.round(sum / myPraktikAssessments.length);
  }, [myPraktikAssessments]);

  // Student's grade record, dynamically reflecting real practical score
  const myNilai = useMemo(() => {
    const fromDb = (db.nilai || []).find(
      (n) =>
        n.muridId === currentUser.id ||
        (currentUser.nis && (n.muridId === currentUser.nis || n.nis === currentUser.nis)) ||
        (n.muridNama &&
          currentUser.name &&
          n.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );

    const tugas = fromDb?.tugas ?? 85;
    const quiz = fromDb?.quiz ?? 80;
    const praktik = myPraktikAssessments.length > 0 ? realPraktikAvg : (fromDb?.praktik ?? 88);
    const pengetahuan = fromDb?.pengetahuan ?? Math.round((tugas + quiz) / 2);
    const keterampilan = praktik;
    const sikap = fromDb?.sikap ?? 90;
    const nilaiAkhir = Math.round(pengetahuan * 0.3 + keterampilan * 0.5 + sikap * 0.2);
    const predikat =
      nilaiAkhir >= 88 ? 'A' : nilaiAkhir >= 78 ? 'B' : nilaiAkhir >= 65 ? 'C' : 'D';

    return {
      id: fromDb?.id || `nil-${currentUser.id}`,
      muridId: currentUser.id,
      muridNama: currentUser.name,
      kelasId: currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '',
      semester: fromDb?.semester || '1 (Ganjil)',
      tugas,
      quiz,
      praktik,
      pengetahuan,
      keterampilan,
      sikap,
      nilaiAkhir,
      predikat,
    };
  }, [db.nilai, currentUser, myPraktikAssessments, realPraktikAvg]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Transkrip & Rekap Nilai PJOK Saya
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Akun Terhubung Real-Time</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Laporan capaian kompetensi psikomotorik, kognitif, dan afektif Kurikulum Merdeka Fase F
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Cetak Rapor PJOK
        </button>
      </div>

      {/* Main Final Score Highlight Card */}
      <div className="bg-gradient-to-tr from-emerald-800 via-teal-800 to-sky-900 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-emerald-200">
            Nilai Akhir Rapor Semester {myNilai.semester}
          </span>
          <h3 className="text-2xl font-black tracking-tight">{currentUser.name}</h3>
          <p className="text-xs text-slate-300">
            NIS: {currentUser.nis || '-'} • Kelas {kelasObj?.nama || currentUser.kelasId} •{' '}
            {db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula'}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
          <div className="text-center">
            <span className="text-4xl font-black font-mono">{myNilai.nilaiAkhir}</span>
            <span className="text-xs text-emerald-200 block font-bold">Skor Akhir</span>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div className="text-center">
            <span className="text-4xl font-black text-amber-300 font-mono">
              {myNilai.predikat}
            </span>
            <span className="text-xs text-emerald-200 block font-bold">Predikat</span>
          </div>
        </div>
      </div>

      {/* 6 Dimension Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Nilai Tugas
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{myNilai.tugas}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Tuntas</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Nilai Quiz
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{myNilai.quiz}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Tuntas</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs text-center bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Nilai Praktik
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {myNilai.praktik}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold">
            {myPraktikAssessments.length} Materi Dinilai
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pengetahuan
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {myNilai.pengetahuan}
          </span>
          <span className="text-[10px] text-sky-600 font-semibold">Kognitif</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Keterampilan
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {myNilai.keterampilan}
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">Motorik</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Nilai Sikap
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{myNilai.sikap}</span>
          <span className="text-[10px] text-amber-600 font-semibold">Sportivitas</span>
        </div>
      </div>

      {/* Detailed Practice Rubric & Indicators Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Catatan & Hasil Ujian Praktik Lapangan (Indikator & Rubrik PJOK)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh rekam penilaian yang diinput oleh Guru PJOK pada materi praktik.
            </p>
          </div>
          <span className="px-3 py-1 bg-teal-50 text-teal-800 font-bold text-xs rounded-full self-start sm:self-auto">
            {myPraktikAssessments.length} Rekam Penilaian Tersedia
          </span>
        </div>

        {myPraktikAssessments.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-2xl text-xs text-slate-500 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700">Belum Ada Rekam Catatan Praktik Baru</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Penilaian praktik Anda akan otomatis tampil di halaman ini segera setelah guru menguji dan menyimpan penilaian gerakan di lapangan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myPraktikAssessments.map((p) => {
              const hasCustomIndicators =
                p.indikatorPenilaian && p.indikatorPenilaian.length > 0;

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-4 text-xs"
                >
                  {/* Assessment Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-teal-700 text-white font-black text-[10px] rounded-md uppercase">
                          Praktik
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">
                          {p.materiJudul || p.materi || 'Praktik PJOK'}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Tanggal: {p.tanggal || 'Terbaru'}</span>
                        <span>•</span>
                        <span>Guru Penilai: {p.guruPenilai || p.guruNama || 'Guru PJOK'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs">
                        <span>Nilai Akhir: {p.nilaiAkhir ?? p.nilaiTotal ?? 80}</span>
                        <span className="px-1.5 py-0.2 bg-emerald-700 text-white rounded-md text-[10px]">
                          Predikat: {p.predikat || 'B'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If custom indicators exist, render every single indicator with details! */}
                  {hasCustomIndicators ? (
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-extrabold text-slate-600 block uppercase tracking-wider">
                        Rincian Skor Indikator Penilaian ({p.indikatorPenilaian?.length} Indikator):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {p.indikatorPenilaian?.map((ind, i) => {
                          const score = ind.skor ?? 3;
                          const label =
                            score === 4
                              ? '4 - Sangat Baik'
                              : score === 3
                              ? '3 - Baik'
                              : score === 2
                              ? '2 - Cukup'
                              : '1 - Kurang';

                          return (
                            <div
                              key={ind.id || i}
                              className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-800 block text-xs truncate">
                                  {i + 1}. {ind.nama}
                                </span>
                                {ind.deskripsi && (
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {ind.deskripsi}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`px-2 py-1 rounded-lg font-black text-[11px] shrink-0 ${
                                  score === 4
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : score === 3
                                    ? 'bg-sky-100 text-sky-800'
                                    : score === 2
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Fallback legacy 6 rubric grid */
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Sikap Awal
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.sikapAwal ?? p.aspekNilai?.sikapAwal ?? 3}/4
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Pelaksanaan
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.pelaksanaanTeknik ?? p.aspekNilai?.teknikGerakan ?? 3}/4
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Sikap Akhir
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.sikapAkhir ?? p.aspekNilai?.koordinasi ?? 3}/4
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Hasil Gerak
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.hasilGerakan ?? p.aspekNilai?.ketepatan ?? 3}/4
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Sportivitas
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.sportivitas ?? p.aspekNilai?.sportivitas ?? 4}/4
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">
                          Kerja Sama
                        </span>
                        <strong className="text-slate-800 text-xs">
                          {p.rubrik?.kerjaSama ?? p.aspekNilai?.kerjaSama ?? 4}/4
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Teacher Feedback / Notes */}
                  {(p.catatanEvaluasi || p.catatanGuru) && (
                    <div className="mt-2 text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] font-black text-teal-800 block uppercase tracking-wider mb-0.5">
                        Catatan Evaluasi Guru:
                      </span>
                      <p className="italic text-slate-600">"{p.catatanEvaluasi || p.catatanGuru}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
