import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { reactivarVendor } from "@/lib/reactivacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron diario: reactiva clientes quiet por WhatsApp en cada vendor activo. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("wa_config").where("reactivacionEnabled", "==", true).get();
  const resultados: Record<string, number> = {};
  for (const d of snap.docs) {
    const data = d.data();
    if (data.estado !== "connected") continue; // solo vendors con WhatsApp conectado
    const vendorId = d.id;
    try {
      resultados[vendorId] = await reactivarVendor(vendorId, String(data.nombreLocal || vendorId));
    } catch (e) {
      console.error("[cron reactivacion]", vendorId, (e as Error).message);
      resultados[vendorId] = -1;
    }
  }
  return NextResponse.json({ ok: true, resultados });
}
