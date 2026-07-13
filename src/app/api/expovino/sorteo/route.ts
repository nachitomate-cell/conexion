import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { EXPOVINO, nombrePantalla } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================================
// Sorteo en vivo (solo admin/superadmin) — el momento show.
// Elegibles: pasaporte con >= metaSorteo stands timbrados
// (query por el contador plano `expovinoSellos`, sin índices
// compuestos). Los ganadores quedan registrados y no repiten.
// =========================================================

interface Ganador {
  uid: string;
  nombre: string;
  sellos: number;
  at: number;
}

async function getElegibles() {
  const snap = await adminDb
    .collection("usuarios")
    .where("expovinoSellos", ">=", EXPOVINO.metaSorteo)
    .limit(1000)
    .get();
  return snap.docs
    .map((d) => ({
      uid: d.id,
      nombre: String(d.data().nombre || ""),
      sellos: Number(d.data().expovinoSellos || 0),
      baneado: Boolean(d.data().baneado),
    }))
    .filter((u) => !u.baneado);
}

/** GET → estado pre-sorteo: cuántos elegibles hay + ganadores previos. */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);
    const [elegibles, statsSnap] = await Promise.all([
      getElegibles(),
      adminDb.collection("expovino_stats").doc(EXPOVINO.id).get(),
    ]);
    const ganadores = ((statsSnap.data()?.ganadores as Ganador[]) || []).map(
      (g) => ({ nombre: nombrePantalla(g.nombre), at: g.at })
    );
    return NextResponse.json({ elegibles: elegibles.length, ganadores });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/sorteo GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** POST → sortea un ganador (excluye ganadores anteriores). */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);

    const statsRef = adminDb.collection("expovino_stats").doc(EXPOVINO.id);
    const [elegibles, statsSnap] = await Promise.all([
      getElegibles(),
      statsRef.get(),
    ]);
    const previos = new Set(
      ((statsSnap.data()?.ganadores as Ganador[]) || []).map((g) => g.uid)
    );
    const pool = elegibles.filter((u) => !previos.has(u.uid));

    if (pool.length === 0) {
      return NextResponse.json(
        {
          error:
            elegibles.length === 0
              ? "Todavía nadie completa la meta del sorteo."
              : "Todos los elegibles ya ganaron — no hay más pool.",
        },
        { status: 409 }
      );
    }

    const ganador = pool[Math.floor(Math.random() * pool.length)];
    await statsRef.set(
      {
        ganadores: FieldValue.arrayUnion({
          uid: ganador.uid,
          nombre: ganador.nombre,
          sellos: ganador.sellos,
          at: Date.now(),
        }),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      ganador: {
        nombre: nombrePantalla(ganador.nombre),
        sellos: ganador.sellos,
      },
      elegibles: pool.length - 1,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/sorteo POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
