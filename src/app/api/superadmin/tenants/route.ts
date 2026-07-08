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
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

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

interface PatchTenantBody {
  id?: unknown;
  // Identidad
  nombre?: unknown;
  slug?: unknown;
  emoji?: unknown;
  dominio?: unknown;
  instagram?: unknown;
  whatsapp?: unknown;
  // Comercial / operacional
  status?: unknown;
  plan?: unknown;
  entorno?: unknown;
  activo?: unknown;
  mrr?: unknown;
  ownerEmail?: unknown;
  nota?: unknown;
  // Marca (persiste en Firestore para overlay futuro sobre VENDORS)
  primaryColor?: unknown;
  primaryHsl?: unknown;
  clubName?: unknown;
  joinDescription?: unknown;
  emojis?: unknown;
  sellosParaPremio?: unknown;
}

/**
 * Update parcial del tenant.
 *
 * Usa `set({...}, {merge: true})` para que también funcione en tenants que solo
 * existen en el registro estático `VENDORS` y todavía no tienen doc en Firestore
 * — sin esto el update fallaba con 404 y el UI hacía rollback al viejo status.
 *
 * Todos los campos son opcionales; solo se persisten los que llegan validados.
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireUser(req);
    const body = (await req.json()) as PatchTenantBody;
    const id = String(body.id || "").toLowerCase().trim();
    if (!ID_RE.test(id)) {
      return NextResponse.json(
        { error: "Identificador inválido." },
        { status: 400 }
      );
    }

    // Armamos el payload solo con los campos válidos que llegaron.
    const payload: Record<string, unknown> = {};

    const setStr = (key: keyof PatchTenantBody, max = 200) => {
      const raw = body[key];
      if (raw === undefined) return;
      const s = String(raw).trim().slice(0, max);
      payload[key] = s || null;
    };

    // Identidad
    if (body.nombre !== undefined) {
      const n = String(body.nombre).trim().slice(0, 80);
      if (!n) {
        return NextResponse.json({ error: "El nombre no puede quedar vacío." }, { status: 400 });
      }
      payload.nombre = n;
    }
    if (body.slug !== undefined) {
      const s = String(body.slug).toLowerCase().trim();
      if (!ID_RE.test(s)) {
        return NextResponse.json({ error: "Slug inválido (2-32 alfanuméricos en minúscula)." }, { status: 400 });
      }
      payload.slug = s;
    }
    if (body.emoji !== undefined) payload.emoji = String(body.emoji || "🏬").slice(0, 4);
    setStr("dominio", 120);
    setStr("instagram", 60);
    setStr("whatsapp", 20);

    // Comercial
    if (body.status !== undefined) {
      if (!STATUS_VALIDOS.includes(body.status as VendorStatus)) {
        return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
      }
      payload.status = body.status;
    }
    if (body.plan !== undefined) {
      if (!(PLAN_VALIDOS as readonly string[]).includes(String(body.plan))) {
        return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
      }
      payload.plan = body.plan;
    }
    if (body.entorno !== undefined) {
      if (!(ENTORNO_VALIDOS as readonly string[]).includes(String(body.entorno))) {
        return NextResponse.json({ error: "Entorno inválido." }, { status: 400 });
      }
      payload.entorno = body.entorno;
    }
    if (body.activo !== undefined) payload.activo = !!body.activo;
    if (body.mrr !== undefined) {
      const n = Number(body.mrr);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "MRR inválido." }, { status: 400 });
      }
      payload.mrr = Math.round(n);
    }
    setStr("ownerEmail", 120);
    setStr("nota", 500);

    // Marca (guardado como campos flat — se leerán en un overlay futuro)
    if (body.primaryColor !== undefined) {
      const c = String(body.primaryColor).trim();
      if (c && !HEX_RE.test(c)) {
        return NextResponse.json({ error: "Color primario debe ser hex #RRGGBB." }, { status: 400 });
      }
      payload.primaryColor = c || null;
    }
    setStr("primaryHsl", 40);
    setStr("clubName", 60);
    setStr("joinDescription", 240);
    setStr("emojis", 20);
    if (body.sellosParaPremio !== undefined) {
      const n = Number(body.sellosParaPremio);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return NextResponse.json({ error: "Sellos para premio debe ser 1-100." }, { status: 400 });
      }
      payload.sellosParaPremio = n;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    const ref = adminDb.collection("vendors").doc(id);
    const snap = await ref.get();
    payload.updatedAt = FieldValue.serverTimestamp();
    if (!snap.exists) {
      // Primer write para este tenant (viene del registro estático).
      payload.id = id;
      payload.createdAt = FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });
    return NextResponse.json({ ok: true, created: !snap.exists });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/tenants PATCH", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
