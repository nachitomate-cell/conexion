"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gift,
  UtensilsCrossed,
  Store,
  Bike,
  QrCode,
  Instagram,
  Menu as MenuIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { useVendor } from "@/context/VendorContext";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Usuarios", icon: Users },
  { href: "/admin/premios", label: "Inventario de Premios", icon: Gift },
  { href: "/admin/carta-digital", label: "Carta Digital", icon: UtensilsCrossed },
  { href: "/admin/delivery", label: "Delivery", icon: Bike },
  { href: "/admin/qr", label: "Mi QR", icon: QrCode },
  { href: "/admin/local", label: "Mi Local", icon: Store },
];

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const vendor = useVendor();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
          SP
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {vendor.nombre}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">
            Panel Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const href = item.href.split("#")[0];
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="block rounded-lg px-3 py-2 text-xs text-slate-400 hover:text-white"
        >
          ← Volver a la app
        </Link>
        <a
          href="https://instagram.com/synaptechspa"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-fuchsia-300"
        >
          <Instagram className="h-3 w-3 shrink-0" />
          Powered By SynapTech
        </a>
      </div>
    </div>
  );
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const vendor = useVendor();

  return (
    <div className="min-h-dvh bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-800 bg-slate-900 md:block">
        <SidebarBody pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">
          {vendor.nombre} · Admin
        </span>
        <span className="w-9" />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl">
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

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminGate>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AdminGate>
  );
}
