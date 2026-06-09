"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScanner } from "@/components/QrScanner";
import { useToast } from "@/hooks/use-toast";
import { parseClientQRValue } from "@/lib/vendors";
import { calcularSellos, TRAMOS_SELLOS } from "@/lib/sellos";
import { formatCLP } from "@/lib/utils";
import type { Usuario } from "@/types";

type Fase = "scan" | "review" | "done";

interface HandshakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  onConfirmed?: () => void;
}

export function HandshakeModal({
  open,
  onOpenChange,
  vendorId,
  onConfirmed,
}: HandshakeModalProps) {
  const { toast } = useToast();
  const [fase, setFase] = useState<Fase>("scan");
  const [cliente, setCliente] = useState<{ uid: string; data: Usuario } | null>(
    null
  );
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    sellosGanados: number;
    nuevosSellos: number;
  } | null>(null);

  const reset = () => {
    setFase("scan");
    setCliente(null);
    setMonto("");
    setResultado(null);
    setLoading(false);
  };

  const cerrar = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleScan = async (raw: string) => {
    const uid = parseClientQRValue(raw);
    if (!uid) {
      toast({ title: "QR no válido", description: "Ese no es el QR de un cliente." });
      return;
    }
    try {
      const snap = await getDoc(doc(db, "usuarios", uid));
      if (!snap.exists()) {
        toast({ title: "Cliente no encontrado" });
        return;
      }
      setCliente({ uid, data: snap.data() as Usuario });
      setFase("review");
    } catch {
      toast({ title: "Error al leer el cliente" });
    }
  };

  const confirmar = async () => {
    if (!cliente) return;
    const montoNum = parseInt(monto, 10);
    if (!montoNum || montoNum <= 0) {
      toast({ title: "Ingresa un monto válido" });
      return;
    }
    const sellos = calcularSellos(montoNum);
    if (sellos === 0) {
      toast({
        title: "Monto bajo el mínimo",
        description: `Desde ${formatCLP(8000)} se entrega 1 sello.`,
      });
      return;
    }
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/handshake/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          clientUid: cliente.uid,
          monto: montoNum,
          vendorId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "No se pudo confirmar", description: data.error });
        setLoading(false);
        return;
      }
      setResultado({
        sellosGanados: data.sellosGanados,
        nuevosSellos: data.nuevosSellos,
      });
      setFase("done");
      onConfirmed?.();
    } catch {
      toast({ title: "Error de red" });
    } finally {
      setLoading(false);
    }
  };

  const montoNum = parseInt(monto, 10) || 0;
  const sellosPreview = calcularSellos(montoNum);

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fase === "scan" && "🥢 Iniciar Handshake"}
            {fase === "review" && "Confirmar consumo"}
            {fase === "done" && "¡Sellos entregados! 🍣"}
          </DialogTitle>
          <DialogDescription>
            {fase === "scan" && "Escanea el QR del cliente desde su perfil."}
            {fase === "review" && "Ingresa el monto del consumo."}
            {fase === "done" && "El cliente ya tiene sus sellos."}
          </DialogDescription>
        </DialogHeader>

        {fase === "scan" && (
          <QrScanner onScan={handleScan} once className="mt-1" />
        )}

        {fase === "review" && cliente && (
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary p-3">
              <p className="font-headline text-lg font-bold">
                {cliente.data.nombre}
              </p>
              <p className="text-sm text-muted-foreground">
                Tiene {cliente.data.sellos ?? 0} sellos · racha{" "}
                {cliente.data.rachaActual ?? 0} 🔥
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto del consumo (CLP)</Label>
              <Input
                id="monto"
                type="number"
                inputMode="numeric"
                placeholder="Ej: 25000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {TRAMOS_SELLOS.map((t) => (
                  <button
                    key={t.desde}
                    type="button"
                    onClick={() => setMonto(String(t.desde))}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                  >
                    {formatCLP(t.desde)} → {t.sellos}🍣
                  </button>
                ))}
              </div>
            </div>

            {montoNum > 0 && (
              <p className="text-center text-sm font-semibold">
                {sellosPreview > 0
                  ? `Otorga ${sellosPreview} sello${sellosPreview > 1 ? "s" : ""} 🍣`
                  : "Bajo el mínimo para sellos"}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={reset}
                disabled={loading}
              >
                Volver
              </Button>
              <Button
                className="flex-1"
                onClick={confirmar}
                disabled={loading || sellosPreview === 0}
              >
                {loading ? "Confirmando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        )}

        {fase === "done" && resultado && (
          <div className="space-y-4 py-2 text-center">
            <div className="text-6xl">🍣</div>
            <p className="font-headline text-2xl font-bold text-primary">
              +{resultado.sellosGanados} sellos
            </p>
            <p className="text-muted-foreground">
              {cliente?.data.nombre} ahora tiene {resultado.nuevosSellos} sellos.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Otro cliente
              </Button>
              <Button className="flex-1" onClick={() => cerrar(false)}>
                Listo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
