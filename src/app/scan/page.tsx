"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { QrScanner } from "@/components/QrScanner";
import { ConfettiSuccess } from "@/components/ConfettiSuccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { registrarCompra } from "@/lib/puntos";
import { parseVendorQRValue } from "@/lib/vendors";

function ScanInner() {
  const { usuario, firebaseUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState<{
    sellos: number;
    premio: boolean;
  } | null>(null);
  const [scanKey, setScanKey] = useState(0); // para reiniciar el scanner

  const handleScan = async (raw: string) => {
    if (procesando || !firebaseUser) return;
    const vendorId = parseVendorQRValue(raw);
    if (!vendorId) {
      toast({
        title: "QR no reconocido",
        description: "Escanea el código del local SushiPro.",
      });
      setScanKey((k) => k + 1);
      return;
    }
    setProcesando(true);
    const res = await registrarCompra(firebaseUser.uid, vendorId, true);
    setProcesando(false);

    if (!res.ok) {
      toast({ title: "No se pudo registrar", description: res.error });
      setScanKey((k) => k + 1);
      return;
    }
    setExito({ sellos: res.nuevosSellos, premio: res.recompensaDisponible });
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="font-headline text-2xl font-bold">Escanear 📷</h1>
        <p className="text-sm text-muted-foreground">
          Apunta al QR del local para sumar tu sello.
        </p>
      </div>

      {!exito && (
        <QrScanner key={scanKey} onScan={handleScan} once />
      )}

      {procesando && (
        <p className="text-center text-sm text-muted-foreground">
          Registrando tu sello… 🍣
        </p>
      )}

      <Card className="bg-secondary/40">
        <CardContent className="space-y-1 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">¿Cómo funciona?</p>
          <p>
            1. Pide en el local 🍣 · 2. Escanea el QR · 3. Suma sellos y canjea
            premios 🎁
          </p>
          <p>Tienes {usuario?.sellos ?? 0} sellos actualmente.</p>
        </CardContent>
      </Card>

      <ConfettiSuccess
        show={!!exito}
        emoji="🍣"
        title="¡+1 sello! 🍣"
        subtitle={
          exito?.premio
            ? "¡Tienes un premio listo para canjear! 🏆"
            : `Llevas ${exito?.sellos ?? 0} sellos. ¡Sigue así!`
        }
        onClose={() => {
          const premio = exito?.premio;
          setExito(null);
          router.push(premio ? "/premios" : "/");
        }}
      />

      <div className="text-center">
        <Button variant="ghost" onClick={() => router.push("/")}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <ScanInner />
    </RequireAuth>
  );
}
