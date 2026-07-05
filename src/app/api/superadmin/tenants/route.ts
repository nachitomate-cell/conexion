import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import type { VendorStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_VALIDOS: VendorStatus[] = [
  "propuesta",
  "por_presentar",
  "funcionando",
];
const PLAN_VALIDOS = ["starter", "growth", "scale", "enterprise"] as const;
const ENTORNO_VALIDOS = ["staging", "produccion"] as const;
const ID_RE = /^[a-z0-9]{2,32}$/;

interface CreateTenantBody {
  id?: unknown;
  nombre?: unknown;
  slug?: unknown;
  emoji?: unknown;
  dominio?: unknown;
  status?: unknown;
  plan?: unknown;
  entorno?: unknown;
  ownerEmail?: unknown;
  nota?: unknown;
  mrr?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    // TEMPORAL: cualquier autenticado. Restaurar a ["superadmin"] cuando exista el rol en producción.
    await requireUser(req);

    const body = (await req.json()) as CreateTenantBody;
    const id = String(body.id || "")
      .toLowerCase()
      .trim();
    const nombre = String(body.nombre || "").trim();
    const slug = String(body.slug || id).toLowerCase().trim();

    if (!ID_RE.test(id)) {
      return NextResponse.json(
        {
          error:
            "vendorId inválido — usa 2 a 32 caracteres alfanuméricos en minúscula (ej: cafeunion).",
        },
        { status: 400 }
      );
    }
    if (!nombre) {
      return NextResponse.json(
        { error: "Falta el nombre del tenant." },
        { status: 400 }
      );
    }

    const status = STATUS_VALIDOS.includes(body.status as VendorStatus)
      ? (body.status as VendorStatus)
      : "propuesta";
    const plan = (PLAN_VALIDOS as readonly string[]).includes(body.plan as string)
      ? (body.plan as string)
      : "starter";
    const entorno = (ENTORNO_VALIDOS as readonly string[]).includes(
      body.entorno as string
    )
      ? (body.entorno as string)
      : "staging";

    const ref = adminDb.collection("vendors").doc(id);
    const existente = await ref.get();
    if (existente.exists) {
      return NextResponse.json(
        { error: `Ya existe un tenant con id "${id}".` },
        { status: 409 }
      );
    }

    const doc = {
      id,
      nombre,
      slug,
      emoji: String(body.emoji || "🏬").slice(0, 4),
      dominio:
        String(body.dominio || "").trim() ||
        `${slug}.synaptechspa.cl`,
      status,
      plan,
      entorno,
      ownerEmail: String(body.ownerEmail || "").trim() || null,
      nota: String(body.nota || "").trim() || null,
      mrr: Number(body.mrr) || 0,
      activo: true,
      createdAt: FieldValue.serverTimestamp(),
    };
    await ref.set(doc);

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tenants POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
