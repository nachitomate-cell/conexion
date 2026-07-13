"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CATEGORIA_META, EXPOVINO } from "@/lib/expovino";

// =========================================================
// Vista privada del expositor — sus métricas en vivo durante
// el evento (visitas, nota, ranking) + CTA al marketplace.
// URL con clave: /expovino/stand/{id}?clave=xxxxxx
// =========================================================

const C = EXPOVINO.colores;
const WSP =
  "https://wa.me/56983568212?text=" +
  encodeURIComponent(
    "Hola! Soy expositor de ExpoVino y quiero esto para mi local todo el año 🍷"
  );

interface DataStand {
  stand: {
    id: string;
    nombre: string;
    categoria: keyof typeof CATEGORIA_META;
    origen: string;
  };
  visitas: number;
  votos: number;
  promedio: number;
  posicion: number;
  totalStands: number;
  catadores: number;
}

function StandExpositorInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const clave = search.get("clave") || "";

  const [data, setData] = useState<DataStand | null>(null);
  const [denegado, setDenegado] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const res = await fetch(
          `/api/expovino/stand?id=${encodeURIComponent(
            String(params.id ?? "")
          )}&clave=${encodeURIComponent(clave)}`
        );
        if (res.status === 403) {
          if (vivo) setDenegado(true);
          return;
        }
        const json = await res.json();
        if (vivo && res.ok) setData(json);
      } catch {
        // Reintenta en el próximo tick.
      }
    };
    cargar();
    const t = setInterval(cargar, 20_000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [params.id, clave]);

  if (denegado) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center p-8 text-center text-sm"
        style={{ backgroundColor: C.fondo, color: C.crema }}
      >
        Vista privada del expositor — revisa el link con clave que te
        entregó el equipo.
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh px-5 py-10"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      <div className="mx-auto max-w-md">
        <header className="text-center">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: C.oro }}
          >
            Tu stand · en vivo
          </p>
          <h1 className="mt-2 font-headline text-[26px] font-black leading-tight">
            {data ? (
              <>
                {CATEGORIA_META[data.stand.categoria].emoji}{" "}
                {data.stand.nombre}
              </>
            ) : (
              "Cargando…"
            )}
          </h1>
          {data && (
            <p className="mt-1 text-sm opacity-60">{data.stand.origen}</p>
          )}
        </header>

        {data && (
          <>
            {/* Posición destacada */}
            <section
              className="mt-7 rounded-[1.75rem] p-6 text-center"
              style={{
                backgroundColor: C.carta,
                boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">
                Tu posición ahora
              </p>
              <p
                className="mt-2 font-headline text-[64px] font-black leading-none tabular-nums"
                style={{ color: C.oro }}
              >
                N°{data.posicion}
              </p>
              <p className="mt-1 text-[12px] opacity-55">
                de {data.totalStands} stands · se actualiza solo
              </p>
            </section>

            {/* Métricas */}
            <section className="mt-4 grid grid-cols-3 gap-3">
              {[
                { v: data.visitas, l: "Visitas" },
                { v: data.promedio > 0 ? data.promedio.toFixed(1) : "—", l: "Nota" },
                { v: data.votos, l: "Votos" },
              ].map((m) => (
                <div
                  key={m.l}
                  className="rounded-2xl p-4 text-center"
                  style={{ backgroundColor: C.carta }}
                >
                  <p className="font-headline text-[26px] font-black tabular-nums">
                    {m.v}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] opacity-55">
                    {m.l}
                  </p>
                </div>
              ))}
            </section>

            <p className="mt-4 text-center text-[12px] opacity-55">
              {data.catadores.toLocaleString("es-CL")} catadores con pasaporte
              recorren el evento 🍷
            </p>

            {/* CTA marketplace — la cosecha de SynapTech */}
            <section
              className="mt-8 rounded-[1.75rem] p-6 text-center"
              style={{ border: `1px solid ${C.oro}` }}
            >
              <p className="font-headline text-lg font-extrabold">
                ¿Y si tu local tuviera esto todos los días?
              </p>
              <p className="mx-auto mt-2 max-w-[34ch] text-[13px] leading-relaxed opacity-70">
                Sellos digitales, clientes que vuelven y este mismo panel de
                métricas — funcionando todo el año, con tu marca.
              </p>
              <a
                href={WSP}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block rounded-full px-8 py-3.5 font-headline text-sm font-extrabold transition-transform active:scale-95"
                style={{ backgroundColor: C.oro, color: C.fondo }}
              >
                Lo quiero para mi local 💬
              </a>
              <p className="mt-3 text-[10px] uppercase tracking-[0.22em] opacity-40">
                SynapTech · fideliza.synaptechspa.cl
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function StandExpositorPage() {
  return (
    <Suspense fallback={null}>
      <StandExpositorInner />
    </Suspense>
  );
}
