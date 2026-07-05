"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { rolInicial } from "@/lib/roles";
import type { Rol, Usuario } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  usuario: Usuario | null;
  rol: Rol | null;
  loading: boolean;
  /** true si el listener de Firestore rechaza por permisos (rules mal deployadas). */
  permissionError: boolean;
  signOut: () => Promise<void>;
  /** Cambia el rol del usuario (usado por el RoleSwitcher de dev). */
  setRolDev: (rol: Rol) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Aprovisiona `usuarios/{uid}` con defaults sensatos para un Firebase user
 * recién autenticado. Se llama solo cuando el doc NO existe todavía.
 *
 * Modelo multitenant: el doc es GLOBAL (una entrada por Firebase UID). Los
 * sellos por tenant viven en `sellosLocales: Record<vendorId, number>`, así
 * que el mismo UID sirve a todos los locales sin duplicar registros.
 */
async function provisionUserDoc(fbUser: FirebaseUser): Promise<void> {
  const email = (fbUser.email || "").toLowerCase();
  await setDoc(doc(db, "usuarios", fbUser.uid), {
    nombre:
      fbUser.displayName || fbUser.email?.split("@")[0] || "Socio",
    email,
    telefono: null,
    fechaNacimiento: null,
    rol: rolInicial(email),
    sellos: 0,
    sellosHistoricos: 0,
    rachaActual: 0,
    baneado: false,
    recompensaDisponible: false,
    sellosLocales: {},
    referidoPor: null,
    createdAt: serverTimestamp(),
  });
  console.info(
    "[AuthContext] Doc `usuarios/{uid}` aprovisionado para user nuevo.",
    { uid: fbUser.uid, email }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      unsubDoc?.();
      setFirebaseUser(fbUser);
      setPermissionError(false);

      if (!fbUser) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRef = doc(db, "usuarios", fbUser.uid);

      // Paso 1 — aprovisionamiento perezoso.
      // Multitenant: si el mismo UID nunca ha visitado este proyecto Firestore,
      // aquí creamos el doc para que el listener siguiente lo encuentre.
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await provisionUserDoc(fbUser);
        }
      } catch (err) {
        // Puede ser: (a) rules bloqueando lectura, (b) rules bloqueando create.
        // No abortamos: el onSnapshot igual va a reportar el error real y
        // dejamos que RequireAuth redirija.
        console.error(
          "[AuthContext] Aprovisionamiento falló. " +
            "Revisa que firestore.rules esté DESPLEGADO en el proyecto " +
            "(`firebase deploy --only firestore:rules`) y que permita " +
            "que un usuario cree/lea su propio doc en `usuarios/{uid}`.",
          err
        );
        setPermissionError(true);
      }

      // Paso 2 — listener en vivo.
      unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setUsuario({ uid: fbUser.uid, ...snap.data() } as Usuario);
            setPermissionError(false);
          } else {
            console.warn(
              "[AuthContext] onSnapshot: `usuarios/{uid}` aún no existe " +
                "tras aprovisionar. Puede ser latencia de propagación.",
              { uid: fbUser.uid }
            );
            setUsuario(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error(
            "[AuthContext] onSnapshot de `usuarios/{uid}` falló: " +
              "PROBABLE causa → firestore.rules no está deployado o " +
              "bloquea lectura del propio doc del usuario. " +
              "Fix: `firebase deploy --only firestore:rules`.",
            err
          );
          setUsuario(null);
          setPermissionError(true);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubDoc?.();
      unsubAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      usuario,
      rol: usuario?.rol ?? null,
      loading,
      permissionError,
      signOut: async () => {
        await fbSignOut(auth);
      },
      setRolDev: async (rol: Rol) => {
        if (!firebaseUser) return;
        await updateDoc(doc(db, "usuarios", firebaseUser.uid), { rol });
      },
    }),
    [firebaseUser, usuario, loading, permissionError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
