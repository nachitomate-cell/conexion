"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIA_META, EXPOVINO, getStand } from "@/lib/expovino";
import { cn } from "@/lib/utils";

// =========================================================
// Destino del QR / chip NFC de cada stand: timbra el
// pasaporte y pide la calificación (1-5 copas).
// =========================================================

const C = EXPOVINO.colores;

type Estado = "cargando" | "timbrado" | "repetido" | "error";

export default function StandExpovinoPage() {
  const params = useParams<{ id: string }>();
  const stand = getStand(String(params.id ?? ""));
  const { usuario, loading } = useAuth();

  const [estado, setEstado] = useState<Estado>("cargando");
  const [total, setTotal] = useState(0);
  const [enSorteo, setEnSorteo] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const escaneado = useRef(false);

  // Timbra automáticamente al llegar (una sola vez).
  useEffect(() => {
    if (!stand || !usuario || escaneado.current) return;
    escaneado.current = true;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/expovino/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken ?? ""}`,
          },
          body: JSON.stringify({ standId: stand.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
        setTotal(json.total);
        setEnSorteo(json.enSorteo);
        setEstado(json.ya ? "repetido" : "timbrado");
        const previo = usuario.expovino?.[stand.id]?.rating;
        if (typeof previo === "number") setRating(previo);
      } catch (e) {
        setErr((e as Error).message);
        setEstado("error");
      }
    })();
  }, [stand, usuario]);

  const calificar = useCallback(
    async (n: number) => {
      if (!stand) return;
      setRating(n);
      setGuardando(true);
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/expovino/rate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken ?? ""}`,
          },
          body: JSON.stringify({ standId: stand.id, rating: n }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `Error ${res.status}`);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setGuardando(false);
      }
    },
    [stand]
  );

  const shell = (children: React.ReactNode) => (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      {children}
    </div>
  );

  if (!stand) {
    return shell(
      <>
        <p className="text-5xl">🧭</p>
        <h1 className="mt-4 font-headline text-xl font-extrabold">
          Este stand no está en el pasaporte
        </h1>
        <Link
          href="/expovino"
          className="mt-6 rounded-full px-6 py-3 text-sm font-bold"
          style={{ border: `1px solid ${C.oro}`, color: C.oro }}
        >
          Volver al pasaporte
        </Link>
      </>
    );
  }

  // Invitado: primero activa el pasaporte (vuelve directo a este stand).
  if (!loading && !usuario) {
    return shell(
      <>
        <p className="text-5xl">{CATEGORIA_META[stand.categoria].emoji}</p>
        <p
          className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em]"
          style={{ color: C.oro }}
        >
          {EXPOVINO.nombre}
        </p>
        <h1 className="mt-2 font-headline text-2xl font-extrabold leading-tight">
          {stand.nombre}
        </h1>
        <p className="mt-1 text-sm opacity-60">{stand.origen}</p>
        <p className="mx-auto mt-5 max-w-[30ch] text-sm leading-relaxed opacity-80">
          Activa tu pasaporte gratis para timbrar este stand y entrar al
          sorteo de la noche 🎟️
        </p>
        <Link
          href={`/unete?next=/expovino/s/${stand.id}`}
          className="mt-6 rounded-full px-8 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
          style={{ backgroundColor: C.oro, color: C.fondo }}
        >
          Activar mi pasaporte 🍷
        </Link>
      </>
    );
  }

  if (loading || estado === "cargando") {
    return shell(
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.oro }} />
    );
  }

  if (estado === "error") {
    return shell(
      <>
        <p className="text-5xl">😵‍💫</p>
        <h1 className="mt-4 font-headline text-xl font-extrabold">
          No pudimos timbrar
        </h1>
        <p className="mt-2 text-sm opacity-70">{err}</p>
        <Link
          href="/expovino"
          className="mt-6 rounded-full px-6 py-3 text-sm font-bold"
          style={{ border: `1px solid ${C.oro}`, color: C.oro }}
        >
          Volver al pasaporte
        </Link>
      </>
    );
  }

  return shell(
    <>
      {/* El timbre */}
      <div
        className="flex h-28 w-28 -rotate-6 items-center justify-center rounded-full text-5xl animate-in zoom-in duration-500"
        style={{
          backgroundColor: `${C.vino}30`,
          boxShadow: `inset 0 0 0 3px ${C.oro}`,
        }}
      >
        {CATEGORIA_META[stand.categoria].emoji}
      </div>

      <p
        className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em]"
        style={{ color: C.oro }}
      >
        {estado === "repetido" ? "Ya estaba timbrado" : `¡Sello N° ${total}!`}
      </p>
      <h1 className="mt-2 font-headline text-[26px] font-black leading-tight">
        {stand.nombre}
      </h1>
      <p className="mt-1 text-sm opacity-60">{stand.origen}</p>

      {enSorteo && estado === "timbrado" && (
        <p
          className="mt-4 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ backgroundColor: C.oro, color: C.fondo }}
        >
          🎟️ ¡Completaste la meta — estás en el sorteo!
        </p>
      )}

      {/* Calificación en copas */}
      <div className="mt-8">
        <p className="text-sm font-semibold opacity-80">
          ¿Qué te pareció? {guardando && "…"}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => calificar(n)}
              aria-label={`${n} copas`}
              className={cn(
                "text-4xl transition-all duration-200 active:scale-90",
                rating !== null && n > rating && "opacity-25 grayscale"
              )}
            >
              🍷
            </button>
          ))}
        </div>
        {rating !== null && (
          <p className="mt-2 text-[12px] opacity-60">
            {rating} de 5 copas — puedes cambiarla cuando quieras
          </p>
        )}
      </div>

      <Link
        href="/expovino"
        className="mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
        style={{ backgroundColor: C.oro, color: C.fondo }}
      >
        <ArrowLeft className="h-4 w-4" />
        Seguir la ruta
      </Link>
    </>
  );
}
