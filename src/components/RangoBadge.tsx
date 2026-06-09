import { Badge } from "@/components/ui/badge";
import { getRango } from "@/lib/rangos";
import { cn } from "@/lib/utils";

export function RangoBadge({
  sellosHistoricos,
  className,
}: {
  sellosHistoricos: number;
  className?: string;
}) {
  const rango = getRango(sellosHistoricos);
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
