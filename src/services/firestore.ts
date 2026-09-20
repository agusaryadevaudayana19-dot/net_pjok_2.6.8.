import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import { auth } from './firebaseAuth';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign client offline transition notices while retaining error visibility
setLogLevel('error');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const firestore: Firestore = (() => {
  const dbId = firebaseConfig.firestoreDatabaseId || undefined;
  try {
    // Initialize Firestore with persistent multi-tab local cache and force long-polling
    // to prevent 10s WebChannel connection streaming timeouts in sandboxed/proxy iframe environments
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      },
      dbId
    );
  } catch (err) {
    console.info('Using standard Firestore instance (fallback):', err);
    try {
      if (dbId) {
        return getFirestore(app, dbId);
      }
      return getFirestore(app);
    } catch {
      return getFirestore(app);
    }
  }
})();

// Alias db for SKILL.md compatibility
export const db = firestore;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot according to SKILL.md
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'lms_records', 'settings'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or connecting...');
    }
    return false;
  }
}
testFirestoreConnection().catch(() => {});

// Network management helpers for offline / standby testing
export async function toggleFirestoreOffline(goOffline: boolean): Promise<void> {
  try {
    if (goOffline) {
      await disableNetwork(firestore);
    } else {
      await enableNetwork(firestore);
    }
  } catch (e) {
    console.warn('Network toggle notice:', e);
  }
}
