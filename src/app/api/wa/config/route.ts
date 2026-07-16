import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ajustes del canal WhatsApp del vendor (reactivación on/off, cuota, nombre). */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin", "gerente"]);
    const body = (await req.json().catch(() => ({}))) as {
      vendorId?: string;
      reactivacionEnabled?: boolean;
      cuotaMensual?: number;
      nombreLocal?: string;
    };
    if (!body.vendorId) return NextResponse.json({ error: "Falta vendorId." }, { status: 400 });

    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof body.reactivacionEnabled === "boolean") patch.reactivacionEnabled = body.reactivacionEnabled;
    if (typeof body.cuotaMensual === "number") patch.cuotaMensual = body.cuotaMensual;
    if (typeof body.nombreLocal === "string") patch.nombreLocal = body.nombreLocal;

    await adminDb.doc(`wa_config/${body.vendorId}`).set(patch, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("wa/config", e);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
