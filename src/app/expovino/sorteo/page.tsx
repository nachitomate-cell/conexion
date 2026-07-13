"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { VideoAmbiente } from "@/components/VideoAmbiente";
import { EXPOVINO } from "@/lib/expovino";

// =========================================================
// Sorteo en vivo — pantalla del escenario (solo admin).
// Botón gigante → redoble de 3 segundos → reveal del ganador.
// =========================================================

const C = EXPOVINO.colores;
const EMOJIS_REDOBLE = ["🍷", "🍾", "🥂", "🍇", "🎟️", "✨"];

type Fase = "listo" | "redoble" | "ganador";

export default function SorteoExpovinoPage() {
  const { usuario, loading } = useAuth();
  const [elegibles, setElegibles] = useState<number | null>(null);
  const [ganadores, setGanadores] = useState<Array<{ nombre: string }>>([]);
  const [fase, setFase] = useState<Fase>("listo");
  const [emoji, setEmoji] = useState("🍷");
  const [ganador, setGanador] = useState<{ nombre: string; sellos: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const esAdmin =
    usuario && (usuario.rol === "admin" || usuario.rol === "superadmin");

  const cargarEstado = useCallback(async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/expovino/sorteo", {
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = await res.json();
      if (res.ok) {
        setElegibles(json.elegibles);
        setGanadores(json.ganadores ?? []);
      }
    } catch {
      // Silencioso — la pantalla se usa con el operador al lado.
    }
  }, []);

  useEffect(() => {
    if (esAdmin) cargarEstado();
  }, [esAdmin, cargarEstado]);

  // Redoble: rota emojis rápido durante la suspensión.
  useEffect(() => {
    if (fase !== "redoble") return;
    const t = setInterval(
      () =>
        setEmoji(
          EMOJIS_REDOBLE[Math.floor(Math.random() * EMOJIS_REDOBLE.length)]
        ),
      120
    );
    return () => clearInterval(t);
  }, [fase]);

  const sortear = useCallback(async () => {
    setErr(null);
    setFase("redoble");
    const inicio = Date.now();
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/expovino/sorteo", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = await res.json();
      // Suspenso mínimo de 3 s aunque el API responda antes.
      const falta = Math.max(0, 3000 - (Date.now() - inicio));
      await new Promise((r) => setTimeout(r, falta));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setGanador(json.ganador);
      setElegibles(json.elegibles);
      setFase("ganador");
      cargarEstado();
    } catch (e) {
      setErr((e as Error).message);
      setFase("listo");
    }
  }, [cargarEstado]);

  if (loading) return null;
  if (!esAdmin) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center p-8 text-center text-sm"
        style={{ backgroundColor: C.fondo, color: C.crema }}
      >
        Pantalla del escenario — solo el equipo puede operarla.
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10 text-center"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      {/* Lluvia dorada de fondo en el momento del ganador */}
      {fase === "ganador" && (
        <>
          <VideoAmbiente src="/expovino-sorteo.mp4" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-[#2a0a14]/50 via-[#2a0a14]/30 to-[#2a0a14]/70"
          />
        </>
      )}
      <p
        className="relative text-[12px] font-semibold uppercase tracking-[0.34em]"
        style={{ color: C.oro }}
      >
        {EXPOVINO.nombre} · Sorteo en vivo
      </p>

      {fase === "listo" && (
        <>
          <h1 className="mt-6 font-headline text-[clamp(36px,7vw,72px)] font-black leading-[1.02]">
            {elegibles === null ? "…" : elegibles}
            <span className="block text-[clamp(16px,2.5vw,24px)] font-bold opacity-60">
              pasaportes completos en juego 🎟️
            </span>
          </h1>
          {ganadores.length > 0 && (
            <p className="mt-4 text-sm opacity-60">
              Ganadores de la noche:{" "}
              {ganadores.map((g) => g.nombre).join(" · ")}
            </p>
          )}
          {err && (
            <p
              className="mt-4 rounded-full px-4 py-2 text-sm"
              style={{ backgroundColor: "rgba(217,164,65,0.15)", color: C.oro }}
            >
              {err}
            </p>
          )}
          <button
            type="button"
            onClick={sortear}
            className="mt-10 rounded-full px-14 py-6 font-headline text-2xl font-black transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: C.oro,
              color: C.fondo,
              boxShadow: `0 20px 60px -15px ${C.oro}90`,
            }}
          >
            SORTEAR 🍾
          </button>
        </>
      )}

      {fase === "redoble" && (
        <div className="mt-10 animate-pulse">
          <p className="text-[100px] leading-none">{emoji}</p>
          <p className="mt-6 font-headline text-2xl font-black tracking-wide opacity-80">
            Girando la copa…
          </p>
        </div>
      )}

      {fase === "ganador" && ganador && (
        <div className="relative animate-in zoom-in fade-in duration-700">
          <p className="mt-8 text-[80px] leading-none">🏆</p>
          <h1
            className="mt-4 font-headline text-[clamp(40px,8vw,88px)] font-black leading-[1.02]"
            style={{ color: C.oro }}
          >
            {ganador.nombre}
          </h1>
          <p className="mt-3 text-lg opacity-70">
            {ganador.sellos} stands timbrados esta noche 🍷
          </p>
          <button
            type="button"
            onClick={() => {
              setGanador(null);
              setFase("listo");
            }}
            className="mt-10 rounded-full px-8 py-3.5 font-headline text-sm font-extrabold"
            style={{ border: `1.5px solid ${C.oro}`, color: C.oro }}
          >
            Sortear otro premio
          </button>
        </div>
      )}

      <p className="relative mt-12 text-[10px] uppercase tracking-[0.24em] opacity-40">
        Desarrollado por SynapTech
      </p>
    </div>
  );
}
