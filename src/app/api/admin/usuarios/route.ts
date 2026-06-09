import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Carácter alto para acotar búsquedas por prefijo en Firestore.
const HIGH = String.fromCharCode(0xf8ff);

/** Búsqueda de usuarios por email o nombre (solo admin). */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);

    const { search } = (await req.json().catch(() => ({}))) as {
      search?: string;
    };
    const term = (search || "").trim();
    const termLower = term.toLowerCase();

    const col = adminDb.collection("usuarios");
    const found = new Map<string, Record<string, unknown>>();

    if (!term) {
      const snap = await col.orderBy("createdAt", "desc").limit(20).get();
      snap.forEach((d) => found.set(d.id, { uid: d.id, ...d.data() }));
    } else {
      // email (los guardamos en minúscula) por prefijo
      const byEmail = await col
        .where("email", ">=", termLower)
        .where("email", "<=", termLower + HIGH)
        .limit(15)
        .get();
      byEmail.forEach((d) => found.set(d.id, { uid: d.id, ...d.data() }));

      // nombre por prefijo: probamos tal cual y capitalizado
      const cap = term.charAt(0).toUpperCase() + term.slice(1);
      const prefijos = Array.from(new Set([term, cap]));
      for (const prefix of prefijos) {
        const byNombre = await col
          .where("nombre", ">=", prefix)
          .where("nombre", "<=", prefix + HIGH)
          .limit(15)
          .get();
        byNombre.forEach((d) => found.set(d.id, { uid: d.id, ...d.data() }));
      }
    }

    // Serializa Timestamps a millis para el cliente.
    const usuarios = Array.from(found.values()).map((u) => {
      const out: Record<string, unknown> = { ...u };
      for (const k of ["createdAt", "ultimaVisita"]) {
        const v = u[k] as { toMillis?: () => number } | undefined;
        if (v?.toMillis) out[k] = v.toMillis();
      }
      return out;
    });

    return NextResponse.json({ usuarios });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin/usuarios", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
