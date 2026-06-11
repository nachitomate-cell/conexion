import { cn } from "@/lib/utils";

/**
 * Marca compacta de SushiPro: cuadrado de tinta con "SP" pesado en blanco y
 * el punto lavanda de la identidad (el "O" de SUSHI PRO●).
 */
export function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl bg-foreground text-background shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="SushiPro"
    >
      <span
        className="font-headline font-extrabold leading-none"
        style={{ fontSize: size * 0.42, letterSpacing: "-0.05em" }}
      >
        SP
      </span>
      <span
        className="absolute rounded-full bg-primary"
        style={{
          width: size * 0.18,
          height: size * 0.18,
          right: size * 0.13,
          top: size * 0.14,
        }}
      />
    </span>
  );
}

/**
 * Logotipo horizontal: SUSHIPRO en mayúsculas pesadas + punto lavanda.
 * Usado en cabeceras y pantalla de bienvenida.
 */
export function Wordmark({
  className,
  dotClassName,
}: {
  className?: string;
  dotClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-headline font-extrabold uppercase tracking-tight",
        className
      )}
    >
      SUSHIPR
      <span className="relative inline-flex items-center">
        O
        <span
          className={cn(
            "ml-[0.12em] inline-block h-[0.52em] w-[0.52em] rounded-full bg-primary",
            dotClassName
          )}
        />
      </span>
    </span>
  );
}
