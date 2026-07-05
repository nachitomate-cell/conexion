"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Stamp,
  Gift,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Package,
  type LucideIcon,
} from "lucide-react";
import { useVendor } from "@/context/VendorContext";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// SCAFFOLD DE CONSULTAS FIRESTORE (comentado, listo para conectar).
// Todas filtran por vendorId — regla de oro multitenant respetada.
// ------------------------------------------------------------------
// import { collection, query, where, Timestamp } from "firebase/firestore";
// import { db } from "@/lib/firebase";
//
// function rangeStart(range: TimeRange): Date {
//   const d = new Date();
//   if (range === "7d") d.setDate(d.getDate() - 7);
//   if (range === "30d") d.setDate(d.getDate() - 30);
//   if (range === "12m") d.setFullYear(d.getFullYear() - 1);
//   return d;
// }
//
// const desde = Timestamp.fromDate(rangeStart(range));
//
// query(collection(db, "usuarios"), where("createdAt", ">=", desde));
// query(
//   collection(db, "system_logs"),
//   where("vendorId", "==", vendor.id),
//   where("tipo", "in", ["SELLO", "CANJE"]),
//   where("fecha", ">=", desde)
// );
// query(
//   collection(db, "canjes"),
//   where("vendorId", "==", vendor.id),
//   where("createdAt", ">=", desde)
// );
// query(collection(db, "premios"), where("vendorId", "==", vendor.id));
// ------------------------------------------------------------------

type TimeRange = "7d" | "30d" | "12m";

const RANGE_LABEL: Record<TimeRange, string> = {
  "7d": "Últimos 7 días",
  "30d": "Este mes",
  "12m": "Este año",
};

interface Kpi {
  label: string;
  value: string;
  hint: string;
  delta: number;
  icon: LucideIcon;
}

interface Canje {
  id: string;
  usuario: string;
  premio: string;
  fecha: string;
  estado: "canjeado" | "pendiente" | "expirado";
}

interface InventarioItem {
  id: string;
  nombre: string;
  emoji: string;
  canjesTotal: number;
  stock: number;
  activo: boolean;
}

// Data mockeada por rango. Reemplazar por resultados de las queries de arriba.
const MOCK: Record<
  TimeRange,
  { kpis: Kpi[]; canjes: Canje[]; inventario: InventarioItem[] }
> = {
  "7d": {
    kpis: [
      { label: "Socios registrados", value: "1.284", hint: "+48 esta semana", delta: 3.9, icon: Users },
      { label: "Sellos emitidos", value: "912", hint: "escaneos válidos", delta: 12.4, icon: Stamp },
      { label: "Recompensas canjeadas", value: "58", hint: "vouchers usados", delta: 8.1, icon: Gift },
      { label: "Tasa de retención", value: "42%", hint: "socios recurrentes", delta: -1.2, icon: TrendingUp },
    ],
    canjes: [
      { id: "c1", usuario: "María González", premio: "Gyozas de Cerdo", fecha: "hace 2 h", estado: "canjeado" },
      { id: "c2", usuario: "Diego Rojas", premio: "Roll a elección (8 cortes)", fecha: "hace 4 h", estado: "canjeado" },
      { id: "c3", usuario: "Camila Vera", premio: "Gyozas de Cerdo", fecha: "hace 6 h", estado: "pendiente" },
      { id: "c4", usuario: "Ignacio M.", premio: "Roll a elección (8 cortes)", fecha: "ayer", estado: "canjeado" },
      { id: "c5", usuario: "Sofía P.", premio: "Postre incluido", fecha: "ayer", estado: "expirado" },
    ],
    inventario: [
      { id: "p1", nombre: "Gyozas de Cerdo", emoji: "🥟", canjesTotal: 34, stock: 120, activo: true },
      { id: "p2", nombre: "Roll a elección (8 cortes)", emoji: "🍣", canjesTotal: 21, stock: 40, activo: true },
      { id: "p3", nombre: "Postre incluido", emoji: "🍡", canjesTotal: 8, stock: 25, activo: true },
      { id: "p4", nombre: "Bebida gratis", emoji: "🥤", canjesTotal: 0, stock: 60, activo: false },
    ],
  },
  "30d": {
    kpis: [
      { label: "Socios registrados", value: "1.284", hint: "+186 este mes", delta: 16.9, icon: Users },
      { label: "Sellos emitidos", value: "3.842", hint: "escaneos válidos", delta: 22.1, icon: Stamp },
      { label: "Recompensas canjeadas", value: "241", hint: "vouchers usados", delta: 11.5, icon: Gift },
      { label: "Tasa de retención", value: "47%", hint: "socios recurrentes", delta: 2.3, icon: TrendingUp },
    ],
    canjes: [
      { id: "c1", usuario: "María González", premio: "Gyozas de Cerdo", fecha: "hace 3 días", estado: "canjeado" },
      { id: "c2", usuario: "Diego Rojas", premio: "Roll a elección (8 cortes)", fecha: "hace 5 días", estado: "canjeado" },
      { id: "c3", usuario: "Fernanda B.", premio: "Postre incluido", fecha: "hace 1 sem", estado: "canjeado" },
      { id: "c4", usuario: "Ignacio M.", premio: "Gyozas de Cerdo", fecha: "hace 2 sem", estado: "canjeado" },
      { id: "c5", usuario: "Sofía P.", premio: "Roll a elección (8 cortes)", fecha: "hace 3 sem", estado: "expirado" },
    ],
    inventario: [
      { id: "p1", nombre: "Gyozas de Cerdo", emoji: "🥟", canjesTotal: 138, stock: 120, activo: true },
      { id: "p2", nombre: "Roll a elección (8 cortes)", emoji: "🍣", canjesTotal: 84, stock: 40, activo: true },
      { id: "p3", nombre: "Postre incluido", emoji: "🍡", canjesTotal: 19, stock: 25, activo: true },
      { id: "p4", nombre: "Bebida gratis", emoji: "🥤", canjesTotal: 0, stock: 60, activo: false },
    ],
  },
  "12m": {
    kpis: [
      { label: "Socios registrados", value: "1.284", hint: "acumulado histórico", delta: 92.4, icon: Users },
      { label: "Sellos emitidos", value: "38.412", hint: "escaneos válidos", delta: 71.9, icon: Stamp },
      { label: "Recompensas canjeadas", value: "2.108", hint: "vouchers usados", delta: 63.2, icon: Gift },
      { label: "Tasa de retención", value: "51%", hint: "socios recurrentes", delta: 6.8, icon: TrendingUp },
    ],
    canjes: [
      { id: "c1", usuario: "María González", premio: "Gyozas de Cerdo", fecha: "hace 2 m", estado: "canjeado" },
      { id: "c2", usuario: "Diego Rojas", premio: "Roll a elección (8 cortes)", fecha: "hace 3 m", estado: "canjeado" },
      { id: "c3", usuario: "Camila Vera", premio: "Postre incluido", fecha: "hace 4 m", estado: "canjeado" },
      { id: "c4", usuario: "Ignacio M.", premio: "Gyozas de Cerdo", fecha: "hace 6 m", estado: "canjeado" },
      { id: "c5", usuario: "Sofía P.", premio: "Roll a elección (8 cortes)", fecha: "hace 9 m", estado: "canjeado" },
    ],
    inventario: [
      { id: "p1", nombre: "Gyozas de Cerdo", emoji: "🥟", canjesTotal: 1_204, stock: 120, activo: true },
      { id: "p2", nombre: "Roll a elección (8 cortes)", emoji: "🍣", canjesTotal: 618, stock: 40, activo: true },
      { id: "p3", nombre: "Postre incluido", emoji: "🍡", canjesTotal: 214, stock: 25, activo: true },
      { id: "p4", nombre: "Bebida gratis", emoji: "🥤", canjesTotal: 72, stock: 60, activo: false },
    ],
  },
};

function TimeRangePicker({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {RANGE_LABEL[value]}
        <ChevronDown
          className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-44 overflow-hidden rounded-lg border bg-white shadow-lg">
          {(Object.keys(RANGE_LABEL) as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3.5 py-2 text-left text-sm hover:bg-slate-50",
                value === r ? "font-semibold text-primary" : "text-slate-700"
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const up = kpi.delta >= 0;
  const TrendArrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          <TrendArrow className="h-3 w-3" strokeWidth={2.5} />
          {up ? "+" : ""}
          {kpi.delta.toFixed(1)}%
        </span>
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-slate-500">
        {kpi.label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
        {kpi.value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{kpi.hint}</p>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: Canje["estado"] }) {
  const styles = {
    canjeado: "bg-emerald-50 text-emerald-700",
    pendiente: "bg-amber-50 text-amber-700",
    expirado: "bg-slate-100 text-slate-600",
  } as const;
  const label = {
    canjeado: "Canjeado",
    pendiente: "Pendiente",
    expirado: "Expirado",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        styles[estado]
      )}
    >
      {label[estado]}
    </span>
  );
}

function CanjesTable({ canjes }: { canjes: Canje[] }) {
  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Últimos canjes
          </h2>
          <p className="text-xs text-slate-500">
            Actividad reciente del programa de fidelización
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {canjes.length}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2.5 font-semibold">Usuario</th>
              <th className="px-5 py-2.5 font-semibold">Premio</th>
              <th className="px-5 py-2.5 font-semibold">Fecha</th>
              <th className="px-5 py-2.5 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {canjes.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/40">
                <td className="px-5 py-3 font-medium text-slate-800">
                  {c.usuario}
                </td>
                <td className="px-5 py-3 text-slate-600">{c.premio}</td>
                <td className="px-5 py-3 text-slate-500">{c.fecha}</td>
                <td className="px-5 py-3">
                  <EstadoBadge estado={c.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InventarioPanel({ items }: { items: InventarioItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.canjesTotal));
  const topId = items.slice().sort((a, b) => b.canjesTotal - a.canjesTotal)[0]?.id;

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Package className="h-4 w-4 text-primary" strokeWidth={2.25} />
            Inventario de recompensas
          </h2>
          <p className="text-xs text-slate-500">
            Volumen de canjes por premio en el rango
          </p>
        </div>
      </header>
      <ul className="divide-y">
        {items.map((it) => {
          const pct = Math.round((it.canjesTotal / max) * 100);
          return (
            <li key={it.id} className="px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                  {it.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {it.nombre}
                    </p>
                    {it.id === topId && it.canjesTotal > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Top
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {it.canjesTotal.toLocaleString("es-CL")} canjes · stock {it.stock}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    it.activo
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {it.activo ? "Activo" : "Pausado"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function AdminDashboardPage() {
  const vendor = useVendor();
  const [range, setRange] = useState<TimeRange>("30d");
  const data = useMemo(() => MOCK[range], [range]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {vendor.nombre}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900 md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen analítico del programa de fidelización
          </p>
        </div>
        <TimeRangePicker value={range} onChange={setRange} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CanjesTable canjes={data.canjes} />
        </div>
        <div>
          <InventarioPanel items={data.inventario} />
        </div>
      </section>
    </div>
  );
}
