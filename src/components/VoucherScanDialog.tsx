"use client";

import { useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/QrScanner";
import { useToast } from "@/hooks/use-toast";
import { parseCanjeQRValue } from "@/lib/vendors";
import type { Canje } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function VoucherScanDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [canje, setCanje] = useState<(Canje & { id: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanKey, setScanKey] = useState(0);

  const reset = () => {
    setCanje(null);
    setScanKey((k) => k + 1);
  };

  const cerrar = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleScan = async (raw: string) => {
    const id = parseCanjeQRValue(raw);
    if (!id) {
      toast({ title: "QR no válido", description: "Ese no es un voucher." });
      setScanKey((k) => k + 1);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "canjes", id));
      if (!snap.exists()) {
        toast({ title: "Voucher no encontrado" });
        setScanKey((k) => k + 1);
        return;
      }
      setCanje({ ...(snap.data() as Canje), id });
    } catch {
      toast({ title: "Error al leer el voucher" });
    }
  };

  const marcarUsado = async () => {
    if (!canje) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "canjes", canje.id), { status: "redeemed" });
      toast({ variant: "success", title: "Voucher marcado como usado ✅" });
      cerrar(false);
    } catch {
      toast({ title: "No se pudo actualizar" });
    } finally {
      setLoading(false);
    }
  };

  const expirado = (canje?.expiraEn?.toMillis?.() ?? 0) < Date.now();
  const yaUsado = canje?.status === "redeemed";

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🎟️ Escanear voucher</DialogTitle>
          <DialogDescription>
            Escanea el QR del premio del cliente para entregarlo.
          </DialogDescription>
        </DialogHeader>

        {!canje ? (
          <QrScanner key={scanKey} onScan={handleScan} once />
        ) : (
          <div className="space-y-4 text-center">
            <div className="text-5xl">🎁</div>
            <p className="font-headline text-xl font-bold">
              {canje.premioNombre}
            </p>
            <p className="font-mono text-sm">{canje.codigo}</p>
            {yaUsado ? (
              <p className="font-semibold text-destructive">
                Este voucher ya fue usado.
              </p>
            ) : expirado ? (
              <p className="font-semibold text-destructive">
                Este voucher está expirado.
              </p>
            ) : (
              <p className="text-sm text-accent">Voucher válido ✅</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Otro
              </Button>
              <Button
                className="flex-1"
                disabled={loading || yaUsado || expirado}
                onClick={marcarUsado}
              >
                {loading ? "Guardando…" : "Marcar entregado"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
