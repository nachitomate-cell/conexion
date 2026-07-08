"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { RoleSwitcher } from "@/components/RoleSwitcher";

// Rutas que se muestran sin el chrome (header + bottom nav).
const BARE_ROUTES = ["/unete", "/admin/dashboard", "/superadmin", "/carta"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  if (bare) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">
        {children}
      </main>
      <BottomNav />
      <RoleSwitcher />
    </div>
  );
}
