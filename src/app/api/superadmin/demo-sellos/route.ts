import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================================
// Herramienta de demo del marketplace: puebla `sellosLocales`
// de una cuenta de prueba para que la billetera de /explora
// se vea viva en presentaciones (varios clubes a medio llenar).
//
// Solo admin/superadmin — un cliente no puede regalarse sellos.
// =========================================================

/** Reparto demo: clubes a distinto nivel de avance (ids del registro). */
const DEMO_SELLOS: Record<string, number> = {
  sushipro: 7, // a 3 del premio — la tarjeta "caliente"
  barberiafaro: 4,
  cafecentral: 6,
  gelatopacifico: 2,
};

interface Body {
  email?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);

    const body = (await req.json()) as Body;
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Indica el email de la cuenta demo." },
        { status: 400 }
      );
    }

    const snap = await adminDb
      .collection("usuarios")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snap.empty) {
      return NextResponse.json(
        { error: `No existe un usuario con email ${email}. Regístralo primero en /unete.` },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data() as {
      sellosLocales?: Record<string, number>;
      sellosHistoricos?: number;
    };

    // Merge: lo demo pisa, lo real que ya tenga en otros clubes se conserva.
    const sellosLocales = { ...(data.sellosLocales || {}), ...DEMO_SELLOS };
    const totalDemo = Object.values(DEMO_SELLOS).reduce((a, b) => a + b, 0);

    await doc.ref.update({
      sellosLocales,
      // Contador legacy (lo muestra la punch card del home del tenant default).
      sellos: DEMO_SELLOS.sushipro,
      // Histórico define el rango — nunca lo bajamos.
      sellosHistoricos: Math.max(data.sellosHistoricos || 0, totalDemo),
    });

    return NextResponse.json({
      ok: true,
      uid: doc.id,
      email,
      sellosLocales,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/demo-sellos POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
