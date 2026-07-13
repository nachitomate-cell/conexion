import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError, rateLimit } from "@/lib/apiAuth";
import { EXPOVINO } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → encuesta de salida (1 pregunta): "¿Volverías el 2027?" 1-5.
 * Un voto por usuario. El agregado (npsSum/npsCount) es data que el
 * organizador nunca ha tenido — vale oro para vender sponsors 2027.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`expovino-nps:${user.uid}`, 5, 60_000)) {
      return NextResponse.json({ error: "Muy rápido 🍷" }, { status: 429 });
    }

    const body = (await req.json()) as { rating?: unknown };
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "La respuesta va de 1 a 5." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("usuarios").doc(user.uid);
    const statsRef = adminDb.collection("expovino_stats").doc(EXPOVINO.id);

    const resultado = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new AuthError("Usuario no encontrado.", 403);
      if (snap.data()?.expovinoNps) return { ya: true };

      tx.update(userRef, { expovinoNps: rating });
      tx.set(
        statsRef,
        {
          npsSum: FieldValue.increment(rating),
          npsCount: FieldValue.increment(1),
        },
        { merge: true }
      );
      return { ya: false };
    });

    return NextResponse.json({ ok: true, ya: resultado.ya });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/nps POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
