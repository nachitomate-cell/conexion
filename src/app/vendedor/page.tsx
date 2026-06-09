"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "react-qr-code";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { HandshakeModal } from "@/components/HandshakeModal";
import { VoucherScanDialog } from "@/components/VoucherScanDialog";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { AIPromoButton } from "@/components/AIPromoButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getDefaultVendor, buildVendorQRValue } from "@/lib/vendors";
import type { SystemLog } from "@/types";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function VendedorInner() {
  const { usuario } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const vendor = getDefaultVendor();

  const tabParam = params.get("tab");
  const tab = tabParam === "scan" || tabParam === "clientes" ? tabParam : "resumen";

  const [handshakeOpen, setHandshakeOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, "system_logs"),
      where("vendorId", "==", vendor.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const hoy = startOfToday();
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as SystemLog)
          .filter((l) => ((l.fecha as Timestamp)?.toMillis?.() ?? 0) >= hoy)
          .sort(
            (a, b) =>
              ((b.fecha as Timestamp)?.toMillis?.() ?? 0) -
              ((a.fecha as Timestamp)?.toMillis?.() ?? 0)
          );
        setLogs(list);
      },
      () => setLogs([])
    );
    return () => unsub();
  }, [vendor.id]);

  // tally de clientes del día
  const topClientes = useMemo(() => {
    const counts: Record<string, number> = {};
    logs
      .filter((l) => l.tipo === "SELLO")
      .forEach((l) => (counts[l.userId] = (counts[l.userId] || 0) + 1));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs]);

  // cargar nombres de los top clientes
  useEffect(() => {
    topClientes.forEach(([uid]) => {
      if (nombres[uid]) return;
      getDoc(doc(db, "usuarios", uid))
        .then((s) => {
          if (s.exists())
            setNombres((n) => ({ ...n, [uid]: (s.data().nombre as string) || "Cliente" }));
        })
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topClientes]);

  const sellosHoy = logs
    .filter((l) => l.tipo === "SELLO")
    .reduce((acc, l) => acc + (l.numSellos || 1), 0);
  const canjesHoy = logs.filter((l) => l.tipo === "CANJE").length;
  const clientesHoy = new Set(logs.map((l) => l.userId)).size;

  const insights = [
    `Hoy entregaste ${sellosHoy} sellos a ${clientesHoy} clientes.`,
    canjesHoy > 0
      ? `Se canjearon ${canjesHoy} premios hoy. ¡Buen flujo! 🎁`
      : "Aún no hay canjes hoy. Recuérdale a tus clientes sus premios.",
    topClientes.length > 0
      ? `Tu cliente más activo del día lleva ${topClientes[0][1]} visitas.`
      : "Anima a los clientes a escanear el QR del local.",
  ];

  const setTab = (v: string) =>
    router.replace(v === "resumen" ? "/vendedor" : `/vendedor?tab=${v}`);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Panel del local</p>
        <h1 className="font-headline text-2xl font-bold">
          Hola, Chef {usuario?.nombre?.split(" ")[0]} 🥢
        </h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumen">📊 Resumen</TabsTrigger>
          <TabsTrigger value="scan">📷 Escanear</TabsTrigger>
          <TabsTrigger value="clientes">👥 Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-5">
              <p className="font-semibold">QR del local 🍣</p>
              <p className="text-center text-xs text-muted-foreground">
                El cliente lo escanea desde “Escanear” para sumar 1 sello.
              </p>
              <div className="rounded-xl bg-white p-4">
                <QRCode value={buildVendorQRValue(vendor.id)} size={200} />
              </div>
              <p className="text-xs text-muted-foreground">{vendor.nombre}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Card>
              <CardContent className="p-3">
                <p className="font-headline text-2xl font-bold text-primary">
                  {sellosHoy}
                </p>
                <p className="text-xs text-muted-foreground">Sellos hoy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="font-headline text-2xl font-bold">{canjesHoy}</p>
                <p className="text-xs text-muted-foreground">Canjes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="font-headline text-2xl font-bold">
                  {clientesHoy}
                </p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </CardContent>
            </Card>
          </div>

          <AIInsightsPanel insights={insights} />
          <AIPromoButton />
        </TabsContent>

        <TabsContent value="scan" className="space-y-3">
          <Button
            size="lg"
            className="h-auto w-full flex-col gap-1 py-5"
            onClick={() => setHandshakeOpen(true)}
          >
            <span className="text-3xl">🤝</span>
            <span>Iniciar Handshake</span>
            <span className="text-xs font-normal opacity-80">
              Escanea al cliente e ingresa el monto
            </span>
          </Button>
          <Button
            size="lg"
            variant="accent"
            className="h-auto w-full flex-col gap-1 py-5"
            onClick={() => setVoucherOpen(true)}
          >
            <span className="text-3xl">🎟️</span>
            <span>Escanear voucher</span>
            <span className="text-xs font-normal opacity-80">
              Entrega un premio canjeado
            </span>
          </Button>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 font-semibold">Top clientes del día 🏅</p>
              {topClientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin visitas registradas hoy.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topClientes.map(([uid, count], i) => (
                    <li key={uid} className="flex items-center gap-3">
                      <span className="text-lg">
                        {["🥇", "🥈", "🥉", "🍣", "🍣"][i]}
                      </span>
                      <span className="flex-1 truncate">
                        {nombres[uid] || "Cliente"}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {count} visitas
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="mb-2 font-semibold">Transacciones de hoy</p>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay movimientos hoy.
                </p>
              ) : (
                <ul className="divide-y">
                  {logs.slice(0, 20).map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span>
                        {l.tipo === "CANJE" ? "🎁" : "🍣"} {l.accion}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          (l.fecha as Timestamp)?.toMillis?.() ?? 0
                        ).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HandshakeModal
        open={handshakeOpen}
        onOpenChange={setHandshakeOpen}
        vendorId={vendor.id}
      />
      <VoucherScanDialog open={voucherOpen} onOpenChange={setVoucherOpen} />
    </div>
  );
}

export default function VendedorPage() {
  return (
    <RequireAuth roles={["chef_partner", "admin"]}>
      <Suspense fallback={null}>
        <VendedorInner />
      </Suspense>
    </RequireAuth>
  );
}
