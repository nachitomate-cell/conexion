import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import type { TeamRole } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AdminRow {
  uid: string;
  email: string;
  nombre: string;
  teamRole: TeamRole;
}

interface TeamMemberDoc {
  email?: string;
  nombre?: string;
  teamRole?: TeamRole;
  createdAt?: Timestamp;
}

/**
 * Lista los miembros del equipo para el selector "Asignar a…" del módulo de
 * Tareas. Fuente única: colección `team_members`.
 *
 * Auto-seed: si el llamador es admin/superadmin y no está en la colección,
 * se agrega. Así no hace falta pre-poblar manualmente para que el dueño
 * seedeado se vea a sí mismo en el select.
 */
export async function GET(req: NextRequest) {
  try {
    // TEMPORAL: cualquier autenticado. Restaurar a ["admin","superadmin"]
    // cuando el rol esté seedeado consistentemente en `usuarios/{uid}`.
    const caller = await requireUser(req);

    // Auto-seed del llamador (idempotente).
    const selfRef = adminDb.collection("team_members").doc(caller.uid);
    const selfSnap = await selfRef.get();
    if (!selfSnap.exists) {
      const userSnap = await adminDb
        .collection("usuarios")
        .doc(caller.uid)
        .get();
      const u = userSnap.data() as
        | { email?: string; nombre?: string }
        | undefined;
      await selfRef.set({
        uid: caller.uid,
        email: (u?.email || caller.email || "").toLowerCase(),
        nombre: u?.nombre || (u?.email || caller.email || "").split("@")[0],
        teamRole: "socio",
        invitedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const snap = await adminDb
      .collection("team_members")
      .orderBy("nombre", "asc")
      .get();

    const admins: AdminRow[] = snap.docs
      .map((d) => {
        const raw = d.data() as TeamMemberDoc;
        return {
          uid: d.id,
          email: String(raw.email || "").toLowerCase(),
          nombre: String(raw.nombre || raw.email || "").trim(),
          teamRole: (raw.teamRole as TeamRole) || "socio",
        };
      })
      .filter((a) => a.email);

    return NextResponse.json({ admins });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("superadmin/admins GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
