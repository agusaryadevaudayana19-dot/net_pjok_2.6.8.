import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  UserCheck,
  GraduationCap,
  Shield,
  X,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { TrashUserItem, UserRole } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { cleanupExpiredTrash } from '../../utils/trashCleanup';

interface TrashBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: LMSDatabase;
  defaultRoleFilter?: UserRole | 'ALL';
}

export const TrashBinModal: React.FC<TrashBinModalProps> = ({
  isOpen,
  onClose,
  db,
  defaultRoleFilter = 'ALL',
}) => {
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>(defaultRoleFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<{
    isOpen: boolean;
    ids: string[];
    title: string;
    description: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (defaultRoleFilter) {
      setRoleFilter(defaultRoleFilter);
    }
    setSelectedIds([]);
  }, [defaultRoleFilter, isOpen]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const trashList: TrashUserItem[] = useMemo(() => {
    return db.trashUsers || [];
  }, [db.trashUsers]);

  const filteredTrash = useMemo(() => {
    return trashList.filter((item) => {
      if (roleFilter !== 'ALL' && item.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (item.user.name || '').toLowerCase();
      const username = (item.user.username || '').toLowerCase();
      const nis = (item.user.nis || '').toLowerCase();
      const nip = (item.user.nip || '').toLowerCase();
      return name.includes(q) || username.includes(q) || nis.includes(q) || nip.includes(q);
    });
  }, [trashList, roleFilter, searchQuery]);

  if (!isOpen) return null;

  const isAllSelected = filteredTrash.length > 0 && selectedIds.length === filteredTrash.map((i) => i.id).length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrash.map((i) => i.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRestore = (ids: string[]) => {
    dataStorage.restoreFromTrash(ids, 'Administrator');
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    showToast(`Berhasil memulihkan ${ids.length} pengguna dari Bak Sampah.`);
  };

  const handlePermanentDelete = (ids: string[]) => {
    dataStorage.permanentDeleteFromTrash(ids, 'Administrator');
    setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
    setConfirmPermanentDelete(null);
    showToast(`Berhasil menghapus permanen ${ids.length} pengguna.`);
  };

  const handleEmptyAllTrash = () => {
    const roleArg = roleFilter === 'ALL' ? undefined : roleFilter;
    dataStorage.emptyTrash(roleArg, 'Administrator');
    setSelectedIds([]);
    setConfirmPermanentDelete(null);
    showToast(`Tong Sampah ${roleFilter === 'ALL' ? 'seluruhnya' : roleFilter} berhasil dikosongkan permanen.`);
  };

  const handleRunCleanup30Days = async () => {
    const res = await cleanupExpiredTrash(30);
    if (res.purgedCount > 0) {
      showToast(`Berhasil membersihkan ${res.purgedCount} data sampah berumur lebih dari 30 hari.`);
    } else {
      showToast('Tidak ada data sampah yang lebih dari 30 hari. Database sudah optimal.');
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      id="trash-bin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="trash-bin-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-orange-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Bak Sampah Pengguna
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                  {trashList.length} Item
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Data yang terhapus dapat dikembalikan atau dibersihkan secara permanen
              </p>
            </div>
          </div>
          <button
            id="close-trash-modal-btn"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              toastMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-5 sm:p-6 border-b border-slate-100 space-y-3 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl overflow-x-auto">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'MURID', label: 'Murid' },
                { id: 'GURU', label: 'Guru' },
                { id: 'ADMIN', label: 'Admin' },
              ].map((tab) => {
                const count =
                  tab.id === 'ALL'
                    ? trashList.length
                    : trashList.filter((t) => t.role === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoleFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      roleFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        roleFilter === tab.id
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-300/60 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIS, NIP..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400"
              />
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={filteredTrash.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-rose-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Pilih Semua ({filteredTrash.length})</span>
              </button>

              {selectedIds.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">
                  {selectedIds.length} dipilih
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleRestore(selectedIds)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pulihkan ({selectedIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmPermanentDelete({
                        isOpen: true,
                        ids: selectedIds,
                        title: `Hapus Permanen ${selectedIds.length} Pengguna?`,
                        description: `Tindakan ini akan menghapus ${selectedIds.length} pengguna dan seluruh riwayat nilai/absensi terkait secara permanen dari server. Data tidak dapat dipulihkan kembali!`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permanen ({selectedIds.length})</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRunCleanup30Days}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Pembersihan otomatis data yang sudah terhapus lebih dari 30 hari"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Bersihkan &gt; 30 Hari</span>
                  </button>
                  {trashList.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmPermanentDelete({
                          isOpen: true,
                          ids: filteredTrash.map((t) => t.id),
                          title: 'Kosongkan Seluruh Tong Sampah?',
                          description: `Seluruh data dalam tong sampah ${
                            roleFilter === 'ALL' ? '' : `peran ${roleFilter}`
                          } akan dihapus secara permanen dan tidak dapat dikembalikan lagi.`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kosongkan Tong Sampah</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {filteredTrash.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Bak Sampah Kosong</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'Tidak ada data terhapus yang cocok dengan pencarian Anda.'
                  : 'Tidak ada data pengguna yang berada di dalam bak sampah saat ini.'}
              </p>
            </div>
          ) : (
            filteredTrash.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const u = item.user;
              const isMurid = item.role === 'MURID';
              const isGuru = item.role === 'GURU';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectOne(item.id)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                        isMurid
                          ? 'bg-sky-100 text-sky-700'
                          : isGuru
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {isMurid ? (
                        <GraduationCap className="w-5 h-5" />
                      ) : isGuru ? (
                        <UserCheck className="w-5 h-5" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{u.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            isMurid
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : isGuru
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Username: <strong>{u.username}</strong></span>
                        {u.nis && <span>NIS: {u.nis}</span>}
                        {u.nip && <span>NIP: {u.nip}</span>}
                        {item.originalKelasId && <span>Kelas: {item.originalKelasId}</span>}
                        <span className="text-slate-400">
                          Dihapus: {formatDateTime(item.deletedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for single item */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore([item.id])}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Kembalikan ke data aktif"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Kembalikan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmPermanentDelete({
                          isOpen: true,
                          ids: [item.id],
                          title: `Hapus Permanen ${u.name}?`,
                          description:
                            'Data ini akan dihapus permanen dari server dan tidak dapat dikembalikan lagi.',
                        })
                      }
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Hapus permanen dari tong sampah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permanen</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredTrash.length} dari {trashList.length} data di bak sampah</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Permanent Delete */}
      {confirmPermanentDelete && confirmPermanentDelete.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-rose-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                {confirmPermanentDelete.title}
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {confirmPermanentDelete.description}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(confirmPermanentDelete.ids)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 cursor-pointer transition-colors"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
