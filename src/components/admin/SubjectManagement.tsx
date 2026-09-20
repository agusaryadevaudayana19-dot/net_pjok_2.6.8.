import React, { useState } from 'react';
import { BookOpen, Plus, Edit2, Trash2, UserCheck, Calendar, Award } from 'lucide-react';
import { MataPelajaran } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface SubjectManagementProps {
  db: LMSDatabase;
}

export const SubjectManagement: React.FC<SubjectManagementProps> = ({ db }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);

  const guruList = db.users.filter((u) => u.role === 'GURU');

  const [formData, setFormData] = useState<Partial<MataPelajaran>>({
    nama: 'PJOK',
    fase: 'F',
    tingkat: 'Kelas XI',
    tahunPelajaran: '2026/2027',
    guruPengampuId: guruList[0]?.id || '',
  });

  const handleOpenAdd = () => {
    setEditingMapel(null);
    setFormData({
      nama: 'PJOK',
      fase: 'F',
      tingkat: 'Kelas XI',
      tahunPelajaran: '2026/2027',
      guruPengampuId: guruList[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mp: MataPelajaran) => {
    setEditingMapel(mp);
    setFormData(mp);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus konfigurasi mata pelajaran ini?')) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        mataPelajaran: prev.mataPelajaran.filter((m) => m.id !== id),
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const guru = guruList.find((g) => g.id === formData.guruPengampuId);

    if (editingMapel) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        mataPelajaran: prev.mataPelajaran.map((m) =>
          m.id === editingMapel.id
            ? {
                ...m,
                ...formData,
                guruPengampuNama: guru?.name || m.guruPengampuNama,
              } as MataPelajaran
            : m
        ),
      }));
    } else {
      const newMapel: MataPelajaran = {
        id: `mp-${Date.now()}`,
        nama: formData.nama || 'PJOK',
        fase: (formData.fase as any) || 'F',
        tingkat: formData.tingkat || 'Kelas XI',
        tahunPelajaran: formData.tahunPelajaran || '2026/2027',
        guruPengampuId: formData.guruPengampuId || '',
        guruPengampuNama: guru?.name || 'Guru Pengampu',
      };

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        mataPelajaran: [...prev.mataPelajaran, newMapel],
      }));
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Manajemen Mata Pelajaran PJOK
          </h2>
          <p className="text-xs text-slate-500">
            Pengaturan kurikulum merdeka (Fase E & F), capaian pembelajaran, dan penugasan guru
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Alokasi Mapel
        </button>
      </div>

      {db.mataPelajaran.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-bold text-slate-800">Alokasi Mapel Bersih (Kosong)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Belum ada konfigurasi alokasi mata pelajaran. Silakan tambahkan alokasi mapel PJOK per tingkat fase melalui tombol di atas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Alokasi Mapel Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.mataPelajaran.map((mp) => (
            <div
              key={mp.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-base">
                    {mp.nama}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800">{mp.nama}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[11px] font-bold">
                        Fase {mp.fase}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{mp.tingkat}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(mp)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(mp.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tahun Pelajaran:</span>
                  <span className="font-bold text-slate-800">{mp.tahunPelajaran}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Guru Pengampu:</span>
                  <span className="font-bold text-emerald-700">{mp.guruPengampuNama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Kurikulum:</span>
                  <span className="text-slate-700 font-medium">
                    Kurikulum Merdeka (Capaian Pembelajaran PJOK Terintegrasi)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">
              {editingMapel ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran PJOK'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="PJOK"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Fase Kurikulum
                  </label>
                  <select
                    value={formData.fase || 'F'}
                    onChange={(e) => setFormData({ ...formData, fase: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="E">Fase E (Kelas X)</option>
                    <option value="F">Fase F (Kelas XI & XII)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Tingkat / Kelas
                  </label>
                  <input
                    type="text"
                    value={formData.tingkat || 'Kelas XI'}
                    onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Guru Pengampu
                </label>
                <select
                  value={formData.guruPengampuId || ''}
                  onChange={(e) => setFormData({ ...formData, guruPengampuId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-emerald-800"
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
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={formData.tahunPelajaran || '2026/2027'}
                  onChange={(e) => setFormData({ ...formData, tahunPelajaran: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
