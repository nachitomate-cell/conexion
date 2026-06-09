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
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Rol, Usuario } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  usuario: Usuario | null;
  rol: Rol | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Cambia el rol del usuario (usado por el RoleSwitcher de dev). */
  setRolDev: (rol: Rol) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubDoc?.();
      setFirebaseUser(fbUser);

      if (!fbUser) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubDoc = onSnapshot(
        doc(db, "usuarios", fbUser.uid),
        (snap) => {
          if (snap.exists()) {
            setUsuario({ uid: fbUser.uid, ...snap.data() } as Usuario);
          } else {
            setUsuario(null);
          }
          setLoading(false);
        },
        () => setLoading(false)
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
      signOut: async () => {
        await fbSignOut(auth);
      },
      setRolDev: async (rol: Rol) => {
        if (!firebaseUser) return;
        await updateDoc(doc(db, "usuarios", firebaseUser.uid), { rol });
      },
    }),
    [firebaseUser, usuario, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
