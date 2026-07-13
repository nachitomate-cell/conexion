"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Check,
  Loader2,
  MapPin,
  Share2,
  Ticket,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  CATEGORIA_META,
  CUPON,
  EXPOVINO,
  MISIONES,
  PROGRAMA,
  STANDS,
  standsPorCategoria,
  standsTimbrados,
  type SelloExpovino,
} from "@/lib/expovino";
import { cn } from "@/lib/utils";

// =========================================================
// Pasaporte ExpoVino — vista exclusiva del evento.
// Antes del 1 de agosto corre en MODO PREVIA: countdown,
// preinscripción (la data que ve crecer el organizador al
// publicar el link en RRSS) y share. El día del evento la
// misma URL se convierte sola en el pasaporte.
// Overrides para demos: ?modo=evento / ?modo=previa
// =========================================================

const C = EXPOVINO.colores;

function copas(n: number): string {
  return "🍷".repeat(Math.max(0, Math.round(n)));
}

/** Cuenta regresiva al evento — se refresca cada 30 s. */
function Countdown() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, EXPOVINO.inicioMs - ahora);
  const dias = Math.floor(diff / 86_400_000);
  const horas = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const bloques = [
    { v: dias, l: "días" },
    { v: horas, l: "hrs" },
    { v: mins, l: "min" },
  ];
  return (
    <div className="flex items-stretch justify-center gap-2.5">
      {bloques.map((b) => (
        <div
          key={b.l}
          className="min-w-[76px] rounded-2xl px-4 py-3"
          style={{ backgroundColor: "rgba(246,236,224,0.07)" }}
        >
          <p className="font-headline text-[30px] font-black leading-none tabular-nums">
            {String(b.v).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-55">
            {b.l}
          </p>
        </div>
      ))}
    </div>
  );
}

function ExpovinoInner() {
  const params = useSearchParams();
  const { usuario } = useAuth();

  // Modo: por fecha, con override para demos (?modo=evento|previa).
  const modo = params.get("modo");
  const preEvento =
    modo === "previa" || (modo !== "evento" && Date.now() < EXPOVINO.inicioMs);

  const pasaporte: Record<string, SelloExpovino> = usuario?.expovino || {};
  const sellos = Object.keys(pasaporte).length;
  const enSorteo = sellos >= EXPOVINO.metaSorteo;
  const pct = Math.min(100, Math.round((sellos / EXPOVINO.metaSorteo) * 100));

  // ── Preinscripción ──
  const [preinscritos, setPreinscritos] = useState<number | null>(null);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [errPre, setErrPre] = useState<string | null>(null);
  const preinscrito = !!usuario?.expovinoPreinscrito;

  useEffect(() => {
    if (!preEvento) return;
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/expovino/ranking");
        const json = await res.json();
        if (!cancel && res.ok) setPreinscritos(json.preinscritos ?? 0);
      } catch {
        // El contador es decorativo — silencioso.
      }
    })();
    return () => {
      cancel = true;
    };
  }, [preEvento]);

  const preinscribir = useCallback(async () => {
    setInscribiendo(true);
    setErrPre(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/expovino/preinscribir", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken ?? ""}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setPreinscritos((n) => (n === null ? n : n + (json.ya ? 0 : 1)));
      // El doc de usuario se refresca solo (onSnapshot del AuthContext).
    } catch (e) {
      setErrPre((e as Error).message);
    } finally {
      setInscribiendo(false);
    }
  }, []);

  // ── Encuesta de salida (1 pregunta) ──
  const [npsEnviando, setNpsEnviando] = useState(false);
  const [npsLocal, setNpsLocal] = useState<number | null>(null);
  const npsRespondido = npsLocal !== null || !!usuario?.expovinoNps;

  const votarNps = useCallback(async (n: number) => {
    setNpsEnviando(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/expovino/nps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({ rating: n }),
      });
      if (res.ok) setNpsLocal(n);
    } finally {
      setNpsEnviando(false);
    }
  }, []);

  const compartir = useCallback(async () => {
    const url = `${window.location.origin}/expovino`;
    const texto = `¡Ya activé mi Pasaporte ExpoVino! 🍷 Actívalo gratis y llega listo el 1 de agosto: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pasaporte ExpoVino", text: texto });
        return;
      } catch {
        // Cancelado — cae al fallback.
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noreferrer"
    );
  }, []);

  return (
    <div
      className="min-h-dvh pb-10"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      <div className="mx-auto max-w-xl px-4 pt-8">
        {/* ── Cabecera del evento ── */}
        <header className="text-center">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: C.oro }}
          >
            Pasaporte oficial
          </p>
          <h1 className="mt-2 font-headline text-[32px] font-black leading-[1.05] tracking-tight">
            {EXPOVINO.nombre} 🍷
          </h1>
          <p className="mt-1 text-sm opacity-70">{EXPOVINO.edicion}</p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.16em] opacity-60">
            <MapPin className="h-3 w-3" />
            {EXPOVINO.fecha} · {EXPOVINO.lugar}
          </p>
        </header>

        {preEvento ? (
          <>
            {/* ══════════ MODO PREVIA ══════════ */}
            <section className="mt-7 text-center">
              <Countdown />
              {preinscritos !== null && preinscritos > 0 && (
                <p className="mt-4 text-[13px] opacity-75">
                  🎟️{" "}
                  <span
                    className="font-headline font-extrabold tabular-nums"
                    style={{ color: C.oro }}
                  >
                    {preinscritos.toLocaleString("es-CL")}
                  </span>{" "}
                  pasaportes ya activados
                </p>
              )}
            </section>

            {/* Estado de preinscripción */}
            <section
              className="mt-6 rounded-[1.75rem] p-6 text-center"
              style={{
                backgroundColor: C.carta,
                boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
              }}
            >
              {preinscrito ? (
                <>
                  <p className="text-4xl">🎟️</p>
                  <p className="mt-2 font-headline text-xl font-extrabold">
                    ¡Estás dentro!
                  </p>
                  <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed opacity-70">
                    Tu pasaporte queda listo para el 1 de agosto. Llega,
                    escanea el primer stand y a timbrar.
                  </p>
                  <button
                    type="button"
                    onClick={compartir}
                    className="mt-5 inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
                    style={{ backgroundColor: C.oro, color: C.fondo }}
                  >
                    <Share2 className="h-4 w-4" />
                    Invitar a mi grupo
                  </button>
                </>
              ) : usuario ? (
                <>
                  <p className="font-headline text-xl font-extrabold">
                    Asegura tu pasaporte
                  </p>
                  <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed opacity-70">
                    {EXPOVINO.beneficioPreinscritos}
                  </p>
                  {errPre && (
                    <p className="mt-3 text-[12px]" style={{ color: C.oro }}>
                      {errPre}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={preinscribir}
                    disabled={inscribiendo}
                    className="mt-5 inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95 disabled:opacity-60"
                    style={{ backgroundColor: C.oro, color: C.fondo }}
                  >
                    {inscribiendo && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Quiero mi pasaporte 🎟️
                  </button>
                </>
              ) : (
                <>
                  <p className="font-headline text-xl font-extrabold">
                    Activa tu pasaporte gratis
                  </p>
                  <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed opacity-70">
                    {EXPOVINO.beneficioPreinscritos}
                  </p>
                  <Link
                    href="/unete?next=/expovino"
                    className="mt-5 inline-block rounded-full px-8 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
                    style={{ backgroundColor: C.oro, color: C.fondo }}
                  >
                    Activar mi pasaporte 🍷
                  </Link>
                </>
              )}
            </section>

            {/* Cómo funciona — los 4 pasos */}
            <section className="mt-8">
              <h2 className="text-center font-headline text-lg font-extrabold">
                Así se juega el 1 de agosto
              </h2>
              <div className="mt-4 space-y-2.5">
                {[
                  ["🎟️", "Activa tu pasaporte", "Gratis, sin descargar nada"],
                  ["📲", "Timbra en cada stand", "Escanea el QR o acerca tu teléfono"],
                  ["🍷", "Califica tus vinos", "Tu cava guarda lo que probaste"],
                  ["🍾", `Completa ${EXPOVINO.metaSorteo} y entra al sorteo`, "Premios en vivo desde el escenario"],
                ].map(([emoji, titulo, bajada], i) => (
                  <div
                    key={titulo}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3.5"
                    style={{ backgroundColor: C.carta }}
                  >
                    <span
                      className="font-headline text-lg font-black tabular-nums"
                      style={{ color: C.oro }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-2xl">{emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{titulo}</p>
                      <p className="text-[11px] opacity-55">{bajada}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-[12px] opacity-50">
                Los {STANDS.length}+ expositores se revelan pronto 👀
              </p>
            </section>
          </>
        ) : (
          <>
            {/* ══════════ MODO EVENTO ══════════ */}
            {usuario ? (
              <section
                className="mt-7 rounded-[1.75rem] p-6"
                style={{
                  backgroundColor: C.carta,
                  boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
                }}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-headline text-[38px] font-black leading-none tabular-nums">
                      {sellos}
                      <span className="text-[19px] opacity-40">
                        {" "}
                        / {EXPOVINO.metaSorteo}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] opacity-60">
                      Stands timbrados
                    </p>
                  </div>
                  {enSorteo ? (
                    <span
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: C.oro, color: C.fondo }}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      ¡En el sorteo!
                    </span>
                  ) : (
                    <p className="pb-1 text-[12px] opacity-60">
                      {EXPOVINO.metaSorteo - sellos} más para el sorteo 🎟️
                    </p>
                  )}
                </div>
                <div
                  className="mt-4 h-[5px] overflow-hidden rounded-full"
                  style={{ backgroundColor: "rgba(246,236,224,0.12)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${C.vino}, ${C.oro})`,
                    }}
                  />
                </div>
              </section>
            ) : (
              <section
                className="mt-7 rounded-[1.75rem] p-6 text-center"
                style={{
                  backgroundColor: C.carta,
                  boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
                }}
              >
                <p className="font-headline text-xl font-extrabold">
                  Activa tu pasaporte gratis
                </p>
                <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed opacity-70">
                  Timbra en cada stand, guarda tus vinos favoritos y entra al
                  sorteo de la noche.
                </p>
                <Link
                  href="/unete?next=/expovino"
                  className="mt-5 inline-block rounded-full px-8 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
                  style={{ backgroundColor: C.oro, color: C.fondo }}
                >
                  Activar mi pasaporte 🍷
                </Link>
              </section>
            )}

            {/* Cupón desbloqueado al completar el pasaporte */}
            {usuario && enSorteo && (
              <Link
                href="/expovino/cupon"
                className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.99]"
                style={{
                  backgroundColor: "rgba(217,164,65,0.1)",
                  border: `1.5px dashed ${C.oro}`,
                }}
              >
                <span className="text-2xl">{CUPON.emoji}</span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold" style={{ color: C.oro }}>
                    Premio desbloqueado: {CUPON.titulo}
                  </p>
                  <p className="text-[11px] opacity-60">
                    Tu cupón te espera — canjéalo durante agosto
                  </p>
                </div>
                <span
                  className="shrink-0 text-[12px] font-bold"
                  style={{ color: C.oro }}
                >
                  Ver →
                </span>
              </Link>
            )}

            {/* Misiones de la noche */}
            {usuario && (
              <section className="mt-8">
                <h2 className="font-headline text-lg font-extrabold">
                  Misiones 🎯
                </h2>
                <div className="mt-3 space-y-2">
                  {MISIONES.map((m) => {
                    const timbrados = standsTimbrados(pasaporte);
                    let [logrado, meta] = m.progreso(timbrados);
                    if (m.id === "critico-de-la-noche") {
                      logrado = timbrados.filter(
                        (s) => pasaporte[s.id]?.rating != null
                      ).length;
                      meta = Math.max(1, timbrados.length);
                    }
                    const completa = timbrados.length > 0 && logrado >= meta;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3"
                        style={{
                          backgroundColor: C.carta,
                          border: completa
                            ? `1px solid ${C.oro}`
                            : "1px solid transparent",
                        }}
                      >
                        <span className="text-xl">{m.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{m.nombre}</p>
                          <p className="text-[11px] opacity-55">
                            {m.descripcion}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[12px] font-bold tabular-nums",
                            !completa && "opacity-50"
                          )}
                          style={completa ? { color: C.oro } : undefined}
                        >
                          {completa ? "¡Lista! ✨" : `${logrado}/${meta}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Mi cava */}
            {usuario && sellos > 0 && (
              <section className="mt-8">
                <h2 className="font-headline text-lg font-extrabold">
                  Mi cava 🍾
                </h2>
                <p className="text-[12px] opacity-60">
                  Lo que probaste esta noche — para que mañana te acuerdes.
                </p>
                <div className="mt-3 space-y-2">
                  {STANDS.filter((s) => pasaporte[s.id]).map((s) => {
                    const sello = pasaporte[s.id];
                    return (
                      <Link
                        key={s.id}
                        href={`/expovino/s/${s.id}`}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-transform active:scale-[0.99]"
                        style={{ backgroundColor: C.carta }}
                      >
                        <span className="text-xl">
                          {CATEGORIA_META[s.categoria].emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {s.nombre}
                          </p>
                          <p className="text-[11px] opacity-50">{s.origen}</p>
                        </div>
                        <span className="shrink-0 text-sm">
                          {sello.rating ? (
                            copas(sello.rating)
                          ) : (
                            <span
                              className="text-[11px] font-semibold"
                              style={{ color: C.oro }}
                            >
                              Calificar →
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Los stands por categoría */}
            <section className="mt-8 space-y-6">
              <div className="flex items-end justify-between">
                <h2 className="font-headline text-lg font-extrabold">
                  Los stands 🗺️
                </h2>
                <p className="text-[11px] tabular-nums opacity-50">
                  {STANDS.length} expositores
                </p>
              </div>

              {standsPorCategoria().map(({ categoria, stands }) => (
                <div key={categoria}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: C.oro }}
                  >
                    {CATEGORIA_META[categoria].emoji}{" "}
                    {CATEGORIA_META[categoria].label}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2.5">
                    {stands.map((s) => {
                      const timbrado = !!pasaporte[s.id];
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "relative rounded-2xl p-3.5 transition-opacity",
                            !timbrado && "opacity-75"
                          )}
                          style={{
                            backgroundColor: timbrado ? C.carta : "transparent",
                            border: timbrado
                              ? `1px solid ${C.vino}`
                              : "1.5px dashed rgba(246,236,224,0.2)",
                          }}
                        >
                          {timbrado && (
                            <span
                              className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: C.oro, color: C.fondo }}
                            >
                              <Check className="h-3 w-3" strokeWidth={3.5} />
                            </span>
                          )}
                          <p className="pr-6 text-[13px] font-bold leading-tight">
                            {s.nombre}
                          </p>
                          <p className="mt-0.5 text-[10.5px] opacity-50">
                            {s.origen}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            {/* Encuesta de salida — 1 pregunta, 1 vez */}
            {usuario && sellos >= 3 && (
              <section
                className="mt-8 rounded-[1.75rem] p-5 text-center"
                style={{ backgroundColor: C.carta }}
              >
                {npsRespondido ? (
                  <p className="text-sm font-bold">
                    ¡Gracias! Nos vemos el 2027 🥂
                  </p>
                ) : (
                  <>
                    <p className="font-headline text-[15px] font-extrabold">
                      Antes de irte: ¿volverías el 2027?
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={npsEnviando}
                          onClick={() => votarNps(n)}
                          aria-label={`${n} de 5`}
                          className="text-3xl transition-transform active:scale-90 disabled:opacity-40"
                        >
                          🍷
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] opacity-50">
                      1 copa = nunca más · 5 copas = con la familia entera
                    </p>
                  </>
                )}
              </section>
            )}
          </>
        )}

        {/* ── El programa (ambos modos) ── */}
        <section className="mt-8">
          <h2 className="font-headline text-lg font-extrabold">
            El programa 🕐
          </h2>
          <div className="mt-3 space-y-0">
            {PROGRAMA.map((p, i) => (
              <div
                key={p.hora}
                className="flex items-start gap-3 py-2.5"
                style={{
                  borderTop:
                    i > 0 ? "1px solid rgba(246,236,224,0.08)" : undefined,
                }}
              >
                <span
                  className="w-12 shrink-0 pt-0.5 font-headline text-[13px] font-extrabold tabular-nums"
                  style={{ color: C.oro }}
                >
                  {p.hora}
                </span>
                <span className="text-base">{p.emoji}</span>
                <p className="text-[13px] leading-snug opacity-85">
                  {p.titulo}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pie: ranking + firma ── */}
        <div className="mt-10 space-y-4 text-center">
          {!preEvento && (
            <Link
              href="/expovino/ranking"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-transform active:scale-95"
              style={{ border: `1px solid ${C.oro}`, color: C.oro }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Lo más aplaudido de la noche
            </Link>
          )}
          <p className="text-[10px] uppercase tracking-[0.24em] opacity-40">
            Desarrollado por SynapTech
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExpovinoPage() {
  return (
    <Suspense fallback={null}>
      <ExpovinoInner />
    </Suspense>
  );
}
