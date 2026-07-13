"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIA_META, claveStand, EXPOVINO, STANDS } from "@/lib/expovino";

// =========================================================
// Impresión de QRs por stand (solo admin/superadmin).
// La MISMA URL de cada tarjeta se graba en los chips NFC
// NTAG213 (app "NFC Tools" → Write → URL → y LOCK el chip).
// =========================================================

export default function ImpresionExpovinoPage() {
  const { usuario, loading } = useAuth();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (loading) return null;
  if (!usuario || (usuario.rol !== "admin" && usuario.rol !== "superadmin")) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Vista interna del equipo — inicia sesión como admin para imprimir los
        QRs del evento.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white p-8 text-black">
      {/* Barra de acciones — no se imprime */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-headline text-2xl font-extrabold">
            QRs por stand — {EXPOVINO.nombre}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-500">
            Imprime esta hoja (un QR por stand) y graba <b>la misma URL</b> en
            el chip NTAG213 de cada mesón con la app NFC Tools (Write → URL →
            luego <b>Lock</b> para que nadie lo reescriba).
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {STANDS.map((s) => {
          const url = `${origin}/expovino/s/${s.id}`;
          return (
            <div
              key={s.id}
              className="break-inside-avoid rounded-2xl border-2 border-black p-5 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                {CATEGORIA_META[s.categoria].emoji}{" "}
                {CATEGORIA_META[s.categoria].label}
              </p>
              <p className="mt-1 font-headline text-lg font-extrabold leading-tight">
                {s.nombre}
              </p>
              <p className="text-xs text-neutral-500">{s.origen}</p>
              <div className="mx-auto mt-4 w-fit bg-white p-2">
                {origin && <QRCode value={url} size={148} />}
              </div>
              <p className="mt-3 font-headline text-[13px] font-extrabold uppercase tracking-wide">
                Escanea y timbra tu pasaporte 🍷
              </p>
              <p className="mt-1 break-all text-[9px] text-neutral-400">
                {url}
              </p>
            </div>
          );
        })}
      </div>

      {/* Links privados por expositor — para entregar EN MANO, no pegar */}
      <div className="mt-12 break-before-page">
        <h2 className="font-headline text-xl font-extrabold">
          Links privados de expositores 🔐
        </h2>
        <p className="mt-1 max-w-xl text-sm text-neutral-500">
          Cada expositor ve sus métricas EN VIVO (visitas, nota, ranking) con
          su link privado. <b>Entregar en mano o por WhatsApp al expositor —
          no pegar en el stand.</b>
        </p>
        <div className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-300">
          {STANDS.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-lg">
                {CATEGORIA_META[s.categoria].emoji}
              </span>
              <p className="w-48 shrink-0 truncate text-sm font-bold">
                {s.nombre}
              </p>
              <p className="break-all font-mono text-[10px] text-neutral-500">
                {origin}/expovino/stand/{s.id}?clave={claveStand(s.id)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
