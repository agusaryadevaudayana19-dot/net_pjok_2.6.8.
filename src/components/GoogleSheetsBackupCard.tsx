import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  Upload,
  LogOut,
  Link2,
  X,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { LMSDatabase, dataStorage } from '../services/dataStorage';
import {
  initGoogleAuth,
  signInWithGoogle,
  googleSignOut,
  getGoogleAccessToken,
  getCachedGoogleUser,
} from '../services/firebaseAuth';
import {
  createBackupSpreadsheet,
  syncDatabaseToSpreadsheet,
  restoreDatabaseFromSpreadsheet,
  getSpreadsheetMetadata,
  extractSpreadsheetId,
  BACKUP_TAB_NAMES,
} from '../services/googleSheetsBackup';

interface GoogleSheetsBackupCardProps {
  db: LMSDatabase;
}

export const GoogleSheetsBackupCard: React.FC<GoogleSheetsBackupCardProps> = ({ db }) => {
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getGoogleAccessToken());
  const [token, setToken] = useState<string | null>(() => getGoogleAccessToken());
  const [googleUser, setGoogleUser] = useState<{ email?: string; displayName?: string } | null>(() => {
    const cached = getCachedGoogleUser();
    return cached ? { email: cached.email, displayName: cached.name } : null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [spreadsheetInput, setSpreadsheetInput] = useState<string>(
    db.settings?.googleSpreadsheetId || db.settings?.googleSpreadsheetUrl || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Confirmation modal state for mutating operations (mandatory per workspace guidelines)
  const [confirmModal, setConfirmModal] = useState<{
    action: 'create_and_sync' | 'sync_existing' | 'restore_from_sheets';
    title: string;
    description: string;
    itemSummary: string[];
  } | null>(null);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user, accessToken) => {
        setToken(accessToken);
        setGoogleUser(user);
        setNeedsAuth(false);
      },
      () => {
        if (!getGoogleAccessToken()) {
          setNeedsAuth(true);
          setToken(null);
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (db.settings?.googleSpreadsheetId && !spreadsheetInput) {
      setSpreadsheetInput(db.settings.googleSpreadsheetId);
    }
  }, [db.settings?.googleSpreadsheetId]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result?.accessToken) {
        setToken(result.accessToken);
        setGoogleUser(result.user);
        setNeedsAuth(false);
        setStatusMessage({
          type: 'success',
          text: `Berhasil terhubung ke akun Google (${(result.user as any)?.email || 'Aktif'}). Siap mencadangkan data ke Google Sheets!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal masuk dengan akun Google.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setToken(null);
    setGoogleUser(null);
    setNeedsAuth(true);
    setStatusMessage({
      type: 'info',
      text: 'Sesi Google Sheets telah diputuskan.',
    });
  };

  const getCountsSummary = () => {
    const muridCount = (db.users || []).filter((u) => u.role === 'MURID').length;
    const guruCount = (db.users || []).filter((u) => u.role === 'GURU' || u.role === 'ADMIN').length;
    const kelasCount = (db.kelas || []).length;
    const presensiCount = (db.presensi || []).length;
    const materiCount = (db.materi || []).length;
    const tugasQuizCount = (db.tugas || []).length + (db.quiz || []).length;
    const nilaiCount =
      (db.jawabanQuiz || []).length +
      (db.pengumpulanTugas || []).length +
      (db.penilaianPraktik || []).length +
      (db.penilaianHarian || []).length;

    return [
      `${muridCount} Data Murid & ${guruCount} Akun Guru/Admin`,
      `${kelasCount} Rombongan Belajar (Kelas)`,
      `${presensiCount} Rekaman Presensi Kehadiran`,
      `${nilaiCount} Rekap Nilai (Kuis, Tugas, Praktik, Harian)`,
      `${materiCount} Materi & ${tugasQuizCount} Paket Tugas/Kuis`,
      `1 Tab Cadangan JSON Utuh (untuk pemulihan 1 klik)`,
    ];
  };

  const openConfirmCreateAndSync = () => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setConfirmModal({
      action: 'create_and_sync',
      title: 'Buat File Google Spreadsheet Baru & Cadangkan Data?',
      description:
        'Aplikasi akan membuat 1 file Google Spreadsheet baru di akun Google Anda dan mengisi 8 lembar kerja (Sheet) dengan data LMS PJOK saat ini.',
      itemSummary: getCountsSummary(),
    });
  };

  const openConfirmSyncExisting = () => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const cleanId = extractSpreadsheetId(spreadsheetInput || db.settings?.googleSpreadsheetId || '');
    if (!cleanId) {
      setStatusMessage({
        type: 'error',
        text: 'Masukkan Link / ID Google Spreadsheet terlebih dahulu, atau klik "Buat Spreadsheet Baru Otomatis".',
      });
      return;
    }
    setConfirmModal({
      action: 'sync_existing',
      title: 'Perbarui Data Cadangan di Google Spreadsheet?',
      description: `Aplikasi akan memperbarui isi lembar kerja pada Google Spreadsheet "${db.settings?.googleSpreadsheetTitle || cleanId}" dengan data terbaru dari aplikasi LMS PJOK.`,
      itemSummary: getCountsSummary(),
    });
  };

  const openConfirmRestore = () => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const cleanId = extractSpreadsheetId(spreadsheetInput || db.settings?.googleSpreadsheetId || '');
    if (!cleanId) {
      setStatusMessage({
        type: 'error',
        text: 'Masukkan Link / ID Google Spreadsheet yang memiliki data cadangan terlebih dahulu.',
      });
      return;
    }
    setConfirmModal({
      action: 'restore_from_sheets',
      title: 'Pulihkan (Restore) Data Aplikasi dari Google Spreadsheet?',
      description:
        'Data di dalam aplikasi LMS PJOK akan diperbarui menggunakan cadangan utuh yang tersimpan di tab "Cadangan_JSON_Utuh" pada Google Spreadsheet Anda.',
      itemSummary: [
        `Sumber Spreadsheet ID: ${cleanId}`,
        'Seluruh akun murid, kelas, materi, tugas, kuis, presensi, dan nilai akan dipulihkan ke aplikasi & Cloud Firestore.',
      ],
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmModal) return;
    const currentAction = confirmModal.action;
    setConfirmModal(null);
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const activeToken = getGoogleAccessToken() || token;
      if (!activeToken) {
        setNeedsAuth(true);
        throw new Error('Sesi akses Google telah berakhir. Silakan Sign in with Google kembali.');
      }

      if (currentAction === 'create_and_sync') {
        const created = await createBackupSpreadsheet(
          db.settings?.namaSekolah || 'SMA Negeri 1 Tejakula',
          activeToken
        );
        const syncRes = await syncDatabaseToSpreadsheet(created.spreadsheetId, db, activeToken);

        setSpreadsheetInput(created.spreadsheetId);
        dataStorage.updateDatabase((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            googleSpreadsheetId: created.spreadsheetId,
            googleSpreadsheetUrl: syncRes.spreadsheetUrl,
            googleSpreadsheetTitle: syncRes.title,
            googleSpreadsheetLastBackup: syncRes.timestamp,
          },
        }));

        setStatusMessage({
          type: 'success',
          text: `Berhasil membuat "${syncRes.title}" dan mencadangkan ${syncRes.updatedCells} sel data ke Google Sheets!`,
        });
      } else if (currentAction === 'sync_existing') {
        const cleanId = extractSpreadsheetId(
          spreadsheetInput || db.settings?.googleSpreadsheetId || ''
        );
        const syncRes = await syncDatabaseToSpreadsheet(cleanId, db, activeToken);

        setSpreadsheetInput(cleanId);
        dataStorage.updateDatabase((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            googleSpreadsheetId: cleanId,
            googleSpreadsheetUrl: syncRes.spreadsheetUrl,
            googleSpreadsheetTitle: syncRes.title,
            googleSpreadsheetLastBackup: syncRes.timestamp,
          },
        }));

        setStatusMessage({
          type: 'success',
          text: `Cadangan berhasil diperbarui ke "${syncRes.title}" (${syncRes.updatedCells} sel diperbarui).`,
        });
      } else if (currentAction === 'restore_from_sheets') {
        const cleanId = extractSpreadsheetId(
          spreadsheetInput || db.settings?.googleSpreadsheetId || ''
        );
        const restoredDb = await restoreDatabaseFromSpreadsheet(cleanId, activeToken);
        const meta = await getSpreadsheetMetadata(cleanId, activeToken);

        dataStorage.updateDatabase((prev) => ({
          ...restoredDb,
          settings: {
            ...(restoredDb.settings || prev.settings),
            googleSpreadsheetId: cleanId,
            googleSpreadsheetUrl: meta.spreadsheetUrl,
            googleSpreadsheetTitle: meta.title,
            googleSpreadsheetLastBackup: new Date().toISOString(),
          },
        }));

        setStatusMessage({
          type: 'success',
          text: `Berhasil memulihkan seluruh database LMS PJOK dari Google Spreadsheet "${meta.title}"!`,
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('401') || err?.message?.includes('UNAUTHENTICATED')) {
        setNeedsAuth(true);
      }
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan saat berkomunikasi dengan Google Sheets.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSheetUrl =
    db.settings?.googleSpreadsheetUrl ||
    (db.settings?.googleSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${db.settings.googleSpreadsheetId}/edit`
      : '');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-200/80 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">
                Sinkronisasi & Cadangan Google Spreadsheet
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Anti-Hilang 100%
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Simpan tabel rapi (Murid, Guru, Kelas, Absensi, Nilai) sekaligus cadangan penuh ke Google Sheets pribadi Anda
            </p>
          </div>
        </div>

        {!needsAuth && token && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{googleUser?.email || 'Google Terhubung'}</span>
            </span>
            <button
              type="button"
              onClick={handleGoogleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Putuskan akun Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Status Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-start gap-2.5 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Box tentang 8 Sheet yang dibuat otomatis */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
        <div className="flex items-center gap-2 font-extrabold text-slate-800">
          <Table className="w-4 h-4 text-emerald-600" />
          <span>8 Lembar Kerja (Tab Sheet) Otomatis di Google Spreadsheet Anda:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BACKUP_TAB_NAMES.map((tab) => (
            <span
              key={tab}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700"
            >
              {tab}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Anda dapat membuka, mencetak, atau mengunduh Excel langsung dari Google Spreadsheet kapan saja. Jika suatu saat data terhapus, Anda cukup klik <strong>Pulihkan dari Spreadsheet</strong> untuk mengembalikan seluruh data ke aplikasi.
        </p>
      </div>

      {/* Step 1: Google Sign-In Button if not authenticated */}
      {needsAuth || !token ? (
        <div className="p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
              Hubungkan Akun Google Anda untuk Mengaktifkan Cadangan Spreadsheet
            </h4>
            <p className="text-[11px] text-slate-600">
              Klik tombol resmi di samping untuk mengizinkan aplikasi menyimpan cadangan ke Google Sheets Anda.
            </p>
          </div>

          {/* Official "Sign in with Google" Material Button style per Workspace Skill */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-full border border-slate-300 shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <div className="w-4 h-4 shrink-0">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-full h-full block"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Spreadsheet Info if already linked */}
          {db.settings?.googleSpreadsheetId && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-extrabold text-xs text-emerald-950 truncate">
                    {db.settings.googleSpreadsheetTitle || 'Spreadsheet Cadangan Terhubung'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 truncate">
                  ID: <span className="font-mono">{db.settings.googleSpreadsheetId}</span>
                  {db.settings.googleSpreadsheetLastBackup && (
                    <>
                      {' '}• Cadangan Terakhir:{' '}
                      <strong>
                        {new Date(db.settings.googleSpreadsheetLastBackup).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </strong>
                    </>
                  )}
                </p>
              </div>

              {activeSheetUrl && (
                <a
                  href={activeSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Google Spreadsheet</span>
                </a>
              )}
            </div>
          )}

          {/* Input Existing Spreadsheet Link or ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Link atau ID Google Spreadsheet Tujuan (Opsional bila membuat baru):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={spreadsheetInput}
                  onChange={(e) => setSpreadsheetInput(e.target.value)}
                  placeholder="Tempel URL Google Spreadsheet atau ID di sini (atau klik Buat Baru di bawah)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={openConfirmCreateAndSync}
              disabled={isProcessing}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Buat Spreadsheet Baru & Cadangkan</span>
            </button>

            <button
              type="button"
              onClick={openConfirmSyncExisting}
              disabled={isProcessing}
              className="p-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Simpan / Update ke Spreadsheet</span>
            </button>

            <button
              type="button"
              onClick={openConfirmRestore}
              disabled={isProcessing}
              className="p-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-amber-700" />
              )}
              <span>Pulihkan dari Spreadsheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Dialog for Mutating Operations */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900">{confirmModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">{confirmModal.description}</p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="font-bold text-slate-800">Rincian Data yang Akan Diproses:</div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  {confirmModal.itemSummary.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedAction}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ya, Lanjutkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
