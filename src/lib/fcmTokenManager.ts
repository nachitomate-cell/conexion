"use client";

import { doc, updateDoc } from "firebase/firestore";
import { app, db, VAPID_KEY } from "@/lib/firebase";

// Fallback en memoria para entornos donde IndexedDB/SW falla (iOS Safari viejo).
let memoryToken: string | null = null;

export function getMemoryToken(): string | null {
  return memoryToken;
}

/** ¿El navegador soporta notificaciones push? */
export async function pushSupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (!("serviceWorker" in navigator)) return false;
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Solicita permiso, registra el service worker y obtiene el token FCM,
 * guardándolo en usuarios/{uid}.fcmToken.
 * Devuelve el token o null si falla / se rechaza.
 */
export async function registerFcmToken(uid: string): Promise<string | null> {
  try {
    if (!(await pushSupported())) return null;
    if (!VAPID_KEY) {
      console.warn("Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return null;

    memoryToken = token;
    await updateDoc(doc(db, "usuarios", uid), { fcmToken: token }).catch(
      () => {}
    );
    return token;
  } catch (e) {
    console.warn("registerFcmToken falló:", e);
    return null;
  }
}

/** Escucha mensajes en primer plano (opcional, para mostrar un toast). */
export async function onForegroundMessage(
  cb: (payload: { title?: string; body?: string }) => void
): Promise<() => void> {
  try {
    if (!(await pushSupported())) return () => {};
    const { getMessaging, onMessage } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      cb({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
  } catch {
    return () => {};
  }
}
