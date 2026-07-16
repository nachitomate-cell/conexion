import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import * as evo from "@/lib/evolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Polling del estado de conexión; devuelve QR fresco mientras empareja. */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin", "gerente"]);
    const { vendorId } = (await req.json().catch(() => ({}))) as { vendorId?: string };
    if (!vendorId) return NextResponse.json({ error: "Falta vendorId." }, { status: 400 });

    const name = evo.instanceName(vendorId);
    const state = await evo.estadoConexion(name);

    if (state === "open") {
      await adminDb.doc(`wa_config/${vendorId}`).set(
        { estado: "connected", conectadoEn: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return NextResponse.json({ estado: "connected" });
    }

    let qr: string | null = null;
    let pairingCode: string | null = null;
    try {
      const q = await evo.obtenerQR(name);
      qr = q.qr;
      pairingCode = q.pairingCode;
    } catch {
      /* la instancia puede no existir aún */
    }
    return NextResponse.json({ estado: qr ? "qr" : "disconnected", qr, pairingCode });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("wa/estado", e);
    return NextResponse.json({ error: "Error de estado." }, { status: 500 });
  }
}
