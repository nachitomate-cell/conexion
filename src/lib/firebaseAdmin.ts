import "server-only";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

/**
 * Normaliza el valor de `FIREBASE_ADMIN_PRIVATE_KEY` — tolerante a los tres
 * errores más comunes al pegarlo en Vercel/otro dashboard:
 *   1. Quedó con comillas envolventes: `"-----BEGIN..."`
 *   2. Quedó en una sola línea con `\n` literales (dotenv style)
 *   3. Quedó multi-línea real (formato PEM nativo)
 * Todas terminan como PEM válido con newlines reales.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let key = raw.trim();
  // Quita comillas envolventes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // \n literal → newline real.
  key = key.replace(/\\n/g, "\n");
  return key;
}

function buildApp(): App {
  if (getApps().length > 0) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan credenciales de Firebase Admin (FIREBASE_ADMIN_*). Revisa .env.local."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let _app: App | undefined;
function adminApp(): App {
  if (!_app) _app = buildApp();
  return _app;
}

/**
 * Proxies perezosos: la app/Firestore/Auth/Messaging se inicializan recién en
 * el primer acceso (en runtime), no al importar el módulo. Así `next build`
 * no falla aunque las credenciales aún no estén configuradas.
 */
function lazy<T extends object>(factory: () => T): T {
  let inst: T | undefined;
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      if (!inst) inst = factory();
      const value = Reflect.get(inst as object, prop, receiver);
      return typeof value === "function" ? value.bind(inst) : value;
    },
  });
}

export const adminDb: Firestore = lazy(() => getFirestore(adminApp()));
export const adminAuth: Auth = lazy(() => getAuth(adminApp()));
export const adminMessaging: Messaging = lazy(() =>
  getMessaging(adminApp())
);
