import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import type { Task } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tsToMs(v: unknown): number | null {
  const t = v as { toMillis?: () => number } | undefined;
  return t?.toMillis ? t.toMillis() : null;
}

/**
 * Documento en Firestore `tasks/{id}`. El API expone millis para el cliente,
 * Firestore guarda Timestamps para poder ordenarlos server-side.
 */
interface TaskDoc {
  title?: string;
  assignedTo?: string;
  assignedToName?: string | null;
  createdBy?: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  isCompleted?: boolean;
  createdAt?: Timestamp;
  completedAt?: Timestamp | null;
  dueDate?: Timestamp | null;
}

/** GET → lista de tareas ordenadas por fecha de creación descendente. */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const snap = await adminDb
      .collection("tasks")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const tasks: Task[] = snap.docs.map((d) => {
      const raw = d.data() as TaskDoc;
      return {
        id: d.id,
        title: String(raw.title || ""),
        assignedTo: String(raw.assignedTo || ""),
        assignedToName: raw.assignedToName ?? null,
        createdBy: String(raw.createdBy || ""),
        createdByEmail: raw.createdByEmail ?? null,
        createdByName: raw.createdByName ?? null,
        isCompleted: Boolean(raw.isCompleted),
        createdAt: tsToMs(raw.createdAt) ?? 0,
        completedAt: tsToMs(raw.completedAt),
        dueDate: tsToMs(raw.dueDate),
      };
    });
    return NextResponse.json({ tasks });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tasks GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

interface CreateTaskBody {
  title?: unknown;
  assignedTo?: unknown;
  assignedToName?: unknown;
  dueDate?: unknown; // ISO string o epoch ms
}

/** POST → crea una tarea. El creador es el usuario autenticado. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = (await req.json()) as CreateTaskBody;
    const title = String(body.title || "").trim();
    const assignedTo = String(body.assignedTo || "").trim().toLowerCase();
    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "El título es requerido (máx 200 caracteres)." },
        { status: 400 }
      );
    }
    if (!assignedTo) {
      return NextResponse.json(
        { error: "Debes indicar a quién se asigna." },
        { status: 400 }
      );
    }

    let dueDate: Date | null = null;
    if (body.dueDate) {
      const d = new Date(body.dueDate as string | number);
      if (!Number.isNaN(d.getTime())) dueDate = d;
    }

    const ref = adminDb.collection("tasks").doc();
    const assignedToName =
      typeof body.assignedToName === "string"
        ? body.assignedToName.trim() || null
        : null;
    await ref.set({
      title,
      assignedTo,
      assignedToName,
      createdBy: user.uid,
      createdByEmail: user.email ?? null,
      createdByName: null,
      isCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: null,
      dueDate,
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tasks POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
