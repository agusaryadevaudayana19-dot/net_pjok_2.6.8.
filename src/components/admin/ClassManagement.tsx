import React, { useState } from 'react';
import { School, Plus, Edit2, Trash2, Users, CheckCircle, X } from 'lucide-react';
import { Kelas } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface ClassManagementProps {
  db: LMSDatabase;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ db }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);

  const [formData, setFormData] = useState<Partial<Kelas>>({
    nama: '',
    tingkat: 'XI',
    waliKelasId: db.users.find((u) => u.role === 'GURU')?.id || '',
    guruPengampuId: db.users.find((u) => u.role === 'GURU')?.id || '',
    tahunPelajaran: '2026/2027',
    totalMurid: 32,
  });

  const guruList = db.users.filter((u) => u.role === 'GURU');

  const handleOpenAdd = () => {
    setEditingKelas(null);
    setFormData({
      nama: `XI ${db.kelas.length + 1}`,
      tingkat: 'XI',
      waliKelasId: guruList[0]?.id || '',
      guruPengampuId: guruList[0]?.id || '',
      tahunPelajaran: '2026/2027',
      totalMurid: 32,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (k: Kelas) => {
    setEditingKelas(k);
    setFormData(k);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, nama: string) => {
    if (window.confirm(`Hapus kelas ${nama}?`)) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        kelas: prev.kelas.filter((k) => k.id !== id),
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const wali = guruList.find((g) => g.id === formData.waliKelasId);
    const pengampu = guruList.find((g) => g.id === formData.guruPengampuId);

    if (editingKelas) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        kelas: prev.kelas.map((k) =>
          k.id === editingKelas.id
            ? {
                ...k,
                ...formData,
                waliKelasNama: wali?.name || k.waliKelasNama,
                guruPengampuNama: pengampu?.name || k.guruPengampuNama,
              } as Kelas
            : k
        ),
      }));
    } else {
      const newKelas: Kelas = {
        id: `cls-${formData.nama?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        nama: formData.nama || 'XI Baru',
        tingkat: (formData.tingkat as any) || 'XI',
        waliKelasId: formData.waliKelasId || '',
        waliKelasNama: wali?.name || 'Guru Wali',
        guruPengampuId: formData.guruPengampuId || '',
        guruPengampuNama: pengampu?.name || 'Guru PJOK',
        tahunPelajaran: formData.tahunPelajaran || '2026/2027',
        totalMurid: Number(formData.totalMurid) || 30,
      };

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        kelas: [...prev.kelas, newKelas],
      }));
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Manajemen Rombongan Belajar (Kelas)
          </h2>
          <p className="text-xs text-slate-500">
            Daftar kelas aktif, alokasi wali kelas, dan guru pengampu mapel PJOK
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          id="btn-add-class"
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Kelas Baru
        </button>
      </div>

      {/* Class Cards Grid */}
      {db.kelas.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <School className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-slate-800">Semua Data Kelas Bersih (Kosong)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Database kelas saat ini masih kosong sesuai permintaan reset. Silakan tambahkan kelas secara manual menggunakan tombol di atas atau melalui unggah data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.kelas.map((k) => {
            const actualStudents = db.users.filter((u) => u.kelasId === k.id).length;
            return (
              <div
                key={k.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-extrabold text-sm">
                        {k.nama}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800 leading-tight">
                          Kelas {k.nama}
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Tingkat {k.tingkat} • TP {k.tahunPelajaran}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(k)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        title="Edit Kelas"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(k.id, k.nama)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Wali Kelas:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                        {k.waliKelasNama}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Guru PJOK:</span>
                      <span className="font-semibold text-emerald-700 truncate max-w-[170px]">
                        {k.guruPengampuNama}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Jumlah Murid:</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {actualStudents > 0 ? actualStudents : k.totalMurid} Murid
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.round(((actualStudents || k.totalMurid) / 36) * 100))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editingKelas ? 'Edit Rombel Kelas' : 'Tambah Rombel Kelas Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nama Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: XI 8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tingkat
                  </label>
                  <select
                    value={formData.tingkat || 'XI'}
                    onChange={(e) => setFormData({ ...formData, tingkat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Wali Kelas
                </label>
                <select
                  value={formData.waliKelasId || ''}
                  onChange={(e) => setFormData({ ...formData, waliKelasId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Guru Pengampu PJOK
                </label>
                <select
                  value={formData.guruPengampuId || ''}
                  onChange={(e) => setFormData({ ...formData, guruPengampuId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-emerald-800"
                >
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.mataPelajaran || 'PJOK'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Kapasitas Murid
                  </label>
                  <input
                    type="number"
                    value={formData.totalMurid || 32}
                    onChange={(e) => setFormData({ ...formData, totalMurid: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tahun Pelajaran
                  </label>
                  <input
                    type="text"
                    value={formData.tahunPelajaran || '2026/2027'}
                    onChange={(e) => setFormData({ ...formData, tahunPelajaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
