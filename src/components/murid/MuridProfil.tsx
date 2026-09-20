import React from 'react';
import {
  AlertTriangle,
  Clock,
  UserCheck,
  ChevronRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  FileText,
  HeartHandshake,
} from 'lucide-react';
import { User as UserType } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { ProfilMandiri } from '../shared/ProfilMandiri';
import { getStudentPendampinganStatus } from '../../utils/studentNotificationHelper';

interface MuridProfilProps {
  db: LMSDatabase;
  currentUser: UserType;
  onUpdateUser: (user: UserType) => void;
  onNavigate?: (menuId: string, param?: string) => void;
}

export const MuridProfil: React.FC<MuridProfilProps> = ({
  db,
  currentUser,
  onUpdateUser,
  onNavigate,
}) => {
  const pendampingan = getStudentPendampinganStatus(db, currentUser);
  const latest = pendampingan.latestRecord;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* PENGINGAT OTOMATIS: STATUS PENDAMPINGAN MASIH DALAM PROSES / BUTUH TINDAK LANJUT */}
      {pendampingan.hasActive && pendampingan.needsFollowUp && (
        <div className="bg-gradient-to-br from-amber-50 via-rose-50/50 to-orange-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm animate-pulse shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-amber-950">
                    Pengingat Status Pendampingan Murid
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                    {pendampingan.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Profil Anda memiliki catatan pendampingan yang masih dalam proses atau membutuhkan tindak lanjut oleh Guru PJOK.
                </p>
              </div>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('pendampingan-murid-saya')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <UserCheck className="w-4 h-4" />
                <span>Buka Form Pendampingan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Rincian Status Pendampingan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* Box 1: Detail Masalah / Alpa */}
            <div className="bg-white/90 rounded-2xl p-4 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  Identifikasi Permasalahan
                </span>
                {latest?.tanggal && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Dicatat: {latest.tanggal}
                  </span>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                {latest ? (
                  <>
                    <p className="font-bold text-slate-900">
                      Jenis: <span className="text-amber-900">{latest.jenisMasalah}</span>
                    </p>
                    <p className="text-slate-600 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60">
                      "{latest.deskripsiMasalah || 'Sedang dalam pengamatan kedisiplinan dan keaktifan pembelajaran PJOK.'}"
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-rose-900">
                      Catatan Ketidakhadiran (Alpa): {pendampingan.alpaCount} Pertemuan
                    </p>
                    <p className="text-slate-600 leading-relaxed bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                      Terdeteksi alpa pada tanggal: {pendampingan.alpaDates.join(', ')}. Silakan sampaikan klarifikasi izin/kendala Anda.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Box 2: Tindak Lanjut & Solusi Pembinaan Guru */}
            <div className="bg-white/90 rounded-2xl p-4 border border-amber-200/80 space-y-2">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                Tindak Lanjut & Arahan Guru PJOK
              </span>

              <div className="space-y-1.5 pt-1">
                {latest?.tindakanPenanganan ? (
                  <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80 text-emerald-950">
                    <p className="font-black text-[11px] text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Solusi Pembinaan:
                    </p>
                    <p className="mt-1 leading-relaxed">{latest.tindakanPenanganan}</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-500">
                    <p className="italic">
                      Guru PJOK sedang mempersiapkan tindak lanjut pembinaan. Pastikan Anda berkoordinasi langsung dengan guru pengampu.
                    </p>
                  </div>
                )}

                {latest?.catatanGuru && (
                  <p className="text-[11px] text-slate-700 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                    <strong className="text-amber-950">Catatan Guru:</strong> "{latest.catatanGuru}"
                  </p>
                )}

                {latest?.komitmenMurid && (
                  <p className="text-[11px] text-sky-800 bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                    <strong className="text-sky-950">Komitmen Anda:</strong> "{latest.komitmenMurid}"
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Status akan otomatis diperbarui menjadi <strong>"Selesai / Teratasi"</strong> setelah bimbingan tuntas dilakukan bersama guru.
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('presensi-saya')}
                className="font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                Cek Riwayat Presensi →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Profil Mandiri Form */}
      <ProfilMandiri
        currentUser={currentUser}
        db={db}
        onUpdateUser={onUpdateUser}
        isModal={false}
      />
    </div>
  );
};

