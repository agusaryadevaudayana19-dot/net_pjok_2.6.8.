import React, { useState, useMemo } from 'react';
import {
  Shield,
  UserPlus,
  Search,
  Trash2,
  Edit2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { User } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { TrashBinModal } from './TrashBinModal';

interface AdminManagementProps {
  db: LMSDatabase;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ db }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    email: '',
    status: 'Aktif',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const adminList = useMemo(() => {
    return (db.users || []).filter((u) => u.role === 'ADMIN');
  }, [db.users]);

  const trashAdminCount = useMemo(() => {
    return (db.trashUsers || []).filter((t) => t.role === 'ADMIN').length;
  }, [db.trashUsers]);

  const filteredAdmin = useMemo(() => {
    return adminList.filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (a.name || '').toLowerCase();
      const username = (a.username || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      return name.includes(q) || username.includes(q) || email.includes(q);
    });
  }, [adminList, searchQuery]);

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      status: 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (a: User) => {
    setEditingAdmin(a);
    setFormData({
      name: a.name,
      username: a.username,
      email: a.email,
      status: a.status || 'Aktif',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.username?.trim()) {
      showToast('Nama dan Username wajib diisi!', 'error');
      return;
    }

    if (editingAdmin) {
      // Update
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === editingAdmin.id
            ? {
                ...u,
                ...formData,
                name: formData.name!.trim(),
                username: formData.username!.trim().toLowerCase(),
                email: formData.email?.trim() || u.email,
              }
            : u
        ),
      }));
      showToast(`Data administrator ${formData.name} berhasil diperbarui.`);
    } else {
      // Create new
      const cleanUsername = formData.username!.trim().toLowerCase();
      const newAdmin: User = {
        id: `usr-admin-${Date.now()}`,
        name: formData.name!.trim(),
        username: cleanUsername,
        role: 'ADMIN',
        email: formData.email?.trim() || `${cleanUsername}@admin.sekolah.id`,
        status: formData.status || 'Aktif',
        password: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      };

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: [...prev.users, newAdmin],
      }));
      showToast(`Administrator baru ${newAdmin.name} berhasil ditambahkan.`);
    }

    setIsAddModalOpen(false);
    setEditingAdmin(null);
  };

  const handleConfirmDelete = () => {
    if (!adminToDelete) return;
    if (adminList.length <= 1) {
      showToast('Tidak dapat menghapus satu-satunya akun Administrator!', 'error');
      setAdminToDelete(null);
      return;
    }
    dataStorage.moveToTrash(adminToDelete.id, 'Administrator');
    showToast(`Akun admin ${adminToDelete.name} dipindahkan ke Bak Sampah.`);
    setAdminToDelete(null);
  };

  const handleResetPassword = () => {
    if (!resetPassUser) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === resetPassUser.id ? { ...u, password: 'admin' } : u
      ),
    }));
    showToast(`Password untuk ${resetPassUser.name} direset menjadi 'admin'.`);
    setResetPassUser(null);
  };

  return (
    <div id="admin-management-page" className="space-y-6">
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
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Data Administrator
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
                {adminList.length} Administrator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Kelola akun pengelola sistem dengan hak akses penuh terhadap seluruh konfigurasi LMS
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTrashOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Buka Bak Sampah Admin"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Bak Sampah</span>
            {trashAdminCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {trashAdminCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Admin</span>
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
            placeholder="Cari nama admin, username, atau email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400 transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Total: {filteredAdmin.length} admin
        </div>
      </div>

      {/* Admin Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4">Administrator</th>
                <th className="py-4 px-3">Username</th>
                <th className="py-4 px-3">Email</th>
                <th className="py-4 px-3">Hak Akses</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmin.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name & Avatar */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={a.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80'}
                        alt={a.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block text-sm leading-tight">
                          {a.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Super Administrator
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Username */}
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                    {a.username}
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-3 text-slate-600">
                    {a.email || `${a.username}@admin.sekolah.id`}
                  </td>

                  {/* Hak Akses */}
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 font-bold text-xs border border-purple-200">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span>Full Access</span>
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        a.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {a.status || 'Aktif'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setResetPassUser(a)}
                        className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                        title="Reset Password ke 'admin'"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(a)}
                        className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Data Admin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {adminList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAdminToDelete(a)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors cursor-pointer"
                          title="Pindahkan ke Bak Sampah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit Admin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingAdmin ? 'Edit Administrator' : 'Tambah Administrator'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur data akun pengelola sistem
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

            <form onSubmit={handleSaveAdmin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Administrator *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Administrator Sekolah"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400/20 focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: admin"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@sekolah.sch.id"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer"
                >
                  {editingAdmin ? 'Simpan Perubahan' : 'Tambah Admin'}
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
                Kata sandi login akun administrator ini akan direset kembali menjadi bawaan: <strong>admin</strong>.
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

      {/* CONFIRMATION: Delete Admin */}
      {adminToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Pindahkan Admin {adminToDelete.name} ke Bak Sampah?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Akun administrator ini akan dipindahkan ke Bak Sampah dan tidak dapat digunakan untuk mengelola sistem hingga dipulihkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
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
        defaultRoleFilter="ADMIN"
      />
    </div>
  );
};
