"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Stamp,
  Gift,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface Plataforma {
  tenantsTotales: number;
  tenantsOperativos: number;
  totalUsuarios: number;
  totalClientes: number;
  totalStaff: number;
  sellosPlataforma: number;
  canjesPendientes: number;
}
interface Tenant {
  id: string;
  nombre: string;
  emoji: string;
  instagram: string | null;
  activo: boolean;
  origen: "registro" | "firestore";
  operativo: boolean;
  clientes: number;
  sellos: number;
  sellosHistoricos: number;
  sellosEntregados: number;
  canjesPendientes: number;
  canjesUsados: number;
  ultimaActividad: number | null;
  eventos7d: number;
  eventos30d: number;
}
interface OverviewResponse {
  plataforma: Plataforma;
  tenants: Tenant[];
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
        {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function TenantCard({ t }: { t: Tenant }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">{t.emoji}</span>
              <p className="truncate font-semibold">{t.nombre}</p>
              {t.operativo ? (
                <Badge variant="accent">Operativo</Badge>
              ) : t.activo ? (
                <Badge variant="secondary">Sin movimiento</Badge>
              ) : (
                <Badge variant="destructive">Inactivo</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {t.origen === "firestore" ? "Firestore" : "registro"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="font-mono">{t.id}</span>
              {t.instagram ? ` · @${t.instagram}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {fmtRelativo(t.ultimaActividad)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 py-2">
            <p className="font-headline text-lg font-bold leading-none">
              {t.clientes}
            </p>
            <p className="text-[10px] text-muted-foreground">clientes</p>
          </div>
          <div className="rounded-lg bg-muted/50 py-2">
            <p className="font-headline text-lg font-bold leading-none">
              {t.sellos}
            </p>
            <p className="text-[10px] text-muted-foreground">sellos</p>
          </div>
          <div className="rounded-lg bg-muted/50 py-2">
            <p className="font-headline text-lg font-bold leading-none">
              {t.canjesUsados}
            </p>
            <p className="text-[10px] text-muted-foreground">canjes</p>
          </div>
          <div className="rounded-lg bg-muted/50 py-2">
            <p className="font-headline text-lg font-bold leading-none">
              {t.eventos7d}
            </p>
            <p className="text-[10px] text-muted-foreground">mov. 7d</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SuperAdminInner() {
  const { toast } = useToast();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/overview", {
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
      setData(json as OverviewResponse);
    } catch {
      toast({ title: "Error de red al cargar la plataforma" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const p = data?.plataforma;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Consola de plataforma</p>
          <h1 className="font-headline text-2xl font-bold">Superadmin 🛰️</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Ir a admin">
            <Link href="/admin">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
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
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : p ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Locales"
            value={`${p.tenantsOperativos}/${p.tenantsTotales}`}
            hint="operativos (mov. 7d)"
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatCard
            label="Clientes"
            value={p.totalClientes}
            hint={`${p.totalStaff} staff · ${p.totalUsuarios} cuentas`}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Sellos"
            value={p.sellosPlataforma}
            hint="vigentes en la plataforma"
            icon={<Stamp className="h-4 w-4" />}
          />
          <StatCard
            label="Canjes activos"
            value={p.canjesPendientes}
            hint="vouchers vivos"
            icon={<Gift className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 font-headline text-lg font-bold">
          Locales / Tenants
        </h2>
        {!data ? (
          <div className="space-y-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : data.tenants.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay locales registrados todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {data.tenants.map((t) => (
              <TenantCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  // TEMPORAL (testeo): sin gate de rol ni PIN. Solo exige sesión iniciada
  // porque el endpoint necesita el ID token. Volver a <SuperAdminGate> para
  // restringir a rol superadmin.
  return (
    <RequireAuth>
      <SuperAdminInner />
    </RequireAuth>
  );
}
