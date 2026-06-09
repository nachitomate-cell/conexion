"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Canje, SystemLog } from "@/types";

interface Evento {
  id: string;
  fecha: number;
  titulo: string;
  detalle: string;
  emoji: string;
  tag: string;
  variant: "default" | "secondary" | "accent" | "gold";
}

function fmtFecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistorialInner() {
  const { firebaseUser } = useAuth();
  const [eventos, setEventos] = useState<Evento[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      const uid = firebaseUser.uid;
      try {
        const [logsSnap, canjesSnap] = await Promise.all([
          getDocs(
            query(collection(db, "system_logs"), where("userId", "==", uid))
          ),
          getDocs(
            query(collection(db, "canjes"), where("clienteId", "==", uid))
          ),
        ]);

        const evs: Evento[] = [];

        logsSnap.forEach((d) => {
          const l = d.data() as SystemLog;
          const ms = (l.fecha as Timestamp)?.toMillis?.() ?? 0;
          if (l.tipo === "SELLO") {
            evs.push({
              id: d.id,
              fecha: ms,
              titulo: `+${l.numSellos ?? 1} sello`,
              detalle:
                l.metodo === "HANDSHAKE"
                  ? "Compra en caja"
                  : "Escaneo en el local",
              emoji: "🍣",
              tag: "Sello",
              variant: "secondary",
            });
          }
        });

        canjesSnap.forEach((d) => {
          const c = d.data() as Canje;
          const ms = (c.createdAt as Timestamp)?.toMillis?.() ?? 0;
          evs.push({
            id: d.id,
            fecha: ms,
            titulo: c.premioNombre,
            detalle: `Canje · código ${c.codigo}`,
            emoji: "🎁",
            tag:
              c.status === "redeemed"
                ? "Usado"
                : c.status === "expired"
                  ? "Expirado"
                  : "Activo",
            variant: c.status === "redeemed" ? "accent" : "gold",
          });
        });

        evs.sort((a, b) => b.fecha - a.fecha);
        setEventos(evs);
      } catch {
        setEventos([]);
      }
    })();
  }, [firebaseUser]);

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl font-bold">Mi historial 📜</h1>

      {eventos === null ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-4xl">🥢</p>
          <p className="mt-2">
            Todavía no hay movimientos. ¡Escanea tu primer sello!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {eventos.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="text-2xl">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.detalle}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtFecha(e.fecha)}
                  </p>
                </div>
                <Badge variant={e.variant}>{e.tag}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistorialPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <HistorialInner />
    </RequireAuth>
  );
}
