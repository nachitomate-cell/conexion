"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VENDORS } from "@/lib/vendors";
import { MessageCircle, QrCode, Loader2, Unlink, X, CheckCircle2 } from "lucide-react";

interface WaCfg {
  estado?: string;
  numeroVinculado?: string | null;
  reactivacionEnabled?: boolean;
  cuotaMensual?: number;
}

async function api<T = Record<string, unknown>>(path: string, payload: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Error");
  return data as T;
}

function WhatsAppInner() {
  const { toast } = useToast();
  const vendorIds = Object.keys(VENDORS);
  const [vendorId, setVendorId] = useState<string>(vendorIds[0] || "sushipro");
  const [cfg, setCfg] = useState<WaCfg | null>(null);
  const [modal, setModal] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCfg(null);
    const unsub = onSnapshot(doc(db, "wa_config", vendorId), (s) =>
      setCfg(s.exists() ? (s.data() as WaCfg) : {})
    );
    return () => unsub();
  }, [vendorId]);

  const estado = cfg?.estado || "disconnected";
  const isConnected = estado === "connected";
  const reactivacionOn = cfg?.reactivacionEnabled === true;

  const err = (e: unknown) =>
    toast({ title: "Error", description: e instanceof Error ? e.message : "Falló", variant: "destructive" });

  async function vincular() {
    setBusy(true); setQr(null); setConectado(false);
    try {
      const r = await api<{ qr: string | null }>("/api/wa/vincular", { vendorId });
      setQr(r.qr); setModal(true);
    } catch (e) { err(e); } finally { setBusy(false); }
  }

  // Polling del modal: refresca QR y detecta conexión.
  useEffect(() => {
    if (!modal || conectado) return;
    const iv = setInterval(async () => {
      try {
        const r = await api<{ estado: string; qr?: string | null }>("/api/wa/estado", { vendorId });
        if (r.estado === "connected") { setConectado(true); setTimeout(() => { setModal(false); setConectado(false); }, 1800); }
        else if (r.qr) setQr(r.qr);
      } catch { /* transitorio */ }
    }, 5000);
    return () => clearInterval(iv);
  }, [modal, conectado, vendorId]);

  async function desvincular() {
    if (!window.confirm("¿Desvincular WhatsApp de este local?")) return;
    try { await api("/api/wa/desvincular", { vendorId }); toast({ title: "Desvinculado" }); }
    catch (e) { err(e); }
  }

  async function toggleReactivacion(v: boolean) {
    try {
      await api("/api/wa/config", { vendorId, reactivacionEnabled: v, nombreLocal: VENDORS[vendorId]?.nombre });
    } catch (e) { err(e); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-7 w-7 text-emerald-500" />
        <div>
          <h1 className="text-xl font-bold">WhatsApp del local</h1>
          <p className="text-sm text-muted-foreground">
            Vincula el número del local y activa la reactivación automática de clientes.
          </p>
        </div>
      </div>

      {/* Selector de local */}
      <div className="flex flex-wrap gap-2">
        {vendorIds.map((id) => (
          <Button key={id} size="sm" variant={id === vendorId ? "default" : "outline"} onClick={() => setVendorId(id)}>
            {VENDORS[id]?.nombre || id}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado</span>
            {isConnected ? (
              <Badge className="bg-emerald-500">Conectado{cfg?.numeroVinculado ? ` · +${cfg.numeroVinculado}` : ""}</Badge>
            ) : (
              <Badge variant="secondary">Sin vincular</Badge>
            )}
          </div>

          {isConnected ? (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Reactivación automática</p>
                  <p className="text-xs text-muted-foreground">
                    {reactivacionOn ? "Activa — mensajes 1-a-1 a clientes que no vienen hace un rato." : "Apagada."}
                  </p>
                </div>
                <Switch checked={reactivacionOn} onCheckedChange={toggleReactivacion} />
              </div>
              <Button variant="ghost" className="text-red-500" onClick={desvincular}>
                <Unlink className="mr-2 h-4 w-4" /> Desvincular
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={vincular} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              {busy ? "Generando QR…" : "Vincular WhatsApp"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modal QR */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-background p-6 text-center shadow-2xl">
            <button className="absolute right-4 top-4 text-muted-foreground" onClick={() => setModal(false)} aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
            {conectado ? (
              <div className="py-8">
                <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
                <p className="text-lg font-bold">¡Vinculado! 🎉</p>
              </div>
            ) : (
              <>
                <p className="mb-1 font-semibold">Escanea con tu WhatsApp</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo
                </p>
                <div className="mx-auto w-fit rounded-xl bg-white p-3">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="Código QR" className="h-56 w-56 object-contain" />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Esperando el escaneo… (el QR se refresca solo)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <AdminGate>
      <WhatsAppInner />
    </AdminGate>
  );
}
