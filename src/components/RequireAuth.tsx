"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { homeForRole } from "@/lib/roles";
import { Logo } from "@/components/Logo";
import type { Rol } from "@/types";

function FullLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="animate-bounce text-4xl">🍣</div>
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}

/**
 * Protege rutas. Redirige a /unete si no hay sesión y, opcionalmente,
 * restringe por rol (redirige al home del rol si no coincide).
 *
 * Casos que salen del loader (evita el "cargando…" infinito):
 *   A. loading=false, sin firebaseUser         → redirige a /unete
 *   B. loading=false, con firebaseUser, sin usuario en Firestore
 *      (doc no existe o snapshot con error)   → redirige a /unete + log
 *   C. rol no incluido en `roles`              → redirige al home del rol
 *   D. usuario.baneado                         → pantalla dedicada
 *   E. todo OK                                 → renderiza children
 */
export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Rol[];
}) {
  const { firebaseUser, usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // A. Sin sesión
    if (!firebaseUser) {
      router.replace("/unete");
      return;
    }

    // B. Sesión pero sin perfil (nunca hubo setDoc, o Firestore erroró).
    // Antes esta rama no existía → dead-state = loader infinito.
    if (!usuario) {
      console.error(
        "[RequireAuth] Sesión activa pero sin doc en `usuarios/{uid}`. " +
          "Redirigiendo a /unete.",
        { uid: firebaseUser.uid, email: firebaseUser.email }
      );
      router.replace("/unete");
      return;
    }

    // C. Rol insuficiente
    if (roles && !roles.includes(usuario.rol)) {
      console.warn(
        `[RequireAuth] Rol '${usuario.rol}' no autorizado (se requiere ` +
          `${roles.join("|")}). Redirigiendo a home del rol.`
      );
      router.replace(homeForRole(usuario.rol));
    }
  }, [loading, firebaseUser, usuario, roles, router]);

  // Mientras Firebase resuelve la sesión.
  if (loading) return <FullLoader />;

  // Redirección en curso (los efectos ya dispararon router.replace).
  // Retornar el loader como fallback visual hasta que Next navegue.
  if (!firebaseUser || !usuario) return <FullLoader />;

  if (usuario.baneado) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Logo size={56} />
        <h2 className="font-headline text-xl font-bold">Cuenta suspendida</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Tu cuenta está temporalmente suspendida. Conversa con el local para
          reactivarla.
        </p>
      </div>
    );
  }

  if (roles && !roles.includes(usuario.rol)) return <FullLoader />;

  return <>{children}</>;
}
