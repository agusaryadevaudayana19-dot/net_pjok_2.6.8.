import React, { useState, useMemo } from 'react';
import {
  Calendar,
  FileText,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Phone,
  MessageCircle,
  Eye,
  User,
  AlertCircle,
  Sparkles,
  HeartPulse,
  Award,
  ChevronDown,
  X,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  User as UserType,
  UserRole,
  PengajuanIzin,
  StatusPengajuanIzin,
  KategoriIzin,
  PresensiRecord,
  NotifikasiItem,
} from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface PengajuanIzinManagerProps {
  db: LMSDatabase;
  role: UserRole;
  currentUser: UserType;
  selectedKelasId?: string;
  onSelectKelasId?: (kelasId: string) => void;
}

export const PengajuanIzinManager: React.FC<PengajuanIzinManagerProps> = ({
  db,
  role,
  currentUser,
  selectedKelasId,
  onSelectKelasId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusPengajuanIzin>('ALL');
  const [kategoriFilter, setKategoriFilter] = useState<'ALL' | KategoriIzin>('ALL');
  const [filterKelasId, setFilterKelasId] = useState<string>('ALL');

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Approve Modal
  const [approveModalItem, setApproveModalItem] = useState<PengajuanIzin | null>(null);
  const [approvalNote, setApprovalNote] = useState<string>('');

  // Reject Modal
  const [rejectModalItem, setRejectModalItem] = useState<PengajuanIzin | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Delete Modal
  const [deleteModalItem, setDeleteModalItem] = useState<PengajuanIzin | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const rawList: PengajuanIzin[] = Array.isArray(db.pengajuanIzin) ? db.pengajuanIzin : [];

  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      // Kelas filter
      if (filterKelasId !== 'ALL') {
        const itemKelas = (item.kelasId || '').toLowerCase().trim();
        const itemKelasNama = (item.kelasNama || '').toLowerCase().trim();
        const targetKelas = filterKelasId.toLowerCase().trim();
        const targetKelasObj = (db.kelas || []).find((k) => k.id === filterKelasId);
        const targetNama = (targetKelasObj?.nama || '').toLowerCase().trim();

        const match =
          itemKelas === targetKelas ||
          (targetNama && (itemKelas === targetNama || itemKelas.includes(targetNama))) ||
          (targetNama && (itemKelasNama === targetNama || itemKelasNama.includes(targetNama)));

        if (!match) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // Kategori filter
      if (kategoriFilter !== 'ALL' && item.kategori !== kategoriFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.muridNama.toLowerCase().includes(q);
        const matchNis = item.muridNis && item.muridNis.toLowerCase().includes(q);
        const matchOrtu = item.namaOrangTua && item.namaOrangTua.toLowerCase().includes(q);
        const matchAlasan = item.alasan.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchOrtu && !matchAlasan) {
          return false;
        }
      }

      return true;
    });
  }, [rawList, filterKelasId, statusFilter, kategoriFilter, searchQuery, db.kelas]);

  // Statistics
  const countTotal = rawList.length;
  const countMenunggu = rawList.filter((i) => i.status === 'Menunggu').length;
  const countDisetujui = rawList.filter((i) => i.status === 'Disetujui').length;
  const countDitolak = rawList.filter((i) => i.status === 'Ditolak').length;

  const getDatesInRange = (startDateStr: string, endDateStr?: string): string[] => {
    if (!endDateStr || endDateStr === startDateStr) {
      return [startDateStr];
    }
    const dates: string[] = [];
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [startDateStr];
    }

    const curr = new Date(start);
    let count = 0;
    while (curr <= end && count < 14) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return dates.length > 0 ? dates : [startDateStr];
  };

  const handleOpenApproveModal = (item: PengajuanIzin) => {
    setApproveModalItem(item);
    setApprovalNote(
      item.catatanGuru ||
        `Surat ${item.kategori.toLowerCase()} dan bukti foto telah diverifikasi serta disahkan oleh guru.`
    );
  };

  const handleExecuteApprove = (item: PengajuanIzin) => {
    const defaultStatusPresensi = item.kategori === 'Sakit' ? 'S' : 'I';
    const datesToRecord = getDatesInRange(item.tanggal, item.tanggalSelesai);

    dataStorage.updateDatabase((prev) => {
      // 1. Update status pengajuan
      const updatedPengajuan = (prev.pengajuanIzin || []).map((p) => {
        if (p.id === item.id) {
          return {
            ...p,
            status: 'Disetujui' as StatusPengajuanIzin,
            diverifikasiOleh: currentUser.name,
            tanggalVerifikasi: new Date().toISOString(),
            catatanGuru: approvalNote.trim() || 'Surat telah diverifikasi dan disetujui.',
          };
        }
        return p;
      });

      // 2. Sinkronkan presensi murid pada seluruh tanggal permohonan
      const currentPresensi = prev.presensi || [];
      const datesSet = new Set(datesToRecord);

      // Hapus presensi lama pada tanggal-tanggal tersebut untuk murid ini
      const isTargetStudentApprove = (rec: PresensiRecord) => {
        if (rec.muridId === item.muridId) return true;
        if (item.muridNis && rec.nis === item.muridNis) return true;
        if (
          rec.muridNama &&
          item.muridNama &&
          rec.muridNama.trim().toLowerCase() === item.muridNama.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      };

      const filteredPresensi = currentPresensi.filter(
        (rec) => !(isTargetStudentApprove(rec) && datesSet.has(rec.tanggal))
      );

      const newPresensiRecords: PresensiRecord[] = datesToRecord.map((tgl) => ({
        id: `prs-${item.muridId}-${tgl}`,
        muridId: item.muridId,
        muridNama: item.muridNama,
        nis: item.muridNis,
        kelasId: item.kelasId,
        kelasNama: item.kelasNama || 'Kelas Murid',
        tanggal: tgl,
        status: defaultStatusPresensi,
        keterangan: `${item.kategori}: ${item.alasan} (Surat Disetujui oleh ${currentUser.name})`,
        guruId: currentUser.id,
        guruNama: currentUser.name,
      }));

      // 3. Notifikasi ke murid
      const rangeText = item.tanggalSelesai && item.tanggalSelesai !== item.tanggal
        ? `${item.tanggal} s/d ${item.tanggalSelesai}`
        : item.tanggal;

      const notifItem: NotifikasiItem = {
        id: `notif-acc-${Date.now()}`,
        judul: `Pengajuan Surat ${item.kategori} Disetujui`,
        pesan: `Permohonan surat ${item.kategori.toLowerCase()} Anda untuk tanggal ${rangeText} telah diverifikasi dan disetujui oleh guru (${currentUser.name}). Presensi otomatis dicatat sebagai ${defaultStatusPresensi === 'S' ? 'Sakit (S)' : 'Izin (I)'}.`,
        waktu: 'Baru saja',
        tipe: 'presensi',
        targetRole: 'MURID',
        targetMuridId: item.muridId,
        targetMenu: 'presensi-saya',
        dibaca: false,
      };

      return {
        ...prev,
        pengajuanIzin: updatedPengajuan,
        presensi: [...filteredPresensi, ...newPresensiRecords],
        notifikasi: [notifItem, ...(prev.notifikasi || [])],
      };
    });

    setApproveModalItem(null);
    setToast({
      message: `Surat permohonan ${item.muridNama} (${item.kategori}) berhasil disetujui! Presensi otomatis dicatat sebagai ${defaultStatusPresensi === 'S' ? 'Sakit (S)' : 'Izin (I)'}. Notifikasi telah dikirimkan ke murid.`,
      type: 'success',
    });
    setTimeout(() => setToast(null), 5000);
  };

  const handleOpenRejectModal = (item: PengajuanIzin) => {
    setRejectModalItem(item);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectModalItem) return;

    const catatan = rejectReason.trim() || 'Surat atau bukti foto belum memenuhi kriteria keabsahan.';
    const datesToRecord = getDatesInRange(rejectModalItem.tanggal, rejectModalItem.tanggalSelesai);
    const datesSet = new Set(datesToRecord);

    dataStorage.updateDatabase((prev) => {
      // 1. Update status pengajuan
      const updatedPengajuan = (prev.pengajuanIzin || []).map((p) => {
        if (p.id === rejectModalItem.id) {
          return {
            ...p,
            status: 'Ditolak' as StatusPengajuanIzin,
            catatanGuru: catatan,
            diverifikasiOleh: currentUser.name,
            tanggalVerifikasi: new Date().toISOString(),
          };
        }
        return p;
      });

      // 2. Jika ditolak JANGAN di absen sakit/izin, tapi ALPA TETAP!
      const currentPresensi = prev.presensi || [];
      const isTargetStudentReject = (rec: PresensiRecord) => {
        if (rec.muridId === rejectModalItem.muridId) return true;
        if (rejectModalItem.muridNis && rec.nis === rejectModalItem.muridNis) return true;
        if (
          rec.muridNama &&
          rejectModalItem.muridNama &&
          rec.muridNama.trim().toLowerCase() === rejectModalItem.muridNama.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      };

      const filteredPresensi = currentPresensi.filter(
        (rec) => !(isTargetStudentReject(rec) && datesSet.has(rec.tanggal))
      );

      const newAlpaRecords: PresensiRecord[] = datesToRecord.map((tgl) => ({
        id: `prs-${rejectModalItem.muridId}-${tgl}`,
        muridId: rejectModalItem.muridId,
        muridNama: rejectModalItem.muridNama,
        nis: rejectModalItem.muridNis,
        kelasId: rejectModalItem.kelasId,
        kelasNama: rejectModalItem.kelasNama || 'Kelas Murid',
        tanggal: tgl,
        status: 'A' as const, // Wajib Alpa tetap saat ditolak! Jangan di absen sakit/izin!
        keterangan: `Surat ${rejectModalItem.kategori} Ditolak Guru (${currentUser.name}): ${catatan}. Status presensi dicatat Alpa (A). Wajib ajukan ulang berdasarkan catatan guru.`,
        guruId: currentUser.id,
        guruNama: currentUser.name,
      }));

      // 3. Notifikasi ke murid dengan instruksi mengajukan ulang berdasarkan catatan guru
      const rangeText = rejectModalItem.tanggalSelesai && rejectModalItem.tanggalSelesai !== rejectModalItem.tanggal
        ? `${rejectModalItem.tanggal} s/d ${rejectModalItem.tanggalSelesai}`
        : rejectModalItem.tanggal;

      const notifItem: NotifikasiItem = {
        id: `notif-rej-${Date.now()}`,
        judul: `Pengajuan Surat ${rejectModalItem.kategori} Ditolak`,
        pesan: `Permohonan surat ${rejectModalItem.kategori.toLowerCase()} Anda untuk tanggal ${rangeText} ditolak oleh guru (${currentUser.name}). Catatan Guru: "${catatan}". Status presensi Anda tidak dicatat Sakit/Izin, melainkan tetap Alpa (A). Silakan perbaiki dan ajukan ulang surat izin berdasarkan catatan guru tersebut.`,
        waktu: 'Baru saja',
        tipe: 'presensi',
        targetRole: 'MURID',
        targetMuridId: rejectModalItem.muridId,
        targetMenu: 'presensi-saya',
        dibaca: false,
      };

      return {
        ...prev,
        pengajuanIzin: updatedPengajuan,
        presensi: [...filteredPresensi, ...newAlpaRecords],
        notifikasi: [notifItem, ...(prev.notifikasi || [])],
      };
    });

    const rejectedName = rejectModalItem.muridNama;
    setRejectModalItem(null);
    setToast({
      message: `Surat permohonan ${rejectedName} telah ditolak. Presensi otomatis ditetapkan sebagai Alpa (A) dan notifikasi telah dikirim agar murid mengajukan ulang berdasarkan catatan guru.`,
      type: 'info',
    });
    setTimeout(() => setToast(null), 5000);
  };

  const handleOpenDeleteModal = (item: PengajuanIzin) => {
    setDeleteModalItem(item);
  };

  const handleExecuteDelete = () => {
    if (!deleteModalItem) return;
    const deletedName = deleteModalItem.muridNama;
    const deletedId = deleteModalItem.id;

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      pengajuanIzin: (prev.pengajuanIzin || []).filter((i) => i.id !== deletedId),
    }));

    setDeleteModalItem(null);
    setToast({
      message: `Arsip permohonan surat izin ${deletedName} berhasil dihapus permanen.`,
      type: 'info',
    });
    setTimeout(() => setToast(null), 4000);
  };

  const getCleanWaNumber = (phoneStr: string) => {
    let clean = phoneStr.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div
          id="toast-pengajuan-izin"
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-white border-emerald-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Surat Masuk
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
            {countTotal}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Seluruh Pengajuan</span>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-900 mt-1 block">
            {countMenunggu}
          </span>
          <span className="text-[10px] text-amber-800 font-bold">Perlu Ditinjau Guru</span>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1 block">
            {countDisetujui}
          </span>
          <span className="text-[10px] text-emerald-800 font-semibold">Tercatat di Presensi</span>
        </div>

        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
          <span className="text-2xl sm:text-3xl font-black text-rose-900 mt-1 block">
            {countDitolak}
          </span>
          <span className="text-[10px] text-rose-800 font-semibold">Tidak Memenuhi Syarat</span>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama murid, NIS, nama orang tua, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Kelas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">
              Rombel:
            </span>
            <select
              value={filterKelasId}
              onChange={(e) => {
                setFilterKelasId(e.target.value);
                if (onSelectKelasId && e.target.value !== 'ALL') {
                  onSelectKelasId(e.target.value);
                }
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelas</option>
              {(db.kelas || []).map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status & Kategori Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold mr-1">Status:</span>
            {(['ALL', 'Menunggu', 'Disetujui', 'Ditolak'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  statusFilter === st
                    ? st === 'Menunggu'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : st === 'Disetujui'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : st === 'Ditolak'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua Status' : st}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold mr-1">Kategori:</span>
            {(['ALL', 'Sakit', 'Izin', 'Dispensasi'] as const).map((kat) => (
              <button
                key={kat}
                type="button"
                onClick={() => setKategoriFilter(kat)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                  kategoriFilter === kat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {kat === 'ALL' ? 'Semua' : kat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List of Applications */}
      {filteredList.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
          <div className="w-14 h-14 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Tidak ada pengajuan surat ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'ALL' || kategoriFilter !== 'ALL'
              ? 'Tidak ada permohonan yang sesuai dengan filter pencarian saat ini.'
              : 'Belum ada murid yang mengirimkan surat izin, sakit, atau dispensasi.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((item) => {
            const waClean = getCleanWaNumber(item.noHpOrangTua);
            const waLink = `https://wa.me/${waClean}?text=${encodeURIComponent(
              `Halo Bapak/Ibu ${item.namaOrangTua}, kami dari Tim PJOK SMA Negeri 1 Tejakula ingin mengonfirmasi surat ${item.kategori} atas nama ${item.muridNama} (${item.kelasNama}) untuk tanggal ${item.tanggal}. Terima kasih.`
            )}`;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4 transition hover:border-slate-300"
              >
                {/* Header Row: Student Info & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        item.kategori === 'Sakit'
                          ? 'bg-sky-100 text-sky-700'
                          : item.kategori === 'Izin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.kategori === 'Sakit' ? (
                        <HeartPulse className="w-5 h-5" />
                      ) : item.kategori === 'Izin' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <Award className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{item.muridNama}</h4>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {item.kelasNama}
                        </span>
                        {item.muridNis && (
                          <span className="text-[10px] text-slate-400">NIS: {item.muridNis}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.tanggal === item.tanggalSelesai || !item.tanggalSelesai
                            ? new Date(item.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : `${new Date(item.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })} s/d ${new Date(item.tanggalSelesai).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}`}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Diajukan: {new Date(item.tanggalPengajuan).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        item.status === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : item.status === 'Ditolak'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      }`}
                    >
                      {item.status === 'Disetujui' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {item.status === 'Ditolak' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {item.status === 'Menunggu' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {item.status === 'Menunggu' ? 'Menunggu Verifikasi' : item.status}
                    </span>
                  </div>
                </div>

                {/* Parent Information & Reason */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ortu Details */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kontak Orang Tua / Wali Penandatangan
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {item.namaOrangTua}
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {item.noHpOrangTua}
                        </div>
                      </div>

                      {/* Quick Contact Links */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WA Ortu
                        </a>
                        <a
                          href={`tel:${item.noHpOrangTua}`}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs transition"
                          title="Telepon Langsung"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Reason Detail */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Alasan Lengkap Ketidakhadiran
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed italic whitespace-pre-wrap">
                      "{item.alasan}"
                    </p>
                  </div>
                </div>

                {/* Evidence Attachments: Letter and Photo with Parents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Surat Fisik */}
                  <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 relative group cursor-pointer"
                        onClick={() => setPreviewImage({ url: item.suratUrl, title: `Surat Izin ${item.kategori} - ${item.muridNama}` })}
                      >
                        <img
                          src={item.suratUrl}
                          alt="Surat Izin"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-sky-950 block">
                          1. Surat Bertandatangan
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.namaSurat || 'Surat_Izin.jpg'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: item.suratUrl, title: `Surat Izin ${item.kategori} - ${item.muridNama}` })}
                          className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Periksa Surat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Foto Bersama Orang Tua */}
                  <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 relative group cursor-pointer"
                        onClick={() => setPreviewImage({ url: item.fotoBersamaOrangTuaUrl, title: `Foto Bersama Orang Tua - ${item.muridNama}` })}
                      >
                        <img
                          src={item.fotoBersamaOrangTuaUrl}
                          alt="Foto Bersama Ortu"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-emerald-950 block">
                          2. Foto Bersama Ortu & Surat
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.namaFotoBersama || 'Foto_Bersama_Ortu.jpg'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: item.fotoBersamaOrangTuaUrl, title: `Foto Bersama Orang Tua - ${item.muridNama}` })}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" /> Periksa Foto Otentik
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback / Catatan Guru if any */}
                {item.catatanGuru && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-0.5">
                    <span className="font-extrabold uppercase text-[10px] tracking-wider block text-rose-700">
                      Catatan Penolakan dari Guru:
                    </span>
                    <p className="font-medium">{item.catatanGuru}</p>
                  </div>
                )}

                {item.diverifikasiOleh && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      Diverifikasi oleh: <strong className="text-slate-600">{item.diverifikasiOleh}</strong>
                    </span>
                    {item.tanggalVerifikasi && (
                      <span>
                        Pada {new Date(item.tanggalVerifikasi).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons for Guru & Admin */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400">
                    ID: <code className="text-slate-600">{item.id}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'Menunggu' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(item)}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Tolak Surat
                        </button>
                        <button
                          type="button"
                          id={`btn-approve-izin-${item.id}`}
                          onClick={() => handleOpenApproveModal(item)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Setujui & Catat Presensi
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(item)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Koreksi / Setujui Ulang"
                        >
                          Koreksi Persetujuan
                        </button>
                        {role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(item)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl text-xs transition cursor-pointer"
                            title="Hapus Arsip Permohonan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Zoom Gambar */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden p-4 border border-slate-700 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800 text-white flex-wrap gap-2">
              <span className="text-sm font-extrabold">{previewImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Gambar Penuh</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="py-2 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt="Zoom Preview"
                className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Verifikasi & Persetujuan Surat Izin / Sakit */}
      {approveModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Verifikasi & Setujui Surat {approveModalItem.kategori}
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sinkronisasi Otomatis ke Presensi Kelas
                  </span>
                </div>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informasi Detail Pengajuan */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Murid:</span>
                <span className="font-extrabold text-slate-900">
                  {approveModalItem.muridNama} ({approveModalItem.kelasNama})
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Tanggal Tidak Hadir:</span>
                <span className="font-extrabold text-indigo-700">
                  {approveModalItem.tanggalSelesai && approveModalItem.tanggalSelesai !== approveModalItem.tanggal
                    ? `${approveModalItem.tanggal} s/d ${approveModalItem.tanggalSelesai}`
                    : approveModalItem.tanggal}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-500 font-medium">Kategori Permohonan:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    approveModalItem.kategori === 'Sakit'
                      ? 'bg-amber-100 text-amber-800'
                      : approveModalItem.kategori === 'Izin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {approveModalItem.kategori}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Alasan Murid:</span>
                <p className="text-slate-700 font-medium italic mt-0.5">"{approveModalItem.alasan}"</p>
              </div>
            </div>

            {/* Catatan Konsekuensi Presensi */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-bold">Otomatisasi Presensi:</strong>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Status kehadiran murid pada tanggal tersebut akan otomatis tercatat sebagai{' '}
                  <span className="font-bold underline">
                    {approveModalItem.kategori === 'Sakit' ? 'Sakit (S)' : 'Izin (I)'}
                  </span>{' '}
                  dalam absensi harian dan notifikasi konfirmasi dikirimkan ke murid.
                </p>
              </div>
            </div>

            {/* Input Catatan Guru (Opsional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Catatan Verifikasi Guru (Opsional):
              </label>
              <input
                type="text"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Contoh: Surat dokter sah dan telah dikonfirmasi orang tua."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-approve"
                onClick={() => handleExecuteApprove(approveModalItem)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> Ya, Setujui & Catat Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Permohonan Surat Izin */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 text-rose-600">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Hapus Arsip Permohonan?
              </h4>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus arsip permohonan surat izin dari{' '}
              <strong>{deleteModalItem.muridNama}</strong> untuk tanggal{' '}
              <strong>{deleteModalItem.tanggal}</strong> secara permanen?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alasan Penolakan */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Tolak Pengajuan Surat {rejectModalItem.kategori}
              </h4>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Murid: <strong>{rejectModalItem.muridNama}</strong> ({rejectModalItem.kelasNama})
              <br />
              Tuliskan alasan penolakan agar murid dapat melengkapi permohonan yang sah.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Catatan Penolakan untuk Murid:
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Surat fisik belum ditandatangani basah oleh orang tua, atau foto bersama orang tua tidak jelas..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
              >
                Konfirmasi Tolak Surat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
