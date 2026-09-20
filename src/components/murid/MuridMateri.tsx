import React, { useState } from 'react';
import {
  BookOpen,
  Video,
  FileText,
  Search,
  CheckCircle2,
  X,
  Play,
  Target,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
  Eye,
} from 'lucide-react';
import { Materi, User } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { InAppMediaModal, parseMediaUrl } from '../shared/InAppMediaModal';
import { FormattedMateriText } from '../shared/FormattedMateriText';
import { downloadMateriOffline } from '../../utils/fileUploadTemplates';
import {
  getMateriCategoryList,
  isMateriCategoryMatch,
} from '../../utils/materiCategoryUtils';

interface MuridMateriProps {
  db: LMSDatabase;
  currentUser?: User;
  initialMateriId?: string;
  onClearParam?: () => void;
}

export const MuridMateri: React.FC<MuridMateriProps> = ({ db, currentUser, initialMateriId, onClearParam }) => {
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMateri, setActiveMateri] = useState<Materi | null>(
    initialMateriId ? (db.materi || []).find((m) => m.id === initialMateriId) || null : null
  );

  const openedInitialIdRef = React.useRef<string | null>(null);
  const dismissedInitialIdRef = React.useRef<string | null>(null);

  const handleCloseModal = () => {
    if (initialMateriId) {
      dismissedInitialIdRef.current = initialMateriId;
    }
    setActiveMateri(null);
    if (onClearParam) {
      onClearParam();
    }
  };

  // Keyboard Escape listener to close materi modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMateri) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMateri, initialMateriId]);

  // Respond to initialMateriId prop dynamically
  React.useEffect(() => {
    if (initialMateriId && (db.materi || []).length > 0) {
      if (
        dismissedInitialIdRef.current === initialMateriId ||
        openedInitialIdRef.current === initialMateriId
      ) {
        return;
      }
      const found = (db.materi || []).find((m) => m.id === initialMateriId);
      if (found) {
        openedInitialIdRef.current = initialMateriId;
        setActiveMateri(found);
      }
    }
  }, [initialMateriId, db.materi]);

  // In-app media viewer modal state
  const [inAppMedia, setInAppMedia] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  // Dynamically synchronized categories from DB + standard PJOK categories
  const categories = getMateriCategoryList(db.materi);

  const getCategoryCount = (cat: string) => {
    if (cat === 'Semua') {
      return (db.materi || []).filter((m) => m.status === 'Publish' || !m.status).length;
    }
    return (db.materi || []).filter(
      (m) => (m.status === 'Publish' || !m.status) && isMateriCategoryMatch(m, cat)
    ).length;
  };

  const filteredMateri = (db.materi || []).filter((m) => {
    if (m.status && m.status !== 'Publish') return false;
    const matchCat = isMateriCategoryMatch(m, selectedKategori);
    const matchQuery =
      !searchQuery.trim() ||
      m.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.kategori && m.kategori.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.tujuanPembelajaran && m.tujuanPembelajaran.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.materiInti && m.materiInti.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.kontenTeks && m.kontenTeks.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const openInAppMedia = (url: string, title: string, category?: string) => {
    setInAppMedia({
      isOpen: true,
      url,
      title,
      category,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Materi Pembelajaran PJOK
          </h2>
          <p className="text-xs text-slate-500">
            Capaian & tujuan pembelajaran, uraian konsep gerak, dan materi inti PJOK Fase F
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari materi voli, basket, senam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Category Pills (Sinkron dengan kategori Admin & Guru) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const count = getCategoryCount(cat);
          const isSelected = selectedKategori === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedKategori(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty State jika tidak ada materi pada kategori yang dipilih */}
      {filteredMateri.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Tidak Ada Materi Pembelajaran
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `Tidak ditemukan materi dengan kata kunci "${searchQuery}".`
                : `Belum ada modul materi pada kategori "${selectedKategori}".`}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedKategori('Semua');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            Tampilkan Semua Materi
          </button>
        </div>
      )}

      {/* Materi Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMateri.map((m) => {
          const materiIntiText = m.materiInti || m.kontenTeks || m.konten || '';
          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    {m.kategori}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{m.dibuatPada}</span>
                </div>

                <div>
                  {m.gambarUrl && (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2">
                      <img
                        src={m.gambarUrl}
                        alt={m.judul}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h3 className="font-extrabold text-sm text-slate-800 leading-snug">{m.judul}</h3>
                  {(m.topikSubMateri || m.subJudul) && (
                    <p className="text-xs font-bold text-emerald-700 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-normal">Topik/Sub: </span>
                      {m.topikSubMateri || m.subJudul}
                    </p>
                  )}
                </div>

                {/* 1. Capaian & Tujuan Pembelajaran (Paling di atas) */}
                {m.tujuanPembelajaran && (
                  <div className="p-3 bg-emerald-50/70 rounded-xl text-[11px] text-emerald-950 border border-emerald-100/90">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider mb-1">
                      <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Capaian & Tujuan Pembelajaran:</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed text-emerald-900/90">
                      {m.tujuanPembelajaran}
                    </p>
                  </div>
                )}

                {/* 2. Uraian Materi & Konsep Gerak (Setelah Capaian & Tujuan) */}
                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-700 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Uraian Materi & Konsep Gerak:</span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-slate-600">{m.deskripsi}</p>
                </div>

                {/* 3. Materi Inti (Setelah Uraian Materi) */}
                {materiIntiText && (
                  <div className="p-3 bg-indigo-50/50 rounded-xl text-[11px] text-indigo-950 border border-indigo-100/80">
                    <div className="flex items-center gap-1.5 text-indigo-800 font-bold text-[10px] uppercase tracking-wider mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Materi Inti:</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed text-indigo-900/80">
                      {materiIntiText.replace(/###|\*\*|#/g, '')}
                    </p>
                  </div>
                )}

                {/* 4. Kolom & Sub-Materi Tambahan jika ada */}
                {m.kolomKustom && m.kolomKustom.length > 0 && (
                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>{m.kolomKustom.length} Sub-Materi / Kolom Tambahan</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.kolomKustom.map((col, idx) => (
                        <span
                          key={col.id || idx}
                          className="px-2 py-0.5 bg-white border border-amber-200 rounded-md text-[10px] font-semibold text-amber-900 inline-flex items-center gap-1"
                        >
                          {col.gambarUrl && <span title="Ada gambar ilustrasi">🖼️</span>}
                          <span>{col.label} {col.subJudul ? `• ${col.subJudul}` : ''}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {m.videoUrl && (
                    <button
                      type="button"
                      onClick={() => openInAppMedia(m.videoUrl!, `Video: ${m.judul}`, 'Video PJOK')}
                      className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
                      title="Tonton Video di Aplikasi"
                    >
                      <Play className="w-3 h-3 fill-rose-600" />
                      <span className="hidden sm:inline">Video</span>
                    </button>
                  )}
                  {m.fileUrl && (
                    <button
                      type="button"
                      onClick={() => openInAppMedia(m.fileUrl!, `Dokumen: ${m.judul}`, 'Modul & Dokumen')}
                      className="p-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold hover:bg-sky-100 transition-colors flex items-center gap-1"
                      title="Buka Dokumen di Aplikasi"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="hidden sm:inline">Modul</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadMateriOffline(m)}
                    className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    title="Unduh Materi Lengkap untuk Belajar Offline"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Unduh Materi</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveMateri(m)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Pelajari Lengkap
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reader / In-App Player Modal */}
      {activeMateri && (
        <div
          id="materi-reader-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div
            id="materi-reader-modal"
            className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative my-6 max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                    {activeMateri.kategori}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold">
                    Kurikulum Merdeka • Fase F
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 mt-2">
                  {activeMateri.judul}
                </h3>
                {(activeMateri.topikSubMateri || activeMateri.subJudul) && (
                  <p className="text-xs font-bold text-emerald-700 mt-0.5">
                    <span className="text-[11px] text-slate-400 font-normal">Topik/Sub: </span>
                    {activeMateri.topikSubMateri || activeMateri.subJudul}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pengampu:{' '}
                  <span className="font-semibold text-slate-600">
                    {activeMateri.guruNama || activeMateri.dibuatOleh || 'Guru PJOK'}
                  </span>{' '}
                  • {activeMateri.dibuatPada || 'T.A 2025/2026'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadMateriOffline(activeMateri)}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Simpan Modul ke Perangkat (Offline)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Materi</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Strictly ordered: 1. Capaian & Tujuan, 2. Uraian & Konsep Gerak, 3. Materi Inti */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              {/* Gambar Materi jika ada */}
              {activeMateri.gambarUrl && (
                <div className="w-full max-h-72 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                  <img
                    src={activeMateri.gambarUrl}
                    alt={activeMateri.judul}
                    className="w-full h-full object-contain max-h-72"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* 1. Capaian & Tujuan Pembelajaran (Paling di atas) */}
              {activeMateri.tujuanPembelajaran && (
                <div className="p-4 bg-emerald-50/75 rounded-2xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span>1. Capaian & Tujuan Pembelajaran (IKTP)</span>
                  </div>
                  <div className="pl-8">
                    <FormattedMateriText content={activeMateri.tujuanPembelajaran} justify />
                  </div>
                </div>
              )}

              {/* 2. Uraian Materi & Konsep Gerak (Setelah Capaian & Tujuan) */}
              {activeMateri.deskripsi && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span>2. Uraian Materi & Konsep Gerak</span>
                  </div>
                  <div className="pl-8">
                    <FormattedMateriText content={activeMateri.deskripsi} justify />
                  </div>
                </div>
              )}

              {/* 3. Materi Inti (Setelah Uraian Materi) */}
              {(activeMateri.materiInti || activeMateri.kontenTeks || activeMateri.konten) && (
                <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider mb-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span>3. Materi Inti & Panduan Pelaksanaan Teknik</span>
                  </div>
                  <div className="pl-8">
                    <FormattedMateriText
                      content={activeMateri.materiInti || activeMateri.kontenTeks || activeMateri.konten || ''}
                      justify
                    />
                  </div>
                </div>
              )}

              {/* 4. Kolom & Sub-Materi Tambahan jika ada */}
              {activeMateri.kolomKustom && activeMateri.kolomKustom.length > 0 && (
                <div className="space-y-3">
                  {activeMateri.kolomKustom.map((kolom, idx) => (
                    <div
                      key={kolom.id || idx}
                      className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2.5 w-full max-w-full min-w-0 overflow-hidden break-words"
                    >
                      <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
                        <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 text-[11px] font-black">
                          {idx + 4}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="break-words">{kolom.label}</span>
                          {kolom.subJudul && (
                            <span className="block text-[10px] font-normal text-amber-800 normal-case break-words">
                              {kolom.subJudul}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ada Gambar Pendukung Kolom */}
                      {kolom.gambarUrl && (
                        <div className="pl-8">
                          <div
                            className="w-full rounded-xl overflow-hidden bg-slate-900 border border-amber-300 shadow-2xs flex items-center justify-center max-h-64 cursor-pointer group relative"
                            onClick={() =>
                              openInAppMedia(
                                kolom.gambarUrl!,
                                `Ilustrasi: ${kolom.label}`,
                                'Gambar Gerak Kolom Tambahan'
                              )
                            }
                            title="Klik untuk memperbesar gambar"
                          >
                            <img
                              src={kolom.gambarUrl}
                              alt={kolom.label}
                              className="max-h-64 w-auto max-w-full object-contain group-hover:scale-101 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs">
                              <Eye className="w-3 h-3" />
                              <span>Klik Perbesar</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-amber-800/80 font-medium italic mt-1 text-center">
                            Ilustrasi Pendukung: {kolom.label}
                          </p>
                        </div>
                      )}

                      {/* Isi Uraian Materi Kolom */}
                      <div className="pl-8 pt-0.5 w-full max-w-full min-w-0 overflow-hidden break-words">
                        <FormattedMateriText content={kolom.isi} justify />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* In-App YouTube Video Player (Embedded directly inside modal) */}
              {activeMateri.videoUrl && (
                <div className="p-4 bg-slate-950 text-white rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">Video Tutorial Peragaan Gerak</h4>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          • Diputar langsung di dalam aplikasi
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openInAppMedia(
                          activeMateri.videoUrl!,
                          `Video Tutorial: ${activeMateri.judul}`,
                          'YouTube PJOK'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Perbesar Layar
                    </button>
                  </div>

                  {/* Responsive In-App Iframe */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800">
                    <iframe
                      src={parseMediaUrl(activeMateri.videoUrl).embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={`Video Peragaan: ${activeMateri.judul}`}
                    />
                  </div>
                </div>
              )}

              {/* In-App Google Drive / Document View */}
              {activeMateri.fileUrl && (
                <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-sky-950 truncate">
                        Modul & Dokumen Pendukung
                      </h4>
                      <p className="text-[10px] text-sky-700 truncate font-mono">
                        {activeMateri.fileUrl}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openInAppMedia(
                        activeMateri.fileUrl!,
                        `Dokumen: ${activeMateri.judul}`,
                        'Modul / PDF'
                      )
                    }
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" /> Buka di Aplikasi
                  </button>
                </div>
              )}

              {/* Aktivitas Gerak / Instruksi Praktik Murid jika ada */}
              {activeMateri.aktivitasMurid && (
                <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-extrabold text-[10px] text-amber-800 uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instruksi Latihan / Praktik Mandiri:</span>
                  </div>
                  <p className="leading-relaxed pl-5">{activeMateri.aktivitasMurid}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => downloadMateriOffline(activeMateri)}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Unduh Materi (Belajar Offline)
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Media Viewer Modal (YouTube, Google Drive, Modul PDF, etc.) */}
      <InAppMediaModal
        isOpen={inAppMedia.isOpen}
        onClose={() => setInAppMedia((prev) => ({ ...prev, isOpen: false }))}
        url={inAppMedia.url}
        title={inAppMedia.title}
        category={inAppMedia.category}
      />
    </div>
  );
};
