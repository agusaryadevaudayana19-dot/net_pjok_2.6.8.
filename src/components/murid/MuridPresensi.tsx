import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  PlusCircle,
  FileText,
  Camera,
  Eye,
  HeartPulse,
  Award,
  Phone,
  User as UserIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { User, PresensiRecord, PengajuanIzin } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { markSidebarMenuAsReadForUser } from '../../utils/studentNotificationHelper';
import { ModalAjukanIzin } from './ModalAjukanIzin';
import { RekapPresensiTable } from '../shared/RekapPresensiTable';

interface MuridPresensiProps {
  db: LMSDatabase;
  currentUser: User;
}

export const MuridPresensi: React.FC<MuridPresensiProps> = ({ db, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'presensi' | 'surat' | 'rekap-kelas'>('presensi');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [resubmitItem, setResubmitItem] = useState<PengajuanIzin | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const myPresensiList = (db.presensi || []).filter((p) => p.muridId === currentUser.id);
  const myIzinList = (db.pengajuanIzin || []).filter((p) => p.muridId === currentUser.id);

  const total = myPresensiList.length || 1;
  const countH = myPresensiList.filter((p) => p.status === 'H').length;
  const countS = myPresensiList.filter((p) => p.status === 'S').length;
  const countI = myPresensiList.filter((p) => p.status === 'I').length;
  const countA = myPresensiList.filter((p) => p.status === 'A').length;
  const countT = myPresensiList.filter((p) => p.status === 'T').length;
  const percentage = Math.round(((countH + countT) / total) * 100);

  const pendingIzinCount = myIzinList.filter((i) => i.status === 'Menunggu').length;
  const rejectedIzinList = myIzinList.filter((i) => i.status === 'Ditolak');

  // Tandai menu presensi-saya di sidebar sudah dibaca saat murid membuka halaman ini
  // "TAPI PADA SIDEBAR SETELAH DI BACA HILANGKAN ANGKA ATAU TANDA MERAH ITU"
  useEffect(() => {
    if (currentUser?.id) {
      markSidebarMenuAsReadForUser(currentUser.id, 'presensi-saya');
    }
  }, [currentUser?.id, countA]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'H':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">
            Hadir (H)
          </span>
        );
      case 'S':
        return (
          <span className="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-black">
            Sakit (S)
          </span>
        );
      case 'I':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black">
            Izin (I)
          </span>
        );
      case 'A':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-black">
            Alpa (A)
          </span>
        );
      case 'T':
        return (
          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-black">
            Terlambat (T)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-emerald-200/60">
            Presensi & Ketidakhadiran Murid
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1">
            Presensi & Kehadiran Saya
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Riwayat kehadiran belajar PJOK serta pengiriman surat izin/sakit bertandatangan orang tua
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResubmitItem(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajukan Izin / Sakit / Dispensasi</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/50">
        <button
          type="button"
          onClick={() => setActiveTab('presensi')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'presensi'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-300 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-emerald-600" />
          <span>Riwayat Presensi Pertemuan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('surat')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'surat'
              ? 'bg-white text-emerald-950 shadow-xs ring-2 ring-emerald-500 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>Surat & Permohonan Izin Saya</span>
          {pendingIzinCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
              {pendingIzinCount} Menunggu
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap-kelas')}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'rekap-kelas'
              ? 'bg-white text-indigo-950 shadow-xs ring-2 ring-indigo-500 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <CalendarCheck className="w-4 h-4 text-indigo-600" />
          <span>Rekapan Absensi Kelas</span>
        </button>
      </div>

      {activeTab === 'rekap-kelas' ? (
        <RekapPresensiTable
          db={db}
          selectedKelasId={currentUser.kelasId || (db.kelas && db.kelas[0]?.id) || ''}
          onSelectKelasId={() => {}}
          currentUser={currentUser}
        />
      ) : activeTab === 'presensi' ? (
        <>
          {/* Banner jika ada pengajuan surat izin yang ditolak oleh guru */}
          {rejectedIzinList.length > 0 && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-rose-950">
                    Pengajuan Surat Ditolak • Status Presensi Tetap Alpa (A)
                  </h4>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    Pengajuan surat Anda ditolak oleh guru sehingga status absensi tidak berubah menjadi Sakit/Izin, melainkan <strong>tetap Alpa (A)</strong>. Silakan periksa catatan guru dan lakukan pengajuan ulang.
                  </p>
                  {rejectedIzinList[0].catatanGuru && (
                    <div className="text-[11px] text-rose-950 font-semibold italic bg-white/90 p-2 rounded-lg border border-rose-200">
                      Catatan Guru: "{rejectedIzinList[0].catatanGuru}"
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResubmitItem(rejectedIzinList[0]);
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Ajukan Ulang Surat</span>
              </button>
            </div>
          )}

          {/* Banner Pemantauan Alpa 1x, 2x, 3x (Tetap dipantau agar murid selalu ingat) */}
          {countA > 0 && (
            <div
              className={`p-4 rounded-2xl border-2 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-3 transition-all ${
                countA >= 3
                  ? 'bg-rose-50 border-rose-300'
                  : countA === 2
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                    countA >= 3 ? 'bg-rose-600 animate-pulse' : countA === 2 ? 'bg-orange-600' : 'bg-amber-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`text-xs font-black ${
                        countA >= 3 ? 'text-rose-950' : countA === 2 ? 'text-orange-950' : 'text-amber-950'
                      }`}
                    >
                      Peringatan Catatan Ketidakhadiran ({countA}x Alpa) • Terus Dipantau
                    </h4>
                    <span
                      className={`px-2 py-0.5 text-white text-[9px] font-black rounded-full uppercase tracking-wider ${
                        countA >= 3 ? 'bg-rose-600' : countA === 2 ? 'bg-orange-600' : 'bg-amber-600'
                      }`}
                    >
                      {countA >= 3 ? 'Peringatan 3 (Kritis)' : countA === 2 ? 'Peringatan 2 (Serius)' : 'Peringatan 1'}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      countA >= 3 ? 'text-rose-900' : countA === 2 ? 'text-orange-900' : 'text-amber-900'
                    }`}
                  >
                    {countA >= 3
                      ? 'Anda tercatat telah 3 kali atau lebih tidak hadir tanpa keterangan (Alpa). Sesuai ketentuan, Anda wajib berkonsultasi dengan Guru PJOK dan mengisi Formulir Pendampingan Murid untuk komitmen perbaikan kehadiran.'
                      : countA === 2
                      ? 'Anda tercatat 2 kali tidak hadir tanpa keterangan (Alpa). Mohon tingkatkan disiplin kehadiran atau segera ajukan surat izin/sakit bertandatangan orang tua agar tidak mencapai batas kritis.'
                      : 'Anda memiliki 1 kali catatan Alpa. Jika Anda sebelumnya berhalangan karena sakit atau izin penting, segera serahkan atau unggah surat izin untuk diverifikasi oleh Guru PJOK.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-center sm:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Persentase Kehadiran
              </span>
              <span className="text-3xl font-black text-emerald-600 mt-1 block">{percentage}%</span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {countH + countT} dari {total} Pertemuan
              </span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="text-2xl font-black text-emerald-800 block">{countH}</span>
              <span className="text-[11px] font-bold text-emerald-900 mt-1 block">Hadir</span>
            </div>

            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-center">
              <span className="text-2xl font-black text-sky-800 block">{countS}</span>
              <span className="text-[11px] font-bold text-sky-900 mt-1 block">Sakit</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <span className="text-2xl font-black text-amber-800 block">{countI}</span>
              <span className="text-[11px] font-bold text-amber-900 mt-1 block">Izin</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-center">
              <span className="text-2xl font-black text-rose-800 block">{countA}</span>
              <span className="text-[11px] font-bold text-rose-900 mt-1 block">Alpa</span>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Riwayat Pertemuan Pembelajaran PJOK
              </h3>
              <span className="text-[11px] text-slate-400">{myPresensiList.length} catatan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Keterangan Pembelajaran</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {myPresensiList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada catatan presensi untuk akun Anda.
                      </td>
                    </tr>
                  ) : (
                    myPresensiList.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {new Date(rec.tanggal).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{rec.keterangan || 'Praktik PJOK'}</td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(rec.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Tab 2: Surat & Permohonan Izin Saya */
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <span className="font-extrabold block">Ketentuan Pengajuan Izin / Sakit / Dispensasi:</span>
              <p className="text-emerald-800 leading-relaxed">
                Setiap permohonan wajib menyertakan <strong>foto surat bertandatangan basah orang tua/wali</strong> dan <strong>foto bersama orang tua sambil memegang surat</strong>. Guru PJOK akan memeriksa keabsahan berkas sebelum menyetujui kehadiran Anda.
              </p>
            </div>
          </div>

          {myIzinList.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
              <div className="w-14 h-14 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Belum Ada Pengajuan Surat</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Jika Anda berhalangan hadir karena sakit, keperluan keluarga, atau dispensasi kegiatan, silakan klik tombol di bawah untuk membuat surat.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResubmitItem(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                Buat Pengajuan Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myIzinList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.kategori === 'Sakit'
                            ? 'bg-sky-100 text-sky-700'
                            : item.kategori === 'Izin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.kategori === 'Sakit' ? (
                          <HeartPulse className="w-5 h-5" />
                        ) : item.kategori === 'Izin' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Award className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            Surat {item.kategori}
                          </span>
                          <span className="text-xs text-slate-400">
                            • Diajukan {new Date(item.tanggalPengajuan).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 block">
                          Tanggal Izin:{' '}
                          {item.tanggal === item.tanggalSelesai || !item.tanggalSelesai
                            ? new Date(item.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : `${new Date(item.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                              })} s/d ${new Date(item.tanggalSelesai).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}`}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          item.status === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : item.status === 'Ditolak'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        }`}
                      >
                        {item.status === 'Disetujui' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {item.status === 'Ditolak' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                        {item.status === 'Menunggu' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                        {item.status === 'Menunggu' ? 'Menunggu Verifikasi Guru' : item.status}
                      </span>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Orang Tua / Wali
                      </span>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        {item.namaOrangTua}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.noHpOrangTua}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Alasan
                      </span>
                      <p className="text-xs text-slate-800 italic leading-relaxed whitespace-pre-wrap">
                        "{item.alasan}"
                      </p>
                    </div>
                  </div>

                  {/* Evidence Thumbnails */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.suratUrl}
                          alt="Surat Izin"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block">
                            Surat Bertandatangan
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {item.namaSurat || 'Surat_Izin.jpg'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: item.suratUrl, title: `Surat Izin ${item.kategori}` })}
                        className="p-1.5 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </button>
                    </div>

                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.fotoBersamaOrangTuaUrl}
                          alt="Foto Bersama Ortu"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block">
                            Foto Bersama Orang Tua
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {item.namaFotoBersama || 'Foto_Bersama_Ortu.jpg'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: item.fotoBersamaOrangTuaUrl, title: 'Foto Bersama Orang Tua & Surat' })}
                        className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat
                      </button>
                    </div>
                  </div>

                  {/* Status Ditolak & Aksi Ajukan Ulang */}
                  {item.status === 'Ditolak' && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-950 font-black text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Permohonan Ditolak • Status Kehadiran Tetap Alpa (A)</span>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed">
                        Sesuai ketentuan absensi, permohonan surat izin yang ditolak tidak mengubah status menjadi Sakit/Izin. Presensi Anda <strong>tetap tercatat Alpa (A)</strong>. Silakan periksa catatan guru di bawah dan ajukan ulang dengan berkas yang benar.
                      </p>
                      {item.catatanGuru && (
                        <div className="p-3 bg-white/95 border border-rose-200 rounded-xl space-y-0.5">
                          <span className="font-black uppercase text-[10px] tracking-wider text-rose-700 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Catatan Guru / Arahan Perbaikan:
                          </span>
                          <p className="text-xs font-semibold text-slate-800 italic mt-0.5">
                            "{item.catatanGuru}"
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setResubmitItem(item);
                          setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Ajukan Ulang Berdasarkan Catatan Guru</span>
                      </button>
                    </div>
                  )}

                  {/* Feedback or Approval note jika bukan ditolak */}
                  {item.status !== 'Ditolak' && item.catatanGuru && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-0.5">
                      <span className="font-extrabold uppercase text-[10px] tracking-wider block text-emerald-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Catatan dari Guru:
                      </span>
                      <p className="font-medium">{item.catatanGuru}</p>
                    </div>
                  )}

                  {item.diverifikasiOleh && (
                    <div className="text-[11px] text-emerald-700 flex items-center justify-between pt-1">
                      <span>
                        Diverifikasi oleh: <strong>{item.diverifikasiOleh}</strong>
                      </span>
                      {item.tanggalVerifikasi && (
                        <span>{new Date(item.tanggalVerifikasi).toLocaleString('id-ID')}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Ajukan Izin */}
      <ModalAjukanIzin
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setResubmitItem(null);
        }}
        currentUser={currentUser}
        db={db}
        initialData={resubmitItem}
        onSuccess={() => {
          setResubmitItem(null);
          setActiveTab('surat');
        }}
      />

      {/* Modal Zoom Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden p-3 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800 text-white">
              <span className="text-xs font-extrabold">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewImage.url}
                alt="Zoom Preview"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

