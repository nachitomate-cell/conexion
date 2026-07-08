import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  token?: unknown;
}

/**
 * Registra el token FCM del dispositivo actual en el doc del usuario
 * (`usuarios/{uid}.taskFcmTokens[]`) usando arrayUnion — así el mismo dueño
 * puede tener PC + móvil sin sobreescribirse.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { token } = (await req.json()) as Body;
    const t = typeof token === "string" ? token.trim() : "";
    if (!t || t.length > 4096) {
      return NextResponse.json(
        { error: "Token inválido." },
        { status: 400 }
      );
    }
    await adminDb
      .collection("usuarios")
      .doc(user.uid)
      .set(
        { taskFcmTokens: FieldValue.arrayUnion(t) },
        { merge: true }
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/push/register", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
