import React, { useState, useMemo, useRef } from 'react';
import {
  GraduationCap,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit2,
  RotateCcw,
  CheckSquare,
  Square,
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  School,
  KeyRound,
  Eye,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { TrashBinModal } from './TrashBinModal';

interface MuridManagementProps {
  db: LMSDatabase;
}

export const MuridManagement: React.FC<MuridManagementProps> = ({ db }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [selectedMuridIds, setSelectedMuridIds] = useState<string[]>([]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMurid, setEditingMurid] = useState<User | null>(null);
  const [detailMurid, setDetailMurid] = useState<User | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [singleDeleteMurid, setSingleDeleteMurid] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    nis: '',
    nisn: '',
    kelasId: db.kelas[0]?.id || '',
    jenisKelamin: 'L',
    status: 'Aktif',
    tahunPelajaran: '2026/2027',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter students
  const muridList = useMemo(() => {
    return (db.users || []).filter((u) => u.role === 'MURID');
  }, [db.users]);

  const trashMuridCount = useMemo(() => {
    return (db.trashUsers || []).filter((t) => t.role === 'MURID').length;
  }, [db.trashUsers]);

  const filteredMurid = useMemo(() => {
    return muridList.filter((m) => {
      // Kelas filter
      if (selectedKelas !== 'all') {
        const mKelas = (m.kelasId || '').toLowerCase().trim();
        const selKelas = selectedKelas.toLowerCase().trim();
        const kelasObj = (db.kelas || []).find((k) => k.id.toLowerCase() === selKelas);
        const kelasNama = (kelasObj?.nama || '').toLowerCase().trim();
        if (mKelas !== selKelas && (!kelasNama || mKelas !== kelasNama)) {
          return false;
        }
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (m.name || '').toLowerCase();
      const username = (m.username || '').toLowerCase();
      const nis = (m.nis || '').toLowerCase();
      const nisn = (m.nisn || '').toLowerCase();
      return name.includes(q) || username.includes(q) || nis.includes(q) || nisn.includes(q);
    });
  }, [muridList, selectedKelas, searchQuery, db.kelas]);

  // Checkbox selections
  const isAllSelected =
    filteredMurid.length > 0 && selectedMuridIds.length === filteredMurid.map((m) => m.id).length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMuridIds([]);
    } else {
      setSelectedMuridIds(filteredMurid.map((m) => m.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedMuridIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete to Trash
  const handleConfirmBulkDelete = () => {
    if (selectedMuridIds.length === 0) return;
    const count = selectedMuridIds.length;
    dataStorage.moveToTrash(selectedMuridIds, 'Administrator');
    setSelectedMuridIds([]);
    setIsBulkDeleteModalOpen(false);
    showToast(`${count} murid berhasil dipindahkan ke Bak Sampah. Data dapat dipulihkan sewaktu-waktu.`);
  };

  // Single Delete to Trash
  const handleConfirmSingleDelete = () => {
    if (!singleDeleteMurid) return;
    dataStorage.moveToTrash(singleDeleteMurid.id, 'Administrator');
    setSelectedMuridIds((prev) => prev.filter((id) => id !== singleDeleteMurid.id));
    showToast(`Murid ${singleDeleteMurid.name} dipindahkan ke Bak Sampah.`);
    setSingleDeleteMurid(null);
  };

  // Clear All Students to Trash (for fresh import)
  const handleConfirmClearAll = () => {
    const count = dataStorage.clearAllMurid('Administrator');
    setSelectedMuridIds([]);
    setIsClearAllModalOpen(false);
    showToast(`Seluruh data murid (${count} murid) telah dipindahkan ke Bak Sampah. Data murid kini kosong dan siap diisi melalui import CSV/Excel.`);
  };

  // Open Edit Modal
  const handleOpenEdit = (m: User) => {
    setEditingMurid(m);
    setFormData({
      name: m.name,
      username: m.username,
      nis: m.nis,
      nisn: m.nisn,
      kelasId: m.kelasId || db.kelas[0]?.id || '',
      jenisKelamin: m.jenisKelamin || 'L',
      status: m.status || 'Aktif',
      tahunPelajaran: m.tahunPelajaran || db.settings?.tahunPelajaran || '2026/2027',
    });
    setIsAddModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveMurid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Nama murid wajib diisi!', 'error');
      return;
    }

    if (editingMurid) {
      // Update
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === editingMurid.id
            ? {
                ...u,
                ...formData,
                name: formData.name!.trim(),
                username: formData.username?.trim() || u.username,
                nis: formData.nis?.trim() || u.nis,
                nisn: formData.nisn?.trim() || u.nisn,
              }
            : u
        ),
      }));
      showToast(`Data murid ${formData.name} berhasil diperbarui.`);
    } else {
      // Create new
      const newMurid: User = {
        id: `usr-murid-${Date.now()}`,
        name: formData.name!.trim(),
        username: (formData.username?.trim() || formData.nis?.trim() || `murid_${Date.now()}`).toLowerCase(),
        role: 'MURID',
        nis: formData.nis?.trim() || '',
        nisn: formData.nisn?.trim() || '',
        kelasId: formData.kelasId || db.kelas[0]?.id || '',
        jenisKelamin: formData.jenisKelamin || 'L',
        status: formData.status || 'Aktif',
        password: '123456',
        tahunPelajaran: formData.tahunPelajaran || db.settings?.tahunPelajaran || '2026/2027',
        avatar: `https://images.unsplash.com/photo-${formData.jenisKelamin === 'P' ? '1544005313-94ddf0286df2' : '1535713875002-d1d0cf377fde'}?w=120&auto=format&fit=crop&q=80`,
      };

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: [...prev.users, newMurid],
      }));
      showToast(`Murid baru ${newMurid.name} berhasil ditambahkan.`);
    }

    setIsAddModalOpen(false);
    setEditingMurid(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (muridList.length === 0) {
      showToast('Belum ada data murid untuk diekspor!', 'error');
      return;
    }

    const headers = ['id', 'username', 'role', 'name', 'nis', 'nisn', 'kelas', 'jenisKelamin', 'status'];
    const rows = muridList.map((m) => {
      const kelasObj = (db.kelas || []).find((k) => k.id === m.kelasId);
      const kelasLabel = kelasObj ? kelasObj.nama : m.kelasId || '';
      return [
        m.id,
        m.username,
        'MURID',
        `"${(m.name || '').replace(/"/g, '""')}"`,
        m.nis || '',
        m.nisn || '',
        kelasLabel,
        m.jenisKelamin || 'L',
        m.status || 'Aktif',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_murid_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Data murid berhasil diekspor ke CSV.');
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const templateContent = [
      'nama,nis,nisn,kelas,jenisKelamin,username,password',
      'Ahmad Fauzi,240101,0081234567,XI 1,L,ahmad.fauzi,123456',
      'Siti Nurhaliza,240102,0081234568,XI 1,P,siti.nurhaliza,123456',
      'Budi Santoso,240103,0081234569,XI 2,L,budi.santoso,123456',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_murid.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Template CSV berhasil diunduh. Silakan isi lalu impor kembali.');
  };

  return (
    <div id="murid-management-page" className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in shadow-xs ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-200 shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Data Murid
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-700 border border-sky-200">
                {muridList.length} Murid Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola seluruh basis data murid, rombel, import data baru, dan pemulihan tong sampah
            </p>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-trash-murid"
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Buka Bak Sampah Murid"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Bak Sampah</span>
            {trashMuridCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {trashMuridCount}
              </span>
            )}
          </button>

          <button
            id="btn-clean-duplicate-murid"
            type="button"
            onClick={() => {
              const res = dataStorage.cleanDuplicateUsers();
              if (res.removedCount > 0) {
                showToast(`Berhasil membersihkan ${res.removedCount} data nama murid yang duplikat.`);
              } else {
                showToast('Database murid sudah bersih. Tidak ditemukan nama duplikat.');
              }
            }}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Deteksi dan bersihkan data murid yang memiliki nama ganda/duplikat"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Bersihkan Duplikat</span>
          </button>

          <button
            id="btn-clear-all-murid"
            type="button"
            onClick={() => setIsClearAllModalOpen(true)}
            disabled={muridList.length === 0}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Kosongkan data murid untuk persiapan import bersih"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Kosongkan Data Murid</span>
          </button>

          <button
            id="btn-import-murid"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-200"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data Murid</span>
          </button>

          <button
            id="btn-add-single-murid"
            type="button"
            onClick={() => {
              setEditingMurid(null);
              setFormData({
                name: '',
                username: '',
                nis: '',
                nisn: '',
                kelasId: selectedKelas !== 'all' ? selectedKelas : db.kelas[0]?.id || '',
                jenisKelamin: 'L',
                status: 'Aktif',
                tahunPelajaran: db.settings?.tahunPelajaran || '2026/2027',
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Murid</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Bar (Bulk Action) */}
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
              Batalkan Pilihan
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedMuridIds.length}) Murid Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama, NIS, atau NISN murid..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all"
            />
          </div>

          {/* Kelas / Rombel Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 cursor-pointer"
            >
              <option value="all">Semua Kelas & Rombel ({muridList.length})</option>
              {(db.kelas || []).map((k) => {
                const count = muridList.filter(
                  (m) =>
                    m.kelasId === k.id ||
                    (m.kelasId && m.kelasId.toLowerCase() === k.nama.toLowerCase())
                ).length;
                return (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} ({count} murid)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Export & Template */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download Template Format CSV"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Format CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Ekspor Data Murid Aktif ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredMurid.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 mx-auto flex items-center justify-center mb-3">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              {muridList.length === 0
                ? 'Data Murid Saat Ini Kosong'
                : 'Tidak Ada Murid yang Sesuai Filter'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {muridList.length === 0
                ? 'Data murid sengaja dikosongkan agar Anda dapat mengisinya secara bersih melalui import CSV/Excel atau menambahkannya secara bertahap.'
                : 'Coba ubah kata kunci pencarian atau pilih filter rombel kelas yang berbeda.'}
            </p>

            {muridList.length === 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Data Murid Sekarang</span>
                </button>
                {trashMuridCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsTrashOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>Lihat Bak Sampah ({trashMuridCount})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-slate-700 inline-flex items-center justify-center"
                      title={isAllSelected ? 'Batalkan pilih semua' : 'Pilih semua'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-3">Murid</th>
                  <th className="py-4 px-3">NIS / NISN</th>
                  <th className="py-4 px-3">Kelas & Rombel</th>
                  <th className="py-4 px-3">L/P</th>
                  <th className="py-4 px-3">Username</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMurid.map((m) => {
                  const isSelected = selectedMuridIds.includes(m.id);
                  const kelasObj = (db.kelas || []).find((k) => k.id === m.kelasId);
                  const kelasLabel = kelasObj ? kelasObj.nama : m.kelasId || '-';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(m.id)}
                          className="cursor-pointer text-slate-400 hover:text-slate-700 inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                            alt={m.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-sm leading-tight">
                              {m.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {m.email || `${m.username}@murid.sman1olahraga.sch.id`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700">{m.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">NISN: {m.nisn || '-'}</div>
                      </td>

                      {/* Kelas */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                          <School className="w-3.5 h-3.5 text-sky-600" />
                          <span>Kelas {kelasLabel}</span>
                        </span>
                      </td>

                      {/* L/P */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                            m.jenisKelamin === 'P'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {m.jenisKelamin || 'L'}
                        </span>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-3 font-mono text-slate-700 text-xs">
                        {m.username}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            m.status === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {m.status || 'Aktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailMurid(m)}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Lihat Detail Murid"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="w-8 h-8 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Data Murid"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSingleDeleteMurid(m)}
                            className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Pindahkan ke Bak Sampah"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredMurid.length} dari {muridList.length} data murid</span>
          {selectedMuridIds.length > 0 && (
            <span className="font-bold text-sky-700">
              {selectedMuridIds.length} murid dipilih
            </span>
          )}
        </div>
      </div>

      {/* MODAL: Import Murid (Dedicated CSV/Excel for Murid Only) */}
      {isImportModalOpen && (
        <MuridImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          db={db}
          onImportSuccess={(count) => {
            setIsImportModalOpen(false);
            showToast(`Berhasil mengimpor ${count} data murid baru.`);
          }}
        />
      )}

      {/* MODAL: Add / Edit Murid */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingMurid ? 'Edit Data Murid' : 'Tambah Murid Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan biodata murid secara lengkap
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMurid} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Murid *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: I Gede Aditya Pratama"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIS (Nomor Induk Murid)
                  </label>
                  <input
                    type="text"
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 240101"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NISN (Nasional)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0081234567"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas & Rombel
                  </label>
                  <select
                    value={formData.kelasId || db.kelas[0]?.id || ''}
                    onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
                  >
                    {(db.kelas || []).map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenisKelamin || 'L'}
                    onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: aditya.pratama"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formData.status || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-200 cursor-pointer"
                >
                  {editingMurid ? 'Simpan Perubahan' : 'Tambah Murid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detail Murid */}
      {detailMurid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Profil Murid</h3>
              <button
                type="button"
                onClick={() => setDetailMurid(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={detailMurid.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
                alt={detailMurid.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-base font-black text-slate-900">{detailMurid.name}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{detailMurid.email || `${detailMurid.username}@murid.sch.id`}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">
                  {detailMurid.status || 'Aktif'}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 text-slate-600 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">NIS:</span>
                <span className="font-bold text-slate-800">{detailMurid.nis || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NISN:</span>
                <span className="font-bold text-slate-800">{detailMurid.nisn || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas / Rombel:</span>
                <span className="font-bold text-slate-800">{detailMurid.kelasId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="font-bold text-slate-800">{detailMurid.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-Laki'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username Login:</span>
                <span className="font-mono font-bold text-slate-800">{detailMurid.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tahun Pelajaran:</span>
                <span className="font-bold text-slate-800">{detailMurid.tahunPelajaran || '2026/2027'}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailMurid(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Single Delete to Trash */}
      {singleDeleteMurid && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Pindahkan {singleDeleteMurid.name} ke Bak Sampah?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Data murid ini akan dipindahkan ke Bak Sampah dan tidak tampil di daftar aktif murid. Anda dapat memulihkannya sewaktu-waktu dari Bak Sampah.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteMurid(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer transition-colors"
              >
                Ya, Pindahkan ke Bak Sampah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Bulk Delete to Trash */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Hapus {selectedMuridIds.length} Murid Terpilih?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sebanyak {selectedMuridIds.length} murid yang Anda beri centang akan dipindahkan ke Bak Sampah. Data mereka aman dan bisa dipulihkan kembali jika diperlukan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer transition-colors"
              >
                Pindahkan ke Bak Sampah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Clear All Students to Trash (for fresh import) */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Kosongkan Seluruh Data Murid?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Seluruh {muridList.length} data murid aktif akan dipindahkan ke <strong>Bak Sampah</strong>. Tabel murid akan menjadi kosong sehingga Anda dapat mengimpor data murid baru secara bersih melalui file CSV/Excel. Data murid yang lama tetap dapat Anda kembalikan kapan saja dari menu Bak Sampah.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer transition-colors"
              >
                Ya, Kosongkan Data Murid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECYCLE BIN MODAL */}
      <TrashBinModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        db={db}
        defaultRoleFilter="MURID"
      />
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: Dedicated Murid Import Modal
// ==========================================
interface MuridImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: LMSDatabase;
  onImportSuccess: (count: number) => void;
}

const MuridImportModal: React.FC<MuridImportModalProps> = ({
  isOpen,
  onClose,
  db,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetKelas, setTargetKelas] = useState<string>(db.kelas[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setErrorMsg('File CSV kosong atau hanya memiliki baris judul.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Handle quoted commas
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim().replace(/^"|"$/g, ''));

          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });

          // Extract murid fields
          const name = rowObj['nama'] || rowObj['name'] || rowObj['nama murid'] || rowObj['nama lengkap'] || '';
          if (name) {
            rows.push({
              name,
              nis: rowObj['nis'] || rowObj['nomor induk'] || '',
              nisn: rowObj['nisn'] || '',
              kelas: rowObj['kelas'] || rowObj['rombel'] || targetKelas,
              jenisKelamin: (rowObj['jeniskelamin'] || rowObj['jk'] || rowObj['l/p'] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
              username: rowObj['username'] || '',
              password: rowObj['password'] || '123456',
            });
          }
        }

        setParsedData(rows);
      } catch (err: any) {
        setErrorMsg('Gagal memproses file: ' + err.message);
      }
    };
    reader.readAsText(selected);
  };

  const handleExecuteImport = () => {
    if (parsedData.length === 0) {
      setErrorMsg('Tidak ada baris data murid yang valid untuk diimpor.');
      return;
    }

    setIsProcessing(true);
    try {
      const usersToInsert: User[] = parsedData.map((row, idx) => {
        // Resolve kelas ID
        let resolvedKelasId = targetKelas;
        if (row.kelas) {
          const foundKelas = (db.kelas || []).find(
            (k) =>
              k.id.toLowerCase() === row.kelas.toLowerCase() ||
              k.nama.toLowerCase() === row.kelas.toLowerCase()
          );
          if (foundKelas) {
            resolvedKelasId = foundKelas.id;
          }
        }

        const cleanNis = String(row.nis || '').trim();
        const cleanName = String(row.name || '').trim();
        const baseUsername = row.username
          ? String(row.username).toLowerCase().trim()
          : cleanNis
          ? `murid_${cleanNis}`
          : cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) || `murid_${idx}`;

        return {
          id: `usr-imp-m-${Date.now()}-${idx}`,
          name: cleanName,
          username: baseUsername,
          role: 'MURID',
          nis: cleanNis,
          nisn: String(row.nisn || '').trim(),
          kelasId: resolvedKelasId,
          jenisKelamin: row.jenisKelamin || 'L',
          status: 'Aktif',
          password: row.password || '123456',
          tahunPelajaran: db.settings?.tahunPelajaran || '2026/2027',
          avatar: `https://images.unsplash.com/photo-${row.jenisKelamin === 'P' ? '1544005313-94ddf0286df2' : '1535713875002-d1d0cf377fde'}?w=120&auto=format&fit=crop&q=80`,
        };
      });

      dataStorage.importMuridBatch(usersToInsert, 'Administrator');
      onImportSuccess(usersToInsert.length);
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan saat menyimpan data: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Import Data Murid (Khusus Murid)
              </h3>
              <p className="text-xs text-slate-500">
                Data yang diunggah di sini murni khusus murid dan tidak akan bercampur ke data guru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Target Kelas Default */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Kelas Default (Jika kolom kelas di CSV kosong):
          </label>
          <select
            value={targetKelas}
            onChange={(e) => setTargetKelas(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            {(db.kelas || []).map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/40 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">
            {file ? file.name : 'Klik untuk memilih berkas CSV data murid'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Format: nama, nis, nisn, kelas, jenisKelamin
          </p>
        </div>

        {/* Preview parsed data */}
        {parsedData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Pratinjau Data ({parsedData.length} calon murid terdeteksi):
              </span>
              <span className="text-[11px] text-emerald-600 font-bold">Siap diimpor</span>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs space-y-1">
              {parsedData.slice(0, 5).map((row, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                  <span className="font-bold text-slate-800">{idx + 1}. {row.name}</span>
                  <span className="text-slate-500 text-[11px]">NIS: {row.nis || '-'} • JK: {row.jenisKelamin}</span>
                </div>
              ))}
              {parsedData.length > 5 && (
                <p className="text-[10px] text-slate-400 text-center pt-1 italic">
                  +{parsedData.length - 5} murid lainnya...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedData.length === 0 || isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Mengimpor...' : `Impor ${parsedData.length} Murid`}
          </button>
        </div>
      </div>
    </div>
  );
};
