"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  ArrowLeft,
  Copy,
  Download,
  Instagram,
  Share2,
} from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useVendor } from "@/context/VendorContext";

/**
 * Convierte el `<svg>` renderizado por react-qr-code a un PNG y dispara la
 * descarga. Todo pasa en el browser — sin backend.
 */
async function descargarQR(svgEl: SVGElement, filename: string, size = 1024) {
  const clone = svgEl.cloneNode(true) as SVGElement;
  // Aseguramos xmlns para que el serializer produzca un SVG portable.
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no-img"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function QRAdminInner() {
  const { toast } = useToast();
  const vendor = useVendor();
  const containerRef = useRef<HTMLDivElement>(null);

  // URL objetivo del QR — subdominio white-label del local.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.host;
      const parts = host.split(".");
      // Si estamos ya en un subdominio de tenant, mantenemos el host tal cual;
      // si no, construimos {slug}.synaptechspa.cl como default.
      if (parts.length >= 3 && !host.startsWith("localhost")) {
        setOrigin(`${window.location.protocol}//${host}`);
      } else {
        setOrigin(`https://${vendor.slug}.synaptechspa.cl`);
      }
    }
  }, [vendor.slug]);

  const qrValue = origin || `https://${vendor.slug}.synaptechspa.cl`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      toast({ variant: "success", title: "Link copiado" });
    } catch {
      toast({ title: "No pudimos copiar" });
    }
  };

  const descargar = async () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    try {
      await descargarQR(svg, `qr-${vendor.slug}.png`);
      toast({ variant: "success", title: "QR descargado" });
    } catch {
      toast({ title: "No pudimos generar el PNG" });
    }
  };

  const compartirWhatsapp = () => {
    const texto = encodeURIComponent(
      `Únete al ${vendor.copy.clubName} 🎁\n${qrValue}`
    );
    const url = `https://wa.me/?text=${texto}`;
    window.open(url, "_blank");
  };

  const compartirNativo = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: vendor.copy.clubName,
          text: `Únete al club de ${vendor.nombre}`,
          url: qrValue,
        });
      } catch {
        // usuario canceló
      }
    } else {
      copiar();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-2xl font-bold">Mi QR 📲</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Imprime este QR o compártelo por redes. Al escanearlo el cliente entra
        directo al club de <span className="font-semibold">{vendor.nombre}</span>.
      </p>

      {/* Tarjeta con el QR grande */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div
            ref={containerRef}
            className="relative flex aspect-square w-full max-w-sm items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <QRCode
              value={qrValue}
              size={512}
              // "H" tolera hasta ~30% de oclusión — permite el logo central sin
              // romper la lectura.
              level="H"
              style={{ height: "auto", width: "100%", maxWidth: "100%" }}
              viewBox="0 0 512 512"
            />
            {/* Logo central: círculo blanco + emoji del local */}
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex h-[22%] w-[22%] items-center justify-center rounded-2xl bg-white shadow-md ring-4 ring-white">
                <span className="text-4xl sm:text-5xl">{vendor.emoji}</span>
              </div>
            </div>
          </div>

          <p className="max-w-full break-all text-center text-xs text-muted-foreground">
            {qrValue}
          </p>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={descargar} className="col-span-2">
          <Download className="h-4 w-4" />
          Descargar PNG
        </Button>
        <Button onClick={compartirWhatsapp} variant="outline">
          <Share2 className="h-4 w-4" />
          Compartir por WhatsApp
        </Button>
        <Button onClick={copiar} variant="outline">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
      </div>

      {/* Compartir nativo (móvil / iOS) */}
      {typeof navigator !== "undefined" &&
        typeof navigator.share === "function" && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={compartirNativo}
          >
            <Instagram className="h-4 w-4" />
            Compartir por Instagram u otras apps
          </Button>
        )}
    </div>
  );
}

export default function QRAdminPage() {
  return (
    <AdminGate>
      <QRAdminInner />
    </AdminGate>
  );
}
