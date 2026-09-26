import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Users2,
  Sparkles,
  Edit2,
  Trash2,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Edit3,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  TugasPenilaianAntarTeman,
  User,
  StatusTugasPenilaian,
  PenilaianTemanSejawat,
} from '../../types';
import { dataStorage, LMSDatabase } from '../../services/dataStorage';

interface TugasPenilaianAntarTemanViewProps {
  db: LMSDatabase;
  currentUser: User;
  onOpenCreateTask: () => void;
  onOpenEditTask: (task: TugasPenilaianAntarTeman) => void;
  onEvaluatePeer: (task: TugasPenilaianAntarTeman) => void;
  onViewRekapTask?: (task: TugasPenilaianAntarTeman) => void;
}

export const TugasPenilaianAntarTemanView: React.FC<TugasPenilaianAntarTemanViewProps> = ({
  db,
  currentUser,
  onOpenCreateTask,
  onOpenEditTask,
  onEvaluatePeer,
  onViewRekapTask,
}) => {
  const isMurid = currentUser.role === 'MURID';
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterKelasId, setFilterKelasId] = useState<string>('ALL');

  const allTasks: TugasPenilaianAntarTeman[] = db.tugasPenilaianAntarTeman || [];
  const peerRecords: PenilaianTemanSejawat[] = db.penilaianTemanSejawat || [];

  // Filter tasks based on role
  const filteredTasks = allTasks.filter((task) => {
    if (isMurid) {
      // Murid only sees tasks assigned to their class, and only AKTIF or SELESAI
      if (currentUser.kelasId && !task.kelasIds.includes(currentUser.kelasId)) {
        return false;
      }
      if (task.status === 'DRAF') return false;
    } else {
      if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;
      if (filterKelasId !== 'ALL' && !task.kelasIds.includes(filterKelasId)) return false;
    }
    return true;
  });

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    if (!window.confirm(`Hapus tugas penilaian "${taskTitle}"?`)) return;
    dataStorage.updateDatabase((prev) => ({
      ...prev,
      tugasPenilaianAntarTeman: (prev.tugasPenilaianAntarTeman || []).filter((t) => t.id !== taskId),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar for Guru */}
      {!isMurid && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">🟢 Aktif</option>
              <option value="DRAF">🟡 Draf</option>
              <option value="SELESAI">🔵 Selesai</option>
            </select>

            <select
              value={filterKelasId}
              onChange={(e) => setFilterKelasId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">Semua Kelas</option>
              {(db.kelas || []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenCreateTask}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Tugas Penilaian Antar Teman</span>
          </button>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="font-bold text-sm text-slate-600">
            {isMurid
              ? 'Belum ada tugas penilaian antar teman yang aktif untuk kelasmu saat ini.'
              : 'Belum ada tugas penilaian antar teman yang dibuat.'}
          </p>
          {!isMurid && (
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Tugas Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map((task) => {
            // Calculate submissions for this task
            const taskReviews = peerRecords.filter((r) => r.tugasId === task.id);
            const myReviews = isMurid
              ? taskReviews.filter((r) => r.penilaiId === currentUser.id)
              : [];
            const isCompletedByMe = isMurid && myReviews.length >= task.jumlahWajibDinilai;

            // Target Class Names
            const targetClasses = (db.kelas || [])
              .filter((k) => task.kelasIds.includes(k.id))
              .map((k) => k.nama);

            // Deadline check
            const isExpired =
              task.batasWaktu &&
              new Date(task.batasWaktu).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                key={task.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-indigo-300 transition-all shadow-xs space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          task.status === 'AKTIF'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'DRAF'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {task.status}
                      </span>

                      {/* Class Badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {targetClasses.map((nama) => (
                          <span
                            key={nama}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
                          >
                            {nama}
                          </span>
                        ))}
                      </div>

                      {isExpired && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                          Batas Waktu Berakhir
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {task.namaTugas}
                    </h3>
                    <p className="text-xs text-indigo-900 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Materi: {task.materi}
                    </p>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isMurid ? (
                      <button
                        type="button"
                        onClick={() => onEvaluatePeer(task)}
                        disabled={isExpired}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                          isCompletedByMe
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : isExpired
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isCompletedByMe ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tambah Penilaian Lagi</span>
                          </>
                        ) : (
                          <>
                            <Users2 className="w-4 h-4" />
                            <span>Mulai Nilai Teman</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEvaluatePeer(task)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Input Penilaian Langsung"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Input Penilaian</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditTask(task)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                          title="Edit Tugas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id, task.namaTugas)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                {task.instruksi && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                    {task.instruksi}
                  </p>
                )}

                {/* Murid Progress Bar */}
                {isMurid && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Progres Menilai Rekan:
                      </span>
                      <span className="font-black text-indigo-700">
                        {myReviews.length} dari {task.jumlahWajibDinilai} Teman Wajib Dinilai
                        {myReviews.length >= task.jumlahWajibDinilai && ' (Lengkap! 🎉)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          myReviews.length >= task.jumlahWajibDinilai
                            ? 'bg-emerald-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (myReviews.length / (task.jumlahWajibDinilai || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta details footer */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {task.tanggalMulai} s.d {task.batasWaktu}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users2 className="w-3.5 h-3.5 text-slate-400" />
                      Wajib Dinilai: <strong>{task.jumlahWajibDinilai} Teman</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                      {task.indikatorIds.length} Indikator Rubrik
                    </span>
                  </div>

                  {/* Features enabled badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.allowVideoUpload && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                        <Video className="w-3 h-3" /> Video
                      </span>
                    )}
                    {task.allowPhotoUpload && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700">
                        <ImageIcon className="w-3 h-3" /> Foto
                      </span>
                    )}
                    {task.requireProofUpload && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700">
                        <ShieldCheck className="w-3 h-3" /> Wajib Bukti
                      </span>
                    )}
                    {task.allowEditBeforeDeadline && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <Edit3 className="w-3 h-3" /> Boleh Edit
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
