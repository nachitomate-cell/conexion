"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Premio } from "@/types";

interface PremioCardProps {
  premio: Premio;
  sellosActuales: number;
  onCanjear?: (premio: Premio) => void;
  loading?: boolean;
}

export function PremioCard({
  premio,
  sellosActuales,
  onCanjear,
  loading,
}: PremioCardProps) {
  const puede = sellosActuales >= premio.sellosRequeridos;
  const sinStock = premio.stock <= 0;
  const req = premio.sellosRequeridos;
  const conseguidos = Math.min(sellosActuales, req);
  const pct = Math.min(100, (sellosActuales / req) * 100);
  const esEmoji = premio.icono && premio.icono.length <= 4;
  const usarDots = req <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        sinStock && "opacity-60"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-primary/5"
      />

      <div className="relative flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-4xl">
          {esEmoji ? premio.icono : "🎁"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-bold leading-tight">
            {premio.nombre}
          </h3>
          {premio.descripcion ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {premio.descripcion}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Canjeable por {req} sellos
            </p>
          )}
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            🍣 {req} sellos
          </p>
        </div>
      </div>

      {!puede && !sinStock && (
        <div className="relative mt-4">
          {usarDots ? (
            <div className="flex items-center justify-between gap-1">
              <div className="flex flex-1 flex-wrap gap-1.5">
                {Array.from({ length: req }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-colors",
                      i < conseguidos ? "bg-primary" : "bg-primary/15"
                    )}
                  />
                ))}
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                {conseguidos}/{req}
              </span>
            </div>
          ) : (
            <>
              <Progress value={pct} className="h-2" />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Te faltan {req - sellosActuales} sellos 🥢
                </span>
                <span className="font-semibold tabular-nums text-muted-foreground">
                  {conseguidos}/{req}
                </span>
              </div>
            </>
          )}
          {usarDots && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Te faltan {req - sellosActuales} sellos 🥢
            </p>
          )}
        </div>
      )}

      <Button
        className="relative mt-3 w-full"
        variant={puede && !sinStock ? "default" : "secondary"}
        disabled={!puede || sinStock || loading}
        onClick={() => onCanjear?.(premio)}
      >
        {sinStock
          ? "Sin stock 😔"
          : puede
            ? loading
              ? "Canjeando…"
              : "Canjear premio 🎉"
            : "Sigue juntando sellos"}
      </Button>
    </motion.div>
  );
}
