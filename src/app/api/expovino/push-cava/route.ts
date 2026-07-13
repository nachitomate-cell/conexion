import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITULO = "Tu cava de anoche te espera 🍾";
const CUERPO =
  "Revisa qué probaste, tus notas y tu cupón. Todo quedó guardado en tu Pasaporte ExpoVino.";

/**
 * POST → push "la mañana siguiente" a todos los que timbraron al menos
 * un stand (solo admin — se dispara a mano el 2 de agosto). Reusa el
 * patrón de lotes de src/lib/notificaciones.ts: FCM de a 500 + bandeja
 * in-app de a 400.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);

    const snap = await adminDb
      .collection("usuarios")
      .where("expovinoSellos", ">=", 1)
      .limit(5000)
      .get();

    const conToken: string[] = [];
    const uids: string[] = [];
    snap.forEach((d) => {
      const u = d.data();
      if (u.baneado) return;
      uids.push(d.id);
      if (u.fcmToken) conToken.push(u.fcmToken as string);
    });

    // --- Push FCM en lotes de 500 ---
    let enviados = 0;
    let fallidos = 0;
    for (let i = 0; i < conToken.length; i += 500) {
      const lote = conToken.slice(i, i + 500);
      try {
        const res = await adminMessaging.sendEachForMulticast({
          tokens: lote,
          notification: { title: TITULO, body: CUERPO },
          webpush: {
            fcmOptions: { link: "/expovino" },
            notification: { icon: "/icons/icon.svg" },
          },
        });
        enviados += res.successCount;
        fallidos += res.failureCount;
      } catch {
        fallidos += lote.length;
      }
    }

    // --- Bandeja in-app para todos, en lotes de 400 ---
    for (let i = 0; i < uids.length; i += 400) {
      const batch = adminDb.batch();
      uids.slice(i, i + 400).forEach((uid) => {
        const ref = adminDb
          .collection("usuarios")
          .doc(uid)
          .collection("notificaciones")
          .doc();
        batch.set(ref, {
          titulo: TITULO,
          cuerpo: CUERPO,
          leida: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      destinatarios: uids.length,
      pushEnviados: enviados,
      pushFallidos: fallidos,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("expovino/push-cava POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
