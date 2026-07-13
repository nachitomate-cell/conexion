"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { CATEGORIA_META, EXPOVINO, getStand } from "@/lib/expovino";
import type { EventoFeed } from "@/lib/expovino";

// =========================================================
// /expovino/pantalla — rotador para la pantalla LED.
// Uso: notebook + HDMI + Chrome en pantalla completa (F11).
// 7 escenas rotando cada 18 s; datos refrescados cada 15 s.
// Tipografía gigante y alto contraste (paneles LED de evento
// suelen tener baja densidad de píxeles).
// =========================================================

const C = EXPOVINO.colores;
const ROTACION_MS = 18_000;
const REFRESH_MS = 15_000;

interface FilaRanking {
  id: string;
  nombre: string;
  categoria: keyof typeof CATEGORIA_META;
  origen: string;
  sellos: number;
  votos: number;
  promedio: number;
}

interface DataPantalla {
  totalSellos: number;
  catadores: number;
  preinscritos: number;
  ranking: FilaRanking[];
  feed: EventoFeed[];
}

/** Marco común de cada escena: kicker arriba, firma abajo. */
function Escena({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={kicker}
      className="flex h-full flex-col items-center justify-center px-10 text-center animate-in fade-in duration-1000"
    >
      <p
        className="text-[clamp(14px,1.6vw,24px)] font-semibold uppercase tracking-[0.34em]"
        style={{ color: C.oro }}
      >
        {kicker}
      </p>
      <div className="flex w-full max-w-6xl flex-1 flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function PantallaExpovinoPage() {
  const [data, setData] = useState<DataPantalla | null>(null);
  const [escena, setEscena] = useState(0);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    let vivo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/expovino/ranking");
        const json = await res.json();
        if (vivo && res.ok) setData(json);
      } catch {
        // Mantiene la última data en pantalla.
      }
    };
    cargar();
    const t = setInterval(cargar, REFRESH_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const TOTAL_ESCENAS = 8;
  useEffect(() => {
    const t = setInterval(
      () => setEscena((e) => (e + 1) % TOTAL_ESCENAS),
      ROTACION_MS
    );
    return () => clearInterval(t);
  }, []);

  const top = useMemo(
    () => (data?.ranking ?? []).filter((r) => r.votos > 0).slice(0, 6),
    [data]
  );

  // Duelo de valles: los 2 mejores valles de viñas (promedio ponderado).
  const duelo = useMemo(() => {
    const viñas = (data?.ranking ?? []).filter(
      (r) => r.categoria === "vina" && r.votos > 0
    );
    const porValle = new Map<string, { suma: number; votos: number }>();
    for (const v of viñas) {
      const acc = porValle.get(v.origen) ?? { suma: 0, votos: 0 };
      acc.suma += v.promedio * v.votos;
      acc.votos += v.votos;
      porValle.set(v.origen, acc);
    }
    return Array.from(porValle.entries())
      .map(([valle, a]) => ({ valle, promedio: a.suma / a.votos, votos: a.votos }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 2);
  }, [data]);

  const escenas: Array<React.ReactNode> = [
    // ── 1 · Ranking en vivo ──
    <Escena key="ranking" kicker="Lo más aplaudido · en vivo 🏆">
      {top.length === 0 ? (
        <p className="text-[clamp(28px,4vw,64px)] font-black opacity-60">
          Las primeras copas se están sirviendo… 🍾
        </p>
      ) : (
        <div className="w-full space-y-4">
          {top.map((r, i) => (
            <div key={r.id} className="flex items-center gap-6">
              <span
                className="w-14 shrink-0 text-right font-headline text-[clamp(24px,3vw,48px)] font-black tabular-nums"
                style={{ color: i < 3 ? C.oro : "rgba(246,236,224,0.35)" }}
              >
                {i + 1}
              </span>
              <span className="shrink-0 text-[clamp(24px,3vw,44px)]">
                {CATEGORIA_META[r.categoria].emoji}
              </span>
              <p className="min-w-0 flex-1 truncate text-left font-headline text-[clamp(22px,2.8vw,44px)] font-extrabold">
                {r.nombre}
              </p>
              <p
                className="shrink-0 font-headline text-[clamp(24px,3vw,48px)] font-black tabular-nums"
                style={{ color: C.oro }}
              >
                {r.promedio.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Escena>,

    // ── 2 · Muro en vivo ──
    <Escena key="muro" kicker="Sucediendo ahora 📡">
      {(data?.feed ?? []).length === 0 ? (
        <p className="text-[clamp(28px,4vw,64px)] font-black opacity-60">
          Timbra un stand y aparece aquí 👀
        </p>
      ) : (
        <div className="w-full space-y-5">
          {(data?.feed ?? []).slice(0, 5).map((f, i) => {
            const stand = getStand(f.standId);
            return (
              <p
                key={`${f.at}-${i}`}
                className="text-[clamp(22px,2.6vw,42px)] font-bold animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{
                  opacity: 1 - i * 0.16,
                  color: f.tipo === "completo" ? C.oro : C.crema,
                }}
              >
                {f.tipo === "completo" ? (
                  <>🎟️ ¡{f.nombre} completó su pasaporte!</>
                ) : (
                  <>
                    {stand ? CATEGORIA_META[stand.categoria].emoji : "🍷"}{" "}
                    {f.nombre} timbró {stand?.nombre ?? "un stand"}
                  </>
                )}
              </p>
            );
          })}
        </div>
      )}
    </Escena>,

    // ── 3 · El pulso ──
    <Escena key="pulso" kicker="El pulso de la noche 📊">
      <div className="grid w-full grid-cols-2 gap-10">
        <div>
          <p
            className="font-headline text-[clamp(64px,10vw,160px)] font-black leading-none tabular-nums"
            style={{ color: C.oro }}
          >
            {(data?.totalSellos ?? 0).toLocaleString("es-CL")}
          </p>
          <p className="mt-3 text-[clamp(16px,2vw,30px)] font-bold uppercase tracking-[0.2em] opacity-70">
            Degustaciones
          </p>
        </div>
        <div>
          <p className="font-headline text-[clamp(64px,10vw,160px)] font-black leading-none tabular-nums">
            {(data?.catadores ?? 0).toLocaleString("es-CL")}
          </p>
          <p className="mt-3 text-[clamp(16px,2vw,30px)] font-bold uppercase tracking-[0.2em] opacity-70">
            Catadores con pasaporte
          </p>
        </div>
      </div>
    </Escena>,

    // ── 4 · Duelo de valles ──
    <Escena key="duelo" kicker="El duelo de valles ⚔️">
      {duelo.length < 2 ? (
        <p className="text-[clamp(28px,4vw,64px)] font-black opacity-60">
          Califica tus viñas para armar el duelo 🍇
        </p>
      ) : (
        <div className="w-full space-y-10">
          {duelo.map((d, i) => (
            <div key={d.valle} className="text-left">
              <div className="flex items-end justify-between">
                <p className="font-headline text-[clamp(28px,4vw,60px)] font-black">
                  {i === 0 ? "🥇" : "🥈"} {d.valle}
                </p>
                <p
                  className="font-headline text-[clamp(32px,4.5vw,68px)] font-black tabular-nums"
                  style={{ color: i === 0 ? C.oro : undefined }}
                >
                  {d.promedio.toFixed(2)}
                </p>
              </div>
              <div
                className="mt-3 h-4 overflow-hidden rounded-full"
                style={{ backgroundColor: "rgba(246,236,224,0.12)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(d.promedio / 5) * 100}%`,
                    background: `linear-gradient(90deg, ${C.vino}, ${C.oro})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Escena>,

    // ── 5 · CTA pasaporte ──
    <Escena key="cta" kicker="¿Aún sin pasaporte? 🎟️">
      <div className="flex items-center gap-14">
        <div className="rounded-3xl bg-white p-6">
          {origin && (
            <QRCode value={`${origin}/expovino`} size={260} />
          )}
        </div>
        <div className="max-w-xl text-left">
          <p className="font-headline text-[clamp(32px,4.5vw,68px)] font-black leading-[1.05]">
            Timbra los stands.
            <br />
            Guarda tu cava.
            <br />
            <span style={{ color: C.oro }}>Gana el sorteo.</span>
          </p>
          <p className="mt-4 text-[clamp(16px,1.8vw,26px)] opacity-70">
            Escanea, activa tu pasaporte gratis y parte 🍷
          </p>
        </div>
      </div>
    </Escena>,

    // ── 6 · Preinscritos (prueba social — sirve también en la previa) ──
    <Escena key="preinscritos" kicker="La comunidad del pasaporte 🎟️">
      <p
        className="font-headline text-[clamp(80px,13vw,220px)] font-black leading-none tabular-nums"
        style={{ color: C.oro }}
      >
        {(data?.preinscritos ?? 0).toLocaleString("es-CL")}
      </p>
      <p className="mt-4 text-[clamp(20px,2.4vw,38px)] font-bold uppercase tracking-[0.16em] opacity-80">
        ya activaron su pasaporte
      </p>
      <p className="mt-3 text-[clamp(16px,1.8vw,28px)] opacity-60">
        ¿Y tú? — expovino.synaptechspa.cl
      </p>
    </Escena>,

    // ── 7 · B2B expositores ──
    <Escena key="b2b" kicker="Para los expositores 💼">
      <div className="flex items-center gap-14">
        <div className="max-w-2xl text-left">
          <p className="font-headline text-[clamp(30px,4vw,60px)] font-black leading-[1.08]">
            Este pasaporte te está
            <br />
            generando <span style={{ color: C.oro }}>leads ahora mismo.</span>
          </p>
          <p className="mt-5 text-[clamp(16px,1.8vw,26px)] leading-relaxed opacity-75">
            Mañana recibes tu reporte: cuántos te visitaron, tu nota promedio
            y tu ranking. ¿Lo quieres para tu local todo el año?
          </p>
          <p
            className="mt-5 font-headline text-[clamp(18px,2vw,30px)] font-extrabold"
            style={{ color: C.oro }}
          >
            fideliza.synaptechspa.cl
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6">
          <QRCode value="https://fideliza.synaptechspa.cl" size={220} />
        </div>
      </div>
    </Escena>,

    // ── 7 · Marca SynapTech ──
    <Escena key="marca" kicker="La tecnología detrás de esta noche">
      <p className="font-headline text-[clamp(40px,6vw,96px)] font-black leading-[1.03]">
        Que tus clientes
        <br />
        <span
          style={{
            background: `linear-gradient(90deg, ${C.oro}, #f2d493)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          vuelvan solos.
        </span>
      </p>
      <p className="mt-6 text-[clamp(16px,1.8vw,28px)] opacity-70">
        Sellos digitales · carta QR · rutas gamificadas — Ruta BAC (27 bares) ·
        +20 barberías · Club Patio Curauma
      </p>
      <p
        className="mt-8 font-headline text-[clamp(22px,2.4vw,36px)] font-extrabold"
        style={{ color: C.oro }}
      >
        SynapTech · Viña del Mar 🇨🇱
      </p>
    </Escena>,
  ];

  return (
    <div
      className="fixed inset-0 flex cursor-none flex-col overflow-hidden"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      <div className="min-h-0 flex-1 pt-10">{escenas[escena]}</div>

      {/* Barra inferior fija: firma + indicador de escena */}
      <div className="flex items-center justify-between px-10 pb-6">
        <p className="text-[clamp(11px,1.1vw,16px)] font-semibold uppercase tracking-[0.28em] opacity-45">
          {EXPOVINO.nombre} · {EXPOVINO.edicion}
        </p>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_ESCENAS }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full transition-all duration-500"
              style={{
                backgroundColor:
                  i === escena ? C.oro : "rgba(246,236,224,0.2)",
                transform: i === escena ? "scale(1.4)" : undefined,
              }}
            />
          ))}
        </div>
        <p className="text-[clamp(11px,1.1vw,16px)] font-semibold uppercase tracking-[0.28em] opacity-45">
          Desarrollado por SynapTech
        </p>
      </div>
    </div>
  );
}
