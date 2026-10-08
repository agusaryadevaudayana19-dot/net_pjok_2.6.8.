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
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({ prompt: 'select_account' });

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets',
];

let isSigningIn = false;
// Cache the access token in memory (do not store in localStorage/sessionStorage)
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
        scope: WORKSPACE_SCOPES.join(' '),
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
    if ((user || cachedGoogleUser) && cachedAccessToken) {
      if (onSuccess) onSuccess(user || (cachedGoogleUser as any), cachedAccessToken);
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

    // 1. First attempt: Firebase signInWithPopup with GoogleAuthProvider (includes spreadsheets scope)
    try {
      if (typeof window !== 'undefined') {
        await setPersistence(auth, browserLocalPersistence).catch(() => {});
      }
    } catch {
      // ignore
    }

    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || (result as any)?._tokenResponse?.oauthAccessToken || null;
      if (token) {
        cachedAccessToken = token;
        cachedGoogleUser = {
          email: result.user.email || undefined,
          name: result.user.displayName || undefined,
          photoURL: result.user.photoURL || undefined,
        };
        return { user: result.user, accessToken: token };
      }
    } catch (popupErr: any) {
      if (
        popupErr?.code === 'auth/popup-closed-by-user' ||
        popupErr?.code === 'auth/cancelled-popup-request' ||
        popupErr?.message?.includes('popup-closed-by-user')
      ) {
        return null;
      }
      console.warn('Firebase popup fallback to GSI...', popupErr);
    }

    // 2. Fallback attempt: Try Google Identity Services (GSI)
    const gsiResult = await requestAccessTokenViaGSI();
    if (gsiResult?.accessToken) {
      cachedAccessToken = gsiResult.accessToken;
      return {
        user: {
          email: gsiResult.email || cachedGoogleUser?.email || 'Akun Google Workspace',
          displayName: cachedGoogleUser?.name || 'Pengguna Google',
          photoURL: cachedGoogleUser?.photoURL,
        },
        accessToken: gsiResult.accessToken,
      };
    }

    return null;
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('auth/popup-closed-by-user') ||
      err?.message?.includes('popup-closed-by-user')
    ) {
      return null;
    }

    if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
      throw new Error(
        'Jendela pop-up login Google diblokir oleh peramban. Harap izinkan pop-up atau buka aplikasi di tab baru.'
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
