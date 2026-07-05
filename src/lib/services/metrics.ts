import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Cuota de un servicio de infraestructura.
 * `iconKey` es un identificador de string; el cliente lo mapea a un ícono
 * de lucide para evitar enviar componentes React desde el servidor.
 */
export interface QuotaRow {
  service: string;
  usage: number;
  limit: number;
  unit: string;
  iconKey: "firestore" | "auth" | "functions" | "vercel";
}

/**
 * TODO — Conectar a métricas reales:
 *   - Firestore reads/writes:  Cloud Monitoring API
 *     https://cloud.google.com/monitoring/api/metrics_gcp#gcp-firestore
 *   - Auth users totales:      adminAuth.listUsers() (paginado) o Analytics API
 *   - Cloud Functions:         Cloud Monitoring API (execution_count)
 *   - Vercel Functions:        Vercel Analytics API (requires VERCEL_TOKEN)
 *     https://vercel.com/docs/rest-api/reference/endpoints/analytics
 *
 * Mientras tanto devolvemos valores plausibles para poder testear la UI.
 */
export async function getInfraQuotas(): Promise<QuotaRow[]> {
  return [
    { service: "Firestore reads / día", usage: 1_048_590, limit: 5_000_000, unit: "req", iconKey: "firestore" },
    { service: "Firestore writes / día", usage: 118_260, limit: 1_000_000, unit: "req", iconKey: "firestore" },
    { service: "Auth users totales", usage: 1_917, limit: 50_000, unit: "u", iconKey: "auth" },
    { service: "Cloud Functions / mes", usage: 214_820, limit: 2_000_000, unit: "inv", iconKey: "functions" },
    { service: "Vercel Functions / mes", usage: 82_140, limit: 1_000_000, unit: "inv", iconKey: "vercel" },
  ];
}

/**
 * Agrega los últimos 30 días de `system_logs` por día (todos los tenants).
 * Devuelve un array de 30 conteos, index 0 = hace 29 días, index 29 = hoy.
 */
export async function getRequestsSparkline(): Promise<number[]> {
  const dias = 30;
  const bins = new Array<number>(dias).fill(0);
  const hoyStart = new Date();
  hoyStart.setHours(0, 0, 0, 0);
  const desdeMs = hoyStart.getTime() - (dias - 1) * DIA_MS;

  try {
    const snap = await adminDb
      .collection("system_logs")
      .where("fecha", ">=", new Date(desdeMs))
      .get();
    snap.forEach((d) => {
      const raw = (d.data() as { fecha?: { toMillis?: () => number } }).fecha;
      const ms = raw?.toMillis?.();
      if (!ms) return;
      const idx = Math.floor((ms - desdeMs) / DIA_MS);
      if (idx >= 0 && idx < dias) bins[idx] += 1;
    });
  } catch {
    // sin colección/índice: caemos al array de ceros
  }

  return bins;
}

export interface Incident {
  id: string;
  titulo: string;
  descripcion: string;
  severidad: "critical" | "warning" | "info";
  vendorId: string | null;
  createdAt: number; // epoch ms
}

/**
 * Lee incidentes activos desde `incidents` de Firestore.
 * Documento esperado:
 *   { titulo, descripcion, severidad: "critical"|"warning"|"info",
 *     vendorId?, resolvedAt?, createdAt: Timestamp }
 * Los que tengan `resolvedAt` se filtran.
 */
export async function getIncidents(): Promise<Incident[]> {
  try {
    const snap = await adminDb
      .collection("incidents")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const list: Incident[] = [];
    snap.forEach((d) => {
      const raw = d.data() as Record<string, unknown>;
      if (raw.resolvedAt) return;
      const createdAt =
        (raw.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      list.push({
        id: d.id,
        titulo: String(raw.titulo || "Sin título"),
        descripcion: String(raw.descripcion || ""),
        severidad:
          raw.severidad === "critical" || raw.severidad === "warning"
            ? raw.severidad
            : "info",
        vendorId: (raw.vendorId as string) ?? null,
        createdAt,
      });
    });
    return list;
  } catch {
    return [];
  }
}
