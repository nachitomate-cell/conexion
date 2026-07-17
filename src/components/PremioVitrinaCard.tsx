"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Gift, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Premio } from "@/types";

// =========================================================
// PremioVitrinaCard — variante gamificada usada en la grilla
// del "Centro de Recompensas" (/premios). Comportamiento
// visual doble: bloqueado (locked) vs. canjeable (unlocked).
//
// Estructura estricta con `justify-between h-full` para que
// todos los botones de la fila queden alineados aunque los
// títulos/descripciones tengan largos distintos.
// =========================================================

interface Props {
  premio: Premio;
  sellosActuales: number;
  /** Club dueño del premio — se pinta en el badge superior. */
  vendorNombre?: string;
  /** Zona/barrio del club — subtítulo del badge (opcional). */
  vendorZona?: string;
  /** Emoji del club para el chip del badge (fallback 🎁). */
  vendorEmoji?: string;
  /** Color de marca del club — tinta el chip del badge. */
  vendorColor?: string;
  /**
   * URL del home del local — destino del nudge "Ver local →"
   * que aparece bajo el botón bloqueado. Por defecto la home
   * del tenant actual (`/`).
   */
  verLocalUrl?: string;
  onCanjear?: (premio: Premio) => void;
  loading?: boolean;
}

/** Emoji del badge de precio — corona para premios de valor alto. */
function precioEmoji(sellos: number): string {
  return sellos >= 10 ? "👑" : "⭐";
}

export function PremioVitrinaCard({
  premio,
  sellosActuales,
  vendorNombre,
  vendorZona,
  vendorEmoji,
  vendorColor,
  verLocalUrl = "/",
  onCanjear,
  loading,
}: Props) {
  const req = premio.sellosRequeridos;
  const conseguidos = Math.min(sellosActuales, req);
  const pct = Math.max(0, Math.min(100, (sellosActuales / req) * 100));
  const faltan = Math.max(0, req - sellosActuales);
  const puede = sellosActuales >= req;
  const sinStock = premio.stock <= 0;
  const canjeable = puede && !sinStock;
  const bloqueado = !puede && !sinStock;
  const esEmoji = premio.icono && premio.icono.length <= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 transition-all duration-300",
        canjeable
          ? "border-2 border-emerald-500 shadow-[0_10px_35px_-8px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-8px_rgba(16,185,129,0.45)]"
          : "border border-slate-200 shadow-[0_10px_40px_-16px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-16px_rgba(15,23,42,0.18)]",
        sinStock && "opacity-60"
      )}
    >
      {/* ── Bloque superior: club, precio, icono, título, progreso ── */}
      <div>
        {/* Row 1: badge de club + badge de precio */}
        <div className="flex items-center gap-2">
          {vendorNombre && (
            <>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]"
                style={{
                  backgroundColor: vendorColor
                    ? `${vendorColor}20`
                    : "rgb(241 245 249)",
                }}
              >
                {vendorEmoji ?? "🎁"}
              </span>
              <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {vendorNombre}
                {vendorZona ? ` · ${vendorZona}` : ""}
              </span>
            </>
          )}
          {/* Badge de precio — siempre visible, indica costo del canje */}
          <span
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              "border-amber-200 bg-amber-50 text-amber-800"
            )}
            aria-label={`${req} sellos requeridos`}
          >
            <span aria-hidden>{precioEmoji(req)}</span>
            <span className="tabular-nums">{req}</span>
            <span>Sellos</span>
          </span>
        </div>

        {/* Row 2: icono + título + descripción */}
        <div className="mt-4 flex items-start gap-4">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[32px] transition-transform group-hover:scale-105",
              canjeable
                ? "bg-emerald-50 ring-1 ring-emerald-200"
                : "bg-slate-50 ring-1 ring-slate-100"
            )}
          >
            {esEmoji ? (
              premio.icono
            ) : (
              <Gift className="h-8 w-8 text-slate-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-headline text-[18px] font-black leading-tight tracking-tight text-slate-900">
              {premio.nombre}
            </h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
              {premio.descripcion || `Canjeable por ${req} sellos`}
            </p>
          </div>
        </div>

        {/* Row 3: progreso lineal */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-700">
              <span className="tabular-nums">{conseguidos}</span>
              <span className="text-slate-400"> de {req} sellos</span>
            </p>
            <p
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                canjeable ? "text-emerald-600" : "text-slate-500"
              )}
            >
              {canjeable ? "¡Listo para canjear!" : `Te faltan ${faltan}`}
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                canjeable
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-indigo-400 to-violet-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Bloque inferior: SOLO el CTA (alineación uniforme entre cards) ── */}
      <div className="mt-6">
        {sinStock ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-xl bg-slate-100 py-3 text-[13px] font-medium text-slate-400"
          >
            Sin stock por ahora
          </button>
        ) : canjeable ? (
          <button
            type="button"
            disabled={loading || !onCanjear}
            onClick={() => onCanjear?.(premio)}
            className={cn(
              "w-full rounded-xl bg-emerald-600 py-3 text-[14px] font-bold text-white shadow-lg transition-all",
              "hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-emerald-500/40",
              "disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
            )}
          >
            {loading ? "Canjeando…" : "🎁 Canjear Premio Ahora"}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-[13px] font-medium text-slate-500"
            >
              <Lock className="h-3.5 w-3.5" />
              Sigue juntando sellos
            </button>
            {/*
              Nudge para tráfico físico — invita al usuario a visitar el
              local para completar los sellos que le faltan. Sólo aparece
              en el estado bloqueado (no cuando está listo ni sin stock).
            */}
            {bloqueado && (
              <Link
                href={verLocalUrl}
                className="mt-2 block cursor-pointer text-center text-xs font-medium text-indigo-600 transition-all hover:text-indigo-800 hover:underline"
              >
                📍 ¿Cómo sumar sellos en este club? Ver local →
              </Link>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
