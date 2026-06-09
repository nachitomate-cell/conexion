import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, rateLimit, AuthError } from "@/lib/apiAuth";
import { getVendor } from "@/lib/vendors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * El cliente inicia un Handshake: crea un pending_stamp que el Chef
 * confirmará luego con el monto en /api/handshake/confirm.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`hs-create:${user.uid}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const vendor = getVendor(body?.vendorId);

    const userSnap = await adminDb.collection("usuarios").doc(user.uid).get();
    const u = userSnap.data();
    if (!u) throw new AuthError("Usuario no encontrado.", 404);
    if (u.baneado) throw new AuthError("Cuenta suspendida.", 403);

    const expiresAt = Timestamp.fromMillis(Date.now() + 5 * 60_000);

    const ref = await adminDb.collection("pending_stamps").add({
      userId: user.uid,
      userNombre: (u.nombre as string) || "Cliente",
      userSellos: u.sellos || 0,
      vendorId: vendor.id,
      monto: 0,
      numSellos: 0,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    return NextResponse.json({ ok: true, pendingId: ref.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("handshake/create", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
