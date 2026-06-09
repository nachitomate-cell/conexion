"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogTipo, SystemLog } from "@/types";

const TIPO_BADGE: Record<LogTipo, "secondary" | "gold" | "destructive" | "accent"> =
  {
    SELLO: "secondary",
    CANJE: "gold",
    SELLO_RECHAZADO: "destructive",
    REFERIDO: "accent",
  };

function LogsInner() {
  const [logs, setLogs] = useState<SystemLog[] | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "system_logs"));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as SystemLog)
          .sort(
            (a, b) =>
              ((b.fecha as Timestamp)?.toMillis?.() ?? 0) -
              ((a.fecha as Timestamp)?.toMillis?.() ?? 0)
          );
        setLogs(list);
      } catch {
        setLogs([]);
      }
    })();
  }, []);

  const filtrados = useMemo(() => {
    if (!logs) return [];
    if (filtro === "todos") return logs.slice(0, 200);
    return logs.filter((l) => l.tipo === filtro).slice(0, 200);
  }, [logs, filtro]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-headline text-2xl font-bold">Logs 📜</h1>
      </div>

      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="SELLO">Sellos</SelectItem>
          <SelectItem value="CANJE">Canjes</SelectItem>
          <SelectItem value="SELLO_RECHAZADO">Rechazados</SelectItem>
          <SelectItem value="REFERIDO">Referidos</SelectItem>
        </SelectContent>
      </Select>

      {logs === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin registros.
        </p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={TIPO_BADGE[l.tipo] || "secondary"}>
                      {l.tipo}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {l.metodo}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm">{l.accion}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    user: {l.userId}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(
                    (l.fecha as Timestamp)?.toMillis?.() ?? 0
                  ).toLocaleString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogsPage() {
  return (
    <AdminGate>
      <LogsInner />
    </AdminGate>
  );
}
