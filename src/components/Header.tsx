"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, ChevronDown, Compass, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import {
  PORTAL_NAME,
  clubSlugFromPathname,
  isPortalRoute,
} from "@/lib/portal";
import { getVendorBySlug } from "@/lib/vendors";
import { cn } from "@/lib/utils";

// ─── Nav de escritorio ────────────────────────────────────
// El chrome inferior (BottomNav con el FAB "Escanear") se oculta en lg+.
// Estos links viven en el header en pantallas grandes.
const DESKTOP_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Inicio" },
  { href: "/explora", label: "Explorar" },
  { href: "/premios", label: "Mis Premios" },
  { href: "/perfil", label: "Mi Perfil" },
];

function DesktopNavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-black/[0.06] text-foreground"
          : "text-foreground/60 hover:bg-black/[0.04] hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

/** Marca del portal (texto + punto acento). Usada en rutas de discovery. */
function PortalBrand({ className }: { className?: string }) {
  return (
    <Link
      href="/explora"
      aria-label={`${PORTAL_NAME} · Portal de fidelidad`}
      className={cn(
        "font-headline text-[20px] font-black leading-none tracking-tight",
        className
      )}
    >
      {PORTAL_NAME}
      <span className="text-primary">.</span>
    </Link>
  );
}

/**
 * Ir-atrás cuando estamos dentro de `/club/[slug]` — reemplaza a la marca
 * en el header y devuelve al usuario al portal global.
 */
function ClubBackLink({
  clubName,
  className,
}: {
  clubName?: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1.5 text-[12px] font-semibold text-foreground/80 transition-colors hover:bg-black/[0.08] hover:text-foreground",
        className
      )}
      aria-label={`Volver a ${PORTAL_NAME}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>{PORTAL_NAME}</span>
      {clubName && (
        <>
          <span className="text-foreground/40">/</span>
          <span className="max-w-[10ch] truncate font-semibold text-foreground">
            {clubName}
          </span>
        </>
      )}
    </Link>
  );
}

export function Header() {
  const { firebaseUser } = useAuth();
  const vendor = useVendor();
  const pathname = usePathname();
  const clubSlug = clubSlugFromPathname(pathname);
  const clubActivo = clubSlug ? getVendorBySlug(clubSlug) : null;
  const enClub = !!clubSlug;
  const portalContext = isPortalRoute(pathname);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!firebaseUser) {
      setNoLeidas(0);
      return;
    }
    const q = query(
      collection(db, "usuarios", firebaseUser.uid, "notificaciones"),
      where("leida", "==", false)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setNoLeidas(snap.size),
      () => setNoLeidas(0)
    );
    return () => unsub();
  }, [firebaseUser]);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
      {/* ── Móvil ── */}
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4 lg:hidden">
        {enClub ? (
          <ClubBackLink clubName={clubActivo?.nombre} />
        ) : portalContext ? (
          <PortalBrand />
        ) : (
          <Link
            href="/"
            className="flex items-center"
            aria-label={vendor.nombre}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vendor.theme.logoUrl}
              alt={vendor.nombre}
              width={vendor.theme.logoWidth}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        )}

        <div className="flex items-center gap-1">
          <Link
            href="/explora"
            className="rounded-full p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Explorar clubes"
          >
            <Compass className="h-5 w-5" />
          </Link>

          {firebaseUser ? (
            <Link
              href="/notificacion"
              className="relative rounded-full p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {noLeidas > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/unete"
              className="ml-1 rounded-full bg-foreground px-4 py-1.5 text-sm font-bold text-background transition-colors hover:bg-foreground/90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between gap-8 px-8 lg:flex">
        {enClub ? (
          <ClubBackLink clubName={clubActivo?.nombre} className="text-[13px]" />
        ) : portalContext ? (
          <PortalBrand className="text-[22px]" />
        ) : (
          <Link
            href="/"
            className="flex items-center"
            aria-label={vendor.nombre}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vendor.theme.logoUrl}
              alt={vendor.nombre}
              width={vendor.theme.logoWidth}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        )}

        <nav className="flex items-center gap-1">
          {DESKTOP_LINKS.map((l) => (
            <DesktopNavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Selector de ubicación — visual, indica el tenant activo. */}
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full bg-black/[0.04] px-3.5 py-2 text-[12px] font-semibold text-foreground/80 transition-colors hover:bg-black/[0.06] xl:flex"
            aria-label="Cambiar ubicación"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{vendor.zona ?? vendor.nombre}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          </button>

          {firebaseUser && (
            <Link
              href="/notificacion"
              className="relative rounded-full p-2 text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {noLeidas > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {noLeidas > 9 ? "9+" : noLeidas}
                </span>
              )}
            </Link>
          )}

          {firebaseUser ? (
            <Link
              href="/scan"
              className="ml-1 rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background transition-colors hover:bg-foreground/90"
            >
              Ingresar código
            </Link>
          ) : (
            <Link
              href="/unete"
              className="ml-1 rounded-full bg-foreground px-5 py-2 text-[13px] font-bold text-background transition-colors hover:bg-foreground/90"
            >
              Únete gratis
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
