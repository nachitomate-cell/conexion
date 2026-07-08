import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  token?: unknown;
}

/** Saca un token FCM del array de tokens del usuario. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { token } = (await req.json()) as Body;
    const t = typeof token === "string" ? token.trim() : "";
    if (!t) {
      return NextResponse.json(
        { error: "Token inválido." },
        { status: 400 }
      );
    }
    await adminDb
      .collection("usuarios")
      .doc(user.uid)
      .update({ taskFcmTokens: FieldValue.arrayRemove(t) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/push/unregister", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
