"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gift,
  ScrollText,
  Search,
  Users,
  Store,
  RefreshCw,
  Stamp,
  Gift as GiftIcon,
} from "lucide-react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { AdminGate } from "@/components/AdminGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getRango } from "@/lib/rangos";
import type { PendingStamp } from "@/types";

// --- Tipos de la respuesta de /api/admin/stats ---
interface ResumenStats {
  totalClientes: number;
  totalStaff: number;
  totalBaneados: number;
  sellosActuales: number;
  sellosHistoricos: number;
  nuevos7d: number;
  canjesPendientes: number;
  localesOperativos: number;
  localesTotales: number;
}
interface LocalStats {
  id: string;
  nombre: string;
  emoji: string;
  instagram: string | null;
  activo: boolean;
  operativo: boolean;
  clientes: number;
  sellos: number;
  sellosParaPremio: number;
  ultimaActividad: number | null;
  eventos7d: number;
  eventos30d: number;
}
interface ClienteStats {
  uid: string;
  nombre: string;
  email: string;
  telefono: string;
  comuna: string;
  fechaNacimiento: string;
  sellos: number;
  sellosHistoricos: number;
  rachaActual: number;
  baneado: boolean;
  sellosLocales: Record<string, number>;
  ultimaVisita: number | null;
  createdAt: number | null;
}
interface StatsResponse {
  resumen: ResumenStats;
  locales: LocalStats[];
  clientes: ClienteStats[];
}

function fmtFecha(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function fmtRelativo(ms: number | null): string {
  if (!ms) return "sin actividad";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-1 font-headline text-2xl font-bold leading-none">
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ResumenCards({ r }: { r: ResumenStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="Socios"
        value={r.totalClientes}
        hint={`+${r.nuevos7d} en 7 días`}
        icon={<Users className="h-4 w-4" />}
      />
      <StatCard
        label="Locales activos"
        value={`${r.localesOperativos}/${r.localesTotales}`}
        hint="con movimiento (7d)"
        icon={<Store className="h-4 w-4" />}
      />
      <StatCard
        label="Sellos vigentes"
        value={r.sellosActuales}
        hint={`${r.sellosHistoricos} históricos`}
        icon={<Stamp className="h-4 w-4" />}
      />
      <StatCard
        label="Canjes activos"
        value={r.canjesPendientes}
        hint={r.totalBaneados ? `${r.totalBaneados} suspendidos` : "vouchers vivos"}
        icon={<GiftIcon className="h-4 w-4" />}
      />
    </div>
  );
}

function LocalesTab({ locales }: { locales: LocalStats[] }) {
  if (locales.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No hay locales registrados.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {locales.map((l) => (
        <Card key={l.id}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{l.emoji}</span>
                  <p className="truncate font-semibold">{l.nombre}</p>
                  {l.operativo ? (
                    <Badge variant="accent">Operativo</Badge>
                  ) : l.activo ? (
                    <Badge variant="secondary">Sin movimiento</Badge>
                  ) : (
                    <Badge variant="destructive">Inactivo</Badge>
                  )}
                </div>
                {l.instagram && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    @{l.instagram}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {fmtRelativo(l.ultimaActividad)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="font-headline text-lg font-bold leading-none">
                  {l.clientes}
                </p>
                <p className="text-[10px] text-muted-foreground">socios</p>
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="font-headline text-lg font-bold leading-none">
                  {l.sellos}
                </p>
                <p className="text-[10px] text-muted-foreground">sellos</p>
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="font-headline text-lg font-bold leading-none">
                  {l.eventos7d}
                </p>
                <p className="text-[10px] text-muted-foreground">mov. 7d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ClientesTab({
  clientes,
  onBan,
}: {
  clientes: ClienteStats[];
  onBan: (c: ClienteStats) => void;
}) {
  const [term, setTerm] = useState("");

  const filtrados = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t) ||
        c.comuna.toLowerCase().includes(t) ||
        c.telefono.includes(t)
    );
  }, [clientes, term]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filtrar por nombre, email, comuna o teléfono…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtrados.length} de {clientes.length} socios
      </p>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((c) => {
            const rango = getRango(c.sellosHistoricos);
            return (
              <Card key={c.uid}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {c.nombre || "Sin nombre"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.email}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {rango.emoji} {rango.nombre}
                        </Badge>
                        <Badge variant="outline">🍣 {c.sellos}</Badge>
                        <Badge variant="outline">
                          histórico {c.sellosHistoricos}
                        </Badge>
                        {c.baneado && (
                          <Badge variant="destructive">Suspendido</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        Ban
                      </span>
                      <Switch
                        checked={c.baneado}
                        onCheckedChange={() => onBan(c)}
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    {c.telefono && <span>📱 {c.telefono}</span>}
                    {c.comuna && <span>📍 {c.comuna}</span>}
                    {c.fechaNacimiento && <span>🎂 {c.fechaNacimiento}</span>}
                    {c.rachaActual > 0 && <span>🔥 racha {c.rachaActual}</span>}
                    <span>👋 últ. {fmtFecha(c.ultimaVisita)}</span>
                    <span>📅 desde {fmtFecha(c.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendientesTab() {
  const [pendientes, setPendientes] = useState<PendingStamp[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "pending_stamps"),
      where("status", "==", "pending"),
      limit(30)
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setPendientes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingStamp)
        ),
      () => setPendientes([])
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-2">
      {pendientes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay handshakes pendientes.
        </p>
      ) : (
        pendientes.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-3 text-sm">
              <div>
                <p className="font-semibold">{p.userNombre || p.userId}</p>
                <p className="text-xs text-muted-foreground">
                  ${p.monto} · {p.numSellos} sellos
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(
                  (p.createdAt as Timestamp)?.toMillis?.() ?? 0
                ).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AdminInner() {
  const { toast } = useToast();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: json.error });
        return;
      }
      setData(json as StatsResponse);
    } catch {
      toast({ title: "Error de red al cargar métricas" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const banear = async (c: ClienteStats) => {
    try {
      await updateDoc(doc(db, "usuarios", c.uid), { baneado: !c.baneado });
      setData((prev) =>
        prev
          ? {
              ...prev,
              clientes: prev.clientes.map((x) =>
                x.uid === c.uid ? { ...x, baneado: !x.baneado } : x
              ),
            }
          : prev
      );
      toast({ title: c.baneado ? "Socio reactivado" : "Socio suspendido" });
    } catch {
      toast({ title: "No se pudo actualizar" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Administración</p>
          <h1 className="font-headline text-2xl font-bold">Panel Admin 🫙</h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={cargar}
          disabled={loading}
          aria-label="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : data ? (
        <ResumenCards r={data.resumen} />
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/admin/premios">
            <Gift className="h-5 w-5" />
            <span>Premios</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/admin/logs">
            <ScrollText className="h-5 w-5" />
            <span>Logs</span>
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="locales">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locales">Locales</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="locales">
          {data ? (
            <LocalesTab locales={data.locales} />
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </TabsContent>

        <TabsContent value="clientes">
          {data ? (
            <ClientesTab clientes={data.clientes} onBan={banear} />
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </TabsContent>

        <TabsContent value="pendientes">
          <PendientesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminInner />
    </AdminGate>
  );
}
