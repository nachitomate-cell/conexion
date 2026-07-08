import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import type { TeamMember, TeamRole } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TeamMemberDoc {
  uid?: string;
  email?: string;
  nombre?: string;
  teamRole?: TeamRole;
  invitedBy?: string | null;
  createdAt?: Timestamp;
}

function toTeamMember(id: string, raw: TeamMemberDoc): TeamMember {
  return {
    uid: raw.uid || id,
    email: String(raw.email || "").toLowerCase(),
    nombre: String(raw.nombre || raw.email || ""),
    teamRole: (raw.teamRole as TeamRole) || "socio",
    invitedBy: raw.invitedBy ?? null,
    createdAt: raw.createdAt?.toMillis?.() ?? 0,
  };
}

/**
 * Lista los miembros del equipo. Si el usuario actual es admin/superadmin
 * y todavía no está en `team_members`, lo auto-siembra — así el dueño
 * seedeado por env no necesita hacer nada manual para verse en la vista.
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await requireUser(req, ["admin", "superadmin"]);

    // Auto-seed: si el llamador aún no está en team_members, lo agregamos.
    const selfRef = adminDb.collection("team_members").doc(caller.uid);
    const selfSnap = await selfRef.get();
    if (!selfSnap.exists) {
      // Traemos su nombre/email desde `usuarios` para poblar el doc.
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
        teamRole: caller.rol === "superadmin" ? "socio" : "socio",
        invitedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const snap = await adminDb
      .collection("team_members")
      .orderBy("createdAt", "asc")
      .get();
    const members: TeamMember[] = snap.docs.map((d) =>
      toTeamMember(d.id, d.data() as TeamMemberDoc)
    );
    return NextResponse.json({ members });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("team/members GET", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
