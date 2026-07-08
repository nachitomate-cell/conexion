import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { requireUser, AuthError } from "@/lib/apiAuth";
import type { TeamRole } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEAM_ROLES: TeamRole[] = ["socio", "desarrollador"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  email?: unknown;
  teamRole?: unknown;
  nombre?: unknown;
}

/**
 * Genera una contraseña aleatoria segura (32 chars, ≥256 bits de entropía).
 * El invitado nunca la usa: le mandamos un password reset link para que
 * ponga la suya.
 */
function passwordAleatoria(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // base64url — 32 chars, sin caracteres problemáticos en URLs.
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Invita a un nuevo miembro al panel:
 *   1. Verifica que el invitador sea admin/superadmin.
 *   2. Crea (o reusa) la cuenta en Firebase Auth.
 *   3. Le pone el custom claim { superadmin: true } — protege el dashboard.
 *   4. Escribe `team_members/{uid}` y actualiza `usuarios/{uid}.rol = superadmin`
 *      (para que `requireUser` y `RequireAuth` sigan reconociéndolo).
 *   5. Devuelve un password reset link para compartir con el invitado.
 */
export async function POST(req: NextRequest) {
  try {
    // Nota: se permite admin además de superadmin para no bloquear al dueño
    // seedeado por env (NEXT_PUBLIC_ADMIN_EMAIL) al armar el equipo inicial.
    const caller = await requireUser(req, ["admin", "superadmin"]);
    const body = (await req.json()) as Body;
    const email = String(body.email || "").trim().toLowerCase();
    const nombre = String(body.nombre || "").trim();
    const teamRoleRaw = String(body.teamRole || "").trim() as TeamRole;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Correo inválido." },
        { status: 400 }
      );
    }
    if (!TEAM_ROLES.includes(teamRoleRaw)) {
      return NextResponse.json(
        { error: "Rol inválido. Usa 'socio' o 'desarrollador'." },
        { status: 400 }
      );
    }

    // 1. Buscamos si ya existe en Firebase Auth — si sí, reusamos su uid.
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      if (nombre && !existing.displayName) {
        await adminAuth.updateUser(uid, { displayName: nombre });
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw e;
      const created = await adminAuth.createUser({
        email,
        emailVerified: false,
        displayName: nombre || undefined,
        password: passwordAleatoria(),
        disabled: false,
      });
      uid = created.uid;
    }

    // 2. Custom claim — protege el dashboard cuando el checker migre a claims.
    await adminAuth.setCustomUserClaims(uid, {
      superadmin: true,
      teamRole: teamRoleRaw,
    });

    // 3. Doc en `team_members` — fuente para la vista de Equipo y el select de Tareas.
    await adminDb
      .collection("team_members")
      .doc(uid)
      .set(
        {
          uid,
          email,
          nombre: nombre || email.split("@")[0],
          teamRole: teamRoleRaw,
          invitedBy: caller.uid,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // 4. Doc en `usuarios` — que requireUser/RequireAuth lo acepten como superadmin.
    await adminDb
      .collection("usuarios")
      .doc(uid)
      .set(
        {
          uid,
          email,
          nombre: nombre || email.split("@")[0],
          rol: "superadmin",
          baneado: false,
          recompensaDisponible: false,
          sellos: 0,
          sellosHistoricos: 0,
          rachaActual: 0,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // 5. Password reset link — lo devolvemos para que el invitador lo comparta.
    //    Si falla (dominio no configurado o rate limit), no rompemos el flujo:
    //    el usuario igual quedó creado y podrá pedir "olvidé mi contraseña".
    let resetLink: string | null = null;
    try {
      resetLink = await adminAuth.generatePasswordResetLink(email);
    } catch (e) {
      console.warn("[team/invite] no pudimos generar el reset link:", e);
    }

    return NextResponse.json({
      ok: true,
      uid,
      email,
      teamRole: teamRoleRaw,
      resetLink,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const code = (e as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Este correo ya tiene cuenta." },
        { status: 409 }
      );
    }
    console.error("team/invite", e);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
