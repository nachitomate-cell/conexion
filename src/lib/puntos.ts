import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getVendor } from "@/lib/vendors";
import { aplicarBonusCumple } from "@/lib/sellos";
import type { Usuario } from "@/types";

/** Diferencia en días calendario entre dos fechas. */
function diffDias(a: Date, b: Date): number {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export interface ResultadoSello {
  ok: boolean;
  nuevosSellos: number;
  sellosGanados: number;
  recompensaDisponible: boolean;
  error?: string;
}

/**
 * Registra una compra y suma sellos (flujo de ESCANEO DIRECTO del cliente).
 * El escaneo directo siempre entrega 1 sello. El Handshake (con monto) se
 * confirma server-side vía /api/handshake/confirm.
 */
export async function registrarCompra(
  userId: string,
  vendorId: string,
  isClientScan = true
): Promise<ResultadoSello> {
  const vendor = getVendor(vendorId);
  const sellosBase = isClientScan ? 1 : 0;
  const userRef = doc(db, "usuarios", userId);

  try {
    const resultado = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error("Usuario no encontrado");
      const u = snap.data() as Usuario;
      if (u.baneado) throw new Error("Cuenta suspendida");

      // Sello de cumpleaños: x2 durante el mes de nacimiento.
      const { sellos: sellosGanados, bonus } = aplicarBonusCumple(
        sellosBase,
        u.fechaNacimiento
      );

      const ahora = new Date();
      const ultima = (u.ultimaVisita as Timestamp | undefined)?.toDate?.();
      let racha = u.rachaActual || 0;
      if (!ultima) {
        racha = 1;
      } else {
        const dd = diffDias(ultima, ahora);
        if (dd === 0) {
          racha = Math.max(racha, 1);
        } else if (dd === 1) {
          racha = racha + 1;
        } else {
          racha = 1;
        }
      }

      const nuevosSellos = (u.sellos || 0) + sellosGanados;
      const sellosLocales = { ...(u.sellosLocales || {}) };
      sellosLocales[vendorId] = (sellosLocales[vendorId] || 0) + sellosGanados;
      const recompensaDisponible = nuevosSellos >= vendor.sellosParaPremio;

      tx.update(userRef, {
        sellos: nuevosSellos,
        sellosHistoricos: (u.sellosHistoricos || 0) + sellosGanados,
        sellosLocales,
        ultimaVisita: serverTimestamp(),
        rachaActual: racha,
        recompensaDisponible,
      });

      return { nuevosSellos, recompensaDisponible, sellosGanados, bonus };
    });

    // Log append-only (las reglas permiten create a usuarios autenticados).
    await addDoc(collection(db, "system_logs"), {
      userId,
      vendorId,
      accion: resultado.bonus
        ? `+${resultado.sellosGanados} sellos (¡cumpleaños x2!) por escaneo directo`
        : `+${resultado.sellosGanados} sello por escaneo directo`,
      tipo: "SELLO",
      metodo: "CLIENT_SCAN",
      numSellos: resultado.sellosGanados,
      fecha: serverTimestamp(),
    }).catch(() => {});

    return {
      ok: true,
      sellosGanados: resultado.sellosGanados,
      nuevosSellos: resultado.nuevosSellos,
      recompensaDisponible: resultado.recompensaDisponible,
    };
  } catch (e) {
    return {
      ok: false,
      sellosGanados: 0,
      nuevosSellos: 0,
      recompensaDisponible: false,
      error: e instanceof Error ? e.message : "Error al registrar el sello",
    };
  }
}

export interface ResultadoCanje {
  ok: boolean;
  codigo?: string;
  canjeId?: string;
  error?: string;
}

/**
 * Canjea un premio. La transacción atómica (validar sellos + stock, generar
 * código, descontar) corre server-side con Admin SDK en /api/canje.
 */
export async function canjearPremio(premioId: string): Promise<ResultadoCanje> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Debes iniciar sesión" };

  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/canje", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ premioId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "No se pudo canjear" };
    return { ok: true, codigo: data.codigo, canjeId: data.canjeId };
  } catch {
    return { ok: false, error: "Error de red al canjear" };
  }
}

/** Lee el documento de un usuario (helper de conveniencia). */
export async function getUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? ({ uid, ...snap.data() } as Usuario) : null;
}

/** Crea una notificación en la bandeja del usuario. */
export async function pushNotificacion(
  uid: string,
  data: {
    titulo: string;
    mensaje: string;
    tipo: "IA_REMINDER" | "diaria" | "canje" | "bienvenida";
    isAI?: boolean;
    cta?: string;
  }
) {
  await addDoc(collection(db, "usuarios", uid, "notificaciones"), {
    ...data,
    isAI: data.isAI ?? false,
    leida: false,
    fecha: serverTimestamp(),
  });
}
