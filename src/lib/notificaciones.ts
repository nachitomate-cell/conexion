import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";

export type Periodo = "manana" | "tarde";
type Segmento = "omakase" | "rollmaster" | "aprendiz";

interface Msg {
  title: string;
  body: string;
}

// 3 variantes por segmento y período. Se rota según el día del año.
const MENSAJES: Record<Periodo, Record<Segmento, Msg[]>> = {
  manana: {
    omakase: [
      { title: "¡Tu premio Omakase te espera! 🏆", body: "Ven a canjear tu recompensa antes de que se enfríe." },
      { title: "Omakase VIP 🍣", body: "Tienes un premio listo. Hoy es buen día para canjearlo." },
      { title: "Recompensa lista 🎁", body: "Tu fidelidad tiene premio. Pásate por SushiPro." },
    ],
    rollmaster: [
      { title: "¡Estás cerca! 🍣", body: "Te faltan pocos sellos para tu próximo premio." },
      { title: "Roll Master en acción 🥢", body: "Un par de visitas más y desbloqueas tu premio." },
      { title: "¡Casi lo tienes! 🔥", body: "Tu próximo roll suma para el premio. ¿Te animas?" },
    ],
    aprendiz: [
      { title: "¿Cuándo vienes? 🥢", body: "Tus rolls favoritos y un sello te esperan." },
      { title: "Antojito de sushi 🍣", body: "Pásate por SushiPro y suma tu primer sello del día." },
      { title: "Hoy es día de sushi 🍱", body: "Junta sellos con tu pedido y canjea premios." },
    ],
  },
  tarde: {
    omakase: [
      { title: "¿Cena con premio? 🏆", body: "Tu recompensa Omakase sigue disponible. Canjéala hoy." },
      { title: "Premio listo para la once 🍣", body: "Aprovecha la tarde y canjea tu premio en SushiPro." },
      { title: "No dejes enfriar tu premio 🎁", body: "Tienes una recompensa esperándote." },
    ],
    rollmaster: [
      { title: "Cierra el día con sushi 🍣", body: "Te faltan pocos sellos para tu premio. ¡Vamos!" },
      { title: "Antojo de tarde 🥢", body: "Suma sellos esta tarde y acércate a tu recompensa." },
      { title: "Roll Master 🔥", body: "Una visita más esta tarde y estás más cerca del premio." },
    ],
    aprendiz: [
      { title: "Plan de tarde: sushi 🍱", body: "Pide en SushiPro y empieza a juntar sellos." },
      { title: "¿Pedimos sushi? 🥢", body: "Tu sello de hoy te espera en SushiPro." },
      { title: "Tarde de rolls 🍣", body: "Date un gusto y suma sellos para tu primer premio." },
    ],
  },
};

function segmentoDe(sellos: number): Segmento {
  if (sellos >= 10) return "omakase";
  if (sellos >= 5) return "rollmaster";
  return "aprendiz";
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

interface Destinatario {
  uid: string;
  token: string;
  msg: Msg;
}

export async function enviarNotificacionesSegmentadas(periodo: Periodo) {
  const variante = dayOfYear() % 3;

  const snap = await adminDb
    .collection("usuarios")
    .where("rol", "==", "cliente")
    .get();

  const destinatarios: Destinatario[] = [];
  const sinToken: { uid: string; msg: Msg }[] = [];

  snap.forEach((d) => {
    const u = d.data();
    if (u.baneado) return;
    const seg = segmentoDe(u.sellos || 0);
    const msg = MENSAJES[periodo][seg][variante];
    if (u.fcmToken) destinatarios.push({ uid: d.id, token: u.fcmToken, msg });
    else sinToken.push({ uid: d.id, msg });
  });

  // --- Push FCM en lotes de 500 ---
  let enviados = 0;
  let fallidos = 0;
  for (let i = 0; i < destinatarios.length; i += 500) {
    const lote = destinatarios.slice(i, i + 500);
    try {
      const res = await adminMessaging.sendEachForMulticast({
        tokens: lote.map((d) => d.token),
        notification: { title: lote[0].msg.title, body: lote[0].msg.body },
        webpush: {
          fcmOptions: { link: "/" },
          notification: { icon: "/icons/icon.svg" },
        },
      });
      enviados += res.successCount;
      fallidos += res.failureCount;
    } catch {
      fallidos += lote.length;
    }
  }

  // --- Notificación in-app (bandeja) para todos, en lotes de 400 ---
  const todos = [
    ...destinatarios.map((d) => ({ uid: d.uid, msg: d.msg })),
    ...sinToken,
  ];
  for (let i = 0; i < todos.length; i += 400) {
    const batch = adminDb.batch();
    todos.slice(i, i + 400).forEach((d) => {
      const ref = adminDb
        .collection("usuarios")
        .doc(d.uid)
        .collection("notificaciones")
        .doc();
      batch.set(ref, {
        titulo: d.msg.title,
        mensaje: d.msg.body,
        tipo: "diaria",
        isAI: false,
        leida: false,
        fecha: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit().catch(() => {});
  }

  return {
    periodo,
    variante,
    totalClientes: snap.size,
    push: { enviados, fallidos, sinToken: sinToken.length },
  };
}
