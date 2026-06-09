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
  const pct = Math.min(100, (sellosActuales / premio.sellosRequeridos) * 100);
  const esEmoji = premio.icono && premio.icono.length <= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm",
        sinStock && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-4xl">
          {esEmoji ? premio.icono : "🎁"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-bold leading-tight">
            {premio.nombre}
          </h3>
          {premio.descripcion && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {premio.descripcion}
            </p>
          )}
          <p className="mt-1 text-sm font-semibold text-primary">
            🍣 {premio.sellosRequeridos} sellos
          </p>
        </div>
      </div>

      {!puede && !sinStock && (
        <div className="mt-3">
          <Progress value={pct} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            Te faltan {premio.sellosRequeridos - sellosActuales} sellos 🥢
          </p>
        </div>
      )}

      <Button
        className="mt-3 w-full"
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
