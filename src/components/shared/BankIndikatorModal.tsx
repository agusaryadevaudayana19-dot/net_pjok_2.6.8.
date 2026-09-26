import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import { IndikatorPenilaianItem } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface BankIndikatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: LMSDatabase;
  onSelectIndicator?: (indicator: IndikatorPenilaianItem) => void;
  initialMateri?: string;
}

export const BankIndikatorModal: React.FC<BankIndikatorModalProps> = ({
  isOpen,
  onClose,
  db,
  onSelectIndicator,
  initialMateri = '',
}) => {
  const [filterMateri, setFilterMateri] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State according to user specification:
  // JUDUL PENILAIAN
  // MATERI PEMBELAJARAN
  // PERNYATAAN INDIKATOR YANG DI NILAI
  // URUTKAN INDIKATOR
  // STATUS (AKTIF, NON AKTIF)
  // DESKRIPSI SKALA PENILAIAN (1-4)
  // SKALA 1 - PERLU BOMBINGAN (ISIANNYA KETIK MANUAL)
  // SKALA 2 MULAI BERKEMBANG( KETIK MANUAL ISIANNYA)
  // SKAL 3 - BERKEMBANG SESUAI DENGAN HARAPAN
  // SKLAA 4 - BERKEMANG SANGAT BAIK
  const [judulPenilaian, setJudulPenilaian] = useState('');
  const [materiPembelajaran, setMateriPembelajaran] = useState(initialMateri);
  const [pernyataanIndikator, setPernyataanIndikator] = useState('');
  const [urutan, setUrutan] = useState<number>(1);
  const [status, setStatus] = useState<'AKTIF' | 'NON AKTIF'>('AKTIF');
  const [skala1, setSkala1] = useState('');
  const [skala2, setSkala2] = useState('');
  const [skala3, setSkala3] = useState('');
  const [skala4, setSkala4] = useState('');

  if (!isOpen) return null;

  const indicators = db.bankIndikatorPenilaian || [];

  const handleOpenAdd = () => {
    setEditingId(null);
    setJudulPenilaian('');
    setMateriPembelajaran(initialMateri || '');
    setPernyataanIndikator('');
    setUrutan(indicators.length + 1);
    setStatus('AKTIF');
    setSkala1('');
    setSkala2('');
    setSkala3('');
    setSkala4('');
    setIsEditing(true);
  };

  const handleOpenEdit = (item: IndikatorPenilaianItem) => {
    setEditingId(item.id);
    setJudulPenilaian(item.judulPenilaian);
    setMateriPembelajaran(item.materiPembelajaran);
    setPernyataanIndikator(item.pernyataanIndikator);
    setUrutan(item.urutan || 1);
    setStatus(item.status);
    setSkala1(item.skala1PerluBimbingan);
    setSkala2(item.skala2MulaiBerkembang);
    setSkala3(item.skala3BerkembangSesuaiHarapan);
    setSkala4(item.skala4BerkembangSangatBaik);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Hapus indikator ini dari Bank Indikator?')) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      bankIndikatorPenilaian: (prev.bankIndikatorPenilaian || []).filter((i) => i.id !== id),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulPenilaian.trim()) {
      alert('Harap isi Judul Penilaian!');
      return;
    }
    if (!pernyataanIndikator.trim()) {
      alert('Harap isi Pernyataan Indikator yang Dinilai!');
      return;
    }

    const newItem: IndikatorPenilaianItem = {
      id: editingId || `ind-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      judulPenilaian: judulPenilaian.trim(),
      materiPembelajaran: materiPembelajaran.trim() || 'PJOK Umum',
      pernyataanIndikator: pernyataanIndikator.trim(),
      urutan: Number(urutan) || 1,
      status,
      skala1PerluBimbingan: skala1.trim() || 'Perlu bimbingan dan pemahaman lebih lanjut.',
      skala2MulaiBerkembang: skala2.trim() || 'Mulai berkembang namun gerakan belum konsisten.',
      skala3BerkembangSesuaiHarapan: skala3.trim() || 'Berkembang sesuai dengan harapan dengan baik.',
      skala4BerkembangSangatBaik: skala4.trim() || 'Berkembang sangat baik, tepat dan mandiri.',
      updatedAt: new Date().toISOString(),
      createdAt: editingId ? undefined : new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      const list = [...(prev.bankIndikatorPenilaian || [])];
      if (editingId) {
        const idx = list.findIndex((i) => i.id === editingId);
        if (idx >= 0) list[idx] = { ...list[idx], ...newItem };
      } else {
        list.push(newItem);
      }
      return { ...prev, bankIndikatorPenilaian: list };
    });

    if (onSelectIndicator) {
      onSelectIndicator(newItem);
    }

    setIsEditing(false);
  };

  const filtered = indicators
    .filter((item) => {
      if (filterMateri !== 'ALL' && item.materiPembelajaran !== filterMateri) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (
        search &&
        !item.judulPenilaian.toLowerCase().includes(search.toLowerCase()) &&
        !item.pernyataanIndikator.toLowerCase().includes(search.toLowerCase()) &&
        !item.materiPembelajaran.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.urutan || 1) - (b.urutan || 1));

  const uniqueMateri = Array.from(
    new Set(indicators.map((i) => i.materiPembelajaran).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Bank Indikator Penilaian Antar Teman
              </h2>
              <p className="text-xs text-slate-500">
                Kelola rubrik capaian gerak skala 1-4 untuk instrumen asesmen antar rekan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isEditing ? (
            /* Form Input Manual Indikator Baru / Edit */
            <form onSubmit={handleSave} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {editingId ? 'Edit Indikator Penilaian' : 'Input Manual Indikator Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* JUDUL PENILAIAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    JUDUL PENILAIAN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sikap & Perkenaan Passing Bawah"
                    value={judulPenilaian}
                    onChange={(e) => setJudulPenilaian(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* MATERI PEMBELAJARAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    MATERI PEMBELAJARAN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Permainan Bola Voli"
                    value={materiPembelajaran}
                    onChange={(e) => setMateriPembelajaran(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* PERNYATAAN INDIKATOR YANG DI NILAI */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PERNYATAAN INDIKATOR YANG DI NILAI <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Deskripsikan fokus capaian yang diamati teman, contoh: Mengambil posisi siap, lutut ditekuk, dan memantulkan bola tepat pada lengan bawah lurus."
                  value={pernyataanIndikator}
                  onChange={(e) => setPernyataanIndikator(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* URUTKAN INDIKATOR */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URUTKAN INDIKATOR (Nomor Urut)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={urutan}
                    onChange={(e) => setUrutan(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    STATUS INDIKATOR
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'AKTIF' | 'NON AKTIF')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="AKTIF">AKTIF (Dapat Dipilih ke Tugas)</option>
                    <option value="NON AKTIF">NON AKTIF</option>
                  </select>
                </div>
              </div>

              {/* DESKRIPSI SKALA PENILAIAN (1-4) KETIK MANUAL */}
              <div className="pt-2 border-t border-slate-200">
                <span className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">
                  DESKRIPSI SKALA PENILAIAN (1 - 4)
                </span>
                <div className="space-y-3">
                  {/* SKALA 1 */}
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200/80">
                    <label className="block text-[11px] font-black text-rose-800 mb-1">
                      SKALA 1 - PERLU BIMBINGAN <span className="text-slate-400 font-normal">(Ketik Manual Isiannya)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Belum menekuk lutut dan tangan masih terbuka/tertekuk saat memantulkan bola."
                      value={skala1}
                      onChange={(e) => setSkala1(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* SKALA 2 */}
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80">
                    <label className="block text-[11px] font-black text-amber-800 mb-1">
                      SKALA 2 - MULAI BERKEMBANG <span className="text-slate-400 font-normal">(Ketik Manual Isiannya)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Lutut sudah ditekuk namun ayunan lengan masih terlalu tinggi melebihi bahu."
                      value={skala2}
                      onChange={(e) => setSkala2(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* SKALA 3 */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200/80">
                    <label className="block text-[11px] font-black text-sky-800 mb-1">
                      SKALA 3 - BERKEMBANG SESUAI DENGAN HARAPAN <span className="text-slate-400 font-normal">(Ketik Manual Isiannya)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Posisi badan siap, kedua lengan lurus rapat, pantulan bola stabil ke arah rekan."
                      value={skala3}
                      onChange={(e) => setSkala3(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* SKALA 4 */}
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80">
                    <label className="block text-[11px] font-black text-emerald-800 mb-1">
                      SKALA 4 - BERKEMBANG SANGAT BAIK <span className="text-slate-400 font-normal">(Ketik Manual Isiannya)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kuda-kuda sangat stabil, perkenaan tepat di sweet spot lengan bawah, akurasi operan sempurna."
                      value={skala4}
                      onChange={(e) => setSkala4(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan ke Bank Indikator</span>
                </button>
              </div>
            </form>
          ) : (
            /* Toolbar & List Indikator */
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <input
                    type="text"
                    placeholder="Cari indikator atau materi..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 min-w-[160px] focus:outline-hidden focus:bg-white"
                  />
                  {uniqueMateri.length > 0 && (
                    <select
                      value={filterMateri}
                      onChange={(e) => setFilterMateri(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      <option value="ALL">Semua Materi</option>
                      {uniqueMateri.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="AKTIF">Hanya Aktif</option>
                    <option value="NON AKTIF">Non Aktif</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Indikator Baru Manual</span>
                </button>
              </div>

              {/* Indicator Items List */}
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Belum ada indikator yang sesuai kriteria</p>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs hover:bg-indigo-100 cursor-pointer"
                  >
                    + Buat Indikator Manual Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black flex items-center justify-center shrink-0">
                            #{item.urutan}
                          </span>
                          <h4 className="text-xs font-black text-slate-900">{item.judulPenilaian}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            {item.materiPembelajaran}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              item.status === 'AKTIF'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {onSelectIndicator && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectIndicator(item);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              Pilih Indikator Ini
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Edit Indikator"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus Indikator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.pernyataanIndikator}
                      </p>

                      {/* 4 Rubric Description Boxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                          <span className="font-black text-rose-800 block text-[10px] mb-0.5">
                            1. Perlu Bimbingan
                          </span>
                          <span className="text-slate-600">{item.skala1PerluBimbingan || '-'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                          <span className="font-black text-amber-800 block text-[10px] mb-0.5">
                            2. Mulai Berkembang
                          </span>
                          <span className="text-slate-600">{item.skala2MulaiBerkembang || '-'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-sky-50/60 border border-sky-100">
                          <span className="font-black text-sky-800 block text-[10px] mb-0.5">
                            3. Sesuai Harapan
                          </span>
                          <span className="text-slate-600">{item.skala3BerkembangSesuaiHarapan || '-'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                          <span className="font-black text-emerald-800 block text-[10px] mb-0.5">
                            4. Sangat Baik
                          </span>
                          <span className="text-slate-600">{item.skala4BerkembangSangatBaik || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
