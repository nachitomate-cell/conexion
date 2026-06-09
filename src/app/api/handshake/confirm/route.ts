import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, rateLimit, AuthError } from "@/lib/apiAuth";
import { calcularSellos, aplicarBonusCumple } from "@/lib/sellos";
import { getVendor } from "@/lib/vendors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function diffDias(aMs: number, bMs: number): number {
  const a = new Date(aMs);
  const b = new Date(bMs);
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireUser(req, ["chef_partner", "gerente", "admin"]);

    if (!rateLimit(`handshake:${staff.uid}`, 15, 60_000)) {
      return NextResponse.json(
        { error: "Demasiadas confirmaciones. Espera un momento." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { clientUid, monto, vendorId, pendingId } = body as {
      clientUid?: string;
      monto?: number;
      vendorId?: string;
      pendingId?: string;
    };

    if (!clientUid || !monto || monto <= 0) {
      return NextResponse.json(
        { error: "Datos incompletos (cliente o monto)." },
        { status: 400 }
      );
    }

    const vendor = getVendor(vendorId);
    const sellosBase = calcularSellos(monto);
    if (sellosBase === 0) {
      return NextResponse.json(
        { error: "El monto está bajo el mínimo para sellos." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("usuarios").doc(clientUid);

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new AuthError("Cliente no encontrado.", 404);
      const u = snap.data()!;
      if (u.baneado) throw new AuthError("La cuenta del cliente está suspendida.", 403);

      // Sello de cumpleaños: x2 durante el mes de nacimiento del cliente.
      const { sellos: sellosGanados, bonus } = aplicarBonusCumple(
        sellosBase,
        u.fechaNacimiento
      );

      const ahora = Date.now();
      const ultimaMs =
        (u.ultimaVisita as Timestamp | undefined)?.toMillis?.() ?? 0;
      let racha = u.rachaActual || 0;
      if (!ultimaMs) racha = 1;
      else {
        const dd = diffDias(ultimaMs, ahora);
        if (dd === 0) racha = Math.max(racha, 1);
        else if (dd === 1) racha = racha + 1;
        else racha = 1;
      }

      const nuevosSellos = (u.sellos || 0) + sellosGanados;
      const sellosLocales = { ...(u.sellosLocales || {}) };
      sellosLocales[vendor.id] =
        (sellosLocales[vendor.id] || 0) + sellosGanados;
      const recompensaDisponible = nuevosSellos >= vendor.sellosParaPremio;

      tx.update(userRef, {
        sellos: nuevosSellos,
        sellosHistoricos: (u.sellosHistoricos || 0) + sellosGanados,
        sellosLocales,
        ultimaVisita: FieldValue.serverTimestamp(),
        rachaActual: racha,
        recompensaDisponible,
      });

      if (pendingId) {
        tx.update(adminDb.collection("pending_stamps").doc(pendingId), {
          status: "confirmed",
          numSellos: sellosGanados,
          monto,
        });
      }

      return {
        nuevosSellos,
        recompensaDisponible,
        sellosGanados,
        bonus,
        nombre: (u.nombre as string) || "Cliente",
      };
    });

    await adminDb.collection("system_logs").add({
      userId: clientUid,
      vendorId: vendor.id,
      accion: result.bonus
        ? `+${result.sellosGanados} sellos (¡cumpleaños x2!) handshake $${monto}`
        : `+${result.sellosGanados} sellos (handshake $${monto})`,
      tipo: "SELLO",
      metodo: "HANDSHAKE",
      monto,
      numSellos: result.sellosGanados,
      fecha: FieldValue.serverTimestamp(),
    });

    // Notificación in-app si quedó premio disponible.
    if (result.recompensaDisponible) {
      await adminDb
        .collection("usuarios")
        .doc(clientUid)
        .collection("notificaciones")
        .add({
          titulo: "¡Tienes un premio listo! 🏆",
          mensaje: "Llegaste a los sellos suficientes. Pásate a canjear.",
          tipo: "canje",
          isAI: false,
          leida: false,
          fecha: FieldValue.serverTimestamp(),
        })
        .catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      sellosGanados: result.sellosGanados,
      nuevosSellos: result.nuevosSellos,
      recompensaDisponible: result.recompensaDisponible,
      clientNombre: result.nombre,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("handshake/confirm", e);
    return NextResponse.json(
      { error: "Error interno al confirmar el handshake." },
      { status: 500 }
    );
  }
}
