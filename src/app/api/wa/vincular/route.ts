import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import * as evo from "@/lib/evolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Crea (o re-crea) la instancia de WhatsApp del vendor y devuelve el QR. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ["admin", "gerente"]);
    const { vendorId } = (await req.json().catch(() => ({}))) as { vendorId?: string };
    if (!vendorId) return NextResponse.json({ error: "Falta vendorId." }, { status: 400 });

    const name = evo.instanceName(vendorId);
    const webhookUrl = `${req.nextUrl.origin}/api/wa/webhook`;
    const webhookToken = process.env.EVOLUTION_WEBHOOK_TOKEN;

    let r: evo.QrResult;
    try {
      r = await evo.crearInstancia(name, { webhookUrl, webhookToken });
    } catch {
      // Auto-sana si la instancia ya existía de un intento previo sin escanear.
      try { await evo.logout(name); } catch {}
      try { await evo.eliminarInstancia(name); } catch {}
      r = await evo.crearInstancia(name, { webhookUrl, webhookToken });
    }

    await adminDb.doc(`wa_config/${vendorId}`).set(
      { vendorId, instanceName: name, estado: "qr", vinculadoPor: user.uid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return NextResponse.json({ ok: true, qr: r.qr, pairingCode: r.pairingCode });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("wa/vincular", e);
    return NextResponse.json({ error: "No se pudo iniciar la vinculación. Reintenta." }, { status: 500 });
  }
}
