"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Notificacion } from "@/types";

const EMOJI: Record<string, string> = {
  IA_REMINDER: "✨",
  diaria: "🔔",
  canje: "🎁",
  bienvenida: "🍣",
};

function NotifInner() {
  const { firebaseUser } = useAuth();
  const [notis, setNotis] = useState<Notificacion[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, "usuarios", firebaseUser.uid, "notificaciones")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Notificacion
        );
        list.sort(
          (a, b) =>
            ((b.fecha as Timestamp)?.toMillis?.() ?? 0) -
            ((a.fecha as Timestamp)?.toMillis?.() ?? 0)
        );
        setNotis(list);
      },
      () => setNotis([])
    );
    return () => unsub();
  }, [firebaseUser]);

  const marcarTodas = async () => {
    if (!firebaseUser || !notis) return;
    await Promise.all(
      notis
        .filter((n) => !n.leida)
        .map((n) =>
          updateDoc(
            doc(db, "usuarios", firebaseUser.uid, "notificaciones", n.id),
            { leida: true }
          )
        )
    );
  };

  const marcarUna = async (id: string) => {
    if (!firebaseUser) return;
    await updateDoc(
      doc(db, "usuarios", firebaseUser.uid, "notificaciones", id),
      { leida: true }
    ).catch(() => {});
  };

  const hayNoLeidas = notis?.some((n) => !n.leida);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-2xl font-bold">Notificaciones 🔔</h1>
        {hayNoLeidas && (
          <Button variant="ghost" size="sm" onClick={marcarTodas}>
            Marcar leídas
          </Button>
        )}
      </div>

      {notis === null ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : notis.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-4xl">📭</p>
          <p className="mt-2">Sin notificaciones por ahora.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notis.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.leida && marcarUna(n.id)}
              className={cn(
                "cursor-pointer transition-colors",
                !n.leida && "border-primary/40 bg-primary/5"
              )}
            >
              <CardContent className="flex gap-3 p-4">
                <span className="text-2xl">
                  {n.isAI ? "✨" : EMOJI[n.tipo] || "🔔"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.titulo}</p>
                    {!n.leida && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.mensaje}</p>
                  {n.cta && (
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {n.cta} →
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificacionPage() {
  return (
    <RequireAuth roles={["cliente"]}>
      <NotifInner />
    </RequireAuth>
  );
}
