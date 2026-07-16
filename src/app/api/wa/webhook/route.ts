import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EvoWebhook {
  instance?: string;
  event?: string;
  data?: {
    state?: string;
    connection?: string;
    wuid?: string;
    me?: { id?: string };
    key?: { remoteJid?: string; fromMe?: boolean };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    pushName?: string;
  };
}

/** Pararrayos del VPS Evolution para las instancias de SushiPro (sp_*). */
export async function POST(req: NextRequest) {
  if (req.headers.get("x-webhook-token") !== process.env.EVOLUTION_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as EvoWebhook;
    const instance = body.instance || "";
    const vendorId = instance.replace(/^sp_/, "");
    const event = String(body.event || "").toLowerCase();
    if (!vendorId) return NextResponse.json({ ok: true });

    if (event === "connection.update") {
      const state = body.data?.state || body.data?.connection;
      if (state === "open") {
        const numero = body.data?.wuid || body.data?.me?.id || null;
        await adminDb.doc(`wa_config/${vendorId}`).set(
          {
            estado: "connected",
            numeroVinculado: numero ? String(numero).replace(/[:@].*$/, "") : null,
            conectadoEn: FieldValue.serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      } else if (state === "close") {
        await adminDb.doc(`wa_config/${vendorId}`).set({ estado: "disconnected" }, { merge: true }).catch(() => {});
      }
    }

    // messages.upsert → opt-out (STOP/BAJA). Si el cliente pide baja, lo marcamos
    // por teléfono en wa_optout/{tel}; la reactivación lo salta. Anti-spam legal.
    if (event === "messages.upsert" && body.data?.key?.fromMe !== true) {
      const raw = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
      const texto = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (/\b(stop|baja|dar de baja|no molestar|no quiero|salir|desuscribir|cancelar suscripcion)\b/.test(texto)) {
        const tel = String(body.data?.key?.remoteJid || "").replace(/[:@].*$/, "");
        if (tel) {
          await adminDb
            .doc(`wa_optout/${tel}`)
            .set({ tel, vendorId, ts: FieldValue.serverTimestamp() }, { merge: true })
            .catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("wa/webhook", e);
    return NextResponse.json({ ok: true });
  }
}
