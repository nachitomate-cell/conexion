import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { VENDORS } from "@/lib/vendors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

type FsTimestamp = { toMillis?: () => number };

function toMillis(v: unknown): number | null {
  const t = v as FsTimestamp | undefined;
  return t?.toMillis ? t.toMillis() : null;
}

/**
 * Métricas reales del club para el panel /admin (solo admin).
 * Devuelve: resumen global, estado de cada local y la lista de clientes
 * con sus datos. Todo se calcula en el servidor con el Admin SDK.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req, ["admin"]);

    const ahora = Date.now();

    // --- Usuarios ---
    const usuariosSnap = await adminDb.collection("usuarios").get();

    // Acumuladores por local (multitenant).
    const localAgg: Record<
      string,
      { clientes: number; sellos: number; sellosHistoricos: number }
    > = {};
    for (const id of Object.keys(VENDORS)) {
      localAgg[id] = { clientes: 0, sellos: 0, sellosHistoricos: 0 };
    }

    let totalClientes = 0;
    let totalStaff = 0;
    let totalBaneados = 0;
    let sellosActuales = 0;
    let sellosHistoricos = 0;
    let nuevos7d = 0;

    const clientes: Record<string, unknown>[] = [];

    usuariosSnap.forEach((d) => {
      const u = d.data() as Record<string, unknown>;
      const rol = (u.rol as string) || "cliente";
      const sellos = Number(u.sellos) || 0;
      const histo = Number(u.sellosHistoricos) || 0;
      const sellosLocales = (u.sellosLocales as Record<string, number>) || {};
      const createdMs = toMillis(u.createdAt);

      if (rol === "cliente") {
        totalClientes += 1;
        sellosActuales += sellos;
        sellosHistoricos += histo;
        if (u.baneado) totalBaneados += 1;
        if (createdMs && ahora - createdMs < 7 * DIA_MS) nuevos7d += 1;

        clientes.push({
          uid: d.id,
          nombre: u.nombre ?? "",
          email: u.email ?? "",
          telefono: u.telefono ?? "",
          comuna: u.comuna ?? "",
          fechaNacimiento: u.fechaNacimiento ?? "",
          sellos,
          sellosHistoricos: histo,
          rachaActual: Number(u.rachaActual) || 0,
          baneado: !!u.baneado,
          sellosLocales,
          ultimaVisita: toMillis(u.ultimaVisita),
          createdAt: createdMs,
        });
      } else if (rol !== "cliente") {
        totalStaff += 1;
      }

      // Reparte los sellos por local. Si no hay sellosLocales, atribuye al
      // vendor por defecto para no perder el dato del único local actual.
      const tieneDesglose = Object.keys(sellosLocales).length > 0;
      if (tieneDesglose) {
        for (const [vid, val] of Object.entries(sellosLocales)) {
          if (!localAgg[vid]) {
            localAgg[vid] = { clientes: 0, sellos: 0, sellosHistoricos: 0 };
          }
          const n = Number(val) || 0;
          if (n > 0 && rol === "cliente") localAgg[vid].clientes += 1;
          localAgg[vid].sellos += n;
        }
      } else if (rol === "cliente" && sellos > 0) {
        const vid = "sushipro";
        if (!localAgg[vid]) {
          localAgg[vid] = { clientes: 0, sellos: 0, sellosHistoricos: 0 };
        }
        localAgg[vid].clientes += 1;
        localAgg[vid].sellos += sellos;
      }
    });

    // Ordena clientes por sellos históricos desc (los más fieles primero).
    clientes.sort(
      (a, b) => (b.sellosHistoricos as number) - (a.sellosHistoricos as number)
    );

    // --- Actividad por local (system_logs recientes) ---
    const ultimaActividad: Record<string, number | null> = {};
    const eventos7d: Record<string, number> = {};
    const eventos30d: Record<string, number> = {};
    try {
      const logsSnap = await adminDb
        .collection("system_logs")
        .orderBy("fecha", "desc")
        .limit(2000)
        .get();
      logsSnap.forEach((d) => {
        const l = d.data() as Record<string, unknown>;
        const vid = (l.vendorId as string) || "sushipro";
        const ms = toMillis(l.fecha);
        if (ms == null) return;
        if (ultimaActividad[vid] == null || ms > (ultimaActividad[vid] as number)) {
          ultimaActividad[vid] = ms;
        }
        if (ahora - ms < 7 * DIA_MS) eventos7d[vid] = (eventos7d[vid] || 0) + 1;
        if (ahora - ms < 30 * DIA_MS) eventos30d[vid] = (eventos30d[vid] || 0) + 1;
      });
    } catch {
      // Si falta el índice/orden, seguimos sin actividad temporal.
    }

    // --- Canjes pendientes (vouchers vivos) ---
    let canjesPendientes = 0;
    try {
      const canjesSnap = await adminDb
        .collection("canjes")
        .where("status", "==", "pending")
        .limit(500)
        .get();
      canjesPendientes = canjesSnap.size;
    } catch {
      // colección puede no existir aún
    }

    // --- Arma el detalle de cada local ---
    const locales = Object.values(VENDORS).map((v) => {
      const agg = localAgg[v.id] || { clientes: 0, sellos: 0 };
      const ult = ultimaActividad[v.id] ?? null;
      const e7 = eventos7d[v.id] || 0;
      // "Activo de verdad" = marcado activo y con movimiento en los últimos 7 días.
      const operativo = v.activo && e7 > 0;
      return {
        id: v.id,
        nombre: v.nombre,
        emoji: v.emoji,
        instagram: v.instagram ?? null,
        activo: v.activo,
        operativo,
        clientes: agg.clientes,
        sellos: agg.sellos,
        sellosParaPremio: v.sellosParaPremio,
        ultimaActividad: ult,
        eventos7d: e7,
        eventos30d: eventos30d[v.id] || 0,
      };
    });

    return NextResponse.json({
      resumen: {
        totalClientes,
        totalStaff,
        totalBaneados,
        sellosActuales,
        sellosHistoricos,
        nuevos7d,
        canjesPendientes,
        localesOperativos: locales.filter((l) => l.operativo).length,
        localesTotales: locales.length,
      },
      locales,
      clientes,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin/stats", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
