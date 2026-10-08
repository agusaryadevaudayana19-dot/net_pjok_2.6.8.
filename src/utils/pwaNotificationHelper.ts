import { NotifikasiItem } from '../types';

const SOUND_ENABLED_KEY = 'net_pjok_notif_sound_enabled';
const SEEN_NOTIF_IDS_PREFIX = 'net_pjok_seen_push_notifs_';

/**
 * Check if notification sound is enabled by the user (defaults to true)
 */
export function isNotificationSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
}

/**
 * Play a pleasant, clear two-tone notification chime using Web Audio API.
 * Works on both Mobile (Android/iOS) and Laptop/Desktop without external MP3 dependencies.
 */
export function playNotificationSound(): void {
  if (!isNotificationSoundEnabled()) return;

  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First chime note (D5 -> 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.26);

    // Second chime note (A5 -> 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0.001, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.32, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.67);

    // Subtle third harmonic (D6 -> 1174.66 Hz) for crispness
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1174.66, now + 0.28);
    gain3.gain.setValueAtTime(0.001, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.22, now + 0.31);
    gain3.gain.exponentialRampToValueAtTime(0.0005, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.28);
    osc3.stop(now + 0.87);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.debug('Audio notification playback skipped:', err);
  }
}

/**
 * Request browser / PWA OS notification permission
 */
export async function requestDeviceNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      playNotificationSound();
    }
    return result;
  } catch {
    return Notification.permission;
  }
}

export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Update PWA App Icon Badge (Badging API) on installed Mobile / Desktop app icon
 */
export function updatePWAAppBadge(unreadCount: number): void {
  if (typeof navigator === 'undefined') return;
  try {
    const nav = navigator as unknown as {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0 && typeof nav.setAppBadge === 'function') {
      nav.setAppBadge(unreadCount).catch(() => {});
    } else if (unreadCount <= 0 && typeof nav.clearAppBadge === 'function') {
      nav.clearAppBadge().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Trigger a native OS / PWA Notification on HP (Android/iOS) or Laptop (Windows/Mac)
 * Uses ServiceWorkerRegistration.showNotification when available (required for Android PWA).
 */
export async function triggerDeviceNotification(
  notif: Pick<NotifikasiItem, 'id' | 'judul' | 'pesan' | 'tipe' | 'targetMenu' | 'targetId'>
): Promise<void> {
  // 1. Play notification sound chime
  playNotificationSound();

  // 2. Vibrate on mobile devices if supported
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 80, 220]);
    }
  } catch {
    // ignore
  }

  // 3. Display native OS / PWA notification if permission is granted
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: notif.pesan,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: notif.id || `net-pjok-${Date.now()}`,
    renotify: true,
    vibrate: [180, 80, 220],
    data: {
      id: notif.id,
      tipe: notif.tipe,
      targetMenu: notif.targetMenu,
      targetId: notif.targetId,
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(notif.judul, options);
        return;
      }
    }
    // Fallback to standard Desktop Notification constructor
    new Notification(notif.judul, options);
  } catch {
    try {
      new Notification(notif.judul, {
        body: notif.pesan,
        icon: '/pwa-192x192.png',
      });
    } catch {
      // ignore if restricted by environment
    }
  }
}

/**
 * Track already-alerted notification IDs per user so we only ring/popup on genuinely NEW incoming notifications
 */
export function getSeenPushNotifIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SEEN_NOTIF_IDS_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSeenPushNotifIds(userId: string, ids: Set<string>): void {
  try {
    const arr = Array.from(ids).slice(-250);
    localStorage.setItem(`${SEEN_NOTIF_IDS_PREFIX}${userId}`, JSON.stringify(arr));
  } catch {
    // ignore
  }
}
