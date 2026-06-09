"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLES, homeForRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { Rol } from "@/types";

/**
 * Botón flotante SOLO para desarrollo: permite cambiar el rol del usuario
 * actual y testear las distintas vistas sin crear varias cuentas.
 */
export function RoleSwitcher() {
  const { rol, firebaseUser, setRolDev } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;
  if (!firebaseUser) return null;

  const roles = Object.keys(ROLES) as Rol[];

  return (
    <div className="fixed bottom-24 right-3 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-2 shadow-xl">
          <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Dev · Cambiar rol
          </p>
          {roles.map((r) => (
            <button
              key={r}
              onClick={async () => {
                await setRolDev(r);
                setOpen(false);
                router.push(homeForRole(r));
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                rol === r && "bg-secondary font-bold"
              )}
            >
              <span>{ROLES[r].emoji}</span>
              <span>{ROLES[r].label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground shadow-lg"
        aria-label="Cambiar rol (dev)"
        title="Cambiar rol (dev)"
      >
        🛠️
      </button>
    </div>
  );
}
