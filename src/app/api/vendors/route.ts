import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { VENDORS } from "@/lib/vendors";
import type { ProspectoRubro, Vendor, VendorStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =========================================================
// Directorio público del marketplace (/explora).
//
// Fusiona dos fuentes:
//   1. El registro estático `VENDORS` (tenants con app completa: theme,
//      dominio en el middleware, logos).
//   2. La colección Firestore `vendors/{id}` que escribe el panel superadmin
//      — el "overlay" prometido en tenants/route.ts. Un tenant creado desde
//      el panel aparece en el directorio SIN deploy.
//
// Regla de merge: Firestore pisa al estático campo a campo (el panel es la
// fuente viva); lo que Firestore no define cae al estático o a defaults.
// Solo expone datos públicos de marca — nada comercial (plan/mrr/notas).
// =========================================================

/** Campos que puede traer el doc Firestore `vendors/{id}` (flat). */
interface VendorDoc {
  nombre?: string;
  slug?: string;
  emoji?: string;
  status?: VendorStatus;
  activo?: boolean;
  instagram?: string | null;
  whatsapp?: string | null;
  rubro?: ProspectoRubro | null;
  zona?: string | null;
  sellosParaPremio?: number;
  primaryColor?: string | null;
  primaryHsl?: string | null;
  clubName?: string | null;
  joinDescription?: string | null;
  emojis?: string | null;
}

function docToVendor(id: string, d: VendorDoc, base?: Vendor): Vendor {
  const nombre = d.nombre || base?.nombre || id;
  const emoji = d.emoji || base?.emoji || "🏬";
  return {
    id,
    nombre,
    slug: d.slug || base?.slug || id,
    instagram: d.instagram ?? base?.instagram,
    whatsapp: d.whatsapp ?? base?.whatsapp,
    emoji,
    sellosParaPremio:
      Number(d.sellosParaPremio) > 0
        ? Number(d.sellosParaPremio)
        : base?.sellosParaPremio ?? 10,
    activo: d.activo ?? base?.activo ?? true,
    status: d.status || base?.status || "por_presentar",
    rubro: d.rubro || base?.rubro,
    zona: d.zona || base?.zona,
    demo: base?.demo,
    theme: {
      primaryColor: d.primaryColor || base?.theme.primaryColor || "#4f46e5",
      primaryHsl: d.primaryHsl || base?.theme.primaryHsl || "252 30% 62%",
      logoUrl: base?.theme.logoUrl || "/logos/sushipro.svg",
      logoWidth: base?.theme.logoWidth || 128,
    },
    copy: {
      clubName:
        d.clubName || base?.copy.clubName || `${nombre.toUpperCase()} CLUB`,
      joinDescription:
        d.joinDescription ||
        base?.copy.joinDescription ||
        "Junta sellos con cada visita y canjea premios del local.",
      emojis: d.emojis || base?.copy.emojis || emoji,
    },
  };
}

/** GET → clubes visibles en el directorio (público, sin auth). */
export async function GET() {
  const merged = new Map<string, Vendor>();
  for (const v of Object.values(VENDORS)) merged.set(v.id, v);

  // El overlay de Firestore es best-effort: si Admin SDK no está configurado
  // (dev sin .env.local), el directorio igual responde con el estático.
  try {
    const snap = await adminDb.collection("vendors").get();
    for (const doc of snap.docs) {
      merged.set(
        doc.id,
        docToVendor(doc.id, doc.data() as VendorDoc, merged.get(doc.id))
      );
    }
  } catch (e) {
    console.error("api/vendors: overlay Firestore no disponible", e);
  }

  const vendors = Array.from(merged.values()).filter(
    (v) =>
      v.activo && (v.status === "funcionando" || v.status === "por_presentar")
  );

  return NextResponse.json({ vendors });
}
