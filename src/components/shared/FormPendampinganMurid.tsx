import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Printer,
  X,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle,
  Check,
  Send,
  MessageSquare,
  ChevronRight,
  History,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  User,
  PendampinganMuridRecord,
  StatusPendampingan,
  getTeacherAssignedClasses,
  NotifikasiItem,
} from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface FormPendampinganMuridProps {
  db: LMSDatabase;
  currentUser: User;
  initialKelasId?: string;
  initialTab?: 'alpa' | 'penanganan';
}

export const FormPendampinganMurid: React.FC<FormPendampinganMuridProps> = ({
  db,
  currentUser,
  initialKelasId,
  initialTab = 'alpa',
}) => {
  const isMurid = currentUser.role === 'MURID';

  // Daftar kelas yang tersedia bagi user
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas || [];
    }
    if (isMurid && currentUser.kelasId) {
      return (db.kelas || []).filter((k) => k.id === currentUser.kelasId);
    }
    return db.kelas || [];
  }, [currentUser, db.kelas, isMurid]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (isMurid && currentUser.kelasId) return currentUser.kelasId;
    if (initialKelasId && availableClasses.some((k) => k.id === initialKelasId)) {
      return initialKelasId;
    }
    return availableClasses.length > 0 ? availableClasses[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<'alpa' | 'penanganan'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Sinkronisasi jika initialKelasId atau targetRecord dikirimkan melalui navigasi / notifikasi
  useEffect(() => {
    if (!initialKelasId) return;
    if (availableClasses.some((k) => k.id === initialKelasId)) {
      setSelectedKelasId(initialKelasId);
      return;
    }
    const foundRec = (db.pendampinganMurid || []).find(
      (r) => r.id === initialKelasId || r.muridId === initialKelasId
    );
    if (foundRec) {
      if (foundRec.kelasId && availableClasses.some((k) => k.id === foundRec.kelasId)) {
        setSelectedKelasId(foundRec.kelasId);
      }
      setActiveTab('penanganan');
    }
  }, [initialKelasId, availableClasses, db.pendampinganMurid]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<PendampinganMuridRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Form State
  const [formMuridId, setFormMuridId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formJumlahAlpa, setFormJumlahAlpa] = useState<number>(0);
  const [formTanggalAlpaText, setFormTanggalAlpaText] = useState('');
  const [formJenisMasalah, setFormJenisMasalah] = useState('Sering Alpa / Bolos saat PJOK');
  const [formDeskripsiMasalah, setFormDeskripsiMasalah] = useState('');
  const [formTindakanPenanganan, setFormTindakanPenanganan] = useState('');
  const [formKomitmenMurid, setFormKomitmenMurid] = useState('');
  const [formStatus, setFormStatus] = useState<StatusPendampingan>('Dalam Proses');
  const [formCatatanGuru, setFormCatatanGuru] = useState('');

  // Murid Konsultasi & Klarifikasi State
  const [muridKendalaText, setMuridKendalaText] = useState('');
  const [muridKomitmenText, setMuridKomitmenText] = useState('');
  const [muridConsultationSent, setMuridConsultationSent] = useState(false);

  const currentKelas = useMemo(() => {
    return (db.kelas || []).find((k) => k.id === selectedKelasId);
  }, [db.kelas, selectedKelasId]);

  // Daftar seluruh murid di kelas yang dipilih
  const studentsInClass = useMemo(() => {
    return (db.users || [])
      .filter((u) => u.role === 'MURID' && u.kelasId === selectedKelasId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users, selectedKelasId]);

  // Rekapan Presensi & Deteksi Alpa Per Kelas
  const alpaStudentStats = useMemo(() => {
    const classPresensi = (db.presensi || []).filter((p) => p.kelasId === selectedKelasId);

    return studentsInClass.map((student) => {
      const records = classPresensi.filter((p) => p.muridId === student.id);
      const hadirCount = records.filter((p) => p.status === 'H').length;
      const sakitCount = records.filter((p) => p.status === 'S').length;
      const izinCount = records.filter((p) => p.status === 'I').length;
      const alpaRecords = records.filter((p) => p.status === 'A');
      const alpaCount = alpaRecords.length;
      const totalPertemuan = records.length;

      const alpaDates = alpaRecords.map((r) => r.tanggal).sort().reverse();
      const persenHadir = totalPertemuan > 0 ? Math.round((hadirCount / totalPertemuan) * 100) : 100;

      // Cek apakah sudah ada catatan pendampingan atau pesan konsultasi murid
      const existingPendampingan = (db.pendampinganMurid || []).filter(
        (rec) => rec.muridId === student.id
      ).sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || b.tanggal).getTime() -
          new Date(a.updatedAt || a.createdAt || a.tanggal).getTime()
      );

      const hasStudentMessage = existingPendampingan.some(
        (rec) => (rec.deskripsiMasalah && rec.deskripsiMasalah.length > 0) || (rec.komitmenMurid && rec.komitmenMurid.length > 0)
      );

      return {
        student,
        hadirCount,
        sakitCount,
        izinCount,
        alpaCount,
        totalPertemuan,
        persenHadir,
        alpaDates,
        existingPendampingan,
        hasStudentMessage,
        latestStatus: existingPendampingan[0]?.status,
      };
    });
  }, [studentsInClass, db.presensi, selectedKelasId, db.pendampinganMurid]);

  // Total ringkasan alpa di kelas
  const totalAlpaInClass = useMemo(() => {
    return alpaStudentStats.reduce((sum, s) => sum + s.alpaCount, 0);
  }, [alpaStudentStats]);

  const studentsWithAlpaCount = useMemo(() => {
    return alpaStudentStats.filter((s) => s.alpaCount > 0).length;
  }, [alpaStudentStats]);

  // Rekapan Berkas Pendampingan di kelas ini
  const classPendampinganRecords = useMemo(() => {
    return (db.pendampinganMurid || [])
      .filter((r) => r.kelasId === selectedKelasId)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [db.pendampinganMurid, selectedKelasId]);

  // Filter berkas pendampingan
  const filteredPendampinganRecords = useMemo(() => {
    return classPendampinganRecords.filter((r) => {
      const matchSearch =
        r.muridNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.nis && r.nis.includes(searchQuery)) ||
        r.jenisMasalah.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [classPendampinganRecords, searchQuery, filterStatus]);

  // Rekapan khusus Murid saat login sebagai murid
  const myAlpaStats = useMemo(() => {
    if (!isMurid) return null;
    const records = (db.presensi || []).filter((p) => p.muridId === currentUser.id);
    const hadir = records.filter((p) => p.status === 'H').length;
    const sakit = records.filter((p) => p.status === 'S').length;
    const izin = records.filter((p) => p.status === 'I').length;
    const alpaRecords = records.filter((p) => p.status === 'A');
    const alpa = alpaRecords.length;
    const alpaDates = alpaRecords.map((r) => r.tanggal).sort().reverse();

    const myPendampingan = (db.pendampinganMurid || [])
      .filter((r) => r.muridId === currentUser.id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || b.tanggal).getTime() -
          new Date(a.updatedAt || a.createdAt || a.tanggal).getTime()
      );

    return {
      hadir,
      sakit,
      izin,
      alpa,
      total: records.length,
      alpaDates,
      myPendampingan,
    };
  }, [isMurid, db.presensi, currentUser.id, db.pendampinganMurid]);

  // Rekapan Presensi Murid Pertanggal (tampilkan pertanggal untuk presensinya)
  const myPresensiPerTanggal = useMemo(() => {
    if (!isMurid) return [];
    return (db.presensi || [])
      .filter((p) => p.muridId === currentUser.id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [isMurid, db.presensi, currentUser.id]);

  // Sinkronkan input pertanyaan murid dengan berkas yang sudah ada
  React.useEffect(() => {
    if (isMurid && myAlpaStats && myAlpaStats.myPendampingan.length > 0) {
      const latest = myAlpaStats.myPendampingan[0];
      if (latest.deskripsiMasalah && !muridKendalaText) {
        setMuridKendalaText(latest.deskripsiMasalah);
      }
      if (latest.komitmenMurid && !muridKomitmenText) {
        setMuridKomitmenText(latest.komitmenMurid);
      }
    }
  }, [isMurid, myAlpaStats]);

  // Helper untuk membuka modal tambah pendampingan dari data alpa murid
  const handleOpenAddModal = (studentId?: string) => {
    const targetStudent = studentId
      ? studentsInClass.find((s) => s.id === studentId)
      : studentsInClass[0];

    if (!targetStudent) return;

    // Ambil presensi alpa murid OTOMATIS dari db.presensi
    const studentPresensi = (db.presensi || []).filter((p) => p.muridId === targetStudent.id);
    const alpaDates = studentPresensi
      .filter((p) => p.status === 'A')
      .map((p) => p.tanggal)
      .sort()
      .reverse();

    // Cek apakah murid ini sudah punya berkas pendampingan atau sudah mengirim pesan konsultasi
    const existingRecord = (db.pendampinganMurid || [])
      .filter((r) => r.muridId === targetStudent.id)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || b.tanggal).getTime() -
          new Date(a.updatedAt || a.createdAt || a.tanggal).getTime()
      )[0];

    setEditingRecordId(existingRecord ? existingRecord.id : null);
    setFormMuridId(targetStudent.id);
    setFormTanggal(existingRecord?.tanggal || new Date().toISOString().slice(0, 10));

    // OTOMATIS ISI SESUAI PRESENSI:
    setFormJumlahAlpa(alpaDates.length);
    setFormTanggalAlpaText(alpaDates.join(', '));

    if (existingRecord) {
      setFormJenisMasalah(
        existingRecord.jenisMasalah ||
          (alpaDates.length >= 3
            ? 'Sering Alpa / Bolos saat PJOK (≥3 Pertemuan)'
            : 'Sering Alpa / Bolos saat PJOK')
      );
      setFormDeskripsiMasalah(existingRecord.deskripsiMasalah || '');
      setFormKomitmenMurid(existingRecord.komitmenMurid || '');
      setFormTindakanPenanganan(existingRecord.tindakanPenanganan || '');
      setFormCatatanGuru(existingRecord.catatanGuru || '');
      setFormStatus(existingRecord.status || 'Dalam Proses');
    } else {
      setFormJenisMasalah(
        alpaDates.length >= 3
          ? 'Sering Alpa / Bolos saat PJOK (≥3 Pertemuan)'
          : 'Sering Alpa / Bolos saat PJOK'
      );
      setFormDeskripsiMasalah(
        alpaDates.length > 0
          ? `Murid tercatat tidak hadir tanpa keterangan (Alpa) sebanyak ${alpaDates.length} kali pada tanggal: ${alpaDates.join(', ')}.`
          : ''
      );
      setFormKomitmenMurid(
        'Berjanji akan selalu hadir tepat waktu, membawa seragam olahraga lengkap, dan aktif dalam setiap kegiatan praktik PJOK.'
      );
      setFormTindakanPenanganan(
        'Melakukan bimbingan konseling personal, mengonfirmasi kendala kehadiran/kesehatan murid, dan memberikan pengarahan komitmen disiplin belajar PJOK.'
      );
      setFormCatatanGuru('');
      setFormStatus('Dalam Proses');
    }

    setIsModalOpen(true);
  };

  // Helper saat guru mengganti murid di dropdown modal
  const handleModalStudentChange = (newStudentId: string) => {
    setFormMuridId(newStudentId);
    const targetStudent = studentsInClass.find((s) => s.id === newStudentId);
    if (!targetStudent) return;

    // Hitung otomatis alpa dari presensi
    const studentPresensi = (db.presensi || []).filter((p) => p.muridId === newStudentId);
    const alpaDates = studentPresensi
      .filter((p) => p.status === 'A')
      .map((p) => p.tanggal)
      .sort()
      .reverse();

    setFormJumlahAlpa(alpaDates.length);
    setFormTanggalAlpaText(alpaDates.join(', '));

    // Ambil jawaban konsultasi yang mungkin sudah dikirim oleh murid ini
    const existingRecord = (db.pendampinganMurid || [])
      .filter((r) => r.muridId === newStudentId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || b.tanggal).getTime() -
          new Date(a.updatedAt || a.createdAt || a.tanggal).getTime()
      )[0];

    if (existingRecord) {
      setEditingRecordId(existingRecord.id);
      setFormJenisMasalah(existingRecord.jenisMasalah);
      setFormDeskripsiMasalah(existingRecord.deskripsiMasalah || '');
      setFormKomitmenMurid(existingRecord.komitmenMurid || '');
      setFormTindakanPenanganan(existingRecord.tindakanPenanganan || '');
      setFormCatatanGuru(existingRecord.catatanGuru || '');
      setFormStatus(existingRecord.status);
    } else {
      setEditingRecordId(null);
      setFormDeskripsiMasalah(
        alpaDates.length > 0
          ? `Murid tercatat tidak hadir tanpa keterangan (Alpa) sebanyak ${alpaDates.length} kali pada tanggal: ${alpaDates.join(', ')}.`
          : ''
      );
      setFormKomitmenMurid(
        'Berjanji akan selalu hadir tepat waktu, membawa seragam olahraga lengkap, dan aktif dalam setiap kegiatan praktik PJOK.'
      );
      setFormTindakanPenanganan('');
      setFormCatatanGuru('');
      setFormStatus('Dalam Proses');
    }
  };

  // Helper tombol sinkronisasi ulang alpa dari presensi
  const handleSyncAlpaFromPresensi = () => {
    if (!formMuridId) return;
    const studentPresensi = (db.presensi || []).filter((p) => p.muridId === formMuridId);
    const alpaDates = studentPresensi
      .filter((p) => p.status === 'A')
      .map((p) => p.tanggal)
      .sort()
      .reverse();
    setFormJumlahAlpa(alpaDates.length);
    setFormTanggalAlpaText(alpaDates.join(', '));
  };

  // Buka modal edit
  const handleOpenEditModal = (rec: PendampinganMuridRecord) => {
    setEditingRecordId(rec.id);
    setFormMuridId(rec.muridId);
    setFormTanggal(rec.tanggal);

    // Otomatis sinkronkan dari data presensi murid jika ada
    const studentPresensi = (db.presensi || []).filter((p) => p.muridId === rec.muridId);
    const alpaDates = studentPresensi
      .filter((p) => p.status === 'A')
      .map((p) => p.tanggal)
      .sort()
      .reverse();

    const datesList =
      rec.tanggalAlpaList && rec.tanggalAlpaList.length > 0
        ? rec.tanggalAlpaList
        : alpaDates;

    setFormJumlahAlpa(datesList.length || rec.jumlahAlpa || 0);
    setFormTanggalAlpaText(datesList.join(', '));
    setFormJenisMasalah(rec.jenisMasalah);
    setFormDeskripsiMasalah(rec.deskripsiMasalah);
    setFormTindakanPenanganan(rec.tindakanPenanganan);
    setFormKomitmenMurid(rec.komitmenMurid);
    setFormStatus(rec.status);
    setFormCatatanGuru(rec.catatanGuru || '');
    setIsModalOpen(true);
  };

  // Simpan record pendampingan
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = studentsInClass.find((s) => s.id === formMuridId);
    if (!targetStudent) {
      alert('Pilih murid yang bersangkutan.');
      return;
    }

    const datesList = formTanggalAlpaText
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    const record: PendampinganMuridRecord = {
      id: editingRecordId || `pnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      muridId: targetStudent.id,
      muridNama: targetStudent.name,
      nis: targetStudent.nis,
      kelasId: selectedKelasId,
      kelasNama: currentKelas?.nama || selectedKelasId,
      tanggal: formTanggal,
      jumlahAlpa: Number(formJumlahAlpa) || 0,
      tanggalAlpaList: datesList,
      jenisMasalah: formJenisMasalah.trim(),
      deskripsiMasalah: formDeskripsiMasalah.trim(),
      tindakanPenanganan: formTindakanPenanganan.trim(),
      komitmenMurid: formKomitmenMurid.trim(),
      status: formStatus,
      guruId: currentUser.id,
      guruNama: currentUser.name,
      catatanGuru: formCatatanGuru.trim() || undefined,
      createdAt: editingRecordId
        ? (classPendampinganRecords.find((r) => r.id === editingRecordId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Notifikasi untuk murid bahwa guru telah memberikan arahan & tindakan pembinaan
    const notifMurid: NotifikasiItem = {
      id: `notif-pnd-res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      judul: `Tanggapan Pendampingan dari ${currentUser.name}`,
      pesan: `Guru PJOK (${currentUser.name}) telah meninjau formulir pendampingan (${record.status}). Tindakan pembinaan: "${record.tindakanPenanganan || 'Telah diverifikasi'}".`,
      waktu: 'Baru saja',
      tipe: 'pendampingan',
      targetRole: 'MURID',
      targetMuridId: targetStudent.id,
      targetMenu: 'pendampingan-murid-saya',
      targetId: record.id,
      dibaca: false,
    };

    dataStorage.updateDatabase((prev) => {
      const list = prev.pendampinganMurid || [];
      const idx = list.findIndex((r) => r.id === record.id);
      const updatedList =
        idx >= 0
          ? [...list.slice(0, idx), record, ...list.slice(idx + 1)]
          : [record, ...list];
      // Hapus notifikasi guru terkait pendampingan murid ini karena sudah ditangani
      const cleanedNotifs = (prev.notifikasi || []).filter(
        (n) => !(n.targetId === record.id && n.tipe === 'pendampingan' && (n.targetRole === 'GURU' || n.targetRole === 'ALL'))
      );
      return {
        ...prev,
        pendampinganMurid: updatedList,
        notifikasi: [notifMurid, ...cleanedNotifs],
      };
    });

    setIsModalOpen(false);
    setActiveTab('penanganan');
  };

  // Helper kirim pesan konsultasi dari akun murid
  const handleSendMuridConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!muridKendalaText.trim() && !muridKomitmenText.trim()) {
      alert('Mohon isi penjelasan kendala kesehatan/izin atau komitmen perubahan.');
      return;
    }

    const myClass = (db.kelas || []).find((k) => k.id === currentUser.kelasId);
    const myTeacher =
      (db.users || []).find(
        (u) =>
          u.role === 'GURU' &&
          ((u.kelasDiampuIds && u.kelasDiampuIds.includes(currentUser.kelasId || '')) ||
            (u.kelasDiampu && u.kelasDiampu.includes(myClass?.nama || '')) ||
            u.id === myClass?.waliId)
      ) || (db.users || []).find((u) => u.role === 'GURU');

    const existingRecord = myAlpaStats?.myPendampingan[0];

    const newRecord: PendampinganMuridRecord = {
      id: existingRecord?.id || `pnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      muridId: currentUser.id,
      muridNama: currentUser.name,
      nis: currentUser.nis,
      kelasId: currentUser.kelasId || '',
      kelasNama: myClass?.nama || currentUser.kelasId || '',
      tanggal: existingRecord?.tanggal || new Date().toISOString().slice(0, 10),
      jumlahAlpa: myAlpaStats?.alpa || 0,
      tanggalAlpaList: myAlpaStats?.alpaDates || [],
      jenisMasalah:
        (myAlpaStats?.alpa || 0) > 0
          ? `Klarifikasi Presensi Alpa (${myAlpaStats?.alpa} Pertemuan)`
          : 'Konsultasi Belajar PJOK',
      deskripsiMasalah: muridKendalaText.trim(),
      komitmenMurid: muridKomitmenText.trim(),
      tindakanPenanganan: existingRecord?.tindakanPenanganan || '',
      status: existingRecord?.status || 'Dalam Proses',
      catatanGuru: existingRecord?.catatanGuru || '',
      guruId: existingRecord?.guruId || myTeacher?.id || '',
      guruNama: existingRecord?.guruNama || myTeacher?.name || 'Guru PJOK',
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Buat notifikasi instan untuk Guru PJOK dan Admin
    const notifGuru: NotifikasiItem = {
      id: `notif-pnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      judul: `Form Pendampingan: ${currentUser.name} (${myClass?.nama || 'Murid'})`,
      pesan: `${currentUser.name} telah mengirim penjelasan kendala & komitmen belajar pada Form Pendampingan Murid. Perlu ditinjau dan diberikan arahan pembinaan guru.`,
      waktu: 'Baru saja',
      tipe: 'pendampingan',
      targetRole: 'GURU',
      targetKelasId: currentUser.kelasId || 'ALL',
      targetKelasNama: myClass?.nama || '',
      targetMenu: 'pendampingan-murid',
      targetId: newRecord.id,
      dibaca: false,
    };

    dataStorage.updateDatabase((prev) => {
      const list = prev.pendampinganMurid || [];
      const idx = list.findIndex((r) => r.id === newRecord.id);
      const updatedList =
        idx >= 0
          ? [...list.slice(0, idx), newRecord, ...list.slice(idx + 1)]
          : [newRecord, ...list];
      return {
        ...prev,
        pendampinganMurid: updatedList,
        notifikasi: [notifGuru, ...(prev.notifikasi || [])],
      };
    });

    setMuridConsultationSent(true);
    setTimeout(() => setMuridConsultationSent(false), 5000);
  };

  const handleDeleteRecord = (id: string, nama: string) => {
    if (window.confirm(`Hapus berkas pendampingan untuk ${nama}? Tindakan ini tidak dapat dibatalkan.`)) {
      dataStorage.deletePendampinganMurid(id);
    }
  };

  const handlePrintRecord = (rec: PendampinganMuridRecord) => {
    setSelectedRecordForPrint(rec);
    setIsPrintModalOpen(true);
  };

  // ----------------------------------------------------
  // TAMPILAN MURID (LOGIN SEBAGAI MURID)
  // ----------------------------------------------------
  if (isMurid) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Header Murid */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md">
              <UserCheck className="w-4 h-4 text-emerald-300" />
              Bimbingan & Pendampingan Murid PJOK
            </span>
            <h1 className="text-xl sm:text-2xl font-black">
              Form & Rekapan Pendampingan Belajar Murid
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
              Pantau rekap kehadiran belajar PJOK pertanggal, status tanggal alpa, isi formulir konsultasi &
              komitmen belajar, serta tinjau solusi pembinaan langsung dari Guru PJOK.
            </p>
          </div>
        </div>

        {/* NOTIFIKASI OTOMATIS KETIKA PRESENSI ALPA */}
        {myAlpaStats && myAlpaStats.alpa > 0 ? (
          <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-md flex items-start gap-4">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-2xl shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-xs space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-sm text-rose-950 flex items-center gap-1.5">
                  ⚠️ Pemberitahuan Presensi Alpa Terdeteksi ({myAlpaStats.alpa} Pertemuan)
                </h3>
                <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 font-extrabold rounded-full text-[11px]">
                  Perlu Penanganan
                </span>
              </div>
              <p className="text-rose-900 leading-relaxed">
                Kamu tercatat memiliki ketidakhadiran tanpa keterangan (Alpa) sebanyak{' '}
                <strong>{myAlpaStats.alpa} kali</strong> pada tanggal:{' '}
                <span className="font-black text-rose-950 bg-rose-200/80 px-2 py-0.5 rounded-md">
                  {myAlpaStats.alpaDates.join(', ')}
                </span>
                .
              </p>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Silakan isi formulir konsultasi dan rencana tindak lanjut di bawah ini agar Guru PJOK dapat
                memverifikasi kendala kesehatan atau izin mendadakmu dan memberikan solusi bimbingan.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-900">
              <strong>Presensi Tertib & Disiplin!</strong> Kamu tidak memiliki catatan Alpa dalam
              pembelajaran PJOK. Pertahankan kedisiplinan dan semangat belajarmu!
            </p>
          </div>
        )}

        {/* Ringkasan Presensi Saya */}
        {myAlpaStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Hadir (H)</span>
              <span className="text-2xl font-black text-emerald-600">{myAlpaStats.hadir}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Pertemuan</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Sakit (S)</span>
              <span className="text-2xl font-black text-blue-600">{myAlpaStats.sakit}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Pertemuan</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Izin (I)</span>
              <span className="text-2xl font-black text-amber-600">{myAlpaStats.izin}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Pertemuan</span>
            </div>
            <div
              className={`p-4 rounded-2xl border shadow-xs text-center ${
                myAlpaStats.alpa > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200/80 text-slate-700'
              }`}
            >
              <span className="text-[11px] font-bold block uppercase">Alpa / Tanpa Ket.</span>
              <span className={`text-2xl font-black ${myAlpaStats.alpa > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {myAlpaStats.alpa}
              </span>
              <span className="text-[10px] block mt-1">
                {myAlpaStats.alpa > 0 ? 'Perlu Klarifikasi' : 'Nihil Alpa'}
              </span>
            </div>
          </div>
        )}

        {/* REKAPAN PRESENSI PERTANGGAL UNTUK PRESENSINYA */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Rekapan Presensi Pertanggal
            </h2>
            <span className="text-xs font-bold text-slate-500">
              Total {myPresensiPerTanggal.length} Catatan Presensi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase">
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Tanggal Presensi</th>
                  <th className="py-2.5 px-3 text-center w-28">Status Kehadiran</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myPresensiPerTanggal.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Belum ada data rekapan presensi yang tercatat untuk akun Anda.
                    </td>
                  </tr>
                ) : (
                  myPresensiPerTanggal.map((p, idx) => (
                    <tr
                      key={p.id || `${p.tanggal}-${idx}`}
                      className={`hover:bg-slate-50 transition-colors ${
                        p.status === 'A' ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {p.tanggal}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {p.status === 'H' ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-[11px]">
                            Hadir (H)
                          </span>
                        ) : p.status === 'S' ? (
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold rounded-lg text-[11px]">
                            Sakit (S)
                          </span>
                        ) : p.status === 'I' ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold rounded-lg text-[11px]">
                            Izin (I)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black rounded-lg text-[11px] border border-rose-300">
                            Alpa (A)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.catatan || (p.status === 'A' ? 'Tanpa keterangan resmi' : '-')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FORM PENDAMPINGAN & KONSULTASI MURID */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Formulir Konsultasi & Komitmen Murid
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Isi jawaban pada dua pertanyaan di bawah ini untuk dikirimkan langsung ke Guru PJOK.
            </p>
          </div>

          <form onSubmit={handleSendMuridConsultation} className="space-y-4">
            {/* Pertanyaan 1 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                1. Ada kendala kesehatan atau izin mendadak yang belum tercatat? Tuliskan penjelasanmu di sini untuk guru PJOK.
              </label>
              <textarea
                rows={3}
                value={muridKendalaText}
                onChange={(e) => setMuridKendalaText(e.target.value)}
                placeholder="Tuliskan kendala kesehatan, alasan ketidakhadiran mendadak, surat dokter, atau izin yang belum sempat tercatat..."
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Pertanyaan 2 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                2. Rencana Tindak Lanjut/Komitmen & Janji Perubahan Murid:
              </label>
              <textarea
                rows={3}
                value={muridKomitmenText}
                onChange={(e) => setMuridKomitmenText(e.target.value)}
                placeholder="Tuliskan rencana tindakan perbaikanmu, komitmen untuk disiplin hadir tepat waktu, dan janji aktif berolahraga di pertemuan berikutnya..."
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Tombol Kirim Pesan Konsultasi */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-400">
                Pesan ini akan langsung muncul pada Form Pendampingan akun Guru PJOK.
              </p>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pesan Konsultasi</span>
              </button>
            </div>

            {muridConsultationSent && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Pesan konsultasi berhasil dikirimkan ke Guru PJOK! Guru akan segera meninjau dan memberikan
                  Bentuk Tindakan / Solusi Pembinaan.
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Riwayat Bimbingan & Arahan Guru PJOK */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Tanggapan & Bentuk Tindakan Pembinaan dari Guru PJOK
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {myAlpaStats?.myPendampingan.length || 0} Berkas Tercatat
            </span>
          </div>

          {myAlpaStats?.myPendampingan.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
              <p className="text-xs font-bold text-slate-600">
                Belum Ada Catatan Bimbingan Khusus
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Jika kamu telah mengirim pesan konsultasi, silakan menunggu tanggapan dan arahan pembinaan dari Guru PJOK.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myAlpaStats?.myPendampingan.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        Tanggal: {rec.tanggal}
                      </span>
                      <span className="text-xs text-slate-500">
                        Guru Pendamping: <strong className="text-slate-800">{rec.guruNama}</strong>
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        rec.status === 'Selesai / Teratasi'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'Perlu Pemantauan Khusus'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {rec.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">Klarifikasi / Kendala Kamu:</span>
                      <p className="font-semibold text-slate-800 mt-0.5">{rec.deskripsiMasalah || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-indigo-700 block">
                        Bentuk Tindakan / Solusi Pembinaan Guru PJOK:
                      </span>
                      <p className="font-semibold text-indigo-950 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-200 mt-0.5 leading-relaxed">
                        {rec.tindakanPenanganan || 'Menunggu verifikasi dan tindakan pembinaan dari Guru PJOK.'}
                      </p>
                    </div>
                  </div>

                  {rec.komitmenMurid && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-emerald-950 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Komitmen & Janji Perubahan yang Kamu Sepakati:
                      </span>
                      <p className="text-emerald-900 italic">&quot;{rec.komitmenMurid}&quot;</p>
                    </div>
                  )}

                  {rec.catatanGuru && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
                      <strong>Catatan Guru PJOK:</strong> {rec.catatanGuru}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // TAMPILAN GURU & ADMIN
  // ----------------------------------------------------
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Fitur Pembelajaran: Form Pendampingan Murid
            </span>
            <span className="text-xs text-slate-300">
              Tahun Ajaran: <strong>{db.settings?.tahunPelajaran || '2026/2027'}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Form Pendampingan & Penanganan Murid Bermasalah
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Modul pemantauan presensi murid per kelas dengan keterangan <strong>Alpa (A)</strong>,
            pencatatan kronologi permasalahan belajar PJOK, penanganan bimbingan konseling,
            serta penerbitan surat komitmen pembinaan murid.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">Murid di Kelas</span>
              <span className="text-xl font-black text-white">{studentsInClass.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">Murid Memiliki Alpa</span>
              <span className="text-xl font-black text-amber-300">{studentsWithAlpaCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">Akumulasi Jam Alpa</span>
              <span className="text-xl font-black text-rose-300">{totalAlpaInClass} Kali</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-300 block">Berkas Bimbingan</span>
              <span className="text-xl font-black text-emerald-300">{classPendampinganRecords.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Pilih Kelas & Tab */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Class Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 shrink-0">
            Pilih Kelas:
          </label>
          <select
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
          >
            {availableClasses.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} ({k.tingkat || 'Fase E/F'})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('alpa')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'alpa'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Rekapan Presensi Alpa Murid ({studentsWithAlpaCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penanganan')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'penanganan'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Daftar Berkas Penanganan ({classPendampinganRecords.length})</span>
          </button>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Form Pendampingan Baru</span>
        </button>
      </div>

      {/* ---------------- TAB 1: REKAPAN PRESENSI ALPA PER KELAS ---------------- */}
      {activeTab === 'alpa' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-700">
            <div>
              <span>Rekapan Presensi Murid Berstatus Alpa (A) - Kelas {currentKelas?.nama}</span>
              <p className="text-[11px] text-slate-400 font-normal">
                Murid dengan keterangan Alpa diprioritaskan untuk pendampingan konseling dan penanganan khusus.
              </p>
            </div>
            <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-bold self-start sm:self-auto">
              Total {studentsWithAlpaCount} dari {studentsInClass.length} Murid Pernah Alpa
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-700 font-extrabold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[170px]">Nama Murid & NIS</th>
                  <th className="py-3 px-2 text-center w-16">Hadir</th>
                  <th className="py-3 px-2 text-center w-16">Sakit</th>
                  <th className="py-3 px-2 text-center w-16">Izin</th>
                  <th className="py-3 px-2 text-center w-20 text-rose-700 bg-rose-50/60">Alpa (A)</th>
                  <th className="py-3 px-3 min-w-[170px]">Tanggal Alpa Terdata</th>
                  <th className="py-3 px-3 min-w-[210px]">Permasalahan Disampaikan Murid</th>
                  <th className="py-3 px-2 text-center w-24">Urgensi</th>
                  <th className="py-3 px-3 min-w-[140px]">Status Bimbingan</th>
                  <th className="py-3 px-3 text-center w-32">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alpaStudentStats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Tidak ada data murid ditemukan di kelas {currentKelas?.nama}.
                    </td>
                  </tr>
                ) : (
                  alpaStudentStats.map((item, idx) => {
                    const hasAlpa = item.alpaCount > 0;
                    const isCritical = item.alpaCount >= 3;
                    const latestStudentProblem = item.existingPendampingan.find((r) => r.deskripsiMasalah?.trim())?.deskripsiMasalah;

                    return (
                      <tr
                        key={item.student.id}
                        className={`transition-colors hover:bg-slate-50/70 ${
                          isCritical
                            ? 'bg-rose-50/30'
                            : hasAlpa
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-extrabold text-slate-900 leading-tight">
                            {item.student.name}
                          </p>
                          <p className="text-[10px] text-slate-400">NIS: {item.student.nis || '-'}</p>
                          {item.hasStudentMessage && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-extrabold">
                              <MessageSquare className="w-3 h-3" />
                              Pesan Konsultasi Murid Tersedia
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-700">
                          {item.hadirCount}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-blue-700">
                          {item.sakitCount}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-amber-700">
                          {item.izinCount}
                        </td>
                        <td className="py-3 px-2 text-center font-black text-rose-700 bg-rose-50/40">
                          {item.alpaCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
                              {item.alpaCount} Alpa
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.alpaDates.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.alpaDates.map((dt, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px] font-bold"
                                >
                                  {dt}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px] italic">Tidak pernah alpa</span>
                          )}
                        </td>
                        <td className="py-3 px-3 min-w-[190px] max-w-xs">
                          {latestStudentProblem ? (
                            <div className="p-2 bg-amber-50/90 border border-amber-200/90 rounded-xl space-y-0.5 shadow-2xs">
                              <div className="flex items-center gap-1 text-[9px] font-black text-amber-900 uppercase tracking-wider">
                                <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Disampaikan Murid:</span>
                              </div>
                              <p className="text-[11px] text-slate-800 line-clamp-2 leading-relaxed">
                                &quot;{latestStudentProblem}&quot;
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">Belum ada penjelasan kendala</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-[10px] font-black uppercase">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Kritis (≥3)
                            </span>
                          ) : hasAlpa ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-black uppercase">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Perlu Bimbingan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Tertib
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.existingPendampingan.length > 0 ? (
                            <div>
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.latestStatus === 'Selesai / Teratasi'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.latestStatus === 'Perlu Pemantauan Khusus'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.latestStatus || 'Ada Catatan'}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                {item.existingPendampingan.length} berkas tercatat
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Belum ada berkas</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(item.student.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                              item.hasStudentMessage
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-300 shadow-xs'
                                : hasAlpa
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {item.hasStudentMessage
                                ? 'Tanggapi Murid'
                                : hasAlpa
                                ? 'Bina Murid'
                                : 'Pendampingan'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: DAFTAR BERKAS PENANGANAN ---------------- */}
      {activeTab === 'penanganan' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama murid, NIS, atau masalah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 shrink-0">Filter Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">Semua Status</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Selesai / Teratasi">Selesai / Teratasi</option>
                <option value="Perlu Pemantauan Khusus">Perlu Pemantauan Khusus</option>
                <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
              </select>
            </div>
          </div>

          {/* Records List */}
          {filteredPendampinganRecords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">
                Belum ada berkas pendampingan murid untuk kelas {currentKelas?.nama}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Silakan beralih ke tab &quot;Rekapan Presensi Alpa Murid&quot; untuk memilih murid yang memerlukan
                pembinaan, atau klik tombol &quot;Buat Form Pendampingan Baru&quot;.
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Form Pendampingan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPendampinganRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{rec.muridNama}</h3>
                      <span className="text-xs text-slate-400">NIS: {rec.nis || '-'}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                        Kelas {rec.kelasNama}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          rec.status === 'Selesai / Teratasi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Perlu Pemantauan Khusus'
                            ? 'bg-rose-100 text-rose-800'
                            : rec.status === 'Dirujuk ke Guru BK'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status}
                      </span>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={() => handlePrintRecord(rec)}
                        title="Cetak Lembar Pendampingan & Surat Komitmen"
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(rec)}
                        title="Edit Berkas"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id, rec.muridNama)}
                        title="Hapus Berkas"
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Kolom 1: Permasalahan yang Disampaikan oleh Murid */}
                    <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1.5">
                      <span className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1 tracking-wider">
                        <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                        Permasalahan Disampaikan Murid
                      </span>
                      <p className="font-extrabold text-rose-700">{rec.jenisMasalah}</p>
                      <div className="bg-white/90 p-2 rounded-xl border border-amber-200/60">
                        <p className="text-slate-800 leading-relaxed text-[11px] italic">
                          &quot;{rec.deskripsiMasalah || 'Tidak ada deskripsi rinci kendala dari murid.'}&quot;
                        </p>
                      </div>
                      {rec.tanggalAlpaList && rec.tanggalAlpaList.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Tanggal Alpa ({rec.jumlahAlpa}x):
                          </span>
                          <span className="text-[10px] font-bold text-rose-800">
                            {rec.tanggalAlpaList.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Kolom 2: Penanganan Guru */}
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1.5">
                      <span className="text-[10px] font-black text-indigo-400 uppercase block tracking-wider">
                        Bentuk Tindakan Pembinaan
                      </span>
                      <p className="font-semibold text-indigo-950 leading-relaxed text-[11px]">
                        {rec.tindakanPenanganan}
                      </p>
                      <p className="text-[10px] text-slate-500 pt-1">
                        Guru Pendamping: <strong className="text-slate-700">{rec.guruNama}</strong>
                      </p>
                    </div>

                    {/* Kolom 3: Komitmen Murid */}
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5">
                      <span className="text-[10px] font-black text-emerald-500 uppercase block tracking-wider">
                        Komitmen Tertulis Murid
                      </span>
                      <p className="font-medium text-emerald-950 italic leading-relaxed text-[11px]">
                        &quot;{rec.komitmenMurid || 'Murid berjanji akan aktif dan disiplin hadir.'}&quot;
                      </p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Dicatat pada: {rec.tanggal}
                      </span>
                    </div>
                  </div>

                  {rec.catatanGuru && (
                    <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                      <strong>Catatan Evaluasi Guru:</strong> {rec.catatanGuru}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODAL FORM INPUT PENDAMPINGAN ---------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-black text-slate-900">
                  {editingRecordId ? 'Edit Berkas Pendampingan Murid' : 'Form Pendampingan Murid Bermasalah'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pilih Murid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Murid yang Didampingi:
                  </label>
                  <select
                    value={formMuridId}
                    onChange={(e) => handleModalStudentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    {studentsInClass.map((s) => {
                      const stat = alpaStudentStats.find((a) => a.student.id === s.id);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.nis ? `(${s.nis})` : ''} - {stat?.alpaCount || 0} Alpa
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tanggal Pendampingan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pendampingan:
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Data Alpa Terkait - Otomatis dari Presensi */}
              <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-black text-rose-950">
                      Rekapan Alpa Otomatis dari Presensi
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAlpaFromPresensi}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-indigo-600" />
                    <span>Sinkronkan Ulang dari Presensi</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">
                      Jumlah Alpa Terdata:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formJumlahAlpa}
                      onChange={(e) => setFormJumlahAlpa(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-black text-rose-950 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">
                      Tanggal-tanggal Alpa (Pisahkan dengan koma):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formTanggalAlpaText}
                        onChange={(e) => setFormTanggalAlpaText(e.target.value)}
                        placeholder="Otomatis terisi dari presensi, contoh: 2026-08-10, 2026-08-17"
                        className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-rose-950 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Otomatis terisi sesuai rekapan presensi murid ({formJumlahAlpa}x alpa)
                    </span>
                  </div>
                </div>
              </div>

              {/* Kategori Masalah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Permasalahan Murid:
                </label>
                <select
                  value={formJenisMasalah}
                  onChange={(e) => setFormJenisMasalah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
                >
                  <option value="Sering Alpa / Bolos saat PJOK">Sering Alpa / Bolos saat PJOK</option>
                  <option value="Menolak / Tidak Mengikuti Aktivitas Praktik Lapangan">
                    Menolak / Tidak Mengikuti Aktivitas Praktik Lapangan
                  </option>
                  <option value="Tugas / Tagihan Belajar Tidak Lengkap">
                    Tugas / Tagihan Belajar Tidak Lengkap
                  </option>
                  <option value="Pelanggaran Kedisiplinan & Sikap / Tidak Memakai Seragam">
                    Pelanggaran Kedisiplinan & Sikap / Tidak Memakai Seragam
                  </option>
                  <option value="Masalah Kesehatan / Kendala Khusus Murid">
                    Masalah Kesehatan / Kendala Khusus Murid
                  </option>
                  <option value="Lainnya">Kategori Lainnya</option>
                </select>
              </div>

              {/* Jawaban / Penjelasan dari Akun Murid */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    Jawaban Konsultasi dari Akun Murid
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Otomatis dari Akun Murid
                  </span>
                </div>

                {/* Pertanyaan 1 Murid */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ada kendala kesehatan atau izin mendadak yang belum tercatat? Tuliskan penjelasanmu di sini untuk guru PJOK:
                  </label>
                  <textarea
                    rows={2}
                    value={formDeskripsiMasalah}
                    onChange={(e) => setFormDeskripsiMasalah(e.target.value)}
                    placeholder="Jawaban kendala kesehatan atau alasan ketidakhadiran dari murid..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                {/* Pertanyaan 2 Murid */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rencana Tindak Lanjut/Komitmen & Janji Perubahan Murid:
                  </label>
                  <textarea
                    rows={2}
                    value={formKomitmenMurid}
                    onChange={(e) => setFormKomitmenMurid(e.target.value)}
                    placeholder="Komitmen dan janji perubahan murid untuk hadir dan aktif belajar..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* BAGIAN GURU PJOK: Guru hanya mengisi Bentuk Tindakan & Catatan */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border-2 border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Diisi oleh Guru PJOK: Bentuk Tindakan Pembinaan & Catatan
                  </span>
                  <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    Wajib Diisi Guru
                  </span>
                </div>

                {/* Bentuk Tindakan Pembinaan */}
                <div>
                  <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                    Bentuk Tindakan / Solusi Pembinaan Guru PJOK:
                  </label>
                  <textarea
                    rows={3}
                    value={formTindakanPenanganan}
                    onChange={(e) => setFormTindakanPenanganan(e.target.value)}
                    placeholder="Contoh: Bimbingan konseling personal mengenai pentingnya kebugaran jasmani, pemanggilan murid secara khusus, koordinasi dengan wali kelas, pemberian remedial praktik PJOK..."
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Status Penanganan & Catatan Guru */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      Status Penanganan Saat Ini:
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusPendampingan)}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                    >
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Selesai / Teratasi">Selesai / Teratasi</option>
                      <option value="Perlu Pemantauan Khusus">Perlu Pemantauan Khusus</option>
                      <option value="Dirujuk ke Guru BK">Dirujuk ke Guru BK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      Catatan Guru PJOK:
                    </label>
                    <input
                      type="text"
                      value={formCatatanGuru}
                      onChange={(e) => setFormCatatanGuru(e.target.value)}
                      placeholder="Catatan tambahan hasil pembinaan atau jadwal pantau..."
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {editingRecordId ? 'Perbarui Berkas' : 'Simpan Berkas Pendampingan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL CETAK LEMBAR BUKTI PENDAMPINGAN ---------------- */}
      {isPrintModalOpen && selectedRecordForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-600" />
                Pratinjau Lembar Bukti Pendampingan & Surat Komitmen
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Document Content */}
            <div className="p-8 space-y-6 text-slate-800" id="print-lembar-pendampingan">
              {/* Kop Surat */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <h2 className="text-sm font-black uppercase tracking-wider">
                  {db.settings?.namaSekolah || 'SMA NEGERI 1 TEJAKULA'}
                </h2>
                <h3 className="text-xs font-extrabold uppercase">
                  LEMBAR BUKTI PENDAMPINGAN DAN PEMBINAAN MURID
                </h3>
                <p className="text-[11px] text-slate-600">
                  Mata Pelajaran: PJOK • Tahun Pelajaran: {db.settings?.tahunPelajaran || '2026/2027'}
                </p>
              </div>

              {/* Identitas Murid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Nama Murid:</span>{' '}
                    <strong className="text-slate-900">{selectedRecordForPrint.muridNama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Kelas / Rombel:</span>{' '}
                    <strong className="text-slate-900">{selectedRecordForPrint.kelasNama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Nomor Induk Murid (NIS):</span>{' '}
                    <strong className="text-slate-900">{selectedRecordForPrint.nis || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tanggal Bimbingan:</span>{' '}
                    <strong className="text-slate-900">{selectedRecordForPrint.tanggal}</strong>
                  </div>
                </div>
              </div>

              {/* Uraian Masalah */}
              <div className="text-xs space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  1. Permasalahan yang Disampaikan Murid & Rekap Ketidakhadiran Alpa:
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="font-bold text-rose-800 text-xs">Kategori: {selectedRecordForPrint.jenisMasalah}</p>
                  <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg space-y-1">
                    <span className="text-[10px] font-black text-amber-900 flex items-center gap-1 uppercase tracking-wider">
                      <MessageSquare className="w-3 h-3 text-amber-600" />
                      Permasalahan yang Disampaikan oleh Murid:
                    </span>
                    <p className="text-slate-800 leading-relaxed italic text-xs bg-white p-2 rounded border border-amber-200/60">
                      &quot;{selectedRecordForPrint.deskripsiMasalah || 'Tidak ada uraian kendala mandiri dari murid.'}&quot;
                    </p>
                  </div>
                  {selectedRecordForPrint.tanggalAlpaList && selectedRecordForPrint.tanggalAlpaList.length > 0 && (
                    <p className="text-[11px] text-slate-600 pt-1">
                      Tanggal Alpa ({selectedRecordForPrint.jumlahAlpa}x):{' '}
                      <strong>{selectedRecordForPrint.tanggalAlpaList.join(', ')}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Tindakan Pembinaan */}
              <div className="text-xs space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  2. Bentuk Tindakan Pembinaan Guru PJOK:
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-800 leading-relaxed">
                    {selectedRecordForPrint.tindakanPenanganan}
                  </p>
                </div>
              </div>

              {/* Komitmen Murid */}
              <div className="text-xs space-y-1.5">
                <span className="font-extrabold text-slate-900 block">
                  3. Surat Pernyataan Komitmen Murid:
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 italic leading-relaxed text-slate-800">
                  &quot;{selectedRecordForPrint.komitmenMurid}&quot;
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <p className="text-slate-600">Murid yang Bersangkutan,</p>
                  <p className="font-extrabold text-slate-900 underline">
                    {selectedRecordForPrint.muridNama}
                  </p>
                </div>

                <div className="space-y-12">
                  <p className="text-slate-600">Orang Tua / Wali Murid,</p>
                  <p className="font-extrabold text-slate-900 underline">
                    ( ..................................... )
                  </p>
                </div>

                <div className="space-y-12">
                  <p className="text-slate-600">Guru Mata Pelajaran PJOK,</p>
                  <p className="font-extrabold text-slate-900 underline">
                    {selectedRecordForPrint.guruNama}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
