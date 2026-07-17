"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import { VENDORS } from "@/lib/vendors";
import { RUBRO_META } from "@/lib/mercadoVina";
import {
  getRutasActivas,
  localesVisitados,
  REDES_EXTERNAS,
  type RedExterna,
} from "@/lib/rutas";
import { Button } from "@/components/ui/button";
import { SumaTuLocalBanner } from "@/components/SumaTuLocalBanner";
import { useFirebaseImage } from "@/hooks/useFirebaseImage";
import { useOfficialTenants } from "@/hooks/useOfficialTenants";
import { cn } from "@/lib/utils";
import type { ProspectoRubro, Ruta, Vendor } from "@/types";

// =========================================================
// Explora — portal + directorio digital de la Quinta Región.
// Móvil = app editorial. Escritorio = portal SaaS (grids
// anchos, sidebar de filtros, hero visual, Bento con los
// clubes que pagan Primera Fila).
// =========================================================

type RubroFilter = "todos" | ProspectoRubro;

const SOFT_SHADOW = "shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)]";
const HAIRLINE = "ring-1 ring-black/[0.06]";

function rubroLabel(v: Vendor): string {
  return v.rubro ? RUBRO_META[v.rubro].label : "Local";
}

/** Ordena: primero los funcionando, luego alfabético. */
function sortClubs(list: Vendor[]): Vendor[] {
  return [...list].sort(
    (a, b) =>
      (a.status === "funcionando" ? 0 : 1) -
        (b.status === "funcionando" ? 0 : 1) ||
      a.nombre.localeCompare(b.nombre, "es")
  );
}

/**
 * Locales del plan Primera Fila. Si nadie está marcado como `destacado`
 * (mientras se termina de wirear la data), tomamos los primeros
 * `funcionando` como demo — así el bloque nunca queda vacío.
 */
function pickDestacados(clubs: Vendor[], n: number): Vendor[] {
  const opted = clubs.filter((v) => v.destacado);
  if (opted.length >= 1) return opted.slice(0, n);
  return clubs.filter((v) => v.status === "funcionando").slice(0, n);
}

// ─── Compartidos ─────────────────────────────────────────

function SelloDots({
  actual,
  total,
  color,
}: {
  actual: number;
  total: number;
  color: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[5px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-[7px] w-[7px] rounded-full transition-colors",
            i >= actual && "bg-black/[0.08]"
          )}
          style={i < actual ? { backgroundColor: color } : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Banner de "Grandes Alianzas y Circuitos". Se usa en móvil y escritorio;
 * el ancho lo controla el padre (col-span, min-h). Imagen de fondo con
 * fallback graceful: si la portada falla, queda el color de marca + emoji
 * decorativo + overlay oscuro, y sigue leyéndose el texto.
 */
function GranAlianzaCard({
  red,
  className,
  minHeight = "min-h-[280px] md:min-h-[380px]",
}: {
  red: RedExterna;
  className?: string;
  minHeight?: string;
}) {
  const { url: bgUrl } = useFirebaseImage(red.bgImage);
  const external = red.url.startsWith("http");

  return (
    <a
      href={red.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "group relative flex cursor-pointer flex-col justify-end overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2",
        minHeight,
        className
      )}
      aria-label={`${red.nombre} — ${red.badge}`}
    >
      {/* Color base — fallback si la imagen no carga */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: red.accentColor }}
      />

      {/* Portada */}
      {bgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bgUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Emoji decorativo XL — se ve incluso sin imagen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-6 select-none text-[240px] leading-none text-white opacity-20"
      >
        {red.emoji}
      </div>

      {/* Degradado oscuro — garantiza legibilidad del texto blanco */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
      />

      {/* Badge de categoría */}
      <span className="absolute left-5 top-5 z-10 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground shadow-sm backdrop-blur">
        {red.badge}
      </span>

      {/* Flecha */}
      <span
        aria-hidden
        className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-foreground shadow-sm backdrop-blur transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      >
        <ArrowUpRight className="h-4 w-4" />
      </span>

      {/* Contenido */}
      <div className="relative z-10 p-6 text-white md:p-7">
        {red.zonaCobertura && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">
            {red.zonaCobertura}
          </p>
        )}
        <p
          className={cn(
            "font-headline text-[24px] font-black leading-tight tracking-tight text-white md:text-[30px]",
            red.zonaCobertura ? "mt-1.5" : ""
          )}
        >
          {red.nombre}
        </p>
        <p className="mt-2 max-w-[42ch] text-[13px] leading-relaxed text-white/85 md:text-[14px]">
          {red.descripcion}
        </p>
      </div>
    </a>
  );
}

// ─── Móvil ───────────────────────────────────────────────

function SectionTitle({
  kicker,
  titulo,
  detalle,
}: {
  kicker: string;
  titulo: string;
  detalle?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          {kicker}
        </p>
        <h2 className="mt-0.5 font-headline text-[22px] font-extrabold leading-none tracking-tight">
          {titulo}
        </h2>
      </div>
      {detalle && (
        <p className="shrink-0 pb-0.5 text-[11px] font-medium tabular-nums text-muted-foreground/70">
          {detalle}
        </p>
      )}
    </div>
  );
}

function WalletPass({
  v,
  sellos,
  esActual,
}: {
  v: Vendor;
  sellos: number;
  esActual: boolean;
}) {
  const faltan = Math.max(0, v.sellosParaPremio - sellos);
  const color = v.theme.primaryColor;

  const inner = (
    <div
      className={cn(
        "relative flex h-full w-[272px] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[1.75rem] bg-card p-5 transition-transform duration-300 active:scale-[0.98]",
        HAIRLINE,
        SOFT_SHADOW
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full opacity-[0.09] blur-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full text-[22px]"
          style={{ backgroundColor: `${color}14` }}
        >
          {v.emoji}
        </span>
        {esActual ? (
          <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-semibold text-foreground/60">
            Ver mi tarjeta
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      <div className="mt-5">
        <p className="truncate font-headline text-[17px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {v.zona ?? rubroLabel(v)}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <SelloDots
          actual={Math.min(sellos, v.sellosParaPremio)}
          total={v.sellosParaPremio}
          color={color}
        />
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {sellos}
          </span>{" "}
          de {v.sellosParaPremio}
          {faltan > 0 ? ` · te faltan ${faltan}` : " · premio listo 🎁"}
        </p>
      </div>
    </div>
  );

  return (
    <Link
      href={`/club/${v.slug}`}
      className="block shrink-0 cursor-pointer"
    >
      {inner}
    </Link>
  );
}

function ClubRow({ v, esActual }: { v: Vendor; esActual: boolean }) {
  const abierto = v.status === "funcionando";
  const color = v.theme.primaryColor;

  const pill = (
    <span
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold transition-transform active:scale-95",
        abierto
          ? "bg-black/[0.05] text-foreground"
          : "bg-black/[0.03] text-muted-foreground/60"
      )}
    >
      {esActual ? "Entrar" : abierto ? "Abrir" : "Pronto"}
    </span>
  );

  const inner = (
    <div className="flex items-center gap-4 py-4">
      <span
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[24px]"
        style={{ backgroundColor: `${color}12` }}
      >
        {v.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-headline text-[15px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          {rubroLabel(v)}
          {v.zona ? ` · ${v.zona}` : ""}
        </p>
        <p className="mt-1 line-clamp-1 text-[12px] leading-snug text-muted-foreground">
          {v.copy.joinDescription}
        </p>
      </div>
      {pill}
    </div>
  );

  return (
    <Link href={`/club/${v.slug}`} className="block cursor-pointer">
      {inner}
    </Link>
  );
}

// ─── Escritorio ──────────────────────────────────────────

function SectionTitleDesktop({
  kicker,
  titulo,
  detalle,
  aside,
}: {
  kicker: string;
  titulo: string;
  detalle?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-black/[0.06] pb-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80">
          {kicker}
          {aside}
        </p>
        <h2 className="mt-1 font-headline text-[30px] font-extrabold leading-none tracking-tight">
          {titulo}
        </h2>
      </div>
      {detalle && (
        <p className="shrink-0 pb-1 text-[12px] font-medium tabular-nums text-muted-foreground/70">
          {detalle}
        </p>
      )}
    </div>
  );
}

/** Mini tarjeta usada dentro del HeroVisual — sin interacción. */
function MiniPass({
  v,
  sellos,
  faded = false,
}: {
  v: Vendor;
  sellos: number;
  faded?: boolean;
}) {
  const color = v.theme.primaryColor;
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full opacity-[0.12] blur-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-[20px]"
          style={{ backgroundColor: `${color}18` }}
        >
          {v.emoji}
        </span>
        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground/60">
          Pase
        </span>
      </div>
      <div className={cn("mt-4", faded && "opacity-90")}>
        <p className="truncate font-headline text-[15px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {v.zona ?? rubroLabel(v)}
        </p>
      </div>
      <div className="mt-4 space-y-1.5">
        <SelloDots
          actual={Math.min(sellos, v.sellosParaPremio)}
          total={v.sellosParaPremio}
          color={color}
        />
        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {sellos}
          </span>{" "}
          de {v.sellosParaPremio}
        </p>
      </div>
    </>
  );
}

/** Pila flotante de tarjetas — apoyo visual del hero desktop. */
function HeroVisual({
  clubs,
  sellosDe,
}: {
  clubs: Vendor[];
  sellosDe: (v: Vendor) => number;
}) {
  const [front, back1, back2] = clubs;
  if (!front) return null;

  return (
    <div className="relative h-[460px] w-full select-none">
      {/* Halo ambiental */}
      <div
        aria-hidden
        className="absolute inset-6 rounded-[3rem] blur-3xl"
        style={{
          background: `radial-gradient(circle at 55% 45%, ${front.theme.primaryColor}30, transparent 65%)`,
        }}
      />

      {/* Pase trasero izquierdo */}
      {back2 && (
        <div
          className={cn(
            "absolute left-2 top-16 h-[240px] w-[260px] -rotate-[10deg] overflow-hidden rounded-[1.75rem] bg-card p-5 opacity-80",
            HAIRLINE,
            "shadow-[0_25px_55px_-25px_rgba(15,23,42,0.3)]"
          )}
        >
          <MiniPass v={back2} sellos={sellosDe(back2)} faded />
        </div>
      )}

      {/* Pase trasero derecho */}
      {back1 && (
        <div
          className={cn(
            "absolute right-2 top-8 h-[240px] w-[260px] rotate-[7deg] overflow-hidden rounded-[1.75rem] bg-card p-5 opacity-90",
            HAIRLINE,
            "shadow-[0_25px_55px_-25px_rgba(15,23,42,0.35)]"
          )}
        >
          <MiniPass v={back1} sellos={sellosDe(back1)} faded />
        </div>
      )}

      {/* Pase frontal — el destacado */}
      <div
        className={cn(
          "absolute left-1/2 top-24 h-[260px] w-[300px] -translate-x-1/2 -rotate-[2deg] overflow-hidden rounded-[1.75rem] bg-card p-6",
          HAIRLINE,
          "shadow-[0_40px_75px_-25px_rgba(15,23,42,0.4)]"
        )}
      >
        <MiniPass v={front} sellos={sellosDe(front)} />
        {/* Badge Primera Fila para reforzar la propuesta */}
        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
          <Sparkles className="h-2.5 w-2.5" />
          Primera Fila
        </span>
      </div>
    </div>
  );
}

function WalletPassDesktop({
  v,
  sellos,
  esActual,
}: {
  v: Vendor;
  sellos: number;
  esActual: boolean;
}) {
  const faltan = Math.max(0, v.sellosParaPremio - sellos);
  const color = v.theme.primaryColor;

  const inner = (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-16px_rgba(15,23,42,0.2)]",
        HAIRLINE,
        SOFT_SHADOW
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-[0.09] blur-3xl"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-[28px]"
          style={{ backgroundColor: `${color}14` }}
        >
          {v.emoji}
        </span>
        {esActual ? (
          <span className="rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-semibold text-foreground/60">
            Ver mi tarjeta
          </span>
        ) : (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>

      <div className="mt-8">
        <p className="truncate font-headline text-[19px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {v.zona ?? rubroLabel(v)}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <SelloDots
          actual={Math.min(sellos, v.sellosParaPremio)}
          total={v.sellosParaPremio}
          color={color}
        />
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {sellos}
          </span>{" "}
          de {v.sellosParaPremio}
          {faltan > 0 ? ` · te faltan ${faltan}` : " · premio listo 🎁"}
        </p>
      </div>
    </div>
  );

  return (
    <Link href={`/club/${v.slug}`} className="block cursor-pointer">
      {inner}
    </Link>
  );
}

function RutaCardDesktop({
  ruta,
  logueado,
  visitados,
  pct,
}: {
  ruta: Ruta;
  logueado: boolean;
  visitados: number;
  pct: number;
}) {
  return (
    <Link
      href={`/rutas/${ruta.id}`}
      className={cn(
        "group relative block h-full cursor-pointer overflow-hidden rounded-[2rem] bg-zinc-950 p-9 text-white transition-all duration-300",
        "ring-1 ring-white/5 hover:-translate-y-0.5 hover:ring-white/20 hover:shadow-[0_28px_60px_-18px_rgba(15,23,42,0.6)]",
        "shadow-[0_18px_50px_-16px_rgba(15,23,42,0.45)]"
      )}
    >
      {/* Halo verde-lima al fondo, insinúa progreso */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-24 h-64 w-64 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #a3e635, transparent 65%)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
          Ruta · {ruta.vendorIds.length} paradas
        </p>
        <ArrowUpRight className="h-5 w-5 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <p className="relative mt-4 font-headline text-[34px] font-extrabold leading-tight tracking-tight">
        {ruta.nombre} {ruta.emoji}
      </p>
      <p className="relative mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/60">
        {ruta.descripcion}
      </p>

      <div className="relative mt-10 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Tu avance
          </p>
          <p className="text-[13px] font-semibold tabular-nums text-white/80">
            {logueado
              ? `${visitados} / ${ruta.minLocales} paradas`
              : "Aún no comienzas"}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700"
            style={{ width: `${logueado ? pct : 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

/** Bento: tarjeta grande de Primera Fila (2 cols × 2 rows). */
function DestacadoCardBig({
  v,
  esActual,
}: {
  v: Vendor;
  esActual: boolean;
}) {
  const color = v.theme.primaryColor;
  const abierto = v.status === "funcionando";

  const inner = (
    <div
      className={cn(
        "group relative flex h-full min-h-[420px] flex-col justify-between overflow-hidden rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-0.5",
        "ring-1 ring-amber-500/30",
        "shadow-[0_25px_60px_-20px_rgba(15,23,42,0.25)]"
      )}
      style={{
        background: `linear-gradient(135deg, ${color}20 0%, ${color}08 55%, hsl(var(--card)) 100%)`,
      }}
    >
      {/* Emoji decorativo XL */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-6 select-none text-[240px] leading-none opacity-[0.08]"
      >
        {v.emoji}
      </div>
      {/* Halo del color de marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          <Sparkles className="h-3 w-3" />
          Primera Fila
        </span>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[36px] shadow-sm ring-1 ring-black/[0.05] backdrop-blur-sm">
          {v.emoji}
        </span>
      </div>

      <div className="relative mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/60">
          {rubroLabel(v)}
          {v.zona ? ` · ${v.zona}` : ""}
        </p>
        <h3 className="mt-2 font-headline text-[38px] font-black leading-[1.02] tracking-tight text-foreground xl:text-[44px]">
          {v.nombre}
        </h3>
        <p className="mt-3 max-w-[46ch] text-[14px] leading-relaxed text-foreground/70">
          {v.copy.joinDescription}
        </p>
      </div>

      <div className="relative mt-8 flex items-center justify-between gap-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold transition-colors",
            abierto
              ? "bg-foreground text-background group-hover:bg-foreground/90"
              : "bg-black/[0.06] text-muted-foreground"
          )}
        >
          {esActual ? "Entrar al club" : abierto ? "Visitar club" : "Próximamente"}
          {abierto && <ArrowUpRight className="h-4 w-4" />}
        </span>
        <span className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/50">
          {v.copy.clubName}
        </span>
      </div>
    </div>
  );

  return (
    <Link
      href={`/club/${v.slug}`}
      className="col-span-2 row-span-2 block h-full cursor-pointer"
    >
      {inner}
    </Link>
  );
}

/** Bento: tarjeta ancha de Primera Fila (2 cols × 1 row). */
function DestacadoCardSlim({
  v,
  esActual,
}: {
  v: Vendor;
  esActual: boolean;
}) {
  const color = v.theme.primaryColor;
  const abierto = v.status === "funcionando";

  const inner = (
    <div
      className={cn(
        "group relative flex h-full items-center gap-5 overflow-hidden rounded-[1.5rem] p-6 transition-all duration-300 hover:-translate-y-0.5",
        "ring-1 ring-amber-500/25",
        "shadow-[0_18px_45px_-18px_rgba(15,23,42,0.2)]"
      )}
      style={{
        background: `linear-gradient(105deg, ${color}18 0%, hsl(var(--card)) 65%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: color }}
      />
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[32px] shadow-sm ring-1 ring-black/[0.05]">
        {v.emoji}
      </span>
      <div className="relative min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
          <Sparkles className="h-2.5 w-2.5" />
          Primera Fila
        </span>
        <p className="mt-2 truncate font-headline text-[19px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {rubroLabel(v)}
          {v.zona ? ` · ${v.zona}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "relative shrink-0 rounded-full px-4 py-2 text-[12px] font-bold transition-colors",
          abierto
            ? "bg-foreground text-background group-hover:bg-foreground/90"
            : "bg-black/[0.06] text-muted-foreground"
        )}
      >
        {esActual ? "Entrar" : abierto ? "Abrir" : "Pronto"}
      </span>
    </div>
  );

  return (
    <Link
      href={`/club/${v.slug}`}
      className="col-span-2 block h-full cursor-pointer"
    >
      {inner}
    </Link>
  );
}

/** Tarjeta punteada de invitación a sumar clubes — llena hueco en la grilla. */
function AddClubCard() {
  return (
    <Link
      href="#directorio"
      className={cn(
        "group flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-black/15 bg-transparent p-6 text-center transition-colors hover:border-foreground/40 hover:bg-black/[0.02]"
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] text-[24px] transition-transform group-hover:scale-105">
        ✨
      </span>
      <div>
        <p className="font-headline text-[16px] font-extrabold leading-tight tracking-tight text-foreground">
          Suma otro club
        </p>
        <p className="mx-auto mt-1 max-w-[26ch] text-[12px] leading-relaxed text-muted-foreground">
          Descubre locales cercanos y empieza a juntar sellos en más lugares.
        </p>
      </div>
      <span className="mt-1 rounded-full bg-foreground px-4 py-1.5 text-[12px] font-bold text-background">
        Explorar directorio →
      </span>
    </Link>
  );
}

function ClubCardDesktop({
  v,
  esActual,
}: {
  v: Vendor;
  esActual: boolean;
}) {
  const abierto = v.status === "funcionando";
  const color = v.theme.primaryColor;

  const inner = (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-16px_rgba(15,23,42,0.15)]",
        !abierto && "opacity-75",
        HAIRLINE
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[26px]"
          style={{ backgroundColor: `${color}12` }}
        >
          {v.emoji}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-[12px] font-bold",
            abierto
              ? "bg-foreground text-background"
              : "bg-black/[0.04] text-muted-foreground/60 ring-1 ring-black/[0.05]"
          )}
        >
          {esActual ? "Entrar" : abierto ? "Abrir" : "Pronto"}
        </span>
      </div>
      <div className="mt-5">
        <p className="truncate font-headline text-[17px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          {rubroLabel(v)}
          {v.zona ? ` · ${v.zona}` : ""}
        </p>
      </div>
      <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
        {v.copy.joinDescription}
      </p>
    </div>
  );

  return (
    <Link
      href={`/club/${v.slug}`}
      className="block h-full cursor-pointer"
    >
      {inner}
    </Link>
  );
}

// ─── Página ──────────────────────────────────────────────

export default function ExploraPage() {
  const { usuario } = useAuth();
  const vendorActual = useVendor();
  const logueado = !!usuario;

  const [search, setSearch] = useState("");
  const [rubro, setRubro] = useState<RubroFilter>("todos");

  // Fuente de verdad: Firestore vía `useOfficialTenants`. Mientras carga la
  // primera subscripción, sostenemos la vista con el registro estático (evita
  // parpadeo). Cuando llega data live, se pisa.
  const {
    vendors: liveVendors,
    premium: livePremium,
    isMock: usaMock,
    loading: loadingLive,
  } = useOfficialTenants();

  const [clubs, setClubs] = useState<Vendor[]>(() =>
    sortClubs(Object.values(VENDORS).filter((v) => v.activo))
  );

  useEffect(() => {
    if (loadingLive) return;
    if (liveVendors.length > 0) setClubs(sortClubs(liveVendors));
  }, [liveVendors, loadingLive]);

  const showDevMock = usaMock && process.env.NODE_ENV !== "production";

  const rubros = useMemo(() => {
    const set = new Set<ProspectoRubro>();
    for (const v of clubs) if (v.rubro) set.add(v.rubro);
    return Array.from(set);
  }, [clubs]);

  const sellosDe = (v: Vendor): number => {
    const locales = usuario?.sellosLocales || {};
    if (typeof locales[v.id] === "number") return locales[v.id];
    if (usuario && v.id === vendorActual.id) return usuario.sellos || 0;
    return 0;
  };

  const misClubes = logueado
    ? clubs.filter((v) => v.id === vendorActual.id || sellosDe(v) > 0)
    : [];

  // Primera Fila: si Firestore devolvió al menos un tenant `isPremium`,
  // esos mandan; si no hay data live, usamos el heurístico estático.
  const destacados = useMemo(() => {
    if (livePremium.length > 0) return livePremium.slice(0, 3);
    return pickDestacados(clubs, 3);
  }, [livePremium, clubs]);

  // El directorio general excluye lo que ya aparece arriba (billetera + Primera Fila).
  const porDescubrir = useMemo(() => {
    const excluded = new Set<string>([
      ...misClubes.map((m) => m.id),
      ...destacados.map((d) => d.id),
    ]);
    const base = clubs.filter((v) => !excluded.has(v.id));
    const q = search.trim().toLowerCase();
    return base.filter((v) => {
      if (rubro !== "todos" && v.rubro !== rubro) return false;
      if (
        q &&
        !`${v.nombre} ${v.zona ?? ""} ${rubroLabel(v)} ${v.copy.clubName}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, misClubes, destacados, search, rubro]);

  const rutas = getRutasActivas();

  // Clubes para el hero visual — el actual al frente, dos más detrás.
  const heroClubs = useMemo(() => {
    const actual = clubs.find((v) => v.id === vendorActual.id);
    const otros = clubs.filter((v) => v.id !== vendorActual.id).slice(0, 2);
    return actual ? [actual, ...otros] : clubs.slice(0, 3);
  }, [clubs, vendorActual.id]);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          Vista móvil — se muestra hasta el breakpoint `lg`.
          ═══════════════════════════════════════════════════════════ */}
      <div className="animate-fade-up mx-auto max-w-xl space-y-10 px-4 pb-6 lg:hidden">
        <header className="pt-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            <MapPin className="h-3 w-3" />
            Viña del Mar · Ciudad Jardín
          </p>
          <h1 className="mt-2.5 font-headline text-[34px] font-black leading-[1.02] tracking-tight">
            El barrio,
            <br />
            en tu bolsillo.
          </h1>
          <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-muted-foreground">
            Una cuenta. Todos los clubes. Junta sellos, completa rutas y canjea
            donde quieras.
          </p>
          <p className="mt-4 text-[11px] font-medium tabular-nums tracking-wide text-muted-foreground/60">
            {clubs.length} clubes &nbsp;·&nbsp; {rutas.length}{" "}
            {rutas.length === 1 ? "ruta activa" : "rutas activas"}
          </p>
        </header>

        {misClubes.length > 0 && (
          <section className="space-y-4">
            <SectionTitle
              kicker="Tu billetera"
              titulo="Mis sellos"
              detalle={`${misClubes.length} ${misClubes.length === 1 ? "club" : "clubes"}`}
            />
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 pt-1">
              {misClubes.map((v) => (
                <WalletPass
                  key={v.id}
                  v={v}
                  sellos={sellosDe(v)}
                  esActual={v.id === vendorActual.id}
                />
              ))}
            </div>
          </section>
        )}

        {rutas.length > 0 && (
          <section className="space-y-4">
            <SectionTitle kicker="Juega la ciudad" titulo="Rutas" />
            {rutas.map((ruta) => {
              const visitados = logueado
                ? localesVisitados(ruta, usuario, vendorActual.id).length
                : 0;
              const pct = Math.min(
                100,
                Math.round((visitados / ruta.minLocales) * 100)
              );
              return (
                <Link
                  key={ruta.id}
                  href={`/rutas/${ruta.id}`}
                  className={cn(
                    "block overflow-hidden rounded-[1.75rem] bg-zinc-950 p-6 text-white transition-transform duration-300 active:scale-[0.99]",
                    "shadow-[0_18px_50px_-16px_rgba(15,23,42,0.45)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                      Ruta · {ruta.vendorIds.length} paradas
                    </p>
                    <ArrowUpRight className="h-4 w-4 text-white/35" />
                  </div>
                  <p className="mt-3 font-headline text-[24px] font-extrabold leading-tight tracking-tight">
                    {ruta.nombre} {ruta.emoji}
                  </p>
                  <p className="mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-white/55">
                    {ruta.descripcion}
                  </p>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700"
                        style={{ width: `${logueado ? pct : 0}%` }}
                      />
                    </div>
                    <p className="shrink-0 text-[12px] font-semibold tabular-nums text-white/70">
                      {logueado
                        ? `${visitados} / ${ruta.minLocales}`
                        : "Ver ruta"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        <section className="space-y-4">
          <SectionTitle
            kicker="El directorio"
            titulo={misClubes.length > 0 ? "Descubre" : "Los clubes"}
            detalle={`${porDescubrir.length} en la vista`}
          />

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar local, rubro o zona"
              className="w-full rounded-full border-0 bg-black/[0.04] py-3 pl-11 pr-5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:bg-black/[0.06]"
            />
          </div>

          {rubros.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              <button
                type="button"
                onClick={() => setRubro("todos")}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition-all active:scale-95",
                  rubro === "todos"
                    ? "bg-foreground text-background"
                    : "bg-black/[0.04] text-foreground/70"
                )}
              >
                Todos
              </button>
              {rubros.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRubro(rubro === r ? "todos" : r)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition-all active:scale-95",
                    rubro === r
                      ? "bg-foreground text-background"
                      : "bg-black/[0.04] text-foreground/70"
                  )}
                >
                  {RUBRO_META[r].emoji} {RUBRO_META[r].label}
                </button>
              ))}
            </div>
          )}

          {porDescubrir.length === 0 ? (
            <div className="rounded-[1.75rem] bg-black/[0.03] p-10 text-center">
              <p className="text-3xl">🕵️</p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Nada con esos filtros. Prueba con otro rubro.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-[1.75rem] bg-card px-5",
                HAIRLINE,
                SOFT_SHADOW
              )}
            >
              {porDescubrir.map((v, i) => (
                <div
                  key={v.id}
                  className={cn(i > 0 && "border-t border-black/[0.05]")}
                >
                  <ClubRow v={v} esActual={v.id === vendorActual.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionTitle
            kicker="Grandes alianzas"
            titulo="Circuitos de la región"
            detalle={`${REDES_EXTERNAS.length} redes`}
          />
          <div className="space-y-4">
            {REDES_EXTERNAS.map((red) => (
              <GranAlianzaCard key={red.id} red={red} />
            ))}
          </div>
        </section>

        {/* ── B2B — dueños de comercios ── */}
        <SumaTuLocalBanner />

        {!logueado && (
          <section className="overflow-hidden rounded-[1.75rem] bg-zinc-950 p-7 text-white shadow-[0_18px_50px_-16px_rgba(15,23,42,0.45)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              Una cuenta · todos los clubes
            </p>
            <h2 className="mt-2.5 font-headline text-[24px] font-extrabold leading-tight tracking-tight">
              Créala una vez.
              <br />
              Úsala en todo el barrio.
            </h2>
            <p className="mt-2 max-w-[34ch] text-[13px] leading-relaxed text-white/55">
              Tus sellos se guardan por club y los premios te esperan en cada
              uno.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 w-full rounded-full bg-white font-bold text-zinc-950 hover:bg-white/90"
            >
              <Link href="/unete">Únete gratis</Link>
            </Button>
          </section>
        )}

        <p className="pt-2 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground/40">
          Hecho en la Ciudad Jardín
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Vista escritorio — portal SaaS. Grids anchos, sidebar,
          hero con visual, Bento de Primera Fila.
          ═══════════════════════════════════════════════════════════ */}
      <div className="animate-fade-up mx-auto hidden max-w-7xl space-y-20 px-8 pb-12 lg:block">
        {/* ── Hero — dos columnas ── */}
        <header className="grid grid-cols-12 items-center gap-10 pt-8">
          <div className="col-span-7">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground/70">
              <MapPin className="h-3.5 w-3.5" />
              Quinta Región · Portal de fidelidad
            </p>
            <h1 className="mt-5 font-headline text-[64px] font-black leading-[0.96] tracking-tight xl:text-[76px]">
              El barrio,
              <br />
              en tu bolsillo.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
              Una cuenta para todos los clubes de la Quinta Región. Junta sellos,
              completa rutas por la ciudad y canjea premios donde quieras.
            </p>

            <div className="mt-8 flex items-center gap-10 border-t border-black/[0.06] pt-5">
              <div>
                <p className="font-headline text-[28px] font-black leading-none tabular-nums">
                  {clubs.length}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
                  Clubes
                </p>
              </div>
              <div>
                <p className="font-headline text-[28px] font-black leading-none tabular-nums">
                  {rutas.length}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
                  Rutas activas
                </p>
              </div>
              <div>
                <p className="font-headline text-[28px] font-black leading-none tabular-nums">
                  {destacados.length}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
                  Primera Fila
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full px-6 font-bold"
              >
                <Link href={logueado ? "#directorio" : "/unete"}>
                  {logueado ? "Ver directorio" : "Únete gratis"}
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-full px-6 font-bold text-foreground/70 hover:bg-black/[0.04]"
              >
                <Link href="#primera-fila">Descubre los destacados →</Link>
              </Button>
            </div>
          </div>

          <div className="col-span-5">
            <HeroVisual clubs={heroClubs} sellosDe={sellosDe} />
          </div>
        </header>

        {/* ── Mis sellos — grid ── */}
        {misClubes.length > 0 && (
          <section className="space-y-6">
            <SectionTitleDesktop
              kicker="Tu billetera"
              titulo="Mis sellos"
              detalle={`${misClubes.length} ${misClubes.length === 1 ? "club" : "clubes"}`}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {misClubes.map((v) => (
                <WalletPassDesktop
                  key={v.id}
                  v={v}
                  sellos={sellosDe(v)}
                  esActual={v.id === vendorActual.id}
                />
              ))}
              {/* Estado-vacío: rellena el hueco cuando aún hay pocos clubes */}
              {misClubes.length === 1 && <AddClubCard />}
            </div>
          </section>
        )}

        {/* ── Rutas — full width, 2 cols si hay varias ── */}
        {rutas.length > 0 && (
          <section className="space-y-6">
            <SectionTitleDesktop
              kicker="Juega la ciudad"
              titulo="Rutas activas"
              detalle={`${rutas.length} ${rutas.length === 1 ? "ruta" : "rutas"}`}
            />
            <div
              className={cn(
                "grid gap-6",
                rutas.length >= 2 && "lg:grid-cols-2"
              )}
            >
              {rutas.map((ruta) => {
                const visitados = logueado
                  ? localesVisitados(ruta, usuario, vendorActual.id).length
                  : 0;
                const pct = Math.min(
                  100,
                  Math.round((visitados / ruta.minLocales) * 100)
                );
                return (
                  <RutaCardDesktop
                    key={ruta.id}
                    ruta={ruta}
                    logueado={logueado}
                    visitados={visitados}
                    pct={pct}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ── Clubes Destacados — Bento ── */}
        {destacados.length > 0 && (
          <section id="primera-fila" className="space-y-6 scroll-mt-24">
            <SectionTitleDesktop
              kicker="Primera Fila"
              titulo="Clubes destacados"
              detalle="Recomendados en tu zona"
              aside={
                showDevMock ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 ring-1 ring-amber-200">
                    [Dev Mock]
                  </span>
                ) : null
              }
            />
            <div
              className={cn(
                "grid grid-cols-4 gap-5",
                "[grid-auto-rows:minmax(190px,1fr)]"
              )}
            >
              <DestacadoCardBig
                v={destacados[0]}
                esActual={destacados[0].id === vendorActual.id}
              />
              {destacados[1] && (
                <DestacadoCardSlim
                  v={destacados[1]}
                  esActual={destacados[1].id === vendorActual.id}
                />
              )}
              {destacados[2] && (
                <DestacadoCardSlim
                  v={destacados[2]}
                  esActual={destacados[2].id === vendorActual.id}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Directorio general — sidebar + grid ── */}
        <section id="directorio" className="space-y-6 scroll-mt-24">
          <SectionTitleDesktop
            kicker="El directorio"
            titulo="Explora todos los clubes"
            detalle={`${porDescubrir.length} resultados`}
            aside={
              showDevMock ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 ring-1 ring-amber-200">
                  [Dev Mock]
                </span>
              ) : null
            }
          />

          <div className="grid grid-cols-12 gap-8">
            <aside className="no-scrollbar col-span-3 space-y-6 self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar local o zona"
                  className="w-full rounded-full border-0 bg-black/[0.04] py-3 pl-11 pr-5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:bg-black/[0.06]"
                />
              </div>

              {rubros.length > 0 && (
                <div className="space-y-1.5">
                  <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
                    Rubro
                  </p>
                  <button
                    type="button"
                    onClick={() => setRubro("todos")}
                    className={cn(
                      "block w-full rounded-full px-4 py-2 text-left text-[13px] font-semibold transition-all",
                      rubro === "todos"
                        ? "bg-foreground text-background"
                        : "bg-black/[0.04] text-foreground/70 hover:bg-black/[0.06]"
                    )}
                  >
                    Todos
                  </button>
                  {rubros.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRubro(rubro === r ? "todos" : r)}
                      className={cn(
                        "block w-full rounded-full px-4 py-2 text-left text-[13px] font-semibold transition-all",
                        rubro === r
                          ? "bg-foreground text-background"
                          : "bg-black/[0.04] text-foreground/70 hover:bg-black/[0.06]"
                      )}
                    >
                      {RUBRO_META[r].emoji} {RUBRO_META[r].label}
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="col-span-9">
              {porDescubrir.length === 0 ? (
                <div className="rounded-[1.75rem] bg-black/[0.03] p-16 text-center">
                  <p className="text-4xl">🕵️</p>
                  <p className="mt-3 text-[14px] text-muted-foreground">
                    Nada con esos filtros. Prueba con otro rubro.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {porDescubrir.map((v) => (
                    <ClubCardDesktop
                      key={v.id}
                      v={v}
                      esActual={v.id === vendorActual.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Grandes Alianzas y Circuitos de la Región ── */}
        <section className="space-y-6">
          <SectionTitleDesktop
            kicker="Redes hermanas"
            titulo="Grandes Alianzas y Circuitos de la Región"
            detalle={`${REDES_EXTERNAS.length} redes`}
          />
          {/*
            2×2 en desktop — cada alianza mantiene protagonismo equivalente.
            Móvil = stack vertical. Cada tarjeta con min-h ≥ 320px.
          */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {REDES_EXTERNAS.map((red) => (
              <GranAlianzaCard
                key={red.id}
                red={red}
                minHeight="min-h-[320px] lg:min-h-[400px]"
              />
            ))}
          </div>
        </section>

        {/* ── B2B — dueños de comercios ── */}
        <SumaTuLocalBanner />

        {/* ── CTA final invitados ── */}
        {!logueado && (
          <section className="grid grid-cols-12 items-center gap-8 overflow-hidden rounded-[2rem] bg-zinc-950 px-10 py-12 text-white shadow-[0_18px_50px_-16px_rgba(15,23,42,0.45)]">
            <div className="col-span-12 md:col-span-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                Una cuenta · todos los clubes
              </p>
              <h2 className="mt-3 font-headline text-[36px] font-extrabold leading-tight tracking-tight">
                Créala una vez. Úsala en todo el barrio.
              </h2>
              <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
                Tus sellos se guardan por club y los premios te esperan en cada
                uno.
              </p>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Button
                asChild
                size="lg"
                className="w-full rounded-full bg-white font-bold text-zinc-950 hover:bg-white/90"
              >
                <Link href="/unete">Únete gratis</Link>
              </Button>
            </div>
          </section>
        )}

        <p className="pt-4 text-center text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground/40">
          Hecho en la Ciudad Jardín
        </p>
      </div>
    </>
  );
}
