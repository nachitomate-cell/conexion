import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, rateLimit, AuthError } from "@/lib/apiAuth";
import { getVendor } from "@/lib/vendors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function randomAlpha(len = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Canje atómico de un premio (valida sellos + stock con Admin SDK). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!rateLimit(`canje:${user.uid}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        { status: 429 }
      );
    }

    const { premioId } = (await req.json().catch(() => ({}))) as {
      premioId?: string;
    };
    if (!premioId) {
      return NextResponse.json({ error: "Falta el premio." }, { status: 400 });
    }

    const userRef = adminDb.collection("usuarios").doc(user.uid);
    const premioRef = adminDb.collection("premios").doc(premioId);
    const codigo = `SUSHI-${Date.now()}-${randomAlpha(4)}`;
    const canjeRef = adminDb.collection("canjes").doc();

    const out = await adminDb.runTransaction(async (tx) => {
      const [uSnap, pSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(premioRef),
      ]);
      if (!uSnap.exists) throw new AuthError("Usuario no encontrado.", 404);
      if (!pSnap.exists) throw new AuthError("Premio no encontrado.", 404);

      const u = uSnap.data()!;
      const p = pSnap.data()!;

      if (u.baneado) throw new AuthError("Cuenta suspendida.", 403);
      if (!p.activo) throw new AuthError("Premio no disponible.", 400);
      if ((p.stock || 0) <= 0) throw new AuthError("Sin stock.", 400);
      if ((u.sellos || 0) < (p.sellosRequeridos || 0))
        throw new AuthError("No tienes sellos suficientes.", 400);

      const vendor = getVendor(p.vendorId);
      const nuevosSellos = (u.sellos || 0) - (p.sellosRequeridos || 0);
      const expiraEn = Timestamp.fromMillis(Date.now() + 48 * 3600_000);

      tx.update(userRef, {
        sellos: nuevosSellos,
        recompensaDisponible: nuevosSellos >= vendor.sellosParaPremio,
      });
      tx.update(premioRef, { stock: (p.stock || 0) - 1 });
      tx.set(canjeRef, {
        clienteId: user.uid,
        clienteNombre: (u.nombre as string) || "Cliente",
        premioId,
        premioNombre: (p.nombre as string) || "Premio",
        vendorId: vendor.id,
        sellosDescontados: p.sellosRequeridos || 0,
        codigo,
        status: "pending",
        expiraEn,
        createdAt: FieldValue.serverTimestamp(),
      });

      return { vendorId: vendor.id, premioNombre: p.nombre };
    });

    await adminDb.collection("system_logs").add({
      userId: user.uid,
      vendorId: out.vendorId,
      accion: `Canje: ${out.premioNombre} (${codigo})`,
      tipo: "CANJE",
      metodo: "CLIENT_SCAN",
      fecha: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, codigo, canjeId: canjeRef.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("canje", e);
    return NextResponse.json({ error: "Error interno al canjear." }, {
      status: 500,
    });
  }
}
