import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchTaskBody {
  isCompleted?: unknown;
  title?: unknown;
  assignedTo?: unknown;
  assignedToName?: unknown;
  dueDate?: unknown;
}

interface UpdatePayload {
  isCompleted?: boolean;
  completedAt?: FirebaseFirestore.FieldValue | Date | null;
  title?: string;
  assignedTo?: string;
  assignedToName?: string | null;
  dueDate?: Date | null;
  updatedAt: FirebaseFirestore.FieldValue;
}

/** PATCH → actualiza campos de una tarea (típicamente toggle isCompleted). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(req);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta id." }, { status: 400 });
    }
    const ref = adminDb.collection("tasks").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Tarea no encontrada." },
        { status: 404 }
      );
    }

    const body = (await req.json()) as PatchTaskBody;
    const update: UpdatePayload = { updatedAt: FieldValue.serverTimestamp() };

    if (typeof body.isCompleted === "boolean") {
      update.isCompleted = body.isCompleted;
      update.completedAt = body.isCompleted
        ? FieldValue.serverTimestamp()
        : null;
    }
    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title || title.length > 200) {
        return NextResponse.json(
          { error: "Título inválido." },
          { status: 400 }
        );
      }
      update.title = title;
    }
    if (typeof body.assignedTo === "string") {
      const assignedTo = body.assignedTo.trim().toLowerCase();
      if (!assignedTo) {
        return NextResponse.json(
          { error: "Asignado inválido." },
          { status: 400 }
        );
      }
      update.assignedTo = assignedTo;
    }
    if (typeof body.assignedToName === "string") {
      update.assignedToName = body.assignedToName.trim() || null;
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === "") {
        update.dueDate = null;
      } else {
        const d = new Date(body.dueDate as string | number);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Fecha inválida." },
            { status: 400 }
          );
        }
        update.dueDate = d;
      }
    }

    await ref.update(update as unknown as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tasks/[id] PATCH", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** DELETE → borra una tarea. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(req);
    const { id } = await params;
    await adminDb.collection("tasks").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tasks/[id] DELETE", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
