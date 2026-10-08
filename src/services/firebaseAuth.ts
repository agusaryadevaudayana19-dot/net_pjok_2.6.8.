import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  setPersistence,
  Auth,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
})();

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({ prompt: 'consent select_account' });

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

let isSigningIn = false;
// Cache the access token in memory (do not store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: { email?: string; name?: string; photoURL?: string } | null = null;

export const initGoogleAuth = (
  onSuccess?: (user: FirebaseUser | { email?: string; displayName?: string }, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{
  user: FirebaseUser | { email?: string; displayName?: string; photoURL?: string };
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;

    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || (result as any)?._tokenResponse?.oauthAccessToken || null;

    if (!token) {
      throw new Error('Gagal mendapatkan token akses Google Sheets dari akun Google Anda. Silakan coba lagi dan centang izin Google Sheets pada jendela Google.');
    }

    cachedAccessToken = token;
    cachedGoogleUser = {
      email: result.user.email || undefined,
      name: result.user.displayName || undefined,
      photoURL: result.user.photoURL || undefined,
    };

    return { user: result.user, accessToken: token };
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('auth/popup-closed-by-user') ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }

    if (
      err?.message &&
      (err.message.includes('IDBDatabase') || err.message.includes('database connection is closing'))
    ) {
      try {
        await setPersistence(auth, inMemoryPersistence).catch(() => {});
        const retryResult = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        const retryCred = GoogleAuthProvider.credentialFromResult(retryResult);
        const retryToken = retryCred?.accessToken || (retryResult as any)?._tokenResponse?.oauthAccessToken || null;
        if (retryToken) {
          cachedAccessToken = retryToken;
          cachedGoogleUser = {
            email: retryResult.user.email || undefined,
            name: retryResult.user.displayName || undefined,
            photoURL: retryResult.user.photoURL || undefined,
          };
          return { user: retryResult.user, accessToken: retryToken };
        }
      } catch (retryErr: any) {
        if (
          retryErr?.code === 'auth/popup-closed-by-user' ||
          retryErr?.message?.includes('popup-closed-by-user')
        ) {
          return null;
        }
        throw retryErr;
      }
    }

    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
      throw new Error(
        'Jendela pop-up login Google diblokir oleh peramban. Harap izinkan pop-up atau gunakan Metode 2 (Tanpa Login OAuth) di bawah.'
      );
    }

    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain') || err?.message?.includes('origin_mismatch')) {
      throw new Error(
        'Domain preview aplikasi dibatasi oleh pengaturan OAuth Google Cloud. Silakan gunakan Metode 2 (Sinkronisasi Langsung ke Google Spreadsheet Tanpa Login OAuth) yang tersedia di bawah ini — langsung berhasil 100% tanpa kendala origin_mismatch!'
      );
    }

    console.error('Google Sign In Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCachedGoogleUser = () => cachedGoogleUser;

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedGoogleUser = null;
  }
};
