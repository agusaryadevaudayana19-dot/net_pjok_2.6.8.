import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  Camera,
  Save,
  Key,
  CheckCircle2,
  Mail,
  Phone,
  School,
  IdCard,
  Shield,
  Eye,
  EyeOff,
  UploadCloud,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';
import { processAvatarImageFile } from '../../utils/imageHelper';

interface ProfilMandiriProps {
  currentUser: User;
  db: LMSDatabase;
  onUpdateUser: (updatedUser: User) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const ProfilMandiri: React.FC<ProfilMandiriProps> = ({
  currentUser,
  db,
  onUpdateUser,
  onClose,
  isModal = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(currentUser.name || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState((currentUser as any).phone || (currentUser as any).telepon || '');
  
  // Murid specific
  const [nis, setNis] = useState(currentUser.nis || '');
  const [nisn, setNisn] = useState(currentUser.nisn || '');
  const [kelasId, setKelasId] = useState(currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || '');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>(currentUser.jenisKelamin || 'L');

  // Guru specific
  const [nip, setNip] = useState(currentUser.nip || '');
  const [mataPelajaran, setMataPelajaran] = useState(currentUser.mataPelajaran || 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator Sistem';
      case 'GURU':
        return 'Guru PJOK';
      case 'MURID':
        return 'Murid / Murid';
      default:
        return role;
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Directly trigger gallery or camera
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessingImage(true);
    setNotification(null);

    try {
      const dataUrl = await processAvatarImageFile(file);
      setAvatar(dataUrl);

      // Auto-update avatar in storage immediately so user doesn't lose it
      const updated: User = {
        ...currentUser,
        avatar: dataUrl,
      };
      dataStorage.updateDatabase((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === currentUser.id ? updated : u)),
      }));
      onUpdateUser(updated);

      setNotification({
        type: 'success',
        message: 'Foto profil berhasil diperbarui dari galeri/kamera!',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Gagal memproses file foto. Pastikan file berupa gambar.',
      });
    } finally {
      setIsProcessingImage(false);
      // Reset input value so same file can be re-selected if desired
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = () => {
    setAvatar('');
    const updated: User = {
      ...currentUser,
      avatar: '',
    };
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updated : u)),
    }));
    onUpdateUser(updated);
    setNotification({
      type: 'success',
      message: 'Foto profil dikembalikan ke inisial nama.',
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Nama lengkap tidak boleh kosong.' });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setNotification({ type: 'error', message: 'Password baru minimal 4 karakter.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setNotification({ type: 'error', message: 'Konfirmasi password baru tidak cocok!' });
        return;
      }
    }

    const updated: User = {
      ...currentUser,
      name: name.trim(),
      avatar,
      email: email.trim() || undefined,
      ...(phone ? { phone: phone.trim(), telepon: phone.trim() } : {}),
      password: newPassword ? newPassword : currentUser.password,
    };

    // Role specific fields
    if (currentUser.role === 'MURID') {
      updated.nis = nis.trim();
      updated.nisn = nisn.trim();
      updated.kelasId = kelasId;
      updated.jenisKelamin = jenisKelamin;
    } else if (currentUser.role === 'GURU') {
      updated.nip = nip.trim();
      updated.mataPelajaran = mataPelajaran.trim();
    } else if (currentUser.role === 'ADMIN') {
      updated.nip = nip.trim();
    }

    // Save to Database and Local Storage
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === currentUser.id ? updated : u)),
    }));

    onUpdateUser(updated);

    setNotification({
      type: 'success',
      message: 'Data profil berhasil disimpan secara mandiri!',
    });
    setTimeout(() => setNotification(null), 4000);

    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className={`w-full ${isModal ? '' : 'max-w-3xl mx-auto'} space-y-6`}>
      {/* Header section */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
              {getRoleLabel(currentUser.role)}
            </span>
            <span className="text-xs text-slate-500 font-medium">@{currentUser.username}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pengaturan Profil Mandiri
          </h2>
          <p className="text-xs text-slate-500">
            Perbarui foto profil langsung dari galeri atau kamera, identitas diri, dan kata sandi akun Anda.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              notification.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* AVATAR CLICK TO CAMERA/GALLERY CARD */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Hidden File Input for Gallery / Camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* Clickable Avatar with Camera Overlay */}
            <div className="flex flex-col items-center shrink-0">
              <div
                onClick={handleAvatarClick}
                className="relative group cursor-pointer"
                title="Klik untuk membuka Galeri atau Ambil Foto langsung"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/20 group-hover:ring-blue-400 overflow-hidden shadow-xl bg-slate-700 flex items-center justify-center transition-all transform group-hover:scale-105">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-blue-300">
                      {getInitials(name || currentUser.username)}
                    </span>
                  )}
                </div>

                {/* Camera Overlay */}
                <div className="absolute inset-0 rounded-full bg-black/40 group-hover:bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-7 h-7 mb-1 text-blue-300 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">
                    Ganti Foto
                  </span>
                </div>

                {/* Floating Camera Badge */}
                <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-slate-900 shadow-md group-hover:bg-blue-500 group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {isProcessingImage && (
                <span className="text-[11px] text-blue-300 font-medium mt-2 animate-pulse">
                  Memproses foto...
                </span>
              )}
            </div>

            {/* Avatar Actions & Instructions */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>Foto Profil Mandiri</span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    Galeri / Kamera
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  <strong>Klik langsung pada lingkaran gambar</strong> untuk mengambil foto baru melalui kamera perangkat Anda atau memilih dari galeri gambar.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Galeri / Foto Langsung</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                  >
                    Gunakan Inisial
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Format didukung: JPG, PNG, WebP. Otomatis dikompresi beresolusi tinggi dan tersimpan aman di server LMS.
              </p>
            </div>
          </div>
        </div>

        {/* IDENTITAS DIRI SECTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Informasi Identitas Diri
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Nama Lengkap */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Gede Hari Wijaya, S.Pd., Gr."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm"
              />
            </div>

            {/* Username (Readonly) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Username Akun
              </label>
              <input
                type="text"
                disabled
                value={currentUser.username}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Username digunakan saat masuk ke sistem
              </span>
            </div>

            {/* Role (Readonly) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Peran Pengguna
              </label>
              <input
                type="text"
                disabled
                value={getRoleLabel(currentUser.role)}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-blue-700 cursor-not-allowed"
              />
            </div>

            {/* MURID SPECIFIC FIELDS */}
            {currentUser.role === 'MURID' && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">NIS (Nomor Induk Murid)</label>
                  <input
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="Contoh: 202401"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">NISN</label>
                  <input
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Contoh: 0071234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Rombongan Belajar / Kelas</label>
                  <select
                    value={kelasId}
                    onChange={(e) => setKelasId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {db.kelas.map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama} ({k.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Jenis Kelamin</label>
                  <div className="flex gap-4 pt-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jenisKelamin"
                        value="L"
                        checked={jenisKelamin === 'L'}
                        onChange={() => setJenisKelamin('L')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-700">Laki-laki (L)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jenisKelamin"
                        value="P"
                        checked={jenisKelamin === 'P'}
                        onChange={() => setJenisKelamin('P')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-bold text-slate-700">Perempuan (P)</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* GURU SPECIFIC FIELDS */}
            {currentUser.role === 'GURU' && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">NIP / NUPTK</label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198507232010011012"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Mata Pelajaran Diampu</label>
                  <input
                    type="text"
                    value={mataPelajaran}
                    onChange={(e) => setMataPelajaran(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Classes assigned summary */}
                <div className="sm:col-span-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <span className="text-[11px] font-bold text-blue-900 block mb-1">
                    Kelas Binaan & Pengajaran:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(currentUser.kelasDiampu || ['XI 1', 'XI 2']).map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-800 shadow-2xs"
                      >
                        Kelas {c}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ADMIN SPECIFIC FIELDS */}
            {currentUser.role === 'ADMIN' && (
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">NIP / Identitas Pegawai</label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 198001012005011001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* KONTAK & KOMUNIKASI SECTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mail className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Kontak & Komunikasi
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Email Akun / Google Belajar.id
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: user@guru.sma.belajar.id"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Nomor WhatsApp / HP Aktif
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* GANTI KATA SANDI (MANDIRI) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Keamanan & Ganti Password Mandiri
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi masuk saat ini.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Kata Sandi Baru</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Konfirmasi Kata Sandi Baru</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl text-xs font-bold transition-colors"
            >
              Batal / Tutup
            </button>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-7 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Profil</span>
          </button>
        </div>
      </form>
    </div>
  );
};
