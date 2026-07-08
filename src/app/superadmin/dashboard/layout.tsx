"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ShieldAlert,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/RequireAuth";

// Layout independiente del Super Admin — NO usa useVendor().
// Vista global sobre todos los clientes de la plataforma.

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/superadmin/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/superadmin/dashboard#clientes", label: "Clientes", icon: Building2 },
  { href: "/superadmin/dashboard/tareas", label: "Tareas", icon: ListChecks },
  { href: "/superadmin/dashboard/equipo", label: "Equipo", icon: Users },
  { href: "/superadmin/dashboard#alertas", label: "Alertas", icon: ShieldAlert },
];

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-slate-950/80 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 text-lg font-black text-slate-950 shadow-lg shadow-emerald-500/20">
          Σ
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Panel General</p>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            En vivo
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isAnchor = item.href.includes("#");
          const active = !isAnchor && pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-white/[0.06] text-white ring-1 ring-white/10"
                  : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-white"
        >
          ← Salir a la app
        </Link>
      </div>
    </aside>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around gap-1 rounded-2xl border border-white/10 bg-slate-900/85 px-2 py-2 shadow-2xl shadow-black/60 backdrop-blur-2xl animate-in slide-in-from-bottom-4 fade-in duration-500 lg:hidden"
      aria-label="Navegación principal"
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const href = item.href.split("#")[0];
        const active = pathname === href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-95",
              active
                ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <DesktopSidebar pathname={pathname} />

      <main className="lg:pl-64">
        {/* pb-24 en móvil para dejar aire a la bottom nav flotante */}
        <div className="mx-auto max-w-[1600px] px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
          {/* RequireAuth redirige al login dedicado del panel si no hay
              sesión — evita mostrar la landing de un tenant (SushiPro, etc.)
              cuando alguien entra al superadmin desde otro origen. */}
          <RequireAuth loginPath="/superadmin/login">{children}</RequireAuth>
        </div>
      </main>

      <MobileBottomNav pathname={pathname} />
    </div>
  );
}
