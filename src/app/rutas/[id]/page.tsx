"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVendor } from "@/context/VendorContext";
import { VENDORS } from "@/lib/vendors";
import {
  getRuta,
  localesVisitados,
  sellosEnLocal,
  vendorHomeUrl,
} from "@/lib/rutas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Vendor } from "@/types";

// =========================================================
// Detalle de una ruta — el "pasaporte" del marketplace.
// Diseño: pase negro premium + álbum de timbres estilo
// pasaporte real (timbre entintado al visitar, pozo vacío
// punteado cuando falta). Mecánica portada de la Ruta BAC.
// =========================================================

const SOFT_SHADOW = "shadow-[0_10px_40px_-12px_rgba(15,23,42,0.12)]";
const HAIRLINE = "ring-1 ring-black/[0.06]";

/** Casilla del pasaporte: timbre entintado o pozo vacío. */
function StampWell({
  v,
  visitado,
  esActual,
}: {
  v: Vendor;
  visitado: boolean;
  esActual: boolean;
}) {
  const color = v.theme.primaryColor;

  const inner = (
    <div
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-2.5 rounded-[1.5rem] p-4 text-center transition-transform duration-300 active:scale-[0.97]",
        visitado
          ? cn("bg-card", HAIRLINE, SOFT_SHADOW)
          : "border-2 border-dashed border-black/[0.08] bg-black/[0.02]"
      )}
    >
      {/* El timbre — anillo entintado, levemente girado, como pasaporte real */}
      <span
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full text-[26px] transition-all duration-500",
          visitado ? "-rotate-6" : "opacity-45 grayscale"
        )}
        style={
          visitado
            ? {
                backgroundColor: `${color}10`,
                boxShadow: `inset 0 0 0 2px ${color}55`,
              }
            : { backgroundColor: "rgba(0,0,0,0.04)" }
        }
      >
        {v.emoji}
        {visitado && (
          <span
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-card"
            style={{ backgroundColor: color }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
          </span>
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate font-headline text-[13px] font-extrabold leading-tight tracking-tight">
          {v.nombre}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
            visitado ? "text-muted-foreground/70" : "text-muted-foreground/50"
          )}
        >
          {visitado ? "Timbrado" : esActual ? "Estás aquí" : "Por visitar"}
        </p>
      </div>

      {!visitado && !esActual && (
        <ArrowUpRight className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-muted-foreground/40" />
      )}
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

export default function RutaDetallePage() {
  const params = useParams<{ id: string }>();
  const ruta = getRuta(String(params.id ?? ""));
  const { usuario } = useAuth();
  const vendorActual = useVendor();

  // Vendors de la ruta: estático al instante + overlay del API.
  const [catalogo, setCatalogo] = useState<Record<string, Vendor>>(() => ({
    ...VENDORS,
  }));
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/vendors");
        const json = (await res.json()) as { vendors?: Vendor[] };
        if (!cancel && res.ok && json.vendors) {
          setCatalogo((prev) => {
            const next = { ...prev };
            for (const v of json.vendors!) next[v.id] = v;
            return next;
          });
        }
      } catch {
        // Fallback estático ya cargado.
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const locales = useMemo(
    () =>
      (ruta?.vendorIds ?? [])
        .map((id) => catalogo[id])
        .filter((v): v is Vendor => !!v),
    [ruta, catalogo]
  );

  if (!ruta || !ruta.activa) {
    return (
      <div className="animate-fade-up space-y-5 py-16 text-center">
        <p className="text-5xl">🧭</p>
        <h1 className="font-headline text-xl font-extrabold tracking-tight">
          Esta ruta no existe (o ya terminó)
        </h1>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/explora">Volver a Explora</Link>
        </Button>
      </div>
    );
  }

  const visitados = localesVisitados(ruta, usuario, vendorActual.id);
  const progreso = Math.min(visitados.length, ruta.minLocales);
  const completa = visitados.length >= ruta.minLocales;
  const pct = Math.round((progreso / ruta.minLocales) * 100);

  return (
    <div className="animate-fade-up space-y-8 pb-6">
      <Link
        href="/explora"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Explora
      </Link>

      {/* ── El pase — hero negro premium ── */}
      <header className="relative overflow-hidden rounded-[2rem] bg-zinc-950 p-7 text-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.55)]">
        {/* Mapa ilustrado del barrio — textura sutil del pase */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rutas/mapa-ruta.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45">
          Ruta · Viña del Mar
        </p>
        <h1 className="mt-2.5 font-headline text-[30px] font-black leading-[1.05] tracking-tight">
          {ruta.nombre} {ruta.emoji}
        </h1>
        <p className="mt-2.5 max-w-[36ch] text-[13px] leading-relaxed text-white/55">
          {ruta.descripcion}
        </p>
        {ruta.patrocinador && (
          <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
            Presentada por {ruta.patrocinador}
          </p>
        )}

        {/* Progreso — contador grande + línea fina */}
        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-headline text-[34px] font-black leading-none tabular-nums tracking-tight">
              {usuario ? progreso : "—"}
              <span className="text-[18px] font-bold text-white/40">
                {" "}
                / {ruta.minLocales}
              </span>
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {usuario ? "Locales timbrados" : "Únete para partir"}
            </p>
          </div>
          <p className="pb-1 text-[12px] font-semibold tabular-nums text-white/60">
            {usuario ? `${pct}%` : ""}
          </p>
        </div>
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700"
            style={{ width: `${usuario ? pct : 0}%` }}
          />
        </div>
      </header>

      {/* ── Premio / estado ── */}
      {completa ? (
        <section
          className={cn(
            "flex items-center gap-4 rounded-[1.75rem] bg-card p-5",
            "ring-1 ring-amber-300/60",
            SOFT_SHADOW
          )}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[24px]">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-[15px] font-extrabold tracking-tight">
              Ruta completa
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {ruta.premioTexto}. Muestra esta pantalla en caja.
            </p>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            "flex items-center gap-4 rounded-[1.75rem] bg-card p-5",
            HAIRLINE
          )}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[22px]">
            🏆
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              El premio
            </p>
            <p className="mt-0.5 text-[13px] font-semibold leading-snug">
              {ruta.premioTexto}
            </p>
          </div>
        </section>
      )}

      {/* ── El pasaporte ── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
              Tu pasaporte
            </p>
            <h2 className="mt-0.5 font-headline text-[22px] font-extrabold leading-none tracking-tight">
              Los timbres
            </h2>
          </div>
          <p className="shrink-0 pb-0.5 text-[11px] font-medium tabular-nums text-muted-foreground/70">
            {ruta.minLocales} de {ruta.vendorIds.length} para ganar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {locales.map((v) => (
            <StampWell
              key={v.id}
              v={v}
              visitado={sellosEnLocal(usuario, v.id, vendorActual.id) > 0}
              esActual={v.id === vendorActual.id}
            />
          ))}
        </div>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/60">
          Un sello en el local timbra la casilla.
        </p>
      </section>

      {/* CTA invitado */}
      {!usuario && (
        <Button
          asChild
          size="lg"
          className="w-full rounded-full bg-zinc-950 font-bold text-white hover:bg-zinc-800"
        >
          <Link href="/unete">Únete gratis y parte la ruta</Link>
        </Button>
      )}
    </div>
  );
}
