import React, { useState, useMemo, useEffect } from 'react';
import {
  Users2,
  Heart,
  Star,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Printer,
  ClipboardList,
  Award,
  ThumbsUp,
  Sliders,
  RotateCcw,
  Settings,
  Check,
  X,
  BookOpen,
} from 'lucide-react';
import {
  User,
  PenilaianTemanSejawat,
  getTeacherAssignedClasses,
  DimensiAsesmenItem,
  DimensiTemanSejawatConfig,
  SkorDimensi,
  TugasPenilaianAntarTeman,
  IndikatorPenilaianItem,
} from '../../types';
import {
  dataStorage,
  LMSDatabase,
  DEFAULT_DIMENSI_TEMAN_SEJAWAT,
} from '../../services/dataStorage';
import { BankIndikatorModal } from './BankIndikatorModal';
import { TugasPenilaianAntarTemanModal } from './TugasPenilaianAntarTemanModal';
import { FormPenilaianMuridModal } from './FormPenilaianMuridModal';
import { TugasPenilaianAntarTemanView } from './TugasPenilaianAntarTemanView';

interface PenilaianTemanSejawatManagerProps {
  db: LMSDatabase;
  currentUser: User;
  initialTab?: 'daftar' | 'rekap' | 'tugas';
}

export const PenilaianTemanSejawatManager: React.FC<PenilaianTemanSejawatManagerProps> = ({
  db,
  currentUser,
  initialTab,
}) => {
  const isMurid = currentUser.role === 'MURID';

  // Classes available
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas;
    }
    if (isMurid && currentUser.kelasId) {
      return (db.kelas || []).filter((k) => k.id === currentUser.kelasId);
    }
    return db.kelas || [];
  }, [currentUser, db.kelas, isMurid]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (isMurid && currentUser.kelasId) return currentUser.kelasId;
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<'tugas' | 'bank-indikator' | 'rekap' | 'daftar'>(
    initialTab === 'rekap' ? 'rekap' : 'tugas'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Tab for Murid: 'tugas-murid' | 'diterima' | 'diberikan'
  const [muridTab, setMuridTab] = useState<'tugas-murid' | 'diterima' | 'diberikan'>('tugas-murid');

  // New Modals State
  const [isTugasModalOpen, setIsTugasModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TugasPenilaianAntarTeman | null>(null);
  const [isBankIndikatorModalOpen, setIsBankIndikatorModalOpen] = useState(false);
  const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false);
  const [activeTaskForEval, setActiveTaskForEval] = useState<TugasPenilaianAntarTeman | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<PenilaianTemanSejawat | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formPenilaiId, setFormPenilaiId] = useState(isMurid ? currentUser.id : '');
  const [formTargetMuridId, setFormTargetMuridId] = useState('');
  const [formMateriId, setFormMateriId] = useState('');
  const [selectedMateriFilter, setSelectedMateriFilter] = useState('ALL');
  const [formKegiatan, setFormKegiatan] = useState('Praktik Permainan Beregu Bola Voli');
  const [formKerjaSama, setFormKerjaSama] = useState(5);
  const [formSportivitas, setFormSportivitas] = useState(5);
  const [formKomunikasi, setFormKomunikasi] = useState(5);
  const [formTanggungJawab, setFormTanggungJawab] = useState(5);
  const [formCatatanPositif, setFormCatatanPositif] = useState('');
  const [formCatatanPerbaikan, setFormCatatanPerbaikan] = useState('');
  const [formLinkDokumentasi, setFormLinkDokumentasi] = useState('');
  const [formNamaLinkDokumentasi, setFormNamaLinkDokumentasi] = useState('');

  // Dynamic Assessment Dimensions Config for Current Class
  const classDimensiConfig = useMemo(() => {
    return (
      (db.dimensiTemanSejawat || []).find((c) => c.kelasId === selectedKelasId) ||
      (db.dimensiTemanSejawat || []).find((c) => c.kelasId === 'all')
    );
  }, [db.dimensiTemanSejawat, selectedKelasId]);

  const activeDimensiList: DimensiAsesmenItem[] = useMemo(() => {
    if (classDimensiConfig?.dimensiList && classDimensiConfig.dimensiList.length > 0) {
      return classDimensiConfig.dimensiList;
    }
    return DEFAULT_DIMENSI_TEMAN_SEJAWAT;
  }, [classDimensiConfig]);

  // Form State for dynamic dimensions
  const [formDimensiList, setFormDimensiList] = useState<DimensiAsesmenItem[]>(DEFAULT_DIMENSI_TEMAN_SEJAWAT);
  const [formDimensiScores, setFormDimensiScores] = useState<Record<string, number>>({});
  const [formSimpanSebagaiDimensiKelas, setFormSimpanSebagaiDimensiKelas] = useState(true);

  // Dedicated Modal State for Teacher to Manage Dimensions (supports multiple classes)
  const [isDimensiModalOpen, setIsDimensiModalOpen] = useState(false);
  const [manageKelasIds, setManageKelasIds] = useState<string[]>([selectedKelasId]);
  const [manageKegiatan, setManageKegiatan] = useState(classDimensiConfig?.kegiatan || 'Praktik Permainan Beregu Bola Voli');
  const [manageDimensiItems, setManageDimensiItems] = useState<DimensiAsesmenItem[]>(DEFAULT_DIMENSI_TEMAN_SEJAWAT);

  const currentKelas = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  const studentsInClass = useMemo(() => {
    return (db.users || [])
      .filter((u) => u.role === 'MURID' && u.kelasId === selectedKelasId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId]);

  // Peer records for selected class
  const classPeerRecords = useMemo(() => {
    return (db.penilaianTemanSejawat || [])
      .filter((r) => r.kelasId === selectedKelasId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.penilaianTemanSejawat, selectedKelasId]);

  // List of Materi available for selected class (both from existing peer records and db.materi)
  const availableMateriList = useMemo(() => {
    const list: { id: string; judul: string; count: number }[] = [];
    const seen = new Set<string>();

    // 1. From records in this class
    classPeerRecords.forEach((r) => {
      const name = (r.materiJudul || r.kegiatanPraktik || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const count = classPeerRecords.filter(
          (cr) => (cr.materiJudul || cr.kegiatanPraktik || '').trim().toLowerCase() === name.toLowerCase()
        ).length;
        list.push({ id: r.materiId || name, judul: name, count });
      }
    });

    // 2. From db.materi for this class
    (db.materi || []).forEach((m) => {
      const matchClass =
        !m.kelasIds || m.kelasIds.length === 0 || m.kelasIds.includes(selectedKelasId) || m.kelasId === selectedKelasId;
      if (matchClass && m.judul && !seen.has(m.judul.toLowerCase())) {
        seen.add(m.judul.toLowerCase());
        list.push({ id: m.id, judul: m.judul, count: 0 });
      }
    });

    return list;
  }, [classPeerRecords, db.materi, selectedKelasId]);

  // Filtered peer records based on selected Materi
  const effectivePeerRecords = useMemo(() => {
    if (selectedMateriFilter === 'ALL') return classPeerRecords;
    return classPeerRecords.filter((r) => {
      const name = (r.materiJudul || r.kegiatanPraktik || '').trim().toLowerCase();
      return name === selectedMateriFilter.toLowerCase() || r.materiId === selectedMateriFilter;
    });
  }, [classPeerRecords, selectedMateriFilter]);

  // Aggregated score per target student + list of peer evaluators (nama yang menilai)
  const peerStatsByStudent = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        totalScore: number;
        dimensiTotals: Record<string, { total: number; count: number }>;
        kerjaSamaTotal: number;
        sportivitasTotal: number;
        komunikasiTotal: number;
        tanggungJawabTotal: number;
        comments: string[];
        links: { url: string; label: string }[];
        penilaiNames: string[];
        penilaiDetails: { nama: string; skor: number; tanggal?: string }[];
      }
    >();

    effectivePeerRecords.forEach((r) => {
      const existing = map.get(r.targetMuridId) || {
        count: 0,
        totalScore: 0,
        dimensiTotals: {},
        kerjaSamaTotal: 0,
        sportivitasTotal: 0,
        komunikasiTotal: 0,
        tanggungJawabTotal: 0,
        comments: [],
        links: [],
        penilaiNames: [],
        penilaiDetails: [],
      };
      const avgThis =
        r.rataRata || (r.skorKerjaSama + r.skorSportivitas + r.skorKomunikasi + r.skorTanggungJawab) / 4;
      existing.count += 1;
      existing.totalScore += avgThis;
      existing.kerjaSamaTotal += r.skorKerjaSama || 5;
      existing.sportivitasTotal += r.skorSportivitas || 5;
      existing.komunikasiTotal += r.skorKomunikasi || 5;
      existing.tanggungJawabTotal += r.skorTanggungJawab || 5;

      // Track reviewer names
      if (r.penilaiNama) {
        if (!existing.penilaiNames.includes(r.penilaiNama)) {
          existing.penilaiNames.push(r.penilaiNama);
        }
        existing.penilaiDetails.push({
          nama: r.penilaiNama,
          skor: Number(avgThis.toFixed(1)),
          tanggal: r.tanggal,
        });
      }

      // Track dynamic dimensions
      if (r.dimensiScores && r.dimensiScores.length > 0) {
        r.dimensiScores.forEach((ds) => {
          const key = ds.dimensiId || ds.nama;
          if (!existing.dimensiTotals[key]) {
            existing.dimensiTotals[key] = { total: 0, count: 0 };
          }
          existing.dimensiTotals[key].total += ds.skor;
          existing.dimensiTotals[key].count += 1;
        });
      }

      if (r.catatanPositif) existing.comments.push(r.catatanPositif);
      if (r.linkDokumentasi) {
        existing.links.push({
          url: r.linkDokumentasi,
          label: r.namaLinkDokumentasi || 'Dokumentasi Praktik',
        });
      }
      map.set(r.targetMuridId, existing);
    });

    return map;
  }, [effectivePeerRecords]);

  // Helper to get average for a specific dimension for a student
  const getStudentDimensiAvg = (muridId: string, dim: DimensiAsesmenItem) => {
    const stat = peerStatsByStudent.get(muridId);
    if (!stat || stat.count === 0) return '-';
    const key = dim.id || dim.nama;
    if (stat.dimensiTotals[key] && stat.dimensiTotals[key].count > 0) {
      return (stat.dimensiTotals[key].total / stat.dimensiTotals[key].count).toFixed(1);
    }
    // Fallback to legacy
    if (dim.id === 'dim-1' || dim.nama.toLowerCase().includes('kerja')) {
      return (stat.kerjaSamaTotal / stat.count).toFixed(1);
    }
    if (dim.id === 'dim-2' || dim.nama.toLowerCase().includes('sport')) {
      return (stat.sportivitasTotal / stat.count).toFixed(1);
    }
    if (dim.id === 'dim-3' || dim.nama.toLowerCase().includes('komunikasi')) {
      return (stat.komunikasiTotal / stat.count).toFixed(1);
    }
    if (dim.id === 'dim-4' || dim.nama.toLowerCase().includes('tanggung')) {
      return (stat.tanggungJawabTotal / stat.count).toFixed(1);
    }
    return (stat.totalScore / stat.count).toFixed(1);
  };

  // Murid Specific Views
  const muridReceivedRecords = useMemo(() => {
    return (db.penilaianTemanSejawat || []).filter((r) => r.targetMuridId === currentUser.id);
  }, [db.penilaianTemanSejawat, currentUser.id]);

  const muridGivenRecords = useMemo(() => {
    return (db.penilaianTemanSejawat || []).filter((r) => r.penilaiId === currentUser.id);
  }, [db.penilaianTemanSejawat, currentUser.id]);

  const muridAverageReceived = useMemo(() => {
    if (muridReceivedRecords.length === 0) return null;
    const sum = muridReceivedRecords.reduce((acc, r) => acc + (r.rataRata || 5), 0);
    return (sum / muridReceivedRecords.length).toFixed(1);
  }, [muridReceivedRecords]);

  // Open modal with defaults
  const handleOpenAddModal = () => {
    if (isMurid) {
      setFormPenilaiId(currentUser.id);
      // Select another classmate
      const otherStudents = studentsInClass.filter((s) => s.id !== currentUser.id);
      if (otherStudents.length > 0) {
        setFormTargetMuridId(otherStudents[0].id);
      }
    } else {
      if (studentsInClass.length >= 2) {
        setFormPenilaiId(studentsInClass[0].id);
        setFormTargetMuridId(studentsInClass[1].id);
      } else if (studentsInClass.length === 1) {
        setFormPenilaiId(studentsInClass[0].id);
        setFormTargetMuridId(studentsInClass[0].id);
      }
    }

    setFormKegiatan(classDimensiConfig?.kegiatan || 'Praktik Permainan Beregu Bola Voli');
    
    // Initialize form dimensions from active class configuration
    const currentDims = activeDimensiList.map((d) => ({ ...d }));
    setFormDimensiList(currentDims);
    const initialScores: Record<string, number> = {};
    currentDims.forEach((d) => {
      initialScores[d.id] = 5;
    });
    setFormDimensiScores(initialScores);
    setFormSimpanSebagaiDimensiKelas(true);

    setFormKerjaSama(5);
    setFormSportivitas(5);
    setFormKomunikasi(5);
    setFormTanggungJawab(5);
    setFormCatatanPositif('');
    setFormCatatanPerbaikan('');
    setFormLinkDokumentasi('');
    setFormNamaLinkDokumentasi('');
    setIsModalOpen(true);
  };

  // Add dimension on the fly (for Guru)
  const handleAddFormDimension = () => {
    const newId = `dim-${Date.now()}`;
    const newItem: DimensiAsesmenItem = {
      id: newId,
      nama: `Dimensi Asesmen ${formDimensiList.length + 1}`,
    };
    setFormDimensiList((prev) => [...prev, newItem]);
    setFormDimensiScores((prev) => ({ ...prev, [newId]: 5 }));
  };

  const handleUpdateFormDimensionName = (id: string, newName: string) => {
    setFormDimensiList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, nama: newName } : d))
    );
  };

  const handleRemoveFormDimension = (id: string) => {
    if (formDimensiList.length <= 1) {
      alert('Minimal harus ada 1 dimensi asesmen!');
      return;
    }
    setFormDimensiList((prev) => prev.filter((d) => d.id !== id));
  };

  // Open Dedicated Management Modal for Teacher (Multi-Class Support)
  const handleOpenManageDimensi = (targetInput: string[] | string = selectedKelasId) => {
    const initialIds = Array.isArray(targetInput)
      ? targetInput
      : [targetInput || selectedKelasId];
    setManageKelasIds(initialIds.length > 0 ? initialIds : [selectedKelasId]);

    const primaryId = initialIds[0] || selectedKelasId;
    const cfg =
      (db.dimensiTemanSejawat || []).find((c) => c.kelasId === primaryId) ||
      (db.dimensiTemanSejawat || []).find((c) => c.kelasId === 'all');
    setManageKegiatan(cfg?.kegiatan || 'Praktik Permainan Beregu Bola Voli');
    if (cfg?.dimensiList && cfg.dimensiList.length > 0) {
      setManageDimensiItems(cfg.dimensiList.map((d) => ({ ...d })));
    } else {
      setManageDimensiItems(DEFAULT_DIMENSI_TEMAN_SEJAWAT.map((d) => ({ ...d })));
    }
    setIsDimensiModalOpen(true);
  };

  const toggleManageKelas = (kId: string) => {
    setManageKelasIds((prev) => {
      if (prev.includes(kId)) {
        if (prev.length <= 1) return prev; // Keep at least 1 class selected
        return prev.filter((id) => id !== kId);
      } else {
        return [...prev, kId];
      }
    });
  };

  const handleSelectFirst3Classes = () => {
    const first3 = availableClasses.slice(0, 3).map((k) => k.id);
    if (first3.length > 0) {
      setManageKelasIds(first3);
    }
  };

  const handleSelectAllAssignedClasses = () => {
    setManageKelasIds(availableClasses.map((k) => k.id));
  };

  const handleAddManageDimension = () => {
    const newId = `dim-${Date.now()}`;
    setManageDimensiItems((prev) => [
      ...prev,
      { id: newId, nama: `Dimensi Baru ${prev.length + 1}` },
    ]);
  };

  const handleUpdateManageDimensionName = (id: string, newName: string) => {
    setManageDimensiItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, nama: newName } : d))
    );
  };

  const handleRemoveManageDimension = (id: string) => {
    if (manageDimensiItems.length <= 1) {
      alert('Minimal harus ada 1 dimensi asesmen!');
      return;
    }
    setManageDimensiItems((prev) => prev.filter((d) => d.id !== id));
  };

  const handleResetDefaultManageDimensi = () => {
    setManageDimensiItems(DEFAULT_DIMENSI_TEMAN_SEJAWAT.map((d) => ({ ...d })));
    setManageKegiatan('Praktik Permainan Beregu Bola Voli');
  };

  const handleSaveManageDimensi = () => {
    const valid = manageDimensiItems.filter((d) => d.nama.trim().length > 0);
    if (valid.length === 0) {
      alert('Harap masukkan minimal 1 nama dimensi asesmen!');
      return;
    }
    if (manageKelasIds.length === 0) {
      alert('Harap pilih minimal 1 kelas yang akan diatur dimensinya!');
      return;
    }

    dataStorage.updateDatabase((prev) => {
      let list = [...(prev.dimensiTemanSejawat || [])];

      manageKelasIds.forEach((targetKId) => {
        const idx = list.findIndex((c) => c.kelasId === targetKId);
        const newConfig: DimensiTemanSejawatConfig = {
          id: idx >= 0 ? list[idx].id : `dtc-${targetKId}-${Date.now()}`,
          kelasId: targetKId,
          kelasIds: manageKelasIds,
          kegiatan: manageKegiatan.trim() || 'Praktik PJOK Bersama',
          dimensiList: valid,
          updatedAt: new Date().toISOString(),
          guruNama: currentUser.name,
        };
        if (idx >= 0) {
          list[idx] = newConfig;
        } else {
          list.push(newConfig);
        }
      });

      return {
        ...prev,
        dimensiTemanSejawat: list,
      };
    });

    const targetClassNames = (db.kelas || [])
      .filter((k) => manageKelasIds.includes(k.id))
      .map((k) => k.nama)
      .join(', ');

    alert(
      `Berhasil menyimpan dan menyinkronkan dimensi asesmen untuk ${manageKelasIds.length} kelas sekaligus (${targetClassNames})! Seluruh akun murid di kelas tersebut kini otomatis menggunakan acuan dimensi ini.`
    );
    setIsDimensiModalOpen(false);
  };

  // Submit peer review
  const handleSavePeerReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPenilaiId || !formTargetMuridId) {
      alert('Harap pilih penilai dan murid yang dinilai!');
      return;
    }
    if (formPenilaiId === formTargetMuridId) {
      alert('Penilai dan murid yang dinilai tidak boleh murid yang sama!');
      return;
    }

    const penilaiUser =
      formPenilaiId === currentUser.id
        ? currentUser
        : studentsInClass.find((s) => s.id === formPenilaiId);

    const targetUser = studentsInClass.find((s) => s.id === formTargetMuridId);
    if (!penilaiUser || !targetUser) {
      alert('Data murid tidak ditemukan.');
      return;
    }

    const validDimensions = formDimensiList.filter((d) => d.nama.trim().length > 0);
    if (validDimensions.length === 0) {
      alert('Harap masukkan minimal 1 nama dimensi asesmen!');
      return;
    }

    const dimensiScores: SkorDimensi[] = validDimensions.map((d) => ({
      dimensiId: d.id,
      nama: d.nama.trim(),
      skor: formDimensiScores[d.id] || 5,
    }));

    const avg =
      dimensiScores.reduce((acc, curr) => acc + curr.skor, 0) / (dimensiScores.length || 1);

    const ks = dimensiScores[0]?.skor || 5;
    const sp = dimensiScores[1]?.skor || ks;
    const km = dimensiScores[2]?.skor || ks;
    const tj = dimensiScores[3]?.skor || ks;

    const matchedMateri = (db.materi || []).find((m) => m.id === formMateriId);

    const newRecord: PenilaianTemanSejawat = {
      id: `pts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      penilaiId: penilaiUser.id,
      penilaiNama: penilaiUser.name,
      targetMuridId: targetUser.id,
      targetMuridNama: targetUser.name,
      targetNis: targetUser.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: new Date().toISOString().slice(0, 10),
      materiId: formMateriId || undefined,
      materiJudul: matchedMateri?.judul || formKegiatan.trim() || undefined,
      kegiatanPraktik: formKegiatan.trim() || 'Praktik PJOK Bersama',
      dimensiScores,
      skorKerjaSama: ks,
      skorSportivitas: sp,
      skorKomunikasi: km,
      skorTanggungJawab: tj,
      rataRata: Number(avg.toFixed(2)),
      catatanPositif:
        formCatatanPositif.trim() ||
        'Sangat kompak, sportif, dan memberikan kontribusi yang hebat dalam kelompok!',
      catatanPerbaikan: formCatatanPerbaikan.trim() || undefined,
      linkDokumentasi: formLinkDokumentasi.trim() || undefined,
      namaLinkDokumentasi: formNamaLinkDokumentasi.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    dataStorage.updateDatabase((prev) => {
      let updatedConfigs = prev.dimensiTemanSejawat || [];
      // If teacher checked simpanSebagaiDimensiKelas
      if (!isMurid && formSimpanSebagaiDimensiKelas) {
        const existingIdx = updatedConfigs.findIndex((c) => c.kelasId === selectedKelasId);
        const newConfig: DimensiTemanSejawatConfig = {
          id: existingIdx >= 0 ? updatedConfigs[existingIdx].id : `dtc-${selectedKelasId}-${Date.now()}`,
          kelasId: selectedKelasId,
          kegiatan: formKegiatan.trim(),
          dimensiList: validDimensions,
          updatedAt: new Date().toISOString(),
          guruNama: currentUser.name,
        };
        if (existingIdx >= 0) {
          updatedConfigs = [
            ...updatedConfigs.slice(0, existingIdx),
            newConfig,
            ...updatedConfigs.slice(existingIdx + 1),
          ];
        } else {
          updatedConfigs = [newConfig, ...updatedConfigs];
        }
      }

      return {
        ...prev,
        penilaianTemanSejawat: [newRecord, ...(prev.penilaianTemanSejawat || [])],
        dimensiTemanSejawat: updatedConfigs,
      };
    });

    setIsModalOpen(false);
  };

  // Delete peer review
  const handleDeletePeerReview = (id: string) => {
    if (!window.confirm('Hapus rekaman penilaian teman sejawat ini?')) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      penilaianTemanSejawat: (prev.penilaianTemanSejawat || []).filter((r) => r.id !== id),
    }));
  };

  const filteredRecords = useMemo(() => {
    return classPeerRecords.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.targetMuridNama.toLowerCase().includes(q) ||
        r.penilaiNama.toLowerCase().includes(q) ||
        (r.targetNis && r.targetNis.includes(q)) ||
        r.kegiatanPraktik.toLowerCase().includes(q)
      );
    });
  }, [classPeerRecords, searchQuery]);

  // Export CSV with dynamic dimensions
  const handleExportCSV = () => {
    const dimensiHeaders = activeDimensiList.map((d) => `Rata-Rata ${d.nama} (1-5)`);
    const headers = [
      'No',
      'NIS',
      'Nama Murid',
      'Kelas',
      'Jumlah Teman Penilai',
      'Nama-Nama Teman yang Menilai',
      ...dimensiHeaders,
      'Rata-Rata Total (1-5)',
      'Apresiasi & Catatan Positif Teman',
      'Link Dokumentasi',
    ];

    const rows = studentsInClass.map((s, idx) => {
      const stat = peerStatsByStudent.get(s.id);
      const count = stat?.count || 0;
      const avg = count > 0 ? (stat!.totalScore / count).toFixed(2) : '-';
      const dimVals = activeDimensiList.map((d) => getStudentDimensiAvg(s.id, d));
      const comments = stat && stat.comments.length > 0 ? stat.comments.join('; ') : '-';
      const links =
        stat && stat.links.length > 0 ? stat.links.map((l) => l.url).join('; ') : '-';
      const evaluatorNames =
        stat && stat.penilaiNames.length > 0 ? stat.penilaiNames.join('; ') : '-';

      return [
        idx + 1,
        `"${s.nis || '-'}"`,
        `"${s.name}"`,
        `"${currentKelas?.nama || selectedKelasId}"`,
        count,
        `"${evaluatorNames.replace(/"/g, '""')}"`,
        ...dimVals,
        avg,
        `"${comments.replace(/"/g, '""')}"`,
        `"${links}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Penilaian_Teman_Sejawat_${(currentKelas?.nama || selectedKelasId).replace(
        /\s+/g,
        '_'
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <Users2 className="w-3.5 h-3.5 text-indigo-600" /> Kolaborasi & Asesmen Antarteman
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Kurikulum Merdeka</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isMurid
                ? 'Penilaian Antar Teman PJOK'
                : activeTab === 'rekap'
                ? 'Rekapan Penilaian Antar Teman'
                : 'Penilaian Antar Teman'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl mt-1">
              {isMurid
                ? 'Amati dan berikan apresiasi positif, unggah foto/video bukti gerakan, serta nilai capaian teknik rekan sekelasmu secara jujur dan suportif.'
                : 'Kelola tugas penilaian antar teman, bank indikator rubrik capaian gerak skala 1-4, izin unggah video/foto bukti, dan rekapitulasi penilaian kelas.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isMurid && (
              <>
                <button
                  type="button"
                  onClick={() => setIsBankIndikatorModalOpen(true)}
                  className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Kelola Bank Indikator Rubrik Skala 1-4"
                >
                  <Sliders className="w-4 h-4 text-amber-700" />
                  <span>Bank Indikator (1-4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsTugasModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Tugas Penilaian Antar Teman</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>{isMurid ? '+ Nilai Teman Manual' : '+ Entri Nilai Manual'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation for GURU / ADMIN */}
        {!isMurid && (
          <div className="flex items-center gap-2 border-b border-slate-200 pt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('tugas')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'tugas'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Tugas Penilaian Antar Teman</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank-indikator')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'bank-indikator'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Bank Indikator ({db.bankIndikatorPenilaian?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekap')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'rekap'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Rekapan Nilai Antar Teman</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('daftar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'daftar'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Riwayat Entri Penilaian</span>
            </button>
          </div>
        )}

        {/* Tab Navigation for MURID */}
        {isMurid && (
          <div className="flex items-center gap-2 border-b border-slate-200 pt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMuridTab('tugas-murid')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                muridTab === 'tugas-murid'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Tugas Penilaian Antar Teman</span>
            </button>

            <button
              type="button"
              onClick={() => setMuridTab('diterima')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                muridTab === 'diterima'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Apresiasi & Skor yang Saya Terima ({muridReceivedRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMuridTab('diberikan')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                muridTab === 'diberikan'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Penilaian yang Saya Berikan ({muridGivenRecords.length})</span>
            </button>
          </div>
        )}

        {/* Toolbar Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {!isMurid ? (
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden shrink-0"
              >
                {availableClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>

              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama murid atau kegiatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Kelas: <strong className="text-slate-800">{currentKelas?.nama || currentUser.kelasId}</strong>
            </div>
          )}

          {!isMurid && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'rekap' ? (
                <>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cetak Rekap</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500 font-medium">
                  Total {classPeerRecords.length} Penilaian Terekam
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- MURID VIEW ---------------- */}
      {isMurid && (
        <div className="space-y-6">
          {/* Murid Tab: Tugas Penilaian Antar Teman */}
          {muridTab === 'tugas-murid' && (
            <TugasPenilaianAntarTemanView
              db={db}
              currentUser={currentUser}
              onOpenCreateTask={() => {}}
              onOpenEditTask={() => {}}
              onEvaluatePeer={(task) => {
                setActiveTaskForEval(task);
                setRecordToEdit(null);
                setIsStudentFormModalOpen(true);
              }}
            />
          )}

          {/* Summary Banner for Murid */}
          {muridTab === 'diterima' && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-100 uppercase tracking-wider block">
                  Nilai Rata-rata dari Rekan Sejawat
                </span>
                <h3 className="text-2xl font-black mt-1">
                  {muridAverageReceived ? `★ ${muridAverageReceived} / 5.0` : 'Belum Ada Penilaian'}
                </h3>
                <p className="text-xs text-indigo-100 mt-1">
                  Dinilai oleh {muridReceivedRecords.length} teman sekelas selama kegiatan praktik PJOK.
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-xs p-3.5 rounded-2xl border border-white/20 text-center shrink-0">
                <span className="text-[10px] uppercase font-bold text-indigo-100 block">Kesan & Apresiasi</span>
                <span className="text-xl font-black text-white">
                  {muridReceivedRecords.filter((r) => r.catatanPositif).length} Catatan
                </span>
              </div>
            </div>
          )}

          {/* Murid Tab: Diterima */}
          {muridTab === 'diterima' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Umpan Balik & Penilaian yang Diberikan Teman Untukmu</span>
                <span className="text-indigo-600 font-semibold">{muridReceivedRecords.length} Ulasan</span>
              </div>

              {muridReceivedRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm">Belum ada teman yang mengisi penilaian untukmu</p>
                  <p className="text-xs">
                    Penilaian dan apresiasi dari teman akan otomatis muncul di sini setelah temanmu mengisi form.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {muridReceivedRecords.map((rec) => (
                    <div key={rec.id} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Oleh: {rec.penilaiNama}
                          </span>
                          <span className="text-[11px] text-slate-400">• {rec.kegiatanPraktik}</span>
                          <span className="text-[11px] text-slate-400">• {rec.tanggal}</span>
                        </div>

                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                          Rata-rata: {rec.rataRata?.toFixed(1) || '5.0'} / 5.0
                        </span>
                      </div>

                      {/* Score Boxes 1-5 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {rec.dimensiScores && rec.dimensiScores.length > 0 ? (
                          rec.dimensiScores.map((ds, dIdx) => (
                            <div
                              key={ds.dimensiId || dIdx}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center"
                            >
                              <span className="text-[10px] text-slate-500 block font-semibold truncate" title={ds.nama}>
                                {ds.nama}
                              </span>
                              <span className="text-sm font-black text-indigo-700">{ds.skor} / 5</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 block font-semibold">Kerja Sama</span>
                              <span className="text-sm font-black text-indigo-700">{rec.skorKerjaSama} / 5</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 block font-semibold">Sportivitas</span>
                              <span className="text-sm font-black text-indigo-700">{rec.skorSportivitas} / 5</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 block font-semibold">Komunikasi</span>
                              <span className="text-sm font-black text-indigo-700">{rec.skorKomunikasi} / 5</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                              <span className="text-[10px] text-slate-400 block font-semibold">Tanggung Jawab</span>
                              <span className="text-sm font-black text-indigo-700">{rec.skorTanggungJawab} / 5</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Kesan Positif & Apresiasi */}
                      {rec.catatanPositif && (
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Kesan Positif & Apresiasi:</span>
                          </div>
                          <p className="text-xs text-indigo-900/90 italic leading-relaxed">
                            &quot;{rec.catatanPositif}&quot;
                          </p>
                        </div>
                      )}

                      {/* Link Dokumentasi */}
                      {rec.linkDokumentasi && (
                        <div className="pt-1">
                          <a
                            href={rec.linkDokumentasi}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span>{rec.namaLinkDokumentasi || 'Lihat Dokumentasi Praktik'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Murid Tab: Diberikan */}
          {muridTab === 'diberikan' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Daftar Penilaian yang Telah Kamu Berikan ke Teman</span>
                <span className="text-indigo-600 font-semibold">{muridGivenRecords.length} Terkirim</span>
              </div>

              {muridGivenRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Users2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm">Kamu belum memberikan penilaian kepada teman sekelas</p>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    + Beri Penilaian Sekarang
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {muridGivenRecords.map((rec) => (
                    <div key={rec.id} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                              Teman yang Dinilai: {rec.targetMuridNama}
                            </span>
                            <span className="text-[11px] text-slate-400">• {rec.kegiatanPraktik}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">Tanggal: {rec.tanggal}</p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                            Skor: {rec.rataRata?.toFixed(1) || '5.0'} / 5.0
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const matched =
                                (db.tugasPenilaianAntarTeman || []).find((t) => t.id === rec.tugasId) ||
                                (db.tugasPenilaianAntarTeman || [])[0];
                              if (matched) {
                                setActiveTaskForEval(matched);
                                setRecordToEdit(rec);
                                setIsStudentFormModalOpen(true);
                              }
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Edit penilaian sebelum batas waktu"
                          >
                            <Sliders className="w-3 h-3 text-indigo-600" />
                            <span>Edit Nilai</span>
                          </button>
                        </div>
                      </div>

                      {/* Rubric Indicators Scale Display (1-4) */}
                      {rec.nilaiIndikator && rec.nilaiIndikator.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {rec.nilaiIndikator.map((ni, nIdx) => (
                            <div
                              key={ni.indikatorId || nIdx}
                              className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-slate-800 line-clamp-1">
                                  {ni.judul || ni.pernyataan}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black shrink-0">
                                  Skala {ni.skor}/4
                                </span>
                              </div>
                              <span className="text-[11px] text-indigo-900 font-semibold block">
                                {ni.levelLabel}
                              </span>
                              {ni.deskripsiCapaian && (
                                <p className="text-[10px] text-slate-500 line-clamp-2 italic">
                                  {ni.deskripsiCapaian}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Score Boxes 1-5 fallback */}
                      {(!rec.nilaiIndikator || rec.nilaiIndikator.length === 0) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {rec.dimensiScores && rec.dimensiScores.length > 0 ? (
                            rec.dimensiScores.map((ds, dIdx) => (
                              <div
                                key={ds.dimensiId || dIdx}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center"
                              >
                                <span className="text-[10px] text-slate-500 block font-semibold truncate" title={ds.nama}>
                                  {ds.nama}
                                </span>
                                <span className="text-sm font-black text-slate-800">{ds.skor} / 5</span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Kerja Sama</span>
                                <span className="text-sm font-black text-slate-800">{rec.skorKerjaSama} / 5</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Sportivitas</span>
                                <span className="text-sm font-black text-slate-800">{rec.skorSportivitas} / 5</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Komunikasi</span>
                                <span className="text-sm font-black text-slate-800">{rec.skorKomunikasi} / 5</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                                <span className="text-[10px] text-slate-400 block font-semibold">Tanggung Jawab</span>
                                <span className="text-sm font-black text-slate-800">{rec.skorTanggungJawab} / 5</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {rec.catatanPositif && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed italic">
                          Apresiasi yang kamu berikan: &quot;{rec.catatanPositif}&quot;
                        </div>
                      )}

                      {rec.linkDokumentasi && (
                        <div>
                          <a
                            href={rec.linkDokumentasi}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span>{rec.namaLinkDokumentasi || 'Dokumentasi Praktik'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------- GURU / ADMIN VIEW ---------------- */}
      {!isMurid && activeTab === 'tugas' && (
        <TugasPenilaianAntarTemanView
          db={db}
          currentUser={currentUser}
          onOpenCreateTask={() => {
            setTaskToEdit(null);
            setIsTugasModalOpen(true);
          }}
          onOpenEditTask={(task) => {
            setTaskToEdit(task);
            setIsTugasModalOpen(true);
          }}
          onEvaluatePeer={(task) => {
            setActiveTaskForEval(task);
            setRecordToEdit(null);
            setIsStudentFormModalOpen(true);
          }}
          onViewRekapTask={() => setActiveTab('rekap')}
        />
      )}

      {!isMurid && activeTab === 'bank-indikator' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Bank Indikator Rubrik Penilaian Antar Teman (Skala 1 - 4)
              </h2>
              <p className="text-xs text-slate-500">
                Koleksi indikator capaian gerak yang siap digunakan untuk tugas penilaian antar rekan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBankIndikatorModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Kelola & Input Indikator Manual</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {(db.bankIndikatorPenilaian || []).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black flex items-center justify-center">
                      #{item.urutan}
                    </span>
                    <h4 className="text-xs font-black text-slate-900">{item.judulPenilaian}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'AKTIF'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{item.pernyataanIndikator}</p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                  <div className="p-1.5 rounded bg-rose-50 border border-rose-100 text-rose-900 truncate">
                    1. {item.skala1PerluBimbingan}
                  </div>
                  <div className="p-1.5 rounded bg-amber-50 border border-amber-100 text-amber-900 truncate">
                    2. {item.skala2MulaiBerkembang}
                  </div>
                  <div className="p-1.5 rounded bg-sky-50 border border-sky-100 text-sky-900 truncate">
                    3. {item.skala3BerkembangSesuaiHarapan}
                  </div>
                  <div className="p-1.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-900 truncate">
                    4. {item.skala4BerkembangSangatBaik}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- GURU / ADMIN VIEW ---------------- */}
      {!isMurid && activeTab === 'daftar' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Rangkuman Penilaian Rekan Sejawat per Murid Kelas {currentKelas?.nama}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {studentsInClass.map((s) => {
                const stat = peerStatsByStudent.get(s.id);
                const avg =
                  stat && stat.count > 0 ? (stat.totalScore / stat.count).toFixed(1) : '-';

                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="text-xs font-extrabold text-slate-900 truncate">{s.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        Dinilai oleh {stat?.count || 0} rekan
                        {stat && stat.penilaiNames.length > 0 && (
                          <span className="block text-[10px] text-indigo-600 font-semibold truncate">
                            Penilai: {stat.penilaiNames.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          stat && stat.count > 0
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-200/60 text-slate-500'
                        }`}
                      >
                        ★ {avg}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feed List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Riwayat Lembar Penilaian Teman ({filteredRecords.length})</span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-sm">Belum ada lembar penilaian teman di kelas ini</p>
                <p className="text-xs">
                  Klik &quot;+ Tambah Penilaian Antarteman (1-5)&quot; untuk mencatat observasi.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Penilai: {rec.penilaiNama}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">menilai</span>
                        <span className="text-xs font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          {rec.targetMuridNama}
                        </span>
                        <span className="text-[11px] text-slate-400">• {rec.kegiatanPraktik}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                          Rata-rata: {rec.rataRata?.toFixed(1) || '5.0'} / 5.0
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePeerReview(rec.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus penilaian ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Score Boxes 1-5 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {rec.dimensiScores && rec.dimensiScores.length > 0 ? (
                        rec.dimensiScores.map((ds, dIdx) => (
                          <div
                            key={ds.dimensiId || dIdx}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center"
                          >
                            <span className="text-[10px] text-slate-500 block font-semibold truncate" title={ds.nama}>
                              {ds.nama}
                            </span>
                            <span className="text-xs font-black text-slate-800">{ds.skor} / 5</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-semibold">Kerja Sama</span>
                            <span className="text-xs font-black text-slate-800">{rec.skorKerjaSama} / 5</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-semibold">Sportivitas</span>
                            <span className="text-xs font-black text-slate-800">{rec.skorSportivitas} / 5</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-semibold">Komunikasi</span>
                            <span className="text-xs font-black text-slate-800">{rec.skorKomunikasi} / 5</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-semibold">Tanggung Jawab</span>
                            <span className="text-xs font-black text-slate-800">{rec.skorTanggungJawab} / 5</span>
                          </div>
                        </>
                      )}
                    </div>

                    {rec.catatanPositif && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed italic">
                        Kesan & Apresiasi: &quot;{rec.catatanPositif}&quot;
                      </div>
                    )}

                    {rec.linkDokumentasi && (
                      <div>
                        <a
                          href={rec.linkDokumentasi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>{rec.namaLinkDokumentasi || 'Dokumentasi Praktik'}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- GURU / ADMIN REKAP VIEW ---------------- */}
      {!isMurid && activeTab === 'rekap' && (
        <div className="space-y-4">
          {/* MATERI FILTER / GROUPING BAR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Pilih Materi yang Dinilai:
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rekapitulasi penilaian teman sejawat dapat disesuaikan dan dibedakan per materi pembelajaran PJOK.
                </p>
              </div>

              {selectedMateriFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedMateriFilter('ALL')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                >
                  ✕ Reset ke Semua Materi
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMateriFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMateriFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua Materi ({classPeerRecords.length})
              </button>

              {availableMateriList.map((mat) => {
                const isSelected =
                  selectedMateriFilter.toLowerCase() === mat.judul.toLowerCase() ||
                  selectedMateriFilter === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setSelectedMateriFilter(mat.judul)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{mat.judul}</span>
                    {mat.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {mat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
              <div>
                <span>
                  Tabel Rekapitulasi Penilaian Teman Sejawat Kelas {currentKelas?.nama}
                  {selectedMateriFilter !== 'ALL' ? ` — Materi: ${selectedMateriFilter}` : ' (Semua Materi)'}
                </span>
                <p className="text-[11px] text-slate-400 font-normal">
                  Skala Penilaian: 1 - 5 (Kerja Sama, Sportivitas, Komunikasi, Tanggung Jawab)
                </p>
              </div>
              <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/60 font-semibold self-start sm:self-auto">
                Total {effectivePeerRecords.length} Lembar Penilaian Terkumpul
              </span>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[180px]">Nama Murid & NIS</th>
                  <th className="py-3 px-2 text-center w-28">Jml Penilai</th>
                  <th className="py-3 px-3 min-w-[170px]">Nama yang Menilai</th>
                  {activeDimensiList.map((dim) => (
                    <th key={dim.id} className="py-3 px-2 text-center min-w-[90px]">
                      {dim.nama}
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center w-24">Rata² (1-5)</th>
                  <th className="py-3 px-3 min-w-[220px]">Kesan & Apresiasi Rekan</th>
                  <th className="py-3 px-3 text-center w-24">Dokumentasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentsInClass.length === 0 ? (
                  <tr>
                    <td colSpan={6 + activeDimensiList.length} className="py-8 text-center text-slate-400">
                      Tidak ada data murid ditemukan di kelas ini.
                    </td>
                  </tr>
                ) : (
                  studentsInClass.map((murid, idx) => {
                    const stat = peerStatsByStudent.get(murid.id);
                    const count = stat?.count || 0;
                    const avg =
                      count > 0 ? (stat!.totalScore / count).toFixed(1) : '-';

                    return (
                      <tr key={murid.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 leading-tight">{murid.name}</p>
                          <p className="text-[10px] text-slate-400">NIS: {murid.nis || '-'}</p>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-slate-700">
                          {count > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              {count} Teman
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {stat && stat.penilaiNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {stat.penilaiDetails.map((pd, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs"
                                  title={`Dinilai oleh ${pd.nama} • Rata-rata Skor: ${pd.skor}/5.0`}
                                >
                                  <UserCheck className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                  <span className="truncate max-w-[95px]">{pd.nama}</span>
                                  <span className="text-indigo-700 font-black text-[9px] bg-indigo-50 px-1 py-0.2 rounded">
                                    ★{pd.skor}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">-</span>
                          )}
                        </td>
                        {activeDimensiList.map((dim) => (
                          <td key={dim.id} className="py-3 px-2 text-center font-bold text-slate-700">
                            {getStudentDimensiAvg(murid.id, dim)}
                          </td>
                        ))}
                        <td className="py-3 px-2 text-center font-black text-indigo-700 bg-indigo-50/30">
                          {avg !== '-' ? `★ ${avg}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs truncate">
                          {stat && stat.comments.length > 0 ? (
                            stat.comments.join(' • ')
                          ) : (
                            <span className="text-slate-300 italic">Belum ada apresiasi</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {stat && stat.links.length > 0 ? (
                            <a
                              href={stat.links[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span>Link ({stat.links.length})</span>
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* ---------------- MODAL INPUT PENILAIAN TEMAN (1-5 DALAM KOTAK) ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Formulir Penilaian Antarteman (Skor 1-5 dalam Kotak)
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {isMurid ? 'Beri Penilaian untuk Teman' : 'Input Penilaian Teman Sejawat'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePeerReview} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!isMurid ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Murid Penilai (Yang Mengamati)
                    </label>
                    <select
                      value={formPenilaiId}
                      onChange={(e) => setFormPenilaiId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                    >
                      {studentsInClass.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Kamu (Penilai)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.name}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teman yang Dinilai
                  </label>
                  <select
                    value={formTargetMuridId}
                    onChange={(e) => setFormTargetMuridId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    {studentsInClass
                      .filter((s) => !isMurid || s.id !== currentUser.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.nis ? `(${s.nis})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Materi PJOK Terkait (Opsional)
                  </label>
                  <select
                    value={formMateriId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormMateriId(val);
                      if (val) {
                        const m = (db.materi || []).find((item) => item.id === val);
                        if (m) {
                          setFormKegiatan(`Praktik: ${m.judul}`);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="">-- Pilih Materi Pembelajaran (Opsional) --</option>
                    {(db.materi || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.judul}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kegiatan Praktik PJOK
                  </label>
                  <input
                    type="text"
                    value={formKegiatan}
                    onChange={(e) => setFormKegiatan(e.target.value)}
                    placeholder="Misal: Permainan Bola Voli Beregu / Senam Lantai..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* DYNAMIC DIMENSIONS (1 - 5 DALAM KOTAK) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Nilai Dimensi Asesmen (Pilih Angka 1-5 dalam Kotak):
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isMurid
                        ? 'Dimensi asesmen di bawah ini telah ditentukan oleh Guru PJOK. Berikan penilaian objektif 1-5.'
                        : 'Guru dapat menyesuaikan nama dimensi dan menambah dimensi penilaian sesuai materi pembelajaran.'}
                    </p>
                  </div>
                  {!isMurid && (
                    <button
                      type="button"
                      onClick={handleAddFormDimension}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Dimensi</span>
                    </button>
                  )}
                </div>

                {formDimensiList.map((dim, index) => {
                  const currentScore = formDimensiScores[dim.id] ?? 5;
                  return (
                    <div
                      key={dim.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {!isMurid ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <span className="text-xs font-black text-slate-500 shrink-0">
                              {index + 1}.
                            </span>
                            <input
                              type="text"
                              value={dim.nama}
                              onChange={(e) =>
                                handleUpdateFormDimensionName(dim.id, e.target.value)
                              }
                              placeholder="Nama dimensi penilaian..."
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                            />
                            {formDimensiList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFormDimension(dim.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                title="Hapus dimensi ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {index + 1}. {dim.nama}
                          </span>
                        )}

                        <span className="text-xs font-black text-indigo-700 shrink-0">
                          Skor: {currentScore}
                        </span>
                      </div>

                      {/* 1-5 DALAM KOTAK */}
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setFormDimensiScores((prev) => ({ ...prev, [dim.id]: val }))
                            }
                            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              currentScore === val
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {!isMurid && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={formSimpanSebagaiDimensiKelas}
                      onChange={(e) => setFormSimpanSebagaiDimensiKelas(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Simpan daftar dimensi di atas sebagai standar baku asesmen untuk Kelas{' '}
                      <strong>{currentKelas?.nama || selectedKelasId}</strong> (murid akan menilai sesuai dimensi ini).
                    </span>
                  </label>
                )}
              </div>

              {/* Upload Link Dokumentasi */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload Link Dokumentasi Praktik Bersama Teman (Opsional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={formLinkDokumentasi}
                    onChange={(e) => setFormLinkDokumentasi(e.target.value)}
                    placeholder="https://drive.google.com/... atau YouTube"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                  <input
                    type="text"
                    value={formNamaLinkDokumentasi}
                    onChange={(e) => setFormNamaLinkDokumentasi(e.target.value)}
                    placeholder="Judul Link (misal: Video Praktik Tim Bola Voli)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Tautkan link Google Drive, YouTube, atau album foto dokumentasi kegiatan bersama teman.
                </p>
              </div>

              {/* Kolom Kesan Positif & Apresiasi untuk Teman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>Kolom Kesan Positif & Apresiasi untuk Teman</span>
                </label>
                <textarea
                  rows={3}
                  value={formCatatanPositif}
                  onChange={(e) => setFormCatatanPositif(e.target.value)}
                  placeholder="Tuliskan pujian, apresiasi, atau hal positif yang kamu kagumi dari temanmu saat berolahraga bersama..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Simpan & Publikasikan Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL ATUR DIMENSI ASESMEN (GURU) ---------------- */}
      {isDimensiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Atur Dimensi Asesmen Teman Sejawat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi aspek yang dinilai pada form murid (Skala 1 - 5 dalam Kotak)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDimensiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Sinkronisasi Otomatis ke Akun Murid</span>
                </p>
                <p className="text-indigo-800/90 leading-relaxed text-[11px]">
                  Dimensi asesmen yang diatur di sini akan otomatis menjadi acuan isian form dan tombol angka 1-5 di akun seluruh murid pada kelas yang dipilih.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Pilih Kelas yang Diatur ({manageKelasIds.length} Terpilih)
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {availableClasses.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleSelectFirst3Classes}
                        className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
                        title="Pilih 3 kelas sekaligus untuk pembelajaran PJOK gabungan"
                      >
                        ⚡ 3 Kelas PJOK
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectAllAssignedClasses}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      Pilih Semua ({availableClasses.length})
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2">
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Centang kelas yang akan disinkronkan (bisa pilih lebih dari 1 saat pembelajaran PJOK berlangsung gabungan 3 kelas):
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {availableClasses.map((k) => {
                      const isSelected = manageKelasIds.includes(k.id);
                      const studentCount = (db.users || []).filter(
                        (u) => u.role === 'MURID' && u.kelasId === k.id
                      ).length;

                      return (
                        <label
                          key={k.id}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                              : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleManageKelas(k.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <span className="block truncate font-bold">Kelas {k.nama}</span>
                            <span className="text-[10px] text-slate-400 font-normal block">
                              {studentCount} murid
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {manageKelasIds.length > 0 && (
                    <div className="pt-1 text-[11px] text-indigo-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        Aktif untuk:{' '}
                        {availableClasses
                          .filter((k) => manageKelasIds.includes(k.id))
                          .map((k) => `Kelas ${k.nama}`)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Materi / Kegiatan Praktik Default
                </label>
                <input
                  type="text"
                  value={manageKegiatan}
                  onChange={(e) => setManageKegiatan(e.target.value)}
                  placeholder="Misal: Praktik Permainan Beregu Bola Voli..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Daftar Dimensi / Aspek Asesmen (1-5 dalam Kotak):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManageDimension}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Dimensi</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {manageDimensiItems.map((dim, idx) => (
                    <div
                      key={dim.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <span className="w-6 text-center text-xs font-black text-slate-400">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={dim.nama}
                        onChange={(e) =>
                          handleUpdateManageDimensionName(dim.id, e.target.value)
                        }
                        placeholder="Nama dimensi penilaian..."
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                      />
                      {manageDimensiItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveManageDimension(dim.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus dimensi ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetDefaultManageDimensi}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-semibold cursor-pointer"
                >
                  Reset ke 4 Dimensi Default
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDimensiModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveManageDimensi}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Simpan Dimensi Asesmen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT / EDIT TUGAS PENILAIAN ANTAR TEMAN */}
      <TugasPenilaianAntarTemanModal
        isOpen={isTugasModalOpen}
        onClose={() => {
          setIsTugasModalOpen(false);
          setTaskToEdit(null);
        }}
        db={db}
        currentUser={currentUser}
        taskToEdit={taskToEdit}
      />

      {/* MODAL BANK INDIKATOR MANUAL */}
      <BankIndikatorModal
        isOpen={isBankIndikatorModalOpen}
        onClose={() => setIsBankIndikatorModalOpen(false)}
        db={db}
      />

      {/* MODAL PENGISIAN / EDIT PENILAIAN OLEH MURID DENGAN RUBRIK SKALA 1-4 */}
      {activeTaskForEval && (
        <FormPenilaianMuridModal
          isOpen={isStudentFormModalOpen}
          onClose={() => {
            setIsStudentFormModalOpen(false);
            setActiveTaskForEval(null);
            setRecordToEdit(null);
          }}
          db={db}
          currentUser={currentUser}
          task={activeTaskForEval}
          existingRecord={recordToEdit}
        />
      )}
    </div>
  );
};
