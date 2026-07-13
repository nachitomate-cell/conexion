import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { claveStand, EXPOVINO, getStand, STANDS } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatStand {
  sellos?: number;
  ratingSum?: number;
  ratingCount?: number;
}

/**
 * GET ?id=...&clave=... → métricas en vivo de UN stand, para la vista
 * privada del expositor. La clave es determinística (claveStand) —
 * suficiente para un evento; no expone datos personales, solo agregados.
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    const clave = req.nextUrl.searchParams.get("clave") || "";
    const stand = getStand(id);
    if (!stand || clave !== claveStand(id)) {
      return NextResponse.json(
        { error: "Stand o clave inválida." },
        { status: 403 }
      );
    }

    const snap = await adminDb
      .collection("expovino_stats")
      .doc(EXPOVINO.id)
      .get();
    const data = snap.exists ? snap.data() : {};
    const stands = (data?.stands as Record<string, StatStand>) || {};

    // Posición en el ranking (mismo criterio que /api/expovino/ranking).
    const filas = STANDS.map((s) => {
      const st = stands[s.id] || {};
      const votos = st.ratingCount || 0;
      return {
        id: s.id,
        sellos: st.sellos || 0,
        votos,
        promedio: votos > 0 ? (st.ratingSum || 0) / votos : 0,
      };
    }).sort(
      (a, b) =>
        b.promedio - a.promedio || b.votos - a.votos || b.sellos - a.sellos
    );
    const posicion = filas.findIndex((f) => f.id === id) + 1;
    const mia = filas.find((f) => f.id === id)!;

    return NextResponse.json({
      stand: { id: stand.id, nombre: stand.nombre, categoria: stand.categoria, origen: stand.origen },
      visitas: mia.sellos,
      votos: mia.votos,
      promedio: mia.promedio,
      posicion,
      totalStands: STANDS.length,
      catadores: (data?.catadores as number) || 0,
    });
  } catch (e) {
    console.error("expovino/stand GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
