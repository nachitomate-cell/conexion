"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { app, VAPID_KEY } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { pushSupported } from "@/lib/fcmTokenManager";

const TASKS_URL = "/superadmin/dashboard/tareas";

/**
 * Foreground: cuando la pestaña está enfocada, FCM NO dispara
 * `onBackgroundMessage` en el SW — dispara `onMessage` en el cliente y no
 * muestra ninguna notificación por sí solo. Este listener toma esos payloads
 * data-only y llama `registration.showNotification` manualmente, así el "Enviar
 * prueba" funciona igual estando en la pestaña abierta.
 */
async function subscribeForegroundHandler(): Promise<() => void> {
  try {
    if (!(await pushSupported())) return () => {};
    const [{ getMessaging, onMessage }, registration] = await Promise.all([
      import("firebase/messaging"),
      navigator.serviceWorker.ready,
    ]);
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      const d = (payload.data ?? {}) as Record<string, string>;
      const n = payload.notification ?? {};
      const title = d.title || n.title || "Recordatorio";
      const body = d.body || n.body || "";
      const url = d.url || TASKS_URL;
      const icon = d.icon || "/icons/icon.svg";
      registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        tag: d.tag || undefined,
        data: { url },
      });
    });
  } catch {
    return () => {};
  }
}

// Persistimos el token en localStorage para saber si este dispositivo ya está
// registrado sin tener que pedir permiso otra vez ni hacer un fetch al backend.
const LS_KEY = "sushipro:taskPushToken";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

interface UsePushState {
  supported: boolean;
  permission: PushPermission;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface UsePushApi extends UsePushState {
  /** Pide permiso, obtiene el token FCM y lo guarda en Firestore. */
  enable: () => Promise<void>;
  /** Quita el token de Firestore y limpia el estado local. */
  disable: () => Promise<void>;
  /** Dispara una notificación de prueba a todos los dispositivos del usuario. */
  sendTest: () => Promise<{ ok: boolean; message: string }>;
}

/**
 * Hook para gestionar suscripción de push notifications del panel de tareas.
 *   - Detecta soporte (Notification + Service Worker + FCM isSupported())
 *   - Refleja el estado del permiso del browser
 *   - `enable()` pide permiso, registra SW, obtiene el token y lo POSTea al backend
 *   - `disable()` lo quita
 *   - Persiste el token en localStorage para saber si el dispositivo ya está enrolado
 */
export function useTaskPushNotifications(): UsePushApi {
  const [state, setState] = useState<UsePushState>({
    supported: false,
    permission: "default",
    token: null,
    loading: true,
    error: null,
  });
  const unsubRef = useRef<(() => void) | null>(null);

  // Inicialización: chequea soporte y recupera token de localStorage si existe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = await pushSupported();
      if (cancelled) return;
      if (!supported) {
        setState({
          supported: false,
          permission: "unsupported",
          token: null,
          loading: false,
          error: null,
        });
        return;
      }
      const perm = (Notification.permission ?? "default") as PushPermission;
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
      setState({
        supported: true,
        permission: perm,
        token: perm === "granted" ? stored : null,
        loading: false,
        error: null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cuando el permiso está granted, suscribimos el handler de foreground.
  useEffect(() => {
    if (state.permission !== "granted") return;
    let mounted = true;
    (async () => {
      const unsub = await subscribeForegroundHandler();
      if (!mounted) {
        unsub();
        return;
      }
      unsubRef.current?.();
      unsubRef.current = unsub;
    })();
    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [state.permission]);

  const enable = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      if (!(await pushSupported())) {
        throw new Error("Este navegador no soporta notificaciones push.");
      }
      if (!VAPID_KEY) {
        throw new Error("Falta configurar NEXT_PUBLIC_FIREBASE_VAPID_KEY.");
      }
      if (!auth.currentUser) {
        throw new Error("Tienes que iniciar sesión primero.");
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState((s) => ({
          ...s,
          permission: perm as PushPermission,
          loading: false,
          error:
            perm === "denied"
              ? "Bloqueaste las notificaciones. Actívalas en la configuración del navegador."
              : null,
        }));
        return;
      }

      // Registramos el SW (idempotente: si ya está registrado, devuelve el existente).
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      // Espera a que el SW esté activo — evita "getToken called before SW registered"
      await navigator.serviceWorker.ready;

      const { getMessaging, getToken } = await import("firebase/messaging");
      const messaging = getMessaging(app);
      let token: string | null = null;
      try {
        token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
      } catch (e) {
        const msg = (e as Error).message || "";
        // `atob` falla cuando la VAPID key tiene caracteres inválidos —
        // típicamente porque llegó truncada/mangled al deploy.
        if (msg.includes("atob")) {
          throw new Error(
            "La VAPID key del proyecto está mal formada. Revisa NEXT_PUBLIC_FIREBASE_VAPID_KEY en Vercel."
          );
        }
        throw e;
      }
      if (!token) {
        throw new Error("No pudimos obtener el token del dispositivo.");
      }

      // Guardamos en el backend (arrayUnion — idempotente).
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/superadmin/push/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Error ${res.status}`);
      }

      if (typeof window !== "undefined") localStorage.setItem(LS_KEY, token);
      setState({
        supported: true,
        permission: "granted",
        token,
        loading: false,
        error: null,
      });

      // Notificación de bienvenida — confirma al usuario que quedó activado.
      // Se muestra desde el SW recién registrado para probar que el pipeline
      // completo funciona (permiso + SW + registration).
      try {
        await registration.showNotification("¡Notificaciones activadas 🎉", {
          body: "Te avisaremos cada mañana con tus tareas pendientes.",
          icon: "/icons/icon.svg",
          badge: "/icons/icon.svg",
          tag: "welcome",
          data: { url: TASKS_URL },
        });
      } catch {
        // Si falla, no es crítico — el opt-in ya quedó guardado.
      }
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, []);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const token =
        state.token ||
        (typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null);
      if (token && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        await fetch("/api/superadmin/push/unregister", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
      setState((s) => ({
        ...s,
        token: null,
        loading: false,
        error: null,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, [state.token]);

  const sendTest = useCallback(async () => {
    try {
      if (!auth.currentUser) throw new Error("Tienes que iniciar sesión.");
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/superadmin/push/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        success?: number;
        tokens?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(j.error || `Error ${res.status}`);
      const success = j.success ?? 0;
      const tokens = j.tokens ?? 0;
      return {
        ok: success > 0,
        message:
          success > 0
            ? `Enviada a ${success}/${tokens} dispositivo${
                tokens === 1 ? "" : "s"
              }.`
            : "Se llamó a FCM pero no se entregó a ningún dispositivo.",
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }, []);

  return { ...state, enable, disable, sendTest };
}
