import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  Trash2,
  Edit2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  School,
  Mail,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { User, Kelas } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { TrashBinModal } from './TrashBinModal';

interface GuruManagementProps {
  db: LMSDatabase;
}

export const GuruManagement: React.FC<GuruManagementProps> = ({ db }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<User | null>(null);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [guruToDelete, setGuruToDelete] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    nip: '',
    email: '',
    mataPelajaran: 'PJOK',
    kelasDiampuIds: [],
    status: 'Aktif',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const guruList = useMemo(() => {
    return (db.users || []).filter((u) => u.role === 'GURU');
  }, [db.users]);

  const trashGuruCount = useMemo(() => {
    return (db.trashUsers || []).filter((t) => t.role === 'GURU').length;
  }, [db.trashUsers]);

  const filteredGuru = useMemo(() => {
    return guruList.filter((g) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (g.name || '').toLowerCase();
      const username = (g.username || '').toLowerCase();
      const nip = (g.nip || '').toLowerCase();
      const mapel = (g.mataPelajaran || '').toLowerCase();
      return name.includes(q) || username.includes(q) || nip.includes(q) || mapel.includes(q);
    });
  }, [guruList, searchQuery]);

  const handleOpenAdd = () => {
    setEditingGuru(null);
    setFormData({
      name: '',
      username: '',
      nip: '',
      email: '',
      mataPelajaran: 'PJOK',
      kelasDiampuIds: [],
      status: 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (g: User) => {
    setEditingGuru(g);
    setFormData({
      name: g.name,
      username: g.username,
      nip: g.nip,
      email: g.email,
      mataPelajaran: g.mataPelajaran || 'PJOK',
      kelasDiampuIds: g.kelasDiampuIds || [],
      status: g.status || 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  const handleToggleKelasDiampu = (kelasId: string) => {
    const current = formData.kelasDiampuIds || [];
    if (current.includes(kelasId)) {
      setFormData({ ...formData, kelasDiampuIds: current.filter((id) => id !== kelasId) });
    } else {
      setFormData({ ...formData, kelasDiampuIds: [...current, kelasId] });
    }
  };

  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Nama lengkap guru wajib diisi!', 'error');
      return;
    }

    const assignedKelasNames = (formData.kelasDiampuIds || []).map((id) => {
      const k = (db.kelas || []).find((c) => c.id === id);
      return k ? k.nama : id;
    });

    if (editingGuru) {
      // Update existing teacher
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === editingGuru.id
            ? {
                ...u,
                ...formData,
                name: formData.name!.trim(),
                username: formData.username?.trim() || u.username,
                nip: formData.nip?.trim() || u.nip,
                email: formData.email?.trim() || u.email,
                mataPelajaran: formData.mataPelajaran || 'PJOK',
                kelasDiampuIds: formData.kelasDiampuIds || [],
                kelasDiampu: assignedKelasNames,
              }
            : u
        ),
      }));
      showToast(`Data guru ${formData.name} berhasil diperbarui.`);
    } else {
      // Add new teacher
      const cleanUsername = (formData.username?.trim() || formData.nip?.trim() || `guru_${Date.now()}`).toLowerCase();
      const newGuru: User = {
        id: `usr-guru-${Date.now()}`,
        name: formData.name!.trim(),
        username: cleanUsername,
        role: 'GURU',
        nip: formData.nip?.trim() || '',
        email: formData.email?.trim() || `${cleanUsername}@guru.sma.belajar.id`,
        mataPelajaran: formData.mataPelajaran || 'PJOK',
        kelasDiampuIds: formData.kelasDiampuIds || [],
        kelasDiampu: assignedKelasNames,
        status: formData.status || 'Aktif',
        password: '123456',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      };

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: [...prev.users, newGuru],
      }));
      showToast(`Guru baru ${newGuru.name} berhasil ditambahkan.`);
    }

    setIsAddModalOpen(false);
    setEditingGuru(null);
  };

  const handleConfirmDelete = () => {
    if (!guruToDelete) return;
    dataStorage.moveToTrash(guruToDelete.id, 'Administrator');
    showToast(`Data guru ${guruToDelete.name} berhasil dipindahkan ke Bak Sampah.`);
    setGuruToDelete(null);
  };

  const handleResetPassword = () => {
    if (!resetPassUser) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === resetPassUser.id ? { ...u, password: '123456' } : u
      ),
    }));
    showToast(`Password untuk ${resetPassUser.name} berhasil direset menjadi '123456'.`);
    setResetPassUser(null);
  };

  return (
    <div id="guru-management-page" className="space-y-6">
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
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Data Guru & Tenaga Pengajar
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                {guruList.length} Guru Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola data guru pengampu mata pelajaran, hak akses kelas mengajar, dan reset kata sandi
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Buka Bak Sampah Guru"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Bak Sampah</span>
            {trashGuruCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {trashGuruCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Guru Baru</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, NIP, atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Total: {filteredGuru.length} guru terdaftar
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredGuru.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">Tidak Ada Data Guru</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery
                ? 'Tidak ditemukan guru dengan kata kunci pencarian tersebut.'
                : 'Belum ada guru yang didaftarkan dalam sistem.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">Guru</th>
                  <th className="py-4 px-3">NIP</th>
                  <th className="py-4 px-3">Mata Pelajaran</th>
                  <th className="py-4 px-3">Kelas yang Diampu</th>
                  <th className="py-4 px-3">Username Login</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuru.map((g) => {
                  const assignedClasses = (g.kelasDiampuIds || []).map((id) => {
                    const k = (db.kelas || []).find((c) => c.id === id);
                    return k ? k.nama : id;
                  });

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={g.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'}
                            alt={g.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block text-sm leading-tight">
                              {g.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {g.email || `${g.username}@guru.sma.belajar.id`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* NIP */}
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {g.nip || '-'}
                      </td>

                      {/* Mapel */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{g.mataPelajaran || 'PJOK'}</span>
                        </span>
                      </td>

                      {/* Kelas Diampu */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {assignedClasses.length > 0 ? (
                            assignedClasses.map((clsName, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200"
                              >
                                {clsName}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs italic">Semua Kelas</span>
                          )}
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-3 font-mono text-slate-700 text-xs">
                        {g.username}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            g.status === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {g.status || 'Aktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setResetPassUser(g)}
                            className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Reset Password ke 123456"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(g)}
                            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuruToDelete(g)}
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
      </div>

      {/* MODAL: Add / Edit Guru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingGuru ? 'Edit Data Guru' : 'Tambah Guru Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan biodata guru dan atur rombel yang diampu
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

            <form onSubmit={handleSaveGuru} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Guru (beserta Gelar) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: I Ketut Agus Nova Anggarawan, S.Pd., Gr."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="Contoh: 198811152022211013"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={formData.mataPelajaran || 'PJOK'}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                    placeholder="PJOK"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
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
                    placeholder="Contoh: guru"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Akun Belajar
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama@guru.sma.belajar.id"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Kelas Diampu (Checkboxes) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rombel / Kelas yang Diampu Guru Ini:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
                  {(db.kelas || []).map((k) => {
                    const isChecked = (formData.kelasDiampuIds || []).includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleKelasDiampu(k.id)}
                          className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Kelas {k.nama}</span>
                      </label>
                    );
                  })}
                </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 cursor-pointer"
                >
                  {editingGuru ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Reset Password */}
      {resetPassUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-amber-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Reset Password {resetPassUser.name}?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kata sandi login guru ini akan direset kembali menjadi bawaan: <strong>123456</strong>.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 cursor-pointer"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Delete Guru to Trash */}
      {guruToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Pindahkan Guru {guruToDelete.name} ke Bak Sampah?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Data guru ini akan dipindahkan ke Bak Sampah. Guru tidak akan dapat login selama berada di Bak Sampah, namun datanya dapat dipulihkan sewaktu-waktu.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuruToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer"
              >
                Pindahkan ke Bak Sampah
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
        defaultRoleFilter="GURU"
      />
    </div>
  );
};
