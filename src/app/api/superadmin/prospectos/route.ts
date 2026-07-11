import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { MERCADO_VINA, PLAN_MRR } from "@/lib/mercadoVina";
import type {
  Prospecto,
  ProspectoEstado,
  ProspectoPrioridad,
  ProspectoRubro,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUENTE_SEED = "Análisis de mercado Viña del Mar · julio 2026";

const ESTADOS: ProspectoEstado[] = [
  "por_contactar",
  "contactado",
  "reunion",
  "propuesta_enviada",
  "convertido",
  "descartado",
];
const PRIORIDADES: ProspectoPrioridad[] = ["alta", "media", "baja"];

function tsToMs(v: unknown): number | null {
  const t = v as { toMillis?: () => number } | undefined;
  return t?.toMillis ? t.toMillis() : null;
}

/** Documento en Firestore `prospectos/{id}`. */
interface ProspectoDoc {
  nombre?: string;
  rubro?: ProspectoRubro;
  zona?: string;
  direccion?: string | null;
  notas?: string | null;
  prioridad?: ProspectoPrioridad;
  planSugerido?: string;
  mrrPotencial?: number;
  estado?: ProspectoEstado;
  fuente?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp | null;
}

function mapDoc(id: string, raw: ProspectoDoc): Prospecto {
  return {
    id,
    nombre: String(raw.nombre || ""),
    rubro: (raw.rubro || "restaurante") as ProspectoRubro,
    zona: String(raw.zona || ""),
    direccion: raw.direccion ?? null,
    notas: raw.notas ?? null,
    prioridad: (raw.prioridad || "media") as ProspectoPrioridad,
    planSugerido: String(raw.planSugerido || "starter"),
    mrrPotencial: Number(raw.mrrPotencial || 0),
    estado: (raw.estado || "por_contactar") as ProspectoEstado,
    fuente: raw.fuente ?? null,
    createdAt: tsToMs(raw.createdAt) ?? 0,
    updatedAt: tsToMs(raw.updatedAt),
  };
}

/**
 * Seed one-shot: si la colección está vacía, la puebla con el análisis de
 * mercado de Viña del Mar. Después Firestore es la fuente de verdad — borrar
 * o editar un prospecto NO lo re-crea (solo se re-siembra si se vacía todo).
 */
async function seedIfEmpty(): Promise<boolean> {
  const probe = await adminDb.collection("prospectos").limit(1).get();
  if (!probe.empty) return false;

  const batch = adminDb.batch();
  for (const p of MERCADO_VINA) {
    const ref = adminDb.collection("prospectos").doc(p.id);
    batch.set(ref, {
      nombre: p.nombre,
      rubro: p.rubro,
      zona: p.zona,
      direccion: p.direccion,
      notas: p.notas,
      prioridad: p.prioridad,
      planSugerido: p.planSugerido,
      mrrPotencial: PLAN_MRR[p.planSugerido] ?? PLAN_MRR.starter,
      estado: "por_contactar" satisfies ProspectoEstado,
      fuente: FUENTE_SEED,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: null,
    });
  }
  await batch.commit();
  return true;
}

/** GET → lista completa de prospectos (siembra el mercado si está vacío). */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const seeded = await seedIfEmpty();
    const snap = await adminDb.collection("prospectos").get();
    const prospectos = snap.docs.map((d) =>
      mapDoc(d.id, d.data() as ProspectoDoc)
    );
    return NextResponse.json({ prospectos, seeded });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/prospectos GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

interface CreateBody {
  nombre?: unknown;
  rubro?: unknown;
  zona?: unknown;
  direccion?: unknown;
  notas?: unknown;
  prioridad?: unknown;
  planSugerido?: unknown;
  mrrPotencial?: unknown;
}

/** POST → agrega un prospecto manual al mercado. */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = (await req.json()) as CreateBody;

    const nombre = String(body.nombre || "").trim();
    if (!nombre || nombre.length > 120) {
      return NextResponse.json(
        { error: "El nombre es requerido (máx 120 caracteres)." },
        { status: 400 }
      );
    }
    const rubro = String(body.rubro || "restaurante") as ProspectoRubro;
    const prioridad = PRIORIDADES.includes(body.prioridad as ProspectoPrioridad)
      ? (body.prioridad as ProspectoPrioridad)
      : "media";
    const planSugerido = String(body.planSugerido || "starter");
    const mrrRaw = Number(body.mrrPotencial);
    const mrrPotencial =
      Number.isFinite(mrrRaw) && mrrRaw >= 0
        ? Math.round(mrrRaw)
        : PLAN_MRR[planSugerido] ?? PLAN_MRR.starter;

    const ref = adminDb.collection("prospectos").doc();
    await ref.set({
      nombre,
      rubro,
      zona: String(body.zona || "Viña del Mar").trim(),
      direccion: body.direccion ? String(body.direccion).trim() : null,
      notas: body.notas ? String(body.notas).trim() : null,
      prioridad,
      planSugerido,
      mrrPotencial,
      estado: "por_contactar" satisfies ProspectoEstado,
      fuente: "Carga manual",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: null,
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/prospectos POST", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

interface PatchBody {
  id?: unknown;
  estado?: unknown;
  prioridad?: unknown;
  notas?: unknown;
  planSugerido?: unknown;
  mrrPotencial?: unknown;
}

/** PATCH → actualiza etapa comercial, prioridad, notas o MRR estimado. */
export async function PATCH(req: NextRequest) {
  try {
    await requireUser(req);
    const body = (await req.json()) as PatchBody;
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Falta el id." }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (body.estado !== undefined) {
      if (!ESTADOS.includes(body.estado as ProspectoEstado)) {
        return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
      }
      update.estado = body.estado;
    }
    if (body.prioridad !== undefined) {
      if (!PRIORIDADES.includes(body.prioridad as ProspectoPrioridad)) {
        return NextResponse.json(
          { error: "Prioridad inválida." },
          { status: 400 }
        );
      }
      update.prioridad = body.prioridad;
    }
    if (body.notas !== undefined) {
      update.notas = body.notas ? String(body.notas).trim() : null;
    }
    if (body.planSugerido !== undefined) {
      update.planSugerido = String(body.planSugerido || "starter");
    }
    if (body.mrrPotencial !== undefined) {
      const n = Number(body.mrrPotencial);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "MRR inválido." }, { status: 400 });
      }
      update.mrrPotencial = Math.round(n);
    }

    const ref = adminDb.collection("prospectos").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Prospecto no encontrado." },
        { status: 404 }
      );
    }
    await ref.update(update);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/prospectos PATCH", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** DELETE → elimina un prospecto (?id=...). */
export async function DELETE(req: NextRequest) {
  try {
    await requireUser(req);
    const id = req.nextUrl.searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ error: "Falta el id." }, { status: 400 });
    }
    await adminDb.collection("prospectos").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/prospectos DELETE", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
