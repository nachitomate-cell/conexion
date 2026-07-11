"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import { VENDORS } from "@/lib/vendors";
import { RUBRO_META } from "@/lib/mercadoVina";
import {
  getRutasActivas,
  localesVisitados,
  REDES_EXTERNAS,
  vendorHomeUrl,
} from "@/lib/rutas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProspectoRubro, Vendor } from "@/types";

// =========================================================
// Explora — marketplace de sellos de Viña del Mar.
// Diseño: editorial limpio (aire, hairlines, tipografía
// grande), billetera estilo Apple Wallet, pase oscuro para
// las rutas y pills tipo App Store en el directorio.
// =========================================================

type RubroFilter = "todos" | ProspectoRubro;

/** Sombra difusa suave — el "levitar" sutil de las tarjetas. */
const SOFT_SHADOW = "shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)]";
/** Hairline al estilo iOS. */
const HAIRLINE = "ring-1 ring-black/[0.06]";

function rubroLabel(v: Vendor): string {
  return v.rubro ? RUBRO_META[v.rubro].label : "Local";
}

/** Los "funcionando" primero; después alfabético. */
function sortClubs(list: Vendor[]): Vendor[] {
  return [...list].sort(
    (a, b) =>
      (a.status === "funcionando" ? 0 : 1) -
        (b.status === "funcionando" ? 0 : 1) ||
      a.nombre.localeCompare(b.nombre, "es")
  );
}

/** Encabezado de sección — kicker en versalitas + título editorial. */
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

/** Puntos de progreso — finos, con el color del local. */
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

/** Pase de la billetera — tarjeta estilo Apple Wallet. */
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
      {/* Lavado de color del local — apenas presente */}
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
            Estás aquí
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

  return esActual ? (
    <Link href="/" className="block shrink-0">
      {inner}
    </Link>
  ) : (
    <a href={vendorHomeUrl(v)} className="block shrink-0">
      {inner}
    </a>
  );
}

/** Fila del directorio — estilo lista del App Store con pill "Abrir". */
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
      {esActual ? "Aquí" : abierto ? "Abrir" : "Pronto"}
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

  if (esActual) {
    return (
      <Link href="/" className="block">
        {inner}
      </Link>
    );
  }
  return (
    <a href={vendorHomeUrl(v)} className="block">
      {inner}
    </a>
  );
}

export default function ExploraPage() {
  const { usuario } = useAuth();
  const vendorActual = useVendor();
  const logueado = !!usuario;

  const [search, setSearch] = useState("");
  const [rubro, setRubro] = useState<RubroFilter>("todos");

  // Directorio: registro estático al instante + overlay Firestore vía API.
  const [clubs, setClubs] = useState<Vendor[]>(() =>
    sortClubs(Object.values(VENDORS).filter((v) => v.activo))
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/vendors");
        const json = (await res.json()) as { vendors?: Vendor[] };
        if (!cancel && res.ok && (json.vendors?.length ?? 0) > 0) {
          setClubs(sortClubs(json.vendors!));
        }
      } catch {
        // Fallback estático ya visible.
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

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

  const porDescubrir = useMemo(() => {
    const base = clubs.filter((v) => !misClubes.some((m) => m.id === v.id));
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
  }, [clubs, misClubes, search, rubro]);

  const rutas = getRutasActivas();

  return (
    <div className="animate-fade-up space-y-10 pb-6">
      {/* ── Masthead editorial ── */}
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

      {/* ── Billetera — pases estilo Apple Wallet ── */}
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

      {/* ── Rutas — pase negro premium ── */}
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

      {/* ── Directorio ── */}
      <section className="space-y-4">
        <SectionTitle
          kicker="El directorio"
          titulo={misClubes.length > 0 ? "Descubre" : "Los clubes"}
          detalle={`${porDescubrir.length} en la vista`}
        />

        {/* Búsqueda estilo iOS */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar local, rubro o zona"
            className="w-full rounded-full border-0 bg-black/[0.04] py-3 pl-11 pr-5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:bg-black/[0.06]"
          />
        </div>

        {/* Filtros — pills con pill activa en tinta */}
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

        {/* Lista — filas hairline */}
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

      {/* ── Otras redes — filas discretas ── */}
      <section className="space-y-4">
        <SectionTitle kicker="Más allá del barrio" titulo="Otras redes" />
        <div className={cn("rounded-[1.75rem] bg-card px-5", HAIRLINE)}>
          {REDES_EXTERNAS.map((red, i) => (
            <a
              key={red.id}
              href={red.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-4 py-4",
                i > 0 && "border-t border-black/[0.05]"
              )}
            >
              <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[20px]">
                {red.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-headline text-[14px] font-extrabold tracking-tight">
                  {red.nombre}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                  {red.descripcion}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            </a>
          ))}
        </div>
      </section>

      {/* ── CTA invitados — pase negro final ── */}
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
  );
}
