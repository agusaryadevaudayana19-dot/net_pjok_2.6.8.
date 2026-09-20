import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Megaphone,
  Pin,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Calendar,
  AlertCircle,
  FileText,
  BookOpen,
  ClipboardList,
  Info,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  Sparkles,
  School,
  Share2,
  Check,
} from 'lucide-react';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';
import { User, Pengumuman, KategoriPengumuman } from '../../types';

interface MuridPengumumanViewProps {
  db: LMSDatabase;
  currentUser: User;
  onNavigate?: (menuId: string, param?: string) => void;
  initialPengumumanId?: string;
  onClearParam?: () => void;
}

export const MuridPengumumanView: React.FC<MuridPengumumanViewProps> = ({
  db,
  currentUser,
  onNavigate,
  initialPengumumanId,
  onClearParam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('SEMUA');
  const [selectedPrioritas, setSelectedPrioritas] = useState<string>('SEMUA');
  const [filterDibaca, setFilterDibaca] = useState<'SEMUA' | 'BELUM_DIBACA' | 'SUDAH_DIBACA'>('SEMUA');
  const [selectedPengumuman, setSelectedPengumuman] = useState<Pengumuman | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Student's class resolution
  const userKelasId = currentUser.kelasId || '';
  const userKelasObj = (db.kelas || []).find((k) => k.id === userKelasId);
  const userKelasNama = userKelasObj?.nama || currentUser.kelasId || '';

  // Get announcements relevant to this student:
  // - TargetRole is 'ALL' or 'MURID' or undefined
  // - TargetKelasId is 'ALL' or matches student's class, or undefined
  const studentAnnouncements = useMemo(() => {
    const list = db.pengumuman || [];
    return list.filter((p) => {
      // Role filter
      if (p.targetRole && p.targetRole !== 'ALL' && p.targetRole !== 'MURID') {
        return false;
      }
      // Class filter
      if (p.targetKelasIds && p.targetKelasIds.length > 0) {
        if (!p.targetKelasIds.includes('ALL')) {
          const matchId = userKelasId && p.targetKelasIds.includes(userKelasId);
          const matchNama =
            userKelasNama &&
            (p.targetKelasNamas?.some((n) => n.toLowerCase() === userKelasNama.toLowerCase()) ||
              p.targetKelasNama?.toLowerCase().includes(userKelasNama.toLowerCase()));
          if (!matchId && !matchNama) {
            return false;
          }
        }
      } else if (p.targetKelasId && p.targetKelasId !== 'ALL') {
        if (userKelasId && p.targetKelasId !== userKelasId) {
          // check if name matches as fallback
          if (!userKelasNama || !p.targetKelasNama || !p.targetKelasNama.toLowerCase().includes(userKelasNama.toLowerCase())) {
            return false;
          }
        }
      }
      return true;
    });
  }, [db.pengumuman, userKelasId, userKelasNama]);

  // Handle Mark As Read
  const handleMarkAsRead = (p: Pengumuman) => {
    dataStorage.markPengumumanDibaca(p.id, currentUser.id);
  };

  const openedInitialIdRef = useRef<string | null>(null);
  const dismissedInitialIdRef = useRef<string | null>(null);

  const handleOpenDetail = (p: Pengumuman) => {
    handleMarkAsRead(p);
    setSelectedPengumuman(p);
  };

  const handleCloseModal = () => {
    if (initialPengumumanId) {
      dismissedInitialIdRef.current = initialPengumumanId;
    }
    setSelectedPengumuman(null);
    if (onClearParam) {
      onClearParam();
    }
  };

  // Keyboard Escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPengumuman) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPengumuman, initialPengumumanId]);

  // Auto-open announcement if requested via notification or parameter
  useEffect(() => {
    if (initialPengumumanId && (db.pengumuman || []).length > 0) {
      if (
        dismissedInitialIdRef.current === initialPengumumanId ||
        openedInitialIdRef.current === initialPengumumanId
      ) {
        return;
      }
      const found = (db.pengumuman || []).find((p) => p.id === initialPengumumanId);
      if (found) {
        openedInitialIdRef.current = initialPengumumanId;
        handleOpenDetail(found);
      }
    }
  }, [initialPengumumanId, db.pengumuman]);

  const handleShare = (p: Pengumuman) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${p.judul} - Pengumuman Guru PJOK: ${p.isi.slice(0, 150)}...`);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Filtered list based on search and filters
  const filteredAnnouncements = useMemo(() => {
    return studentAnnouncements.filter((p) => {
      // Search text filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = p.judul.toLowerCase().includes(query);
        const matchBody = p.isi.toLowerCase().includes(query);
        const matchTeacher = (p.guruNama || '').toLowerCase().includes(query);
        const matchCategory = (p.kategori || '').toLowerCase().includes(query);
        const matchClass = (p.targetKelasNama || '').toLowerCase().includes(query);
        if (!matchTitle && !matchBody && !matchTeacher && !matchCategory && !matchClass) {
          return false;
        }
      }

      // Category filter
      if (selectedKategori !== 'SEMUA') {
        const cat = p.kategori || 'Informasi';
        if (cat.toLowerCase() !== selectedKategori.toLowerCase()) {
          return false;
        }
      }

      // Priority filter
      if (selectedPrioritas !== 'SEMUA') {
        if (selectedPrioritas === 'DISEMATKAN') {
          if (!p.disematkan) return false;
        } else if (p.prioritas !== selectedPrioritas) {
          return false;
        }
      }

      // Read status filter
      const isRead = (p.dibacaOleh || []).includes(currentUser.id);
      if (filterDibaca === 'BELUM_DIBACA' && isRead) return false;
      if (filterDibaca === 'SUDAH_DIBACA' && !isRead) return false;

      return true;
    });
  }, [studentAnnouncements, searchQuery, selectedKategori, selectedPrioritas, filterDibaca, currentUser.id]);

  // Separate pinned (disematkan) vs regular announcements
  const pinnedAnnouncements = useMemo(() => {
    return filteredAnnouncements
      .filter((p) => p.disematkan)
      .sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
  }, [filteredAnnouncements]);

  const regularAnnouncements = useMemo(() => {
    return filteredAnnouncements
      .filter((p) => !p.disematkan)
      .sort((a, b) => new Date(b.tanggalDibuat).getTime() - new Date(a.tanggalDibuat).getTime());
  }, [filteredAnnouncements]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      SEMUA: studentAnnouncements.length,
      Penting: 0,
      Tugas: 0,
      Materi: 0,
      Informasi: 0,
    };
    studentAnnouncements.forEach((p) => {
      const cat = p.kategori || 'Informasi';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts[cat] = 1;
      }
    });
    return counts;
  }, [studentAnnouncements]);

  const unreadCount = useMemo(() => {
    return studentAnnouncements.filter((p) => !(p.dibacaOleh || []).includes(currentUser.id)).length;
  }, [studentAnnouncements, currentUser.id]);

  const totalPinnedCount = useMemo(() => {
    return studentAnnouncements.filter((p) => p.disematkan).length;
  }, [studentAnnouncements]);

  // Helper formatting for date and relative time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WITA';
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Baru saja';
      if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return `${diffDays} hari yang lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const getCategoryBadge = (kategori?: KategoriPengumuman | string) => {
    switch (kategori) {
      case 'Penting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Penting
          </span>
        );
      case 'Tugas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ClipboardList className="w-3 h-3 text-indigo-600" />
            Tugas
          </span>
        );
      case 'Materi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <BookOpen className="w-3 h-3 text-emerald-600" />
            Materi
          </span>
        );
      case 'Informasi':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Info className="w-3 h-3 text-sky-600" />
            Informasi
          </span>
        );
    }
  };

  return (
    <div id="murid-pengumuman-view" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-blue-200 border border-white/10">
              <Megaphone className="w-3.5 h-3.5 text-amber-300" />
              Papan Pengumuman Resmi PJOK
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pengumuman & Informasi Pembelajaran
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Informasi terkini dari Guru PJOK mengenai instruksi praktik lapangan, batas pengumpulan tugas, materi ajar, dan jadwal penting sekolah.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span className="text-xl font-black text-white block">{studentAnnouncements.length}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Total</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span className="text-xl font-black text-amber-300 block">{totalPinnedCount}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Disematkan</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3 text-center min-w-[90px]">
              <span className="text-xl font-black text-emerald-400 block">{unreadCount}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Belum Baca</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Search Bar & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-pengumuman"
              type="text"
              placeholder="Cari pengumuman, topik materi, tugas, atau nama guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <select
              id="select-filter-dibaca"
              value={filterDibaca}
              onChange={(e) => setFilterDibaca(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="SEMUA">Semua Status Baca</option>
              <option value="BELUM_DIBACA">Hanya Belum Dibaca</option>
              <option value="SUDAH_DIBACA">Sudah Dibaca</option>
            </select>

            <select
              id="select-filter-prioritas"
              value={selectedPrioritas}
              onChange={(e) => setSelectedPrioritas(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="SEMUA">Semua Prioritas</option>
              <option value="DISEMATKAN">📌 Hanya Disematkan</option>
              <option value="Mendesak">Mendesak</option>
              <option value="Penting">Penting</option>
              <option value="Biasa">Biasa</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Kategori:
          </span>

          {[
            { id: 'SEMUA', label: 'Semua Kategori', count: categoryCounts.SEMUA },
            { id: 'Penting', label: 'Penting', count: categoryCounts.Penting, dotColor: 'bg-rose-500' },
            { id: 'Tugas', label: 'Tugas', count: categoryCounts.Tugas, dotColor: 'bg-indigo-500' },
            { id: 'Materi', label: 'Materi', count: categoryCounts.Materi, dotColor: 'bg-emerald-500' },
            { id: 'Informasi', label: 'Informasi', count: categoryCounts.Informasi, dotColor: 'bg-sky-500' },
          ].map((cat) => {
            const isSelected = selectedKategori === cat.id;
            return (
              <button
                key={cat.id}
                id={`filter-kategori-${cat.id.toLowerCase()}`}
                type="button"
                onClick={() => setSelectedKategori(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                {cat.dotColor && <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />}
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned Announcements Section (Disematkan) */}
      {pinnedAnnouncements.length > 0 && (
        <div id="section-pinned-announcements" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                <Pin className="w-3.5 h-3.5 fill-amber-700 text-amber-700 rotate-45" />
              </div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                Pengumuman Prioritas Disematkan
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {pinnedAnnouncements.length} Disematkan oleh Guru
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((p) => {
              const isRead = (p.dibacaOleh || []).includes(currentUser.id);
              return (
                <div
                  key={p.id}
                  id={`card-pinned-announcement-${p.id}`}
                  className="bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
                >
                  {/* Top Badges & Pin indicator */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                          <Pin className="w-3 h-3 fill-white rotate-45" />
                          DISEMATKAN
                        </span>
                        {getCategoryBadge(p.kategori)}
                        {!isRead && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                            BARU
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(p.tanggalDibuat)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      onClick={() => handleOpenDetail(p)}
                      className="text-base sm:text-lg font-black text-slate-900 hover:text-blue-600 transition-colors cursor-pointer leading-snug"
                    >
                      {p.judul}
                    </h3>

                    {/* Body Preview */}
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {p.isi}
                    </p>
                  </div>

                  {/* Teacher & Footer Info */}
                  <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          p.guruAvatar ||
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={p.guruNama}
                        className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.guruNama}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {p.guruNip ? `NIP. ${p.guruNip}` : 'Guru PJOK'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleShare(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors"
                        title="Salin pengumuman"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(p)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Baca</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main / Regular Announcements Feed */}
      <div id="section-regular-announcements" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">
            Semua Pengumuman ({filteredAnnouncements.length})
          </h2>
          <span className="text-xs text-slate-400">
            Ditampilkan berurutan dari waktu terbaru
          </span>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Megaphone className="w-7 h-7" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery || selectedKategori !== 'SEMUA' || selectedPrioritas !== 'SEMUA'
                  ? 'Tidak Ada Pengumuman yang Cocok'
                  : 'Belum Ada Pengumuman Terbit'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {searchQuery || selectedKategori !== 'SEMUA' || selectedPrioritas !== 'SEMUA'
                  ? 'Coba atur ulang kata kunci pencarian atau bersihkan filter kategori Anda.'
                  : 'Guru pengampu PJOK belum menerbitkan pengumuman baru untuk rombel kelas ini. Setiap ada instruksi atau materi baru akan langsung disiarkan di halaman ini.'}
              </p>
            </div>
            {(searchQuery || selectedKategori !== 'SEMUA' || selectedPrioritas !== 'SEMUA') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKategori('SEMUA');
                  setSelectedPrioritas('SEMUA');
                  setFilterDibaca('SEMUA');
                }}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((p) => {
              const isRead = (p.dibacaOleh || []).includes(currentUser.id);
              return (
                <div
                  key={p.id}
                  id={`card-announcement-${p.id}`}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all hover:shadow-md space-y-4 ${
                    !isRead
                      ? 'border-blue-200/90 shadow-xs bg-blue-50/20'
                      : 'border-slate-200/80'
                  }`}
                >
                  {/* Top Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(p.kategori)}
                      {p.targetKelasNama ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.targetKelasNama}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Semua Rombel
                        </span>
                      )}
                      {!isRead ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white">
                          BARU
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Sudah Dibaca
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-xs shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDateTime(p.tanggalDibuat)}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {getRelativeTime(p.tanggalDibuat)}
                      </span>
                    </div>
                  </div>

                  {/* Title & Preview Content */}
                  <div>
                    <h3
                      onClick={() => handleOpenDetail(p)}
                      className="text-base sm:text-lg font-black text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {p.judul}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {p.isi}
                    </p>
                  </div>

                  {/* Teacher & Action Bottom Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Teacher Details */}
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.guruAvatar ||
                          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={p.guruNama}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {p.guruNama}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                          <span>{p.guruMataPelajaran || 'Guru PJOK'}</span>
                          {p.guruNip && <span>• NIP. {p.guruNip}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleShare(p)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Bagikan ringkasan pengumuman"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>

                      {p.tautanAksi && onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            handleMarkAsRead(p);
                            if (p.tautanAksi?.menuTarget) {
                              onNavigate(p.tautanAksi.menuTarget, p.tautanAksi.targetId);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <span>{p.tautanAksi.label}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        id={`btn-read-detail-${p.id}`}
                        onClick={() => handleOpenDetail(p)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Baca Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal Popup */}
      {selectedPengumuman && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative my-8 space-y-5">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup Pengumuman"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badges & Meta */}
            <div className="flex flex-wrap items-center gap-2 pr-8">
              {selectedPengumuman.disematkan && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                  <Pin className="w-3 h-3 fill-white rotate-45" />
                  DISEMATKAN
                </span>
              )}
              {getCategoryBadge(selectedPengumuman.kategori)}
              {selectedPengumuman.targetKelasNama ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Target: {selectedPengumuman.targetKelasNama}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Target: Seluruh Murid
                </span>
              )}
            </div>

            {/* Modal Title */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {selectedPengumuman.judul}
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Dipublikasikan pada: {formatDateTime(selectedPengumuman.tanggalDibuat)}
              </p>
            </div>

            {/* Teacher Details Header in Modal */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
              <img
                src={
                  selectedPengumuman.guruAvatar ||
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'
                }
                alt={selectedPengumuman.guruNama}
                className="w-11 h-11 rounded-full object-cover border border-slate-300 shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-extrabold text-slate-800 block">
                  {selectedPengumuman.guruNama}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {selectedPengumuman.guruMataPelajaran || 'Guru Pengampu PJOK'}
                  {selectedPengumuman.guruNip ? ` • NIP. ${selectedPengumuman.guruNip}` : ''}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  Pengunggah Resmi • SMA Negeri 1 Tejakula
                </span>
              </div>
            </div>

            {/* Full Body Text */}
            <div className="text-sm text-slate-700 leading-relaxed space-y-3 whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100 max-h-96 overflow-y-auto">
              {selectedPengumuman.isi}
            </div>

            {/* Attachment Link if any */}
            {selectedPengumuman.lampiranUrl && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-blue-900 min-w-0">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold truncate">
                    {selectedPengumuman.namaLampiran || 'Dokumen / Tautan Lampiran Pengumuman'}
                  </span>
                </div>
                <a
                  href={selectedPengumuman.lampiranUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1"
                >
                  <span>Buka</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Telah ditandai sudah dibaca
              </span>

              <div className="flex items-center gap-2">
                {selectedPengumuman.tautanAksi && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseModal();
                      if (selectedPengumuman.tautanAksi?.menuTarget) {
                        onNavigate(selectedPengumuman.tautanAksi.menuTarget, selectedPengumuman.tautanAksi.targetId);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedPengumuman.tautanAksi.label}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
