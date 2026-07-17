"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { RoleSwitcher } from "@/components/RoleSwitcher";

// Rutas que se muestran sin el chrome (header + bottom nav).
// /expovino es la vista exclusiva del evento: branding propio, full-bleed.
// /admin/locales tiene su propio sidebar SaaS.
const BARE_ROUTES = [
  "/unete",
  "/admin/dashboard",
  "/admin/locales",
  "/superadmin",
  "/carta",
  "/expovino",
];

// Rutas con chrome, pero que manejan su propio contenedor (viewport completo
// en desktop). La página elige su ancho según el breakpoint.
// `/` es match EXACTO (para no capturar todo). El resto usa startsWith.
const WIDE_ROUTES = [
  "/",
  "/explora",
  "/premios",
  "/perfil",
  "/historial",
  "/terminos",
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname.startsWith(r));
  const wide = WIDE_ROUTES.some((r) => {
    if (r === "/") return pathname === "/";
    return pathname.startsWith(r);
  });

  if (bare) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main
        className={
          wide
            ? "w-full flex-1 pb-28 pt-4 lg:pb-12"
            : "mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4 lg:pb-12"
        }
      >
        {children}
      </main>
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
