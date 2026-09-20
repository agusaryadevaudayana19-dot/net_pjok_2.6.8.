import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  School,
  Save,
  Trash2,
  Edit2,
  X,
  Filter,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  Table,
  Printer,
  Download,
  ClipboardList,
  Search,
  Users,
  CheckSquare,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { JurnalMengajar, User, getTeacherAssignedClasses } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface JurnalMengajarProps {
  db: LMSDatabase;
  currentUser: User;
  initialTab?: 'harian' | 'rekap';
}

export const JurnalMengajarView: React.FC<JurnalMengajarProps> = ({
  db,
  currentUser,
  initialTab = 'harian',
}) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'rekap'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const availableClasses = useMemo(() => {
    if (currentUser?.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    return db.kelas;
  }, [currentUser, db.kelas]);

  // Harian View States
  const [selectedFilterKelasId, setSelectedFilterKelasId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<JurnalMengajar | null>(null);

  // Rekapan View States & Filters
  const [rekapKelasFilter, setRekapKelasFilter] = useState<string>('ALL');
  const [rekapSearch, setRekapSearch] = useState<string>('');
  const [rekapDateStart, setRekapDateStart] = useState<string>('');
  const [rekapDateEnd, setRekapDateEnd] = useState<string>('');

  const [formData, setFormData] = useState<Partial<JurnalMengajar>>({
    tanggal: new Date().toISOString().slice(0, 10),
    jamKe: '1 - 3 (07.15 - 09.30 WIB)',
    kelasId: availableClasses[0]?.id || '',
    materiJudul: 'Permainan Bola Voli - Passing Bawah & Passing Atas',
    kegiatan:
      'Pemanasan dinamis, demonstrasi teknik perkenaan bola pada lengan, latihan passing berpasangan 20 kali, dan evaluasi gerak.',
    jumlahHadir: 32,
    jumlahTidakHadir: 0,
    catatanKhusus:
      'Semua murid aktif dan antusias. Murid mampu memahami koordinasi ayunan lengan dengan dorongan lutut.',
    hambatan: '3 murid masih ragu saat perkenaan bola pada forearm sehingga bola memantul liar.',
    tindakLanjut: 'Diberikan bimbingan khusus berpasangan dengan teman sebaya yang sudah mahir.',
  });

  const handleOpenAdd = () => {
    setEditingJurnal(null);
    setFormData({
      tanggal: new Date().toISOString().slice(0, 10),
      jamKe: '1 - 3 (07.15 - 09.30 WIB)',
      kelasId: availableClasses[0]?.id || '',
      materiJudul: '',
      kegiatan: '',
      jumlahHadir: 32,
      jumlahTidakHadir: 0,
      catatanKhusus: '',
      hambatan: '',
      tindakLanjut: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (j: JurnalMengajar) => {
    setEditingJurnal(j);
    setFormData(j);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus catatan jurnal mengajar ini?')) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: prev.jurnal.filter((item) => item.id !== id),
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const kelasObj = (db.kelas || []).find((k) => k.id === formData.kelasId);

    if (editingJurnal) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: prev.jurnal.map((item) =>
          item.id === editingJurnal.id
            ? ({
                ...item,
                ...formData,
                kelasNama: kelasObj?.nama || item.kelasNama,
              } as JurnalMengajar)
            : item
        ),
      }));
    } else {
      const newJurnal: JurnalMengajar = {
        id: `jr-${Date.now()}`,
        tanggal: formData.tanggal || new Date().toISOString().slice(0, 10),
        jamKe: formData.jamKe || '1 - 3',
        kelasId: formData.kelasId || availableClasses[0]?.id || '',
        kelasNama: kelasObj?.nama || '',
        guruId: currentUser.id,
        guruNama: currentUser.name,
        materiJudul: formData.materiJudul || 'PJOK',
        kegiatan: formData.kegiatan || '',
        jumlahHadir: Number(formData.jumlahHadir) || 32,
        jumlahTidakHadir: Number(formData.jumlahTidakHadir) || 0,
        catatanKhusus: formData.catatanKhusus || '',
        hambatan: formData.hambatan || '',
        tindakLanjut: formData.tindakLanjut || '',
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        jurnal: [newJurnal, ...prev.jurnal],
      }));
    }
    setIsModalOpen(false);
  };

  // Filtered Jurnal for Daily Tab
  const filteredJurnalHarian = useMemo(() => {
    return (db.jurnal || []).filter((j) => {
      if (currentUser?.role === 'GURU') {
        const isAssigned = availableClasses.some((k) => k.id === j.kelasId || k.nama === j.kelasNama);
        if (!isAssigned) return false;
      }
      if (selectedFilterKelasId !== 'ALL') {
        return j.kelasId === selectedFilterKelasId;
      }
      return true;
    });
  }, [db.jurnal, currentUser, availableClasses, selectedFilterKelasId]);

  // Filtered Jurnal for Rekapan Tab
  const filteredRekapanJurnal = useMemo(() => {
    return (db.jurnal || []).filter((j) => {
      if (currentUser?.role === 'GURU') {
        const isAssigned = availableClasses.some((k) => k.id === j.kelasId || k.nama === j.kelasNama);
        if (!isAssigned) return false;
      }
      if (rekapKelasFilter !== 'ALL' && j.kelasId !== rekapKelasFilter) {
        return false;
      }
      if (rekapDateStart && j.tanggal < rekapDateStart) {
        return false;
      }
      if (rekapDateEnd && j.tanggal > rekapDateEnd) {
        return false;
      }
      if (rekapSearch.trim()) {
        const query = rekapSearch.toLowerCase().trim();
        const matchTitle = j.materiJudul?.toLowerCase().includes(query);
        const matchKegiatan = j.kegiatan?.toLowerCase().includes(query);
        const matchKelas = j.kelasNama?.toLowerCase().includes(query);
        const matchHambatan = j.hambatan?.toLowerCase().includes(query);
        const matchTindak = j.tindakLanjut?.toLowerCase().includes(query);
        if (!matchTitle && !matchKegiatan && !matchKelas && !matchHambatan && !matchTindak) {
          return false;
        }
      }
      return true;
    });
  }, [db.jurnal, currentUser, availableClasses, rekapKelasFilter, rekapDateStart, rekapDateEnd, rekapSearch]);

  // Statistics for Rekap
  const rekapStats = useMemo(() => {
    const totalPertemuan = filteredRekapanJurnal.length;
    const totalHadir = filteredRekapanJurnal.reduce((acc, j) => acc + (j.jumlahHadir || 0), 0);
    const totalTidakHadir = filteredRekapanJurnal.reduce((acc, j) => acc + (j.jumlahTidakHadir || 0), 0);
    const totalMurid = totalHadir + totalTidakHadir;
    const persenKehadiran = totalMurid > 0 ? Math.round((totalHadir / totalMurid) * 100) : 0;
    const totalHambatan = filteredRekapanJurnal.filter((j) => (j.hambatan || '').trim().length > 0).length;
    const totalTindakLanjut = filteredRekapanJurnal.filter((j) => (j.tindakLanjut || '').trim().length > 0).length;

    return {
      totalPertemuan,
      totalHadir,
      totalTidakHadir,
      persenKehadiran,
      totalHambatan,
      totalTindakLanjut,
    };
  }, [filteredRekapanJurnal]);

  // Set preset date filter
  const handleSetQuickPeriod = (period: 'all' | 'this_month' | 'sem1' | 'sem2') => {
    const today = new Date();
    const year = today.getFullYear();

    if (period === 'all') {
      setRekapDateStart('');
      setRekapDateEnd('');
    } else if (period === 'this_month') {
      const start = new Date(year, today.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(year, today.getMonth() + 1, 0).toISOString().slice(0, 10);
      setRekapDateStart(start);
      setRekapDateEnd(end);
    } else if (period === 'sem1') {
      // Juli - Desember
      setRekapDateStart(`${year}-07-01`);
      setRekapDateEnd(`${year}-12-31`);
    } else if (period === 'sem2') {
      // Januari - Juni
      setRekapDateStart(`${year}-01-01`);
      setRekapDateEnd(`${year}-06-30`);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const selectedKelasObj = availableClasses.find((k) => k.id === rekapKelasFilter);
      const kelasLabel = selectedKelasObj ? `Kelas_${selectedKelasObj.nama}` : 'Semua_Kelas';

      const dataRows = filteredRekapanJurnal.map((j, index) => ({
        No: index + 1,
        'Hari / Tanggal': j.tanggal,
        'Jam Ke': j.jamKe,
        Kelas: j.kelasNama,
        'Guru Pengampu': j.guruNama || currentUser.name,
        'Materi Pembelajaran PJOK': j.materiJudul,
        'Uraian Kegiatan': j.kegiatan,
        'Murid Hadir': j.jumlahHadir,
        'Murid Tidak Hadir': j.jumlahTidakHadir,
        'Persentase Kehadiran':
          j.jumlahHadir + j.jumlahTidakHadir > 0
            ? `${Math.round((j.jumlahHadir / (j.jumlahHadir + j.jumlahTidakHadir)) * 100)}%`
            : '-',
        'Hambatan / Kendala': j.hambatan || '-',
        'Tindak Lanjut / Solusi': j.tindakLanjut || '-',
        'Catatan Refleksi': j.catatanKhusus || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataRows);
      // Auto-size columns width
      ws['!cols'] = [
        { wch: 6 },  // No
        { wch: 14 }, // Tanggal
        { wch: 16 }, // Jam
        { wch: 12 }, // Kelas
        { wch: 24 }, // Guru
        { wch: 32 }, // Materi
        { wch: 45 }, // Kegiatan
        { wch: 12 }, // Hadir
        { wch: 14 }, // Tidak Hadir
        { wch: 18 }, // Persentase
        { wch: 30 }, // Hambatan
        { wch: 30 }, // Tindak Lanjut
        { wch: 30 }, // Catatan
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Jurnal PJOK');
      XLSX.writeFile(
        wb,
        `Rekapan_Jurnal_Mengajar_PJOK_${kelasLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      console.error('Error saat export Excel Jurnal:', e);
      alert('Gagal mengekspor data Excel. Silakan coba kembali.');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const selectedKelasObj = availableClasses.find((k) => k.id === rekapKelasFilter);
      const kelasLabel = selectedKelasObj ? `Kelas_${selectedKelasObj.nama}` : 'Semua_Kelas';

      const headers = [
        'No',
        'Tanggal',
        'Jam Ke',
        'Kelas',
        'Materi Pembelajaran',
        'Kegiatan',
        'Jumlah Hadir',
        'Jumlah Tidak Hadir',
        'Hambatan',
        'Tindak Lanjut',
        'Catatan Khusus',
      ];

      const rows = filteredRekapanJurnal.map((j, idx) => [
        idx + 1,
        `"${j.tanggal}"`,
        `"${(j.jamKe || '').replace(/"/g, '""')}"`,
        `"${(j.kelasNama || '').replace(/"/g, '""')}"`,
        `"${(j.materiJudul || '').replace(/"/g, '""')}"`,
        `"${(j.kegiatan || '').replace(/"/g, '""')}"`,
        j.jumlahHadir,
        j.jumlahTidakHadir,
        `"${(j.hambatan || '').replace(/"/g, '""')}"`,
        `"${(j.tindakLanjut || '').replace(/"/g, '""')}"`,
        `"${(j.catatanKhusus || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Rekapan_Jurnal_PJOK_${kelasLabel}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error export CSV:', e);
      alert('Gagal mengekspor file CSV.');
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  const selectedKelasInfo = availableClasses.find((k) => k.id === rekapKelasFilter);

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>Jurnal Mengajar Guru PJOK</span>
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {db.settings?.namaSekolah || 'SMAN 1 TEJAKULA'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dokumentasi agenda pembelajaran harian, rekapitulasi kehadiran, refleksi gerak, export berkas, dan cetak resmi
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl border border-slate-300/80 shrink-0 self-start md:self-auto">
          <button
            type="button"
            id="tab-jurnal-harian"
            onClick={() => setActiveTab('harian')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'harian'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Jurnal Harian</span>
          </button>
          <button
            type="button"
            id="tab-rekapan-jurnal"
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-teal-600" />
            <span>Rekapan Jurnal</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-extrabold">
              {filteredRekapanJurnal.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: JURNAL HARIAN VIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'harian' && (
        <div className="space-y-5 print:hidden">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="bg-white rounded-2xl p-3 sm:px-4 sm:py-2.5 border border-slate-200/80 shadow-xs flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 shrink-0">Filter Kelas:</span>
              <select
                value={selectedFilterKelasId}
                onChange={(e) => setSelectedFilterKelasId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">
                  {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas'}
                </option>
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kartu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Tabel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tulis Jurnal Baru</span>
              </button>
            </div>
          </div>

          {/* Jurnal View: Table or Cards */}
          {filteredJurnalHarian.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              Belum ada catatan jurnal mengajar untuk kelas ini. Klik tombol "Tulis Jurnal Baru" untuk menambahkan.
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-3 text-center w-10">No</th>
                      <th className="py-3.5 px-3 min-w-[120px]">Tgl & Jam</th>
                      <th className="py-3.5 px-3 w-20">Kelas</th>
                      <th className="py-3.5 px-3 min-w-[220px]">Materi & Kegiatan</th>
                      <th className="py-3.5 px-3 text-center min-w-[90px]">Presensi</th>
                      <th className="py-3.5 px-3 min-w-[180px] bg-amber-50/60 text-amber-900 border-x border-amber-100">
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Hambatan</span>
                        </div>
                      </th>
                      <th className="py-3.5 px-3 min-w-[180px] bg-emerald-50/60 text-emerald-900 border-r border-emerald-100">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tindak Lanjut</span>
                        </div>
                      </th>
                      <th className="py-3.5 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJurnalHarian.map((j, idx) => (
                      <tr key={j.id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{j.tanggal}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{j.jamKe}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            {j.kelasNama}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-800 text-xs mb-1">{j.materiJudul}</div>
                          <div className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{j.kegiatan}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] font-semibold text-slate-700">
                            H: <strong className="text-emerald-700">{j.jumlahHadir}</strong>
                            <br />
                            T: <strong className="text-rose-600">{j.jumlahTidakHadir}</strong>
                          </span>
                        </td>
                        <td className="py-3 px-3 bg-amber-50/20 border-x border-amber-100/60">
                          {j.hambatan ? (
                            <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                              {j.hambatan}
                            </p>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">- Tidak ada kendala -</span>
                          )}
                        </td>
                        <td className="py-3 px-3 bg-emerald-50/20 border-r border-emerald-100/60">
                          {j.tindakLanjut ? (
                            <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                              {j.tindakLanjut}
                            </p>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">- Belum ada tindak lanjut -</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(j)}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50 cursor-pointer"
                              title="Edit Jurnal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(j.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                              title="Hapus Jurnal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="space-y-4">
              {filteredJurnalHarian.map((j) => (
                <div
                  key={j.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xs">
                        {j.kelasNama}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800">{j.materiJudul}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Calendar className="w-3.5 h-3.5" /> {j.tanggal}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Jam: {j.jamKe}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg">
                        Hadir: <strong className="text-emerald-700">{j.jumlahHadir}</strong> • Tidak:{' '}
                        <strong className="text-rose-600">{j.jumlahTidakHadir}</strong>
                      </span>
                      <button
                        onClick={() => handleOpenEdit(j)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Jurnal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(j.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-3 text-slate-700">
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                        Kegiatan Pembelajaran:
                      </span>
                      <p className="leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {j.kegiatan}
                      </p>
                    </div>

                    {(j.hambatan || j.tindakLanjut) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {j.hambatan && (
                          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Hambatan / Kendala:</span>
                            </div>
                            <p className="text-amber-950 text-xs leading-relaxed font-medium">
                              {j.hambatan}
                            </p>
                          </div>
                        )}
                        {j.tindakLanjut && (
                          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] uppercase tracking-wider">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Tindak Lanjut / Solusi:</span>
                            </div>
                            <p className="text-emerald-950 text-xs leading-relaxed font-medium">
                              {j.tindakLanjut}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {j.catatanKhusus && (
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider mb-0.5">
                          Catatan Refleksi & Evaluasi:
                        </span>
                        <p className="leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                          {j.catatanKhusus}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAPAN JURNAL (WITH EXPORT & PRINT BUTTONS)                        */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Action Toolbar with Export & Print */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <span>Rekapan & Laporan Pembelajaran PJOK</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filter, analisis kehadiran murid, ekspor ke format Excel/CSV, dan cetak lembar agenda resmi
                </p>
              </div>

              {/* Action Buttons: EXPORT & PRINT */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  id="btn-export-jurnal-excel"
                  onClick={handleExportExcel}
                  disabled={filteredRekapanJurnal.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Unduh rekapan format Microsoft Excel (.xlsx)"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  id="btn-export-jurnal-csv"
                  onClick={handleExportCSV}
                  disabled={filteredRekapanJurnal.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Unduh rekapan format CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  id="btn-print-jurnal"
                  onClick={handlePrint}
                  disabled={filteredRekapanJurnal.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Cetak format cetak resmi laporan rekapan jurnal"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Print</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              {/* Filter Kelas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Kelas</label>
                <select
                  value={rekapKelasFilter}
                  onChange={(e) => setRekapKelasFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">
                    {currentUser?.role === 'GURU' ? 'Semua Kelas Diampu' : 'Semua Kelas'}
                  </option>
                  {availableClasses.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.nama} (Tingkat {k.tingkat})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Tanggal Mulai */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={rekapDateStart}
                  onChange={(e) => setRekapDateStart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              {/* Filter Tanggal Sampai */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={rekapDateEnd}
                  onChange={(e) => setRekapDateEnd(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              {/* Search Keywords */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pencarian Materi / Kata</label>
                <div className="relative">
                  <input
                    type="text"
                    value={rekapSearch}
                    onChange={(e) => setRekapSearch(e.target.value)}
                    placeholder="Cari materi, bola voli, senam..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  {rekapSearch && (
                    <button
                      type="button"
                      onClick={() => setRekapSearch('')}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Period Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-500 font-bold mr-1">Periode Cepat:</span>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod('all')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod('this_month')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod('sem1')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Semester 1 (Ganjil)
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickPeriod('sem2')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Semester 2 (Genap)
              </button>
            </div>
          </div>

          {/* Rekapan Statistics Bento Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Agenda</p>
                <p className="text-lg font-black text-slate-800">{rekapStats.totalPertemuan} Pertemuan</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Rata-rata Presensi</p>
                <p className="text-lg font-black text-emerald-600">{rekapStats.persenKehadiran}% Hadir</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-black shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Murid Terdata</p>
                <p className="text-lg font-black text-slate-800">
                  <span className="text-emerald-700">{rekapStats.totalHadir}</span>
                  <span className="text-xs text-slate-400 font-normal"> / </span>
                  <span className="text-rose-600">{rekapStats.totalTidakHadir}</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Refleksi Hambatan</p>
                <p className="text-lg font-black text-slate-800">{rekapStats.totalHambatan} Tercatat</p>
              </div>
            </div>
          </div>

          {/* Rekapan Table & Printable View */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:border-none print:shadow-none">
            {/* Kop Laporan Resmi (Visible when printing) */}
            <div className="hidden print:block p-6 text-center border-b-2 border-black space-y-1">
              <h3 className="text-sm font-bold tracking-widest uppercase">
                PEMERINTAH PROVINSI BALI
              </h3>
              <h3 className="text-xs font-bold tracking-wider uppercase">
                DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA
              </h3>
              <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
                {db.settings?.namaSekolah || 'SMA NEGERI 1 TEJAKULA'}
              </h1>
              <p className="text-[10px] text-slate-600 italic">
                {db.settings?.alamatSekolah || 'Jalan Singaraja - Amlapura, Tejakula, Kabupaten Buleleng, Bali 81173'}
              </p>
              <div className="pt-2 border-t border-slate-400 mt-2">
                <h2 className="text-sm font-black uppercase underline tracking-wide">
                  LEMBAR REKAPITULASI JURNAL AGENDA MENGAJAR GURU PJOK
                </h2>
                <div className="text-xs flex justify-between pt-2 px-2 text-left">
                  <div>
                    <p>Mata Pelajaran: <strong>Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)</strong></p>
                    <p>Kelas: <strong>{selectedKelasInfo ? selectedKelasInfo.nama : 'Semua Kelas Diampu'}</strong></p>
                  </div>
                  <div className="text-right">
                    <p>Tahun Pelajaran: <strong>{db.settings?.tahunPelajaran || '2026/2027'}</strong></p>
                    <p>Guru Pengampu: <strong>{currentUser.name}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider print:bg-slate-100 print:text-black">
                    <th className="py-3 px-3 text-center w-8 print:border print:border-black">No</th>
                    <th className="py-3 px-3 min-w-[100px] print:border print:border-black">Tanggal & Jam</th>
                    <th className="py-3 px-3 w-16 text-center print:border print:border-black">Kelas</th>
                    <th className="py-3 px-4 min-w-[200px] print:border print:border-black">Materi Pembelajaran PJOK</th>
                    <th className="py-3 px-4 min-w-[260px] print:border print:border-black">Uraian Kegiatan Inti</th>
                    <th className="py-3 px-3 text-center min-w-[90px] print:border print:border-black">Kehadiran</th>
                    <th className="py-3 px-3 min-w-[160px] print:border print:border-black">Hambatan / Kendala</th>
                    <th className="py-3 px-3 min-w-[160px] print:border print:border-black">Tindak Lanjut</th>
                    <th className="py-3 px-3 text-center w-16 print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-y-0">
                  {filteredRekapanJurnal.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                        Tidak ada data jurnal mengajar yang sesuai dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredRekapanJurnal.map((j, idx) => (
                      <tr key={j.id} className="hover:bg-slate-50/70 transition-colors align-top print:border-b print:border-black">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400 print:text-black print:border print:border-black">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 print:border print:border-black">
                          <div className="font-bold text-slate-900">{j.tanggal}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{j.jamKe}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center print:border print:border-black">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px] print:bg-transparent print:text-black">
                            {j.kelasNama}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 print:border print:border-black">
                          <span className="font-bold text-slate-900 leading-snug block">
                            {j.materiJudul}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] leading-relaxed text-slate-600 print:text-black print:border print:border-black">
                          {j.kegiatan}
                        </td>
                        <td className="py-2.5 px-3 text-center print:border print:border-black">
                          <div className="text-[11px] font-semibold text-slate-800">
                            Hadir: <strong className="text-emerald-700">{j.jumlahHadir}</strong>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Absen: <strong className="text-rose-600">{j.jumlahTidakHadir}</strong>
                          </div>
                          {j.jumlahHadir + j.jumlahTidakHadir > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold mt-1 inline-block">
                              {Math.round((j.jumlahHadir / (j.jumlahHadir + j.jumlahTidakHadir)) * 100)}%
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-amber-950 print:text-black print:border print:border-black">
                          {j.hambatan ? (
                            <div className="leading-relaxed font-medium">{j.hambatan}</div>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">- Lancar -</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-emerald-950 print:text-black print:border print:border-black">
                          {j.tindakLanjut ? (
                            <div className="leading-relaxed font-medium">{j.tindakLanjut}</div>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">- Selesai -</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                handleOpenEdit(j);
                                setActiveTab('harian');
                              }}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-sky-50 cursor-pointer"
                              title="Edit Jurnal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(j.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                              title="Hapus Jurnal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Print Signatures Block */}
            <div className="hidden print:grid grid-cols-2 p-8 text-xs text-center mt-6">
              <div className="space-y-16">
                <p>
                  Mengetahui,
                  <br />
                  Kepala {db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula'}
                </p>
                <p className="font-bold underline">
                  {db.settings?.kepalaSekolahNama ||
                    db.settings?.namaKepalaSekolah ||
                    'Nyoman Sukrada, S.Pd., M.Pd.'}
                  <br />
                  <span className="font-normal text-[10px]">
                    NIP: {db.settings?.kepalaSekolahNip ||
                      db.settings?.nipKepalaSekolah ||
                      '19680105 199103 1 020'}
                  </span>
                </p>
              </div>
              <div className="space-y-16">
                <p>
                  Tejakula, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  <br />
                  Guru Mata Pelajaran PJOK
                </p>
                <p className="font-bold underline">
                  {currentUser.name ||
                    db.settings?.guruPjokNama ||
                    db.settings?.namaGuruPJOKUtama ||
                    'I Ketut Agus Nova Anggarawan, S.Pd., Gr.'}
                  <br />
                  <span className="font-normal text-[10px]">
                    NIP / ID: {currentUser.nip ||
                      currentUser.nis ||
                      db.settings?.guruPjokNip ||
                      '19881115 202221 1 012'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT JURNAL MODAL                                                   */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>{editingJurnal ? 'Edit Jurnal Mengajar' : 'Tulis Jurnal Mengajar Baru'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal || ''}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jam Ke</label>
                  <input
                    type="text"
                    required
                    value={formData.jamKe || ''}
                    onChange={(e) => setFormData({ ...formData, jamKe: e.target.value })}
                    placeholder="1 - 3 (07.15 - 09.30 WITA)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Kelas</label>
                  <select
                    value={formData.kelasId || availableClasses[0]?.id || ''}
                    onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {availableClasses.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama} (Tingkat {k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Jumlah Murid Hadir
                  </label>
                  <input
                    type="number"
                    value={formData.jumlahHadir || 32}
                    onChange={(e) =>
                      setFormData({ ...formData, jumlahHadir: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Materi yang Diajarkan
                </label>
                <input
                  type="text"
                  required
                  value={formData.materiJudul || ''}
                  onChange={(e) => setFormData({ ...formData, materiJudul: e.target.value })}
                  placeholder="Permainan Bola Voli - Passing Bawah dan Atas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Kegiatan Pembelajaran (Apersepsi, Inti, Penutup)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.kegiatan || ''}
                  onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
                  placeholder="Uraian langkah kegiatan di lapangan, metode, dan media..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Kolom Hambatan & Tindak Lanjut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-900 uppercase text-xs mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Hambatan / Kendala
                  </label>
                  <textarea
                    rows={2}
                    value={formData.hambatan || ''}
                    onChange={(e) => setFormData({ ...formData, hambatan: e.target.value })}
                    placeholder="Kendala sarana, cuaca, atau kesulitan murid..."
                    className="w-full px-3 py-2 bg-amber-50/40 border border-amber-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 uppercase text-xs mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tindak Lanjut / Solusi
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tindakLanjut || ''}
                    onChange={(e) => setFormData({ ...formData, tindakLanjut: e.target.value })}
                    placeholder="Solusi, pendampingan, modifikasi materi/alat..."
                    className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Catatan Khusus / Refleksi
                </label>
                <textarea
                  rows={2}
                  value={formData.catatanKhusus || ''}
                  onChange={(e) => setFormData({ ...formData, catatanKhusus: e.target.value })}
                  placeholder="Kendala sarana, catatan murid berbakat, atau evaluasi gerak..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
