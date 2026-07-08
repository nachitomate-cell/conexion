import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sirve el service worker de Firebase Messaging en el scope raíz
 * (/firebase-messaging-sw.js) inyectando la config pública desde el entorno.
 */
// Los dashboards de env vars (Vercel u otros) tienden a dejar `\n` colados
// al final de cada valor cuando pegas con un enter accidental. Firebase los
// mete literales en `apiKey`, `authDomain`, etc. → messaging deja de funcionar
// silenciosamente. Trimeamos siempre para blindarnos.
function trim(v: string | undefined): string {
  return (v ?? "").trim();
}

export function GET() {
  const config = {
    apiKey: trim(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: trim(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: trim(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: trim(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trim(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ),
    appId: trim(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };

  const js = `
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

// Lee campos desde payload.data (data-only, recomendado para control total en SW)
// con fallback a payload.notification para mantener compat con el flujo anterior.
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const n = payload.notification || {};
  const title = d.title || n.title || "SushiPro Club 🍣";
  const options = {
    body: d.body || n.body || "",
    icon: d.icon || "/icons/icon.svg",
    badge: d.icon || "/icons/icon.svg",
    tag: d.tag || undefined, // colapsa notificaciones con el mismo tag
    data: {
      url:
        d.url ||
        (payload.fcmOptions && payload.fcmOptions.link) ||
        "/",
    },
  };
  self.registration.showNotification(title, options);
});

// Al tocar la notificación abrimos la URL objetivo. Si ya hay una ventana
// abierta en el mismo scope la enfocamos en vez de abrir una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of all) {
        try {
          const u = new URL(c.url);
          if (u.pathname === url.split("?")[0]) {
            await c.focus();
            return;
          }
        } catch (_e) {}
      }
      await clients.openWindow(url);
    })()
  );
});
`.trim();

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
