import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { EXPOVINO, STANDS, type EventoFeed } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatStand {
  sellos?: number;
  ratingSum?: number;
  ratingCount?: number;
}

/**
 * GET → ranking en vivo para la pantalla del escenario (público, sin auth:
 * no expone datos personales, solo agregados por stand).
 */
export async function GET() {
  try {
    const snap = await adminDb
      .collection("expovino_stats")
      .doc(EXPOVINO.id)
      .get();
    const data = snap.exists ? snap.data() : {};
    const stands = (data?.stands as Record<string, StatStand>) || {};

    const ranking = STANDS.map((s) => {
      const st = stands[s.id] || {};
      const votos = st.ratingCount || 0;
      return {
        id: s.id,
        nombre: s.nombre,
        categoria: s.categoria,
        origen: s.origen,
        sellos: st.sellos || 0,
        votos,
        promedio: votos > 0 ? (st.ratingSum || 0) / votos : 0,
      };
    }).sort(
      (a, b) => b.promedio - a.promedio || b.votos - a.votos || b.sellos - a.sellos
    );

    return NextResponse.json({
      evento: EXPOVINO.nombre,
      totalSellos: (data?.totalSellos as number) || 0,
      catadores: (data?.catadores as number) || 0,
      preinscritos: (data?.preinscritos as number) || 0,
      ranking,
      // Muro en vivo para la pantalla LED — más reciente primero.
      feed: (((data?.feed as EventoFeed[]) || []) as EventoFeed[])
        .slice()
        .reverse(),
    });
  } catch (e) {
    console.error("expovino/ranking GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
