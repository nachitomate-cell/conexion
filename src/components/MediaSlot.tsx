"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Espacio para una imagen (promo, plato, banner). Si hay `src` muestra la
 * imagen; si falta o falla, cae a un placeholder elegante listo para reemplazar.
 * Pensado para usarse dentro de un contenedor con posición/tamaño definido.
 */
export function MediaSlot({
  src,
  alt = "",
  label = "Imagen",
  className,
  priority,
}: {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  const [error, setError] = useState(false);
  const mostrar = src && !error;

  return (
    <div className={cn("absolute inset-0", className)}>
      {mostrar ? (
        <Image
          src={src!}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-secondary via-muted to-secondary text-muted-foreground">
          <span className="text-2xl opacity-60">📷</span>
          <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
