"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCanjeQRValue } from "@/lib/vendors";
import type { Canje } from "@/types";

function restante(expira?: Timestamp): string {
  const ms = (expira?.toMillis?.() ?? 0) - Date.now();
  if (ms <= 0) return "Expirado";
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `Vence en ${h}h`;
  return `Vence en ${Math.max(1, Math.floor(ms / 60000))}min`;
}

function CanjeInner() {
  const { firebaseUser } = useAuth();
  const [vouchers, setVouchers] = useState<Canje[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, "canjes"),
      where("clienteId", "==", firebaseUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Canje)
          .filter(
            (c) =>
              c.status === "pending" &&
              (c.expiraEn?.toMillis?.() ?? 0) > Date.now()
          );
        setVouchers(list);
      },
      () => setVouchers([])
    );
    return () => unsub();
  }, [firebaseUser]);

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl font-bold">Mis vouchers 🎟️</h1>
      <p className="text-sm text-muted-foreground">
        Muéstrale el QR al staff para usar tu premio.
      </p>

      {vouchers === null ? (
        <Skeleton className="h-64 w-full" />
      ) : vouchers.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-4xl">🎁</p>
          <p className="mt-2">No tienes vouchers activos.</p>
          <Button asChild className="mt-4">
            <Link href="/premios">Ver premios</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {vouchers.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex flex-col items-center gap-3 p-5">
                <p className="font-headline text-lg font-bold">
                  {v.premioNombre}
                </p>
                <div className="rounded-xl bg-white p-3">
                  <QRCode value={buildCanjeQRValue(v.id)} size={160} />
                </div>
                <p className="rounded-lg bg-secondary px-3 py-1.5 font-mono text-sm font-bold tracking-wider">
                  {v.codigo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {restante(v.expiraEn)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CanjePage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <CanjeInner />
    </RequireAuth>
  );
}
