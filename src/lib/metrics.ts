import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// Instrumentación para el dashboard ops.synaptechspa.cl.
// Contadores diarios planos en _metrics/* (fáciles de leer y graficar).

// Precio aprox. por millón de tokens (USD) para estimar costo de Claude.
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Registra uso de Claude (tokens + costo estimado). */
export async function logAiUsage(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const p = PRICE[model] || { in: 1, out: 5 };
  const costUsd = (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
  await adminDb
    .doc(`_metrics/ai_${hoy()}`)
    .set(
      {
        proyecto: "sushipro",
        llamadas: FieldValue.increment(1),
        tokensIn: FieldValue.increment(inputTokens),
        tokensOut: FieldValue.increment(outputTokens),
        costUsd: FieldValue.increment(costUsd),
        actualizado: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .catch(() => {});
}

/** Registra un envío de WhatsApp por Evolution (para conteos del dashboard). */
export async function logEvolutionSend(
  vendorId: string,
  tipo: string,
  ok: boolean
): Promise<void> {
  const key = `${tipo}_${ok ? "ok" : "fail"}`;
  await Promise.all([
    adminDb.doc(`_metrics/wa_${hoy()}`).set(
      {
        proyecto: "sushipro",
        total: FieldValue.increment(1),
        [key]: FieldValue.increment(1),
        actualizado: FieldValue.serverTimestamp(),
      },
      { merge: true }
    ),
    adminDb.doc(`_metrics/wa_vendor_${vendorId}`).set(
      {
        vendorId,
        [tipo]: FieldValue.increment(1),
        ultimoEnvio: FieldValue.serverTimestamp(),
      },
      { merge: true }
    ),
  ]).catch(() => {});
}
