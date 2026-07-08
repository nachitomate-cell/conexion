import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

const DIA_MS = 24 * 60 * 60 * 1000;

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
