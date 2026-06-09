"use client";

import { useEffect, useId, useRef, useState } from "react";

interface QrScannerProps {
  onScan: (text: string) => void;
  onError?: (message: string) => void;
  /** Si true, deja de escanear tras la primera lectura válida. */
  once?: boolean;
  className?: string;
}

/**
 * Envoltorio de html5-qrcode con import dinámico (evita romper SSR).
 * Pide la cámara trasera y entrega el texto del QR a onScan.
 */
export function QrScanner({
  onScan,
  onError,
  once = true,
  className,
}: QrScannerProps) {
  const rawId = useId().replace(/[:]/g, "");
  const elementId = `qr-${rawId}`;
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null
  );
  const stoppedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = scanner as unknown as {
          stop: () => Promise<void>;
          clear: () => void;
        };

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (stoppedRef.current) return;
            if (once) {
              stoppedRef.current = true;
              scanner
                .stop()
                .then(() => scanner.clear())
                .catch(() => {});
            }
            onScan(decodedText);
          },
          () => {
            /* lecturas fallidas por frame: ignorar */
          }
        );
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        onError?.(
          e instanceof Error
            ? e.message
            : "No se pudo acceder a la cámara. Revisa los permisos."
        );
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && !stoppedRef.current) {
        stoppedRef.current = true;
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div
        id={elementId}
        className="overflow-hidden rounded-2xl border-2 border-primary/40 bg-black"
      />
      {status === "loading" && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Iniciando cámara… 📷
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-center text-sm text-destructive">
          No pudimos abrir la cámara. Revisa los permisos del navegador.
        </p>
      )}
    </div>
  );
}
