"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  Coins,
  Gift,
  MapPin,
  Ticket,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VENDORS } from "@/lib/vendors";
import { cn } from "@/lib/utils";
import type { Canje, SystemLog } from "@/types";

// =========================================================
// Historial — timeline unificado de sellos ganados + canjes.
// Desktop = panel amplio con hero, stats bento y filtro por
// club. Empty state gamificado empuja al usuario a /explora.
// =========================================================

type EventoTipo = "SELLO" | "CANJE";
type EventoVariant = "default" | "secondary" | "accent" | "gold";

interface Evento {
  id: string;
  tipo: EventoTipo;
  fecha: number;
  titulo: string;
  detalle: string;
  emoji: string;
  tag: string;
  variant: EventoVariant;
  vendorId?: string;
  numSellos?: number;
}

function fmtFecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function vendorInfo(id: string | undefined) {
  if (!id) return null;
  const v = VENDORS[id];
  if (!v) return { nombre: id, emoji: "🎁" };
  return { nombre: v.nombre, emoji: v.emoji };
}

// ─── Bento stat ──────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  accent: "primary" | "emerald" | "amber";
}) {
  const bgCls = {
    primary: "bg-primary/5 ring-primary/15",
    emerald: "bg-emerald-50 ring-emerald-100",
    amber: "bg-amber-50 ring-amber-100",
  }[accent];
  const iconCls = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  }[accent];
  const numCls = {
    primary: "text-primary",
    emerald: "text-emerald-600",
    amber: "text-amber-700",
  }[accent];
  return (
    <div className={cn("rounded-2xl p-5 ring-1", bgCls)}>
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          iconCls
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          "mt-4 font-headline text-[32px] font-black leading-none tabular-nums",
          numCls
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-slate-800">{label}</p>
    </div>
  );
}

// ─── Empty state gamificado ──────────────────────────────

function EmptyHistorial() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-12 text-center shadow-sm">
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-100 p-6 text-indigo-600">
        <Ticket className="h-12 w-12" strokeWidth={1.5} />
      </div>
      <h2 className="mt-2 font-headline text-[24px] font-black tracking-tight text-slate-900 md:text-[28px]">
        Todavía no tienes movimientos
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-slate-600">
        Aún no tienes movimientos en tu billetera. ¡Empieza a explorar la
        Quinta Región, acumula tu primer sello y desbloquea recompensas en
        tus locales favoritos!
      </p>
      <Link
        href="/explora"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800"
      >
        📍 Explorar Locales Adheridos
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Fila del timeline ───────────────────────────────────

function EventoCard({ e }: { e: Evento }) {
  const info = vendorInfo(e.vendorId);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-[24px] ring-1 ring-slate-100">
        {e.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-headline text-[15px] font-extrabold tracking-tight text-slate-900">
            {e.titulo}
          </p>
          <Badge variant={e.variant} className="shrink-0">
            {e.tag}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-slate-500">
          {e.detalle}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
          {info && (
            <>
              <span className="inline-flex items-center gap-1">
                <span>{info.emoji}</span>
                <span>{info.nombre}</span>
              </span>
              <span>·</span>
            </>
          )}
          <span className="tabular-nums">{fmtFecha(e.fecha)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────

function HistorialInner() {
  const { firebaseUser } = useAuth();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");

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
              tipo: "SELLO",
              fecha: ms,
              titulo: `+${l.numSellos ?? 1} sello`,
              detalle:
                l.metodo === "HANDSHAKE"
                  ? "Compra en caja"
                  : "Escaneo en el local",
              emoji: "🍣",
              tag: "Sello",
              variant: "secondary",
              vendorId: l.vendorId,
              numSellos: l.numSellos ?? 1,
            });
          }
        });

        canjesSnap.forEach((d) => {
          const c = d.data() as Canje;
          const ms = (c.createdAt as Timestamp)?.toMillis?.() ?? 0;
          evs.push({
            id: d.id,
            tipo: "CANJE",
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
            vendorId: c.vendorId,
          });
        });

        evs.sort((a, b) => b.fecha - a.fecha);
        setEventos(evs);
      } catch {
        setEventos([]);
      }
    })();
  }, [firebaseUser]);

  // ── Métricas + lista de clubes para el filtro ──
  const stats = useMemo(() => {
    const list = eventos ?? [];
    const totalSellos = list
      .filter((e) => e.tipo === "SELLO")
      .reduce((sum, e) => sum + (e.numSellos ?? 0), 0);
    const totalCanjes = list.filter((e) => e.tipo === "CANJE").length;
    const clubes = new Set(list.map((e) => e.vendorId).filter(Boolean));
    return {
      totalSellos,
      totalCanjes,
      clubesCount: clubes.size,
    };
  }, [eventos]);

  const clubesFiltro = useMemo(() => {
    const set = new Set<string>();
    (eventos ?? []).forEach((e) => {
      if (e.vendorId) set.add(e.vendorId);
    });
    return Array.from(set).map((id) => {
      const v = VENDORS[id];
      return {
        id,
        nombre: v?.nombre ?? id,
        emoji: v?.emoji ?? "🎁",
      };
    });
  }, [eventos]);

  const eventosVisibles = useMemo(() => {
    if (!eventos) return null;
    if (filtro === "todos") return eventos;
    return eventos.filter((e) => e.vendorId === filtro);
  }, [eventos, filtro]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-8">
      {/* ── Hero ── */}
      <header className="flex flex-col gap-4 pt-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/70">
            Mi actividad
          </p>
          <h1 className="mt-2 font-headline text-[32px] font-black leading-none tracking-tight md:text-[40px]">
            Mi Historial de Sellos y Canjes
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground md:text-[15px]">
            Cada sello que sumaste y cada premio que canjeaste, en un solo
            lugar.
          </p>
        </div>

        {clubesFiltro.length > 0 && (
          <div className="shrink-0">
            <label
              htmlFor="historial-filtro-club"
              className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Filtrar por club
            </label>
            <select
              id="historial-filtro-club"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-slate-800 shadow-sm outline-none transition-colors focus:border-indigo-500"
            >
              <option value="todos">Todos los locales</option>
              {clubesFiltro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* ── Stats bento ── */}
      {eventos && eventos.length > 0 && (
        <div className="mb-8 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Coins className="h-5 w-5" />}
            value={stats.totalSellos}
            label="Sellos acumulados"
            accent="primary"
          />
          <StatCard
            icon={<Gift className="h-5 w-5" />}
            value={stats.totalCanjes}
            label="Premios canjeados"
            accent="emerald"
          />
          <StatCard
            icon={<MapPin className="h-5 w-5" />}
            value={stats.clubesCount}
            label="Clubes visitados"
            accent="amber"
          />
        </div>
      )}

      {/* ── Timeline / empty / loading ── */}
      {eventos === null ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : eventos.length === 0 ? (
        <div className="mt-8">
          <EmptyHistorial />
        </div>
      ) : eventosVisibles && eventosVisibles.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <p className="text-3xl">🔎</p>
          <p className="mt-2 text-[13px] text-slate-600">
            No hay movimientos para este club en tu historial.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventosVisibles!.map((e) => (
            <EventoCard key={e.id} e={e} />
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
