"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Camera,
  Compass,
  Gift,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { VENDORS } from "@/lib/vendors";
import { getRutasActivas, localesVisitados } from "@/lib/rutas";
import { RangoBadge } from "@/components/RangoBadge";
import { Button } from "@/components/ui/button";
import { PORTAL_NAME } from "@/lib/portal";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/types";

// =========================================================
// / — Home global del portal ElBarrio. Sustituye a la home
// individual del tenant (esa ahora vive en `/club/[slug]`).
// Muestra al usuario un saludo, su billetera de clubes con
// sellos, rutas activas y accesos rápidos.
// =========================================================

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Tarjeta de club en la billetera — link a /club/[slug]. */
function ClubBilleteraCard({
  vendor,
  sellos,
}: {
  vendor: Vendor;
  sellos: number;
}) {
  const color = vendor.theme.primaryColor;
  const total = vendor.sellosParaPremio;
  const pct = Math.min(100, Math.round((sellos / total) * 100));
  const faltan = Math.max(0, total - sellos);
  const listo = sellos >= total;

  return (
    <Link
      href={`/club/${vendor.slug}`}
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-card p-5",
        "ring-1 ring-black/[0.06] shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-16px_rgba(15,23,42,0.18)]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full opacity-[0.10] blur-3xl"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-[24px]"
          style={{ backgroundColor: `${color}18` }}
        >
          {vendor.emoji}
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>

      <div className="mt-6">
        <p className="truncate font-headline text-[17px] font-extrabold leading-tight tracking-tight">
          {vendor.nombre}
        </p>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {vendor.zona ?? "Club adherido"}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">
            {sellos}
          </span>{" "}
          de {total}
          {listo ? " · premio listo 🎁" : ` · te faltan ${faltan}`}
        </p>
      </div>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  const cls =
    "group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md";
  const body = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-2 text-[13px] font-bold text-slate-800">{label}</p>
    </>
  );
  if (external) {
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

export default function HomePortal() {
  const { usuario } = useAuth();
  const logueado = !!usuario;

  // Billetera: todos los clubes activos donde el usuario tiene sellos.
  // Ordenados por sellos desc para que los "más calientes" queden arriba.
  const misClubes = useMemo(() => {
    if (!usuario) return [] as { vendor: Vendor; sellos: number }[];
    const map = usuario.sellosLocales || {};
    const list: { vendor: Vendor; sellos: number }[] = [];
    for (const v of Object.values(VENDORS)) {
      if (!v.activo) continue;
      const n = map[v.id] ?? 0;
      if (n > 0) list.push({ vendor: v, sellos: n });
    }
    list.sort((a, b) => b.sellos - a.sellos);
    return list;
  }, [usuario]);

  const rutas = getRutasActivas();

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 pb-8 md:px-6 lg:px-8">
      {/* ═══════════════════════════════════════════════
          Hero — saludo autenticado o pitch para invitados
          ═══════════════════════════════════════════════ */}
      {logueado ? (
        <header className="flex flex-col items-start gap-4 pt-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
              {saludo()}
            </p>
            <h1 className="mt-2 font-headline text-[32px] font-black leading-none tracking-tight md:text-[42px]">
              {usuario!.nombre.split(" ")[0]} 👋
            </h1>
            <p className="mt-3 max-w-[52ch] text-[14px] text-muted-foreground md:text-[15px]">
              {misClubes.length > 0
                ? `Tienes sellos activos en ${misClubes.length} ${
                    misClubes.length === 1 ? "club" : "clubes"
                  } del portal. Sigue juntando para desbloquear premios.`
                : "Empieza a acumular sellos escaneando el QR de cualquier club del portal."}
            </p>
          </div>
          <RangoBadge
            sellosHistoricos={usuario!.sellosHistoricos || 0}
            variant="rank"
          />
        </header>
      ) : (
        <header className="pt-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/70">
            <MapPin className="h-3.5 w-3.5" />
            Quinta Región · Portal de fidelidad
          </p>
          <h1 className="mt-3 font-headline text-[40px] font-black leading-[1.02] tracking-tight md:text-[56px]">
            {PORTAL_NAME}.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground md:text-[16px]">
            Una cuenta gratis, todos los clubes de fidelidad de la región.
            Junta sellos, canjea premios y sube de rango en cada visita.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6 font-bold">
              <Link href="/unete">Únete gratis</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-full px-6 font-bold"
            >
              <Link href="/explora">Ver directorio →</Link>
            </Button>
          </div>
        </header>
      )}

      {/* ═══════════════════════════════════════════════
          Billetera — clubes con sellos activos
          ═══════════════════════════════════════════════ */}
      {logueado && misClubes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
                Mi billetera
              </p>
              <h2 className="mt-1 font-headline text-[24px] font-black leading-none tracking-tight md:text-[30px]">
                Mis clubes activos
              </h2>
            </div>
            <Link
              href="/explora"
              className="shrink-0 text-[13px] font-semibold text-primary transition-colors hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {misClubes.map(({ vendor, sellos }) => (
              <ClubBilleteraCard key={vendor.id} vendor={vendor} sellos={sellos} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state para autenticados sin sellos aún */}
      {logueado && misClubes.length === 0 && (
        <section className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center md:p-16">
          <p className="text-5xl">🎯</p>
          <h2 className="mt-4 font-headline text-[22px] font-black tracking-tight md:text-[26px]">
            Todavía no tienes clubes activos
          </h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-relaxed text-muted-foreground">
            Explora los locales del portal y empieza a juntar sellos en
            cualquiera de ellos.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 rounded-full px-6 font-bold"
          >
            <Link href="/explora">📍 Explorar clubes</Link>
          </Button>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          Rutas activas — sigue tu progreso por la ciudad
          ═══════════════════════════════════════════════ */}
      {rutas.length > 0 && (
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
              Juega la ciudad
            </p>
            <h2 className="mt-1 font-headline text-[24px] font-black leading-none tracking-tight md:text-[30px]">
              Rutas activas
            </h2>
          </div>
          <div
            className={cn(
              "grid gap-6",
              rutas.length >= 2 && "md:grid-cols-2"
            )}
          >
            {rutas.map((ruta) => {
              const visitados = logueado
                ? localesVisitados(ruta, usuario, "").length
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
                    "group block h-full overflow-hidden rounded-3xl bg-zinc-950 p-7 text-white",
                    "ring-1 ring-white/5 transition-all hover:-translate-y-0.5 hover:ring-white/20",
                    "shadow-[0_18px_50px_-16px_rgba(15,23,42,0.45)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
                      Ruta · {ruta.vendorIds.length} paradas
                    </p>
                    <ArrowUpRight className="h-5 w-5 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 font-headline text-[26px] font-black leading-tight tracking-tight">
                    {ruta.nombre} {ruta.emoji}
                  </p>
                  <p className="mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-white/55">
                    {ruta.descripcion}
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700"
                        style={{ width: `${logueado ? pct : 0}%` }}
                      />
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-white/70">
                      {logueado
                        ? `${visitados} / ${ruta.minLocales}`
                        : "Ver ruta"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          Accesos rápidos (solo autenticado)
          ═══════════════════════════════════════════════ */}
      {logueado && (
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
              Atajos
            </p>
            <h2 className="mt-1 font-headline text-[24px] font-black leading-none tracking-tight md:text-[30px]">
              Ir a…
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <QuickAction
              href="/scan"
              icon={<Camera className="h-5 w-5" />}
              label="Escanear"
            />
            <QuickAction
              href="/premios"
              icon={<Gift className="h-5 w-5" />}
              label="Premios"
            />
            <QuickAction
              href="/explora"
              icon={<Compass className="h-5 w-5" />}
              label="Explorar"
            />
            <QuickAction
              href="/perfil"
              icon={<UserIcon className="h-5 w-5" />}
              label="Perfil"
            />
          </div>
        </section>
      )}
    </div>
  );
}
