import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resumen de métricas de SushiPro/conexion para el dashboard ops (barbería lo
// consume server-to-server con el header x-ops-token).

function ultimosDias(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-ops-token") !== process.env.OPS_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const dias = ultimosDias(30);
  const [waSnaps, aiSnaps, vendorsSnap] = await Promise.all([
    Promise.all(dias.map((d) => adminDb.doc(`_metrics/wa_${d}`).get())),
    Promise.all(dias.map((d) => adminDb.doc(`_metrics/ai_${d}`).get())),
    adminDb.collection("wa_config").get(),
  ]);

  let mensajes = 0;
  let mensajesOk = 0;
  const porDia: Record<string, number> = {};
  waSnaps.forEach((s, i) => {
    const d = s.data();
    if (!d) return;
    mensajes += Number(d.total) || 0;
    porDia[dias[i]] = Number(d.total) || 0;
    Object.keys(d).forEach((k) => { if (k.endsWith("_ok")) mensajesOk += Number(d[k]) || 0; });
  });

  let costoUsd = 0, tokensIn = 0, tokensOut = 0, llamadas = 0;
  aiSnaps.forEach((s) => {
    const d = s.data();
    if (!d) return;
    costoUsd += Number(d.costUsd) || 0;
    tokensIn += Number(d.tokensIn) || 0;
    tokensOut += Number(d.tokensOut) || 0;
    llamadas += Number(d.llamadas) || 0;
  });

  const locales = vendorsSnap.docs.map((d) => {
    const c = d.data();
    return {
      id: d.id,
      estado: (c.estado as string) || "disconnected",
      reactivacion: c.reactivacionEnabled === true,
      numero: (c.numeroVinculado as string) || null,
    };
  });
  const localesActivos = locales.filter((l) => l.estado === "connected").length;

  return NextResponse.json({
    proyecto: "sushipro",
    localesActivos,
    locales,
    mensajes: { total: mensajes, ok: mensajesOk, porDia },
    claude: { costoUsd, tokensIn, tokensOut, llamadas },
    dias: 30,
  });
}
