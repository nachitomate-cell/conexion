"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { Rol } from "@/types";

interface NavItem {
  href: string;
  label: string;
  emoji: string;
  fab?: boolean;
}

const NAV_CLIENTE: NavItem[] = [
  { href: "/", label: "Inicio", emoji: "🏠" },
  { href: "/premios", label: "Premios", emoji: "🎁" },
  { href: "/scan", label: "Escanear", emoji: "📷", fab: true },
  { href: "/menu", label: "Menú", emoji: "🍱" },
  { href: "/perfil", label: "Perfil", emoji: "👤" },
];

const NAV_CHEF: NavItem[] = [
  { href: "/vendedor", label: "Dashboard", emoji: "📊" },
  { href: "/vendedor?tab=scan", label: "Escanear", emoji: "📷", fab: true },
  { href: "/vendedor?tab=clientes", label: "Clientes", emoji: "👥" },
];

function navFor(rol: Rol | null): NavItem[] | null {
  if (rol === "chef_partner") return NAV_CHEF;
  if (rol === "gerente" || rol === "admin") return null; // dashboards full-screen
  return NAV_CLIENTE;
}

export function BottomNav() {
  const { rol, firebaseUser } = useAuth();
  const pathname = usePathname();

  if (!firebaseUser) return null;
  const items = navFor(rol);
  if (!items) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item) => {
          const href = item.href.split("?")[0];
          const active = pathname === href;
          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-6 flex flex-col items-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95">
                  {item.emoji}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
