import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRango } from "@/lib/rangos";
import { cn } from "@/lib/utils";

/**
 * Badge de rango.
 *   - `default`: pill neutro sobre fondo claro. Usado en el /home y /perfil.
 *   - `rank`   : "gamification rank" oscuro con degradado + medalla ámbar.
 *                Usado en el hero del Centro de Recompensas.
 */
export function RangoBadge({
  sellosHistoricos,
  className,
  variant = "default",
}: {
  sellosHistoricos: number;
  className?: string;
  variant?: "default" | "rank";
}) {
  const rango = getRango(sellosHistoricos);

  if (variant === "rank") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-800 to-indigo-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm ring-1 ring-white/10",
          className
        )}
      >
        <Award className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.5} />
        <span className="text-base leading-none">{rango.emoji}</span>
        <span className="tracking-tight">{rango.nombre}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
        rango.badgeClass,
        className
      )}
    >
      <span>{rango.emoji}</span>
      {rango.nombre}
    </span>
  );
}

export function SellosBadge({
  sellos,
  className,
}: {
  sellos: number;
  className?: string;
}) {
  const rango = getRango(sellos);
  return (
    <Badge
      variant={
        rango.id === "omakase"
          ? "gold"
          : rango.id === "roll_master"
            ? "accent"
            : "secondary"
      }
      className={cn("gap-1", className)}
    >
      🍣 {sellos}
    </Badge>
  );
}
