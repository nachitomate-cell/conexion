import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError, rateLimit } from "@/lib/apiAuth";
import { EXPOVINO } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → preinscripción al Pasaporte ExpoVino (antes del 1 de agosto).
 * Idempotente. El contador agregado (`expovino_stats.preinscritos`) es la
 * data que ve el organizador crecer cuando publica el link en sus RRSS.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`expovino-pre:${user.uid}`, 10, 60_000)) {
      return NextResponse.json({ error: "Muy rápido 🍷" }, { status: 429 });
    }

    const userRef = adminDb.collection("usuarios").doc(user.uid);
    const statsRef = adminDb.collection("expovino_stats").doc(EXPOVINO.id);

    const resultado = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new AuthError("Usuario no encontrado.", 403);
      if (snap.data()?.expovinoPreinscrito) return { ya: true };

      tx.update(userRef, {
        expovinoPreinscrito: true,
        expovinoPreinscritoAt: Date.now(),
      });
      tx.set(
        statsRef,
        { preinscritos: FieldValue.increment(1) },
        { merge: true }
      );
      return { ya: false };
    });

    return NextResponse.json({ ok: true, ya: resultado.ya });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/preinscribir POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
