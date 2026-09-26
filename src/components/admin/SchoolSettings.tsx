import React, { useState, useRef } from 'react';
import {
  School,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Shield,
  Trash2,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  Camera,
  Zap,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { SettingsApp, User } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface SchoolSettingsProps {
  db: LMSDatabase;
  currentUser: User;
  onOpenSheets?: () => void;
}

export const SchoolSettings: React.FC<SchoolSettingsProps> = ({ db, currentUser }) => {
  const [isFirebaseActive, setIsFirebaseActive] = useState<boolean>(() => dataStorage.isFirebaseActive());
  const [settings, setSettings] = useState<SettingsApp>(() => {
    const raw = db?.settings || {};
    const base: SettingsApp = {
      namaSekolah: 'SMA Negeri 1 Tejakula (SMANSAKA)',
      tahunPelajaran: '2026/2027',
      semester: 'Ganjil',
      namaKepalaSekolah: 'Nyoman Sukrada, S.Pd., M.Pd.',
      nipKepalaSekolah: '19680105 199103 1 020',
      namaGuruPJOKUtama: 'I Ketut Agus Nova Anggarawan, S.Pd., Gr.',
      nipGuruPJOKUtama: '19881115 202221 1 012',
      mataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
      temaWarna: 'Biru & Hijau Sportif',
      terakhirSinkron: new Date().toISOString(),
    };

    const merged: SettingsApp = { ...base, ...raw };
    if (!merged.namaSekolah || merged.namaSekolah.includes('Kintamani')) {
      merged.namaSekolah = 'SMA Negeri 1 Tejakula (SMANSAKA)';
    }
    if (!merged.namaKepalaSekolah || merged.namaKepalaSekolah.includes('Sukadana')) {
      merged.namaKepalaSekolah = 'Nyoman Sukrada, S.Pd., M.Pd.';
    }
    if (!merged.nipKepalaSekolah || merged.nipKepalaSekolah.includes('19690815')) {
      merged.nipKepalaSekolah = '19680105 199103 1 020';
    }
    if (!merged.nipGuruPJOKUtama || merged.nipGuruPJOKUtama === '198811152022211013') {
      merged.nipGuruPJOKUtama = '19881115 202221 1 012';
    }
    return merged;
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanConfirmInput, setCleanConfirmInput] = useState('');
  const [isProcessingClean, setIsProcessingClean] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih berkas gambar yang valid (PNG, JPG, JPEG, WEBP, atau SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize image to max 400x400 to prevent large local storage usage
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.9);
          setSettings((prev) => ({ ...prev, logoSekolah: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      settings,
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleBackupData = () => {
    try {
      const currentDb = dataStorage.getDatabase();
      const dataStr = JSON.stringify(currentDb, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.download = `Backup_Database_LMS_PJOK_${dateStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      setTimeout(() => {
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
      }, 100);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Gagal backup database:', err);
      alert('Gagal mengunduh backup database: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.users && parsed.kelas) {
            dataStorage.updateDatabase(() => parsed);
            alert('Data LMS berhasil direstore secara lengkap!');
          } else {
            alert('Format file backup tidak valid.');
          }
        } catch (err) {
          alert('Gagal membaca file JSON backup.');
        }
      };
    }
  };

  const handleResetSampleData = () => {
    if (window.confirm('Reset database kembali ke konfigurasi awal sistem?')) {
      dataStorage.resetToDefault();
      alert('Data telah direset kembali ke konfigurasi awal.');
      window.location.reload();
    }
  };

  const handleExecuteCleanSlate = () => {
    setIsProcessingClean(true);
    try {
      dataStorage.resetToCleanSlate(true);
      setShowCleanModal(false);
      alert(
        'Berhasil!\n\nSeluruh data murid, materi, tugas, kuis, presensi, dan nilai telah dikosongkan (0).\n\nAkun login Admin & Guru serta pengaturan aplikasi tetap aman tersimpan.'
      );
      window.location.reload();
    } catch (e: any) {
      alert('Terjadi kesalahan saat mengosongkan data: ' + (e?.message || 'Unknown error'));
      setIsProcessingClean(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Pengaturan Sistem & Profil Sekolah
          </h2>
          <p className="text-xs text-slate-500">
            Konfigurasi identitas lembaga, tahun pelajaran, semester, sinkronisasi cloud, dan backup data
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleBackupData}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            title="Unduh salinan berkas database JSON ke perangkat lokal"
          >
            <Download className="w-4 h-4" />
            Backup Database
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Pengaturan sekolah berhasil disimpan dan diperbarui!
        </div>
      )}

      {/* Main Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <School className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Identitas Sekolah & Akademik
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Nama Sekolah</label>
            <input
              type="text"
              required
              value={settings.namaSekolah}
              onChange={(e) => setSettings({ ...settings, namaSekolah: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div className="sm:col-span-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
            <label className="block font-bold text-slate-800 uppercase text-xs mb-2">
              Icon & Logo Resmi Aplikasi LMS PJOK
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                {settings.logoSekolah ? (
                  <img
                    src={settings.logoSekolah}
                    alt="Preview Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white">
                    <Zap className="w-8 h-8 fill-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="input-logo-sekolah"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Pilih dari Galeri / Kamera</span>
                  </button>
                  {settings.logoSekolah && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logoSekolah: '' })}
                      className="px-3 py-2 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus / Gunakan Default</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Atau URL:</span>
                  <input
                    type="text"
                    value={settings.logoSekolah || ''}
                    onChange={(e) => setSettings({ ...settings, logoSekolah: e.target.value })}
                    placeholder="https://... (URL gambar luar)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Logo ini akan tampil di sudut kiri atas (Sidebar & Navbar), halaman login, dan KOP laporan cetak.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tahun Pelajaran
            </label>
            <input
              type="text"
              required
              value={settings.tahunPelajaran}
              onChange={(e) => setSettings({ ...settings, tahunPelajaran: e.target.value })}
              placeholder="2026/2027"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Semester Aktif</label>
            <select
              value={settings.semesterAktif}
              onChange={(e) => setSettings({ ...settings, semesterAktif: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="1 (Ganjil)">Semester 1 (Ganjil)</option>
              <option value="2 (Genap)">Semester 2 (Genap)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={settings.kepalaSekolahNama || ''}
              onChange={(e) => setSettings({ ...settings, kepalaSekolahNama: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              NIP Kepala Sekolah
            </label>
            <input
              type="text"
              value={settings.kepalaSekolahNip || ''}
              onChange={(e) => setSettings({ ...settings, kepalaSekolahNip: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Guru Pengampu PJOK
            </label>
            <input
              type="text"
              value={settings.guruPjokNama || ''}
              onChange={(e) => setSettings({ ...settings, guruPjokNama: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">NIP Guru PJOK</label>
            <input
              type="text"
              value={settings.guruPjokNip || ''}
              onChange={(e) => setSettings({ ...settings, guruPjokNip: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan Sekolah
          </button>
        </div>
      </form>

      {/* Backup & Restore Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="w-5 h-5 text-sky-600" />
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Manajemen Data & Cadangan (Backup / Restore)
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          Unduh salinan berkas data utuh (seluruh pengguna, rombel, materi, tugas, nilai, dan presensi)
          atau pulihkan dari berkas cadangan JSON sebelumnya.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleBackupData}
            className="p-3.5 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Unduh salinan berkas database JSON ke perangkat"
          >
            <Download className="w-4 h-4 text-sky-600" />
            Backup Database (.JSON)
          </button>

          <label className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Restore Database JSON
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreData}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              setCleanConfirmInput('');
              setShowCleanModal(true);
            }}
            className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Bersihkan data dummy/contoh (murid, materi, kuis, nilai) agar sistem bersih"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Hapus / Bersihkan Data Dummy
          </button>
        </div>
      </div>

      {/* Firebase Cloud Sync Control Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isFirebaseActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {isFirebaseActive ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                Status Integrasi Cloud Firebase
              </h3>
              <p className="text-[11px] text-slate-500">
                Penyimpanan cloud Firestore dan sinkronisasi real-time antar perangkat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isFirebaseActive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}>
              {isFirebaseActive ? '🟢 Aktif' : '⚪ Nonaktif (Mode Lokal)'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border text-xs leading-relaxed space-y-2 bg-slate-50 border-slate-200">
          {isFirebaseActive ? (
            <p className="text-slate-700">
              Firebase <strong>Aktif</strong>. Seluruh perubahan data murid, presensi, tugas, dan nilai otomatis tersinkronisasi ke Cloud Firestore dan dapat diakses dari beberapa perangkat secara bersamaan.
            </p>
          ) : (
            <p className="text-slate-700">
              Firebase <strong>Nonaktif</strong> sesuai permintaan. Aplikasi saat ini beroperasi penuh secara mandiri (offline-first). Seluruh data disimpan dan diproses secara aman pada memori internal peramban (LocalStorage) tanpa mengirim request jaringan ke Firebase.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          {isFirebaseActive ? (
            <button
              type="button"
              id="btn-settings-disable-firebase"
              onClick={() => {
                dataStorage.setFirebaseEnabled(false);
                setIsFirebaseActive(false);
              }}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <CloudOff className="w-4 h-4 text-rose-600" />
              Nonaktifkan Firebase
            </button>
          ) : (
            <button
              type="button"
              id="btn-settings-enable-firebase"
              onClick={() => {
                dataStorage.setFirebaseEnabled(true);
                setIsFirebaseActive(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              Aktifkan Firebase
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone: Mulai dari Nol (Kosongkan Data LMS) */}
      <div className="bg-linear-to-b from-rose-50/60 to-white rounded-3xl p-6 sm:p-8 border-2 border-rose-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-rose-900 uppercase tracking-wider">
                Mulai Mengisi dari Nol (Kosongkan Database LMS)
              </h3>
              <p className="text-[11px] text-rose-600/80 font-medium">
                Bersihkan seluruh murid & modul pembelajaran agar siap diisi dari awal secara bersih
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCleanConfirmInput('');
              setShowCleanModal(true);
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Kosongkan Data (Mulai dari Nol)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white/80 rounded-2xl border border-rose-100 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Data yang Akan Dikosongkan (0):</span>
            </div>
            <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
              <li>Seluruh data <strong>Murid & Kelas</strong> (dibersihkan total)</li>
              <li>Seluruh <strong>Materi Pembelajaran</strong> PJOK</li>
              <li>Seluruh <strong>Tugas & Pengumpulan Tugas</strong></li>
              <li>Seluruh <strong>Bank Kuis & Jawaban Ujian</strong></li>
              <li>Seluruh <strong>Riwayat Presensi, Jurnal & Nilai</strong></li>
            </ul>
          </div>

          <div className="p-3.5 bg-white/80 rounded-2xl border border-emerald-100 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Data yang Tetap AMAN & Tersimpan:</span>
            </div>
            <ul className="text-slate-600 text-[11px] space-y-1 list-disc list-inside">
              <li><strong>Cloud Firestore:</strong> Terkoneksi aman secara real-time dan terisolasi</li>
              <li><strong>Akun Admin & Guru:</strong> Tetap aktif untuk login (Anda tidak akan terkunci)</li>
              <li><strong>Profil & Identitas Sekolah:</strong> Nama sekolah & semester tetap utuh</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showCleanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Konfirmasi Kosongkan Data LMS
                  </h4>
                  <p className="text-xs text-rose-700 font-medium">
                    Tindakan ini akan mengosongkan seluruh konten & murid
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCleanModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  Penyimpanan Database LMS:
                </p>
                <p className="text-[11px] text-emerald-700">
                  Data yang dikosongkan akan langsung diterapkan pada database LMS sehingga sistem dalam kondisi bersih dan siap diisi dari awal.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 space-y-1">
                <p className="font-bold">Akun Login Pengelola Tetap Aman:</p>
                <p className="text-[11px] text-amber-700">
                  Akun login <strong>Admin</strong> dan <strong>Guru</strong> tetap dipertahankan dengan username & kata sandi yang sama.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-slate-700 font-bold">
                  Untuk konfirmasi, ketik kata <span className="text-rose-600 font-mono font-black">RESET</span> di bawah ini:
                </label>
                <input
                  type="text"
                  value={cleanConfirmInput}
                  onChange={(e) => setCleanConfirmInput(e.target.value)}
                  placeholder="Ketik RESET di sini"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold tracking-widest text-rose-700 focus:bg-white focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCleanModal(false)}
                  disabled={isProcessingClean}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCleanSlate}
                  disabled={cleanConfirmInput.trim().toUpperCase() !== 'RESET' || isProcessingClean}
                  className={`px-5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                    cleanConfirmInput.trim().toUpperCase() === 'RESET' && !isProcessingClean
                      ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isProcessingClean ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Membersihkan Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Ya, Kosongkan Data Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
