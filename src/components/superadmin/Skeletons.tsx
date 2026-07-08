"use client";

import { cn } from "@/lib/utils";

/**
 * Primitivos de skeleton para el dashboard superadmin.
 * Todos usan la misma paleta glassmorphic + pulse suave para dar sensación
 * de "premium" y evitar el flash de contenido vacío entre navegaciones.
 */

export function SkeletonBar({
  className,
  width,
}: {
  className?: string;
  width?: string;
}) {
  return (
    <span
      aria-hidden
      style={width ? { width } : undefined}
      className={cn(
        "inline-block h-3 animate-pulse rounded-md bg-white/[0.06]",
        className
      )}
    />
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]",
        className
      )}
    />
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-block shrink-0 animate-pulse rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]"
    />
  );
}

/** KPI card skeleton — matches el layout de `<KpiCard>` */
export function SkeletonKpi() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl" />
      <div className="relative">
        <SkeletonAvatar size={36} />
      </div>
      <SkeletonBar className="mt-3 h-2 w-16" />
      <SkeletonBar className="mt-2 h-6 w-20" />
      <SkeletonBar className="mt-1.5 h-2 w-24" />
    </div>
  );
}

/**
 * Header skeleton compartido — kicker + título + subtítulo.
 * Usarlo arriba de cada loading para no romper el rhythm visual.
 */
export function SkeletonHeader({
  showActions = false,
}: {
  showActions?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <SkeletonBar className="h-2 w-24" />
        <SkeletonBar className="h-7 w-56 sm:w-64" />
        <SkeletonBar className="h-3 w-72 sm:w-96" />
      </div>
      {showActions && (
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <SkeletonBar className="h-9 w-32 rounded-xl" />
          <SkeletonBar className="h-9 w-40 rounded-xl" />
        </div>
      )}
    </header>
  );
}

/** Tarjeta genérica — ícono + dos líneas de texto + acción a la derecha. */
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 shadow-lg shadow-black/20 backdrop-blur-xl sm:p-4">
      <SkeletonAvatar size={40} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <SkeletonBar className="h-3 w-1/2" />
        <SkeletonBar className="h-2 w-2/3" />
      </div>
      <SkeletonBar className="h-6 w-20 rounded-full" />
    </div>
  );
}
