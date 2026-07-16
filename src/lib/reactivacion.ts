import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as evo from "@/lib/evolution";
import { generatePromoMessage } from "@/ai/flows/generatePromoMessage";
import { logEvolutionSend } from "@/lib/metrics";

// Reactivación 1-a-1 personalizada por WhatsApp (bajo riesgo de ban): detecta
// clientes "quiet" (no vienen hace un rato pero no perdidos), con opt-in, y les
// manda UN mensaje personalizado por el número del local. Throttle + cuota.

const DIAS_MIN = 15; // "quiet" desde este umbral
const DIAS_MAX = 90; // más allá se considera perdido (no molestar)
const MAX_POR_CORRIDA = 20; // throttle duro por vendor por corrida
const RECONTACTO_DIAS = 21; // no re-contactar dentro de este período
const CUOTA_DEFAULT = 100; // envíos/mes si el vendor no la definió

const DAY_MS = 86_400_000;

function normalizeCl(phone: string): string | null {
  const n = String(phone || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.length === 11 && n.startsWith("569")) return n;
  if (n.length === 9 && n.startsWith("9")) return "56" + n;
  if (n.length === 8) return "569" + n;
  return n.startsWith("56") ? n : "56" + n;
}

function millis(v: unknown): number {
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

interface Candidato {
  uid: string;
  nombre: string;
  telefono: string;
  sellos: number;
  diasSinVisita: number;
}

/** Corre la reactivación para un vendor. Devuelve cuántos mensajes envió. */
export async function reactivarVendor(vendorId: string, nombreLocal: string): Promise<number> {
  const name = evo.instanceName(vendorId);
  const ahora = Date.now();
  const minMs = ahora - DIAS_MAX * DAY_MS; // ultimaVisita debe ser MÁS reciente que esto
  const maxMs = ahora - DIAS_MIN * DAY_MS; // y MÁS vieja que esto
  const reMs = ahora - RECONTACTO_DIAS * DAY_MS;

  // ── Candidatos: clientes con opt-in, teléfono y última visita en la ventana ──
  const snap = await adminDb.collection("usuarios").where("rol", "==", "cliente").get();
  const candidatos: Candidato[] = [];
  snap.forEach((d) => {
    const u = d.data();
    if (u.baneado === true) return;
    if (u.waOptOut === true) return;              // dijo STOP
    if (u.waOptInMarketing !== true) return;      // opt-in explícito (legal)
    const tel = normalizeCl(String(u.telefono || ""));
    if (!tel) return;
    const uv = millis(u.ultimaVisita);
    if (!uv || uv < minMs || uv > maxMs) return;  // fuera de la ventana quiet
    if (millis(u.waUltimoContacto) > reMs) return; // contactado hace poco
    candidatos.push({
      uid: d.id,
      nombre: String(u.nombre || ""),
      telefono: tel,
      sellos: Number(u.sellos) || 0,
      diasSinVisita: Math.floor((ahora - uv) / DAY_MS),
    });
  });
  if (!candidatos.length) return 0;

  // ── Excluir opt-outs (STOP) por teléfono ──
  const optSnap = await adminDb.collection("wa_optout").get();
  const optOut = new Set<string>();
  optSnap.forEach((d) => optOut.add(d.id));
  const elegibles = candidatos.filter((c) => !optOut.has(c.telefono));
  if (!elegibles.length) return 0;

  // ── Cuota mensual ──
  const mes = new Date().toISOString().slice(0, 7);
  const cfg = (await adminDb.doc(`wa_config/${vendorId}`).get()).data() || {};
  const cuota = Number(cfg.cuotaMensual) || CUOTA_DEFAULT;
  const usados = Number((cfg.enviosPorMes || {})[mes]) || 0;
  const restanteCuota = Math.max(0, cuota - usados);

  const lote = elegibles.slice(0, Math.min(MAX_POR_CORRIDA, restanteCuota));
  let enviados = 0;

  for (const c of lote) {
    try {
      const promo = await generatePromoMessage({
        userName: c.nombre.split(" ")[0] || "hola",
        sellosCount: c.sellos,
        diasSinVisita: c.diasSinVisita,
        context: `Local: ${nombreLocal}. Reactivación por WhatsApp — cálido, breve, invítalo a volver.`,
      });
      // pacing con jitter (5-8s de "escribiendo…") para verse orgánico
      await evo.enviarTexto(name, c.telefono, promo.message, 5000 + Math.floor(Math.random() * 3000));

      await adminDb.collection("wa_sends").add({
        vendorId, uid: c.uid, telefono: c.telefono, tipo: "reactivacion",
        texto: promo.message, ts: FieldValue.serverTimestamp(),
      });
      await adminDb.doc(`usuarios/${c.uid}`).set({ waUltimoContacto: FieldValue.serverTimestamp() }, { merge: true });
      await logEvolutionSend(vendorId, "reactivacion", true);
      enviados++;
    } catch (e) {
      console.error(`[reactivacion] ${vendorId}/${c.uid}:`, (e as Error).message);
      await logEvolutionSend(vendorId, "reactivacion", false);
    }
  }

  if (enviados > 0) {
    await adminDb.doc(`wa_config/${vendorId}`).set(
      { enviosPorMes: { [mes]: FieldValue.increment(enviados) } },
      { merge: true }
    ).catch(() => {});
  }
  return enviados;
}
