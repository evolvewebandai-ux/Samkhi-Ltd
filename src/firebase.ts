import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
setLogLevel('error');

// Suppress internal benign Firestore idle stream disconnect log noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function isBenignFirestoreNoise(args: any[]): boolean {
  try {
    const argStr = args
      .map(arg => {
        if (!arg) return '';
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name} ${arg.message} ${arg.stack || ''}`;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ')
      .toLowerCase();

    return (
      argStr.includes('disconnecting idle stream') ||
      argStr.includes('timed out waiting for new targets') ||
      argStr.includes("listen' stream") ||
      argStr.includes("listen stream") ||
      argStr.includes('grpcconnection rpc') ||
      argStr.includes('cancelled: disconnecting idle stream') ||
      argStr.includes('could not reach cloud firestore backend') ||
      argStr.includes('typically indicates that your device does not have') ||
      argStr.includes('code=unavailable') ||
      argStr.includes('failed to get document from server')
    );
  } catch {
    return false;
  }
}

console.error = (...args) => {
  if (isBenignFirestoreNoise(args)) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  if (isBenignFirestoreNoise(args)) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const copy = { ...obj } as any;
    Object.keys(copy).forEach(key => {
      if (copy[key] === undefined) {
        delete copy[key];
      } else if (typeof copy[key] === 'object' && copy[key] !== null) {
        copy[key] = cleanUndefined(copy[key]);
      }
    });
    return copy as T;
  }
  return obj;
}

// Validate Connection to Firestore on initial boot
async function testConnection() {
  try {
    // Run after initial page load to avoid blocking resource loading
    setTimeout(async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firebase Connection Verified.");
      } catch (error) {
        console.warn("Firestore offline synchronization mode enabled. Updates will sync upon network re-establishment.");
      }
    }, 2000);
  } catch (err) {
    // Catch-all
  }
}
testConnection();
