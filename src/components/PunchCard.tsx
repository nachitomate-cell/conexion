"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PunchCardProps {
  sellos: number;
  total?: number;
  className?: string;
}

/**
 * Tarjeta de sellos temática: fondo oscuro tipo "tela japonesa" con una barra
 * de nigiris que se va llenando de izquierda a derecha.
 */
export function PunchCard({ sellos, total = 10, className }: PunchCardProps) {
  const llenos = Math.min(sellos, total);
  const completa = llenos >= total;
  const slots = Array.from({ length: total });

  return (
    <div
      className={cn(
        "bg-nigiri-dark relative overflow-hidden rounded-2xl border border-white/10 p-5 text-white shadow-lg",
        className
      )}
    >
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Tu tarjeta
          </p>
          <p className="font-headline text-2xl font-bold">
            {llenos}
            <span className="text-white/50"> / {total}</span> sellos
          </p>
        </div>
        {completa ? (
          <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-gold-foreground">
            🏆 ¡Premio listo!
          </span>
        ) : (
          <span className="text-sm text-white/60">
            Faltan {total - llenos} 🍣
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {slots.map((_, i) => {
          const filled = i < llenos;
          return (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border text-2xl",
                filled
                  ? "border-primary/60 bg-primary/15"
                  : "border-dashed border-white/15 bg-white/5"
              )}
            >
              {filled ? (
                <motion.span
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: i * 0.03,
                  }}
                >
                  🍣
                </motion.span>
              ) : (
                <span className="text-white/15">🍣</span>
              )}
            </div>
          );
        })}
      </div>

      {/* barra de progreso de nigiris */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${(llenos / total) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
