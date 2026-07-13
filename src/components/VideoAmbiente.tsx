"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Video de ambiente reutilizable — el sistema de video de la app:
 *   · Fondo absoluto con object-cover (siempre detrás de un velo).
 *   · Carga diferida: el archivo se descarga recién al entrar en pantalla.
 *   · Se pausa fuera de vista (batería) y respeta prefers-reduced-motion
 *     (queda el poster o el fondo del contenedor).
 *   · Sin audio por contrato: los .mp4 de ambiente se comprimen con -an.
 *
 * Regla de uso: UN video por pantalla, solo en umbrales (bienvenidas,
 * celebraciones, heros) — nunca en pantallas de trabajo o listas.
 */
export function VideoAmbiente({
  src,
  poster,
  className,
  style,
}: {
  src: string;
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // se queda el poster / fondo — sin movimiento
    }
    const io = new IntersectionObserver(
      (entradas) => {
        const visible = entradas[0]?.isIntersecting;
        if (visible) {
          const s = v.querySelector("source");
          if (s && !s.src) {
            s.src = s.dataset.src || "";
            v.load();
          }
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full object-cover",
        className
      )}
      style={style}
    >
      <source data-src={src} type="video/mp4" />
    </video>
  );
}
