import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS_URL = "/superadmin/dashboard/tareas";

interface Body {
  title?: unknown;
  body?: unknown;
  url?: unknown;
}

interface Recipient {
  uid: string;
  nombre: string | null;
  tokens: string[];
}

/**
 * Envía una notificación push a **todos** los miembros del equipo
 * (colección `team_members`). Útil para probar el pipeline extremo a extremo
 * o para mandar avisos manuales al equipo.
 *
 * Body: { title: string, body: string, url?: string }
 * Requiere autenticación. Nota TEMPORAL: mismo patrón que el resto del panel
 * — cualquier autenticado puede disparar.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const { title, body, url } = (await req.json()) as Body;
    const t = typeof title === "string" ? title.trim() : "";
    const b = typeof body === "string" ? body.trim() : "";
    const u = typeof url === "string" && url.trim() ? url.trim() : TASKS_URL;
    if (!t || !b) {
      return NextResponse.json(
        { error: "Faltan `title` o `body`." },
        { status: 400 }
      );
    }

    // 1. Miembros del equipo.
    const teamSnap = await adminDb.collection("team_members").get();
    if (teamSnap.empty) {
      return NextResponse.json({
        ok: true,
        recipients: 0,
        tokens: 0,
        success: 0,
        failure: 0,
      });
    }

    // 2. Recolectar tokens por usuario.
    const recipients: Recipient[] = [];
    await Promise.all(
      teamSnap.docs.map(async (d) => {
        const uid = d.id;
        const userDoc = await adminDb.collection("usuarios").doc(uid).get();
        const tokens = (
          userDoc.data()?.taskFcmTokens as string[] | undefined
        )?.filter(Boolean) ?? [];
        if (tokens.length === 0) return;
        recipients.push({
          uid,
          nombre: (d.data() as { nombre?: string })?.nombre ?? null,
          tokens,
        });
      })
    );

    if (recipients.length === 0) {
      return NextResponse.json({
        ok: true,
        recipients: 0,
        tokens: 0,
        success: 0,
        failure: 0,
        info: "Nadie tiene notificaciones activadas todavía.",
      });
    }

    // 3. Enviar en paralelo por recipient (para poder purgar tokens muertos
    //    de forma atómica por usuario).
    let success = 0;
    let failure = 0;
    let totalTokens = 0;
    await Promise.all(
      recipients.map(async (r) => {
        totalTokens += r.tokens.length;
        const res = await adminMessaging.sendEachForMulticast({
          tokens: r.tokens,
          data: {
            title: t,
            body: b,
            url: u,
            icon: "/icons/icon.svg",
            tag: "team-broadcast",
          },
          webpush: { fcmOptions: { link: u } },
        });
        success += res.successCount;
        failure += res.failureCount;

        // Purga tokens inválidos.
        const dead: string[] = [];
        res.responses.forEach((rr, i) => {
          if (!rr.success) {
            const code = rr.error?.code || "";
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-argument" ||
              code === "messaging/invalid-registration-token"
            ) {
              dead.push(r.tokens[i]);
            }
          }
        });
        if (dead.length > 0) {
          await adminDb
            .collection("usuarios")
            .doc(r.uid)
            .update({ taskFcmTokens: FieldValue.arrayRemove(...dead) })
            .catch(() => {});
        }
      })
    );

    return NextResponse.json({
      ok: true,
      recipients: recipients.length,
      tokens: totalTokens,
      success,
      failure,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("team/broadcast", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
