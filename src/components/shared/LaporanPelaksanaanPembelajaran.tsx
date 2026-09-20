import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  Calendar,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  Filter,
  School,
  Sparkles,
  Info,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { User, getTeacherAssignedClasses } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';

interface LaporanPelaksanaanPembelajaranProps {
  db: LMSDatabase;
  currentUser: User;
}

export const LaporanPelaksanaanPembelajaran: React.FC<LaporanPelaksanaanPembelajaranProps> = ({
  db,
  currentUser,
}) => {
  const availableClasses = useMemo(() => {
    if (currentUser.role === 'GURU') {
      const assigned = getTeacherAssignedClasses(currentUser, db.kelas);
      return assigned.length > 0 ? assigned : db.kelas || [];
    }
    return db.kelas || [];
  }, [currentUser, db.kelas]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>('ALL');
  const [selectedBulan, setSelectedBulan] = useState<string>('ALL');

  // Filter Data Kelas
  const targetKelasList = useMemo(() => {
    if (selectedKelasId === 'ALL') return availableClasses;
    return availableClasses.filter((k) => k.id === selectedKelasId);
  }, [availableClasses, selectedKelasId]);

  const selectedKelasName = useMemo(() => {
    if (selectedKelasId === 'ALL') return 'Semua Kelas PJOK';
    const found = availableClasses.find((k) => k.id === selectedKelasId);
    return found ? found.nama : 'Kelas PJOK';
  }, [availableClasses, selectedKelasId]);

  // 1. REKAPAN JURNAL MENGAJAR
  const filteredJurnal = useMemo(() => {
    let list = db.jurnal || [];
    if (selectedKelasId !== 'ALL') {
      list = list.filter((j) => j.kelasId === selectedKelasId);
    }
    if (selectedBulan !== 'ALL') {
      list = list.filter((j) => (j.tanggal || '').startsWith(selectedBulan));
    }
    return list.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [db.jurnal, selectedKelasId, selectedBulan]);

  // 2. REKAPAN PRESENSI MURID
  const filteredPresensiStats = useMemo(() => {
    const targetStudents = (db.users || []).filter((u) => {
      if (u.role !== 'MURID') return false;
      if (selectedKelasId === 'ALL') {
        return availableClasses.some((k) => k.id === u.kelasId);
      }
      return u.kelasId === selectedKelasId;
    }).sort((a, b) => {
      const kA = a.kelasId || '';
      const kB = b.kelasId || '';
      if (kA !== kB) return kA.localeCompare(kB);
      return a.name.localeCompare(b.name);
    });

    let rawPresensi = db.presensi || [];
    if (selectedBulan !== 'ALL') {
      rawPresensi = rawPresensi.filter((p) => (p.tanggal || '').startsWith(selectedBulan));
    }

    return targetStudents.map((student) => {
      const classObj = (db.kelas || []).find((k) => k.id === student.kelasId);
      const studentRecords = rawPresensi.filter((p) => p.muridId === student.id);
      const h = studentRecords.filter((p) => p.status === 'H').length;
      const s = studentRecords.filter((p) => p.status === 'S').length;
      const i = studentRecords.filter((p) => p.status === 'I').length;
      const a = studentRecords.filter((p) => p.status === 'A').length;
      const total = studentRecords.length;
      const persen = total > 0 ? Math.round((h / total) * 100) : 100;

      return {
        student,
        kelasNama: classObj?.nama || student.kelasId || '-',
        h,
        s,
        i,
        a,
        total,
        persen,
      };
    });
  }, [db.users, db.presensi, selectedKelasId, availableClasses, selectedBulan, db.kelas]);

  // Total Presensi Aggregates
  const totalHadirSemua = filteredPresensiStats.reduce((sum, s) => sum + s.h, 0);
  const totalAlpaSemua = filteredPresensiStats.reduce((sum, s) => sum + s.a, 0);
  const totalSakitSemua = filteredPresensiStats.reduce((sum, s) => sum + s.s, 0);
  const totalIzinSemua = filteredPresensiStats.reduce((sum, s) => sum + s.i, 0);

  // 3. REKAPAN FORM PENDAMPINGAN MURID
  const filteredPendampingan = useMemo(() => {
    let list = db.pendampinganMurid || [];
    if (selectedKelasId !== 'ALL') {
      list = list.filter((p) => p.kelasId === selectedKelasId);
    }
    if (selectedBulan !== 'ALL') {
      list = list.filter((p) => (p.tanggal || '').startsWith(selectedBulan));
    }
    return list.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [db.pendampinganMurid, selectedKelasId, selectedBulan]);

  // Pilihan Bulan yang terdeteksi
  const availableBulanOptions = useMemo(() => {
    const setBulan = new Set<string>();
    (db.jurnal || []).forEach((j) => {
      if (j.tanggal && j.tanggal.length >= 7) {
        setBulan.add(j.tanggal.slice(0, 7));
      }
    });
    (db.presensi || []).forEach((p) => {
      if (p.tanggal && p.tanggal.length >= 7) {
        setBulan.add(p.tanggal.slice(0, 7));
      }
    });
    return Array.from(setBulan).sort();
  }, [db.jurnal, db.presensi]);

  // Export to Word Document (.doc)
  const handleDownloadDoc = () => {
    const namaSekolah = db.settings?.namaSekolah || 'SMA NEGERI 1 TEJAKULA';
    const tahunAjaran = db.settings?.tahunPelajaran || '2026/2027';
    const kepalaSekolah = db.settings?.namaKepalaSekolah || 'Nyoman Sukrada, S.Pd., M.Pd.';
    const nipKepsek = db.settings?.nipKepalaSekolah || '19681231 199512 1 024';
    const guruNama = currentUser.name || 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.';
    const nipGuru = currentUser.nip || '19920815 202012 1 008';

    const jurnalRows = filteredJurnal
      .map(
        (j, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${j.tanggal}</td>
          <td class="text-center">${j.pertemuanKe || idx + 1}</td>
          <td>${j.kelasNama || '-'}</td>
          <td><strong>${j.materi || '-'}</strong></td>
          <td>${j.kegiatanPembelajaran || j.uraianKegiatan || '-'}</td>
          <td>${j.catatan || j.hambatan || '-'}</td>
        </tr>
      `
      )
      .join('');

    const presensiRows = filteredPresensiStats
      .map(
        (p, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${p.student.nis || '-'}</td>
          <td><strong>${p.student.name}</strong></td>
          <td class="text-center">${p.kelasNama}</td>
          <td class="text-center">${p.h}</td>
          <td class="text-center">${p.s}</td>
          <td class="text-center">${p.i}</td>
          <td class="text-center">${p.a}</td>
          <td class="text-center"><strong>${p.persen}%</strong></td>
          <td>${p.a >= 3 ? 'Kritis (Perlu Bimbingan)' : p.a > 0 ? 'Pernah Alpa' : 'Tertib'}</td>
        </tr>
      `
      )
      .join('');

    const pendampinganRows = filteredPendampingan
      .map(
        (rec, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${rec.tanggal}</td>
          <td><strong>${rec.muridNama}</strong><br><small>NIS: ${rec.nis || '-'}</small></td>
          <td class="text-center">${rec.kelasNama}</td>
          <td><strong>${rec.jenisMasalah}</strong><br><small>${rec.deskripsiMasalah || ''}</small>${
            rec.jumlahAlpa > 0 ? `<br><b>Alpa:</b> ${rec.jumlahAlpa}x (${rec.tanggalAlpaList?.join(', ') || ''})` : ''
          }</td>
          <td>${rec.tindakanPenanganan}</td>
          <td><em>"${rec.komitmenMurid}"</em></td>
          <td class="text-center"><strong>${rec.status}</strong></td>
        </tr>
      `
      )
      .join('');

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Laporan Pelaksanaan Pembelajaran PJOK</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; line-height: 1.4; margin: 2cm; }
          .kop-container { text-align: center; margin-bottom: 20px; }
          .kop-instansi { font-size: 11pt; text-transform: uppercase; font-weight: bold; margin: 0; }
          .kop-sekolah { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 2px 0; }
          .kop-alamat { font-size: 9.5pt; font-style: italic; margin: 0; }
          .kop-line { border-bottom: 3px double #000; margin-top: 8px; margin-bottom: 18px; }
          .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
          .doc-subtitle { text-align: center; font-size: 11pt; margin-bottom: 18px; }
          .section-title { font-size: 11.5pt; font-weight: bold; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt; }
          th, td { border: 1px solid #000; padding: 5px 7px; text-align: left; vertical-align: top; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .sign-table { width: 100%; border: none; margin-top: 40px; }
          .sign-table td { border: none; text-align: center; padding: 10px; width: 50%; }
        </style>
      </head>
      <body>
        <div class="kop-container">
          <p class="kop-instansi">PEMERINTAH PROVINSI BALI • DINAS PENDIDIKAN, KEPEMUDAAN DAN OLAHRAGA</p>
          <h1 class="kop-sekolah">${namaSekolah}</h1>
          <p class="kop-alamat">${db.settings?.alamatSekolah || 'Jl. Singaraja - Amlapura, Tejakula, Buleleng, Bali'} • Telp/Email: ${db.settings?.kontakSekolah || 'sman1tejakula@gmail.com'}</p>
          <div class="kop-line"></div>
        </div>

        <h2 class="doc-title">LAPORAN PELAKSANAAN PEMBELAJARAN</h2>
        <p class="doc-subtitle">Mata Pelajaran: <strong>PJOK</strong> • Rombel: <strong>${selectedKelasName}</strong> • Tahun Pelajaran: <strong>${tahunAjaran}</strong></p>

        <!-- BAGIAN 1: JURNAL -->
        <h3 class="section-title">I. REKAPITULASI JURNAL PELAKSANAAN PEMBELAJARAN</h3>
        <table>
          <thead>
            <tr>
              <th width="30">No</th>
              <th width="85">Tanggal</th>
              <th width="45">Ke</th>
              <th width="80">Kelas</th>
              <th width="150">Materi Pokok</th>
              <th>Kegiatan Pembelajaran & Model</th>
              <th width="130">Catatan / Evaluasi</th>
            </tr>
          </thead>
          <tbody>
            ${filteredJurnal.length > 0 ? jurnalRows : '<tr><td colspan="7" class="text-center">Tidak ada agenda jurnal yang tercatat.</td></tr>'}
          </tbody>
        </table>

        <!-- BAGIAN 2: PRESENSI -->
        <h3 class="section-title">II. REKAPITULASI PRESENSI & KEHADIRAN MURID</h3>
        <p style="font-size: 10pt; margin-bottom: 6px;">
          Ringkasan Kehadiran: Hadir: <b>${totalHadirSemua}</b> | Sakit: <b>${totalSakitSemua}</b> | Izin: <b>${totalIzinSemua}</b> | Alpa: <b>${totalAlpaSemua}</b>
        </p>
        <table>
          <thead>
            <tr>
              <th width="30">No</th>
              <th width="75">NIS</th>
              <th>Nama Murid</th>
              <th width="70">Kelas</th>
              <th width="40">H</th>
              <th width="40">S</th>
              <th width="40">I</th>
              <th width="40">A</th>
              <th width="50">% Hadir</th>
              <th width="110">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPresensiStats.length > 0 ? presensiRows : '<tr><td colspan="10" class="text-center">Tidak ada data presensi murid.</td></tr>'}
          </tbody>
        </table>

        <!-- BAGIAN 3: PENDAMPINGAN -->
        <h3 class="section-title">III. REKAPITULASI FORM PENDAMPINGAN & PEMBINAAN MURID</h3>
        <table>
          <thead>
            <tr>
              <th width="30">No</th>
              <th width="80">Tanggal</th>
              <th width="130">Nama Murid</th>
              <th width="65">Kelas</th>
              <th>Kasus / Rekap Alpa</th>
              <th>Bentuk Tindakan Guru PJOK</th>
              <th>Komitmen Murid</th>
              <th width="95">Status Akhir</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPendampingan.length > 0 ? pendampinganRows : '<tr><td colspan="8" class="text-center">Tidak ada data penanganan murid bermasalah tercatat.</td></tr>'}
          </tbody>
        </table>

        <!-- LEMBAR TANDA TANGAN RESMI -->
        <table class="sign-table">
          <tr>
            <td>
              Mengetahui,<br>
              Kepala Sekolah ${namaSekolah},<br><br><br><br><br>
              <strong><u>${kepalaSekolah}</u></strong><br>
              NIP. ${nipKepsek}
            </td>
            <td>
              Tejakula, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
              Guru Mata Pelajaran PJOK,<br><br><br><br><br>
              <strong><u>${guruNama}</u></strong><br>
              NIP. ${nipGuru}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanKelasName = selectedKelasName.replace(/\s+/g, '_');
    link.download = `Laporan_Pelaksanaan_Pembelajaran_PJOK_${cleanKelasName}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Menu Resmi: Laporan Pembelajaran
            </span>
            <span className="text-xs text-slate-300">
              Tahun Ajaran: <strong>{db.settings?.tahunPelajaran || '2026/2027'}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Laporan Pelaksanaan Pembelajaran PJOK
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Dokumen laporan resmi yang mengintegrasikan <strong>Rekapan Jurnal Mengajar</strong>,{' '}
            <strong>Rekapan Presensi Murid</strong>, dan{' '}
            <strong>Rekapan Form Pendampingan Murid</strong>. Dapat dicetak langsung atau
            diunduh dalam format <strong>PDF</strong> dan <strong>Microsoft Word (.doc)</strong>.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Jurnal Terlaksana</span>
              <span className="text-xl font-black text-white">{filteredJurnal.length} Agenda</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Total Murid Terdata</span>
              <span className="text-xl font-black text-emerald-300">{filteredPresensiStats.length} Murid</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Akumulasi Alpa</span>
              <span className="text-xl font-black text-rose-300">{totalAlpaSemua} Kali</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] text-slate-300 block">Kasus Didampingi</span>
              <span className="text-xl font-black text-amber-300">{filteredPendampingan.length} Kasus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Kelas, Bulan & Tombol Download */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Kelas */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 shrink-0">Pilih Kelas:</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">Semua Rombel Kelas</option>
              {availableClasses.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Bulan */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 shrink-0">Periode Bulan:</label>
            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">Seluruh Periode Semester</option>
              {availableBulanOptions.map((b) => (
                <option key={b} value={b}>
                  Bulan {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Download Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download Word (.doc) */}
          <button
            type="button"
            onClick={handleDownloadDoc}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Doc (.doc)</span>
          </button>

          {/* Download PDF / Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF / Cetak</span>
          </button>
        </div>
      </div>

      {/* ---------------- LIVE PREVIEW LAPORAN RESMI ---------------- */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs space-y-8 print:p-0 print:border-none print:shadow-none" id="laporan-cetak-area">
        {/* KOP SURAT */}
        <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
          {db.settings?.logoSekolah && (
            <img
              src={db.settings.logoSekolah}
              alt="Logo Sekolah"
              className="w-16 h-16 object-contain mx-auto mb-2"
            />
          )}
          <p className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">
            PEMERINTAH PROVINSI BALI • DINAS PENDIDIKAN, KEPEMUDAAN DAN OLAHRAGA
          </p>
          <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-wider">
            {db.settings?.namaSekolah || 'SMA NEGERI 1 TEJAKULA'}
          </h2>
          <p className="text-xs text-slate-600">
            {db.settings?.alamatSekolah || 'Jl. Singaraja - Amlapura, Tejakula, Buleleng, Bali'} • Email:{' '}
            {db.settings?.kontakSekolah || 'sman1tejakula@gmail.com'}
          </p>
        </div>

        {/* JUDUL LAPORAN */}
        <div className="text-center space-y-1">
          <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
            LAPORAN PELAKSANAAN PEMBELAJARAN PJOK
          </h2>
          <p className="text-xs text-slate-600">
            Kelas / Rombel: <strong className="text-slate-900">{selectedKelasName}</strong> • Tahun Pelajaran:{' '}
            <strong className="text-slate-900">{db.settings?.tahunPelajaran || '2026/2027'}</strong>
          </p>
        </div>

        {/* SEKSI 1: REKAPAN JURNAL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              I. Rekapan Jurnal Pelaksanaan Pembelajaran
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              Total {filteredJurnal.length} Pertemuan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10px] uppercase">
                  <th className="py-2.5 px-2 w-8 text-center border border-slate-200">No</th>
                  <th className="py-2.5 px-2 w-24 border border-slate-200">Tanggal</th>
                  <th className="py-2.5 px-1.5 w-12 text-center border border-slate-200">Ke</th>
                  <th className="py-2.5 px-2 w-20 border border-slate-200">Kelas</th>
                  <th className="py-2.5 px-3 min-w-[140px] border border-slate-200">Materi Pokok</th>
                  <th className="py-2.5 px-3 min-w-[200px] border border-slate-200">Kegiatan & Model</th>
                  <th className="py-2.5 px-3 min-w-[140px] border border-slate-200">Catatan & Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJurnal.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 border border-slate-200">
                      Tidak ada rekaman jurnal pembelajaran.
                    </td>
                  </tr>
                ) : (
                  filteredJurnal.map((j, idx) => (
                    <tr key={j.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center text-slate-400 font-bold border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-700 border border-slate-200">
                        {j.tanggal}
                      </td>
                      <td className="py-2 px-1.5 text-center font-bold text-slate-800 border border-slate-200">
                        {j.pertemuanKe || idx + 1}
                      </td>
                      <td className="py-2 px-2 font-semibold text-slate-700 border border-slate-200">
                        {j.kelasNama || '-'}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border border-slate-200">
                        {j.materi}
                      </td>
                      <td className="py-2 px-3 text-slate-700 text-[11px] border border-slate-200 leading-relaxed">
                        {j.kegiatanPembelajaran || j.uraianKegiatan || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] border border-slate-200 italic">
                        {j.catatan || j.hambatan || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEKSI 2: REKAPAN PRESENSI */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              II. Rekapan Presensi & Kehadiran Murid
            </h3>
            <span className="text-[11px] text-slate-600 font-semibold">
              Hadir: <strong>{totalHadirSemua}</strong> | Sakit: <strong>{totalSakitSemua}</strong> | Izin:{' '}
              <strong>{totalIzinSemua}</strong> | Alpa: <strong className="text-rose-600">{totalAlpaSemua}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10px] uppercase">
                  <th className="py-2.5 px-2 w-8 text-center border border-slate-200">No</th>
                  <th className="py-2.5 px-2 w-20 border border-slate-200">NIS</th>
                  <th className="py-2.5 px-3 min-w-[160px] border border-slate-200">Nama Murid</th>
                  <th className="py-2.5 px-2 text-center w-20 border border-slate-200">Kelas</th>
                  <th className="py-2.5 px-2 text-center w-12 border border-slate-200">H</th>
                  <th className="py-2.5 px-2 text-center w-12 border border-slate-200">S</th>
                  <th className="py-2.5 px-2 text-center w-12 border border-slate-200">I</th>
                  <th className="py-2.5 px-2 text-center w-12 border border-slate-200 text-rose-700 bg-rose-50/50">A</th>
                  <th className="py-2.5 px-2 text-center w-16 border border-slate-200">% Hadir</th>
                  <th className="py-2.5 px-3 min-w-[120px] border border-slate-200">Status Kedisiplinan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPresensiStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400 border border-slate-200">
                      Tidak ada data presensi murid ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredPresensiStats.map((p, idx) => (
                    <tr key={p.student.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center text-slate-400 font-bold border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 text-slate-500 font-medium border border-slate-200">
                        {p.student.nis || '-'}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border border-slate-200">
                        {p.student.name}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-700 border border-slate-200">
                        {p.kelasNama}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-700 border border-slate-200">
                        {p.h}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-blue-700 border border-slate-200">
                        {p.s}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-amber-700 border border-slate-200">
                        {p.i}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-rose-700 bg-rose-50/30 border border-slate-200">
                        {p.a}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-slate-900 border border-slate-200">
                        {p.persen}%
                      </td>
                      <td className="py-2 px-3 border border-slate-200">
                        {p.a >= 3 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                            Kritis (≥3 Alpa)
                          </span>
                        ) : p.a > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Perlu Perhatian
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            Sangat Tertib
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEKSI 3: REKAPAN FORM PENDAMPINGAN */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              III. Rekapan Form Pendampingan & Pembinaan Murid
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              Total {filteredPendampingan.length} Kasus Pembinaan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[10px] uppercase">
                  <th className="py-2.5 px-2 w-8 text-center border border-slate-200">No</th>
                  <th className="py-2.5 px-2 w-24 border border-slate-200">Tanggal</th>
                  <th className="py-2.5 px-3 min-w-[140px] border border-slate-200">Nama Murid & NIS</th>
                  <th className="py-2.5 px-2 text-center w-20 border border-slate-200">Kelas</th>
                  <th className="py-2.5 px-3 min-w-[140px] border border-slate-200">Masalah / Alpa</th>
                  <th className="py-2.5 px-3 min-w-[180px] border border-slate-200">Tindakan Pembinaan</th>
                  <th className="py-2.5 px-3 min-w-[180px] border border-slate-200">Komitmen Murid</th>
                  <th className="py-2.5 px-2 text-center w-24 border border-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPendampingan.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 border border-slate-200">
                      Tidak ada kasus pendampingan murid bermasalah tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredPendampingan.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 text-center text-slate-400 font-bold border border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 font-medium text-slate-700 border border-slate-200">
                        {rec.tanggal}
                      </td>
                      <td className="py-2 px-3 border border-slate-200">
                        <p className="font-bold text-slate-900">{rec.muridNama}</p>
                        <p className="text-[10px] text-slate-400">NIS: {rec.nis || '-'}</p>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-700 border border-slate-200">
                        {rec.kelasNama}
                      </td>
                      <td className="py-2 px-3 border border-slate-200">
                        <p className="font-bold text-rose-700">{rec.jenisMasalah}</p>
                        {rec.jumlahAlpa > 0 && (
                          <span className="text-[10px] font-bold text-rose-800 block">
                            {rec.jumlahAlpa}x Alpa
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-700 border border-slate-200 leading-relaxed">
                        {rec.tindakanPenanganan}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-emerald-950 italic border border-slate-200 leading-relaxed">
                        &quot;{rec.komitmenMurid}&quot;
                      </td>
                      <td className="py-2 px-2 text-center border border-slate-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.status === 'Selesai / Teratasi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'Perlu Pemantauan Khusus'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TANDA TANGAN RESMI */}
        <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-16">
            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-extrabold text-slate-900">
                Kepala {db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula'}
              </p>
            </div>
            <div>
              <p className="font-black text-slate-950 underline">
                {db.settings?.namaKepalaSekolah || 'Nyoman Sukrada, S.Pd., M.Pd.'}
              </p>
              <p className="text-[11px] text-slate-600">
                NIP. {db.settings?.nipKepalaSekolah || '19681231 199512 1 024'}
              </p>
            </div>
          </div>

          <div className="space-y-16">
            <div>
              <p className="text-slate-600">
                Tejakula,{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="font-extrabold text-slate-900">Guru Mata Pelajaran PJOK</p>
            </div>
            <div>
              <p className="font-black text-slate-950 underline">
                {currentUser.name || 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.'}
              </p>
              <p className="text-[11px] text-slate-600">
                NIP. {currentUser.nip || '19920815 202012 1 008'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
