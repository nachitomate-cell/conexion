import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TASKS_URL = "/superadmin/dashboard/tareas";

interface TaskDoc {
  title?: string;
  assignedTo?: string;
  assignedToName?: string | null;
  isCompleted?: boolean;
  dueDate?: { toMillis?: () => number } | null;
}

interface PendingTask {
  id: string;
  title: string;
  dueDate: number | null;
}

/** Autorización del cron — Vercel manda Authorization: Bearer <CRON_SECRET>. */
function cronAutorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev sin secreto → permitir
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

interface UserForPush {
  uid: string;
  tokens: string[];
  nombre: string | null;
}

/**
 * Busca tokens FCM del asignado por email (case-insensitive). Si no hay match
 * devolvemos tokens = [] para que el caller pueda seguir con el resto del flow.
 */
async function findUserByEmail(email: string): Promise<UserForPush | null> {
  const snap = await adminDb
    .collection("usuarios")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() as {
    taskFcmTokens?: string[];
    nombre?: string;
  };
  return {
    uid: doc.id,
    tokens: Array.isArray(data.taskFcmTokens) ? data.taskFcmTokens : [],
    nombre: data.nombre ?? null,
  };
}

/**
 * Envía la notificación push a los N tokens del socio y limpia los que hayan
 * quedado inválidos (unregistered/invalid-argument). Devuelve el conteo de
 * enviados y fallidos.
 */
async function enviarPushAlSocio(
  uid: string,
  tokens: string[],
  count: number
): Promise<{ success: number; failure: number }> {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  const body =
    count === 1
      ? "Tienes 1 tarea pendiente con tu socio. Toca para revisarla y mantener el momentum."
      : `Tienes ${count} tareas pendientes con tu socio. Toca para revisarlas y mantener el momentum.`;

  // Data-only: el SW controla el rendering vía onBackgroundMessage. Esto evita
  // el doble-render que hace Chrome cuando el payload incluye `notification`.
  const res = await adminMessaging.sendEachForMulticast({
    tokens,
    data: {
      title: "¡A conquistar el día! 🚀",
      body,
      url: TASKS_URL,
      icon: "/icons/icon.svg",
      tag: "daily-tasks",
      pendingCount: String(count),
    },
    webpush: {
      fcmOptions: { link: TASKS_URL },
    },
  });

  // Purga tokens inválidos → arrayRemove atómico para no perder tokens vivos.
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
      .doc(uid)
      .update({ taskFcmTokens: FieldValue.arrayRemove(...invalidTokens) })
      .catch(() => {});
  }

  return { success: res.successCount, failure: res.failureCount };
}

/**
 * Cron diario — junta las tareas incompletas por asignado y arma un mensaje
 * de recordatorio. Hoy solo hace console.log; cuando conectemos Resend/SES
 * el TODO señala dónde enviar el mail.
 *
 * Se llama desde vercel.json → schedule "0 12 * * *" (09:00 CLT / 12:00 UTC).
 */
export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const snap = await adminDb
      .collection("tasks")
      .where("isCompleted", "==", false)
      .get();

    // Agrupamos por asignado.
    const porAsignado = new Map<
      string,
      { nombre: string | null; pending: PendingTask[] }
    >();
    snap.forEach((d) => {
      const raw = d.data() as TaskDoc;
      const key = String(raw.assignedTo || "").toLowerCase();
      if (!key) return;
      const bucket = porAsignado.get(key) ?? {
        nombre: raw.assignedToName ?? null,
        pending: [],
      };
      bucket.pending.push({
        id: d.id,
        title: String(raw.title || "").trim() || "(sin título)",
        dueDate: raw.dueDate?.toMillis?.() ?? null,
      });
      porAsignado.set(key, bucket);
    });

    // Para cada asignado: log + push FCM a todos sus dispositivos.
    const resumen: Array<{
      assignedTo: string;
      count: number;
      pushSuccess: number;
      pushFailure: number;
      tokens: number;
    }> = [];

    for (const [assignedTo, bucket] of porAsignado.entries()) {
      const cuenta = bucket.pending.length;
      const user = await findUserByEmail(assignedTo).catch(() => null);
      const nombre = user?.nombre || bucket.nombre || assignedTo;

      // Log — útil para debugging del cron sin depender de push.
      const lista = bucket.pending
        .map((t, i) => `  ${i + 1}. ${t.title}`)
        .join("\n");
      console.log(
        `[daily-tasks] → ${assignedTo} (${nombre}) — ${cuenta} tarea${
          cuenta === 1 ? "" : "s"
        }:\n${lista}\n`
      );

      // Push FCM: solo si el usuario existe y tiene tokens registrados.
      const push = user
        ? await enviarPushAlSocio(user.uid, user.tokens, cuenta).catch((e) => {
            console.error(
              `[daily-tasks] push falló para ${assignedTo}:`,
              e
            );
            return { success: 0, failure: user.tokens.length };
          })
        : { success: 0, failure: 0 };

      resumen.push({
        assignedTo,
        count: cuenta,
        pushSuccess: push.success,
        pushFailure: push.failure,
        tokens: user?.tokens.length ?? 0,
      });
    }

    return NextResponse.json({
      ok: true,
      recipients: resumen.length,
      totalTasks: snap.size,
      resumen,
    });
  } catch (e) {
    console.error("cron/daily-tasks", e);
    return NextResponse.json(
      { error: "Error en el cron de tareas" },
      { status: 500 }
    );
  }
}
