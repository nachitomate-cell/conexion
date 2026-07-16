import "server-only";

// Cliente de Evolution API (WhatsApp por sesión/QR) para SushiPro/conexion.
// Habla con el MISMO VPS que barbería (wa.synaptechspa.cl), pero las instancias
// llevan prefijo `sp_` para no chocar con las de barbería (`instance_`).
// Aislamiento estricto: cada método exige el nombre de instancia.
// Requiere EVOLUTION_API_URL y EVOLUTION_API_KEY en el entorno.

const EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"];

function root(): { base: string; key: string } {
  const base = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!base || !key) {
    throw new Error("Evolution: faltan EVOLUTION_API_URL / EVOLUTION_API_KEY en el entorno.");
  }
  return { base: base.replace(/\/+$/, ""), key };
}

async function req(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const { base, key } = root();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: key, "Content-Type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const r = data as { response?: { message?: unknown }; message?: unknown };
    const raw = r.response?.message ?? r.message ?? `HTTP ${res.status}`;
    const msg = Array.isArray(raw) ? raw.join("; ") : String(raw);
    throw new Error(`Evolution ${method} ${path}: ${msg}`);
  }
  return data;
}

/** Nombre de instancia namespaced por vendor (SushiPro). */
export function instanceName(vendorId: string): string {
  return `sp_${vendorId}`;
}

export interface QrResult {
  instanceName: string;
  qr: string | null;
  pairingCode: string | null;
}

export async function crearInstancia(
  name: string,
  opts: { webhookUrl?: string; webhookToken?: string } = {}
): Promise<QrResult> {
  const data = await req("POST", "/instance/create", {
    instanceName: name,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    webhook: opts.webhookUrl
      ? {
          url: opts.webhookUrl,
          byEvents: false,
          base64: true,
          headers: { "x-webhook-token": opts.webhookToken || "" },
          events: EVENTS,
        }
      : undefined,
  });
  const qc = ((data.qrcode || data.qr) as { base64?: string; pairingCode?: string }) || {};
  return { instanceName: name, qr: qc.base64 || null, pairingCode: qc.pairingCode || null };
}

/** 'open' | 'connecting' | 'close' | 'unknown'. */
export async function estadoConexion(name: string): Promise<string> {
  try {
    const data = await req("GET", `/instance/connectionState/${encodeURIComponent(name)}`);
    const inst = data.instance as { state?: string } | undefined;
    return inst?.state || (data.state as string) || "unknown";
  } catch {
    return "unknown";
  }
}

export async function obtenerQR(name: string): Promise<{ qr: string | null; pairingCode: string | null }> {
  const data = await req("GET", `/instance/connect/${encodeURIComponent(name)}`);
  return { qr: (data.base64 as string) || null, pairingCode: (data.pairingCode as string) || null };
}

/** Envía texto con pacing anti-ban ("escribiendo…" durante delayMs). */
export async function enviarTexto(
  name: string,
  numero: string,
  texto: string,
  delayMs = 4000
): Promise<Record<string, unknown>> {
  return req("POST", `/message/sendText/${encodeURIComponent(name)}`, {
    number: numero,
    text: texto,
    delay: delayMs,
  });
}

export async function logout(name: string): Promise<Record<string, unknown>> {
  return req("DELETE", `/instance/logout/${encodeURIComponent(name)}`);
}

export async function eliminarInstancia(name: string): Promise<Record<string, unknown>> {
  return req("DELETE", `/instance/delete/${encodeURIComponent(name)}`);
}
