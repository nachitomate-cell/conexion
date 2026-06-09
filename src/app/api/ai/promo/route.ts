import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError, rateLimit } from "@/lib/apiAuth";
import {
  generatePromoMessage,
  PromoInputSchema,
} from "@/ai/flows/generatePromoMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Genera un mensaje promocional con IA (solo staff). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ["chef_partner", "gerente", "admin"]);
    if (!rateLimit(`ai:${user.uid}`, 20, 60_000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes a la IA. Espera un momento." },
        { status: 429 }
      );
    }

    const parsed = PromoInputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }

    const output = await generatePromoMessage(parsed.data);
    return NextResponse.json({ ok: true, ...output });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("ai/promo", e);
    return NextResponse.json({ error: "Error al generar el mensaje." }, {
      status: 500,
    });
  }
}
