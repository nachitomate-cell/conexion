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
    if (!firebaseUser) {
      router.replace("/unete");
      return;
    }
    if (usuario && roles && !roles.includes(usuario.rol)) {
      router.replace(homeForRole(usuario.rol));
    }
  }, [loading, firebaseUser, usuario, roles, router]);

  if (loading || !firebaseUser || !usuario) return <FullLoader />;

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
