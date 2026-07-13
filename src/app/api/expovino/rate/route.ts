import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError, rateLimit } from "@/lib/apiAuth";
import { EXPOVINO, getStand, type SelloExpovino } from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → califica un stand ya timbrado (1-5 copas).
 * Se puede cambiar la nota: el agregado se ajusta por diferencia.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`expovino-rate:${user.uid}`, 30, 60_000)) {
      return NextResponse.json({ error: "Muy rápido 🍷" }, { status: 429 });
    }

    const body = (await req.json()) as { standId?: unknown; rating?: unknown };
    const stand = getStand(String(body.standId || ""));
    const rating = Number(body.rating);
    if (!stand) {
      return NextResponse.json({ error: "Stand no existe." }, { status: 404 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "La nota va de 1 a 5 copas." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("usuarios").doc(user.uid);
    const statsRef = adminDb.collection("expovino_stats").doc(EXPOVINO.id);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const pasaporte =
        (snap.data()?.expovino as Record<string, SelloExpovino>) || {};
      const sello = pasaporte[stand.id];
      if (!sello) {
        throw new AuthError("Primero timbra el stand para calificarlo.", 400);
      }

      const anterior = sello.rating;
      tx.update(userRef, {
        [`expovino.${stand.id}.rating`]: rating,
      });
      tx.set(
        statsRef,
        {
          [`stands.${stand.id}.ratingSum`]: FieldValue.increment(
            rating - (anterior ?? 0)
          ),
          [`stands.${stand.id}.ratingCount`]: FieldValue.increment(
            anterior === null || anterior === undefined ? 1 : 0
          ),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, rating });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/rate POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
