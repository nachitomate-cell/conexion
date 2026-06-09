import { NextRequest, NextResponse } from "next/server";
import { enviarNotificacionesSegmentadas } from "@/lib/notificaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cronAutorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sin secreto configurado (dev) → permitir
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Cron 13:00 UTC — recordatorio de la mañana.
export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const resultado = await enviarNotificacionesSegmentadas("manana");
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    console.error("cron/daily-notifications", e);
    return NextResponse.json({ error: "Error en el cron" }, { status: 500 });
  }
}
