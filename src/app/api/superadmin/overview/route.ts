import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import { VENDORS } from "@/lib/vendors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;
const VENDOR_DEFECTO = "sushipro";

type FsTimestamp = { toMillis?: () => number };

function toMillis(v: unknown): number | null {
  const t = v as FsTimestamp | undefined;
  return t?.toMillis ? t.toMillis() : null;
}

interface TenantInfo {
  id: string;
  nombre: string;
  emoji: string;
  instagram: string | null;
  activo: boolean;
  origen: "registro" | "firestore"; // de dónde salió el tenant
}

/**
 * Visión multitenant de la plataforma (solo superadmin).
 * Cruza el registro estático de locales (VENDORS) con la colección
 * Firestore `vendors`, y agrega clientes/sellos/canjes/actividad por tenant.
 */
export async function POST(req: NextRequest) {
  try {
    // TEMPORAL (testeo): cualquier usuario autenticado puede ver la consola.
    // Restaurar a requireUser(req, ["superadmin"]) para limitar a superadmin.
    await requireUser(req);

    const ahora = Date.now();

    // --- 1. Reúne los tenants: registro estático + Firestore `vendors` ---
    const tenants = new Map<string, TenantInfo>();
    for (const v of Object.values(VENDORS)) {
      tenants.set(v.id, {
        id: v.id,
        nombre: v.nombre,
        emoji: v.emoji,
        instagram: v.instagram ?? null,
        activo: v.activo,
        origen: "registro",
      });
    }
    try {
      const vendorsSnap = await adminDb.collection("vendors").get();
      vendorsSnap.forEach((d) => {
        const v = d.data() as Record<string, unknown>;
        const existente = tenants.get(d.id);
        tenants.set(d.id, {
          id: d.id,
          nombre: (v.nombre as string) || existente?.nombre || d.id,
          emoji: (v.emoji as string) || existente?.emoji || "🏪",
          instagram: (v.instagram as string) ?? existente?.instagram ?? null,
          activo:
            v.activo !== undefined
              ? !!v.activo
              : existente?.activo ?? true,
          origen: existente ? "registro" : "firestore",
        });
      });
    } catch {
      // Sin colección `vendors`: seguimos solo con el registro estático.
    }

    // Acumuladores por tenant.
    const agg: Record<
      string,
      {
        clientes: number;
        sellos: number;
        sellosHistoricos: number;
        ultimaActividad: number | null;
        eventos7d: number;
        eventos30d: number;
        sellosEntregados: number; // eventos tipo SELLO
        canjesPendientes: number;
        canjesUsados: number;
      }
    > = {};
    const ensure = (id: string) => {
      if (!agg[id]) {
        agg[id] = {
          clientes: 0,
          sellos: 0,
          sellosHistoricos: 0,
          ultimaActividad: null,
          eventos7d: 0,
          eventos30d: 0,
          sellosEntregados: 0,
          canjesPendientes: 0,
          canjesUsados: 0,
        };
      }
      return agg[id];
    };
    for (const id of tenants.keys()) ensure(id);

    // --- 2. Usuarios: clientes y sellos por tenant ---
    const usuariosSnap = await adminDb.collection("usuarios").get();
    let totalUsuarios = 0;
    let totalClientes = 0;
    let totalStaff = 0;
    let sellosPlataforma = 0;

    usuariosSnap.forEach((d) => {
      const u = d.data() as Record<string, unknown>;
      const rol = (u.rol as string) || "cliente";
      const sellos = Number(u.sellos) || 0;
      const histo = Number(u.sellosHistoricos) || 0;
      const sellosLocales = (u.sellosLocales as Record<string, number>) || {};
      totalUsuarios += 1;

      if (rol === "cliente") {
        totalClientes += 1;
        sellosPlataforma += sellos;
      } else {
        totalStaff += 1;
      }

      const desglose = Object.entries(sellosLocales).filter(
        ([, n]) => Number(n) > 0
      );
      if (desglose.length > 0) {
        for (const [vid, n] of desglose) {
          const a = ensure(vid);
          a.sellos += Number(n) || 0;
          if (rol === "cliente") a.clientes += 1;
        }
      } else if (rol === "cliente" && sellos > 0) {
        // Cliente sin desglose: se atribuye al local por defecto.
        const a = ensure(VENDOR_DEFECTO);
        a.sellos += sellos;
        a.clientes += 1;
      }
      if (rol === "cliente" && histo > 0) {
        const vids =
          desglose.length > 0
            ? desglose.map(([vid]) => vid)
            : [VENDOR_DEFECTO];
        // El histórico no está desglosado por local; lo sumamos al/los local(es)
        // donde el cliente tiene sellos (aprox. razonable mientras sea 1 local).
        for (const vid of vids) ensure(vid).sellosHistoricos += histo / vids.length;
      }
    });

    // --- 3. Actividad por tenant desde system_logs ---
    try {
      const logsSnap = await adminDb
        .collection("system_logs")
        .orderBy("fecha", "desc")
        .limit(3000)
        .get();
      logsSnap.forEach((d) => {
        const l = d.data() as Record<string, unknown>;
        const vid = (l.vendorId as string) || VENDOR_DEFECTO;
        const ms = toMillis(l.fecha);
        if (ms == null) return;
        const a = ensure(vid);
        if (a.ultimaActividad == null || ms > a.ultimaActividad) {
          a.ultimaActividad = ms;
        }
        if (ahora - ms < 7 * DIA_MS) a.eventos7d += 1;
        if (ahora - ms < 30 * DIA_MS) a.eventos30d += 1;
        if (l.tipo === "SELLO") a.sellosEntregados += 1;
      });
    } catch {
      // sin índice/orden: omitimos actividad temporal
    }

    // --- 4. Canjes por tenant ---
    try {
      const canjesSnap = await adminDb
        .collection("canjes")
        .limit(3000)
        .get();
      canjesSnap.forEach((d) => {
        const c = d.data() as Record<string, unknown>;
        const vid = (c.vendorId as string) || VENDOR_DEFECTO;
        const a = ensure(vid);
        if (c.status === "pending") a.canjesPendientes += 1;
        else if (c.status === "redeemed") a.canjesUsados += 1;
      });
    } catch {
      // colección puede no existir
    }

    // --- 5. Arma la respuesta por tenant ---
    const lista = Array.from(tenants.values()).map((t) => {
      const a = ensure(t.id);
      const operativo = t.activo && a.eventos7d > 0;
      return {
        id: t.id,
        nombre: t.nombre,
        emoji: t.emoji,
        instagram: t.instagram,
        activo: t.activo,
        origen: t.origen,
        operativo,
        clientes: a.clientes,
        sellos: a.sellos,
        sellosHistoricos: Math.round(a.sellosHistoricos),
        sellosEntregados: a.sellosEntregados,
        canjesPendientes: a.canjesPendientes,
        canjesUsados: a.canjesUsados,
        ultimaActividad: a.ultimaActividad,
        eventos7d: a.eventos7d,
        eventos30d: a.eventos30d,
      };
    });

    // Tenants sin tenant-info pero con datos (ej. vendorId huérfano en logs).
    for (const [id, a] of Object.entries(agg)) {
      if (tenants.has(id)) continue;
      if (a.clientes === 0 && a.eventos30d === 0 && a.sellos === 0) continue;
      lista.push({
        id,
        nombre: id,
        emoji: "❓",
        instagram: null,
        activo: false,
        origen: "firestore",
        operativo: false,
        clientes: a.clientes,
        sellos: a.sellos,
        sellosHistoricos: Math.round(a.sellosHistoricos),
        sellosEntregados: a.sellosEntregados,
        canjesPendientes: a.canjesPendientes,
        canjesUsados: a.canjesUsados,
        ultimaActividad: a.ultimaActividad,
        eventos7d: a.eventos7d,
        eventos30d: a.eventos30d,
      });
    }

    // Orden: operativos primero, luego por nº de clientes.
    lista.sort(
      (x, y) =>
        Number(y.operativo) - Number(x.operativo) || y.clientes - x.clientes
    );

    return NextResponse.json({
      plataforma: {
        tenantsTotales: lista.length,
        tenantsOperativos: lista.filter((t) => t.operativo).length,
        totalUsuarios,
        totalClientes,
        totalStaff,
        sellosPlataforma,
        canjesPendientes: lista.reduce((s, t) => s + t.canjesPendientes, 0),
      },
      tenants: lista,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/overview", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
