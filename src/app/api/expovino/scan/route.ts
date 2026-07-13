import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError, rateLimit } from "@/lib/apiAuth";
import {
  EXPOVINO,
  getStand,
  nombrePantalla,
  type EventoFeed,
  type SelloExpovino,
} from "@/lib/expovino";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST → timbra el pasaporte en un stand (QR o tap NFC).
 * Idempotente: un sello por stand por usuario — reescanear no duplica
 * (así los chips NTAG213 compartidos por WhatsApp no inflan nada).
 * Los agregados del ranking viven en `expovino_stats/{eventId}` para que
 * la pantalla del escenario lea UN doc, no 5.000 usuarios.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`expovino-scan:${user.uid}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "Muy rápido 🍷 — respira entre copa y copa." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as { standId?: unknown };
    const stand = getStand(String(body.standId || ""));
    if (!stand) {
      return NextResponse.json(
        { error: "Este stand no existe en el pasaporte." },
        { status: 404 }
      );
    }

    const userRef = adminDb.collection("usuarios").doc(user.uid);
    const statsRef = adminDb.collection("expovino_stats").doc(EXPOVINO.id);

    const resultado = await adminDb.runTransaction(async (tx) => {
      const [snap, statsSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(statsRef),
      ]);
      if (!snap.exists) throw new AuthError("Usuario no encontrado.", 403);
      const pasaporte =
        (snap.data()?.expovino as Record<string, SelloExpovino>) || {};

      if (pasaporte[stand.id]) {
        return { ya: true, total: Object.keys(pasaporte).length };
      }

      const total = Object.keys(pasaporte).length + 1;

      // Muro en vivo para la pantalla LED: últimos 20 eventos.
      const nombre = nombrePantalla(String(snap.data()?.nombre || ""));
      const nuevos: EventoFeed[] = [
        { nombre, standId: stand.id, tipo: "sello", at: Date.now() },
      ];
      if (total === EXPOVINO.metaSorteo) {
        nuevos.push({
          nombre,
          standId: stand.id,
          tipo: "completo",
          at: Date.now(),
        });
      }
      const feed = [
        ...((statsSnap.data()?.feed as EventoFeed[]) || []),
        ...nuevos,
      ].slice(-20);

      tx.update(userRef, {
        [`expovino.${stand.id}`]: { at: Date.now(), rating: null },
        // Contador plano para poder consultar elegibles del sorteo con un
        // `where` simple (no se puede filtrar por tamaño de un mapa).
        expovinoSellos: FieldValue.increment(1),
      });
      tx.set(
        statsRef,
        {
          [`stands.${stand.id}.sellos`]: FieldValue.increment(1),
          totalSellos: FieldValue.increment(1),
          catadores: FieldValue.increment(
            Object.keys(pasaporte).length === 0 ? 1 : 0
          ),
          feed,
        },
        { merge: true }
      );
      return { ya: false, total };
    });

    return NextResponse.json({
      ok: true,
      ya: resultado.ya,
      total: resultado.total,
      enSorteo: resultado.total >= EXPOVINO.metaSorteo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/scan POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
