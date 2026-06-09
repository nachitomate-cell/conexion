"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemLog, Usuario } from "@/types";

interface Kpis {
  sellosMes: number;
  canjesMes: number;
  activos: number;
  inactivos: number;
  totalClientes: number;
  serie: { dia: string; sellos: number }[];
  concentracion: number; // % de sellos del top cliente del mes
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function GerenteInner() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ahora = new Date();
        const inicioMes = new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          1
        ).getTime();

        const [usuariosSnap, logsSnap] = await Promise.all([
          getDocs(query(collection(db, "usuarios"), where("rol", "==", "cliente"))),
          getDocs(collection(db, "system_logs")),
        ]);

        const clientes = usuariosSnap.docs.map((d) => d.data() as Usuario);
        const treintaDias = Date.now() - 30 * 86400000;
        let activos = 0;
        clientes.forEach((c) => {
          const ult = (c.ultimaVisita as Timestamp | undefined)?.toMillis?.() ?? 0;
          if (ult >= treintaDias) activos++;
        });

        const logs = logsSnap.docs.map((d) => d.data() as SystemLog);
        const logsMes = logs.filter(
          (l) => ((l.fecha as Timestamp)?.toMillis?.() ?? 0) >= inicioMes
        );

        let sellosMes = 0;
        let canjesMes = 0;
        const porCliente: Record<string, number> = {};
        const serieMap: Record<string, number> = {};
        // últimos 7 días
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          serieMap[d.toDateString()] = 0;
        }

        logsMes.forEach((l) => {
          if (l.tipo === "SELLO") {
            const n = l.numSellos || 1;
            sellosMes += n;
            porCliente[l.userId] = (porCliente[l.userId] || 0) + n;
            const key = new Date(
              (l.fecha as Timestamp)?.toMillis?.() ?? 0
            ).toDateString();
            if (key in serieMap) serieMap[key] += n;
          } else if (l.tipo === "CANJE") {
            canjesMes++;
          }
        });

        const serie = Object.keys(serieMap).map((k) => ({
          dia: DIAS[new Date(k).getDay()],
          sellos: serieMap[k],
        }));

        const topCliente = Math.max(0, ...Object.values(porCliente));
        const concentracion =
          sellosMes > 0 ? Math.round((topCliente / sellosMes) * 100) : 0;

        setKpis({
          sellosMes,
          canjesMes,
          activos,
          inactivos: clientes.length - activos,
          totalClientes: clientes.length,
          serie,
          concentracion,
        });
      } catch {
        setKpis(null);
      }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Panel de gerencia</p>
        <h1 className="font-headline text-2xl font-bold">Métricas 📊</h1>
      </div>

      {!kpis ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Sellos del mes" value={kpis.sellosMes} emoji="🍣" />
            <Kpi label="Canjes del mes" value={kpis.canjesMes} emoji="🎁" />
            <Kpi label="Clientes activos" value={kpis.activos} emoji="🟢" />
            <Kpi label="Inactivos (30d)" value={kpis.inactivos} emoji="😴" />
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="mb-3 font-semibold">Tendencia semanal de sellos</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpis.serie}>
                    <XAxis
                      dataKey="dia"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--secondary))" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="sellos"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {kpis.concentracion >= 40 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="text-2xl">⚠️</span>
                <p className="text-sm">
                  <strong>Alerta de concentración:</strong> el cliente más activo
                  representa el {kpis.concentracion}% de los sellos del mes.
                  Diversifica con promos para nuevos clientes.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Base total: <strong>{kpis.totalClientes}</strong> clientes
              registrados · {kpis.activos} activos en los últimos 30 días.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl">{emoji}</p>
        <p className="font-headline text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function GerentePage() {
  return (
    <RequireAuth roles={["gerente", "admin"]}>
      <GerenteInner />
    </RequireAuth>
  );
}
