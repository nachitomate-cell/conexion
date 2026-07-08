import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Fallbacks no vacíos para que `next build` no falle al prerenderizar cuando
// aún no hay .env.local. En el navegador (prod) las NEXT_PUBLIC_* reales se
// inyectan en build y sobrescriben estos valores demo.
// `.trim()` blinda contra `\n` que se cuelan al pegar en dashboards de env
// vars — Firebase no tolera whitespace en apiKey/authDomain/etc.
const clean = (v: string | undefined, fallback: string) =>
  (v ?? "").trim() || fallback;

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, "demo-api-key"),
  authDomain: clean(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "demo.firebaseapp.com"
  ),
  projectId: clean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "demo-sushipro"
  ),
  storageBucket: clean(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "demo.appspot.com"
  ),
  messagingSenderId: clean(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "000000000000"
  ),
  appId: clean(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:000000000000:web:demo"
  ),
};

export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
