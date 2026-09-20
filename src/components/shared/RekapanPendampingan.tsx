import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  HeartHandshake,
  Search,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Building,
  School,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Eye,
  X,
  MessageSquare,
} from 'lucide-react';
import { User, PendampinganMuridRecord, getTeacherAssignedClasses } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface RekapanPendampinganProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigatePembinaan?: (kelasId?: string) => void;
}

export const RekapanPendampingan: React.FC<RekapanPendampinganProps> = ({
  db,
  currentUser,
  onNavigatePembinaan,
}) => {
  const isMurid = currentUser.role === 'MURID';

  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas || [];
    }
    return db.kelas || [];
  }, [currentUser, db.kelas]);

  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal View / Print detail
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<PendampinganMuridRecord | null>(null);

  // All records
  const allRecords = useMemo(() => {
    return (db.pendampinganMurid || []).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
  }, [db.pendampinganMurid]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const matchKelas =
        selectedKelasFilter === 'ALL' || r.kelasId === selectedKelasFilter;
      const matchStatus =
        selectedStatusFilter === 'ALL' || r.status === selectedStatusFilter;
      const matchKategori =
        selectedKategoriFilter === 'ALL' ||
        r.jenisMasalah.toLowerCase().includes(selectedKategoriFilter.toLowerCase());
      const matchSearch =
        r.muridNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.nis && r.nis.includes(searchQuery)) ||
        r.guruNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tindakanPenanganan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.deskripsiMasalah.toLowerCase().includes(searchQuery.toLowerCase());

      return matchKelas && matchStatus && matchKategori && matchSearch;
    });
  }, [allRecords, selectedKelasFilter, selectedStatusFilter, selectedKategoriFilter, searchQuery]);

  // KPIs
  const totalKasus = allRecords.length;
  const statusSelesaiCount = allRecords.filter((r) => r.status === 'Selesai / Teratasi').length;
  const statusDalamProsesCount = allRecords.filter((r) => r.status === 'Dalam Proses').length;
  const statusPantauanKhususCount = allRecords.filter((r) => r.status === 'Perlu Pemantauan Khusus').length;
  const statusBkCount = allRecords.filter((r) => r.status === 'Dirujuk ke Guru BK').length;

  const persenTuntas = totalKasus > 0 ? Math.round((statusSelesaiCount / totalKasus) * 100) : 100;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <HeartHandshake className="w-4 h-4 text-pink-400" />
              Fitur Rekapan: Pendampingan & Pembinaan Murid
            </span>
            <span className="text-xs text-slate-300">
              Tahun Ajaran: <strong>{db.settings?.tahunPelajaran || '2026/2027'}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Rekapan Hasil Pendampingan & Penanganan Murid
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Laporan rekapitulasi data bimbingan konseling dan penanganan ketidakhadiran (Alpa) murid
            di seluruh rombel kelas PJOK, status penyelesaian masalah, serta komitmen tertulis murid.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Total Murid Didampingi</span>
              <span className="text-xl font-black text-white">{totalKasus} Kasus</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Selesai / Teratasi</span>
              <span className="text-xl font-black text-emerald-300">{statusSelesaiCount} Murid</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Masih Dalam Proses</span>
              <span className="text-xl font-black text-amber-300">{statusDalamProsesCount} Murid</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Pemantauan Khusus</span>
              <span className="text-xl font-black text-rose-300">{statusPantauanKhususCount} Murid</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Dirujuk ke Guru BK</span>
              <span className="text-xl font-black text-purple-300">{statusBkCount} Murid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari murid, NIS, guru, masalah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={selectedKelasFilter}
            onChange={(e) => setSelectedKelasFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Semua Kelas ({availableClasses.length})</option>
            {availableClasses.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="Selesai / Teratasi">Selesai / Teratasi</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Perlu Pemantauan Khusus">Perlu Pemantauan Khusus</option>
            <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Rekapan</span>
          </button>
        </div>
      </div>

      {/* Rekap Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
          <div>
            <span>Tabel Rekapitulasi Pendampingan Murid Bermasalah</span>
            <p className="text-[11px] text-slate-400 font-normal">
              Menampilkan {filteredRecords.length} dari {allRecords.length} berkas tercatat
            </p>
          </div>
          <span className="text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold self-start sm:self-auto">
            Tingkat Penyelesaian: {persenTuntas}% Tuntas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 min-w-[110px]">Tanggal</th>
                <th className="py-3 px-3 min-w-[170px]">Nama Murid & NIS</th>
                <th className="py-3 px-2 text-center w-24">Kelas</th>
                <th className="py-3 px-3 min-w-[150px]">Kategori & Alpa</th>
                <th className="py-3 px-3 min-w-[220px]">Permasalahan Disampaikan Murid</th>
                <th className="py-3 px-3 min-w-[190px]">Tindakan Pembinaan</th>
                <th className="py-3 px-3 min-w-[180px]">Komitmen Murid</th>
                <th className="py-3 px-2 text-center w-28">Status</th>
                <th className="py-3 px-3 min-w-[130px]">Guru Pembimbing</th>
                <th className="py-3 px-2 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      Tidak ada catatan pendampingan yang sesuai dengan filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {rec.tanggal}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-slate-900 leading-tight">
                        {rec.muridNama}
                      </p>
                      <p className="text-[10px] text-slate-400">NIS: {rec.nis || '-'}</p>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                        {rec.kelasNama}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-rose-700 leading-tight">{rec.jenisMasalah}</p>
                      {rec.jumlahAlpa > 0 && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[9px] font-bold">
                          {rec.jumlahAlpa}x Alpa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-800 max-w-xs">
                      {rec.deskripsiMasalah ? (
                        <div className="p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] font-black text-amber-900 uppercase tracking-wider">
                            <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Disampaikan Murid:</span>
                          </div>
                          <p className="line-clamp-3 text-slate-800 font-medium leading-relaxed">
                            &quot;{rec.deskripsiMasalah}&quot;
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Belum ada penjelasan mandiri</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-700 max-w-xs">
                      <p className="line-clamp-2">{rec.tindakanPenanganan}</p>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-emerald-900 italic max-w-xs">
                      <p className="line-clamp-2">&quot;{rec.komitmenMurid}&quot;</p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          rec.status === 'Selesai / Teratasi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Perlu Pemantauan Khusus'
                            ? 'bg-rose-100 text-rose-800'
                            : rec.status === 'Dirujuk ke Guru BK'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] font-semibold text-slate-800">
                      {rec.guruNama}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailRecord(rec)}
                        title="Lihat Detail & Cetak"
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Berkas Pendampingan */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Detail Berkas Pendampingan Murid
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Murid:</span>
                  <strong className="text-slate-900">{selectedDetailRecord.muridNama}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kelas & NIS:</span>
                  <strong className="text-slate-900">
                    {selectedDetailRecord.kelasNama} (NIS: {selectedDetailRecord.nis || '-'})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal Bimbingan:</span>
                  <strong className="text-slate-900">{selectedDetailRecord.tanggal}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Guru Pendamping:</span>
                  <strong className="text-slate-900">{selectedDetailRecord.guruNama}</strong>
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-800 block mb-1">
                  Kategori & Permasalahan yang Disampaikan Murid:
                </span>
                <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-rose-900 text-xs">{selectedDetailRecord.jenisMasalah}</p>
                    {selectedDetailRecord.jumlahAlpa > 0 && (
                      <span className="px-2 py-0.5 bg-rose-200/80 text-rose-900 rounded-md text-[10px] font-black">
                        {selectedDetailRecord.jumlahAlpa}x Alpa
                      </span>
                    )}
                  </div>
                  
                  {/* Permasalahan yang Disampaikan oleh Murid */}
                  <div className="p-3 bg-amber-50/95 border border-amber-200/90 rounded-xl space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-900 uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Permasalahan yang Disampaikan oleh Murid:</span>
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed italic bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                      &quot;{selectedDetailRecord.deskripsiMasalah || 'Murid belum menuliskan rincian kendala secara mandiri.'}&quot;
                    </p>
                  </div>

                  {selectedDetailRecord.tanggalAlpaList && selectedDetailRecord.tanggalAlpaList.length > 0 && (
                    <p className="text-[10px] text-rose-800 font-semibold pt-1">
                      Tanggal Alpa: <strong>{selectedDetailRecord.tanggalAlpaList.join(', ')}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-800 block mb-1">
                  Bentuk Tindakan / Pembinaan Guru:
                </span>
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <p className="text-indigo-950 leading-relaxed">
                    {selectedDetailRecord.tindakanPenanganan}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-extrabold text-slate-800 block mb-1">
                  Komitmen Tertulis Murid:
                </span>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl italic text-emerald-950 leading-relaxed">
                  &quot;{selectedDetailRecord.komitmenMurid}&quot;
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold">
                  Status: <strong className="text-slate-800">{selectedDetailRecord.status}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Surat Komitmen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
