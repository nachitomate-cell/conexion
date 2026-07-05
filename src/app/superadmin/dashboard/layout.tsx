"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Activity,
  ShieldAlert,
  Database,
  Terminal,
  Menu as MenuIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Layout independiente del Super Admin — NO usa useVendor().
// Vista global sobre todos los tenants de la plataforma.

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const NAV: NavItem[] = [
  { href: "/superadmin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/superadmin/dashboard#tenants", label: "Tenants", icon: Building2 },
  { href: "/superadmin/dashboard#actividad", label: "Actividad", icon: Activity },
  { href: "/superadmin/dashboard#infra", label: "Infraestructura", icon: Database },
  { href: "/superadmin/dashboard#incidentes", label: "Incidentes", icon: ShieldAlert, badge: "2" },
  { href: "/superadmin/logs", label: "Logs", icon: Terminal },
];

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-lg font-black text-white shadow-lg shadow-indigo-500/20">
          Σ
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Platform Console</p>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Super Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const href = item.href.split("#")[0];
          const active = pathname === href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-slate-800 text-white ring-1 ring-slate-700"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-500/40">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-800/60 p-3 text-[11px] leading-tight text-slate-400">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            build
          </p>
          <p className="mt-0.5 font-mono text-slate-300">
            v0.4.2 · main@a1b2c3d
          </p>
        </div>
        <Link
          href="/"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white"
        >
          ← Salir a la app
        </Link>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
        <SidebarBody pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-sm font-black text-white shadow-md shadow-indigo-500/30">
            Σ
          </span>
          <span className="text-sm font-semibold text-white">
            Platform Console
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 active:bg-slate-700"
          aria-label="Abrir menú de navegación"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
