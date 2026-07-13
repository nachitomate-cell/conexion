"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CATEGORIA_META, EXPOVINO } from "@/lib/expovino";

// =========================================================
// Ranking en vivo — pensado para proyectarse en la pantalla
// del escenario (se actualiza solo cada 20 s). Público: solo
// agregados, cero datos personales.
// =========================================================

const C = EXPOVINO.colores;

interface FilaRanking {
  id: string;
  nombre: string;
  categoria: keyof typeof CATEGORIA_META;
  origen: string;
  sellos: number;
  votos: number;
  promedio: number;
}

interface RankingData {
  totalSellos: number;
  catadores: number;
  ranking: FilaRanking[];
}

export default function RankingExpovinoPage() {
  const [data, setData] = useState<RankingData | null>(null);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/expovino/ranking");
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
  }, []);

  const top = (data?.ranking ?? []).filter((r) => r.votos > 0).slice(0, 10);
  const maxPromedio = Math.max(5, ...top.map((r) => r.promedio));

  return (
    <div
      className="min-h-dvh px-5 py-8"
      style={{ backgroundColor: C.fondo, color: C.crema }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.34em]"
            style={{ color: C.oro }}
          >
            {EXPOVINO.nombre} · en vivo
          </p>
          <h1 className="mt-3 font-headline text-[clamp(28px,6vw,52px)] font-black leading-[1.02] tracking-tight">
            Lo más aplaudido
            <br />
            de la noche 🍷
          </h1>
          {data && (
            <p className="mt-3 text-sm tabular-nums opacity-60">
              {data.catadores.toLocaleString("es-CL")} catadores ·{" "}
              {data.totalSellos.toLocaleString("es-CL")} degustaciones
            </p>
          )}
        </header>

        <div className="mt-8 space-y-3">
          {top.length === 0 && (
            <p className="py-16 text-center text-sm opacity-50">
              Las primeras copas se están sirviendo… 🍾
            </p>
          )}
          {top.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-4 rounded-2xl px-5 py-4"
              style={{ backgroundColor: C.carta }}
            >
              <span
                className="w-8 shrink-0 text-center font-headline text-2xl font-black tabular-nums"
                style={{ color: i < 3 ? C.oro : undefined, opacity: i < 3 ? 1 : 0.4 }}
              >
                {i + 1}
              </span>
              <span className="shrink-0 text-2xl">
                {CATEGORIA_META[r.categoria].emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-headline text-[16px] font-extrabold">
                  {r.nombre}
                </p>
                <div
                  className="mt-1.5 h-[5px] overflow-hidden rounded-full"
                  style={{ backgroundColor: "rgba(246,236,224,0.1)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${(r.promedio / maxPromedio) * 100}%`,
                      background: `linear-gradient(90deg, ${C.vino}, ${C.oro})`,
                    }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-headline text-xl font-black tabular-nums">
                  {r.promedio.toFixed(1)}
                </p>
                <p className="text-[10px] tabular-nums opacity-50">
                  {r.votos} votos
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Link
            href="/expovino"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider opacity-60 transition-opacity hover:opacity-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Mi pasaporte
          </Link>
          <p className="text-[10px] uppercase tracking-[0.24em] opacity-40">
            Desarrollado por SynapTech
          </p>
        </div>
      </div>
    </div>
  );
}
