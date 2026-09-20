import React from 'react';
import {
  BookOpen,
  ClipboardList,
  CheckCircle,
  Award,
  Calendar,
  Bell,
  ArrowUpRight,
  Sparkles,
  Play,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { LMSDatabase } from '../../services/dataStorage';
import { User } from '../../types';

interface MuridDashboardProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigate: (menuId: string, param?: string) => void;
}

export const MuridDashboard: React.FC<MuridDashboardProps> = ({ db, currentUser, onNavigate }) => {
  const myKelasId = currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '';
  const kelasObj = (db.kelas || []).find((k) => k.id === myKelasId);

  // Filter student's materials
  const materiAktif = (db.materi || []).filter((m) => m.status === 'Publish');
  const tugasList = (db.tugas || []).filter((t) => {
    if (t.status !== 'Publish' && t.status !== 'Aktif' && t.statusPublikasi !== 'Publish') return false;
    if (t.kelasIds && t.kelasIds.length > 0) {
      return t.kelasIds.includes(myKelasId);
    }
    if (t.kelasId) {
      return t.kelasId === myKelasId;
    }
    return true;
  });
  const pengumpulanSaya = (db.pengumpulanTugas || []).filter((p) => p.muridId === currentUser.id);

  // Filter relevant announcements for student
  const relevantPengumuman = (db.pengumuman || []).filter((p) => {
    if (!p.targetKelas || p.targetKelas === 'SEMUA') return true;
    return p.targetKelas === myKelasId;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Unfinished tasks with deadline calculation
  const now = new Date();
  const tugasWithMeta = tugasList.map((t) => {
    const deadlineDate = new Date(t.deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = diffTime < 0;
    const isUrgent = !isOverdue && diffDays <= 3;
    const isSubmitted = pengumpulanSaya.some((p) => p.tugasId === t.id);

    return {
      ...t,
      deadlineDate,
      diffDays,
      isOverdue,
      isUrgent,
      isSubmitted,
    };
  });

  const tugasBelum = tugasWithMeta.filter((t) => !t.isSubmitted);
  const tugasMendekatiDeadline = tugasBelum
    .filter((t) => t.isOverdue || t.diffDays <= 5)
    .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime());
  const tugasBaru = tugasBelum.slice(0, 3);

  // Active quiz
  const quizAktif = db.quiz || [];

  // Active reflections from teachers
  const myRefleksiList = (db.refleksi || []).filter((r) => {
    if (r.status === 'Draft' || r.statusPublikasi === 'Draft') return false;
    const studentKelas = (currentUser.kelasId || '').toLowerCase().trim();
    const studentKelasObj = (db.kelas || []).find((k) => k.id === currentUser.kelasId);
    const studentKelasNama = (studentKelasObj?.nama || '').toLowerCase().trim();
    const targetK = (r.kelasId || r.targetKelasId || 'ALL').toLowerCase().trim();
    if (targetK === 'all') return true;
    return targetK === studentKelas || (studentKelasNama && targetK === studentKelasNama);
  });
  const myAnsweredRefleksiIds = new Set(
    (db.jawabanRefleksi || [])
      .filter((j) => j.muridId === currentUser.id)
      .map((j) => j.refleksiId)
  );
  const refleksiBelumIsi = myRefleksiList.filter((r) => !myAnsweredRefleksiIds.has(r.id));

  // Student practical assessments
  const myPraktikAssessments = (db.penilaianPraktik || []).filter((p) => {
    if (p.muridId === currentUser.id) return true;
    if (currentUser.nis && (p.muridId === currentUser.nis || p.nis === currentUser.nis)) return true;
    if (
      p.muridNama &&
      currentUser.name &&
      p.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    )
      return true;
    return false;
  });

  const avgPraktik =
    myPraktikAssessments.length > 0
      ? Math.round(
          myPraktikAssessments.reduce(
            (acc, p) => acc + (p.nilaiAkhir || p.nilaiTotal || 80),
            0
          ) / myPraktikAssessments.length
        )
      : 88;

  // Student grades
  const foundNilai = (db.nilai || []).find(
    (n) =>
      n.muridId === currentUser.id ||
      (currentUser.nis && (n.muridId === currentUser.nis || n.nis === currentUser.nis)) ||
      (n.muridNama &&
        currentUser.name &&
        n.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
  );

  const tugas = foundNilai?.tugas ?? 85;
  const quiz = foundNilai?.quiz ?? 80;
  const praktik = myPraktikAssessments.length > 0 ? avgPraktik : (foundNilai?.praktik ?? 88);
  const pengetahuan = foundNilai?.pengetahuan ?? Math.round((tugas + quiz) / 2);
  const keterampilan = praktik;
  const sikap = foundNilai?.sikap ?? 90;
  const nilaiAkhir = Math.round(pengetahuan * 0.3 + keterampilan * 0.5 + sikap * 0.2);
  const predikat =
    nilaiAkhir >= 88 ? 'A' : nilaiAkhir >= 78 ? 'B' : nilaiAkhir >= 65 ? 'C' : 'D';

  const nilaiSaya = {
    tugas,
    quiz,
    praktik,
    pengetahuan,
    keterampilan,
    sikap,
    nilaiAkhir,
    predikat,
  };

  // Student attendance
  const presensiSaya = db.presensi.filter((p) => p.muridId === currentUser.id);
  const hadirCount = presensiSaya.filter((p) => p.status === 'H').length;
  const totalPresensi = presensiSaya.length || 1;
  const attendancePercent = Math.round((hadirCount / totalPresensi) * 100);
  const alpaRecords = presensiSaya.filter((p) => p.status === 'A');
  const alpaCount = alpaRecords.length;
  const alpaDates = alpaRecords.map((p) => p.tanggal).sort().reverse();

  // Evaluasi apakah catatan ketidakhadiran/pendampingan telah ditangani oleh guru
  const isAlpaHandledByTeacher = React.useMemo(() => {
    if (alpaCount === 0) return true;
    const myPendampingan = (db.pendampinganMurid || []).filter(
      (r) =>
        r.muridId === currentUser.id ||
        (currentUser.nis && r.nis === currentUser.nis) ||
        (r.muridNama && currentUser.name && r.muridNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
    if (myPendampingan.length === 0) return false;

    // Berkas yang sudah ditangani guru: status Selesai, atau sudah diisi tindakan penanganan atau catatan guru
    const isHandled = myPendampingan.some(
      (r) =>
        r.status === 'Selesai / Teratasi' ||
        r.status === 'Perlu Pemantauan Khusus' ||
        r.status === 'Dirujuk ke Guru BK' ||
        Boolean(r.tindakanPenanganan && r.tindakanPenanganan.trim().length > 0) ||
        Boolean(r.catatanGuru && r.catatanGuru.trim().length > 0)
    );

    return isHandled;
  }, [alpaCount, db.pendampinganMurid, currentUser]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-teal-800 to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-md text-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fase F • Kelas {kelasObj?.nama || 'XI 1'} • TP {db.settings?.tahunPelajaran || '2026/2027'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Semangat Pagi, {currentUser.name}!
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            Selamat datang di portal pembelajaran PJOK. Pelajari materi teknik olahraga, kumpulkan
            tugas video gerak tepat waktu, dan tingkatkan kebugaran jasmani Anda.
          </p>

          <div className="pt-3 flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('materi-saya')}
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Buka Materi PJOK
            </button>
            <button
              onClick={() => onNavigate('tugas-saya')}
              className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <ClipboardList className="w-4 h-4" />
              Lihat Tugas ({tugasBelum.length} Belum Kumpul)
            </button>
            <button
              onClick={() => onNavigate('refleksi-saya')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-900" />
              Isi Refleksi Belajar {refleksiBelumIsi.length > 0 && `(${refleksiBelumIsi.length} Baru)`}
            </button>
            <button
              onClick={() => onNavigate('presensi-saya')}
              className="px-4 py-2 bg-sky-500/80 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Ajukan Izin / Sakit
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFIKASI OTOMATIS KETIKA PRESENSI ALPA (Hilang jika sudah ditangani guru) */}
      {alpaCount > 0 && !isAlpaHandledByTeacher && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shrink-0 mt-0.5 animate-pulse shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-950">
                  ⚠️ Pemberitahuan Presensi Alpa Terdeteksi ({alpaCount} Pertemuan)
                </h3>
                <span className="px-2 py-0.5 bg-rose-200 text-rose-900 text-[10px] font-black rounded-full">
                  Wajib Klarifikasi
                </span>
              </div>
              <p className="text-xs text-rose-900 leading-relaxed">
                Kamu memiliki catatan ketidakhadiran tanpa keterangan (Alpa) sebanyak{' '}
                <strong>{alpaCount} kali</strong> pada tanggal:{' '}
                <span className="font-black text-rose-950 bg-white/90 px-2 py-0.5 rounded-md border border-rose-200">
                  {alpaDates.join(', ')}
                </span>
                .
              </p>
              <p className="text-[11px] text-rose-800">
                Silakan isi formulir konsultasi dan komitmen perubahan murid agar Guru PJOK dapat meninjau kendala kesehatan atau izin mendadakmu.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('pendampingan-murid-saya')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm hover:shadow-md cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <span>Buka Form Pendampingan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sistem Notifikasi Murid (Tugas Baru & Mendekati Tenggat Waktu) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  Pemberitahuan Tugas PJOK Murid
                </h3>
                {tugasBelum.length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                    {tugasBelum.length} Tugas Perlu Diselesaikan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Pantau penugasan baru dan batas waktu pengerjaan agar nilai tetap optimal
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('tugas-saya')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Buka Semua Tugas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {tugasBelum.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Semua Tugas PJOK Selesai Dikerjakan! 🎉</p>
              <p className="text-[11px] text-emerald-700">
                Kerja luar biasa! Anda tidak memiliki tugas yang menunggak saat ini. Pertahankan disiplin dan kebugaran jasmani Anda.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kolom 1: Tugas Mendekati Tenggat Waktu (Urgent / Deadline) */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Mendekati Batas Waktu (Tenggat Terdekat)</span>
              </div>

              {tugasMendekatiDeadline.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                  Tidak ada tugas dengan tenggat waktu mendesak minggu ini.
                </div>
              ) : (
                tugasMendekatiDeadline.map((t) => (
                  <div
                    key={`deadline-${t.id}`}
                    onClick={() => onNavigate('tugas-saya', t.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 hover:shadow-md ${
                      t.isOverdue
                        ? 'bg-rose-50/60 border-rose-200 text-rose-950 hover:bg-rose-50'
                        : t.isUrgent
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-50'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 bg-white/80 rounded-md text-[10px] font-bold border border-slate-200 text-slate-700">
                            {t.kategori}
                          </span>
                          {t.isOverdue ? (
                            <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-extrabold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Lewat Deadline
                            </span>
                          ) : t.diffDays <= 1 ? (
                            <span className="px-2 py-0.5 bg-rose-500 text-white rounded-md text-[10px] font-extrabold animate-pulse">
                              Deadline {t.diffDays === 0 ? 'Hari Ini!' : 'Besok!'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-extrabold">
                              {t.diffDays} Hari Lagi
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 line-clamp-1">
                          {t.judul}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {t.instruksi}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Batas: {new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="font-bold text-emerald-700 flex items-center gap-0.5 hover:underline">
                        Kumpulkan Sekarang →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Kolom 2: Tugas Baru Dirilis Guru */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <span>Daftar Tugas Baru PJOK</span>
              </div>

              {tugasBaru.map((t) => (
                <div
                  key={`baru-${t.id}`}
                  onClick={() => onNavigate('tugas-saya', t.id)}
                  className="p-3.5 rounded-2xl bg-sky-50/40 border border-sky-100 hover:border-sky-300 hover:bg-sky-50/80 transition-all cursor-pointer flex flex-col justify-between gap-2.5 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-bold">
                        {t.kategori}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                        Tugas Baru
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 line-clamp-1">
                      {t.judul}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {t.instruksi}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-sky-100/80 text-[10px]">
                    <span className="text-slate-500">
                      Batas: {new Date(t.deadline).toLocaleDateString('id-ID')}
                    </span>
                    <span className="font-bold text-sky-700 flex items-center gap-0.5">
                      Lihat Rincian →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tugas Pending */}
        <div
          onClick={() => onNavigate('tugas-saya')}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 hover:shadow-md transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white rounded-xl shadow-2xs">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 opacity-40" />
          </div>
          <div>
            <div className="text-2xl font-black">{tugasBelum.length} Tugas</div>
            <p className="text-xs font-bold mt-0.5">Tugas Menunggu</p>
            <p className="text-[10px] opacity-75">Kumpulkan video/laporan</p>
          </div>
        </div>

        {/* Quiz Aktif */}
        <div
          onClick={() => onNavigate('quiz-saya')}
          className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-purple-900 hover:shadow-md transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white rounded-xl shadow-2xs">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 opacity-40" />
          </div>
          <div>
            <div className="text-2xl font-black">{quizAktif.length} Quiz</div>
            <p className="text-xs font-bold mt-0.5">Quiz Asesmen</p>
            <p className="text-[10px] opacity-75">AKM & HOTS PJOK</p>
          </div>
        </div>

        {/* Nilai Akhir */}
        <div
          onClick={() => onNavigate('nilai-saya')}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 hover:shadow-md transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white rounded-xl shadow-2xs">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900">
              Predikat {nilaiSaya.predikat}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black">{nilaiSaya.nilaiAkhir}</div>
            <p className="text-xs font-bold mt-0.5">Nilai Rata-rata</p>
            <p className="text-[10px] opacity-75">Praktik: {nilaiSaya.praktik}</p>
          </div>
        </div>

        {/* Kehadiran */}
        <div
          onClick={() => onNavigate('presensi-saya')}
          className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 hover:shadow-md transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-white rounded-xl shadow-2xs">
              <Calendar className="w-5 h-5 text-sky-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 opacity-40" />
          </div>
          <div>
            <div className="text-2xl font-black">{attendancePercent}%</div>
            <p className="text-xs font-bold mt-0.5">Presensi Kehadiran</p>
            <p className="text-[10px] opacity-75">{hadirCount} Pertemuan Hadir</p>
          </div>
        </div>
      </div>

      {/* Two columns: Active Materials & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Materi Berjalan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Materi yang Sedang Dipelajari</h3>
              <p className="text-xs text-slate-400">Modul ajar kurikulum merdeka semester ini</p>
            </div>
            <button
              onClick={() => onNavigate('materi-saya')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Lihat Semua Materi →
            </button>
          </div>

          <div className="space-y-3">
            {materiAktif.slice(0, 3).map((m) => (
              <div
                key={m.id}
                onClick={() => onNavigate('materi-saya', m.id)}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform font-black text-xs">
                    PJOK
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      {m.kategori}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-800 truncate">{m.judul}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{m.deskripsi}</p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Pengumuman Guru & Sekolah */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">Pengumuman & Informasi</h3>
              {relevantPengumuman.length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                  {relevantPengumuman.length}
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate('pengumuman')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {relevantPengumuman.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-slate-400 text-xs">
                Belum ada pengumuman terbaru dari Guru atau Admin.
              </div>
            ) : (
              relevantPengumuman.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('pengumuman', item.id)}
                  className={`p-3 rounded-xl border space-y-1.5 cursor-pointer transition-all hover:shadow-xs ${
                    item.prioritas === 'PENTING'
                      ? 'bg-rose-50/70 border-rose-100 text-rose-950'
                      : item.kategori === 'TUGAS'
                      ? 'bg-sky-50/70 border-sky-100 text-sky-950'
                      : 'bg-amber-50/70 border-amber-100 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold block truncate text-xs">{item.judul}</span>
                    {item.prioritas === 'PENTING' && (
                      <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded shrink-0">
                        PENTING
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed line-clamp-2 text-slate-700">
                    {item.konten}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Oleh: {item.authorName || 'Guru PJOK'}</span>
                    <span>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
