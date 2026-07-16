import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import * as evo from "@/lib/evolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cierra sesión y elimina la instancia (control 100% manual del teléfono). */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin", "gerente"]);
    const { vendorId } = (await req.json().catch(() => ({}))) as { vendorId?: string };
    if (!vendorId) return NextResponse.json({ error: "Falta vendorId." }, { status: 400 });

    const name = evo.instanceName(vendorId);
    try { await evo.logout(name); } catch {}
    try { await evo.eliminarInstancia(name); } catch {}

    await adminDb.doc(`wa_config/${vendorId}`).set(
      { estado: "disconnected", numeroVinculado: null, botEnabled: false, reactivacionEnabled: false, desvinculadoEn: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("wa/desvincular", e);
    return NextResponse.json({ error: "No se pudo desvincular." }, { status: 500 });
  }
}
