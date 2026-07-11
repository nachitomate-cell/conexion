"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  DollarSign,
  Flame,
  Globe,
  Handshake,
  Info,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RUBRO_META } from "@/lib/mercadoVina";
import type { ProspectoRubro, VendorStatus } from "@/types";

// =========================================================
// Tipos — matchean la respuesta de /api/superadmin/overview
// =========================================================

type EntornoTier = string;
type PlanTier = string;
type StatusFilter = "todos" | VendorStatus;

interface TenantRow {
  id: string;
  nombre: string;
  emoji: string;
  slug: string;
  dominio: string | null;
  createdAt: string | null;
  status: VendorStatus;
  entorno: EntornoTier;
  plan: PlanTier;
  usuarios: number;
  sellos30d: number;
  canjes30d: number;
  fireReads: number;
  fireWrites: number;
  mrr: number;
  ownerEmail: string | null;
  nota: string | null;
}

interface IncidentApi {
  id: string;
  titulo: string;
  descripcion: string;
  severidad: "critical" | "warning" | "info";
  vendorId: string | null;
  createdAt: number;
}

interface OverviewResponse {
  plataforma: {
    tenantsTotales: number;
    tenantsOperativos: number;
    totalUsuarios: number;
    totalClientes: number;
    totalStaff: number;
    sellosPlataforma: number;
    canjesPendientes: number;
    mrrTotal: number;
  };
  tenants: Array<{
    id: string;
    nombre: string;
    emoji: string;
    slug: string;
    status: VendorStatus;
    dominio: string | null;
    plan: string;
    entorno: string;
    mrr: number;
    ownerEmail: string | null;
    nota: string | null;
    createdAt: string | null;
    fireReads: number;
    fireWrites: number;
    clientes: number;
    sellos30d: number;
    canjes30d: number;
  }>;
  requestsSpark: number[];
  incidents: IncidentApi[];
}

type YearFilter = "todos" | "2024" | "2025" | "2026";

const INCIDENT_META: Record<
  IncidentApi["severidad"],
  { icon: LucideIcon; color: string }
> = {
  critical: { icon: Flame, color: "text-rose-400" },
  warning: { icon: Globe, color: "text-amber-400" },
  info: { icon: Info, color: "text-sky-400" },
};

function mapTenant(t: OverviewResponse["tenants"][number]): TenantRow {
  return {
    id: t.id,
    nombre: t.nombre,
    emoji: t.emoji,
    slug: t.slug,
    dominio: t.dominio,
    createdAt: t.createdAt,
    status: t.status,
    entorno: t.entorno,
    plan: t.plan,
    usuarios: t.clientes,
    sellos30d: t.sellos30d,
    canjes30d: t.canjes30d,
    fireReads: t.fireReads,
    fireWrites: t.fireWrites,
    mrr: t.mrr,
    ownerEmail: t.ownerEmail,
    nota: t.nota,
  };
}

// =========================================================
// Utilidades de formato
// =========================================================

function fmtNumber(n: number): string {
  return n.toLocaleString("es-CL");
}

function fmtCLP(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelativo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

// =========================================================
// Config visual del pipeline
// =========================================================

const STATUS_META: Record<
  VendorStatus,
  {
    label: string;
    icon: LucideIcon;
    // Estilo de la columna (light — se ve como panel iluminado sobre el frame oscuro)
    col: string;
    colBorder: string;
    // Badge / píldora del estado
    badge: string;
    // Barra superior de la tarjeta (identifica visualmente la etapa)
    stripe: string;
    // Ícono coloreado del header
    iconWrap: string;
    // Copy secundario del header
    desc: string;
  }
> = {
  propuesta: {
    label: "Propuestas",
    icon: Sparkles,
    col: "bg-slate-50",
    colBorder: "border-slate-200",
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    stripe: "bg-blue-400",
    iconWrap: "bg-blue-100 text-blue-700",
    desc: "Clientes potenciales · en conversación",
  },
  por_presentar: {
    label: "Falta por presentar",
    icon: Handshake,
    col: "bg-orange-50",
    colBorder: "border-orange-200",
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
    stripe: "bg-orange-400",
    iconWrap: "bg-orange-100 text-orange-700",
    desc: "Listo para mostrar al cliente",
  },
  funcionando: {
    label: "Funcionando",
    icon: Rocket,
    col: "bg-emerald-50",
    colBorder: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    stripe: "bg-gradient-to-r from-emerald-400 to-lime-400",
    iconWrap: "bg-emerald-100 text-emerald-800",
    desc: "En uso real por parte del cliente",
  },
};

const STATUS_ORDER: VendorStatus[] = [
  "propuesta",
  "por_presentar",
  "funcionando",
];

// =========================================================
// KPI Cards (fila superior)
// =========================================================

interface KpiSpec {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "indigo" | "emerald" | "amber" | "fuchsia";
}

function KpiCard({ kpi }: { kpi: KpiSpec }) {
  const Icon = kpi.icon;

  const toneMap = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-300 ring-indigo-500/30",
    emerald: "from-emerald-400/25 to-emerald-400/0 text-emerald-300 ring-emerald-400/40",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300 ring-amber-500/30",
    fuchsia: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300 ring-fuchsia-500/30",
  } as const;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] sm:p-5">
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-90",
          toneMap[kpi.tone]
        )}
      />
      <div className="relative">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
            toneMap[kpi.tone]
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      </div>
      <p className="relative mt-3 text-[10px] font-medium uppercase tracking-widest text-slate-400 sm:text-[11px]">
        {kpi.label}
      </p>
      <p className="relative mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
        {kpi.value}
      </p>
      <p className="relative mt-0.5 text-[11px] text-slate-400 sm:text-xs">
        {kpi.hint}
      </p>
    </div>
  );
}

// =========================================================
// Slicers (filtros avanzados)
// =========================================================

function Slicer<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm hover:bg-slate-800"
      >
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
        <span className="text-slate-100">{current?.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 min-w-[10rem] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-xs hover:bg-slate-800",
                value === o.value
                  ? "font-semibold text-fuchsia-300"
                  : "text-slate-300"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================
// Menú para cambiar el estado — dropdown en desktop, bottom sheet en móvil
// =========================================================

function StatusChangeMenu({
  currentStatus,
  onSelect,
  onClose,
}: {
  currentStatus: VendorStatus;
  onSelect: (next: VendorStatus) => void;
  onClose: () => void;
}) {
  const alternatives = STATUS_ORDER.filter((s) => s !== currentStatus);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <>
      {/* Backdrop — bloquea clicks fuera */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 sm:bg-transparent sm:backdrop-blur-0"
      />
      {/* Bottom sheet en móvil, popover en sm+ */}
      <div
        role="dialog"
        aria-label="Cambiar estado del cliente"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border border-b-0 border-slate-200 bg-white p-3 pb-safe shadow-2xl animate-in slide-in-from-bottom-4 duration-300",
          "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1.5 sm:min-w-[14rem] sm:rounded-xl sm:border sm:p-1.5 sm:slide-in-from-top-2"
        )}
      >
        {/* Grip iOS-style solo en móvil */}
        <div
          aria-hidden
          className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden"
        />
        <p className="px-3 pb-1 pt-1 text-[11px] uppercase tracking-widest text-slate-500 sm:hidden">
          Mover a
        </p>
        <ul className="space-y-1">
          {alternatives.map((s) => {
            const alt = STATUS_META[s];
            const Icon = alt.icon;
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 active:scale-[0.99]",
                    s === "funcionando" && "hover:bg-emerald-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      alt.iconWrap
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">
                      {alt.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {alt.desc}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {/* Cancelar — solo en móvil */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 sm:hidden"
        >
          Cancelar
        </button>
      </div>
    </>
  );
}

// =========================================================
// Tarjeta de tenant (para el Kanban)
// =========================================================

function TenantCard({
  t,
  onImpersonate,
  onChangeStatus,
}: {
  t: TenantRow;
  onImpersonate: (t: TenantRow) => void;
  onChangeStatus: (id: string, next: VendorStatus) => void;
}) {
  const meta = STATUS_META[t.status];
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={cn("h-1 w-full", meta.stripe)} />
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl ring-1 ring-slate-200">
              {t.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-slate-900">
                {t.nombre}
              </h4>
              {t.dominio && (
                <p className="truncate text-[11px] text-slate-500">
                  {t.dominio}
                </p>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Cambiar estado"
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 transition-all duration-200 hover:brightness-105 active:scale-[0.97]",
                meta.badge
              )}
            >
              {meta.label}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  menuOpen && "rotate-180"
                )}
                strokeWidth={2.5}
              />
            </button>
            {menuOpen && (
              <StatusChangeMenu
                currentStatus={t.status}
                onSelect={(next) => onChangeStatus(t.id, next)}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </header>

        {/* Meta info — solo fecha; código interno queda para admin */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Desde {fmtFecha(t.createdAt)}
          </span>
        </div>

        {/* Mini métricas — solo para funcionando */}
        {t.status === "funcionando" && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-emerald-50/80 p-2 ring-1 ring-emerald-100">
            <div className="text-center">
              <p className="text-sm font-bold tabular-nums text-emerald-900">
                {fmtNumber(t.usuarios)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                usuarios
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold tabular-nums text-emerald-900">
                {fmtNumber(t.sellos30d)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                actividad 30d
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold tabular-nums text-emerald-900">
                {t.mrr > 0 ? fmtCLP(t.mrr) : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70">
                ingresos
              </p>
            </div>
          </div>
        )}

        {/* Nota interna — visible en las etapas comerciales */}
        {t.nota && t.status !== "funcionando" && (
          <p className="mt-3 rounded-xl bg-slate-50 p-2 text-[11px] italic text-slate-600 ring-1 ring-slate-200">
            {t.nota}
          </p>
        )}

        {/* Acciones */}
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate break-all text-[11px] text-slate-500">
            {t.ownerEmail || "—"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onImpersonate(t)}
              title="Ver como cliente"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/20 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 active:scale-[0.98] sm:flex-none"
            >
              <LogIn className="h-3 w-3" strokeWidth={2.75} />
              Ver como cliente
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// =========================================================
// Columna del Kanban (una por status)
// =========================================================

function PipelineColumn({
  status,
  rows,
  onImpersonate,
  onChangeStatus,
  onCreate,
}: {
  status: VendorStatus;
  rows: TenantRow[];
  onImpersonate: (t: TenantRow) => void;
  onChangeStatus: (id: string, next: VendorStatus) => void;
  onCreate: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <section
      className={cn(
        "flex w-full min-w-0 min-h-[240px] flex-col rounded-2xl border p-4 lg:flex-1 lg:p-5",
        meta.col,
        meta.colBorder
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              meta.iconWrap
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{meta.label}</h3>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
                  meta.badge
                )}
              >
                {rows.length}
              </span>
            </div>
            <p className="mt-0.5 max-w-[24ch] text-[11px] leading-snug text-slate-600">
              {meta.desc}
            </p>
          </div>
        </div>
        {status === "propuesta" && (
          <button
            type="button"
            onClick={onCreate}
            title="Añadir propuesta"
            className="rounded-md border border-blue-300 bg-white p-1.5 text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3">
        {rows.length === 0 ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-4 text-center">
            <CircleDashed className="h-5 w-5 text-slate-400" />
            <p className="text-xs text-slate-500">
              Sin tenants en esta etapa.
            </p>
          </div>
        ) : (
          rows.map((t) => (
            <TenantCard
              key={t.id}
              t={t}
              onImpersonate={onImpersonate}
              onChangeStatus={onChangeStatus}
            />
          ))
        )}
      </div>
    </section>
  );
}

// =========================================================
// Sparkline (SVG minimal, sin dependencia extra)
// =========================================================

function Sparkline({
  data,
  height = 44,
  color = "#a78bfa",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ height, width: "100%" }}
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#spark-fill)"
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  );
}

// =========================================================
// Modal: registrar nuevo tenant
// =========================================================

function NewTenantModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("");
  const [dominio, setDominio] = useState("");
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [entorno, setEntorno] = useState<EntornoTier>("staging");
  const [status, setStatus] = useState<VendorStatus>("propuesta");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [rubro, setRubro] = useState<"" | ProspectoRubro>("");
  const [zona, setZona] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slugSugerido = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const reset = () => {
    setNombre("");
    setPrefijo("");
    setDominio("");
    setPlan("starter");
    setEntorno("staging");
    setStatus("propuesta");
    setOwnerEmail("");
    setRubro("");
    setZona("");
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !prefijo) return;
    setBusy(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({
          id: prefijo.toLowerCase(),
          nombre,
          slug: slugSugerido || prefijo.toLowerCase(),
          dominio: dominio || `${slugSugerido}.synaptechspa.cl`,
          emoji: "🏬",
          status,
          plan,
          entorno,
          ownerEmail,
          nota: status === "propuesta" ? "Propuesta recién creada." : "",
          mrr: 0,
          rubro: rubro || null,
          zona: zona.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      onCreated();
      onOpenChange(false);
      reset();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-4 w-4 text-emerald-300" strokeWidth={2.75} />
            Registrar nuevo cliente
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Agrega un nuevo negocio al panel. Le vamos a asignar un espacio
            propio y su dominio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Nombre del negocio
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Café Unión"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Código interno
            </label>
            <input
              value={prefijo}
              onChange={(e) => setPrefijo(e.target.value.toUpperCase())}
              required
              placeholder="CAFEUNION"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm uppercase tracking-wider text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
            <p className="text-[11px] text-slate-500">
              Identificador corto para el negocio. Solo letras y números.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Dominio del cliente
            </label>
            <input
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              placeholder={`${slugSugerido || "cliente"}.synaptechspa.cl`}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Etapa inicial
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VendorStatus)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            >
              <option value="propuesta">Propuesta</option>
              <option value="por_presentar">Falta por presentar</option>
              <option value="funcionando">Funcionando</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanTier)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Modo
              </label>
              <select
                value={entorno}
                onChange={(e) => setEntorno(e.target.value as EntornoTier)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              >
                <option value="staging">Prueba</option>
                <option value="produccion">Producción</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Rubro
              </label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value as "" | ProspectoRubro)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              >
                <option value="">Sin rubro</option>
                {Object.entries(RUBRO_META).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.emoji} {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-slate-400">
                Zona / barrio
              </label>
              <input
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Viña Centro"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-slate-500">
            Con rubro y zona el local aparece bien clasificado en el directorio
            Explora del marketplace.
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Email del dueño
            </label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="contacto@negocio.cl"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Creando…" : "Crear cliente"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Tabs móviles del pipeline — evitan el apilamiento vertical de 3 columnas
// =========================================================

function MobilePipelineTabs({
  grouped,
  onImpersonate,
  onChangeStatus,
  onCreate,
}: {
  grouped: Record<VendorStatus, TenantRow[]>;
  onImpersonate: (t: TenantRow) => void;
  onChangeStatus: (id: string, next: VendorStatus) => void;
  onCreate: () => void;
}) {
  const [active, setActive] = useState<VendorStatus>("funcionando");
  const rows = grouped[active];
  const activeMeta = STATUS_META[active];

  return (
    <div className="lg:hidden">
      {/* Pestañas — pill selector estilo iOS segmented control */}
      <div
        role="tablist"
        aria-label="Etapa del pipeline"
        className="relative flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl"
      >
        {STATUS_ORDER.map((s) => {
          const meta = STATUS_META[s];
          const isActive = s === active;
          const count = grouped[s].length;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(s)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all duration-300",
                isActive
                  ? s === "funcionando"
                    ? "bg-gradient-to-br from-emerald-400 to-lime-400 text-slate-950 shadow-lg shadow-emerald-500/25"
                    : "bg-white/10 text-white shadow-md shadow-black/30"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <span className="truncate">{meta.label}</span>
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive
                    ? s === "funcionando"
                      ? "bg-slate-950/25 text-slate-950"
                      : "bg-white/15 text-white"
                    : "bg-white/[0.06] text-slate-400"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards del status activo — con animación de entrada al cambiar de tab */}
      <div
        key={active}
        className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-slate-400">
          <span
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              active === "funcionando"
                ? "bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]"
                : active === "por_presentar"
                ? "bg-orange-400"
                : "bg-blue-400"
            )}
          />
          <span>{activeMeta.desc}</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <CircleDashed className="h-5 w-5 text-slate-500" />
            <p className="text-xs text-slate-400">
              Sin clientes en esta etapa todavía.
            </p>
            {active === "propuesta" && (
              <button
                type="button"
                onClick={onCreate}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                <Plus className="h-3 w-3" strokeWidth={2.75} />
                Nuevo cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((t) => (
              <TenantCard
                key={t.id}
                t={t}
                onImpersonate={onImpersonate}
                onChangeStatus={onChangeStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// Página principal
// =========================================================

const YEAR_OPTIONS = [
  { value: "todos", label: "Histórico" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
] as const;

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "propuesta", label: "Propuestas" },
  { value: "por_presentar", label: "Falta por presentar" },
  { value: "funcionando", label: "Funcionando" },
] as const;

export default function SuperAdminDashboardPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!firebaseUser;

  const [year, setYear] = useState<YearFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [newModal, setNewModal] = useState(false);

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/superadmin/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken ?? ""}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setData(json as OverviewResponse);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    cargar();
  }, [cargar, authReady]);

  const tenants = useMemo<TenantRow[]>(
    () => (data?.tenants ?? []).map(mapTenant),
    [data]
  );

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter !== "todos" && t.status !== statusFilter) return false;
      if (year !== "todos" && !(t.createdAt ?? "").startsWith(year))
        return false;
      if (
        search &&
        !`${t.nombre} ${t.dominio ?? ""} ${t.id}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [tenants, statusFilter, year, search]);

  // Agrupamos por status para el Kanban.
  const grouped = useMemo(() => {
    const acc: Record<VendorStatus, TenantRow[]> = {
      propuesta: [],
      por_presentar: [],
      funcionando: [],
    };
    for (const t of filtered) acc[t.status].push(t);
    return acc;
  }, [filtered]);

  const kpis: KpiSpec[] = useMemo(() => {
    const plat = data?.plataforma;
    const funcionandoCount = tenants.filter(
      (t) => t.status === "funcionando"
    ).length;
    const totalTenants = tenants.length;
    const usuariosPlataforma = plat?.totalUsuarios ?? 0;
    const totalReads = tenants.reduce((a, t) => a + t.fireReads, 0);
    const mrrTotal = plat?.mrrTotal ?? 0;
    return [
      {
        label: "Negocios funcionando",
        value: `${funcionandoCount}/${totalTenants}`,
        hint: "clientes activos",
        icon: Building2,
        tone: "emerald",
      },
      {
        label: "Usuarios totales",
        value: fmtNumber(usuariosPlataforma),
        hint: `${plat?.totalClientes ?? 0} clientes · ${plat?.totalStaff ?? 0} equipo`,
        icon: Users,
        tone: "indigo",
      },
      {
        label: "Nivel de actividad",
        value: fmtCompact(totalReads),
        hint: totalReads > 0 ? "acciones registradas hoy" : "sin actividad todavía",
        icon: Activity,
        tone: "amber",
      },
      {
        label: "Ingresos mensuales",
        value: fmtCLP(mrrTotal),
        hint: mrrTotal > 0 ? "suma por cliente" : "editable por cliente",
        icon: DollarSign,
        tone: "emerald",
      },
    ];
  }, [data, tenants]);

  const impersonate = (t: TenantRow) => {
    // TODO: setear cookie de sesión superadmin + header x-tenant-id.
    window.open(`/?tenant=${t.slug}`, "_blank");
  };

  // Cambia el estado del cliente con optimistic update + rollback si falla.
  const changeStatus = useCallback(
    async (id: string, next: VendorStatus) => {
      // Snapshot para rollback
      const prev = data;
      if (data) {
        setData({
          ...data,
          tenants: data.tenants.map((t) =>
            t.id === id ? { ...t, status: next } : t
          ),
        });
      }
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/superadmin/tenants", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken ?? ""}`,
          },
          body: JSON.stringify({ id, status: next }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `Error ${res.status}`);
        }
        // Sincronizamos con el servidor (por si otros campos cambiaron).
        cargar();
      } catch (e) {
        setData(prev); // rollback
        setErr((e as Error).message);
      }
    },
    [data, cargar]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* HERO motivacional — visible en todo tamaño, primero al entrar */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/60 to-slate-950 px-5 py-8 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-4 duration-700 sm:px-8 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl"
        />
        <p className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300 sm:text-xs">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.6)]" />
          Panel General
        </p>
        <h1 className="relative mt-3 bg-gradient-to-br from-white via-emerald-100 to-emerald-300 bg-clip-text font-headline text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl">
          Este es el comienzo de algo grande 🚀
        </h1>
        <p className="relative mt-2 max-w-xl text-sm text-slate-400 sm:mt-3 sm:text-base">
          Nuestro primer gran cliente de muchos por venir.
        </p>
      </section>

      {/* HEADER — compacto en móvil (título + acción principal), completo en desktop */}
      <header className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-500 lg:flex-row lg:items-end lg:justify-between">
        {/* Título solo en desktop — en móvil el hero + bottom nav ya dan identidad */}
        <div className="hidden min-w-0 lg:block">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Estado de los Negocios
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Propuestas · por presentar · funcionando.
          </p>
        </div>

        {/* Barra de filtros + acciones */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Slicer<YearFilter>
              label="Año"
              value={year}
              options={YEAR_OPTIONS}
              onChange={setYear}
            />
            <Slicer<StatusFilter>
              label="Etapa"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={cargar}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98] disabled:opacity-60"
              title="Actualizar"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => setNewModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-300 hover:to-lime-300 hover:shadow-emerald-500/40 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
              Nuevo cliente
            </button>
          </div>
        </div>
      </header>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">No pudimos cargar los datos</p>
            <p className="text-xs text-rose-300/80">{err}</p>
          </div>
          <button
            type="button"
            onClick={cargar}
            className="rounded-md border border-rose-500/40 px-2 py-1 text-[11px] font-semibold hover:bg-rose-500/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading UI real vive en `loading.tsx` — se muestra durante la
          navegación de App Router antes de que este componente monte. */}

      {/* KPIs — 2x2 en móvil, 4 columnas en desktop */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDuration: "500ms", animationDelay: `${i * 80}ms` }}
          >
            <KpiCard kpi={k} />
          </div>
        ))}
      </section>

      {/* PIPELINE BOARD (Kanban) */}
      <section id="clientes" className="space-y-3 scroll-mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Estado de los Negocios
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} cliente{filtered.length === 1 ? "" : "s"} en la vista
            </p>
          </div>
          {/* Búsqueda: full-width en móvil, ancho fijo en desktop */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o dominio…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>
        </div>

        {/* Móvil: tabs deslizables — solo se ve la etapa activa (evita scroll infinito) */}
        <MobilePipelineTabs
          grouped={grouped}
          onImpersonate={impersonate}
          onChangeStatus={changeStatus}
          onCreate={() => setNewModal(true)}
        />

        {/* Desktop (lg+): tres columnas lado a lado */}
        <div className="hidden gap-6 lg:flex">
          {STATUS_ORDER.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              rows={grouped[status]}
              onImpersonate={impersonate}
              onChangeStatus={changeStatus}
              onCreate={() => setNewModal(true)}
            />
          ))}
        </div>
      </section>

      {/* ACTIVIDAD (sparkline) */}
      <section id="actividad" className="scroll-mt-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Activity
                  className="h-4 w-4 shrink-0 text-emerald-300"
                  strokeWidth={2.25}
                />
                Actividad · últimos 30 días
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Resumen de actividad diaria de los clientes.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold tabular-nums text-white">
                {fmtCompact(
                  (data?.requestsSpark ?? []).reduce((a, b) => a + b, 0)
                )}
              </p>
              <p className="text-[11px] text-slate-500">acciones totales</p>
            </div>
          </div>
          <Sparkline
            data={data?.requestsSpark ?? []}
            height={80}
            color="#34d399"
          />
        </div>
      </section>

      {/* ALERTAS */}
      <section
        id="alertas"
        className="scroll-mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-xl"
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert
              className={cn(
                "h-4 w-4",
                (data?.incidents.length ?? 0) > 0
                  ? "text-rose-400"
                  : "text-emerald-300"
              )}
              strokeWidth={2.25}
            />
            Alertas activas
          </h2>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums",
              (data?.incidents.length ?? 0) > 0
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            )}
          >
            {data?.incidents.length ?? 0}
          </span>
        </header>
        <ul className="divide-y divide-white/[0.05] text-xs">
          {(data?.incidents ?? []).map((inc) => {
            const meta = INCIDENT_META[inc.severidad];
            const Icon = meta.icon;
            return (
              <li key={inc.id} className="flex items-start gap-3 px-5 py-3">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-100">{inc.titulo}</p>
                  <p className="text-slate-400">
                    {inc.descripcion} · {fmtRelativo(inc.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
          {(!data?.incidents || data.incidents.length === 0) && (
            <li className="flex items-start gap-3 px-5 py-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-slate-300">Todo en orden. Sin alertas activas.</p>
            </li>
          )}
        </ul>
      </section>

      {/* Modal nuevo tenant */}
      <NewTenantModal
        open={newModal}
        onOpenChange={setNewModal}
        onCreated={cargar}
      />
    </div>
  );
}
