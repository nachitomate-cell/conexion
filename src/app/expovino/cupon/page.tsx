"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CUPON, EXPOVINO } from "@/lib/expovino";

// =========================================================
// Cupón post-pasaporte: 2x1 en Corazón Continto (el bar de
// los organizadores) — tráfico post-evento para ellos, y la
// demostración en carne propia de la mecánica evento→local.
// Se canjea mostrando esta pantalla en la barra.
// =========================================================

const C = EXPOVINO.colores;

export default function CuponExpovinoPage() {
  const { usuario, loading } = useAuth();
  const sellos = Object.keys(usuario?.expovino || {}).length;
  const gano = sellos >= EXPOVINO.metaSorteo;

  if (loading) return null;

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      {!usuario || !gano ? (
        <>
          <p className="text-5xl">🔒</p>
          <h1 className="mt-4 font-headline text-xl font-extrabold">
            Este cupón se gana timbrando
          </h1>
          <p className="mx-auto mt-2 max-w-[30ch] text-sm opacity-70">
            Completa {EXPOVINO.metaSorteo} stands en tu pasaporte y esta
            pantalla se convierte en tu premio.
          </p>
          <Link
            href="/expovino"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-headline text-sm font-extrabold"
            style={{ backgroundColor: C.oro, color: C.fondo }}
          >
            <ArrowLeft className="h-4 w-4" />
            Ir a mi pasaporte
          </Link>
        </>
      ) : (
        <>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: C.oro }}
          >
            Pasaporte completo · premio desbloqueado
          </p>

          {/* El cupón — estilo ticket con borde punteado dorado */}
          <div
            className="mt-6 w-full max-w-sm rounded-[2rem] p-8"
            style={{
              backgroundColor: C.carta,
              border: `2px dashed ${C.oro}`,
              boxShadow: "0 24px 70px -24px rgba(0,0,0,.7)",
            }}
          >
            <p className="text-6xl">{CUPON.emoji}</p>
            <h1
              className="mt-4 font-headline text-[28px] font-black leading-tight"
              style={{ color: C.oro }}
            >
              {CUPON.titulo}
            </h1>
            <p className="mt-3 text-sm leading-relaxed opacity-80">
              {CUPON.detalle}
            </p>
            <div
              className="my-5 h-px w-full"
              style={{ backgroundColor: "rgba(246,236,224,0.15)" }}
            />
            <p className="text-[12px] opacity-70">📍 {CUPON.lugar}</p>
            <p className="mt-1.5 text-[11px] opacity-50">{CUPON.vigencia}</p>
            <p
              className="mt-4 rounded-full px-3 py-2 font-mono text-[13px] font-bold tracking-[0.2em]"
              style={{ backgroundColor: "rgba(217,164,65,0.12)", color: C.oro }}
            >
              {usuario.uid.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <p className="mt-5 max-w-[32ch] text-[12px] opacity-60">
            Muestra esta pantalla en la barra. El código es único de tu
            pasaporte.
          </p>

          <Link
            href="/expovino"
            className="mt-6 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider opacity-60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al pasaporte
          </Link>
        </>
      )}
    </div>
  );
}
