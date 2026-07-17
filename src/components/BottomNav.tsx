"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Gift,
  Camera,
  BookOpen,
  User,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import { cn } from "@/lib/utils";
import type { Rol } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  fab?: boolean;
}

const NAV_CLIENTE: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/premios", label: "Premios", icon: Gift },
  { href: "/scan", label: "Escanear", icon: Camera, fab: true },
  { href: "/menu", label: "Menú", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: User },
];

const NAV_CHEF: NavItem[] = [
  { href: "/vendedor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendedor?tab=scan", label: "Escanear", icon: Camera, fab: true },
  { href: "/vendedor?tab=clientes", label: "Clientes", icon: Users },
];

function navFor(rol: Rol | null): NavItem[] | null {
  if (rol === "chef_partner") return NAV_CHEF;
  if (rol === "gerente" || rol === "admin") return null;
  return NAV_CLIENTE;
}

export function BottomNav() {
  const { rol } = useAuth();
  const vendor = useVendor();
  const pathname = usePathname();

  const items = navFor(rol);
  if (!items) return null;
  const brand = vendor.theme.primaryColor;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        {items.map((item) => {
          const href = item.href.split("?")[0];
          const active = pathname === href;
          const Icon = item.icon;

          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="-mt-6 flex flex-col items-center"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-background transition-transform active:scale-95"
                  style={{ backgroundColor: brand }}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.25} />
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
              aria-label={item.label}
              className={cn(
                "flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-colors",
                !active && "text-muted-foreground"
              )}
              style={active ? { color: brand } : undefined}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.5 : 2}
                aria-hidden
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
