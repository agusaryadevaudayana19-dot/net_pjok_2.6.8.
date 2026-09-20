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

// Use browserPopupRedirectResolver and safe non-IndexedDB persistence
// to prevent "auth/argument-error" and IndexedDB closing errors in iframes
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
provider.addScope('profile');
provider.addScope('email');
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGoogleUser: { email?: string; name?: string; photoURL?: string } | null = null;

// Request Google Access Token using Google Identity Services (GSI)
export const requestAccessTokenViaGSI = (): Promise<{ accessToken: string; email?: string } | null> => {
  return new Promise((resolve, reject) => {
    try {
      const g = typeof window !== 'undefined' ? (window as any).google : null;
      if (!g?.accounts?.oauth2) {
        return resolve(null);
      }

      const clientId =
        (firebaseConfig as any).oAuthClientId ||
        '1000034283605-jp2jr5rb1lnp2kla473vmo7n06s89lfn.apps.googleusercontent.com';

      const tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.warn('GSI Error:', tokenResponse);
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (tokenResponse.access_token) {
            let userEmail: string | undefined;
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                userEmail = info.email;
                cachedGoogleUser = { email: info.email, name: info.name, photoURL: info.picture };
              }
            } catch (e) {
              // ignore userinfo error
            }
            resolve({ accessToken: tokenResponse.access_token, email: userEmail });
          } else {
            resolve(null);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.warn('Failed to initialize GSI token client:', err);
      resolve(null);
    }
  });
};

export const initGoogleAuth = (
  onSuccess?: (user: FirebaseUser | { email?: string; displayName?: string }, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    const token = getGoogleAccessToken();
    if ((user || cachedGoogleUser) && token) {
      if (onSuccess) onSuccess(user || (cachedGoogleUser as any), token);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    }
  });
};

export const signInWithGoogle = async (): Promise<{
  user: FirebaseUser | { email?: string; displayName?: string; photoURL?: string };
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;

    // 1. First attempt: Try Google Identity Services (GSI) which is resilient to Firebase Authorized Domain limits
    try {
      const gsiResult = await requestAccessTokenViaGSI();
      if (gsiResult?.accessToken) {
        cachedAccessToken = gsiResult.accessToken;
        setGoogleAccessToken(gsiResult.accessToken);
        return {
          user: {
            email: gsiResult.email || cachedGoogleUser?.email || 'Akun Google Workspace',
            displayName: cachedGoogleUser?.name || 'Pengguna Google',
            photoURL: cachedGoogleUser?.photoURL,
          },
          accessToken: gsiResult.accessToken,
        };
      }
    } catch (gsiErr: any) {
      console.warn('GSI Token request skipped or failed, trying Firebase popup...', gsiErr);
    }

    // 2. Second attempt: Firebase signInWithPopup
    try {
      if (typeof window !== 'undefined') {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
      }
    } catch {
      // ignore
    }

    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const token = credential?.accessToken || (result as any)?._tokenResponse?.oauthAccessToken || null;
    if (token) {
      cachedAccessToken = token;
      setGoogleAccessToken(token);
      return { user: result.user, accessToken: token };
    }

    // Even if access token is not attached, result.user is logged in!
    // We can generate a valid session token for local features
    const idToken = await result.user.getIdToken();
    cachedAccessToken = idToken;
    setGoogleAccessToken(idToken);
    return { user: result.user, accessToken: idToken };
  } catch (err: any) {
    // 1. User intentionally closed the popup or cancelled the request
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('auth/popup-closed-by-user') ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Google Sign-In popup was closed or cancelled by the user.');
      return null;
    }

    // 2. Popup was blocked by the browser
    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
      console.warn('Google Sign-In popup was blocked by the browser.');
      throw new Error(
        'Jendela pop-up login Google diblokir oleh peramban. Harap izinkan pop-up (buka izin pop-up di samping address bar) atau buka aplikasi di tab baru.'
      );
    }

    // 3. Domain is not yet authorized in Firebase Console
    if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
      console.warn('Google Sign-In domain is not yet authorized:', currentHost);
      throw new Error(
        `Domain aplikasi (${currentHost}) belum terdaftar di Firebase Authorized Domains. Gunakan tombol 'Hubungkan dengan Token' atau gunakan sinkronisasi Webhook Google Apps Script tanpa perlu login Google.`
      );
    }

    if (err?.code === 'auth/argument-error') {
      throw new Error('Konfigurasi autentikasi peramban tidak sesuai. Silakan buka aplikasi di tab baru.');
    }

    // 4. Handle IDBDatabase connection closing error in iframes
    if (
      err?.message &&
      (err.message.includes('IDBDatabase') || err.message.includes('database connection is closing'))
    ) {
      try {
        await setPersistence(auth, inMemoryPersistence).catch(() => {});
        const retryResult = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        const retryCred = GoogleAuthProvider.credentialFromResult(retryResult);
        const token = retryCred?.accessToken || (await retryResult.user.getIdToken());
        if (token) {
          cachedAccessToken = token;
          setGoogleAccessToken(token);
          return { user: retryResult.user, accessToken: token };
        }
      } catch (retryErr: any) {
        if (
          retryErr?.code === 'auth/popup-closed-by-user' ||
          retryErr?.message?.includes('popup-closed-by-user')
        ) {
          return null;
        }
        console.warn('Retry Google Sign In Error:', retryErr);
        throw new Error(
          'Koneksi autentikasi peramban dibatasi di dalam iframe. Silakan buka aplikasi di tab baru atau gunakan sinkronisasi Webhook langsung.'
        );
      }
    }

    console.error('Google Sign In Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem('lms_pjok_google_token');
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {
    // ignore
  }
  return null;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('lms_pjok_google_token', token);
    } else {
      localStorage.removeItem('lms_pjok_google_token');
    }
  } catch {
    // ignore
  }
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } finally {
    setGoogleAccessToken(null);
  }
};
