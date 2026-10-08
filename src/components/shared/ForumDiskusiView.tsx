import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  ThumbsUp,
  Pin,
  Trash2,
  Search,
  Filter,
  Users,
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle2,
  X,
  MessageCircle,
  GraduationCap,
  Shield,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Reply,
  CornerDownRight,
} from 'lucide-react';
import {
  User,
  ForumDiskusiTopik,
  ForumDiskusiBalasan,
  KategoriForumDiskusi,
  resolveKelasId,
} from '../../types';
import { LMSDatabase, dataStorage } from '../../services/dataStorage';

interface ForumDiskusiViewProps {
  db: LMSDatabase;
  currentUser: User;
  initialTopikId?: string;
}

const KATEGORI_LIST: KategoriForumDiskusi[] = [
  'Umum & Tanya Jawab',
  'Materi & Teknik Olahraga',
  'Tugas & Praktik',
  'Kebugaran & Kesehatan',
  'Turnamen & Ekstrakurikuler',
];

export const ForumDiskusiView: React.FC<ForumDiskusiViewProps> = ({
  db,
  currentUser,
  initialTopikId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');
  const [expandedTopikIds, setExpandedTopikIds] = useState<Record<string, boolean>>(() =>
    initialTopikId ? { [initialTopikId]: true } : {}
  );

  // State modal buat topik diskusi baru
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [judulBaru, setJudulBaru] = useState('');
  const [isiBaru, setIsiBaru] = useState('');
  const [kategoriBaru, setKategoriBaru] = useState<KategoriForumDiskusi>('Umum & Tanya Jawab');
  const [kelasTargetBaru, setKelasTargetBaru] = useState<string>('ALL');
  const [materiTerkaitBaru, setMateriTerkaitBaru] = useState<string>('');
  const [sematkanBaru, setSematkanBaru] = useState<boolean>(false);

  // State input komentar utama per topik
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // State untuk fitur Balas pada setiap komentar
  const [activeCommentReply, setActiveCommentReply] = useState<{
    topikId: string;
    balasanId: string;
    authorNama: string;
    isiSingkat: string;
  } | null>(null);
  const [commentReplyText, setCommentReplyText] = useState<string>('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'topik' | 'balasan';
    topikId: string;
    balasanId?: string;
    title: string;
  } | null>(null);

  const currentUserKelasNama = useMemo(() => {
    if (currentUser.role !== 'MURID' || !currentUser.kelasId) return '';
    return resolveKelasId(currentUser.kelasId, db.kelas || []).nama;
  }, [currentUser, db.kelas]);

  const forumList: ForumDiskusiTopik[] = useMemo(() => {
    const raw = Array.isArray(db.forumDiskusi) ? db.forumDiskusi : [];
    return [...raw].sort((a, b) => {
      if (a.disematkan && !b.disematkan) return -1;
      if (!a.disematkan && b.disematkan) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [db.forumDiskusi]);

  const filteredTopics = useMemo(() => {
    return forumList.filter((topik) => {
      if (selectedKategori !== 'ALL' && topik.kategori !== selectedKategori) {
        return false;
      }
      if (selectedKelasFilter !== 'ALL') {
        if (topik.kelasId && topik.kelasId !== 'ALL' && topik.kelasId !== selectedKelasFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inJudul = (topik.judul || '').toLowerCase().includes(q);
        const inIsi = (topik.isi || '').toLowerCase().includes(q);
        const inAuthor = (topik.authorNama || '').toLowerCase().includes(q);
        const inBalasan = (topik.balasan || []).some(
          (b) =>
            (b.isi || '').toLowerCase().includes(q) ||
            (b.authorNama || '').toLowerCase().includes(q)
        );
        if (!inJudul && !inIsi && !inAuthor && !inBalasan) return false;
      }
      return true;
    });
  }, [forumList, selectedKategori, selectedKelasFilter, searchQuery]);

  const totalBalasanCount = useMemo(() => {
    return forumList.reduce((acc, t) => acc + (t.balasan?.length || 0), 0);
  }, [forumList]);

  const handleCreateTopik = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judulBaru.trim() || !isiBaru.trim()) return;

    const selectedKelasObj =
      kelasTargetBaru !== 'ALL'
        ? (db.kelas || []).find((k) => k.id === kelasTargetBaru)
        : undefined;

    const selectedMateriObj = materiTerkaitBaru
      ? (db.materi || []).find((m) => m.id === materiTerkaitBaru)
      : undefined;

    const newTopik: ForumDiskusiTopik = {
      id: `topik-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      judul: judulBaru.trim(),
      isi: isiBaru.trim(),
      kategori: kategoriBaru,
      kelasId: kelasTargetBaru,
      kelasNama: selectedKelasObj ? selectedKelasObj.nama : 'Semua Kelas',
      materiId: selectedMateriObj?.id,
      materiJudul: selectedMateriObj?.judul,
      authorId: currentUser.id,
      authorNama: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      authorKelasNama: currentUserKelasNama || undefined,
      disematkan: currentUser.role !== 'MURID' ? sematkanBaru : false,
      likes: [],
      balasan: [],
      createdAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      forumDiskusi: [newTopik, ...(prev.forumDiskusi || [])],
      notifikasi: [
        {
          id: `notif-forum-${Date.now()}`,
          judul: `Diskusi Baru: ${newTopik.judul}`,
          pesan: `${currentUser.name} (${
            currentUser.role === 'MURID' ? `Murid ${currentUserKelasNama}` : currentUser.role
          }) memulai topik diskusi baru di Forum Pembelajaran.`,
          tipe: 'pengumuman',
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          dibaca: false,
          targetMenu: 'forum-diskusi',
          targetId: newTopik.id,
        },
        ...(prev.notifikasi || []),
      ],
    }));

    setJudulBaru('');
    setIsiBaru('');
    setKategoriBaru('Umum & Tanya Jawab');
    setKelasTargetBaru('ALL');
    setMateriTerkaitBaru('');
    setSematkanBaru(false);
    setIsCreateModalOpen(false);
    setExpandedTopikIds((prev) => ({ ...prev, [newTopik.id]: true }));
  };

  const handleSendReply = (
    topikId: string,
    replyTarget?: {
      balasanId: string;
      authorNama: string;
      isiSingkat: string;
    },
    customText?: string
  ) => {
    const rawText = customText !== undefined ? customText : replyTexts[topikId] || '';
    const text = rawText.trim();
    if (!text) return;

    const newBalasan: ForumDiskusiBalasan = {
      id: `balas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topikId,
      authorId: currentUser.id,
      authorNama: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatar,
      authorKelasNama: currentUserKelasNama || undefined,
      isi: text,
      replyToId: replyTarget?.balasanId,
      replyToNama: replyTarget?.authorNama,
      replyToIsi: replyTarget?.isiSingkat,
      likes: [],
      createdAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => ({
      ...prev,
      forumDiskusi: (prev.forumDiskusi || []).map((t) =>
        t.id === topikId
          ? {
              ...t,
              balasan: [...(t.balasan || []), newBalasan],
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));

    if (replyTarget) {
      setCommentReplyText('');
      setActiveCommentReply(null);
    } else {
      setReplyTexts((prev) => ({ ...prev, [topikId]: '' }));
    }
    setExpandedTopikIds((prev) => ({ ...prev, [topikId]: true }));
  };

  const handleToggleLikeTopik = (topikId: string) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      forumDiskusi: (prev.forumDiskusi || []).map((t) => {
        if (t.id !== topikId) return t;
        const currentLikes = Array.isArray(t.likes) ? t.likes : [];
        const hasLiked = currentLikes.includes(currentUser.id);
        return {
          ...t,
          likes: hasLiked
            ? currentLikes.filter((id) => id !== currentUser.id)
            : [...currentLikes, currentUser.id],
        };
      }),
    }));
  };

  const handleToggleLikeBalasan = (topikId: string, balasanId: string) => {
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      forumDiskusi: (prev.forumDiskusi || []).map((t) => {
        if (t.id !== topikId) return t;
        return {
          ...t,
          balasan: (t.balasan || []).map((b) => {
            if (b.id !== balasanId) return b;
            const currentLikes = Array.isArray(b.likes) ? b.likes : [];
            const hasLiked = currentLikes.includes(currentUser.id);
            return {
              ...b,
              likes: hasLiked
                ? currentLikes.filter((id) => id !== currentUser.id)
                : [...currentLikes, currentUser.id],
            };
          }),
        };
      }),
    }));
  };

  const handleTogglePinTopik = (topikId: string) => {
    if (currentUser.role === 'MURID') return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      forumDiskusi: (prev.forumDiskusi || []).map((t) =>
        t.id === topikId ? { ...t, disematkan: !t.disematkan } : t
      ),
    }));
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { type, topikId, balasanId } = deleteConfirm;

    if (type === 'topik') {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        forumDiskusi: (prev.forumDiskusi || []).filter((t) => t.id !== topikId),
      }));
    } else if (type === 'balasan' && balasanId) {
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        forumDiskusi: (prev.forumDiskusi || []).map((t) =>
          t.id === topikId
            ? {
                ...t,
                balasan: (t.balasan || []).filter(
                  (b) => b.id !== balasanId && b.replyToId !== balasanId
                ),
              }
            : t
        ),
      }));
    }
    setDeleteConfirm(null);
  };

  const renderRoleBadge = (role: string, kelasNama?: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
          <Shield className="w-3 h-3" />
          <span>ADMIN</span>
        </span>
      );
    }
    if (role === 'GURU') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <UserCheck className="w-3 h-3" />
          <span>GURU PJOK</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
        <GraduationCap className="w-3 h-3" />
        <span>MURID {kelasNama ? `• ${kelasNama}` : ''}</span>
      </span>
    );
  };

  const getKategoriBadgeColor = (kat: KategoriForumDiskusi) => {
    switch (kat) {
      case 'Materi & Teknik Olahraga':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Tugas & Praktik':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Kebugaran & Kesehatan':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Turnamen & Ekstrakurikuler':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatWaktu = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const renderBalasanCard = (
    topikId: string,
    balasan: ForumDiskusiBalasan,
    isChildReply: boolean = false
  ) => {
    const replyLikes = Array.isArray(balasan.likes) ? balasan.likes : [];
    const replyLiked = replyLikes.includes(currentUser.id);
    const canDeleteReply =
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'GURU' ||
      balasan.authorId === currentUser.id;

    const isReplyingThis =
      activeCommentReply?.topikId === topikId && activeCommentReply?.balasanId === balasan.id;

    return (
      <div
        key={balasan.id}
        className={`${
          isChildReply
            ? 'ml-6 sm:ml-10 pl-3 sm:pl-4 border-l-2 border-blue-200'
            : ''
        }`}
      >
        <div
          className={`bg-white p-4 rounded-2xl border transition-all space-y-2 shadow-2xs ${
            isReplyingThis
              ? 'border-blue-400 ring-2 ring-blue-100'
              : 'border-slate-200/90'
          }`}
        >
          {/* Kutipan komentar yang dibalas */}
          {balasan.replyToNama && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-900">
              <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-bold shrink-0">Membalas @{balasan.replyToNama}:</span>
              {balasan.replyToIsi && (
                <span className="text-slate-600 italic truncate">
                  &ldquo;{balasan.replyToIsi}&rdquo;
                </span>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                {balasan.authorAvatar ? (
                  <img
                    src={balasan.authorAvatar}
                    alt={balasan.authorNama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (balasan.authorNama || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900">
                    {balasan.authorNama}
                  </span>
                  {renderRoleBadge(balasan.authorRole, balasan.authorKelasNama)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formatWaktu(balasan.createdAt)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Tombol Suka */}
              <button
                type="button"
                onClick={() => handleToggleLikeBalasan(topikId, balasan.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                  replyLiked
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <ThumbsUp className={`w-3 h-3 ${replyLiked ? 'fill-blue-600' : ''}`} />
                <span>{replyLikes.length}</span>
              </button>

              {/* Tombol Balas Komentar */}
              <button
                type="button"
                onClick={() => {
                  if (isReplyingThis) {
                    setActiveCommentReply(null);
                    setCommentReplyText('');
                  } else {
                    setActiveCommentReply({
                      topikId,
                      balasanId: balasan.id,
                      authorNama: balasan.authorNama,
                      isiSingkat:
                        balasan.isi.length > 70
                          ? `${balasan.isi.slice(0, 70)}...`
                          : balasan.isi,
                    });
                    setCommentReplyText('');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors cursor-pointer ${
                  isReplyingThis
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title={`Balas komentar ${balasan.authorNama}`}
              >
                <Reply className="w-3 h-3" />
                <span>Balas</span>
              </button>

              {canDeleteReply && (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm({
                      type: 'balasan',
                      topikId,
                      balasanId: balasan.id,
                      title: balasan.isi.slice(0, 40),
                    })
                  }
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Komentar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed pl-10">
            {balasan.isi}
          </p>

          {/* Form Input Balas Langsung di Bawah Komentar Ini */}
          {isReplyingThis && (
            <div className="mt-3 pt-3 border-t border-slate-100 pl-2 sm:pl-10 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-blue-700 font-bold bg-blue-50/70 px-3 py-1.5 rounded-xl border border-blue-200/70">
                <span className="flex items-center gap-1.5 truncate">
                  <Reply className="w-3.5 h-3.5 shrink-0" />
                  <span>Membalas komentar <strong>@{balasan.authorNama}</strong></span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCommentReply(null);
                    setCommentReplyText('');
                  }}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                <textarea
                  rows={2}
                  autoFocus
                  value={commentReplyText}
                  onChange={(e) => setCommentReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendReply(
                        topikId,
                        {
                          balasanId: balasan.id,
                          authorNama: balasan.authorNama,
                          isiSingkat:
                            balasan.isi.length > 70
                              ? `${balasan.isi.slice(0, 70)}...`
                              : balasan.isi,
                        },
                        commentReplyText
                      );
                    }
                  }}
                  placeholder={`Tulis balasan Anda untuk @${balasan.authorNama}...`}
                  className="flex-1 p-2.5 bg-slate-50 border border-blue-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCommentReply(null);
                      setCommentReplyText('');
                    }}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!commentReplyText.trim()}
                    onClick={() =>
                      handleSendReply(
                        topikId,
                        {
                          balasanId: balasan.id,
                          authorNama: balasan.authorNama,
                          isiSingkat:
                            balasan.isi.length > 70
                              ? `${balasan.isi.slice(0, 70)}...`
                              : balasan.isi,
                        },
                        commentReplyText
                      )
                    }
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Balasan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-extrabold tracking-wide uppercase">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ruang Interaksi Terbuka • Semua Pengguna</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Forum Diskusi Pembelajaran PJOK
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Ruang diskusi interaktif terbuka untuk <strong>seluruh Murid, Guru PJOK, dan Administrator</strong>.
              Silakan bertanya seputar materi olahraga, berdiskusi tugas praktik, atau membalas komentar teman &amp; guru secara langsung!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Topik Diskusi Baru</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
            <div className="text-[11px] text-blue-200 font-semibold">Total Topik Diskusi</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{forumList.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
            <div className="text-[11px] text-blue-200 font-semibold">Total Komentar &amp; Balasan</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{totalBalasanCount}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
            <div className="text-[11px] text-blue-200 font-semibold">Status Akses</div>
            <div className="text-xs sm:text-sm font-extrabold text-emerald-300 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Terbuka untuk Semua</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul diskusi, pertanyaan, atau nama pengirim..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Kategori */}
          <div className="md:col-span-3 relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kategori Diskusi</option>
              {KATEGORI_LIST.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div className="md:col-span-3 relative">
            <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedKelasFilter}
              onChange={(e) => setSelectedKelasFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kelas / Umum</option>
              {(db.kelas || []).map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Daftar Topik Diskusi */}
      {filteredTopics.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-black text-base text-slate-900">
              Belum Ada Topik Diskusi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Siapa pun (Murid, Guru, maupun Admin) dapat memulai diskusi pertama! Klik tombol di bawah untuk mengajukan pertanyaan atau membuka topik obrolan pembelajaran PJOK.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Diskusi Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTopics.map((topik) => {
            const isExpanded = Boolean(expandedTopikIds[topik.id]);
            const likesList = Array.isArray(topik.likes) ? topik.likes : [];
            const isLiked = likesList.includes(currentUser.id);
            const balasanList = Array.isArray(topik.balasan) ? topik.balasan : [];
            const canDeleteTopik =
              currentUser.role === 'ADMIN' ||
              currentUser.role === 'GURU' ||
              topik.authorId === currentUser.id;

            // Susun komentar utama dan balasan bertingkat (threaded replies)
            const balasanIdsSet = new Set(balasanList.map((b) => b.id));
            const rootComments = balasanList.filter(
              (b) => !b.replyToId || !balasanIdsSet.has(b.replyToId)
            );
            const getNestedReplies = (parentId: string): ForumDiskusiBalasan[] => {
              const direct = balasanList.filter((b) => b.replyToId === parentId);
              const result: ForumDiskusiBalasan[] = [];
              for (const child of direct) {
                result.push(child);
                result.push(...getNestedReplies(child.id));
              }
              return result;
            };

            return (
              <div
                key={topik.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-xs ${
                  topik.disematkan
                    ? 'border-amber-300 ring-1 ring-amber-200/60'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Pinned Header */}
                {topik.disematkan && (
                  <div className="bg-amber-50/90 border-b border-amber-200/70 px-5 py-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800">
                    <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>Topik Diskusi Disematkan (Penting)</span>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Author & Meta Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {topik.authorAvatar ? (
                          <img
                            src={topik.authorAvatar}
                            alt={topik.authorNama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (topik.authorNama || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                            {topik.authorNama}
                          </span>
                          {renderRoleBadge(topik.authorRole, topik.authorKelasNama)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatWaktu(topik.createdAt)}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">
                            {topik.kelasId && topik.kelasId !== 'ALL'
                              ? `Kelas ${topik.kelasNama || ''}`
                              : 'Semua Kelas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Icons (Pin / Delete) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentUser.role !== 'MURID' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePinTopik(topik.id)}
                          title={topik.disematkan ? 'Lepas Sematan' : 'Sematkan Diskusi'}
                          className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                            topik.disematkan
                              ? 'bg-amber-100 border-amber-300 text-amber-800'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteTopik && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'topik',
                              topikId: topik.id,
                              title: topik.judul,
                            })
                          }
                          title="Hapus Topik Diskusi"
                          className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tags Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${getKategoriBadgeColor(
                        topik.kategori
                      )}`}
                    >
                      {topik.kategori}
                    </span>
                    {topik.materiJudul && (
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>Materi: {topik.materiJudul}</span>
                      </span>
                    )}
                  </div>

                  {/* Topic Title & Content */}
                  <div className="space-y-2">
                    <h3 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
                      {topik.judul}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {topik.isi}
                    </p>
                  </div>

                  {/* Bottom Action Bar (Like & Toggle Replies) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLikeTopik(topik.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isLiked
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-blue-600' : ''}`} />
                        <span>Suka ({likesList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTopikIds((prev) => ({
                            ...prev,
                            [topik.id]: !prev[topik.id],
                          }))
                        }
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>
                          {balasanList.length} Komentar &amp; Balasan
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {!isExpanded && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTopikIds((prev) => ({
                            ...prev,
                            [topik.id]: true,
                          }))
                        }
                        className="text-xs font-extrabold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Ikut Berdiskusi &rarr;
                      </button>
                    )}
                  </div>
                </div>

                {/* Replies / Discussion Thread Section */}
                {isExpanded && (
                  <div className="bg-slate-50/80 border-t border-slate-200/80 p-4 sm:p-6 space-y-4">
                    {/* List of Replies */}
                    {balasanList.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        Belum ada komentar. Jadilah yang pertama memberikan tanggapan atau jawaban!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {rootComments.map((rootBalasan) => {
                          const childReplies = getNestedReplies(rootBalasan.id);
                          return (
                            <div key={rootBalasan.id} className="space-y-2.5">
                              {renderBalasanCard(topik.id, rootBalasan, false)}
                              {childReplies.map((childBalasan) =>
                                renderBalasanCard(topik.id, childBalasan, true)
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Input Main Comment Box */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          value={replyTexts[topik.id] || ''}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [topik.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              handleSendReply(topik.id);
                            }
                          }}
                          placeholder={`Tulis komentar baru pada topik ini sebagai ${currentUser.name}...`}
                          className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendReply(topik.id)}
                        disabled={!(replyTexts[topik.id] || '').trim()}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>Kirim Komentar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Topik Diskusi Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Buat Topik Diskusi Baru</h3>
                  <p className="text-[11px] text-blue-200">
                    Diterbitkan oleh: {currentUser.name} ({currentUser.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTopik} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  Judul Topik / Pertanyaan Diskusi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={judulBaru}
                  onChange={(e) => setJudulBaru(e.target.value)}
                  placeholder="Contoh: Bagaimana cara melakukan teknik dasar lay-up bola basket yang benar?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Kategori Diskusi
                  </label>
                  <select
                    value={kategoriBaru}
                    onChange={(e) => setKategoriBaru(e.target.value as KategoriForumDiskusi)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    {KATEGORI_LIST.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Target Kelas (Siapa pun tetap bisa ikut)
                  </label>
                  <select
                    value={kelasTargetBaru}
                    onChange={(e) => setKelasTargetBaru(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="ALL">Semua Kelas (Terbuka Umum)</option>
                    {(db.kelas || []).map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(db.materi || []).length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Kaitkan dengan Materi Pembelajaran (Opsional)
                  </label>
                  <select
                    value={materiTerkaitBaru}
                    onChange={(e) => setMateriTerkaitBaru(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="">-- Tidak dikaitkan ke materi tertentu --</option>
                    {(db.materi || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.judul}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  Isi Pembahasan / Pertanyaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={isiBaru}
                  onChange={(e) => setIsiBaru(e.target.value)}
                  placeholder="Tuliskan pertanyaan, gagasan, atau bahan diskusi Anda secara lengkap di sini..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {currentUser.role !== 'MURID' && (
                <label className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sematkanBaru}
                    onChange={(e) => setSematkanBaru(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span className="text-xs font-bold text-amber-900">
                    Sematkan topik diskusi ini di bagian paling atas (Prioritas Guru/Admin)
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Terbitkan Diskusi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <h4 className="font-black text-sm text-slate-900">
              Hapus {deleteConfirm.type === 'topik' ? 'Topik Diskusi' : 'Komentar / Balasan'}?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>&quot;{deleteConfirm.title}&quot;</strong>? Tindakan ini akan langsung diperbarui di seluruh perangkat.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
