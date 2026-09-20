import { dataStorage } from '../services/dataStorage';
import { TrashUserItem } from '../types';

export interface TrashCleanupResult {
  purgedCount: number;
  remainingCount: number;
  purgedItems: TrashUserItem[];
  timestamp: string;
}

/**
 * Membersihkan data sampah (soft-deleted items) di Firestore & LocalStorage
 * yang umurnya sudah melebihi batas hari yang ditentukan (default 30 hari).
 * Menjaga ukuran dokumen Firestore dan performa sinkronisasi database tetap optimal.
 */
export async function cleanupExpiredTrash(maxAgeDays: number = 30): Promise<TrashCleanupResult> {
  try {
    const currentDb = dataStorage.getDatabase();
    const trashList = currentDb.trashUsers || [];

    if (!trashList || trashList.length === 0) {
      return {
        purgedCount: 0,
        remainingCount: 0,
        purgedItems: [],
        timestamp: new Date().toISOString(),
      };
    }

    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = now - maxAgeMs;

    const expiredItems: TrashUserItem[] = [];
    const validItems: TrashUserItem[] = [];

    for (const item of trashList) {
      const deletedTime = item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
      // Jika deletedAt tidak valid atau sudah lebih dari 30 hari yang lalu
      if (!deletedTime || isNaN(deletedTime) || deletedTime < cutoffTime) {
        expiredItems.push(item);
      } else {
        validItems.push(item);
      }
    }

    if (expiredItems.length > 0) {
      console.info(
        `[AutoCleanup] Menghapus ${expiredItems.length} item di bak sampah yang berumur lebih dari ${maxAgeDays} hari.`
      );

      dataStorage.updateDatabase((prev) => ({
        ...prev,
        trashUsers: validItems,
        activityLogs: [
          {
            id: `log-cleanup-${Date.now()}`,
            timestamp: new Date().toISOString(),
            category: 'TRASH_PERMANENT_DELETE',
            actorName: 'Sistem Pembersihan Otomatis',
            actorRole: 'SYSTEM',
            action: 'Pembersihan Sampah Kedaluwarsa',
            details: `Membersihkan otomatis ${expiredItems.length} item di bak sampah yang telah melewati retensi ${maxAgeDays} hari`,
            status: 'SUCCESS',
          },
          ...(prev.activityLogs || []).slice(0, 199),
        ],
      }));
    }

    return {
      purgedCount: expiredItems.length,
      remainingCount: validItems.length,
      purgedItems: expiredItems,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AutoCleanup] Gagal mengeksekusi pembersihan data sampah lama:', error);
    return {
      purgedCount: 0,
      remainingCount: (dataStorage.getDatabase().trashUsers || []).length,
      purgedItems: [],
      timestamp: new Date().toISOString(),
    };
  }
}
