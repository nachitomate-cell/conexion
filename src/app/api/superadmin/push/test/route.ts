import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS_URL = "/superadmin/dashboard/tareas";

/**
 * Manda una notificación push de prueba a TODOS los dispositivos del usuario
 * autenticado. Usa el mismo payload data-only que el cron real, así verificas
 * de una que el SW la renderiza y que el click abre la vista de tareas.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const doc = await adminDb.collection("usuarios").doc(user.uid).get();
    const tokens =
      (doc.data()?.taskFcmTokens as string[] | undefined)?.filter(Boolean) ??
      [];

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          error:
            "No tienes dispositivos registrados. Aprieta 'Activar' primero.",
        },
        { status: 400 }
      );
    }

    const res = await adminMessaging.sendEachForMulticast({
      tokens,
      data: {
        title: "¡A conquistar el día! 🚀",
        body: "Notificación de prueba — todo funcionando. Toca para ir a Tareas.",
        url: TASKS_URL,
        icon: "/icons/icon.svg",
        tag: "daily-tasks-test",
      },
      webpush: { fcmOptions: { link: TASKS_URL } },
    });

    // Purga tokens inválidos igual que el cron real.
    const invalidTokens: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-argument" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await adminDb
        .collection("usuarios")
        .doc(user.uid)
        .update({ taskFcmTokens: FieldValue.arrayRemove(...invalidTokens) })
        .catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      tokens: tokens.length,
      success: res.successCount,
      failure: res.failureCount,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/push/test", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
