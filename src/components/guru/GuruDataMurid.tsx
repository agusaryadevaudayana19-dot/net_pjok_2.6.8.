import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  School,
  Award,
  CalendarCheck,
  User,
  X,
  Activity,
  CheckCircle2,
  Upload,
  Layers,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import { User as UserType, getTeacherAssignedClasses, resolveKelasId } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { UploadDataModal } from '../shared/UploadDataModal';
import { TrashBinModal } from '../admin/TrashBinModal';

interface GuruDataMuridProps {
  db: LMSDatabase;
  currentUser?: UserType;
  onNavigatePraktik: (muridId: string) => void;
}

export const GuruDataMurid: React.FC<GuruDataMuridProps> = ({ db, currentUser, onNavigatePraktik }) => {
  const assignedClasses = useMemo(() => {
    return getTeacherAssignedClasses(currentUser, db.kelas);
  }, [currentUser, db.kelas]);

  const visibleClasses = useMemo(() => {
    if (currentUser?.role === 'GURU') {
      return assignedClasses.length > 0 ? assignedClasses : db.kelas;
    }
    return db.kelas;
  }, [currentUser, assignedClasses, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    return visibleClasses.length > 0 ? visibleClasses[0].id : (db.kelas[0]?.id || '');
  });

  // Keep selectedKelasId valid if visible classes change
  React.useEffect(() => {
    if (visibleClasses.length > 0 && !visibleClasses.some((k) => k.id === selectedKelasId)) {
      setSelectedKelasId(visibleClasses[0].id);
    }
  }, [visibleClasses, selectedKelasId]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMuridDetail, setActiveMuridDetail] = useState<UserType | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [muridToDelete, setMuridToDelete] = useState<UserType | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [selectedMuridIds, setSelectedMuridIds] = useState<string[]>([]);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);

  const trashMuridCount = useMemo(() => {
    return (db.trashUsers || []).filter((t) => t.role === 'MURID').length;
  }, [db.trashUsers]);

  const selectedKelasObj = (db.kelas || []).find((k) => k.id === selectedKelasId);

  const muridInKelas = db.users.filter((u) => {
    if (u.role !== 'MURID') return false;
    if (selectedKelasId === 'all') {
      const visibleClassIds = visibleClasses.map((k) => k.id.toLowerCase().trim());
      const visibleClassNames = visibleClasses.map((k) => k.nama.toLowerCase().trim());
      const uKelas = (u.kelasId || '').toLowerCase().trim();
      return visibleClassIds.includes(uKelas) || visibleClassNames.includes(uKelas);
    }
    const uKelas = (u.kelasId || '').toLowerCase().trim();
    const selId = (selectedKelasId || '').toLowerCase().trim();
    const selNama = (selectedKelasObj?.nama || '').toLowerCase().trim();
    return uKelas === selId || (selNama && uKelas === selNama);
  });

  const filteredMurid = muridInKelas.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.nis && m.nis.includes(searchQuery))
  );

  // Student details data
  const getMuridScore = (muridId: string) => {
    return (db.nilai || []).find((n) => n.muridId === muridId);
  };

  const getMuridAttendance = (muridId: string) => {
    const list = db.presensi.filter((p) => p.muridId === muridId);
    const hadir = list.filter((p) => p.status === 'H').length;
    const total = list.length || 1;
    return {
      total: list.length,
      hadir,
      persen: Math.round((hadir / total) * 100),
      list,
    };
  };

  const handleImportMurid = (imported: any[]) => {
    if (!imported || imported.length === 0) return;
    const fallbackKelasId = (selectedKelasId !== 'all' ? selectedKelasId : visibleClasses[0]?.id) || db.kelas[0]?.id || '';
    
    const newUsers: UserType[] = imported.map((row, idx) => {
      const resolved = resolveKelasId(row.kelasId || row.kelas, db.kelas, fallbackKelasId);
      return {
        id: row.id || `usr-imp-${Date.now()}-${idx}`,
        username: row.username || (row.nis ? `murid_${row.nis}` : `murid_${Date.now()}_${idx}`),
        name: row.name || row.nama || `Murid Baru ${idx + 1}`,
        role: 'MURID',
        nis: row.nis || '',
        nisn: row.nisn || '',
        kelasId: resolved.id,
        jenisKelamin: (row.jenisKelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
        status: 'Aktif',
        tahunPelajaran: db.settings?.tahunPelajaran || '2026/2027',
      };
    });

    dataStorage.importMuridBatch(newUsers, currentUser?.name || 'Guru PJOK');
    setIsUploadModalOpen(false);
    setDeleteToast(`Berhasil mengimpor ${newUsers.length} data murid tanpa duplikasi nama.`);
    setTimeout(() => setDeleteToast(null), 4000);
  };

  const confirmDeleteMurid = () => {
    if (!muridToDelete) return;
    dataStorage.deleteUser(muridToDelete.id);
    setDeleteToast(`Data murid ${muridToDelete.name} (NIS: ${muridToDelete.nis || '-'}) berhasil dihapus.`);
    if (activeMuridDetail?.id === muridToDelete.id) {
      setActiveMuridDetail(null);
    }
    setMuridToDelete(null);
    setTimeout(() => setDeleteToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {deleteToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteToast(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Data Murid PJOK Fase F
            </h2>
            {assignedClasses.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {assignedClasses.length} Kelas Diampu
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser?.name ? `Guru Pengampu: ${currentUser.name} • ` : ''}
            Daftar lengkap murid, riwayat capaian nilai praktik, dan statistik presensi
          </p>
        </div>

        {/* Class switcher buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full bg-slate-100/70 p-1 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setSelectedKelasId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedKelasId === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>Semua Rombel Kelas</span>
            </button>
            {visibleClasses.map((k) => {
              const isSelected = selectedKelasId === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() => setSelectedKelasId(k.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>Kelas {k.nama}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search and class info banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-black text-sm border border-sky-100">
            {selectedKelasId === 'all' ? 'ALL' : selectedKelasObj?.nama}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800">
              {selectedKelasId === 'all'
                ? 'Daftar Murid Semua Rombel Kelas'
                : `Daftar Murid Kelas ${selectedKelasObj?.nama}`}
            </h3>
            <p className="text-xs text-slate-400">
              {selectedKelasId === 'all'
                ? `Cakupan: ${visibleClasses.map((k) => k.nama).join(', ')} • Total: ${filteredMurid.length} Murid`
                : `Wali Kelas: ${selectedKelasObj?.waliKelasNama || '-'} • Total: ${filteredMurid.length} Murid`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari murid atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedMuridIds.length === filteredMurid.length && filteredMurid.length > 0) {
                setSelectedMuridIds([]);
              } else {
                setSelectedMuridIds(filteredMurid.map((m) => m.id));
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Pilih semua murid di rombel ini"
          >
            {selectedMuridIds.length === filteredMurid.length && filteredMurid.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Pilih Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Buka Bak Sampah Murid"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Bak Sampah ({trashMuridCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Murid</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Bar */}
      {selectedMuridIds.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-rose-600 text-white text-xs font-black flex items-center justify-center">
              {selectedMuridIds.length}
            </span>
            <span className="text-xs font-bold text-rose-900">
              {selectedMuridIds.length} murid telah dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMuridIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedMuridIds.length}) Murid ke Bak Sampah</span>
            </button>
          </div>
        </div>
      )}

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMurid.map((murid) => {
          const score = getMuridScore(murid.id);
          const att = getMuridAttendance(murid.id);
          const isSelected = selectedMuridIds.includes(murid.id);

          return (
            <div
              key={murid.id}
              className={`bg-white rounded-2xl p-4 border transition-all space-y-3 flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/20'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMuridIds((prev) =>
                        prev.includes(murid.id)
                          ? prev.filter((id) => id !== murid.id)
                          : [...prev, murid.id]
                      );
                    }}
                    className="p-1 -ml-1 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                    title={isSelected ? 'Batalkan pilihan' : 'Pilih murid'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>

                  <img
                    src={
                      murid.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                    }
                    alt={murid.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-slate-800 truncate">{murid.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      NIS: {murid.nis} • {murid.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>
                </div>

                {/* Score & Attendance Mini Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Nilai Praktik
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {score?.praktik || 88}
                    </span>
                  </div>

                  <div className="p-2 bg-sky-50/60 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">
                      Kehadiran
                    </span>
                    <span className="text-base font-black text-sky-700">
                      {att.persen || 100}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveMuridDetail(murid)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold"
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => setMuridToDelete(murid)}
                    title={`Hapus data ${murid.name}`}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => onNavigatePraktik(murid.id)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Activity className="w-3.5 h-3.5" /> Nilai Praktik
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Profile Detail Modal */}
      {activeMuridDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setActiveMuridDetail(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <img
                src={activeMuridDetail.avatar}
                alt={activeMuridDetail.name}
                className="w-16 h-16 rounded-full object-cover mx-auto ring-4 ring-emerald-500/20 shadow-md"
              />
              <h3 className="text-base font-extrabold text-slate-800">{activeMuridDetail.name}</h3>
              <p className="text-xs text-slate-400 font-mono">
                NIS: {activeMuridDetail.nis} • NISN: {activeMuridDetail.nisn || '-'}
              </p>
              <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
                Kelas {selectedKelasObj?.nama} • TP {activeMuridDetail.tahunPelajaran}
              </span>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Akun:</span>
                <span className="font-bold text-emerald-700">{activeMuridDetail.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="font-semibold text-slate-800">
                  {activeMuridDetail.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email Akun:</span>
                <span className="font-mono text-slate-600">{activeMuridDetail.email}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Ringkasan Nilai Akhir PJOK
              </span>
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Tugas</span>
                  <span className="font-black text-slate-800">
                    {getMuridScore(activeMuridDetail.id)?.tugas || 85}
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Quiz</span>
                  <span className="font-black text-slate-800">
                    {getMuridScore(activeMuridDetail.id)?.quiz || 80}
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Praktik</span>
                  <span className="font-black text-emerald-700">
                    {getMuridScore(activeMuridDetail.id)?.praktik || 88}
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Akhir</span>
                  <span className="font-black text-sky-700">
                    {getMuridScore(activeMuridDetail.id)?.nilaiAkhir || 86}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMuridToDelete(activeMuridDetail)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Murid Ini
              </button>
              <button
                onClick={() => setActiveMuridDetail(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {muridToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Hapus Data Murid?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda akan menghapus <strong className="text-slate-700">{muridToDelete.name}</strong>{' '}
                (NIS: {muridToDelete.nis || '-'}). Tindakan ini akan menghapus akun murid, seluruh riwayat presensi, dan nilai terkait. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMuridToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteMurid}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Murid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Pindahkan {selectedMuridIds.length} Murid ke Bak Sampah?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sebanyak {selectedMuridIds.length} murid yang Anda pilih akan dipindahkan ke Bak Sampah. Data ini aman dan dapat dipulihkan sewaktu-waktu dari Bak Sampah.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const count = selectedMuridIds.length;
                  dataStorage.moveToTrash(selectedMuridIds, currentUser?.name || 'Guru');
                  setSelectedMuridIds([]);
                  setIsBulkDeleteOpen(false);
                  setDeleteToast(`${count} murid berhasil dipindahkan ke Bak Sampah.`);
                  setTimeout(() => setDeleteToast(null), 4000);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Pindahkan ke Bak Sampah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Bin Modal */}
      <TrashBinModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        db={db}
        defaultRoleFilter="MURID"
      />

      {/* Upload Data Murid Modal */}
      <UploadDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        type="murid"
        onImport={handleImportMurid}
        allKelas={visibleClasses}
        defaultKelasId={selectedKelasId !== 'all' ? selectedKelasId : visibleClasses[0]?.id}
      />
    </div>
  );
};
