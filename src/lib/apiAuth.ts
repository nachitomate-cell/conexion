import "server-only";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import type { Rol } from "@/types";

export interface AuthedUser {
  uid: string;
  email?: string;
  rol: Rol;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Extrae y verifica el ID token; opcionalmente exige un rol. */
export async function requireUser(
  req: NextRequest,
  roles?: Rol[]
): Promise<AuthedUser> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AuthError("Falta el token de autenticación.");

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new AuthError("Token inválido o expirado.");
  }

  const snap = await adminDb.collection("usuarios").doc(decoded.uid).get();
  if (!snap.exists) throw new AuthError("Usuario no encontrado.", 403);
  const rol = (snap.data()?.rol as Rol) || "cliente";

  // El superadmin es operador de plataforma: pasa cualquier control de rol.
  if (roles && rol !== "superadmin" && !roles.includes(rol)) {
    throw new AuthError("No tienes permiso para esta acción.", 403);
  }

  return { uid: decoded.uid, email: decoded.email, rol };
}

// --- Rate limiter en memoria (sliding window). Suficiente para MVP. ---
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
